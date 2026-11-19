const test = require("node:test");
const assert = require("node:assert/strict");
const u = require("../../js/urlstate");
const config = require("../../js/config");

const cats = config.categoryNames();
const maps = [{ slug: "first", id: 0 }, { slug: "second", id: 1 }, { slug: "third", id: 2 }];
const bySlug = new Map(maps.map(m => [m.slug, m]));

test("catKey is the short label as a slug", () => {
  assert.equal(u.catKey("Grammar: Tenses & Verbs"), "tenses");
  assert.equal(u.catKey("Phrasal Verbs, Idioms & Collocations"), "phrasal-and-idioms");
  assert.equal(u.catKey("Unknown Category"), "unknown-category");
});
test("parseFilters reads level, category and query", () => {
  assert.deepEqual(u.parseFilters("?lvl=B1&cat=tenses&q=get", cats), { lvl: "B1", cat: "Grammar: Tenses & Verbs", query: "get" });
  assert.deepEqual(u.parseFilters("", cats), { lvl: "", cat: "All", query: "" });
  assert.equal(u.parseFilters("?q=tea+cup", cats).query, "tea cup");
});
test("parseFilters ignores invalid values and caps the query", () => {
  assert.deepEqual(u.parseFilters("?lvl=Z9&cat=nope", cats), { lvl: "", cat: "All", query: "" });
  assert.equal(u.parseFilters("?q=" + "x".repeat(300), cats).query.length, config.QUERY_MAX_LENGTH);
  assert.equal(u.parseFilters("?q=%20%20hi%20", cats).query, "hi");
});
test("filtersQuery builds the query string and round-trips with parseFilters", () => {
  assert.equal(u.filtersQuery({ lvl: "", cat: "All", query: "" }), "");
  assert.equal(u.filtersQuery({ lvl: "C2", cat: "All", query: "" }), "?lvl=C2");
  const f = { lvl: "B1", cat: "Communication & British Culture", query: "tea cup & more" };
  const qs = u.filtersQuery(f);
  assert.equal(qs, "?lvl=B1&cat=culture&q=tea+cup+%26+more");
  assert.deepEqual(u.parseFilters(qs, cats), f);
});
test("mapFromHash finds maps by slug, accepts legacy #mN links and survives bad input", () => {
  assert.equal(u.mapFromHash("#second", bySlug, maps), maps[1]);
  assert.equal(u.mapFromHash("#m2", bySlug, maps), maps[2]);
  assert.equal(u.mapFromHash("#m99", bySlug, maps), null);
  assert.equal(u.mapFromHash("#nope", bySlug, maps), null);
  assert.equal(u.mapFromHash("", bySlug, maps), null);
  assert.equal(u.mapFromHash("#%E0%A4%A", bySlug, maps), null, "malformed percent-encoding");
});
