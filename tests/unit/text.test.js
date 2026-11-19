const test = require("node:test");
const assert = require("node:assert/strict");
const { fold, esc, norm, slugify, enAttr } = require("../../js/text");

test("fold removes accents and lower-cases", () => {
  assert.equal(fold("Café CON Leche"), "cafe con leche");
  assert.equal(fold("ñandú"), "nandu");
});
test("norm keeps letters and digits, one space between words and around the text", () => {
  assert.equal(norm("Café con LECHE!"), " cafe con leche ");
  assert.equal(norm("  Hola   Mundo "), " hola mundo ");
  assert.equal(norm("I'm 25"), " i m 25 ");
  assert.equal(norm(""), "  ");
});
test("slugify makes URL-safe slugs", () => {
  assert.equal(slugify("Past Simple (Regular & Irregular)"), "past-simple-regular-and-irregular");
  assert.equal(slugify("Restaurants, Cafés & Pubs"), "restaurants-cafes-and-pubs");
  assert.equal(slugify("Inversion (Never have I…, Not only… but also…)"), "inversion-never-have-i-not-only-but-also");
  assert.equal(slugify("  --Hola--  "), "hola");
});
test("esc escapes the five HTML characters and leaves the rest", () => {
  assert.equal(esc(`<a href="x">Tom & 'Jerry'</a>`), "&lt;a href=&quot;x&quot;&gt;Tom &amp; &#39;Jerry&#39;&lt;/a&gt;");
  assert.equal(esc(42), "42");
});
test("enAttr marks prompts as English unless they contain Spanish letters", () => {
  assert.equal(enAttr("Choose: plays / is playing"), ' lang="en"');
  assert.equal(enAttr("Translate: 'Me duele la cabeza.' ¿Cómo?"), "");
});
