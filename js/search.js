// Filtering and search. Pure functions, no DOM.
// Search is accent-insensitive; every word must match at the start of a word; results are ranked by where they match.
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory(require("./text"), require("./config"));
  else { root.EVM = root.EVM || {}; root.EVM.search = factory(root.EVM.text, root.EVM.config); }
})(typeof self !== "undefined" ? self : this, function (text, config) {
  // Points for a word found in each part of a map (the best part counts once per word).
  const WEIGHTS = [["title", 10], ["cat", 6], ["head", 5], ["body", 1]];

  // One entry per map with its text already normalised, so each keystroke only does string lookups.
  function buildIndex(maps) {
    return new Map(maps.map(m => [m.id, {
      title: text.norm(m.t + " " + m.es),
      head: text.norm(m.boxes.map(b => b.h + " " + b.es).join(" ")),
      cat: text.norm(m.cat),
      body: text.norm([m.d, ...m.boxes.flatMap(b => [...b.i.flat(), ...b.ex]), ...m.qs.flatMap(x => [x.q, x.a])].join(" ")),
    }]));
  }

  const queryWords = query => text.norm(query).trim().split(" ").filter(Boolean);

  // Relevance of map m for the given words, or 0 if any word is missing.
  function score(index, m, words) {
    const fields = index.get(m.id);
    let total = 0;
    for (const w of words) {
      const hit = WEIGHTS.find(([part]) => fields[part].includes(" " + w));
      if (!hit) return 0;
      total += hit[1];
    }
    return total;
  }

  // Maps that match the level, the category and the search text. With a search text the best matches come first.
  function filterMaps(maps, index, { lvl, cat, query }) {
    const words = queryWords(query);
    let list = maps.filter(m => (cat === config.ALL || m.cat === cat) && (!lvl || m.lvl === lvl));
    if (words.length) {
      const scores = new Map(list.map(m => [m.id, score(index, m, words)]));
      list = list.filter(m => scores.get(m.id) > 0).sort((a, b) => scores.get(b.id) - scores.get(a.id) || a.id - b.id);
    }
    return list;
  }

  return { buildIndex, queryWords, score, filterMaps, WEIGHTS };
});
