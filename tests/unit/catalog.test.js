const test = require("node:test");
const assert = require("node:assert/strict");
const { buildCatalog } = require("../../js/catalog");
const config = require("../../js/config");
const { loadData } = require("./helpers");

const raw = [
  { slug: "b1-tenses", cat: "T", lvl: "B1" }, { slug: "a1-words", cat: "W", lvl: "A1" },
  { slug: "a1-tenses", cat: "T", lvl: "A1" }, { slug: "a1-words-2", cat: "W", lvl: "A1" },
];

test("sorts by level, then category (first appearance), then original order, and numbers the maps", () => {
  const { all } = buildCatalog(raw, config.LEVELS);
  assert.deepEqual(all.map(m => m.slug), ["a1-tenses", "a1-words", "a1-words-2", "b1-tenses"]);
  assert.deepEqual(all.map(m => m.id), [0, 1, 2, 3]);
});
test("builds the category list and the slug lookup", () => {
  const { all, cats, bySlug } = buildCatalog(raw, config.LEVELS);
  assert.deepEqual(cats, ["T", "W"]);
  assert.equal(bySlug.get("a1-words-2"), all[2]);
});
test("does not modify the raw data", () => {
  const copy = JSON.stringify(raw);
  buildCatalog(raw, config.LEVELS);
  assert.equal(JSON.stringify(raw), copy);
});
test("real data: 303 maps, ids 0..n-1, unique slugs, every category is known", () => {
  const { maps } = loadData();
  const { all, cats } = buildCatalog(maps, config.LEVELS);
  assert.equal(all.length, maps.length);
  assert.deepEqual(all.map(m => m.id), all.map((_, i) => i));
  assert.equal(new Set(all.map(m => m.slug)).size, all.length);
  cats.forEach(c => assert.ok(config.categoryNames().includes(c), `unknown category ${c}`));
});
