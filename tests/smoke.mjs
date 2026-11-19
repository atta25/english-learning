// Usage: node tests/smoke.mjs
// Opens the site in headless Chrome and checks what a visitor sees and does. It only reads the DOM and public
// browser APIs, so it keeps working when the internals of app.js change. Needs Chrome (set CHROME_PATH if not found).
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Browser, serve, sleep } from "./lib/browser.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const server = await serve(root);
const b = await Browser.launch();
await b.init();

const results = [];
async function check(name, fn) {
  try { await fn(); console.log(`  ✓ ${name}`); results.push(true); }
  catch (e) { console.log(`  ✗ ${name}\n      ${e.message.split("\n")[0]}`); results.push(false); }
}
const open = (p = "index.html", wait = 1800) => b.goto(server.url + p, wait);
const until = async (expr, ms = 6000) => { for (let t = 0; t < ms; t += 100) { if (await b.eval(expr)) return; await sleep(100); } throw new Error(`timeout waiting for ${expr}`); };
const state = () => b.eval(`JSON.stringify({
  maps: document.querySelectorAll(".page").length,
  count: document.getElementById("count").textContent,
  q: document.getElementById("q").value,
  lvl: (document.querySelector("#seg .on") || {}).textContent,
  cat: ((document.querySelector("#tabs .on") || {}).textContent || "").replace(/\\s*\\(\\d+\\)$/, "").trim(),
  url: location.pathname.split("/").pop() + location.search + location.hash,
  title: document.title })`).then(JSON.parse);
const type = async text => {
  await b.eval(`(() => { const i = document.getElementById("q"); i.value = ${JSON.stringify(text)}; i.dispatchEvent(new Event("input")); })()`);
  await sleep(450);
};
const topOf = slug => b.eval(`Math.round(document.querySelector('.copylink[data-slug="${slug}"]').closest(".page").getBoundingClientRect().top)`);

await b.viewport(1400, 900);

console.log("Portada");
await check("carga 6 mapas, 303 en total, sin errores ni peticiones a terceros", async () => {
  b.requests.length = 0; b.errors.length = 0;
  await open();
  const s = await state();
  assert.equal(s.maps, 6); assert.equal(s.count, "303 mapas");
  assert.deepEqual(b.errors, []);
  assert.deepEqual(b.requests.filter(u => !u.startsWith(server.url) && !u.startsWith("data:")), []);
});
await check("dibuja nubes y flechas (6 mapas × 6 flechas + 6 puntas)", async () => {
  assert.equal(await b.eval(`document.querySelectorAll("svg.cl path").length`), 12);
  assert.equal(await b.eval(`document.querySelectorAll("svg.arrows path").length`), 72);
});
await check("el texto en inglés lleva lang=en y las traducciones no", async () => {
  assert.equal(await b.eval(`document.querySelectorAll(".page h3:not([lang=en])").length`), 0);
  assert.equal(await b.eval(`document.querySelectorAll(".page .q[lang=en]").length`), 18);
  assert.equal(await b.eval(`document.querySelectorAll(".page i[lang=en]").length`), 0);
});

console.log("Búsqueda y filtros");
await check("busca en el contenido y sin tildes", async () => {
  await type("umbrella"); assert.equal((await state()).count, "8 mapas");
  await type("café"); const a = (await state()).count;
  await type("cafe"); assert.equal((await state()).count, a);
  await type("phrasal verb get");
  assert.match(await b.eval(`document.querySelector("#chips a").textContent`), /Phrasal Verbs with GET/);
  await type("zzzz"); assert.equal((await state()).count, "0 mapas");
  await type(""); assert.equal((await state()).count, "303 mapas");
});
await check("filtra por nivel y actualiza la URL", async () => {
  await b.eval(`document.querySelector('#seg button[data-l="C2"]').click()`); await sleep(200);
  let s = await state(); assert.equal(s.count, "25 mapas"); assert.equal(s.lvl, "C2"); assert.equal(s.url, "index.html?lvl=C2");
  await b.eval(`document.querySelector('#seg button[data-l=""]').click()`); await sleep(200);
  s = await state(); assert.equal(s.count, "303 mapas"); assert.equal(s.url, "index.html");
});
await check("filtra por categoría y búsqueda a la vez", async () => {
  await b.eval(`[...document.querySelectorAll("#tabs button")].find(x => /Culture/.test(x.textContent)).click()`); await sleep(200);
  await type("tea");
  const s = await state();
  assert.equal(s.cat, "Culture"); assert.match(s.url, /^index\.html\?cat=culture&q=tea$/);
});

