"use strict";
// Brain Royale - serverautoritative Spiellogik fuer 2 Spieler (Seite "a" unten/Start Reihe 6, Seite "b" oben/Start Reihe 0).
const COLS = 5, ROWS = 7, MAX_MOVES = 90, DUEL_MS = 12000;
const other = s => (s === "a" ? "b" : "a");
const fwd = s => (s === "a" ? -1 : 1);

function create() {
  const mk = (side, row) => [
    { id: side + "0", side, kind: "p", c: 1, r: row, sc: 1, hp: 2, alive: true },
    { id: side + "q", side, kind: "q", c: 2, r: row, sc: 2, hp: 1, alive: true },
    { id: side + "1", side, kind: "p", c: 3, r: row, sc: 3, hp: 2, alive: true }
  ];
  return { pieces: mk("a", ROWS - 1).concat(mk("b", 0)), turn: "a", over: false, winner: null, why: null, moves: 0, duel: null, lastDuel: null };
}
const at = (st, c, r) => st.pieces.find(p => p.alive && p.c === c && p.r === r);
function movesOf(st, p) {
  const f = fwd(p.side), out = [];
  [[-1, f], [0, f], [1, f], [-1, 0], [1, 0]].forEach(([dc, dr]) => {
    const c = p.c + dc, r = p.r + dr;
    if (c < 0 || c >= COLS || r < 0 || r >= ROWS) return;
    const o = at(st, c, r);
    if (o && o.side === p.side) return;
    out.push({ c, r, hit: o || null });
  });
  return out;
}
function home(st, p) {
  const row = p.side === "a" ? ROWS - 1 : 0;
  const order = [p.sc, 2, 1, 3, 0, 4].filter((v, i, a) => a.indexOf(v) === i);
  for (const c of order) if (!at(st, c, row)) { p.c = c; p.r = row; return; }
}
function hit(st, p, instant) {
  p.hp = instant ? 0 : p.hp - 1;
  if (p.hp <= 0) { p.alive = false; p.hp = 0; } else home(st, p);
}
function checkOver(st) {
  for (const side of ["a", "b"]) {
    const mine = st.pieces.filter(p => p.side === side);
    if (!mine.find(p => p.kind === "q").alive) return { winner: other(side), why: "queen" };
    if (mine.every(p => !p.alive)) return { winner: other(side), why: "all" };
  }
  return null;
}
function endTurn(st) {
  const w = checkOver(st);
  if (w) { st.over = true; st.winner = w.winner; st.why = w.why; return; }
  if (st.moves >= MAX_MOVES) {
    const hp = s => st.pieces.filter(p => p.side === s).reduce((a, p) => a + (p.alive ? p.hp : 0), 0);
    st.over = true; st.winner = hp("a") > hp("b") ? "a" : hp("b") > hp("a") ? "b" : "draw"; st.why = "moves"; return;
  }
  st.turn = other(st.turn);
  if (!st.pieces.some(p => p.alive && p.side === st.turn && movesOf(st, p).length)) st.turn = other(st.turn);
}
// Zug. Rueckgabe: {ok:false} | {ok:true, duel:false} | {ok:true, duel:true}
function move(st, side, id, c, r, makeQuestion) {
  if (st.over || st.duel || st.turn !== side) return { ok: false };
  const p = st.pieces.find(x => x.id === id && x.alive && x.side === side);
  if (!p || !Number.isInteger(c) || !Number.isInteger(r)) return { ok: false };
  const mv = movesOf(st, p).find(m => m.c === c && m.r === r);
  if (!mv) return { ok: false };
  st.moves++;
  if (mv.hit) {
    st.duel = { att: p.id, def: mv.hit.id, to: { c, r }, q: makeQuestion(), out: { a: false, b: false }, done: false, winner: null, t0: Date.now() };
    return { ok: true, duel: true };
  }
  p.c = c; p.r = r; endTurn(st);
  return { ok: true, duel: false };
}
function finishDuel(st, winnerSide) {
  const d = st.duel; if (!d || d.done) return false;
  const def = st.pieces.find(x => x.id === d.def);
  d.done = true; d.winner = winnerSide || def.side;
  return true;
}
function answer(st, side, idx) {
  const d = st.duel; if (!d || d.done || d.out[side]) return false;
  if (idx === d.q.correct) return finishDuel(st, side);
  d.out[side] = true;
  if (d.out.a && d.out.b) finishDuel(st, null);
  return true;
}
function resolveDuel(st) {
  const d = st.duel; if (!d || !d.done) return;
  const att = st.pieces.find(x => x.id === d.att), def = st.pieces.find(x => x.id === d.def);
  const attWins = att.side === d.winner;
  const winner = attWins ? att : def, loser = attWins ? def : att;
  hit(st, loser, winner.kind === "q");
  if (attWins) { att.c = d.to.c; att.r = d.to.r; }
  st.lastDuel = { winner: d.winner };
  st.duel = null;
  endTurn(st);
}
// Sicht eines Spielers: eigene Figuren "y" unten, Gegner "o" oben (Spieler b sieht das Brett gespiegelt).
function view(st, side, names, full, lang) {
  lang = lang === "de" ? "de" : "en";
  const flip = side === "b";
  const map = s => (s === side ? "y" : "o");
  const pieces = st.pieces.map(p => ({ id: (p.side === side ? "y" : "o") + p.id.slice(1), side: map(p.side), kind: p.kind, c: p.c, r: flip ? ROWS - 1 - p.r : p.r, sc: p.sc, hp: p.hp, alive: p.alive }));
  let duel = null;
  if (st.duel) {
    const d = st.duel, att = st.pieces.find(x => x.id === d.att), def = st.pieces.find(x => x.id === d.def);
    duel = { kind: d.q.kind[lang], text: d.q.text[lang], opts: d.q.opts[lang], att: map(att.side), queen: att.kind === "q" || def.kind === "q",
      remaining: Math.max(0, DUEL_MS - (Date.now() - d.t0)), youOut: !!d.out[side], oppOut: !!d.out[other(side)], done: d.done,
      winner: d.done ? map(d.winner) : null, correct: d.done ? d.q.correct : null };
  }
  return { you: "y", pieces, turn: map(st.turn), over: st.over, winner: st.winner ? (st.winner === "draw" ? "draw" : map(st.winner)) : null, why: st.why, moves: st.moves, duel, names, full: !!full };
}
module.exports = { create, move, answer, finishDuel, resolveDuel, view, movesOf, DUEL_MS, COLS, ROWS };
