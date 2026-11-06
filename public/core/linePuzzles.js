/* Linienraetsel: eine Form aus Linien in EINEM Strich nachzeichnen, jedes Stueck genau einmal.
   Jede Form besteht aus Linienzuegen (Punktlisten, 0..100). Gleiche Punkte werden zu Knoten verschmolzen.
   Loesbar ist eine Form genau dann, wenn hoechstens 2 Knoten eine ungerade Anzahl Linien haben. */
(function (root) {
  function arc(cx, cy, r, a0, a1, n) { var o = [], i; for (i = 0; i <= n; i++) { var a = (a0 + (a1 - a0) * i / n) * Math.PI / 180; o.push([+(cx + r * Math.cos(a)).toFixed(1), +(cy - r * Math.sin(a)).toFixed(1)]); } return o; }
  function pol(cx, cy, r, deg) { var a = deg * Math.PI / 180; return [+(cx + r * Math.cos(a)).toFixed(1), +(cy - r * Math.sin(a)).toFixed(1)]; }
  function closed(p) { return p.concat([p[0]]); }

  var S = [];
  // ---- LEICHT ----
  S.push({ id: "haus", name: "Haus vom Nikolaus", en: "House", icon: "🏠", diff: "easy", polys: [
    [[20, 88], [80, 88], [80, 52], [20, 52], [20, 88], [80, 52]], [[80, 88], [20, 52]], [[20, 52], [50, 16], [80, 52]] ] });
  (function () {
    var dome = arc(50, 50, 36, 180, 0, 10); // links -> rechts ueber die Kuppel
    var L = dome[0], R = dome[dome.length - 1];
    S.push({ id: "schirm", name: "Regenschirm", en: "Umbrella", icon: "☂️", diff: "easy", polys: [
      dome, [R, [50, 50], L], [[50, 50], [50, 84], [44, 92], [34, 92], [30, 84]] ] });
  })();
  (function () {
    var R = 44, tips = [], mid = [], i;
    for (i = 0; i < 5; i++) { tips.push(pol(50, 54, R, 90 + 72 * i)); mid.push(pol(50, 54, R * 0.382, 90 + 72 * i + 36)); }
    var polys = [];
    for (i = 0; i < 5; i++) { polys.push([tips[i], mid[(i + 4) % 5]]); polys.push([tips[i], mid[i]]); polys.push([mid[i], mid[(i + 1) % 5]]); }
    // Pentagramm: Linie tip_i -> mid -> mid -> tip_{i+2}; aufgeloest in Teilstuecke
    S.push({ id: "stern", name: "Stern", en: "Star", icon: "⭐", diff: "easy", polys: polys });
  })();
  (function () {
    var body = []; var i;
    for (i = 0; i < 10; i++) { var a = 180 - 36 * i; body.push([+(40 + 30 * Math.cos(a * Math.PI / 180)).toFixed(1), +(50 - 20 * Math.sin(a * Math.PI / 180)).toFixed(1)]); }
    // Punkt 5 liegt ganz rechts (a = 0) = Schwanzansatz
    var rear = body[5];
    S.push({ id: "fisch", name: "Fisch", en: "Fish", icon: "🐟", diff: "easy", polys: [
      closed(body), [rear, [90, 28], [90, 72], rear] ] });
  })();
  // ---- MITTEL ----
  S.push({ id: "boot", name: "Segelboot", en: "Sailboat", icon: "⛵", diff: "medium", polys: [
    [[8, 72], [50, 72], [92, 72], [76, 92], [24, 92], [8, 72]],
    [[50, 72], [50, 10]], [[50, 10], [88, 62], [50, 72]], [[50, 10], [14, 62], [50, 72]] ] });
  S.push({ id: "krone", name: "Krone", en: "Crown", icon: "👑", diff: "medium", polys: [
    [[10, 92], [10, 72], [10, 22], [30, 52], [50, 12], [70, 52], [90, 22], [90, 72], [90, 92], [10, 92]],
    [[10, 72], [50, 72], [90, 72]], [[50, 72], [60, 79], [50, 86], [40, 79], [50, 72]] ] });
  S.push({ id: "rakete", name: "Rakete", en: "Rocket", icon: "🚀", diff: "medium", polys: [
    [[50, 6], [36, 28], [36, 66], [14, 88], [36, 80], [64, 80], [86, 88], [64, 66], [64, 28], [50, 6]],
    [[36, 28], [50, 28], [64, 28]], [[50, 28], [58, 35], [58, 48], [50, 56], [42, 48], [42, 35], [50, 28]] ] });
  // ---- SCHWER ----
  (function () {
    var R = 46, tips = [], hx = [], i, polys = [];
    for (i = 0; i < 6; i++) { tips.push(pol(50, 52, R, 90 + 60 * i)); hx.push(pol(50, 52, R / Math.sqrt(3), 90 + 60 * i + 30)); }
    for (i = 0; i < 6; i++) { polys.push([tips[i], hx[(i + 5) % 6]]); polys.push([tips[i], hx[i]]); polys.push([hx[i], hx[(i + 1) % 6]]); }
    S.push({ id: "hexa", name: "Sechsstern", en: "Hexagram", icon: "✡️", diff: "hard", polys: polys });
  })();
  (function () {
    var R = 44, tips = [], mid = [], ex = [], i, polys = [];
    for (i = 0; i < 5; i++) { tips.push(pol(50, 52, R, 90 + 72 * i)); ex.push(pol(50, 52, R, 90 + 72 * i + 36)); mid.push(pol(50, 52, R * 0.382, 90 + 72 * i + 36)); }
    var circle = []; for (i = 0; i < 5; i++) { circle.push(tips[i]); circle.push(ex[i]); }
    polys.push(closed(circle));
    for (i = 0; i < 5; i++) { polys.push([tips[i], mid[(i + 4) % 5]]); polys.push([tips[i], mid[i]]); polys.push([mid[i], mid[(i + 1) % 5]]); }
    S.push({ id: "magie", name: "Magischer Kreis", en: "Magic circle", icon: "🔮", diff: "hard", polys: polys });
  })();
  (function () {
    var outline = [[10, 92], [10, 60], [10, 20], [16, 20], [16, 26], [22, 26], [22, 20], [28, 20], [28, 26], [34, 26], [34, 52], [66, 52], [66, 26],
      [72, 26], [72, 20], [78, 20], [78, 26], [84, 26], [84, 20], [90, 20], [90, 60], [90, 92], [50, 92], [10, 92]];
    var gate = [[50, 92], [42, 84], [42, 70], [50, 62], [58, 70], [58, 84], [50, 92]];
    var floor = [[10, 60], [22, 60], [78, 60], [90, 60]];
    var winL = [[22, 60], [28, 50], [22, 40], [16, 50], [22, 60]], winR = [[78, 60], [84, 50], [78, 40], [72, 50], [78, 60]];
    S.push({ id: "burg", name: "Burg", en: "Castle", icon: "🏰", diff: "hard", polys: [outline, gate, floor, winL, winR] });
  })();

  function build(shape) {
    var nodes = [], idx = {}, edges = [], eset = {};
    function nid(p) { var k = p[0].toFixed(1) + "," + p[1].toFixed(1); if (idx[k] === undefined) { idx[k] = nodes.length; nodes.push({ x: p[0], y: p[1] }); } return idx[k]; }
    shape.polys.forEach(function (pl) { for (var i = 0; i + 1 < pl.length; i++) { var a = nid(pl[i]), b = nid(pl[i + 1]); if (a === b) continue; var k = Math.min(a, b) + "-" + Math.max(a, b); if (eset[k]) continue; eset[k] = 1; edges.push([a, b]); } });
    var adj = nodes.map(function () { return []; });
    edges.forEach(function (e, i) { adj[e[0]].push([e[1], i]); adj[e[1]].push([e[0], i]); });
    var odd = []; adj.forEach(function (a, i) { if (a.length % 2) odd.push(i); });
    return { nodes: nodes, edges: edges, adj: adj, odd: odd };
  }
  function byDiff(d) { return S.filter(function (s) { return s.diff === d; }); }
  var api = { shapes: S, build: build, byDiff: byDiff };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.LNP = api;
})(typeof window !== "undefined" ? window : this);
