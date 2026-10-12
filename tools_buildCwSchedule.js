// Erzeugt shared/crosswordSchedule.json: ein fester Plan, in dem jedes Wort pro Zyklus nur EINMAL vorkommt.
// Aufruf: node tools_buildCwSchedule.js   (nach jeder Aenderung an shared/crosswordBank.json neu ausfuehren)
const fs = require("fs"), path = require("path");
const { makeCrossword } = require("./lib/dailyPuzzles.js");
const MIN_BIG = 20, MIN_MEDIUM = 10, MIN_SMALL = 5;
const out = {};
for (const lang of ["de", "en"]) {
  const used = new Set(); const days = [];
  for (let day = 0; day < 400; day++) {
    const big = makeCrossword("sched:" + lang + ":" + day, "big", lang, used);
    if (big.words.length < MIN_BIG) break;
    const u2 = new Set(used); big.words.forEach(w => u2.add(w.w));
    const small = makeCrossword("sched:" + lang + ":" + day, "small", lang, u2);
    if (small.words.length < MIN_SMALL) break;
    const u3 = new Set(u2); small.words.forEach(w => u3.add(w.w));
    const medium = makeCrossword("sched:" + lang + ":" + day, "medium", lang, u3);
    if (medium.words.length < MIN_MEDIUM) break;
    big.words.forEach(w => used.add(w.w)); small.words.forEach(w => used.add(w.w)); medium.words.forEach(w => used.add(w.w));
    const pack = c => ({ size: c.size, grid: c.grid.map(r => r.map(x => x || ".").join("")), numAt: c.numAt, words: c.words });
    days.push({ big: pack(big), medium: pack(medium), small: pack(small) });
  }
  out[lang] = days;
  console.log(lang, "Tage:", days.length, "Woerter benutzt:", used.size, "von", require("./shared/crosswordBank.json")[lang].length, "big je Tag:", (days.reduce((a, d) => a + d.big.words.length, 0) / days.length).toFixed(1), "small:", (days.reduce((a, d) => a + d.small.words.length, 0) / days.length).toFixed(1));
}
fs.writeFileSync(path.join(__dirname, "shared/crosswordSchedule.json"), JSON.stringify(out));