console.log("Enlaces directos");
await check("?lvl=B1&cat=tenses&q=get restaura filtros y reescribe a index.html", async () => {
  await open("?lvl=B1&cat=tenses&q=get");
  const s = await state();
  assert.equal(s.lvl, "B1"); assert.equal(s.cat, "Tenses"); assert.equal(s.q, "get"); assert.equal(s.url, "index.html?lvl=B1&cat=tenses&q=get");
});
await check("#slug de un mapa lejano lo carga y baja hasta él", async () => {
  const slug = await b.eval(`window.MAPS[200].slug`);
  await open(`#${slug}`, 2500);
  const top = await topOf(slug);
  assert.ok(top >= 0 && top < 40, `top=${top}`);
  assert.ok((await state()).maps > 6);
  assert.ok((await state()).title.endsWith("English Visual Maps") && !(await state()).title.startsWith("🇬🇧"));
});
await check("enlace viejo #m100 sigue funcionando", async () => {
  await open("#m100", 2500);
  assert.ok((await state()).maps >= 100);
});
await check("un enlace a un mapa que el filtro oculta quita el filtro", async () => {
  const slug = await b.eval(`window.MAPS.find(m => m.lvl === "B1").slug`);
  await open(`?lvl=A1#${slug}`, 2500);
  const s = await state();
  assert.equal(s.count, "303 mapas"); assert.equal(s.url, `index.html#${slug}`);
});
await check("valores inválidos se ignoran", async () => {
  b.errors.length = 0;
  await open("?lvl=Z9&cat=nope#nope");
  assert.equal((await state()).count, "303 mapas"); assert.deepEqual(b.errors, []);
});
await check("clic en el índice, Atrás y Adelante conservan scroll y mapas", async () => {
  await open();
  await b.eval(`window.scrollTo(0, 1500)`); await sleep(200);
  const y0 = await b.eval(`Math.round(scrollY)`);
  await b.eval(`document.querySelectorAll("#chips a")[40].click()`); await sleep(1800);
  const hash = await b.eval(`location.hash`); assert.ok(hash.length > 1);
  const n = (await state()).maps;
  await b.eval(`history.back()`); await sleep(800);
  assert.equal(await b.eval(`location.hash`), ""); assert.ok(Math.abs(await b.eval(`scrollY`) - y0) < 5); assert.equal((await state()).maps, n);
  await b.eval(`history.forward()`); await sleep(800);
  assert.equal(await b.eval(`location.hash`), hash);
});
await check("el botón 🔗 copia el enlace al mapa", async () => {
  await open();
  const copied = await b.eval(`(async () => { let t = ""; navigator.clipboard.writeText = x => { t = x; return Promise.resolve(); };
    const btn = document.querySelector(".copylink"); btn.click(); await new Promise(r => setTimeout(r, 100));
    const shown = btn.textContent; await new Promise(r => setTimeout(r, 1700)); return JSON.stringify([t, btn.dataset.slug, shown, btn.textContent]); })()`);
  const [url, slug, during, after] = JSON.parse(copied);
  assert.ok(url.endsWith(`index.html#${slug}`)); assert.equal(during, "✓"); assert.equal(after, "🔗");
});

