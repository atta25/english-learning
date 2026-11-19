// Text helpers: accent folding, search normalisation, slugs and HTML escaping. Pure functions.
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else { root.EVM = root.EVM || {}; root.EVM.text = api; }
})(typeof self !== "undefined" ? self : this, function () {
  const HTML_ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

  // "Café" -> "cafe": lower case without accents.
  const fold = s => String(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

  return {
    fold,
    esc: s => String(s).replace(/[&<>"']/g, c => HTML_ESCAPES[c]),
    // Search form: letters and digits only, one space between words and around the text (" cafe con leche "),
    // so that "includes(' ' + word)" matches the start of a word.
    norm: s => " " + fold(s).replace(/[^a-z0-9]+/g, " ").trim() + " ",
    // "Cafés & Pubs" -> "cafes-and-pubs"
    slugify: s => fold(s).replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""),
    // lang="en" for exercise prompts, except translation prompts that contain Spanish text.
    enAttr: s => /[áéíóúñ¿¡]/.test(s) ? "" : ' lang="en"',
  };
});
