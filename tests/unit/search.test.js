const test = require("node:test");
const assert = require("node:assert/strict");
const search = require("../../js/search");
const { buildCatalog } = require("../../js/catalog");
const config = require("../../js/config");
const { loadData } = require("./helpers");

const box = (h, i = [["x y", "z"], ["a b", "c"]]) => ({ h, es: h, i, ex: ["ex en", "ex es"] });
const map = (slug, t, cat, lvl, extra = {}) => ({ slug, t, es: t, d: "", cat, lvl, boxes: [box("Common mistakes")], qs: [{ q: "q", a: "a" }], ...extra });
const maps = buildCatalog([
  map("cafe-title", "Ordering at a Café", "Vocabulary: Everyday Life", "A2"),
  map("cafe-body", "Weather", "Vocabulary: Everyday Life", "A2", { boxes: [box("Rain", [["I had a coffee at the cafe", "Tomé un café"], ["it rains", "llueve"]])] }),
  map("tenses", "Present Perfect", "Grammar: Tenses & Verbs", "B1"),
], config.LEVELS).all;
const index = search.buildIndex(maps);
const find = (query, extra = {}) => search.filterMaps(maps, index, { lvl: "", cat: config.ALL, query, ...extra }).map(m => m.slug);

test("no query returns every map in catalog order", () => {
  assert.deepEqual(find(""), maps.map(m => m.slug));
});
test("ignores accents and case, and matches the start of a word only", () => {
  assert.deepEqual(find("CAFE"), ["cafe-title", "cafe-body"]);
  assert.deepEqual(find("café"), ["cafe-title", "cafe-body"]);
  assert.deepEqual(find("ordering"), ["cafe-title"]);
  assert.deepEqual(find("fee"), []); // "fee" is inside "coffee", not at its start
});
test("every word must be present, in any order", () => {
  assert.deepEqual(find("perfect present"), ["tenses"]);
  assert.deepEqual(find("present zzz"), []);
});
test("a title match ranks above a match in the body", () => {
  assert.deepEqual(find("cafe"), ["cafe-title", "cafe-body"]);
  const w = search.WEIGHTS.map(([, n]) => n);
  assert.deepEqual(w, [...w].sort((a, b) => b - a), "weights go from title down to body");
});
test("level and category filters combine with the query", () => {
  assert.deepEqual(find("", { lvl: "B1" }), ["tenses"]);
  assert.deepEqual(find("", { cat: "Vocabulary: Everyday Life" }), ["cafe-title", "cafe-body"]);
  assert.deepEqual(find("cafe", { lvl: "B1" }), []);
});
test("queryWords splits and normalises", () => {
  assert.deepEqual(search.queryWords("  Phrasal   Verb, GET "), ["phrasal", "verb", "get"]);
  assert.deepEqual(search.queryWords("   "), []);
});
test("real data: known searches keep their results", () => {
  const { maps: raw } = loadData();
  const all = buildCatalog(raw, config.LEVELS).all, idx = search.buildIndex(all);
  const count = (q, f = {}) => search.filterMaps(all, idx, { lvl: "", cat: config.ALL, query: q, ...f }).length;
  assert.equal(count(""), 303);
  assert.equal(count("umbrella"), 8);
  assert.equal(count("zzzz"), 0);
  assert.equal(count("café"), count("cafe"));
  assert.equal(count("", { lvl: "C2" }), 25);
  const top = search.filterMaps(all, idx, { lvl: "", cat: config.ALL, query: "phrasal verb get" })[0];
  assert.match(top.t, /Phrasal Verbs with GET/);
});
