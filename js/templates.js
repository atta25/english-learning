// HTML and SVG strings for the page. Pure functions: same input, same output, no DOM access.
// `ctx` carries what depends on the page: { art, say, palette, mascots }.
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory(require("./text"), require("./config"), require("./geometry"));
  else { root.EVM = root.EVM || {}; root.EVM.templates = factory(root.EVM.text, root.EVM.config, root.EVM.geometry); }
})(typeof self !== "undefined" ? self : this, function (text, config, geometry) {
  const { esc } = text;

  // Where the 1-3 sticker emojis go inside the round picture of a box: [left, top, size, rotation] per sticker.
  const STICKER_SLOTS = {
    1: [[22, 16, 52, -6]],
    2: [[4, 30, 50, -8], [44, 2, 44, 8]],
    3: [[2, 36, 40, -8], [46, 34, 40, 7], [22, 2, 46, -3]],
  };

  function picHTML(emojis) {
    const slots = STICKER_SLOTS[Math.min(emojis.length, 3)];
    const stickers = emojis.slice(0, 3).map((e, k) =>
      `<span class="stk" style="left:${slots[k][0]}px;top:${slots[k][1]}px;font-size:${slots[k][2]}px;transform:rotate(${slots[k][3]}deg)">${e}</span>`);
    return `<div class="pic">${stickers.join("")}</div>`;
  }

  function boxHTML(m, b, j, ctx, art, mascot) {
    const items = b.i.map(([en, es]) => `<li><b lang="en">${esc(en)}${ctx.say}</b><i>${esc(es)}</i></li>`).join("");
    return `<div class="box${j === 0 ? " open" : ""}" id="b${m.id}_${j}" style="--c:${ctx.palette[j % ctx.palette.length]}">
    <div class="hd"><div class="num">${j + 1}</div><div><h3 lang="en">${esc(b.h)}</h3></div></div>
    <div class="bd">${picHTML((art.boxes && art.boxes[j]) || [b.e])}
      <ul>${items}</ul></div>
    <div class="speak"><div class="bubble"><b lang="en">${esc(b.ex[0])}${ctx.say}</b><span>${esc(b.ex[1])}</span></div><span class="stk mascot">${mascot}</span></div></div>`;
  }

  function cloudHTML(m, scene) {
    const stickers = scene.map((e, k) => `<span class="stk" style="font-size:${k % 2 ? 40 : 50}px;transform:rotate(${(k - 2) * 5}deg)">${e}</span>`).join("");
    return `<div class="cloudwrap" id="c${m.id}"><svg class="cl"></svg>
          <div class="cloudin">
            <div class="scene">${stickers}</div>
            <h1 lang="en">${esc(m.t)}</h1><h2>${esc(m.es)}</h2><p>${esc(m.d)}</p>
          </div>
        </div>`;
  }

  function exerciseHTML(m) {
    const questions = m.qs.map((x, n) =>
      `<div class="q"${text.enAttr(x.q)}>${n + 1}. ${esc(x.q)}</div><details><summary>Ver respuesta</summary><div class="ans">✅ ${esc(x.a)}</div></details>`).join("");
    return `<div class="exercise"><h4 lang="en">✏️ Your turn</h4><span class="stk think">🤔</span>
          ${questions}</div>`;
  }

  // One whole map (the "page" of the notebook): 3 boxes, the cloud with the exercise, 3 boxes.
  function mapHTML(m, ctx) {
    const art = ctx.art[m.slug] || {};
    const mascot = art.mascot || ctx.mascots[m.id % ctx.mascots.length];
    const scene = art.scene || [m.icon];
    const boxes = (from, to) => m.boxes.slice(from, to).map((b, n) => boxHTML(m, b, from + n, ctx, art, mascot)).join("");
    const star = (x, y, e) => `<span class="star" style="left:${x};top:${y}">${e}</span>`;
    return `<section class="page" id="m${m.id}" data-id="${m.id}">
    <div class="rings"></div><div class="tape l"></div><div class="tape r"></div>
    ${star("2%", "46%", "✨")}${star("97%", "52%", "⭐")}${star("48%", "98%", "✨")}
    <div class="topbar"><div class="tag" lang="en">#${m.id + 1} · ${esc(m.cat)} · ${esc(m.type)}</div><button class="copylink" type="button" data-slug="${esc(m.slug)}" title="Copiar enlace" aria-label="Copiar enlace a este mapa">🔗</button><div class="level lv-${esc(m.lvl)}">${esc(m.lvl)}</div></div>
    <svg class="arrows"></svg>
    <div class="grid">
      <div class="col">${boxes(0, 3)}</div>
      <div class="mid">
        ${cloudHTML(m, scene)}
        ${exerciseHTML(m)}
      </div>
      <div class="col">${boxes(3, 6)}</div>
    </div></section>`;
  }

  // Category tabs: "All" plus one per category, each with its number of maps.
  function tabsHTML(cats, current, counts, total) {
    return [config.ALL, ...cats].map(c => {
      const isAll = c === config.ALL;
      return `<button lang="en" class="${c === current ? "on" : ""}" data-c="${esc(c)}">${isAll ? "📚 All" : esc(config.shortName(c))} <small>(${isAll ? total : counts.get(c)})</small></button>`;
    }).join("");
  }

  function levelsHTML(levels, current) {
    return ["", ...levels].map(l => `<button data-l="${l}" class="${current === l ? "on" : ""}">${l || "Todos"}</button>`).join("");
  }

  // Index of topics: one link per map of the current list.
  function chipsHTML(list) {
    return list.map((m, k) => `<a href="#${esc(m.slug)}" data-k="${k}" lang="en">${esc(m.icon)} ${m.id + 1}. ${esc(m.t)}</a>`).join("");
  }

  const moreLabel = (shown, total) => `⬇ Cargar más (${shown}/${total})`;
  const moreHTML = (shown, total) => `<div id="moreWrap" style="text-align:center;margin:10px"><button id="more" class="tabs-btn">${moreLabel(shown, total)}</button></div>`;

  // Content of the SVG that draws the cloud behind the title and the dotted ring inside it.
  function cloudSVG(w, h) {
    return `<path d="${geometry.cloudPath(w, h)}" fill="#fff" stroke="#1e3a8a" stroke-width="3.5"/><path d="${geometry.cloudPath(w - 14, h - 14)}" transform="translate(7,7)" fill="none" stroke="#93c5fd" stroke-width="2" stroke-dasharray="2 7" stroke-linecap="round"/>`;
  }

  // Arrowheads, one per colour, with ids unique to each map.
  function arrowMarkers(id, palette) {
    return `<defs>${palette.map((c, j) => `<marker id="ar${id}_${j}" markerWidth="10" markerHeight="9" refX="8" refY="4.5" orient="auto"><path d="M0,0 L10,4.5 L0,9 z" fill="${c}"/></marker>`).join("")}</defs>`;
  }

  return { picHTML, boxHTML, mapHTML, tabsHTML, levelsHTML, chipsHTML, moreLabel, moreHTML, cloudSVG, arrowMarkers, STICKER_SLOTS };
});
