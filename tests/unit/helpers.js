// Loads the real data (data/part*.js and data/art*.js) the same way the validators do.
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..", "..");
function loadData() {
  const win = {};
  const files = prefix => fs.readdirSync(path.join(root, "data")).filter(f => new RegExp(`^${prefix}\\d+\\.js$`).test(f)).sort((a, b) => parseInt(a.replace(/\D/g, "")) - parseInt(b.replace(/\D/g, "")));
  for (const f of [...files("part"), ...files("art")]) new Function("window", fs.readFileSync(path.join(root, "data", f), "utf8"))(win);
  return { maps: win.MAPS, art: win.ART };
}
module.exports = { loadData, root };
