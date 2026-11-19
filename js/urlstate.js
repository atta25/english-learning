// Conversion between the address bar and the page state: ?lvl=B1&cat=tenses&q=get#map-slug. Pure functions.
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory(require("./text"), require("./config"));
  else { root.EVM = root.EVM || {}; root.EVM.urlstate = factory(root.EVM.text, root.EVM.config); }
})(typeof self !== "undefined" ? self : this, function (text, config) {
  // Value of a category in the URL: its short label as a slug ("Phrasal & Idioms" -> "phrasal-and-idioms").
  const catKey = cat => text.slugify(config.shortName(cat));

  // Reads "?lvl=B1&cat=tenses&q=get" into { lvl, cat, query }. Unknown values fall back to "no filter".
  function parseFilters(search, cats) {
    const p = new URLSearchParams(search);
    const lvl = p.get("lvl"), cat = p.get("cat");
    return {
      lvl: config.LEVELS.includes(lvl) ? lvl : "",
      cat: cats.find(c => catKey(c) === cat) || config.ALL,
      query: (p.get("q") || "").trim().slice(0, config.QUERY_MAX_LENGTH),
    };
  }

  // The opposite: { lvl, cat, query } -> "?lvl=B1&cat=tenses&q=get" ("" when there is no filter).
  function filtersQuery({ lvl, cat, query }) {
    const p = new URLSearchParams();
    if (lvl) p.set("lvl", lvl);
    if (cat !== config.ALL) p.set("cat", catKey(cat));
    if (query) p.set("q", query);
    const qs = p.toString();
    return qs ? "?" + qs : "";
  }

  // Finds the map named by "#slug". Also accepts legacy "#m12" links (numeric position).
  function mapFromHash(hash, bySlug, all) {
    let h = hash.slice(1);
    try { h = decodeURIComponent(h); } catch (e) { return null; }
    const legacy = h.match(/^m(\d+)$/);
    return bySlug.get(h) || (legacy && all[+legacy[1]]) || null;
  }

  return { catKey, parseFilters, filtersQuery, mapFromHash };
});
