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
  if(!S || S.auto) return; S.hint = null; const g = S.g;
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
function restart(){ stopAuto(); S.g = deal(); S.hist = []; S.sel = null; S.won = false; S.t0 = Date.now(); S.tEnd = 0; S.hint = null; S.subm = 0; paint(); }
function setTheme(t){ S.th = t; try{ localStorage.setItem('bp_klo_th', t); }catch(e){} paint(); }
function setDraw(n){ S.draw = n; S.t0 = Date.now(); S.tEnd = 0; S.hint = null; S.g = deal(); S.hist = []; S.sel = null; S.won = false; S.subm = 0; if(boardOpen) boardLoad(); try{ localStorage.setItem('bp_klo_draw', String(n)); }catch(e){} paint(); }
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
#kloApp{text-align:center;position:fixed;inset:0;z-index:40;display:flex;flex-direction:column;height:100vh;height:100dvh;background:var(--bg,#070b1a);padding:0 4px;max-width:none;width:auto;border-radius:0;border:0;overflow:hidden}
#kloApp>*{width:100%;max-width:640px;margin-left:auto;margin-right:auto}
#chatFab{display:none!important}
.kbar{display:flex;align-items:center;gap:8px;padding:6px 2px;flex:none}.kbar .kst2{flex:1;display:flex;justify-content:center;gap:18px;font-weight:800;font-size:15px}
.kib{width:44px;height:44px;border-radius:14px;border:1.5px solid #ffffff24;background:#ffffff10;color:#fff;font-size:20px;line-height:1;display:grid;place-items:center;flex:none}
.ktool{display:flex;gap:6px;padding:6px 2px calc(8px + env(safe-area-inset-bottom));flex:none}.ktool .kib{flex:1;width:auto;height:50px;font-size:22px;position:relative}.ktool .kib:disabled{opacity:.35}.ktool .kib small{display:block;font-size:10px;font-weight:700;opacity:.7;line-height:1}
.kbd{position:absolute;top:-5px;right:-3px;min-width:20px;height:20px;border-radius:99px;background:#ff3d6e;font-size:12px;font-weight:900;display:grid;place-items:center;padding:0 5px;color:#fff}
.kshw{position:fixed;inset:0;z-index:300;display:none;background:rgba(0,0,0,.5);align-items:flex-end}.kshw.on{display:flex}
.ksp{display:none;width:100%;max-width:640px;margin:0 auto;background:#10172c;border:1px solid #3de0ff40;border-bottom:0;border-radius:22px 22px 0 0;padding:14px 14px calc(14px + env(safe-area-inset-bottom));max-height:78vh;max-height:78dvh;overflow:auto;text-align:left}.ksp.on{display:block}
.ksp h3{margin:0 0 10px;font-size:16px;display:flex;justify-content:space-between;align-items:center}
.kcd.hn{outline:3px solid #ffd45a;box-shadow:0 0 14px #ffd45a;animation:khn .9s infinite}.klc.hnd{border-color:#ffd45a!important;box-shadow:0 0 14px #ffd45a}@keyframes khn{50%{outline-color:#ffd45a55}}
.klb{container-type:inline-size;flex:1;min-height:0;width:100%;margin:2px auto;overflow-y:auto;overflow-x:hidden;user-select:none;-webkit-user-select:none;touch-action:manipulation}
.klr{display:grid;grid-template-columns:repeat(7,1fr);gap:3px;--cw:calc((100cqw - 18px)/7)}
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
.kth button{padding:9px 16px;font-size:14px;border-radius:99px}
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
  let tb = ''; const bd = el.querySelector('.klb'), cwPx = Math.max(20, (bd.clientWidth - 18) / 7), avail = bd.clientHeight ? (bd.clientHeight - (1.4 * cwPx + 14)) / cwPx : 99;
  for(let c = 0; c < 7; c++){
    const col = g.tab[c]; let raw = 0; col.forEach((x, i) => { if(i < col.length - 1) raw += x.up ? .52 : .2; });
    const f = raw > 0 ? Math.max(.38, Math.min(1, (avail - 1.5) / raw)) : 1; let y = 0; const parts = [];
    col.forEach((x, i) => { const isSel = sel && sel.k === 't' + c && i >= sel.i; const hs = S.hint && S.hint.src.k === 't' + c && i >= S.hint.src.i; parts.push(cardHtml(x, `calc(var(--cw)*${y.toFixed(3)})`, (isSel ? ' sel' : '') + (hs ? ' hn' : ''), `data-k="t${c}" data-i="${i}"`)); y += (x.up ? .52 : .2) * f; });
    const h = (col.length ? y + 1.4 - (col[col.length - 1].up ? .52 : .2) * f : 1.4);
    tb += `<div class="klc${tgT.has(c) ? ' tg' : ''}${S.hint && S.hint.dst === 't' + c ? ' hnd' : ''}" data-k="t${c}" style="height:calc(var(--cw)*${(Math.max(h, 1.4) + 0.2).toFixed(3)})">${parts.join('')}</div>`;
  }
  const sc = bd.scrollTop; bd.innerHTML = `<div class="klr">${top}</div><div class="klr klt">${tb}</div>`; bd.scrollTop = sc;
  if(S.hint){ const hs = S.hint.src, hd = S.hint.dst; if(hs.k === 'w'){ const w = bd.querySelectorAll('[data-k="w"] .kcd'); if(w.length) w[w.length - 1].classList.add('hn'); } else if(hs.k === 'stock'){ const e = bd.querySelector('[data-k="stock"]'); if(e) e.classList.add('hnd'); } if(hd && hd[0] === 'f'){ const e = bd.querySelector(`.klc[data-k="${hd}"]`); if(e) e.classList.add('hnd'); } }
  if(S.won && !S.tEnd) S.tEnd = Date.now();
  el.querySelector('#kloMv').textContent = g.moves;
  const ab = el.querySelector('#kloAuto'); if(ab) ab.style.display = canAuto() && !S.auto ? '' : 'none';
  const ub = el.querySelector('#kloUndo'); if(ub) ub.disabled = !S.hist.length || S.auto;
  el.querySelector('#kloMsg').innerHTML = S.won ? `<b style="color:#c6ff3d;font-size:15px">🎉 ${L2('Geschafft!', 'Done!')}</b> (${g.moves} ${L2('Züge', 'moves')})` : S.hint ? `<span style="color:#ffd45a">💡 ${S.hint.msg}</span>` : (sel ? L2('Jetzt Ziel antippen – oder dieselbe Karte nochmal für automatisch.', 'Tap a target – or the same card again for auto-move.') : '');
  el.setAttribute('data-th', S.th); el.querySelectorAll('[data-t]').forEach(b => b.style.borderColor = b.dataset.t === S.th ? '#c6ff3d' : '');
  el.querySelectorAll('[data-d]').forEach(b => b.style.borderColor = +b.dataset.d === S.draw ? '#c6ff3d' : '');
}
let chatT = 0, chatLast = 0;
const escH = t => String(t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function chatStop(){ if(chatT){ clearInterval(chatT); chatT = 0; } }
async function chatPoll(first){
  const box = document.getElementById('kloMsgs'); if(!box || !S){ chatStop(); return; }
  try{
    const r = await apiCall('/api/chat-public-list', { room: 'sol', since: first ? 0 : chatLast, token: (typeof account !== 'undefined' && account) ? account.token : undefined, adminKey: (typeof adminKeyStored === 'function' ? adminKeyStored() : '') || undefined });
    if(!r || !r.ok) return; const on = document.getElementById('kloOn'); if(on) on.textContent = '🟢 ' + Math.max(1, r.online || 0) + ' ' + L2('hier', 'here');
    if(first) box.innerHTML = ''; let nw = 0;
    const near = box.scrollHeight - box.scrollTop - box.clientHeight < 40 || first;
    (r.messages || []).forEach(m => { if(m.id > chatLast){ chatLast = m.id; nw++; } box.insertAdjacentHTML('beforeend', `<div><b style="color:${m.adm ? '#ffd45a' : m.me ? '#c6ff3d' : '#7fe3ff'}">${escH(m.a || '')} ${m.ru ? `<span style="cursor:pointer;text-decoration:underline dotted" data-an="${escH(m.u)}" data-ru="${escH(m.ru)}" onclick="this.textContent=this.textContent===this.dataset.an?'🔍 '+this.dataset.ru:this.dataset.an">${escH(m.u)}</span>` : escH(m.u)}${m.fr ? ' 👥' : ''}</b> ${escH(m.t)}</div>`); });
    if(near) box.scrollTop = box.scrollHeight;
    if(!first && nw && S && S.sheet !== 'chat'){ S.unread = (S.unread || 0) + nw; unreadPaint(); }
  }catch(e){}
}
async function chatSend(){
  const inp = document.getElementById('kloIn'); if(!inp) return; const t = inp.value.trim(); if(!t) return;
  if(typeof account === 'undefined' || !account){ const box = document.getElementById('kloMsgs'); if(box) box.insertAdjacentHTML('beforeend', `<div style="color:#ffc446">${L2('Zum Mitchatten bitte einloggen.', 'Please log in to chat.')}</div>`); return; }
  inp.value = '';
  try{ const r = await apiCall('/api/chat-public-send', { room: 'sol', token: account.token, text: t }); if(r && !r.ok){ const box = document.getElementById('kloMsgs'); if(box){ box.insertAdjacentHTML('beforeend', `<div style="color:#ff8aa0">⚠ ${escH(r.error || '')}</div>`); box.scrollTop = box.scrollHeight; } } else chatPoll(false); }catch(e){}
}
const solMuted = () => { try{ return localStorage.getItem('bp_mute_sol') === '1'; }catch(e){ return false; } };
function solMuteUi(){
  const m = solMuted(), b = document.getElementById('kloMute'), box = document.getElementById('kloMsgs'), row = document.getElementById('kloRow'), tb = document.getElementById('kloChatBtn');
  if(b){ b.textContent = m ? '🔕' : '🔔'; b.title = m ? L2('Stumm – tippen zum Einschalten', 'Muted – tap to unmute') : L2('Chat stumm schalten', 'Mute chat'); }
  if(tb) tb.firstChild.textContent = m ? '🔕' : '💬';
  if(row) row.style.display = m ? 'none' : 'flex';
  if(m){ if(box) box.innerHTML = `<div style="text-align:center;padding:30px 10px;opacity:.85"><div style="font-size:40px">🔕</div><div style="font-weight:800;margin:6px 0">${L2('Chat ist stumm', 'Chat is muted')}</div><button class="btn btn-primary" onclick="KLO.mute()" style="margin-top:8px">🔔 ${L2('Wieder einschalten', 'Turn back on')}</button></div>`; const o = document.getElementById('kloOn'); if(o) o.textContent = ''; if(S){ S.unread = 0; unreadPaint(); } }
}
function solMute(){ try{ localStorage.setItem('bp_mute_sol', solMuted() ? '0' : '1'); }catch(e){} if(solMuted()) chatStop(); else { chatLast = 0; const box = document.getElementById('kloMsgs'); if(box) box.innerHTML = ''; chatPoll(true); if(!chatT) chatT = setInterval(() => chatPoll(false), 3000); } solMuteUi(); }
function chatInit(){
  chatStop(); chatLast = 0; solMuteUi(); if(!solMuted()){ chatPoll(true); chatT = setInterval(() => chatPoll(false), 3000); }
  const inp = document.getElementById('kloIn'), b = document.getElementById('kloSend');
  if(b) b.onclick = chatSend; if(inp) inp.onkeydown = e => { if(e.key === 'Enter') chatSend(); };
}
let boardOpen = false, dragSup = false;
function findHint(){
  const g = S.g, wT = g.waste[g.waste.length - 1];
  const T = L2;
  if(wT) for(let i = 0; i < 4; i++) if(canFound(wT, g.found[i])) return { src: { k: 'w' }, dst: 'f' + i, msg: T('Ablage-Karte nach oben legen', 'Move the waste card up') };
  for(let c = 0; c < 7; c++){ const col = g.tab[c], t = col[col.length - 1]; if(t && t.up) for(let i = 0; i < 4; i++) if(canFound(t, g.found[i])) return { src: { k: 't' + c, i: col.length - 1 }, dst: 'f' + i, msg: T('Karte nach oben legen', 'Move the card up') }; }
  for(let c = 0; c < 7; c++){ const col = g.tab[c], fi = col.findIndex(x => x.up); if(fi > 0) for(let j = 0; j < 7; j++) if(j !== c && canTab(col[fi], g.tab[j])) return { src: { k: 't' + c, i: fi }, dst: 't' + j, msg: T('Deckt eine verdeckte Karte auf', 'Reveals a hidden card') }; }
  if(wT) for(let j = 0; j < 7; j++) if(canTab(wT, g.tab[j])) return { src: { k: 'w' }, dst: 't' + j, msg: T('Ablage-Karte an eine Reihe legen', 'Play the waste card') };
  for(let c = 0; c < 7; c++){ const col = g.tab[c]; if(col.length && col[0].up && col[0].r !== 13) for(let j = 0; j < 7; j++) if(j !== c && canTab(col[0], g.tab[j])) return { src: { k: 't' + c, i: 0 }, dst: 't' + j, msg: T('Macht eine Spalte frei', 'Frees up a column') }; }
  if(g.stock.length || g.waste.length) return { src: { k: 'stock' }, dst: null, msg: T('Keine Karte frei – vom Stapel ziehen', 'No moves – draw from the stock') };
  return null;
}
function hint(){
  if(!S || S.auto || S.won) return; const h = findHint(); S.sel = null;
  if(!h){ const m = document.getElementById('kloMsg'); if(m) m.innerHTML = `<span style="color:#ff8aa0">${L2('Kein Zug mehr möglich – neues Spiel?', 'No moves left – new game?')}</span>`; return; }
  S.hint = h; paint(); setTimeout(() => { if(S && S.hint === h){ S.hint = null; paint(); } }, 3500);
}
function sheet(n){
  if(!S) return; S.sheet = n; const w = document.getElementById('kloSheet'); if(!w) return; w.classList.toggle('on', !!n);
  w.querySelectorAll('.ksp').forEach(p => p.classList.toggle('on', p.dataset.p === n));
  if(n === 'lb') boardLoad(); if(n === 'chat'){ S.unread = 0; unreadPaint(); const m = document.getElementById('kloMsgs'); if(m) m.scrollTop = m.scrollHeight; }
  boardOpen = n === 'lb';
}
function unreadPaint(){ const b = document.getElementById('kloBd'); if(!b || !S) return; b.style.display = S.unread > 0 ? '' : 'none'; b.textContent = S.unread > 9 ? '9+' : S.unread; }
let rzT = 0; function onResize(){ if(!document.getElementById('kloApp')){ window.removeEventListener('resize', onResize); return; } clearTimeout(rzT); rzT = setTimeout(() => { if(S) paint(); }, 120); }

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
  S = { th, g: deal(), hist: [], sel: null, back: back || null, draw: dr, won: false, auto: false, t0: Date.now(), subm: 0, tEnd: 0, hint: null, sheet: null, unread: 0 };
  renderApp(CSS + `<div class="panel" id="kloApp">
    <div class="kbar"><button class="kib" onclick="KLO.back()" aria-label="${L2('Zurück', 'Back')}">←</button><div class="kst2"><span>👆 <b id="kloMv">0</b></span><span>⏱ <b id="kloTm">0:00</b></span></div><button class="kib" onclick="KLO.sheet('set')" aria-label="${L2('Einstellungen', 'Settings')}">⚙</button></div>
    <div class="klb" id="kloBoard"></div>
    <div id="kloMsg" style="min-height:20px;font-size:12px;padding:2px 6px;opacity:.9;flex:none"></div>
    <div class="ktool"><button class="kib" id="kloUndo" onclick="KLO.undo()" aria-label="${L2('Letzten Zug zurücknehmen', 'Undo')}">↶</button><button class="kib" onclick="KLO.hint()" aria-label="${L2('Tipp', 'Hint')}">💡</button><button class="kib" id="kloAuto" style="display:none" onclick="KLO.auto()" aria-label="Auto">✨</button><button class="kib" onclick="KLO.sheet('lb')" aria-label="${L2('Bestenliste', 'Leaderboard')}">🏆</button><button class="kib" id="kloChatBtn" onclick="KLO.sheet('chat')" aria-label="Chat"><span>💬</span><span class="kbd" id="kloBd" style="display:none">0</span></button></div>
    <div class="kshw" id="kloSheet" onclick="if(event.target===this)KLO.sheet(null)">
      <div class="ksp" data-p="set"><h3>⚙ ${L2('Einstellungen', 'Settings')}<button class="kib" style="width:36px;height:36px;font-size:16px" onclick="KLO.sheet(null)">✕</button></h3>
        <div style="font-weight:800;font-size:13px;margin-bottom:6px">${L2('Karten ziehen', 'Draw')}</div><div class="kth" style="justify-content:flex-start;margin:0 0 12px"><button class="btn btn-ghost" data-d="1" onclick="KLO.draw(1)">1</button><button class="btn btn-ghost" data-d="3" onclick="KLO.draw(3)">3</button></div>
        <div style="font-weight:800;font-size:13px;margin-bottom:6px">${L2('Karten-Design', 'Card design')}</div><div class="kth" style="justify-content:flex-start;margin:0 0 12px">${TH.map(x => `<button class="btn btn-ghost" data-t="${x[0]}" onclick="KLO.theme('${x[0]}')">${L2(x[1], x[2])}</button>`).join('')}</div>
        <button class="btn btn-primary btn-block" onclick="KLO.restart();KLO.sheet(null)">🔄 ${L2('Neues Spiel', 'New game')}</button></div>
      <div class="ksp" data-p="lb"><h3>🏆 ${L2('Bestenliste', 'Leaderboard')} <span style="font-size:11px;opacity:.6;font-weight:600">${L2('wenigste Züge', 'fewest moves')}</span><button class="kib" style="width:36px;height:36px;font-size:16px" onclick="KLO.sheet(null)">✕</button></h3><div id="kloBoardList"></div></div>
      <div class="ksp" data-p="chat" id="kloChat"><h3>💬 ${L2('Live-Chat Solitär', 'Solitaire live chat')} <span id="kloOn" style="font-size:12px;opacity:.7;font-weight:600;margin-left:auto;margin-right:8px">–</span><button class="kib" id="kloMute" style="width:36px;height:36px;font-size:16px;margin-right:6px" onclick="KLO.mute()"></button><button class="kib" style="width:36px;height:36px;font-size:16px" onclick="KLO.sheet(null)" aria-label="${L2('Minimieren', 'Minimize')}">⌄</button></h3>${typeof streamerMode !== 'undefined' && streamerMode ? `<div style="margin:0 0 6px;padding:6px 9px;border-radius:10px;background:#ffffff10;font-size:12px">🎥 ${L2('Streamer-Modus: nur Nachrichten von Freunden.', 'Streamer mode: friends’ messages only.')}</div>` : ''}<div id="kloMsgs" style="height:34vh;height:34dvh;overflow-y:auto;font-size:14px;line-height:1.4"></div><div id="kloRow" style="display:flex;gap:6px;margin-top:8px"><input id="kloIn" maxlength="200" placeholder="${L2('Schreib etwas Nettes …', 'Write something nice …')}" style="flex:1;min-width:0;border-radius:12px;border:1.5px solid #ffffff22;background:#0b1024;color:#fff;padding:11px 12px;font-size:16px"><button class="btn btn-primary" id="kloSend" style="padding:8px 16px">➤</button></div><div style="font-size:11px;opacity:.55;margin-top:6px">${L2('Keine Links, keine Beleidigungen oder Rassismus, nichts Strafbares – sonst gesperrt.', 'No links, insults, racism or anything illegal – or you get muted.')}</div></div>
    </div>
  </div>`);
  S.tm = setInterval(() => { const e = document.getElementById('kloTm'); if(!e || !S){ clearInterval(S && S.tm); return; } e.textContent = fmtT(Math.floor(((S.tEnd || Date.now()) - S.t0) / 1000)); }, 1000);
  window.addEventListener('resize', onResize);
  const b = document.getElementById('kloBoard');
  dragInit(b);
  b.addEventListener('click', e => { if(dragSup) return; const t = e.target.closest('[data-k]'); if(!t) return; const k = t.dataset.k; tap(k, t.dataset.i != null ? +t.dataset.i : null); });
  paint(); chatInit(); requestAnimationFrame(() => { if(S) paint(); });
}
window.KLO = { mute: solMute, hint, sheet, board: () => sheet('lb'), open, undo, restart, auto, draw: setDraw, theme: setTheme, back: () => { stopAuto(); chatStop(); if(S && S.tm) clearInterval(S.tm); const b = S && S.back; S = null; boardOpen = false; if(b) b(); else renderMainMenu(); } };
window.__kloEngine = { deal, canTab, canFound, state: () => S, tap };
})();
