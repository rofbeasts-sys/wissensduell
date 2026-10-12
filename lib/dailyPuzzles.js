"use strict";
// Tagesraetsel: Sudoku (leicht/mittel/schwer) und Kreuzwortraetsel (7x7 klein / 17x17 gross).
// Alles wird deterministisch aus Datum + Typ erzeugt, damit alle Spieler dasselbe Raetsel bekommen.
const fs = require("fs");
const path = require("path");

function hashStr(s) { let h = 2166136261 >>> 0; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; }
function rng(seed) { let a = hashStr(seed) || 1; return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function shuffle(arr, r) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

/* ---------------- Sudoku ---------------- */
const SUDOKU_GIVENS = { easy: 40, medium: 32, hard: 26 };
function sudokuSolveCount(g, limit) {
  // g: Array(81) 0..9 ; zaehlt Loesungen bis limit (Bitmasken + MRV)
  const rows = new Array(9).fill(0), cols = new Array(9).fill(0), boxes = new Array(9).fill(0);
  for (let i = 0; i < 81; i++) if (g[i]) { const b = 1 << g[i], r = (i / 9) | 0, c = i % 9; rows[r] |= b; cols[c] |= b; boxes[((r / 3) | 0) * 3 + ((c / 3) | 0)] |= b; }
  let count = 0;
  function rec() {
    let best = -1, bm = 0, bc = 10;
    for (let i = 0; i < 81; i++) if (!g[i]) {
      const r = (i / 9) | 0, c = i % 9, m = ~(rows[r] | cols[c] | boxes[((r / 3) | 0) * 3 + ((c / 3) | 0)]) & 0x3FE;
      let n = 0, x = m; while (x) { n++; x &= x - 1; }
      if (n < bc) { bc = n; best = i; bm = m; if (n <= 1) break; }
    }
    if (best < 0) { count++; return count >= limit; }
    if (bc === 0) return false;
    const r = (best / 9) | 0, c = best % 9, bi = ((r / 3) | 0) * 3 + ((c / 3) | 0);
    for (let d = 1; d <= 9; d++) {
      const b = 1 << d; if (!(bm & b)) continue;
      g[best] = d; rows[r] |= b; cols[c] |= b; boxes[bi] |= b;
      const stop = rec();
      g[best] = 0; rows[r] &= ~b; cols[c] &= ~b; boxes[bi] &= ~b;
      if (stop) return true;
    }
    return false;
  }
  rec(); return count;
}
function sudokuFull(r) {
  const g = new Array(81).fill(0);
  const rows = new Array(9).fill(0), cols = new Array(9).fill(0), boxes = new Array(9).fill(0);
  function rec(i) {
    if (i === 81) return true;
    const rr = (i / 9) | 0, c = i % 9, bi = ((rr / 3) | 0) * 3 + ((c / 3) | 0);
    for (const d of shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9], r)) {
      const b = 1 << d; if ((rows[rr] | cols[c] | boxes[bi]) & b) continue;
      g[i] = d; rows[rr] |= b; cols[c] |= b; boxes[bi] |= b;
      if (rec(i + 1)) return true;
      g[i] = 0; rows[rr] &= ~b; cols[c] &= ~b; boxes[bi] &= ~b;
    }
    return false;
  }
  rec(0); return g;
}
function makeSudoku(seed, diff) {
  const r = rng("sudoku:" + seed + ":" + diff);
  const sol = sudokuFull(r);
  const target = SUDOKU_GIVENS[diff] || 36;
  const puz = sol.slice();
  const order = shuffle([...Array(81).keys()], r);
  let givens = 81;
  for (const i of order) {
    if (givens <= target) break;
    const keep = puz[i]; puz[i] = 0;
    if (sudokuSolveCount(puz.slice(), 2) !== 1) puz[i] = keep; else givens--;
  }
  return { puzzle: puz, solution: sol, givens };
}

