/* ============================================================================
 * MUEHLE (Neun-Maenner-Muehle) - gemeinsame Regeln fuer Client UND Server.
 * 24 Punkte, 3 Ringe: Ring 0 = 0..7 (aussen), Ring 1 = 8..15, Ring 2 = 16..23 (innen).
 * Pro Ring im Uhrzeigersinn: 0 oben-links, 1 oben-mitte, 2 oben-rechts, 3 rechts-mitte,
 * 4 unten-rechts, 5 unten-mitte, 6 unten-links, 7 links-mitte. Verbindungen zwischen den Ringen
 * laufen ueber die Mitten (ungerade Positionen).
 * Phasen: setzen (je 9 Steine) -> ziehen (1 Schritt zu freiem Nachbarn) -> springen (nur noch 3 Steine).
 * Bildet ein Zug eine Muehle, wird ein gegnerischer Stein entfernt (nicht aus einer Muehle, ausser
 * alle seine Steine stehen in Muehlen). Verloren hat, wer weniger als 3 Steine hat oder nach der
 * Setzphase nicht ziehen kann.
 * ========================================================================== */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.Mill = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const ADJ = Array.from({ length: 24 }, () => []);
  const link = (a, b) => { ADJ[a].push(b); ADJ[b].push(a); };
  for (let ring = 0; ring < 3; ring++) for (let i = 0; i < 8; i++) link(ring * 8 + i, ring * 8 + (i + 1) % 8);
  for (let i = 1; i < 8; i += 2) { link(i, 8 + i); link(8 + i, 16 + i); }
  const MILLS = [];
  for (let ring = 0; ring < 3; ring++) for (let s = 0; s < 4; s++) MILLS.push([ring * 8 + s * 2, ring * 8 + s * 2 + 1, ring * 8 + (s * 2 + 2) % 8]);
  for (let i = 1; i < 8; i += 2) MILLS.push([i, 8 + i, 16 + i]);
  const MILLS_AT = Array.from({ length: 24 }, () => []);
  MILLS.forEach(m => m.forEach(p => MILLS_AT[p].push(m)));
  const other = c => (c === "w" ? "b" : "w");

  function initial() { return { b: Array(24).fill(null), hand: { w: 9, b: 9 }, turn: "w", quiet: 0 }; }
  function clone(st) { return { b: st.b.slice(), hand: { w: st.hand.w, b: st.hand.b }, turn: st.turn, quiet: st.quiet }; }
  function onBoard(st, c) { let n = 0; for (let i = 0; i < 24; i++) if (st.b[i] === c) n++; return n; }
  function total(st, c) { return onBoard(st, c) + st.hand[c]; }
  function phase(st, c) { return st.hand[c] > 0 ? "place" : (onBoard(st, c) === 3 ? "fly" : "move"); }
  function inMill(b, p) { const c = b[p]; return !!c && MILLS_AT[p].some(m => m.every(q => b[q] === c)); }

  function legalMoves(st, color) {
    const out = [], b = st.b, opp = other(color), ph = phase(st, color);
    const add = (from, to) => {
      const nb = b.slice(); if (from != null) nb[from] = null; nb[to] = color;
      if (inMill(nb, to)) {
        let cand = []; for (let i = 0; i < 24; i++) if (nb[i] === opp) cand.push(i);
        const free = cand.filter(i => !inMill(nb, i)); if (free.length) cand = free;
        if (cand.length) { cand.forEach(rm => out.push({ from, to, rm })); return; }
      }
      out.push({ from, to, rm: null });
    };
    if (ph === "place") { for (let i = 0; i < 24; i++) if (!b[i]) add(null, i); }
    else for (let f = 0; f < 24; f++) {
      if (b[f] !== color) continue;
      if (ph === "fly") { for (let t = 0; t < 24; t++) if (!b[t]) add(f, t); }
      else ADJ[f].forEach(t => { if (!b[t]) add(f, t); });
    }
    return out;
  }
  function findMove(st, color, from, to, rm) {
    const f = from == null ? null : from, r = rm == null ? null : rm;
    return legalMoves(st, color).find(m => m.from === f && m.to === to && m.rm === r) || null;
  }
  function apply(st, mv) {
    const ns = clone(st), c = st.turn;
    if (mv.from == null) ns.hand[c]--; else ns.b[mv.from] = null;
    ns.b[mv.to] = c;
    if (mv.rm != null) ns.b[mv.rm] = null;
    ns.quiet = (mv.from == null || mv.rm != null) ? 0 : st.quiet + 1;
    ns.turn = other(c);
    return ns;
  }
  // Ergebnis aus Sicht des Spielers, der am Zug ist: Gewinnerfarbe oder null
  function result(st) {
    const c = st.turn;
    if (total(st, c) < 3) return other(c);
    if (st.hand[c] === 0 && legalMoves(st, c).length === 0) return other(c);
    return null;
  }
  function evaluate(st, me) {
    const op = other(me); let s = 0;
    s += (total(st, me) - total(st, op)) * 100;
    let mm = 0, mo = 0, two = 0, blockedMe = 0, blockedOp = 0;
    MILLS.forEach(m => {
      const a = m.filter(p => st.b[p] === me).length, o = m.filter(p => st.b[p] === op).length;
      if (a === 3) mm++; if (o === 3) mo++;
      if (a === 2 && o === 0) two++; if (o === 2 && a === 0) two--;
    });
    for (let i = 0; i < 24; i++) { if (!st.b[i]) continue; const bl = ADJ[i].every(q => st.b[q]); if (bl) { if (st.b[i] === me) blockedMe++; else blockedOp++; } }
    s += (mm - mo) * 18 + two * 14 + (blockedOp - blockedMe) * 9;
    if (st.hand.w === 0 && st.hand.b === 0) s += (legalMoves(st, me).length - legalMoves(st, op).length) * 2;
    return s;
  }
  const LEVELS = { easy: { depth: 2, ms: 150, rnd: 0.3 }, normal: { depth: 4, ms: 500, rnd: 0 }, hard: { depth: 6, ms: 1100, rnd: 0 } };
  function botMove(st, color, level) {
    const cfg = LEVELS[level] || LEVELS.normal;
    const moves = legalMoves(st, color); if (!moves.length) return null;
    if (cfg.rnd && Math.random() < cfg.rnd) return moves[Math.floor(Math.random() * moves.length)];
    const t0 = Date.now(); let timeUp = false;
    const search = (s, depth, alpha, beta, side) => {
      if (Date.now() - t0 > cfg.ms) { timeUp = true; return 0; }
      const w = (s.turn === side) ? result(s) : null;
      const r = result(s); if (r) return r === color ? 100000 + depth : -100000 - depth;
      if (depth === 0) return evaluate(s, color);
      const ms = legalMoves(s, s.turn); const maxing = s.turn === color;
      let best = maxing ? -Infinity : Infinity;
      for (const m of ms) {
        const v = search(apply(s, m), depth - 1, alpha, beta, side);
        if (timeUp) return 0;
        if (maxing) { if (v > best) best = v; if (v > alpha) alpha = v; } else { if (v < best) best = v; if (v < beta) beta = v; }
        if (beta <= alpha) break;
      }
      return best;
    };
    let bestMove = moves[Math.floor(Math.random() * moves.length)];
    for (let d = 1; d <= cfg.depth; d++) {
      let bm = null, bv = -Infinity; const ordered = moves.slice().sort((a, b) => (b.rm != null) - (a.rm != null));
      for (const m of ordered) {
        const v = search(apply(st, m), d - 1, -Infinity, Infinity, color) + Math.random() * 0.01;
        if (timeUp) break;
        if (v > bv) { bv = v; bm = m; }
      }
      if (timeUp) break;
      if (bm) bestMove = bm;
      if (bv > 90000) break;
    }
    return bestMove;
  }
  return { ADJ, MILLS, initial, clone, onBoard, total, phase, inMill, legalMoves, findMove, apply, result, botMove, other };
});
