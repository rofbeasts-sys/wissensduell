/* Fuehrt alle Test-Suiten nacheinander aus: npm test */
const { spawnSync } = require("child_process");
const path = require("path");
const suites = ["client.test.js", "achievements.test.js", "music.test.js", "answer-shuffle.test.js", "exit-confirm.test.js", "milestone-click.test.js", "speedmath-streak.test.js", "order-of-speed.test.js", "friends.test.js", "friends-client.test.js", "pwa-and-colors.test.js", "politics-and-english.test.js", "nennsblitz-international.test.js", "repeat-button-style.test.js", "braintest-full-translation.test.js", "categories-grouped.test.js", "blitz-grouped.test.js", "stats-and-cleanup.test.js", "shop.test.js", "stripe-shop.test.js", "biology.test.js", "braintest-dedup-biology.test.js", "braintest-full-dedup-politik.test.js", "haupttest-from-practice-pool.test.js", "answer-giveaway-fix.test.js", "answer-terse-style.test.js", "braintest-biology-transfer.test.js", "order-of-speed-thresholds.test.js", "braintest-progression.test.js", "braintest-reset-and-sync.test.js", "order-of-speed-infinite.test.js", "braintest-time-and-buttons.test.js", "avatar-picker.test.js", "stats-extended-modes.test.js", "braintest-biology-english.test.js", "braintest-prestige.test.js", "security.test.js", "multiplayer.test.js", "achievements-online.test.js"];
let failed = 0;
const started = Date.now();
for (const f of suites) {
  console.log("\n################ " + f + " ################");
  const r = spawnSync("node", [path.join(__dirname, f)], { stdio: "inherit" });
  if (r.status !== 0) { failed++; console.log(">>> " + f + " FEHLGESCHLAGEN (Exit " + r.status + ")"); }
}
console.log("\n==============================================");
console.log(failed ? failed + " von " + suites.length + " Suiten fehlgeschlagen" : "Alle " + suites.length + " Suiten bestanden", "(" + Math.round((Date.now() - started) / 1000) + " s)");
process.exit(failed ? 1 : 0);