console.log("Interacción");
await check("'Cargar más' añade mapas sin perder respuestas abiertas", async () => {
  await open();
  const r = await b.eval(`(async () => {
    const d = document.querySelector(".page details"); d.open = true;
    const first = document.querySelector(".page");
    document.getElementById("more").click(); await new Promise(r => setTimeout(r, 400));
    return JSON.stringify({ open: d.open, same: document.querySelector(".page") === first, maps: document.querySelectorAll(".page").length, label: document.getElementById("more").textContent }); })()`);
  const s = JSON.parse(r);
  assert.ok(s.open && s.same); assert.equal(s.maps, 12); assert.match(s.label, /12\/303/);
});
await check("audio: lee la frase en en-GB y alterna ⏹/🔊", async () => {
  await open();
  const r = await b.eval(`(async () => {
    const log = []; speechSynthesis.speak = u => log.push({ text: u.text, lang: u.lang }); speechSynthesis.cancel = () => {};
    const btn = document.querySelector(".box li .say"); btn.click(); const during = btn.textContent;
    btn.click(); return JSON.stringify({ log, during, after: btn.textContent, say: document.querySelectorAll(".say").length }); })()`);
  const s = JSON.parse(r);
  assert.equal(s.log[0].lang, "en-GB"); assert.ok(s.log[0].text.length > 3 && !s.log[0].text.includes("🔊"));
  assert.equal(s.during, "⏹"); assert.equal(s.after, "🔊"); assert.ok(s.say > 100);
});
await check("tema: el botón cambia data-theme y theme-color, y se recuerda", async () => {
  await open();
  const read = () => b.eval(`document.documentElement.dataset.theme + "|" + document.querySelector('meta[name="theme-color"]').content`);
  const before = await read();
  await b.eval(`document.getElementById("theme").click()`); await sleep(150);
  const after = await read();
  assert.notEqual(before, after);
  assert.ok(["light|#cfe3f7", "dark|#0b1220"].includes(after) && ["light|#cfe3f7", "dark|#0b1220"].includes(before));
  await open(); assert.equal(await read(), after);
  await b.eval(`document.getElementById("theme").click()`);
});

console.log("Móvil (400 px)");
await check("sin flechas, nubes dibujadas y solo la primera caja abierta", async () => {
  await b.viewport(400, 900, { mobile: true, scale: 2 });
  await open();
  assert.equal(await b.eval(`document.querySelectorAll("svg.arrows path").length`), 0);
  assert.equal(await b.eval(`document.querySelectorAll("svg.cl path").length`), 12);
  assert.equal(await b.eval(`document.querySelectorAll(".box.open").length`), 6);
  await b.eval(`document.querySelector(".page .box:nth-child(2) .hd").click()`);
  assert.equal(await b.eval(`document.querySelectorAll(".box.open").length`), 7);
  await b.viewport(1400, 900);
});

console.log("PWA");
await check("metadatos, manifest e iconos", async () => {
  await open();
  const r = JSON.parse(await b.eval(`JSON.stringify({ desc: document.querySelector('meta[name=description]').content.length,
    og: ["og:title", "og:description", "og:image", "og:url"].every(p => document.querySelector('meta[property="' + p + '"]')),
    card: document.querySelector('meta[name="twitter:card"]').content, manifest: document.querySelector('link[rel=manifest]').getAttribute("href"),
    apple: !!document.querySelector('link[rel=apple-touch-icon]') })`));
  assert.ok(r.desc > 100 && r.desc <= 160); assert.ok(r.og); assert.equal(r.card, "summary_large_image"); assert.ok(r.apple);
  const m = await b.send("Page.getAppManifest");
  assert.deepEqual(m.result.errors || [], []);
  assert.deepEqual((await b.send("Page.getInstallabilityErrors")).result.installabilityErrors, []);
});
await check("funciona sin conexión, también con parámetros en la URL", async () => {
  await open();
  await until(`navigator.serviceWorker.ready.then(() => !!navigator.serviceWorker.controller)`);
  await b.offline(true);
  try {
    for (const [p, count] of [["index.html", "303 mapas"], ["index.html?lvl=B1&cat=structures&q=travel", "1 mapas"], ["", "303 mapas"]]) {
      await open(p, 2200);
      assert.equal((await state()).count, count, `offline ${p || "/"}`);
    }
    await type("umbrella"); assert.equal((await state()).count, "8 mapas");
  } finally { await b.offline(false); }
});

await b.close();
await server.close();
const failed = results.filter(r => !r).length;
console.log(`\n${results.length - failed}/${results.length} pruebas correctas`);
process.exit(failed ? 1 : 0);
