// Shared constants. Loaded by the page (as EVM.config) and by Node (validators, tests).
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else { root.EVM = root.EVM || {}; root.EVM.config = api; }
})(typeof self !== "undefined" ? self : this, function () {
  // One entry per category, in the order used by the filters. "short" is the label of its tab and the value used in URLs.
  const CATEGORIES = [
    { name: "Grammar: Tenses & Verbs", short: "Tenses" },
    { name: "Grammar: Structures", short: "Structures" },
    { name: "Phrasal Verbs, Idioms & Collocations", short: "Phrasal & Idioms" },
    { name: "Vocabulary: Everyday Life", short: "Everyday" },
    { name: "Vocabulary: Work, Study & Society", short: "Work & Study" },
    { name: "Communication & British Culture", short: "Culture" },
  ];
  return {
    ALL: "All", // value of the "no category filter" tab
    PAGE: "index.html", // written in URLs so they read ".../index.html?lvl=B1" instead of ".../?lvl=B1"
    LEVELS: ["A1", "A2", "B1", "B2", "C1", "C2"],
    CATEGORIES,
    categoryNames: () => CATEGORIES.map(c => c.name),
    shortName: cat => (CATEGORIES.find(c => c.name === cat) || {}).short || cat,
    PALETTE: ["#2563eb","#dc2626","#059669","#d97706","#7c3aed","#db2777"], // colour of each of the 6 boxes of a map
    MASCOTS: ["🧑‍🏫","💁‍♀️","🧔","👩‍🎓","🧑‍💼","🙋‍♂️"], // fallback when a map has no mascot of its own
    BREAKPOINT: 1000, // px: below this width the layout is one column and the arrows are hidden (keep in sync with style.css)
    STEP: 6, // maps added by each "Cargar más"
    SEARCH_DEBOUNCE_MS: 150,
    SCROLL_TOP_SHOW_PX: 400,
    QUERY_MAX_LENGTH: 100,
  };
});
