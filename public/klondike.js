/* Klondike-Solitaer (Kartenspiel) - Teil von Brainmania. Tippen: Karte waehlen, dann Ziel tippen. Zweimal dieselbe Karte tippen = automatisch ablegen. */
(function(){
'use strict';
const L2 = (a, b) => (typeof L === 'function' ? L(a, b) : a);
const SU = ['♠', '♥', '♦', '♣'], RK = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const red = c => c.s === 1 || c.s === 2;
let S = null, autoTimer = null;
const TH = [['klassisch', 'Klassisch', 'Classic'], ['dunkel', 'Dunkel', 'Dark'], ['neon', 'Neon', 'Neon'], ['retro', 'Retro (4 Farben)', 'Retro (4 colors)'], ['gold', 'Gold', 'Gold']];
function deck(){ const d = []; for(let s = 0; s < 4; s++) for(let r = 1; r <= 13; r++) d.push({ s, r, up: false }); for(let i = d.length - 1; i > 0; i--){ const j = Math.floor(Math.random() * (i + 1)); [d[i], d[j]] = [d[j], d[i]]; } return d; }
function deal(){
  const d = deck(), tab = [];
  for(let c = 0; c < 7; c++){ tab.push([]); for(let k = 0; k <= c; k++){ const x = d.pop(); x.up = k === c; tab[c].push(x); } }
  return { stock: d, waste: [], found: [[], [], [], []], tab, moves: 0 };
}
const snap = () => JSON.stringify({ stock: S.g.stock, waste: S.g.waste, found: S.g.found, tab: S.g.tab, moves: S.g.moves });
const canTab = (c, col) => { const t = col[col.length - 1]; return t ? (t.up && red(t) !== red(c) && t.r === c.r + 1) : c.r === 13; };
const canFound = (c, p) => { const t = p[p.length - 1]; return t ? (t.s === c.s && c.r === t.r + 1) : c.r === 1; };
function selCards(){ const s = S.sel; if(!s) return []; const g = S.g; if(s.k === 'w') return g.waste.slice(-1); if(s.k[0] === 'f') return g.found[+s.k[1]].slice(-1); return g.tab[+s.k[1]].slice(s.i); }
function take(s){ const g = S.g; if(s.k === 'w') return [g.waste.pop()]; if(s.k[0] === 'f') return [g.found[+s.k[1]].pop()]; return g.tab[+s.k[1]].splice(s.i); }
function flip(){ S.g.tab.forEach(c => { const t = c[c.length - 1]; if(t && !t.up) t.up = true; }); }
function won(){ return S.g.found.every(p => p.length === 13); }
function push(){ S.hist.push(snap()); if(S.hist.length > 300) S.hist.shift(); }
function moveTo(dest){ // dest: 'f0'..'f3' | 't0'..'t6'
  const cs = selCards(); if(!cs.length) return false; const g = S.g, c = cs[0];
  if(dest[0] === 'f'){ if(cs.length !== 1 || !canFound(c, g.found[+dest[1]])) return false; push(); take(S.sel); g.found[+dest[1]].push(c); }
  else { if(!canTab(c, g.tab[+dest[1]])) return false; if(S.sel.k === 't' + dest[1]) return false; push(); const m = take(S.sel); g.tab[+dest[1]].push(...m); }
  g.moves++; S.sel = null; flip(); return true;
}
function autoMove(){ // Foundation zuerst, dann Tableau
  const cs = selCards(); if(!cs.length) return false;
  if(cs.length === 1) for(let i = 0; i < 4; i++) if(S.g.found[i].length || cs[0].r === 1){ if(moveTo('f' + i)) return true; }
  for(let i = 0; i < 7; i++){ const col = S.g.tab[i]; if(S.sel.k === 't' + i) continue; if(col.length && moveTo('t' + i)) return true; }
  for(let i = 0; i < 7; i++){ if(S.sel.k === 't' + i) continue; if(!S.g.tab[i].length && selCards()[0].r === 13 && !(S.sel.k[0] === 't' && S.sel.i === 0) && moveTo('t' + i)) return true; }
  return false;
}
function tap(k, i){
  if(!S || S.auto) return; const g = S.g;
  if(k === 'stock'){
    S.sel = null; push();
    if(g.stock.length){ for(let n = 0; n < S.draw && g.stock.length; n++){ const c = g.stock.pop(); c.up = true; g.waste.push(c); } g.moves++; }
    else if(g.waste.length){ g.stock = g.waste.reverse().map(c => (c.up = false, c)); g.waste = []; g.moves++; }
    else S.hist.pop();
    return paint();
  }
  if(S.sel && k[0] === 't' && S.sel.k === k && S.sel.i === i){ if(!autoMove()) S.sel = null; return after(); }
  if(S.sel && (k === 'w' || k[0] === 'f') && S.sel.k === k){ if(!autoMove()) S.sel = null; return after(); }
  if(S.sel){ // Ziel?
    const dest = k[0] === 'f' ? k : k[0] === 't' ? k : null;
    if(dest && moveTo(dest)) return after();
  }
  // neu waehlen
  S.sel = null;
  if(k === 'w'){ if(g.waste.length) S.sel = { k: 'w' }; }
  else if(k[0] === 'f'){ if(g.found[+k[1]].length) S.sel = { k }; }
  else { const col = g.tab[+k[1]]; if(i != null && col[i] && col[i].up) S.sel = { k, i }; }
  paint();
}
function after(){ if(won()){ S.won = true; } paint(); }
function undo(){ if(!S || S.auto || !S.hist.length) return; const o = JSON.parse(S.hist.pop()); S.g = o; S.sel = null; S.won = false; paint(); }
function restart(){ stopAuto(); S.g = deal(); S.hist = []; S.sel = null; S.won = false; S.t0 = Date.now(); S.subm = 0; paint(); }
function setTheme(t){ S.th = t; try{ localStorage.setItem('bp_klo_th', t); }catch(e){} paint(); }
function setDraw(n){ S.draw = n; S.t0 = Date.now(); S.g = deal(); S.hist = []; S.sel = null; S.won = false; S.subm = 0; if(boardOpen) boardLoad(); try{ localStorage.setItem('bp_klo_draw', String(n)); }catch(e){} paint(); }
function stopAuto(){ if(autoTimer){ clearInterval(autoTimer); autoTimer = null; } if(S) S.auto = false; }
function canAuto(){ const g = S.g; return !g.stock.length && !g.waste.length && g.tab.every(c => c.every(x => x.up)) && !won(); }
function auto(){
  if(!S || !canAuto() || S.auto) return; S.auto = true; S.sel = null; push();
  autoTimer = setInterval(() => {
    const g = S.g; let did = false;
    for(let c = 0; c < 7 && !did; c++){ const col = g.tab[c], t = col[col.length - 1]; if(!t) continue; for(let f = 0; f < 4; f++) if(canFound(t, g.found[f])){ col.pop(); g.found[f].push(t); g.moves++; did = true; break; } }
    if(!did || won()){ clearInterval(autoTimer); autoTimer = null; S.auto = false; if(won()) S.won = true; }
    paint();
  }, 70);
}
const CSS = `<style>
#kloApp{text-align:center;position:fixed;inset:0;z-index:40;overflow-y:auto;background:var(--bg,#070b1a);padding:10px 6px 24px;max-width:none;width:auto;border-radius:0;border:0;-webkit-overflow-scrolling:touch}
#kloApp>*{max-width:640px;margin-left:auto;margin-right:auto}
.kcd{touch-action:none}
.klb{container-type:inline-size;width:100%;margin:8px auto 0;user-select:none;-webkit-user-select:none;touch-action:manipulation}
.klr{display:grid;grid-template-columns:repeat(7,1fr);gap:4px;--cw:calc((100cqw - 24px)/7)}
.klt{margin-top:12px}
.klc{position:relative;min-height:calc(var(--cw)*1.4);border-radius:calc(var(--cw)*.14);background:rgba(255,255,255,.05);border:1.5px dashed rgba(255,255,255,.16)}
.klc.fd{border-style:solid;border-color:rgba(61,224,255,.28)}
.klc.tg{border-color:#c6ff3d;box-shadow:0 0 12px rgba(198,255,61,.45)}
.kcd{position:absolute;left:0;right:0;height:calc(var(--cw)*1.4);border-radius:calc(var(--cw)*.14);background:linear-gradient(160deg,#fff,#e9edf7);color:#151a2e;font-weight:900;box-shadow:0 2px 5px rgba(0,0,0,.5);box-sizing:border-box;overflow:hidden;text-align:left}
.kcd.r{color:#d3213f}
.kcd .a{position:absolute;left:calc(var(--cw)*.08);top:calc(var(--cw)*.02);font-size:calc(var(--cw)*.36);line-height:1.1}
.kcd .b{position:absolute;right:calc(var(--cw)*.08);bottom:calc(var(--cw)*.02);font-size:calc(var(--cw)*.5);line-height:1}
.kcd.dn{background:repeating-linear-gradient(45deg,#2b3d8f 0 6px,#1f2d6e 6px 12px);border:2px solid #dfe6ff}
.kcd.sel{outline:3px solid #c6ff3d;box-shadow:0 0 14px #c6ff3d;z-index:50}
.kcd.can{outline:2px solid rgba(61,224,255,.6)}
/* Karten-Designs */
[data-th=dunkel] .kcd:not(.dn){background:linear-gradient(160deg,#1c2442,#0e1429);color:#e8eefc;border:1.5px solid rgba(61,224,255,.35)}
[data-th=dunkel] .kcd.r{color:#ff6b8b}
[data-th=dunkel] .kcd.dn{background:repeating-linear-gradient(45deg,#0d1630 0 6px,#16224a 6px 12px);border-color:#3de0ff}
[data-th=neon] .kcd:not(.dn){background:#07090f;color:#3de0ff;border:2px solid #3de0ff;box-shadow:0 0 8px rgba(61,224,255,.55)}
[data-th=neon] .kcd.r{color:#ff4fd8;border-color:#ff4fd8;box-shadow:0 0 8px rgba(255,79,216,.55)}
[data-th=neon] .kcd.dn{background:radial-gradient(circle,#2a0f4a,#07090f);border-color:#c6ff3d;box-shadow:0 0 8px rgba(198,255,61,.5)}
[data-th=retro] .kcd:not(.dn){background:linear-gradient(160deg,#fff6df,#f1e2b8);border:1.5px solid #8a6b3a}
[data-th=retro] .kcd.s0{color:#1b1b1b}[data-th=retro] .kcd.s1{color:#c0272d}[data-th=retro] .kcd.s2{color:#1b6fbf}[data-th=retro] .kcd.s3{color:#1f8a43}
[data-th=retro] .kcd.dn{background:repeating-linear-gradient(0deg,#9b2d2d 0 5px,#7d2020 5px 10px);border-color:#fff6df}
[data-th=gold] .kcd:not(.dn){background:linear-gradient(160deg,#fff3c4,#e8bf55 55%,#fff0b0);color:#2b1c00;border:1.5px solid #8c6a12}
[data-th=gold] .kcd.r{color:#8f1020}
[data-th=gold] .kcd.dn{background:repeating-linear-gradient(45deg,#2b1c00 0 6px,#4a3200 6px 12px);border-color:#e8bf55}
[data-th=gold] .klc{border-color:rgba(232,191,85,.35)}
.kth{display:flex;gap:6px;justify-content:center;flex-wrap:wrap;margin-top:8px}
.kth button{padding:5px 11px;font-size:12px;border-radius:99px}
.kst{position:relative;min-height:calc(var(--cw)*1.4)}
.kemp{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:calc(var(--cw)*.5);opacity:.35}
</style>`;
function cardHtml(c, top, extra, data){
  const cls = 'kcd' + (c.up ? ' s' + c.s : '') + (c.up ? (red(c) ? ' r' : '') : ' dn') + (extra || '');
  return `<div class="${cls}" style="top:${top}" ${data || ''}>${c.up ? `<span class="a">${RK[c.r]}<br>${SU[c.s]}</span><span class="b">${SU[c.s]}</span>` : ''}</div>`;
}
function paint(){
  const el = document.getElementById('kloApp'); if(!el) return;
  if(S.won && !S.subm){ S.subm = 1; winSubmit(); } const g = S.g, sel = S.sel, cs = selCards();
  const tgF = new Set(), tgT = new Set();
  if(cs.length){ for(let i = 0; i < 4; i++) if(cs.length === 1 && canFound(cs[0], g.found[i])) tgF.add(i); for(let i = 0; i < 7; i++) if(!(sel.k === 't' + i) && canTab(cs[0], g.tab[i])) tgT.add(i); }
  // oben: Vorrat, Ablage, 4 Zielstapel (7 Spalten: stock, waste, leer, 4x found)
  let top = `<div class="klc kst" data-k="stock">${g.stock.length ? cardHtml({ up: false }, '0') + `<span style="position:absolute;left:0;right:0;bottom:3px;font-size:calc(var(--cw)*.28);font-weight:900;text-shadow:0 1px 3px #000">${g.stock.length}</span>` : `<div class="kemp">↻</div>`}</div>`;
  const wv = g.waste.slice(-S.draw);
  top += `<div class="klc kst" data-k="w" style="border-style:${g.waste.length ? 'solid' : 'dashed'}">${wv.map((c, n) => cardHtml(c, '0', (sel && sel.k === 'w' && n === wv.length - 1 ? ' sel' : ''), '').replace('style="top:0"', `style="top:0;left:${(S.draw === 3 ? n * 22 : 0)}%;right:${(S.draw === 3 ? (wv.length - 1 - n) * 22 : 0)}%"`)).join('')}</div><div></div>`;
  for(let i = 0; i < 4; i++){ const p = g.found[i], t = p[p.length - 1]; top += `<div class="klc kst fd${tgF.has(i) ? ' tg' : ''}" data-k="f${i}">${t ? cardHtml(t, '0', sel && sel.k === 'f' + i ? ' sel' : '') : `<div class="kemp">${SU[i]}</div>`}</div>`; }
  let tb = '';
  for(let c = 0; c < 7; c++){
    const col = g.tab[c]; let y = 0; const parts = [];
    col.forEach((x, i) => { const isSel = sel && sel.k === 't' + c && i >= sel.i; parts.push(cardHtml(x, `calc(var(--cw)*${y.toFixed(2)})`, isSel ? ' sel' : '', `data-k="t${c}" data-i="${i}"`)); y += x.up ? .52 : .2; });
    const h = col.length ? y - (col[col.length - 1].up ? .46 : .2) + 1.4 : 1.4;
    tb += `<div class="klc${tgT.has(c) ? ' tg' : ''}" data-k="t${c}" style="height:calc(var(--cw)*${(Math.max(h, 1.4) + 0.2).toFixed(2)})">${parts.join('')}</div>`;
  }
  el.querySelector('.klb').innerHTML = `<div class="klr">${top}</div><div class="klr klt">${tb}</div>`;
  el.querySelector('#kloMv').textContent = g.moves;
  const ab = el.querySelector('#kloAuto'); if(ab) ab.style.display = canAuto() && !S.auto ? '' : 'none';
  const ub = el.querySelector('#kloUndo'); if(ub) ub.disabled = !S.hist.length || S.auto;
  el.querySelector('#kloMsg').innerHTML = S.won ? `<b style="color:#c6ff3d;font-size:18px">🎉 ${L2('Geschafft! Alle Karten sortiert.', 'Done! All cards sorted.')}</b> (${g.moves} ${L2('Züge', 'moves')})` : (sel ? L2('Jetzt Ziel antippen – oder dieselbe Karte nochmal für automatisch.', 'Tap a target – or the same card again for auto-move.') : L2('Karte antippen, dann das Ziel. Ziel: alle Karten nach Farbe von Ass bis König ablegen.', 'Tap a card, then its target. Goal: build all four suits from Ace to King.'));
  el.setAttribute('data-th', S.th); el.querySelectorAll('[data-t]').forEach(b => b.style.borderColor = b.dataset.t === S.th ? '#c6ff3d' : '');
  el.querySelectorAll('[data-d]').forEach(b => b.style.borderColor = +b.dataset.d === S.draw ? '#c6ff3d' : '');
}
let chatT = 0, chatLast = 0;
const escH = t => String(t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function chatStop(){ if(chatT){ clearInterval(chatT); chatT = 0; } }
async function chatPoll(first){
  const box = document.getElementById('kloMsgs'); if(!box || !S){ chatStop(); return; }
  try{
    const r = await apiCall('/api/chat-public-list', { room: 'sol', since: first ? 0 : chatLast, token: (typeof account !== 'undefined' && account) ? account.token : undefined });
    if(!r || !r.ok) return; const on = document.getElementById('kloOn'); if(on) on.textContent = '🟢 ' + Math.max(1, r.online || 0) + ' ' + L2('hier', 'here');
    if(first) box.innerHTML = '';
    const near = box.scrollHeight - box.scrollTop - box.clientHeight < 40 || first;
    (r.messages || []).forEach(m => { if(m.id > chatLast) chatLast = m.id; box.insertAdjacentHTML('beforeend', `<div><b style="color:${m.adm ? '#ffd45a' : '#7fe3ff'}">${escH(m.a || '')} ${escH(m.u)}</b> ${escH(m.t)}</div>`); });
    if(near) box.scrollTop = box.scrollHeight;
  }catch(e){}
}
async function chatSend(){
  const inp = document.getElementById('kloIn'); if(!inp) return; const t = inp.value.trim(); if(!t) return;
  if(typeof account === 'undefined' || !account){ const box = document.getElementById('kloMsgs'); if(box) box.insertAdjacentHTML('beforeend', `<div style="color:#ffc446">${L2('Zum Mitchatten bitte einloggen.', 'Please log in to chat.')}</div>`); return; }
  inp.value = '';
  try{ const r = await apiCall('/api/chat-public-send', { room: 'sol', token: account.token, text: t }); if(r && !r.ok){ const box = document.getElementById('kloMsgs'); if(box){ box.insertAdjacentHTML('beforeend', `<div style="color:#ff8aa0">⚠ ${escH(r.error || '')}</div>`); box.scrollTop = box.scrollHeight; } } else chatPoll(false); }catch(e){}
}
function chatInit(){
  chatStop(); chatLast = 0; chatPoll(true); chatT = setInterval(() => chatPoll(false), 3000);
  const inp = document.getElementById('kloIn'), b = document.getElementById('kloSend');
  if(b) b.onclick = chatSend; if(inp) inp.onkeydown = e => { if(e.key === 'Enter') chatSend(); };
}
let boardOpen = false, dragSup = false;
async function winSubmit(){
  const secs = Math.round((Date.now() - S.t0) / 1000), moves = S.g.moves;
  try{ if(typeof account !== 'undefined' && account){ const r = await apiCall('/api/klo/submit', { token: account.token, draw: S.draw, moves, secs }); const m = document.getElementById('kloMsg'); if(m && r && r.ok) m.insertAdjacentHTML('beforeend', `<div style="margin-top:4px;font-size:12px;color:#7fe3ff">${r.improved ? '🏆 ' + L2('Neue Bestleistung in der Liste!', 'New personal best on the list!') : L2('Eingetragen – deine Bestleistung ist besser.', 'Logged – your best is still better.')}</div>`); if(boardOpen) boardLoad(); } }catch(e){}
}
const fmtT = s => Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
async function boardLoad(){
  const box = document.getElementById('kloBoardList'); if(!box) return; box.innerHTML = '<div style="opacity:.6;padding:6px">…</div>';
  try{
    const r = await apiCall('/api/klo/board', { token: (typeof account !== 'undefined' && account) ? account.token : undefined, draw: S.draw });
    if(!r || !r.ok){ box.innerHTML = '<div style="opacity:.6;padding:6px">' + L2('Liste nicht erreichbar.', 'Unavailable.') + '</div>'; return; }
    const medal = i => ['🥇', '🥈', '🥉'][i] || (i + 1);
    box.innerHTML = (r.top.length ? r.top.map((x, i) => `<div style="display:flex;gap:8px;padding:4px 2px;font-size:13px${r.mine && r.mine.pos === x.pos ? ';color:#c6ff3d;font-weight:800' : ''}"><span style="width:26px">${medal(i)}</span><span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escH(x.avatar)} ${escH(x.name)}</span><span>${x.moves} ${L2('Züge', 'moves')}</span><span style="opacity:.7;width:44px;text-align:right">${fmtT(x.secs)}</span></div>`).join('') : '<div style="opacity:.6;padding:6px">' + L2('Noch niemand – sei der Erste!', 'Nobody yet – be the first!') + '</div>')
      + (r.mine ? `<div style="font-size:12px;opacity:.75;margin-top:6px">${L2('Du', 'You')}: ${r.mine.moves} ${L2('Züge', 'moves')} · ${fmtT(r.mine.secs)}${r.mine.pos ? ' · ' + L2('Platz', 'rank') + ' ' + r.mine.pos : ''}</div>` : '');
  }catch(e){}
}
function boardToggle(){ boardOpen = !boardOpen; const w = document.getElementById('kloBoardWrap'); if(w) w.style.display = boardOpen ? '' : 'none'; if(boardOpen) boardLoad(); }
// ---- Karten ziehen (Drag & Drop) ----
function dragInit(b){
  let st = null, ghost = null;
  b.addEventListener('pointerdown', e => {
    if(!S || S.auto || e.button > 0) return; const t = e.target.closest('.kcd[data-k]'); if(!t) return; const k = t.dataset.k; if(k === 'stock') return;
    st = { k, i: t.dataset.i != null ? +t.dataset.i : null, x: e.clientX, y: e.clientY, id: e.pointerId, on: false, ox: 0, oy: 0 };
  });
  b.addEventListener('pointermove', e => {
    if(!st || e.pointerId !== st.id) return;
    if(!st.on){
      if(Math.hypot(e.clientX - st.x, e.clientY - st.y) < 9) return;
      S.sel = null; tap(st.k, st.i); if(!S.sel){ st = null; return; }
      const els = [...b.querySelectorAll('.kcd.sel')]; if(!els.length){ st = null; return; }
      const r0 = els[0].getBoundingClientRect(); ghost = document.createElement('div'); ghost.style.cssText = `position:fixed;z-index:200;pointer-events:none;left:0;top:0;width:${r0.width}px;--cw:${r0.width}px;filter:drop-shadow(0 8px 10px rgba(0,0,0,.55))`;
      els.forEach(el => { const r = el.getBoundingClientRect(), c = el.cloneNode(true); c.classList.remove('sel'); c.style.cssText = `position:absolute;left:0;top:${r.top - r0.top}px;width:${r.width}px;height:${r.height}px;opacity:1`; ghost.appendChild(c); el.style.opacity = '.25'; });
      document.getElementById('kloApp').appendChild(ghost); st.ox = e.clientX - r0.left; st.oy = e.clientY - r0.top; st.on = true; try{ b.setPointerCapture(e.pointerId); }catch(x){}
    }
    ghost.style.transform = `translate(${e.clientX - st.ox}px,${e.clientY - st.oy}px)`; e.preventDefault();
  });
  const end = e => {
    if(!st || e.pointerId !== st.id) return; const was = st; st = null;
    if(!was.on) return; dragSup = true; setTimeout(() => dragSup = false, 80);
    if(ghost){ ghost.remove(); ghost = null; }
    const u = document.elementFromPoint(e.clientX, e.clientY), tg = u && u.closest('[data-k]');
    if(tg && S && S.sel){ const k = tg.dataset.k; if((k[0] === 't' || k[0] === 'f') && !(k === was.k)){ tap(k, tg.dataset.i != null ? +tg.dataset.i : null); } }
    if(S){ S.sel = null; paint(); }
  };
  b.addEventListener('pointerup', end); b.addEventListener('pointercancel', end);
}
function open(back){
  let dr = 1; try{ dr = localStorage.getItem('bp_klo_draw') === '3' ? 3 : 1; }catch(e){}
  let th = 'klassisch'; try{ const v = localStorage.getItem('bp_klo_th'); if(TH.some(x => x[0] === v)) th = v; }catch(e){}
  S = { th, g: deal(), hist: [], sel: null, back: back || null, draw: dr, won: false, auto: false, t0: Date.now(), subm: 0 };
  renderApp(CSS + `<div class="panel" id="kloApp">
    <button class="btn btn-ghost" id="kloBk" onclick="KLO.back()" aria-label="Zurück" style="position:absolute;left:8px;top:8px;padding:6px 14px;font-size:20px;line-height:1;z-index:2">←</button><div class="picker-title" style="margin:0">KARTEN-SOLITÄR</div>
    <div style="display:flex;justify-content:center;gap:18px;align-items:center;font-weight:800;margin-top:6px;flex-wrap:wrap"><span>${L2('Züge', 'Moves')}: <b id="kloMv">0</b></span><span style="display:flex;gap:6px;align-items:center">${L2('Ziehen', 'Draw')}: <button class="btn btn-ghost" data-d="1" style="padding:4px 12px" onclick="KLO.draw(1)">1</button><button class="btn btn-ghost" data-d="3" style="padding:4px 12px" onclick="KLO.draw(3)">3</button></span></div>
    <div class="kth">${TH.map(x => `<button class="btn btn-ghost" data-t="${x[0]}" onclick="KLO.theme('${x[0]}')">${L2(x[1], x[2])}</button>`).join('')}</div>
    <div class="klb" id="kloBoard"></div>
    <div id="kloMsg" style="min-height:44px;font-size:13px;padding:8px 6px 0;opacity:.9"></div>
    <button class="btn btn-ghost btn-block" style="margin-top:6px" onclick="KLO.board()">🏆 ${L2('Bestenliste', 'Leaderboard')} <span style="opacity:.6;font-size:12px">(${L2('wenigste Züge', 'fewest moves')})</span></button>
    <div id="kloBoardWrap" style="display:none;margin-top:6px;border-radius:14px;background:rgba(255,255,255,.05);padding:8px 12px;text-align:left"><div id="kloBoardList"></div></div>
    <div style="display:flex;gap:8px;margin-top:6px"><button class="btn btn-ghost" id="kloUndo" aria-label="Letzten Zug zurücknehmen" title="Letzten Zug zurücknehmen" style="flex:1;font-size:26px;line-height:1" onclick="KLO.undo()">↶</button><button class="btn btn-ghost" style="flex:1" onclick="KLO.restart()">${L2('Neues Spiel', 'New game')}</button></div>
    <button class="btn btn-primary btn-block" id="kloAuto" style="margin-top:8px;display:none" onclick="KLO.auto()">✨ ${L2('Automatisch fertig legen', 'Auto-finish')}</button>
    <div id="kloChat" style="margin-top:12px;border-radius:16px;background:rgba(255,255,255,.05);border:1.5px solid rgba(61,224,255,.25);padding:8px 10px;text-align:left"><div style="display:flex;justify-content:space-between;font-weight:800;font-size:13px"><span>💬 ${L2('Live-Chat Solitär', 'Solitaire live chat')}</span><span id="kloOn" style="opacity:.7">–</span></div><div id="kloMsgs" style="height:130px;overflow-y:auto;margin:6px 0;font-size:13px;line-height:1.35"></div><div id="kloRow" style="display:flex;gap:6px"><input id="kloIn" maxlength="200" placeholder="${L2('Schreib etwas Nettes …', 'Write something nice …')}" style="flex:1;min-width:0;border-radius:12px;border:1.5px solid #ffffff22;background:#0b1024;color:#fff;padding:9px 12px;font-size:14px"><button class="btn btn-primary" id="kloSend" style="padding:8px 14px">➤</button></div><div style="font-size:11px;opacity:.55;margin-top:5px">${L2('Keine Links, keine Beleidigungen oder Rassismus, nichts Strafbares – sonst gesperrt.', 'No links, insults, racism or anything illegal – or you get muted.')}</div></div>
  </div>`);
  const b = document.getElementById('kloBoard');
  dragInit(b);
  b.addEventListener('click', e => { if(dragSup) return; const t = e.target.closest('[data-k]'); if(!t) return; const k = t.dataset.k; tap(k, t.dataset.i != null ? +t.dataset.i : null); });
  paint(); chatInit();
}
window.KLO = { board: boardToggle, open, undo, restart, auto, draw: setDraw, theme: setTheme, back: () => { stopAuto(); chatStop(); const b = S && S.back; S = null; boardOpen = false; if(b) b(); else renderMainMenu(); } };
window.__kloEngine = { deal, canTab, canFound, state: () => S, tap };
})();
