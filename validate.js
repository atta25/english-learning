// Usage: node validate.js data/partN.js [expectedCount]
// Also exports validateMaps() so validate-all.js can reuse the same rules.
const fs = require("fs");

const TYPES = ["Vocabulary", "Grammar", "Expressions", "Structures"];
const CATS = ["Grammar: Tenses & Verbs", "Grammar: Structures", "Phrasal Verbs, Idioms & Collocations", "Vocabulary: Everyday Life", "Vocabulary: Work, Study & Society", "Communication & British Culture"];
const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];
// Max characters per text, a bit above the current longest texts, so nothing overflows the layout.
const LIMITS = { t: 80, es: 80, d: 130, h: 50, hes: 50, itemEn: 120, itemEs: 130, exEn: 100, exEs: 110, q: 180, a: 140 };

const isStr = s => typeof s === "string" && s.trim();
const isPair = a => Array.isArray(a) && a.length === 2 && a.every(isStr);
const seg = typeof Intl.Segmenter === "function" ? new Intl.Segmenter("en", { granularity: "grapheme" }) : null;
const graphemes = s => seg ? [...seg.segment(s)].length : [...s].length;
// A single emoji, including keycaps (1⃣) and flags (🇬🇧).
const isEmoji = s => typeof s === "string" && graphemes(s) === 1 && /\p{Extended_Pictographic}|\p{Regional_Indicator}|\u20E3/u.test(s);
const en = /\b(the|you|I|he|she|we|they|is|are|was|have|has|to|and|of|in|on|at|for|my|your|it)\b/i;
const es = /[áéíóúñ¿¡]|\b(el|la|los|las|de|que|en|un|una|con|para|por|se|es|no|y|como|si|hacer|tener|muy|más|usa|usar|verbo|pasado|presente|futuro|también|cuando|solo|algo|algún|cosas?)\b/i;

// Every text of a map with its label and length limit.
function* texts(m) {
  yield ["t", m.t, LIMITS.t]; yield ["es", m.es, LIMITS.es]; yield ["d", m.d, LIMITS.d];
  for (const [n, x] of (m.qs || []).entries()) if (x) { yield [`qs[${n + 1}].q`, x.q, LIMITS.q]; yield [`qs[${n + 1}].a`, x.a, LIMITS.a]; }
  for (const [j, b] of (m.boxes || []).entries()) {
    if (!b) continue;
    yield [`box ${j + 1} h`, b.h, LIMITS.h]; yield [`box ${j + 1} es`, b.es, LIMITS.hes];
    for (const p of b.i || []) if (isPair(p)) { yield [`box ${j + 1} item`, p[0], LIMITS.itemEn]; yield [`box ${j + 1} item`, p[1], LIMITS.itemEs]; }
    if (isPair(b.ex)) { yield [`box ${j + 1} ex`, b.ex[0], LIMITS.exEn]; yield [`box ${j + 1} ex`, b.ex[1], LIMITS.exEs]; }
  }
}

