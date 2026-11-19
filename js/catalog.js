// Turns the raw data (window.MAPS) into the list the page works with. Pure function.
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else { root.EVM = root.EVM || {}; root.EVM.catalog = factory(); }
})(typeof self !== "undefined" ? self : this, function () {
  // Sorts maps by level, then by category (in order of first appearance in the data), then by data order,
  // and gives each one its position as "id" (used in the DOM ids).
  function buildCatalog(rawMaps, levels) {
    const catOrder = [...new Set(rawMaps.map(m => m.cat))];
    const all = rawMaps.map((m, i) => ({ ...m, o: i }))
      .sort((a, b) => levels.indexOf(a.lvl) - levels.indexOf(b.lvl) || catOrder.indexOf(a.cat) - catOrder.indexOf(b.cat) || a.o - b.o)
      .map((m, i) => ({ ...m, id: i }));
    return { all, cats: [...new Set(all.map(m => m.cat))], bySlug: new Map(all.map(m => [m.slug, m])) };
  }
  return { buildCatalog };
});
