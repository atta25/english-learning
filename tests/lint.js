// Usage: node tests/lint.js
// Dependency-free checks on the source files: valid syntax and the basics of .editorconfig
// (no tabs, no trailing spaces, final newline). Data files (data/*.js) are checked by validate-all.js instead.
const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const list = (dir, re) => fs.existsSync(path.join(root, dir)) ? fs.readdirSync(path.join(root, dir)).filter(f => re.test(f)).map(f => path.join(dir, f)) : [];
const jsFiles = [...list("js", /\.js$/), ...list("tests", /\.(js|mjs)$/), ...list("tests/unit", /\.js$/), ...list("tests/lib", /\.mjs$/), "sw.js", "validate.js", "validate-art.js", "validate-all.js"];
const textFiles = [...jsFiles, "index.html", "style.css", "manifest.webmanifest", "package.json", ".editorconfig"];

const problems = [];
for (const f of jsFiles) {
  try { execFileSync(process.execPath, ["--check", path.join(root, f)], { stdio: "pipe" }); }
  catch (e) { problems.push(`${f}: syntax error\n${String(e.stderr).split("\n").slice(0, 4).join("\n")}`); }
}
for (const f of textFiles) {
  const text = fs.readFileSync(path.join(root, f), "utf8");
  text.split("\n").forEach((line, i) => {
    if (/\t/.test(line)) problems.push(`${f}:${i + 1}: tab character`);
    if (/[ \t]+$/.test(line)) problems.push(`${f}:${i + 1}: trailing spaces`);
  });
  if (!text.endsWith("\n")) problems.push(`${f}: missing final newline`);
  if (text.includes("\r")) problems.push(`${f}: CRLF line endings`);
}
if (problems.length) { console.log(problems.join("\n")); console.log(`\n${problems.length} problem(s)`); process.exit(1); }
console.log(`OK: ${jsFiles.length} scripts and ${textFiles.length} text files checked`);
