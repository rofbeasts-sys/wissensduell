/* Fuehrt alle Test-Suiten nacheinander aus: npm test */
const { spawnSync } = require("child_process");
const path = require("path");
const suites = ["client.test.js", "achievements.test.js", "music.test.js", "answer-shuffle.test.js", "exit-confirm.test.js", "milestone-click.test.js", "speedmath-streak.test.js", "order-of-speed.test.js", "friends.test.js", "friends-client.test.js", "pwa-and-colors.test.js", "security.test.js", "multiplayer.test.js", "achievements-online.test.js"];
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
