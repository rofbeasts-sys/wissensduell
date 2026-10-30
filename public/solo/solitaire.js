/* Solitaer (Steckspiel mit Kugeln) - Teil von Brainmania. Springe ueber Kugeln, bis nur eine uebrig ist. */
(function(){
'use strict';
const L2 = (a, b) => (typeof L === 'function' ? L(a, b) : a);
// 7x7-Kreuz (englisches Solitaer): 33 Felder
const OK = (r, c) => (r >= 2 && r <= 4) || (c >= 2 && c <= 4);
let S = null;
function fresh(){ const g = []; for(let r = 0; r < 7; r++){ g.push([]); for(let c = 0; c < 7; c++) g[r].push(OK(r, c) ? (r === 3 && c === 3 ? 0 : 1) : -1); } return g; }
const cnt = g => g.reduce((a, row) => a + row.filter(x => x === 1).length, 0);
function movesFrom(g, r, c){
  const out = []; if(g[r][c] !== 1) return out;
  [[-1,0],[1,0],[0,-1],[0,1]].forEach(([dr, dc]) => {
    const mr = r + dr, mc = c + dc, tr = r + 2 * dr, tc = c + 2 * dc;
    if(tr < 0 || tr > 6 || tc < 0 || tc > 6) return;
    if(g[mr][mc] === 1 && g[tr][tc] === 0) out.push([tr, tc, mr, mc]);
  });
  return out;
}
const anyMove = g => { for(let r = 0; r < 7; r++) for(let c = 0; c < 7; c++) if(movesFrom(g, r, c).length) return true; return false; };
const CSS = `<style>
#solApp{text-align:center}
.solbd{position:relative;width:100%;max-width:400px;aspect-ratio:1;margin:10px auto;border-radius:50%;background:radial-gradient(circle at 35% 30%,#ecd3a2,#d4ab70 55%,#b98a4f);border:4px solid #7a5537;box-shadow:0 14px 30px #0009,inset 0 0 0 6px #e8c88f,inset 0 0 24px rgba(90,55,20,.5);display:grid;grid-template-columns:repeat(7,1fr);padding:9%;touch-action:manipulation;user-select:none;-webkit-user-select:none}
.solh{position:relative;display:flex;align-items:center;justify-content:center;aspect-ratio:1}
.solh.hole:before{content:"";position:absolute;inset:22%;border-radius:50%;background:radial-gradient(circle at 60% 65%,#c49a62,#7a5537);box-shadow:inset 0 3px 5px rgba(0,0,0,.55)}
.solh.none{visibility:hidden}
.solm{position:relative;width:82%;aspect-ratio:1;border-radius:50%;background:radial-gradient(circle at 34% 28%,#8a8f9c 0,#2a2d36 22%,#0b0c10 62%);box-shadow:0 4px 6px rgba(0,0,0,.55),inset 0 -3px 4px rgba(255,255,255,.07);transition:transform .12s}
.solm.sel{transform:translateY(-4px) scale(1.06);box-shadow:0 0 0 3px #c6ff3d,0 0 16px 4px rgba(198,255,61,.8)}
.solm.can{box-shadow:0 4px 6px rgba(0,0,0,.55),0 0 0 2px rgba(198,255,61,.55)}
.solt{position:absolute;inset:26%;border-radius:50%;background:rgba(124,255,140,.5);border:2px solid #7cff8c;box-shadow:0 0 12px #7cff8c;pointer-events:none}
</style>`;
function paint(){
  const g = S.g, n = cnt(g), sel = S.sel;
  const tg = new Set(); if(sel) movesFrom(g, sel[0], sel[1]).forEach(m => tg.add(m[0] + ',' + m[1]));
  let cells = '';
  for(let r = 0; r < 7; r++) for(let c = 0; c < 7; c++){
    const v = g[r][c];
    if(v === -1){ cells += '<div class="solh none"></div>'; continue; }
    const can = v === 1 && movesFrom(g, r, c).length > 0;
    const isSel = sel && sel[0] === r && sel[1] === c;
    cells += `<div class="solh hole" onclick="SOL.tap(${r},${c})">${v === 1 ? `<div class="solm${isSel ? ' sel' : can && !sel ? ' can' : ''}"></div>` : ''}${tg.has(r + ',' + c) ? '<div class="solt"></div>' : ''}</div>`;
  }
  let msg = L2('Springe mit einer Kugel über eine andere in ein leeres Loch. Die übersprungene Kugel verschwindet.', 'Jump a marble over another into an empty hole. The jumped marble disappears.');
  if(n === 1) msg = (g[3][3] === 1) ? L2('Perfekt! Die letzte Kugel steckt in der Mitte.', 'Perfect! The last marble is in the centre.') : L2('Geschafft! Nur eine Kugel übrig.', 'Done! Only one marble left.');
  else if(!anyMove(g)) msg = L2('Kein Zug mehr möglich. Zurück oder neu starten.', 'No more moves. Undo or restart.');
  const el = document.getElementById('solApp'); if(!el) return;
  el.querySelector('.solwrap').innerHTML = `<div class="solbd">${cells}</div>`;
  el.querySelector('#solN').textContent = n; el.querySelector('#solMv').textContent = S.hist.length; el.querySelector('#solMsg').textContent = msg;
  const b = el.querySelector('#solUndo'); if(b) b.disabled = !S.hist.length;
}
function tap(r, c){
  if(!S) return; const g = S.g;
  if(S.sel){
    const m = movesFrom(g, S.sel[0], S.sel[1]).find(x => x[0] === r && x[1] === c);
    if(m){ S.hist.push(JSON.stringify(g)); g[S.sel[0]][S.sel[1]] = 0; g[m[2]][m[3]] = 0; g[m[0]][m[1]] = 1; S.sel = null; paint(); return; }
  }
  if(g[r][c] === 1 && movesFrom(g, r, c).length){ S.sel = (S.sel && S.sel[0] === r && S.sel[1] === c) ? null : [r, c]; } else S.sel = null;
  paint();
}
function undo(){ if(!S || !S.hist.length) return; S.g = JSON.parse(S.hist.pop()); S.sel = null; paint(); }
function restart(){ S.g = fresh(); S.hist = []; S.sel = null; paint(); }
function open(back){
  S = { g: fresh(), hist: [], sel: null, back: back || null };
  renderApp(CSS + `<div class="panel" id="solApp">
    <div class="picker-title" style="margin:0">SOLITÄR</div>
    <div class="picker-sub">${L2('Kugeln überspringen, bis nur noch eine übrig ist. Am besten steckt sie am Ende in der Mitte.','Jump marbles until only one is left. Best if it ends in the centre.')}</div>
    <div style="display:flex;justify-content:center;gap:24px;font-weight:800;margin-top:6px"><span>${L2('Kugeln','Marbles')}: <b id="solN">32</b></span><span>${L2('Züge','Moves')}: <b id="solMv">0</b></span></div>
    <div class="solwrap"></div>
    <div id="solMsg" style="min-height:40px;font-size:14px;padding:0 10px;opacity:.85"></div>
    <div class="actions-row" style="flex-direction:column;gap:8px;margin-top:8px"><div style="display:flex;gap:8px"><button class="btn btn-ghost" id="solUndo" style="flex:1" onclick="SOL.undo()">↩ ${L2('Zurück','Undo')}</button><button class="btn btn-ghost" style="flex:1" onclick="SOL.restart()">${L2('Neu starten','Restart')}</button></div>
    <button class="btn btn-ghost" onclick="SOL.back()">${L2('Zurück zu Brainmania','Back to Brainmania')}</button></div>
  </div>`);
  paint();
}
window.SOL = { open, tap, undo, restart, back: () => { const b = S && S.back; S = null; if(b) b(); else renderMainMenu(); } };
window.__solEngine = { fresh, movesFrom, cnt, anyMove };
})();
