const test = require("node:test");
const assert = require("node:assert/strict");
const { cloudPath, arrowPath, ARROW } = require("../../js/geometry");

test("cloudPath is a closed scalloped path, deterministic and growing with the size", () => {
  const d = cloudPath(600, 300);
  assert.match(d, /^M-?[\d.]+,-?[\d.]+( A[\d.]+,[\d.]+ 0 0 1 -?[\d.]+,-?[\d.]+)+Z$/);
  assert.equal(cloudPath(600, 300), d);
  const arcs = p => (p.match(/ A/g) || []).length;
  assert.ok(arcs(cloudPath(900, 500)) > arcs(cloudPath(300, 200)));
  assert.ok(arcs(cloudPath(10, 10)) >= 14, "never fewer than 14 scallops");
});

const rect = (left, top, width, height) => ({ left, top, width, height, right: left + width });
const parse = d => d.match(/-?\d+(\.\d+)?/g).map(Number);

test("arrowPath for a box on the left ends in a horizontal stub that touches the box", () => {
  const page = rect(100, 50, 1200, 900), cloud = rect(500, 300, 400, 300), box = rect(120, 100, 300, 200);
  const d = arrowPath({ cloud, box, page, left: true, slot: 0 });
  const [x1, y1, , , , , xe, y2, x2, y2b] = parse(d);
  assert.equal(x1, 500 + ARROW.CLOUD_INSET - 100);
  assert.equal(y1, 300 + 150 - 50);
  assert.equal(x2, box.right - page.left + ARROW.BOX_GAP);
  assert.equal(y2, box.top + 200 * ARROW.BOX_ANCHOR - page.top);
  assert.equal(y2, y2b, "the last segment is horizontal");
  assert.equal(xe - x2, ARROW.STUB);
  assert.ok(d.startsWith("M") && d.includes(" C") && d.includes(" L"));
});
test("arrowPath mirrors for the right column", () => {
  const page = rect(0, 0, 1200, 900), cloud = rect(400, 300, 400, 300), box = rect(900, 100, 250, 200);
  const [x1, , , , , , xe, , x2] = parse(arrowPath({ cloud, box, page, left: false, slot: -1 }));
  assert.equal(x1, 800 - ARROW.CLOUD_INSET);
  assert.equal(x2, 900 - ARROW.BOX_GAP);
  assert.equal(x2 - xe, ARROW.STUB);
});
test("the stub shrinks when cloud and box are close", () => {
  const page = rect(0, 0, 1000, 800), cloud = rect(300, 300, 100, 100), box = rect(100, 100, 190, 100);
  const [x1, , , , , , xe, , x2] = parse(arrowPath({ cloud, box, page, left: true, slot: 1 }));
  assert.equal(xe - x2, Math.abs(x1 - x2) / 2);
});
