// Page behaviour: state, rendering, URL, events. The logic that does not touch the DOM lives in the other js/ files.
(function () {
  "use strict";
  const { config, text, catalog, search, geometry, templates, urlstate, speech, theme } = window.EVM;
  const $ = id => document.getElementById(id);

  // ---- Data and state ----
  const { all: ALL, cats, bySlug } = catalog.buildCatalog(window.MAPS || [], config.LEVELS);
  const index = search.buildIndex(ALL);
  const mapsPerCategory = new Map(cats.map(c => [c, ALL.filter(m => m.cat === c).length]));
  const ctx = { art: window.ART || {}, say: speech.buttonHTML, palette: config.PALETTE, mascots: config.MASCOTS };
  // lvl/cat/query: the active filters. list: maps that match them. shown: how many of list are on the page.
  const state = { lvl: "", cat: config.ALL, query: "", list: [], shown: 0 };
  const BASE_TITLE = document.title;
  const isMobile = () => window.matchMedia(`(max-width:${config.BREAKPOINT}px)`).matches;

  // ---- Theme button (the theme itself is applied by the script in the <head>, before the first paint) ----
  const themeButton = $("theme");
  const syncThemeButton = () => { themeButton.textContent = theme.get() === "dark" ? "☀️" : "🌙"; };
  themeButton.addEventListener("click", () => { theme.set(theme.get() === "dark" ? "light" : "dark"); syncThemeButton(); });
  syncThemeButton();

  // ---- Address bar ----
  // history.* can throw on file:// pages, in which case the URL simply is not updated.
  const setURL = (url, push) => { try { history[push ? "pushState" : "replaceState"](null, "", url); } catch (e) { /* ignore */ } };
  const setTitle = m => { document.title = m ? `${m.t} · ${BASE_TITLE}` : BASE_TITLE; };
  const syncFilters = () => { setURL(config.PAGE + urlstate.filtersQuery(state), false); setTitle(null); };
  const baseURL = () => { const u = location.href.split(/[?#]/)[0]; return u.endsWith("/") ? u + config.PAGE : u; };

  function setFilters(filters) {
    Object.assign(state, filters);
    $("q").value = state.query;
  }

  // Shows a map and scrolls to it. If the current filters hide it, they are cleared so the link always works.
  function goToMap(m, { push = false, smooth = true } = {}) {
    if (!state.list.includes(m)) {
      setFilters({ lvl: "", cat: config.ALL, query: "" });
      render();
    }
    showUpTo(state.list.indexOf(m) + 1);
    setURL(config.PAGE + urlstate.filtersQuery(state) + "#" + m.slug, push);
    setTitle(m);
    const target = () => $("m" + m.id);
    requestAnimationFrame(() => {
      target().scrollIntoView({ behavior: smooth ? "smooth" : "auto" });
      if (!smooth && document.fonts && document.fonts.ready) {
        // the web font can shift the layout after the first scroll: re-align if the user has not moved
        const y = window.scrollY;
        document.fonts.ready.then(() => requestAnimationFrame(() => { if (Math.abs(window.scrollY - y) < 5) target().scrollIntoView(); }));
      }
    });
  }

  // Applies the URL to the page. On back/forward the list is only rebuilt when the filters actually changed.
  function applyURL(initial) {
    const before = urlstate.filtersQuery(state);
    setFilters(urlstate.parseFilters(location.search, cats));
    // shared links like ".../?lvl=B1" are rewritten to ".../index.html?lvl=B1" right away
    if (initial && (location.search || location.hash) && !location.pathname.endsWith(config.PAGE)) {
      setURL(config.PAGE + urlstate.filtersQuery(state) + location.hash, false);
    }
    if (initial || before !== urlstate.filtersQuery(state)) render();
    const m = urlstate.mapFromHash(location.hash, bySlug, ALL);
    if (m) goToMap(m, { smooth: false });
    else setTitle(null);
  }

  function copyMapLink(btn) {
    const url = baseURL() + "#" + btn.dataset.slug;
    const done = () => {
      btn.textContent = "✓"; btn.title = "¡Enlace copiado!";
      setTimeout(() => { btn.textContent = "🔗"; btn.title = "Copiar enlace"; }, 1500);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(done, () => prompt("Copia este enlace:", url));
    else prompt("Copia este enlace:", url);
  }

  // ---- Rendering ----
  // Rebuilds the controls and the whole list. Needed when the list itself changes (filters, search).
  function render() {
    state.list = search.filterMaps(ALL, index, state);
    $("tabs").innerHTML = templates.tabsHTML(cats, state.cat, mapsPerCategory, ALL.length);
    $("seg").innerHTML = templates.levelsHTML(config.LEVELS, state.lvl);
    $("count").textContent = `${state.list.length} mapas`;
    $("chips").innerHTML = templates.chipsHTML(state.list);
    state.shown = Math.min(config.STEP, state.list.length);
    paint();
  }

  function paint() {
    speech.stop();
    $("maps").innerHTML = state.list.slice(0, state.shown).map(m => templates.mapHTML(m, ctx)).join("") +
      (state.shown < state.list.length ? templates.moreHTML(state.shown, state.list.length) : "");
    requestAnimationFrame(() => draw());
  }

  // Appends maps up to position n without touching the ones already rendered (keeps open answers and boxes).
  function showUpTo(n) {
    n = Math.min(state.list.length, n);
    if (n <= state.shown) return;
    const added = state.list.slice(state.shown, n), wrap = $("moreWrap");
    state.shown = n;
    const html = added.map(m => templates.mapHTML(m, ctx)).join("");
    if (wrap) wrap.insertAdjacentHTML("beforebegin", html);
    else $("maps").insertAdjacentHTML("beforeend", html);
    if (wrap) {
      if (state.shown >= state.list.length) wrap.remove();
      else $("more").textContent = templates.moreLabel(state.shown, state.list.length);
    }
    requestAnimationFrame(() => draw(added.map(m => $("m" + m.id))));
  }

  // ---- Cloud and arrows (SVG) ----
  const SVG_NS = "http://www.w3.org/2000/svg";
  function svgEl(tag, attrs) {
    const el = document.createElementNS(SVG_NS, tag);
    for (const [name, value] of Object.entries(attrs)) el.setAttribute(name, value);
    return el;
  }

  // Redraws cloud outlines and arrows. Pass a .page (or an array of them) to redraw only those maps.
  function draw(only) {
    const mobile = isMobile(); // the arrows are hidden by CSS on mobile, so they are not built
    const pages = only ? [].concat(only) : [...document.querySelectorAll(".page")];
    // read phase: measure everything first to avoid forced layouts between writes
    const measured = pages.map(page => {
      const id = +page.dataset.id, cloud = $("c" + id).getBoundingClientRect();
      if (mobile) return { page, id, cloud };
      return { page, id, cloud, rect: page.getBoundingClientRect(), boxes: [0, 1, 2, 3, 4, 5].map(j => $(`b${id}_${j}`).getBoundingClientRect()) };
    });
    // write phase
    measured.forEach(({ page, id, cloud, rect, boxes }) => {
      const cloudSvg = page.querySelector("svg.cl");
      cloudSvg.setAttribute("viewBox", `0 0 ${cloud.width} ${cloud.height}`);
      cloudSvg.innerHTML = templates.cloudSVG(cloud.width, cloud.height);
      if (mobile) return;
      const arrows = page.querySelector("svg.arrows");
      arrows.innerHTML = templates.arrowMarkers(id, config.PALETTE);
      boxes.forEach((box, j) => {
        arrows.appendChild(svgEl("path", {
          d: geometry.arrowPath({ cloud, box, page: rect, left: j < 3, slot: j % 3 - 1 }),
          fill: "none", stroke: config.PALETTE[j], "stroke-width": "3", "stroke-linecap": "round", "stroke-dasharray": "1 7", "marker-end": `url(#ar${id}_${j})`,
        }));
      });
    });
  }

  // ---- Events ----
  $("tabs").addEventListener("click", e => {
    const b = e.target.closest("button[data-c]");
    if (b) { state.cat = b.dataset.c; render(); syncFilters(); }
  });
  $("seg").addEventListener("click", e => {
    const b = e.target.closest("button[data-l]");
    if (b) { state.lvl = b.dataset.l; render(); syncFilters(); }
  });
  $("chips").addEventListener("click", e => {
    const a = e.target.closest("a[data-k]");
    if (!a) return;
    e.preventDefault();
    goToMap(state.list[+a.dataset.k], { push: true });
  });

  let searchTimer = 0;
  $("q").addEventListener("input", e => {
    const value = e.target.value.trim();
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => { state.query = value; render(); syncFilters(); }, config.SEARCH_DEBOUNCE_MS);
  });

  let resizeFrame = 0;
  window.addEventListener("resize", () => { cancelAnimationFrame(resizeFrame); resizeFrame = requestAnimationFrame(() => draw()); });

  const upButton = $("up");
  window.addEventListener("scroll", () => upButton.classList.toggle("show", window.scrollY > config.SCROLL_TOP_SHOW_PX), { passive: true });
  upButton.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));

  $("maps").addEventListener("click", e => {
    if (e.target.closest("#more")) { showUpTo(state.shown + config.STEP); return; }
    const say = e.target.closest(".say");
    if (say) { speech.speak(say); return; }
    const link = e.target.closest(".copylink");
    if (link) { copyMapLink(link); return; }
    const header = e.target.closest(".box .hd");
    if (header && isMobile()) header.parentElement.classList.toggle("open");
  });
  document.addEventListener("toggle", e => { const m = e.target.closest(".page"); if (m) draw(m); }, true);
  window.addEventListener("popstate", () => applyURL(false));

  // ---- Start ----
  applyURL(true);
  // The web font changes text metrics after the first draw, so redraw once it is ready.
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => draw());

  // Offline support and installability (service worker needs http(s); it is skipped on file://)
  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => { /* ignore */ }));
  }
})();
