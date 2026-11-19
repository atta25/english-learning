// Minimal headless-Chrome helper for the smoke tests (no dependencies, needs Node 22+ for the global WebSocket).
import { spawn } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";

export const sleep = ms => new Promise(r => setTimeout(r, ms));

const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".woff2": "font/woff2", ".webmanifest": "application/manifest+json" };

// Serves a folder over http://127.0.0.1:<random port>/ (service workers need http, not file://).
export function serve(root) {
  const server = http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split("?")[0]);
    if (p.endsWith("/")) p += "index.html";
    const file = path.join(root, p);
    if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { "content-type": TYPES[path.extname(file)] || "application/octet-stream", "cache-control": "no-cache" });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise(resolve => server.listen(0, "127.0.0.1", () => resolve({
    url: `http://127.0.0.1:${server.address().port}/`,
    close: () => new Promise(r => server.close(r)),
  })));
}

function chromePath() {
  const candidates = [process.env.CHROME_PATH, "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome", "/usr/bin/google-chrome-stable", "/usr/bin/chromium", "/usr/bin/chromium-browser"].filter(Boolean);
  const found = candidates.find(c => fs.existsSync(c));
  if (!found) throw new Error("Chrome not found. Set CHROME_PATH to its executable.");
  return found;
}

export class Browser {
  static async launch() {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "evm-chrome-"));
    const proc = spawn(chromePath(), ["--headless=new", "--disable-gpu", "--no-first-run", "--remote-debugging-port=0", `--user-data-dir=${dir}`, "about:blank"], { stdio: "ignore" });
    const portFile = path.join(dir, "DevToolsActivePort");
    for (let i = 0; i < 100 && !fs.existsSync(portFile); i++) await sleep(100);
    if (!fs.existsSync(portFile)) { proc.kill(); throw new Error("Chrome did not start"); }
    const port = fs.readFileSync(portFile, "utf8").split("\n")[0];
    let target;
    for (let i = 0; i < 50 && !target; i++) {
      try { target = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find(t => t.type === "page"); } catch (e) { /* retry */ }
      if (!target) await sleep(100);
    }
    if (!target) { proc.kill(); throw new Error("Chrome started but has no page to control"); }
    const ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      ws.onopen = resolve; ws.onerror = () => reject(new Error("could not connect to Chrome"));
      setTimeout(() => reject(new Error("timeout connecting to Chrome")), 10000);
    }).catch(e => { proc.kill(); throw e; });
    return new Browser(proc, ws, dir);
  }

  constructor(proc, ws, dir) {
    this.proc = proc; this.ws = ws; this.dir = dir; this.id = 0; this.pending = new Map(); this.errors = []; this.requests = [];
    ws.onmessage = e => {
      const m = JSON.parse(e.data);
      if (m.id && this.pending.has(m.id)) { this.pending.get(m.id)(m); this.pending.delete(m.id); }
      if (m.method === "Runtime.exceptionThrown") this.errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
      if (m.method === "Network.requestWillBeSent") this.requests.push(m.params.request.url);
    };
  }

  // Every command has a time limit, so a stuck page fails the test instead of hanging it.
  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++this.id;
      const timer = setTimeout(() => { this.pending.delete(id); reject(new Error(`timeout waiting for ${method}`)); }, 30000);
      this.pending.set(id, m => { clearTimeout(timer); resolve(m); });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async init() {
    for (const m of ["Page.enable", "Runtime.enable", "Network.enable"]) await this.send(m);
    await this.send("Network.setCacheDisabled", { cacheDisabled: true });
  }

  async viewport(width, height = 900, { mobile = false, scale = 1 } = {}) {
    await this.send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: scale, mobile });
  }

  async goto(url, wait = 1500) { await this.send("Page.navigate", { url }); await sleep(wait); }

  // Evaluates an expression (promises are awaited) and returns its value; throws if the page throws.
  async eval(expression) {
    const r = await this.send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    if (r.result.exceptionDetails) throw new Error((r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text).slice(0, 400));
    return r.result.result.value;
  }

  async offline(on) {
    await this.send("Network.emulateNetworkConditions", { offline: on, latency: 0, downloadThroughput: on ? 0 : -1, uploadThroughput: on ? 0 : -1 });
  }

  async screenshot(file, clip) {
    const r = await this.send("Page.captureScreenshot", { format: "png", ...(clip ? { clip: { ...clip, scale: 1 } } : {}) });
    const buf = Buffer.from(r.result.data, "base64");
    if (file) fs.writeFileSync(file, buf);
    return buf;
  }

  async close() {
    try { this.ws.close(); } catch (e) { /* already closed */ }
    this.proc.kill();
    await sleep(200);
    fs.rmSync(this.dir, { recursive: true, force: true });
  }
}
