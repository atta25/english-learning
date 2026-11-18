// Usage: node validate-all.js [--warnings] [--strict]
// Runs every check on all data files and exits with 1 if anything fails.
//   - map rules for each data/partN.js (validate.js)
//   - illustrations for every map (validate-art.js)
//   - rules across files: duplicate titles, near-duplicate titles
//   - README: total and per-level counts must match the data
// Warnings are only counted unless --warnings is given. With --strict, warnings also make the command fail.
const fs = require("fs");
const path = require("path");
const { validateMaps, loadFile, LEVELS } = require("./validate");
const { validateArt } = require("./validate-art");

const showWarnings = process.argv.includes("--warnings"), strict = process.argv.includes("--strict");
// Titles that are intentionally almost equal (same topic at two levels), by slug.
const NEAR_DUPLICATE_OK = new Set(["there-is-there-are-a1", "there-is-there-are-a2"]);
const dataDir = path.join(__dirname, "data");
const numbered = prefix => fs.readdirSync(dataDir)
  .map(f => f.match(new RegExp(`^${prefix}(\\d+)\\.js$`))).filter(Boolean)
  .sort((a, b) => a[1] - b[1]).map(m => path.join("data", m[0]));

const errs = [], warns = [], all = [];

// 1) map rules, file by file
for (const f of numbered("part")) {
  let maps;
  try { maps = loadFile(path.join(__dirname, f)); } catch (e) { errs.push(`${f}: SYNTAX ERROR ${e.message}`); continue; }
  const r = validateMaps(maps);
  r.errs.forEach(e => errs.push(`${f}: ${e}`));
  r.warns.forEach(w => warns.push(`${f}: ${w}`));
  maps.forEach(m => all.push({ ...m, file: f }));
}

// 2) rules across files
const byTitle = new Map();
all.forEach(m => { const k = m.t; byTitle.set(k, [...(byTitle.get(k) || []), m]); });
byTitle.forEach((l, t) => { if (l.length > 1) errs.push(`duplicate title "${t}" in ${l.map(m => m.file).join(", ")}`); });
const byNorm = new Map();
all.forEach(m => { const k = m.t.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(); byNorm.set(k, [...(byNorm.get(k) || []), m]); });
byNorm.forEach(l => {
  if (l.length > 1 && !l.every(m => NEAR_DUPLICATE_OK.has(m.slug)) && new Set(l.map(m => m.t)).size > 1)
    warns.push(`near-duplicate titles: ${l.map(m => `"${m.t}" (${m.slug})`).join(" / ")}`);
});

// 3) illustrations
const win = {};
for (const f of numbered("art")) {
  try { new Function("window", fs.readFileSync(path.join(__dirname, f), "utf8"))(win); }
  catch (e) { errs.push(`${f}: SYNTAX ERROR ${e.message}`); }
}
validateArt(all, win.ART || {}).forEach(e => errs.push(`art: ${e}`));

// 4) README must match the data
const counts = Object.fromEntries(LEVELS.map(l => [l, all.filter(m => m.lvl === l).length]));
try {
  const lines = fs.readFileSync(path.join(__dirname, "README.md"), "utf8").split("\n");
  const total = (lines.join("\n").match(/(\d+) illustrated visual maps/) || [])[1];
  const row = lines.findIndex(l => /^\|\s*A1\s*\|/.test(l));
  const nums = row >= 0 && lines[row + 2] ? lines[row + 2].split("|").map(s => s.trim()).filter(Boolean).map(Number) : [];
  if (total === undefined) errs.push('README: could not find "N illustrated visual maps"');
  else if (+total !== all.length) errs.push(`README says ${total} maps, data has ${all.length}`);
  if (nums.length !== LEVELS.length) errs.push("README: could not read the level table");
  else LEVELS.forEach((l, i) => { if (nums[i] !== counts[l]) errs.push(`README says ${l}: ${nums[i]}, data has ${counts[l]}`); });
} catch (e) { errs.push(`README: ${e.message}`); }

// Summary
console.log(`Files: ${numbered("part").length} content, ${numbered("art").length} art | Maps: ${all.length} | ${LEVELS.map(l => `${l}:${counts[l]}`).join(" ")}`);
if (warns.length) console.log(showWarnings ? `WARNINGS (${warns.length}):\n` + warns.join("\n") : `Warnings: ${warns.length} (run with --warnings to list them)`);
if (errs.length) { console.log(`\nERRORS (${errs.length}):\n` + errs.join("\n")); process.exit(1); }
if (strict && warns.length) { console.log(`\nFAILED (--strict): ${warns.length} warnings`); process.exit(1); }
console.log("OK: all checks passed");
