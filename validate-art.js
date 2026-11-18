// Usage: node validate-art.js  (checks data/art*.js against data/part*.js; art is keyed by map slug)
// Also exports validateArt() so validate-all.js can reuse the same rules.
const fs = require("fs");
const { isEmoji } = require("./validate");

function validateArt(maps, ART) {
  const errs = [], seenSlugs = new Set();
  maps.forEach(m => {
    if (seenSlugs.has(m.slug)) errs.push(`duplicate slug across files: "${m.slug}"`); seenSlugs.add(m.slug);
    const a = ART[m.slug];
    if (!a) { errs.push(`missing art for "${m.t}" (slug "${m.slug}")`); return; }
    if (!Array.isArray(a.scene) || a.scene.length < 4 || a.scene.length > 5 || !a.scene.every(isEmoji)) errs.push(`"${m.t}": scene must be 4-5 single emojis`);
    if (!isEmoji(a.mascot)) errs.push(`"${m.t}": mascot must be 1 emoji`);
    if (!Array.isArray(a.boxes) || a.boxes.length !== 6 || !a.boxes.every(b => Array.isArray(b) && b.length >= 2 && b.length <= 3 && b.every(isEmoji))) errs.push(`"${m.t}": boxes must be 6 arrays of 2-3 single emojis`);
  });
  Object.keys(ART).forEach(k => { if (!maps.some(m => m.slug === k)) errs.push(`art key not matching any map slug: "${k}"`); });
  return errs;
}

module.exports = { validateArt };

if (require.main === module) {
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
  const errs = validateArt(maps, global.window.ART || {});
  console.log(errs.length ? errs.slice(0, 60).join("\n") : `OK: art for ${maps.length} maps`);
  process.exit(errs.length ? 1 : 0);
}
