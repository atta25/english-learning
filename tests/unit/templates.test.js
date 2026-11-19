const test = require("node:test");
const assert = require("node:assert/strict");
const t = require("../../js/templates");
const config = require("../../js/config");
const { buildCatalog } = require("../../js/catalog");
const { loadData } = require("./helpers");

const ctx = { art: {}, say: "<button class=say>S</button>", palette: config.PALETTE, mascots: ["M1", "M2"] };
const box = (n, extra = {}) => ({ e: "📅", h: `Box <${n}>`, es: `Caja ${n}`, i: [[`en ${n} & more`, `es ${n}`], [`two ${n}`, `dos ${n}`]], ex: [`example ${n}`, `ejemplo ${n}`], ...extra });
const map = { id: 7, slug: "my-map", t: "My <b>Map</b>", es: "Mi mapa", d: "Descripción", cat: "Grammar: Structures", type: "Grammar", lvl: "B1", icon: "🔄",
  boxes: [0, 1, 2, 3, 4, 5].map(n => box(n)), qs: [{ q: "Choose: a / b", a: "a" }, { q: "Traduce: ¿Cómo estás?", a: "x" }, { q: "Fix: he go", a: "he goes" }] };

test("mapHTML builds 6 boxes with the palette, the title, the exercises and the link button", () => {
  const html = t.mapHTML(map, ctx);
  assert.equal((html.match(/class="box/g) || []).length, 6);
  for (let j = 0; j < 6; j++) assert.ok(html.includes(`id="b7_${j}" style="--c:${config.PALETTE[j]}"`));
  assert.ok(html.includes('id="m7"') && html.includes('data-id="7"') && html.includes('id="c7"'));
  assert.ok(html.includes('data-slug="my-map"') && html.includes('class="level lv-B1"'));
  assert.equal((html.match(/<div class="q"/g) || []).length, 3);
  assert.equal((html.match(/<details>/g) || []).length, 3);
});
test("mapHTML escapes data and marks English text", () => {
  const html = t.mapHTML(map, ctx);
  assert.ok(!html.includes("<b>Map</b>") && html.includes("My &lt;b&gt;Map&lt;/b&gt;"));
  assert.ok(html.includes("en 0 &amp; more"));
  assert.ok(html.includes('<h1 lang="en">'));
  assert.ok(html.includes('class="q" lang="en">1. Choose'), "English prompt is marked");
  assert.ok(html.includes('class="q">2. Traduce'), "Spanish prompt is not");
});
test("mapHTML opens only the first box and uses the art of the map when there is some", () => {
  const html = t.mapHTML(map, { ...ctx, art: { "my-map": { scene: ["🅰", "🅱", "🆎", "🆑"], mascot: "MM", boxes: [["🍎", "🍌"]] } } });
  assert.equal((html.match(/class="box open"/g) || []).length, 1);
  assert.ok(html.includes('class="box open" id="b7_0"'), "the open box is the first one");
  assert.equal((html.match(/class="stk mascot">MM</g) || []).length, 6);
  assert.ok(html.includes("🍎") && html.includes("🅰"));
});
test("without art it falls back to the mascot list and the map icon", () => {
  const html = t.mapHTML(map, ctx);
  assert.ok(html.includes('class="stk mascot">M2<'), "id 7 -> mascot 7 %% 2 = 1");
  assert.ok(html.includes("🔄"));
});
test("the audio button goes next to every English sentence", () => {
  assert.equal((t.mapHTML(map, ctx).match(/<button class=say>/g) || []).length, 6 * 2 + 6);
  assert.equal((t.mapHTML(map, { ...ctx, say: "" }).match(/<button class=say>/g) || []).length, 0);
});
test("picHTML positions 1, 2 or 3 stickers and ignores more than 3", () => {
  assert.equal((t.picHTML(["a"]).match(/class="stk"/g) || []).length, 1);
  assert.equal((t.picHTML(["a", "b", "c", "d"]).match(/class="stk"/g) || []).length, 3);
});
test("tabs, levels, chips and the 'more' button", () => {
  const counts = new Map([["Grammar: Structures", 2]]);
  const tabs = t.tabsHTML(["Grammar: Structures"], "Grammar: Structures", counts, 10);
  assert.ok(tabs.includes("📚 All") && tabs.includes("(10)") && tabs.includes("(2)") && tabs.includes('class="on" data-c="Grammar: Structures"'));
  assert.ok(tabs.includes("Structures") && tabs.includes('class="" data-c="All"'));
  const levels = t.levelsHTML(config.LEVELS, "B1");
  assert.ok(levels.includes('data-l="" class="">Todos') && levels.includes('data-l="B1" class="on"'));
  assert.equal((levels.match(/<button/g) || []).length, 7);
  assert.ok(t.chipsHTML([map]).includes('href="#my-map" data-k="0" lang="en">🔄 8. My &lt;b&gt;Map&lt;/b&gt;'));
  assert.equal(t.moreLabel(12, 303), "⬇ Cargar más (12/303)");
  assert.ok(t.moreHTML(6, 303).includes('id="more"') && t.moreHTML(6, 303).includes("6/303"));
});
test("cloud and arrow SVG snippets", () => {
  assert.equal((t.cloudSVG(600, 300).match(/<path/g) || []).length, 2);
  const markers = t.arrowMarkers(3, ["#111", "#222"]);
  assert.ok(markers.includes('id="ar3_0"') && markers.includes('id="ar3_1"') && markers.includes('fill="#222"'));
});
test("real data: every map renders 6 boxes and escapes its text", () => {
  const { maps, art } = loadData();
  const all = buildCatalog(maps, config.LEVELS).all, real = { ...ctx, art, mascots: config.MASCOTS };
  for (const m of all) {
    const html = t.mapHTML(m, real);
    assert.equal((html.match(/class="box/g) || []).length, 6, m.slug);
    assert.ok(!/<script/i.test(html), m.slug);
  }
});