function validateMaps(maps, { expected } = {}) {
  const errs = [], warns = [], titles = new Set(), slugs = new Set();
  if (expected !== undefined && maps.length !== expected) errs.push(`expected ${expected} maps, found ${maps.length}`);
  maps.forEach((m, k) => {
    const w = `map ${k + 1} (${m.t})`;
    ["cat", "type", "lvl", "icon", "slug", "t", "es", "d"].forEach(f => { if (!isStr(m[f])) errs.push(`${w}: missing ${f}`); });
    if (!LEVELS.includes(m.lvl)) errs.push(`${w}: lvl must be ${LEVELS.join("/")}`);
    if (!TYPES.includes(m.type)) errs.push(`${w}: type must be one of ${TYPES.join("/")}`);
    if (isStr(m.cat) && !CATS.includes(m.cat)) errs.push(`${w}: unknown cat "${m.cat}" (add it to CATS in validate.js if it is new)`);
    if (isStr(m.icon) && !isEmoji(m.icon)) errs.push(`${w}: icon must be a single emoji, got "${m.icon}"`);
    if ("q" in m || "a" in m) errs.push(`${w}: remove old q/a, use qs`);
    if (!Array.isArray(m.qs) || m.qs.length !== 3 || !m.qs.every(x => x && isStr(x.q) && isStr(x.a))) errs.push(`${w}: qs must be exactly 3 {q,a}`);
    if (titles.has(m.t)) errs.push(`${w}: duplicate title`); titles.add(m.t);
    if (isStr(m.slug) && !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(m.slug)) errs.push(`${w}: slug must be lowercase a-z, 0-9 and hyphens: "${m.slug}"`);
    if (slugs.has(m.slug)) errs.push(`${w}: duplicate slug "${m.slug}"`); slugs.add(m.slug);
    if (!Array.isArray(m.boxes) || m.boxes.length !== 6) { errs.push(`${w}: needs exactly 6 boxes`); return; }
    if (["Grammar", "Structures"].includes(m.type) && !m.boxes.some(b => /common mistakes/i.test(b.h || ""))) errs.push(`${w}: Grammar/Structures maps need a box with h "Common mistakes"`);
    if (/pronunciation|silent letters|word stress|intonation|connected speech/i.test(m.t)) errs.push(`${w}: pronunciation topics are out of scope`);
    m.boxes.forEach((b, j) => {
      const bw = `${w} box ${j + 1}`;
      ["e", "h", "es"].forEach(f => { if (!isStr(b[f])) errs.push(`${bw}: missing ${f}`); });
      if (isStr(b.e) && !isEmoji(b.e)) errs.push(`${bw}: e must be a single emoji, got "${b.e}"`);
      if (!Array.isArray(b.i) || b.i.length < 2 || b.i.length > 4 || !b.i.every(isPair)) errs.push(`${bw}: i must be 2-4 [en,es] pairs`);
      else b.i.forEach(([a, c]) => {
        if (a.trim() === c.trim()) errs.push(`${bw}: identical pair "${a}"`);
        else if (en.test(c) && !es.test(c)) warns.push(`${bw}: second element may be English: "${c}"`);
      });
      if (!isPair(b.ex)) errs.push(`${bw}: ex must be [en,es]`);
      else if (en.test(b.ex[1]) && !es.test(b.ex[1])) warns.push(`${bw}: ex translation may be English: "${b.ex[1]}"`);
    });
    for (const [label, s, max] of texts(m)) {
      if (typeof s !== "string") continue;
      if (s !== s.trim()) errs.push(`${w}: ${label} has leading/trailing spaces: "${s}"`);
      if (/\s{2,}|[\t\n\r]/.test(s.trim())) errs.push(`${w}: ${label} has double spaces or line breaks: "${s}"`);
      if (s.length > max) errs.push(`${w}: ${label} is ${s.length} characters, max ${max}: "${s.slice(0, 40)}…"`);
    }
  });
  return { errs, warns };
}

function loadFile(file) {
  const win = {};
  new Function("window", fs.readFileSync(file, "utf8"))(win);
  return win.MAPS || [];
}

module.exports = { validateMaps, loadFile, TYPES, CATS, LEVELS, LIMITS, isEmoji };

if (require.main === module) {
  const file = process.argv[2], expected = process.argv[3] === undefined ? undefined : +process.argv[3];
  let maps;
  try { maps = loadFile(file); } catch (e) { console.log("SYNTAX ERROR:", e.message); process.exit(1); }
  const { errs, warns } = validateMaps(maps, { expected });
  if (warns.length) console.log(`WARNINGS (${warns.length}), review:\n` + warns.slice(0, 40).join("\n"));
  console.log(errs.length ? errs.join("\n") : `OK: ${maps.length} maps; types: ${[...new Set(maps.map(m => m.type))].join(", ")}`);
  process.exit(errs.length ? 1 : 0);
}
