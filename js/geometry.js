// Shapes of the cloud and of the dotted arrows. Pure functions: they receive plain rectangles ({left, right, top, width, height}).
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else { root.EVM = root.EVM || {}; root.EVM.geometry = factory(); }
})(typeof self !== "undefined" ? self : this, function () {
  const ARROW = {
    CLOUD_INSET: 8, // px the arrow starts inside the cloud edge
    BOX_GAP: 4, // px the arrow tip enters the box
    SLOT_SPREAD: 0.28, // vertical distance between the 3 arrows on each side, as a fraction of the cloud height
    BOX_ANCHOR: 0.28, // where the tip meets the box, as a fraction of its height
    STUB: 30, // px of straight line before the tip, so the dots meet the middle of the arrowhead
  };

  // Scalloped cloud outline around a superellipse.
  function cloudPath(w, h) {
    const cx = w / 2, cy = h / 2, rx = w / 2 + 6, ry = h / 2 + 4, n = 3.4;
    const pt = t => {
      const c = Math.cos(t), s = Math.sin(t);
      return [cx + rx * Math.sign(c) * Math.pow(Math.abs(c), 2 / n), cy + ry * Math.sign(s) * Math.pow(Math.abs(s), 2 / n)];
    };
    const per = 4 * (rx + ry) * 0.9, N = Math.max(14, Math.round(per / 58));
    let d = "", prev = pt(0);
    d += `M${prev[0].toFixed(1)},${prev[1].toFixed(1)}`;
    for (let k = 1; k <= N; k++) {
      const p = pt(2 * Math.PI * k / N), chord = Math.hypot(p[0] - prev[0], p[1] - prev[1]);
      d += ` A${(chord * 0.62).toFixed(1)},${(chord * 0.62).toFixed(1)} 0 0 1 ${p[0].toFixed(1)},${p[1].toFixed(1)}`;
      prev = p;
    }
    return d + "Z";
  }

  // Path of one arrow, in the coordinates of the map (page). `left`: the box is in the left column;
  // `slot` is -1, 0 or 1 (top, middle, bottom arrow of that side).
  function arrowPath({ cloud, box, page, left, slot }) {
    const x1 = (left ? cloud.left + ARROW.CLOUD_INSET : cloud.right - ARROW.CLOUD_INSET) - page.left;
    const y1 = cloud.top + cloud.height / 2 + slot * cloud.height * ARROW.SLOT_SPREAD - page.top;
    const x2 = (left ? box.right : box.left) - page.left + (left ? ARROW.BOX_GAP : -ARROW.BOX_GAP);
    const y2 = box.top + box.height * ARROW.BOX_ANCHOR - page.top;
    const stub = Math.min(ARROW.STUB, Math.abs(x1 - x2) / 2), xe = left ? x2 + stub : x2 - stub, mx = (x1 + xe) / 2;
    return `M${x1},${y1} C${mx},${y1} ${mx},${y2} ${xe},${y2} L${x2},${y2}`;
  }

  return { cloudPath, arrowPath, ARROW };
});
