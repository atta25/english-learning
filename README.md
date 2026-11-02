# 🇬🇧 British English Visual Maps (A1–C2)

303 illustrated visual maps to learn British English (vocabulary, grammar, expressions and structures), with Spanish translations and 3 exercises per map.

Open `index.html` in a browser, or use the GitHub Pages link. No build step or dependencies.

## Levels

| A1 | A2 | B1 | B2 | C1 | C2 |
|----|----|----|----|----|----|
| 30 | 39 | 100 | 69 | 40 | 25 |

## Structure

- `index.html`: the app (filters by category, type and level; search; lazy loading; print-friendly).
- `data/part1..10.js`: map content (`window.MAPS`).
- `data/art1..10.js`: emoji illustrations per map, keyed by map title (`window.ART`).
- `validate.js`, `validate-art.js`: content checks (`node validate.js data/part1.js 30`, `node validate-art.js`).

If you rename a map title (`t`), update its key in the matching `data/artN.js`.
