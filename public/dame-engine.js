/* ============================================================================
 * DAME (Deutsche Dame, 8x8) - gemeinsame Regeln fuer Client UND Server.
 * Brett: board[r][c], r=0 oben (Schwarz startet oben, Reihen 0-2), r=7 unten (Weiss, Reihen 5-7).
 * Dunkle Felder: (r + c) % 2 === 1. Weiss beginnt und zieht nach oben (r sinkt).
 * Stein: { c:'w'|'b', k:boolean }  (k = Dame)
 * Regeln: Steine ziehen 1 Feld diagonal vorwaerts, schlagen vorwaerts UND rueckwaerts.
 *   Damen ziehen/schlagen beliebig weit diagonal ("fliegende Dame"). Schlagzwang, freie Wahl
 *   unter den Schlagfolgen, aber eine begonnene Folge muss zu Ende gefuehrt werden.
 *   Geschlagene Steine bleiben bis Zugende liegen (kein doppeltes Ueberspringen). Ein Stein, der
 *   die Grundlinie erreicht, wird sofort Dame und schlaegt als Dame weiter.
 *   Verloren hat, wer keinen Stein oder keinen erlaubten Zug mehr hat.
 * ========================================================================== */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.Dame = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const N = 8;
  const DIRS = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
  const other = c => (c === "w" ? "b" : "w");
  const inb = (r, c) => r >= 0 && r < N && c >= 0 && c < N;

  function initialBoard() {
    const b = Array.from({ length: N }, () => Array(N).fill(null));
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      if ((r + c) % 2 !== 1) continue;
      if (r <= 2) b[r][c] = { c: "b", k: false };
      else if (r >= 5) b[r][c] = { c: "w", k: false };
    }
    return b;
  }
  const clone = b => b.map(row => row.map(p => (p ? { c: p.c, k: p.k } : null)));
  const lastRow = color => (color === "w" ? 0 : N - 1);

  // alle Schlagfolgen eines Steins (vollstaendig bis zum Ende der Kette)
  function captureSeqs(board, r0, c0) {
    const me = board[r0][c0];
    const out = [];
    const taken = new Set();
    const key = (r, c) => r * N + c;
    function dfs(r, c, isKing, path, caps) {
      let any = false;
      for (const [dr, dc] of DIRS) {
        if (!isKing) {
          const mr = r + dr, mc = c + dc, lr = r + 2 * dr, lc = c + 2 * dc;
          if (!inb(lr, lc)) continue;
          const mid = board[mr][mc];
          if (!mid || mid.c === me.c || taken.has(key(mr, mc))) continue;
          const at = board[lr][lc];
          if (at && !(lr === r0 && lc === c0)) continue;
          if (at && taken.has(key(lr, lc))) continue;
          any = true;
          taken.add(key(mr, mc));
          const king2 = lr === lastRow(me.c);
          dfs(lr, lc, king2, path.concat([[lr, lc]]), caps.concat([[mr, mc]]));
          taken.delete(key(mr, mc));
        } else {
          let rr = r + dr, cc = c + dc;
          while (inb(rr, cc)) {
            const sq = board[rr][cc];
            const isEmpty = !sq || (rr === r0 && cc === c0);
            if (isEmpty && !taken.has(key(rr, cc))) { rr += dr; cc += dc; continue; }
            break;
          }
          if (!inb(rr, cc)) continue;
          const mid = board[rr][cc];
          if (!mid || mid.c === me.c || taken.has(key(rr, cc))) continue;
          let lr = rr + dr, lc = cc + dc;
          const landings = [];
          while (inb(lr, lc)) {
            const sq = board[lr][lc];
            const isEmpty = !sq || (lr === r0 && lc === c0);
            if (!isEmpty || taken.has(key(lr, lc))) break;
            landings.push([lr, lc]); lr += dr; lc += dc;
          }
          if (!landings.length) continue;
          any = true;
          taken.add(key(rr, cc));
          for (const [lr2, lc2] of landings) dfs(lr2, lc2, true, path.concat([[lr2, lc2]]), caps.concat([[rr, cc]]));
          taken.delete(key(rr, cc));
        }
      }
      if (!any && caps.length) out.push({ path, captured: caps });
    }
    dfs(r0, c0, me.k, [[r0, c0]], []);
    return out;
  }
  function quietMoves(board, r, c) {
    const me = board[r][c], out = [];
    for (const [dr, dc] of DIRS) {
      if (!me.k && dr !== (me.c === "w" ? -1 : 1)) continue;
      let rr = r + dr, cc = c + dc;
      while (inb(rr, cc) && !board[rr][cc]) {
        out.push({ path: [[r, c], [rr, cc]], captured: [] });
        if (!me.k) break;
        rr += dr; cc += dc;
      }
    }
    return out;
  }
  function legalMoves(board, color) {
    const caps = [], quiet = [];
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      const p = board[r][c]; if (!p || p.c !== color) continue;
      caps.push(...captureSeqs(board, r, c));
    }
    if (caps.length) return caps;
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      const p = board[r][c]; if (!p || p.c !== color) continue;
      quiet.push(...quietMoves(board, r, c));
    }
    return quiet;
  }
  // wendet einen Zug an (liefert NEUES Brett)
  function applyMove(board, mv) {
    const b = clone(board);
    const [r0, c0] = mv.path[0], [r1, c1] = mv.path[mv.path.length - 1];
    const p = b[r0][c0];
    b[r0][c0] = null;
    mv.captured.forEach(([r, c]) => { b[r][c] = null; });
    b[r1][c1] = p;
    if (!p.k && r1 === lastRow(p.c)) p.k = true;
    return b;
  }
  // Zug aus Client-Pfad finden (nur gueltige!)
  function findMove(board, color, path) {
    if (!Array.isArray(path) || path.length < 2 || path.length > 40) return null;
    const norm = p => p.map(s => Array.isArray(s) ? s[0] + "," + s[1] : "x").join(">");
    const want = norm(path);
    return legalMoves(board, color).find(m => norm(m.path) === want) || null;
  }
  function counts(board) {
    let w = 0, b = 0, wk = 0, bk = 0;
    for (const row of board) for (const p of row) { if (!p) continue; if (p.c === "w") { w++; if (p.k) wk++; } else { b++; if (p.k) bk++; } }
    return { w, b, wk, bk };
  }
  // Ergebnis fuer den Spieler am Zug: "w"|"b" = Sieger, null = Spiel laeuft
  function result(board, toMove) {
    const ct = counts(board);
    if (ct.w === 0) return "b";
    if (ct.b === 0) return "w";
    if (!legalMoves(board, toMove).length) return other(toMove);
    return null;
  }
  /* ---------- Bot (Alpha-Beta) ---------- */
  function evaluate(board, color) {
    let s = 0;
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      const p = board[r][c]; if (!p) continue;
      let v = p.k ? 330 : 100;
      if (!p.k) { const adv = p.c === "w" ? (N - 1 - r) : r; v += adv * 4; if (adv === 0) v += 6; }
      if (c === 0 || c === N - 1) v += 2;
      if (r >= 2 && r <= 5 && c >= 2 && c <= 5) v += 3;
      s += p.c === color ? v : -v;
    }
    return s;
  }
  function search(board, color, toMove, depth, alpha, beta, deadline) {
    const moves = legalMoves(board, toMove);
    if (!moves.length) return toMove === color ? -100000 - depth : 100000 + depth;
    if (depth === 0) return evaluate(board, color);
    if (deadline && Date.now() > deadline) return evaluate(board, color);
    let best = toMove === color ? -Infinity : Infinity;
    for (const m of moves) {
      const v = search(applyMove(board, m), color, other(toMove), depth - 1, alpha, beta, deadline);
      if (toMove === color) { if (v > best) best = v; if (best > alpha) alpha = best; }
      else { if (v < best) best = v; if (best < beta) beta = best; }
      if (alpha >= beta) break;
    }
    return best;
  }
  function botMove(board, color, level) {
    const moves = legalMoves(board, color);
    if (!moves.length) return null;
    if (moves.length === 1) return moves[0];
    const depth = level === "easy" ? 2 : level === "hard" ? 7 : 4;
    const budget = level === "hard" ? 900 : level === "easy" ? 200 : 500;
    if (level === "easy" && Math.random() < 0.25) return moves[Math.floor(Math.random() * moves.length)];
    const deadline = Date.now() + budget;
    let best = null, bv = -Infinity;
    const shuffled = moves.slice().sort(() => Math.random() - 0.5);
    for (const m of shuffled) {
      const v = search(applyMove(board, m), color, other(color), depth - 1, -Infinity, Infinity, deadline) + Math.random() * (level === "easy" ? 30 : 2);
      if (v > bv) { bv = v; best = m; }
    }
    return best;
  }
  return { N, initialBoard, clone, legalMoves, applyMove, findMove, result, counts, botMove, other };
});