/* ---------------- Kreuzwort ---------------- */
let BANK = null;
function bank() { if (!BANK) BANK = JSON.parse(fs.readFileSync(path.join(__dirname, "../shared/crosswordBank.json"), "utf8")); return BANK; }
const CW_SIZES = { small: 7, medium: 11, big: 17 };
function cwTry(N, entries, r) {
  const grid = Array.from({ length: N }, () => Array(N).fill(""));
  const placed = [];
  const used = { across: new Set(), down: new Set() }; // Zellen, die schon zu einem Wort dieser Richtung gehoeren
  function canPlace(w, row, col, dir) {
    const dr = dir === "down" ? 1 : 0, dc = dir === "across" ? 1 : 0;
    const er = row + dr * (w.length - 1), ec = col + dc * (w.length - 1);
    if (row < 0 || col < 0 || er >= N || ec >= N) return -1;
    // Zelle vor und nach dem Wort muss leer sein
    const br = row - dr, bc = col - dc, ar = er + dr, ac = ec + dc;
    if (br >= 0 && bc >= 0 && grid[br][bc]) return -1;
    if (ar < N && ac < N && grid[ar][ac]) return -1;
    let cross = 0;
    for (let i = 0; i < w.length; i++) {
      const rr = row + dr * i, cc = col + dc * i, ch = grid[rr][cc];
      if (ch) { if (ch !== w[i] || used[dir].has(rr + "," + cc)) return -1; cross++; }
      else {
        // Nachbarn quer zur Richtung muessen leer sein (sonst entstehen ungewollte Woerter)
        if (dir === "across") { if ((rr > 0 && grid[rr - 1][cc]) || (rr < N - 1 && grid[rr + 1][cc])) return -1; }
        else { if ((cc > 0 && grid[rr][cc - 1]) || (cc < N - 1 && grid[rr][cc + 1])) return -1; }
      }
    }
    if (cross === w.length) return -1; // komplett schon vorhanden
    return cross;
  }
  function put(e, row, col, dir) {
    const dr = dir === "down" ? 1 : 0, dc = dir === "across" ? 1 : 0;
    for (let i = 0; i < e.w.length; i++) { grid[row + dr * i][col + dc * i] = e.w[i]; used[dir].add((row + dr * i) + "," + (col + dc * i)); }
    placed.push({ w: e.w, clue: e.c, r: row, c: col, dir });
  }
  const pool = entries.filter(e => e.w.length <= N);
  // erstes Wort: langes Wort in die Mitte
  const first = pool.find(e => e.w.length >= Math.min(N - 1, 6) && e.w.length <= N) || pool[0];
  pool.splice(pool.indexOf(first), 1);
  const fdir = r() < 0.5 ? "across" : "down";
  const fr = fdir === "across" ? Math.floor(N / 2) : Math.max(0, Math.floor((N - first.w.length) / 2));
  const fc = fdir === "across" ? Math.max(0, Math.floor((N - first.w.length) / 2)) : Math.floor(N / 2);
  put(first, fr, fc, fdir);
  let progress = true, rounds = 0;
  while (progress && rounds++ < 400) {
    progress = false;
    let best = null;
    for (const e of pool) {
      // verwandte Woerter (eines steckt im anderen oder gleicher Wortanfang, z.B. EIS/EISEN, HASE/HASEN) nie im selben Raetsel
      if (placed.some(q => q.w.includes(e.w) || e.w.includes(q.w) || (Math.min(q.w.length, e.w.length) >= 4 && q.w.slice(0, 4) === e.w.slice(0, 4)))) continue;
      for (const p of placed) {
        for (let i = 0; i < e.w.length; i++) for (let j = 0; j < p.w.length; j++) {
          if (e.w[i] !== p.w[j]) continue;
          const dir = p.dir === "across" ? "down" : "across";
          const row = p.dir === "across" ? p.r - i : p.r + j;
          const col = p.dir === "across" ? p.c + j : p.c - i;
          const x = canPlace(e.w, row, col, dir);
          if (x >= 1) {
            const score = x * 10 + r() * 6 + Math.min(e.w.length, 8) * 0.5;
            if (!best || score > best.score) best = { e, row, col, dir, score };
          }
        }
      }
    }
    if (best) { put(best.e, best.row, best.col, best.dir); pool.splice(pool.indexOf(best.e), 1); progress = true; }
  }
  return { grid, placed };
}
function makeCrossword(seed, size, lang, exclude) {
  const N = CW_SIZES[size] || 7;
  const entries = bank()[lang === "en" ? "en" : "de"].filter(x => !exclude || !exclude.has(x[0])).map(x => ({ w: x[0], c: x[1] }));
  const r = rng("cw:" + seed + ":" + size + ":" + lang);
  let best = null;
  const tries = size === "big" ? 18 : size === "medium" ? 28 : 40;
  for (let t = 0; t < tries; t++) {
    const res = cwTry(N, shuffle(entries, r), r);
    // Bewertung: Anzahl Woerter, bei klein auch gefuellte Zellen
    let filled = 0; res.grid.forEach(row => row.forEach(ch => { if (ch) filled++; }));
    const sc = res.placed.length * 10 + filled;
    if (!best || sc > best.sc) best = { res, sc };
  }
  const { grid, placed } = best.res;
  // Nummerierung: zeilenweise, an Wortanfaengen
  const starts = {};
  placed.forEach(p => { starts[p.r + "," + p.c] = true; });
  const numAt = {}; let n = 0;
  for (let rr = 0; rr < N; rr++) for (let cc = 0; cc < N; cc++) if (starts[rr + "," + cc]) numAt[rr + "," + cc] = ++n;
  const words = placed.map(p => ({ n: numAt[p.r + "," + p.c], dir: p.dir, r: p.r, c: p.c, len: p.w.length, clue: p.clue, w: p.w }))
    .sort((a, b) => a.n - b.n || (a.dir === "across" ? -1 : 1));
  return { size: N, grid, words, numAt };
}

module.exports = { makeSudoku, makeCrossword, sudokuSolveCount, SUDOKU_GIVENS, CW_SIZES };
