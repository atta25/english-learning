const test = require("node:test");
const assert = require("node:assert/strict");
const config = require("../../js/config");
const { loadData } = require("./helpers");

test("levels, palette and categories are well formed", () => {
  assert.deepEqual(config.LEVELS, ["A1", "A2", "B1", "B2", "C1", "C2"]);
  assert.equal(config.PALETTE.length, 6);
  assert.equal(new Set(config.categoryNames()).size, config.CATEGORIES.length);
  assert.equal(new Set(config.CATEGORIES.map(c => c.short)).size, config.CATEGORIES.length, "short labels are used in URLs, they must be unique");
});
test("shortName falls back to the full name", () => {
  assert.equal(config.shortName("Grammar: Structures"), "Structures");
  assert.equal(config.shortName("Something new"), "Something new");
});
test("every category used by the data is declared", () => {
  const { maps } = loadData();
  const used = new Set(maps.map(m => m.cat));
  used.forEach(c => assert.ok(config.categoryNames().includes(c), `${c} is missing in js/config.js`));
  assert.equal(used.size, config.CATEGORIES.length, "a declared category has no maps");
});
