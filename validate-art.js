// Usage: node validate-art.js  (checks data/art*.js against data/part*.js)
const fs = require("fs");
global.window = {};
for (let p = 1; p <= 10; p++) if (fs.existsSync(`data/part${p}.js`)) new Function("window", fs.readFileSync(`data/part${p}.js`, "utf8"))(global.window);
const maps = global.window.MAPS;
for (let p = 1; p <= 10; p++) {
  const f = `data/art${p}.js`;
  if (fs.existsSync(f)) {
    try { new Function("window", fs.readFileSync(f, "utf8"))(global.window); }
    catch (e) { console.log(`${f}: SYNTAX ERROR ${e.message}`); process.exit(1); }
  }
}
const ART = global.window.ART || {};
const seg = typeof Intl.Segmenter === "function" ? new Intl.Segmenter("en", { granularity: "grapheme" }) : null;
const count = s => seg ? [...seg.segment(s)].length : [...s].length;
const isEmoji = s => typeof s === "string" && /\p{Extended_Pictographic}|\p{Regional_Indicator}/u.test(s) && count(s) === 1;
const errs = [];
maps.forEach(m => {
  const a = ART[m.t];
  if (!a) { errs.push(`missing art for "${m.t}"`); return; }
  if (!Array.isArray(a.scene) || a.scene.length < 4 || a.scene.length > 5 || !a.scene.every(isEmoji)) errs.push(`"${m.t}": scene must be 4-5 single emojis`);
  if (!isEmoji(a.mascot)) errs.push(`"${m.t}": mascot must be 1 emoji`);
  if (!Array.isArray(a.boxes) || a.boxes.length !== 6 || !a.boxes.every(b => Array.isArray(b) && b.length >= 2 && b.length <= 3 && b.every(isEmoji))) errs.push(`"${m.t}": boxes must be 6 arrays of 2-3 single emojis`);
});
Object.keys(ART).forEach(k => { if (!maps.some(m => m.t === k)) errs.push(`art key not matching any map: "${k}"`); });
console.log(errs.length ? errs.slice(0, 60).join("\n") : `OK: art for ${maps.length} maps`);
process.exit(errs.length ? 1 : 0);
