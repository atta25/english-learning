// Usage: node validate.js data/partN.js [expectedCount]
const fs = require("fs");
const file = process.argv[2], expected = +(process.argv[3] || 30);
global.window = {};
try { new Function("window", fs.readFileSync(file, "utf8"))(global.window); }
catch (e) { console.log("SYNTAX ERROR:", e.message); process.exit(1); }
const maps = global.window.MAPS || [];
const errs = [], warns = [], titles = new Set();
const TYPES = ["Vocabulary", "Grammar", "Expressions", "Structures"];
const isStr = s => typeof s === "string" && s.trim();
const isPair = a => Array.isArray(a) && a.length === 2 && a.every(isStr);
const en = /\b(the|you|I|he|she|we|they|is|are|was|have|has|to|and|of|in|on|at|for|my|your|it)\b/i;
const es = /[áéíóúñ¿¡]|\b(el|la|los|las|de|que|en|un|una|con|para|por|se|es|no|y|como|si|hacer|tener|muy|más|usa|usar|verbo|pasado|presente|futuro|también|cuando|solo|algo|algún|cosas?)\b/i;
if (maps.length !== expected) errs.push(`expected ${expected} maps, found ${maps.length}`);
maps.forEach((m, k) => {
  const w = `map ${k + 1} (${m.t})`;
  ["cat", "type", "lvl", "icon", "t", "es", "d"].forEach(f => { if (!isStr(m[f])) errs.push(`${w}: missing ${f}`); });
  if (!["A1", "A2", "B1", "B2", "C1", "C2"].includes(m.lvl)) errs.push(`${w}: lvl must be A1/A2/B1/B2/C1/C2`);
  if (!TYPES.includes(m.type)) errs.push(`${w}: type must be one of ${TYPES.join("/")}`);
  if ("q" in m || "a" in m) errs.push(`${w}: remove old q/a, use qs`);
  if (!Array.isArray(m.qs) || m.qs.length !== 3 || !m.qs.every(x => x && isStr(x.q) && isStr(x.a))) errs.push(`${w}: qs must be exactly 3 {q,a}`);
  if (titles.has(m.t)) errs.push(`${w}: duplicate title`); titles.add(m.t);
  if (!Array.isArray(m.boxes) || m.boxes.length !== 6) { errs.push(`${w}: needs exactly 6 boxes`); return; }
  if (["Grammar", "Structures"].includes(m.type) && !m.boxes.some(b => /common mistakes/i.test(b.h || ""))) errs.push(`${w}: Grammar/Structures maps need a box with h "Common mistakes"`);
  if (/pronunciation|silent letters|word stress|intonation|connected speech/i.test(m.t)) errs.push(`${w}: pronunciation topics are out of scope`);
  m.boxes.forEach((b, j) => {
    const bw = `${w} box ${j + 1}`;
    ["e", "h", "es"].forEach(f => { if (!isStr(b[f])) errs.push(`${bw}: missing ${f}`); });
    if (!Array.isArray(b.i) || b.i.length < 2 || b.i.length > 4 || !b.i.every(isPair)) errs.push(`${bw}: i must be 2-4 [en,es] pairs`);
    else b.i.forEach(([a, c]) => {
      if (a.trim() === c.trim()) errs.push(`${bw}: identical pair "${a}"`);
      else if (en.test(c) && !es.test(c)) warns.push(`${bw}: second element may be English: "${c}"`);
    });
    if (!isPair(b.ex)) errs.push(`${bw}: ex must be [en,es]`);
    else if (en.test(b.ex[1]) && !es.test(b.ex[1])) warns.push(`${bw}: ex translation may be English: "${b.ex[1]}"`);
  });
});
if (warns.length) console.log(`WARNINGS (${warns.length}), review:\n` + warns.slice(0, 40).join("\n"));
console.log(errs.length ? errs.join("\n") : `OK: ${maps.length} maps; types: ${[...new Set(maps.map(m => m.type))].join(", ")}`);
process.exit(errs.length ? 1 : 0);
