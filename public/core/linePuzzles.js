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
    S.push({ id: "hexa", name: "Sechsstern", en: "Hexagram", icon: "✡️", diff: "medium", polys: polys });
  })();
  (function () {
    var R = 44, tips = [], mid = [], ex = [], i, polys = [];
    for (i = 0; i < 5; i++) { tips.push(pol(50, 52, R, 90 + 72 * i)); ex.push(pol(50, 52, R, 90 + 72 * i + 36)); mid.push(pol(50, 52, R * 0.382, 90 + 72 * i + 36)); }
    var circle = []; for (i = 0; i < 5; i++) { circle.push(tips[i]); circle.push(ex[i]); }
    polys.push(closed(circle));
    for (i = 0; i < 5; i++) { polys.push([tips[i], mid[(i + 4) % 5]]); polys.push([tips[i], mid[i]]); polys.push([mid[i], mid[(i + 1) % 5]]); }
    S.push({ id: "magie", name: "Magischer Kreis", en: "Magic circle", icon: "🔮", diff: "medium", polys: polys });
  })();
  (function () {
    var outline = [[10, 92], [10, 60], [10, 20], [16, 20], [16, 26], [22, 26], [22, 20], [28, 20], [28, 26], [34, 26], [34, 52], [66, 52], [66, 26],
      [72, 26], [72, 20], [78, 20], [78, 26], [84, 26], [84, 20], [90, 20], [90, 60], [90, 92], [50, 92], [10, 92]];
    var gate = [[50, 92], [42, 84], [42, 70], [50, 62], [58, 70], [58, 84], [50, 92]];
    var floor = [[10, 60], [22, 60], [78, 60], [90, 60]];
    var winL = [[22, 60], [28, 50], [22, 40], [16, 50], [22, 60]], winR = [[78, 60], [84, 50], [78, 40], [72, 50], [78, 60]];
    S.push({ id: "burg", name: "Burg", en: "Castle", icon: "🏰", diff: "medium", polys: [outline, gate, floor, winL, winR] });
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

  // ---------- Muster-Generator: Gitter-Formen aus ueberlagerten Rechtecken/Dreiecken (XOR) -> immer loesbar ----------
  var LAT = { easy: 4, medium: 5, hard: 6 }, RANGE = { easy: [9, 16, 1], medium: [18, 30, 3], hard: [34, 62, 7] }; // [minE, maxE, minVerzweigung]
  function rngf(seed) { var a = seed >>> 0; return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; var t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function ek(a, b) { return (a[0] < b[0] || (a[0] === b[0] && a[1] < b[1])) ? a[0] + "," + a[1] + "-" + b[0] + "," + b[1] : b[0] + "," + b[1] + "-" + a[0] + "," + a[1]; }
  function xorCycle(set, pts) { for (var i = 0; i < pts.length; i++) { var k = ek(pts[i], pts[(i + 1) % pts.length]); if (set[k]) delete set[k]; else set[k] = 1; } }
  function rectPts(x, y, w, h) { var o = [], i; for (i = 0; i < w; i++) o.push([x + i, y]); for (i = 0; i < h; i++) o.push([x + w, y + i]); for (i = w; i > 0; i--) o.push([x + i, y + h]); for (i = h; i > 0; i--) o.push([x, y + i]); return o; }
  function triPts(x, y, up) { return up ? [[x, y], [x + 1, y], [x + 1, y + 1]] : [[x, y], [x, y + 1], [x + 1, y + 1]]; }
  function rot(p, n) { return [n - 1 - p[0], n - 1 - p[1]]; }
  function analyze(set) {
    var keys = Object.keys(set), deg = {}, adj = {};
    keys.forEach(function (k) { var q = k.split("-"); q.forEach(function (n, i) { deg[n] = (deg[n] || 0) + 1; (adj[n] = adj[n] || []).push(q[1 - i]); }); });
    var nodes = Object.keys(deg), odd = nodes.filter(function (n) { return deg[n] % 2; }).length, branch = nodes.filter(function (n) { return deg[n] >= 3; }).length;
    var seen = {}, st = nodes.length ? [nodes[0]] : []; if (st.length) seen[nodes[0]] = 1;
    while (st.length) { var c = st.pop(); adj[c].forEach(function (m) { if (!seen[m]) { seen[m] = 1; st.push(m); } }); }
    var xs = nodes.map(function (n) { return +n.split(",")[0]; }), ys = nodes.map(function (n) { return +n.split(",")[1]; });
    return { E: keys.length, odd: odd, branch: branch, conn: nodes.length > 0 && Object.keys(seen).length === nodes.length, w: Math.max.apply(null, xs) - Math.min.apply(null, xs), h: Math.max.apply(null, ys) - Math.min.apply(null, ys), maxdeg: Math.max.apply(null, nodes.map(function (n) { return deg[n]; })) };
  }
  function canon(set) {
    var pts = []; Object.keys(set).forEach(function (k) { pts.push(k.split("-").map(function (x) { return x.split(",").map(Number); })); });
    var best = null;
    for (var t = 0; t < 8; t++) {
      var tp = pts.map(function (e) { return e.map(function (p) { var x = p[0], y = p[1]; if (t & 1) x = -x; if (t & 2) y = -y; if (t & 4) { var z = x; x = y; y = z; } return [x, y]; }); });
      var mx = Math.min.apply(null, tp.map(function (e) { return Math.min(e[0][0], e[1][0]); })), my = Math.min.apply(null, tp.map(function (e) { return Math.min(e[0][1], e[1][1]); }));
      var str = tp.map(function (e) { return ek([e[0][0] - mx, e[0][1] - my], [e[1][0] - mx, e[1][1] - my]); }).sort().join("|");
      if (best === null || str < best) best = str;
    }
    return best;
  }
  function genOne(diff, seed) {
    var r = rngf(seed), n = LAT[diff], set = {}, i;
    var cyc = diff === "easy" ? 2 + Math.floor(r() * 2) : diff === "medium" ? 3 + Math.floor(r() * 3) : 5 + Math.floor(r() * 4);
    for (i = 0; i < cyc; i++) {
      var pts;
      if (r() < 0.25) pts = triPts(Math.floor(r() * (n - 1)), Math.floor(r() * (n - 1)), r() < 0.5);
      else { var w = 1 + Math.floor(r() * Math.min(3, n - 1)), h = 1 + Math.floor(r() * Math.min(3, n - 1)); pts = rectPts(Math.floor(r() * (n - w)), Math.floor(r() * (n - h)), w, h); }
      xorCycle(set, pts); xorCycle(set, pts.map(function (p) { return rot(p, n); }));
    }
    if (r() < (diff === "hard" ? 0.85 : diff === "medium" ? 0.6 : 0.5)) { // offener Zug -> genau 2 ungerade Knoten
      var cur = [Math.floor(r() * n), Math.floor(r() * n)], len = 2 + Math.floor(r() * 4), vis = {}; vis[cur] = 1;
      for (i = 0; i < len; i++) { var dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(function (d) { var q = [cur[0] + d[0], cur[1] + d[1]]; return q[0] >= 0 && q[1] >= 0 && q[0] < n && q[1] < n && !vis[q]; }); if (!dirs.length) break; var d = dirs[Math.floor(r() * dirs.length)], nx = [cur[0] + d[0], cur[1] + d[1]]; var k = ek(cur, nx); if (set[k]) delete set[k]; else set[k] = 1; cur = nx; vis[cur] = 1; }
    }
    var a = analyze(set), R = RANGE[diff];
    if (!a.conn || a.odd > 2 || a.E < R[0] || a.E > R[1] || a.branch < R[2] || a.maxdeg > 6 || a.w < n - 2 || a.h < n - 2) return null;
    if (diff === "hard" && a.odd !== 2) return null;
    var sp = 76 / (n - 1), polys = Object.keys(set).map(function (k) { return k.split("-").map(function (q) { var c = q.split(",").map(Number); return [+(12 + c[0] * sp).toFixed(1), +(12 + c[1] * sp).toFixed(1)]; }); });
    return { set: set, polys: polys, E: a.E };
  }
  var POOLS = {};
  function pool(diff, want) {
    if (POOLS[diff]) return POOLS[diff];
    want = want || 500; var out = [], seen = {}, seed = diff === "easy" ? 1000 : diff === "medium" ? 500000 : 9000000, tries = 0;
    while (out.length < want && tries < 400000) { tries++; var g = genOne(diff, seed + tries); if (!g) continue; var c = canon(g.set); if (seen[c]) continue; seen[c] = 1; out.push({ id: diff[0] + (out.length + 1), name: "Muster " + (out.length + 1), en: "Pattern " + (out.length + 1), icon: "🔷", diff: diff, polys: g.polys, gen: true }); }
    return (POOLS[diff] = out);
  }
  // Hinweis: naechste Linie, die zu einer Loesung fuehrt. path = bisheriger Strich (Knotenliste). Gibt { keep, from, to } oder null.
  function hint(shape, path) {
    var g = build(shape), m = g.edges.length;
    function trail(p) { var used = {}; for (var i = 1; i < p.length; i++) { var a = g.adj[p[i - 1]].filter(function (q) { return q[0] === p[i] && !used[q[1]]; })[0]; if (!a) return null; used[a[1]] = 1; } return used; }
    function feasible(used, head) {
      var rest = []; g.edges.forEach(function (e, i) { if (!used[i]) rest.push(i); });
      if (!rest.length) return true;
      var deg = {}, oddN = [];
      rest.forEach(function (i) { g.edges[i].forEach(function (n) { deg[n] = (deg[n] || 0) + 1; }); });
      Object.keys(deg).forEach(function (n) { if (deg[n] % 2) oddN.push(+n); });
      if (!deg[head]) return false;
      if (oddN.length === 0) { } else if (oddN.length === 2 && oddN.indexOf(head) >= 0) { } else return false;
      var seen = {}, st = [head]; seen[head] = 1;
      while (st.length) { var c = st.pop(); g.adj[c].forEach(function (q) { if (!used[q[1]] && !seen[q[0]]) { seen[q[0]] = 1; st.push(q[0]); } }); }
      return Object.keys(deg).every(function (n) { return seen[n]; });
    }
    function nextEdge(used, head) { // Fleury: Bruecke nur nehmen, wenn es nicht anders geht
      var cands = g.adj[head].filter(function (q) { return !used[q[1]]; });
      for (var i = 0; i < cands.length; i++) { var u2 = Object.assign({}, used); u2[cands[i][1]] = 1; if (feasible(u2, cands[i][0])) return cands[i]; }
      return null;
    }
    var p = path.slice();
    while (p.length) { var u = trail(p); if (u && feasible(u, p[p.length - 1])) { var ne = nextEdge(u, p[p.length - 1]); if (ne || Object.keys(u).length === m) return ne ? { keep: p.length, from: p[p.length - 1], to: ne[0] } : null; } p.pop(); }
    var starts = g.odd.length ? g.odd : g.nodes.map(function (_, i) { return i; });
    for (var s = 0; s < starts.length; s++) { var ne2 = nextEdge({}, starts[s]); if (ne2) return { keep: 0, from: starts[s], to: ne2[0] }; }
    return null;
  }
  function byDiff(d) { return S.filter(function (s) { return s.diff === d; }); }
  var api = { shapes: S, build: build, byDiff: byDiff, pool: pool, hint: hint };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.LNP = api;
})(typeof window !== "undefined" ? window : this);
