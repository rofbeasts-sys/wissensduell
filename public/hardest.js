/* ---------- Das schwerste Spiel der Welt: 5 Spiele, Solo / gegen Bot, Olympiade ---------- */
(function(){
const $ = id => document.getElementById(id);
const esc = x => String(x).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt = x => (x | 0).toLocaleString(L('de-DE', 'en-US'));
const sl = ms => new Promise(r => setTimeout(r, ms));
let stopFn = null, alive = 0;
function detachLayer(){ const l = $('hdLayer'); if(l) l.remove(); }
function attachLayer(){ detachLayer(); const l = document.createElement('div'); l.id = 'hdLayer'; l.style.cssText = 'position:fixed;left:0;top:0;right:0;bottom:0;z-index:50;touch-action:none;background:transparent;-webkit-tap-highlight-color:transparent;user-select:none';
  l.onpointerdown = e => { const h = $('hdHost'); if(h && h.onpointerdown) h.onpointerdown(e); }; l.onpointerup = e => { const h = $('hdHost'); if(h && h.onpointerup) h.onpointerup(e); }; document.body.appendChild(l); }
function killGame(){ detachLayer(); if(stopFn){ try{ stopFn(); }catch(e){} stopFn = null; } alive++; }
function st(game){ try{ return JSON.parse(localStorage.getItem('hd_' + game) || 'null') || { last: 0, best: 0 }; }catch(e){ return { last: 0, best: 0 }; } }
function stSet(game, score){ const o = st(game); o.last = score; if(score > o.best) o.best = score; try{ localStorage.setItem('hd_' + game, JSON.stringify(o)); }catch(e){} return o; }
function statLine(game){ const o = st(game); return L('Letzte: ', 'Last: ') + fmt(o.last) + ' · ' + L('Beste: ', 'Best: ') + fmt(o.best); }
/* ---------- gemeinsames Rahmen-Layout ---------- */
const CSS = `<style>
 #hdApp{text-align:center}
 .hdbig{font-size:54px;font-weight:900;font-variant-numeric:tabular-nums;margin-top:4px}
 #hdMsg{min-height:34px;font-size:16px;font-weight:700;margin-top:4px}
 #hdBot{font-size:13px;font-weight:800;opacity:.9;min-height:18px;margin-top:2px;color:#ffb24d}
 .hdcard{display:flex;gap:10px;align-items:center;padding:12px;border-radius:16px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.05);margin-top:10px;text-align:left}
 .hdcard .ic{font-size:28px}.hdcard .tx{flex:1}.hdcard h3{margin:0;font-size:17px}.hdcard p{margin:2px 0 0;font-size:12px;opacity:.7}
 .hdcard button{padding:8px 12px;border-radius:12px;border:0;font-weight:800;cursor:pointer}
 .hdb1{background:#c8ff3d;color:#0b0f1a}.hdb2{background:#ffb24d;color:#0b0f1a}
 .hdrow{display:flex;gap:8px;align-items:center;padding:6px 0;border-bottom:1px solid rgba(255,255,255,.08);font-size:14px;text-align:left}.hdrow b{width:24px;text-align:center}.hdrow span{flex:1}
 .hdpad{height:20vh;border-radius:20px;opacity:.38;transition:opacity .1s,transform .1s}.hdpad.on{opacity:1;transform:scale(.97);box-shadow:0 0 34px currentColor}
 .hdlvl{display:flex;gap:6px;margin-top:8px}.hdlvl button{flex:1;padding:8px 0;border-radius:12px;border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.06);color:inherit;font-weight:800}.hdlvl button.on{background:#ffb24d;color:#0b0f1a;border-color:#ffb24d}
</style>`;
const hud = { score(n){ const e = $('hdSc'); if(e) e.textContent = fmt(n); }, msg(t){ const e = $('hdMsg'); if(e) e.textContent = t || ' '; } };
/* ---------- die fünf Spiele: run(host, hud, end) -> stop() ; end(score) genau einmal bei Fehler ---------- */
const G = {};
G.balken = { name: 'Der Balken', icon: '📏', hint: ['Tippe, wenn die Kugel in der Zone ist.', 'Tap when the ball is in the zone.'], pace: 1.5, rng: [5, 14],
 run(host, hud, end){
  host.innerHTML = '<canvas id="hdC" width="360" height="300" style="display:block;margin:0 auto;max-width:100%;height:auto"></canvas>'; const c = $('hdC'), x = c.getContext('2d');
  let lvl = 0, pos = 20, dir = 1, zone = 0, zw = 120, fl = 0, over = false, raf = 0, last = performance.now(); const W = 340, X0 = 10;
  const newZ = () => { zw = Math.max(51, 180 * Math.pow(.95, lvl)); zone = X0 + zw / 2 + Math.random() * (W - zw); }; newZ();
  const spd = () => Math.min(400, 140 + lvl * 16);
  function tap(){ if(over) return; if(Math.abs(pos - zone) <= zw / 2){ lvl++; fl = 1; hud.score(lvl); newZ(); } else { over = true; hud.msg(L('Knapp daneben.', 'So close.')); setTimeout(() => end(lvl), 900); } }
  function loop(t){ const dt = Math.min(.05, (t - last) / 1000); last = t; if(!over){ pos += dir * spd() * dt; if(pos > X0 + W - 10){ pos = X0 + W - 10; dir = -1; } if(pos < X0 + 10){ pos = X0 + 10; dir = 1; } }
   x.clearRect(0, 0, 360, 300); x.fillStyle = '#161d30'; x.fillRect(X0, 120, W, 60); x.fillStyle = over ? '#ff4d6a' : 'rgba(200,255,61,' + (.35 + .45 * fl) + ')'; x.fillRect(zone - zw / 2, 120, zw, 60); fl = Math.max(0, fl - dt * 3);
   x.fillStyle = '#fff'; x.beginPath(); x.arc(pos, 150, 16, 0, 7); x.fill(); raf = requestAnimationFrame(loop); }
  raf = requestAnimationFrame(loop); host.onpointerdown = tap; return () => { over = true; cancelAnimationFrame(raf); host.onpointerdown = null; };
 } };
G.turm = { name: 'Der Turm', icon: '🧱', hint: ['Lass den Block fallen. Was überhängt, fällt ab.', 'Drop the block. Overhang falls off.'], pace: 1.7, rng: [7, 20],
 run(host, hud, end){
  host.innerHTML = '<canvas id="hdC" width="360" height="400" style="display:block;margin:0 auto;max-width:100%;height:auto"></canvas>'; const c = $('hdC'), x = c.getContext('2d');
  let stack = [{ x: 80, w: 200 }], cur = { x: 0, w: 200 }, dir = 1, lvl = 0, off = 0, over = false, raf = 0, last = performance.now(), cuts = [];
  const H = 22, spd = () => Math.min(330, 150 + lvl * 6), floorW = () => lvl >= 150 ? 40 : lvl < 30 ? 90 : 90 - (lvl - 30) * 30 / 120;
  function drop(){ if(over) return; const t = stack[stack.length - 1], l = Math.max(cur.x, t.x), r = Math.min(cur.x + cur.w, t.x + t.w);
   if(r - l <= 2){ over = true; hud.msg(L('Daneben.', 'Missed.')); setTimeout(() => end(lvl), 900); return; }
   cuts.push({ x: cur.x < t.x ? cur.x : r, w: cur.w - (r - l), y: stack.length, t: performance.now() });
   if(Math.abs(cur.x - t.x) < 6){ cur.x = t.x; cur.w = t.w; } else { cur.x = l; cur.w = r - l; } if(cur.w < floorW()){ cur.w = floorW(); cur.x = Math.min(Math.max(0, cur.x - (cur.w - (r - l)) / 2), 360 - cur.w); }
   stack.push({ x: cur.x, w: cur.w }); lvl++; hud.score(lvl); cur = { x: 0, w: cur.w }; dir = 1; }
  function loop(t){ const dt = Math.min(.05, (t - last) / 1000); last = t; if(!over){ cur.x += dir * spd() * dt; if(cur.x + cur.w > 360){ cur.x = 360 - cur.w; dir = -1; } if(cur.x < 0){ cur.x = 0; dir = 1; } }
   const target = Math.max(0, (stack.length - 9) * H); off += (target - off) * Math.min(1, dt * 6); x.clearRect(0, 0, 360, 400); const base = 380 + off;
   stack.forEach((b, i) => { x.fillStyle = 'hsl(' + ((i * 14) % 360) + ',70%,55%)'; x.fillRect(b.x, base - (i + 1) * H, b.w, H - 2); });
   if(!over){ x.fillStyle = '#fff'; x.fillRect(cur.x, base - stack.length * H, cur.w, H - 2); }
   cuts = cuts.filter(k => t - k.t < 700); cuts.forEach(k => { const a = (t - k.t) / 700; x.fillStyle = 'rgba(255,255,255,' + (1 - a) + ')'; x.fillRect(k.x, base - (k.y + 1) * H + a * 140, k.w, H - 2); }); raf = requestAnimationFrame(loop); }
  raf = requestAnimationFrame(loop); host.onpointerdown = drop; return () => { over = true; cancelAnimationFrame(raf); host.onpointerdown = null; };
 } };
G.gedaechtnis = { name: 'Das Gedächtnis', icon: '🧠', hint: ['Merke dir die Folge und tippe sie nach.', 'Memorize the sequence and repeat it.'], pace: 3.4, rng: [4, 11],
 run(host, hud, end){
  const cols = ['#ff4d6a', '#3de0ff', '#c8ff3d', '#ffc83d']; let seq = [], inp = 0, state = 'show', lvl = 0, dead = false;
  host.innerHTML = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;max-width:340px;margin:20px auto 0">' + cols.map((cl, i) => `<div class="hdpad" id="hdp${i}" style="background:${cl};color:${cl}"></div>`).join('') + '</div>';
  const flash = (i, ms) => { const e = $('hdp' + i); if(!e) return; e.classList.add('on'); setTimeout(() => e.classList.remove('on'), ms); };
  async function play(){ state = 'show'; hud.msg(L('Merken …', 'Watch …')); const gap = Math.max(180, 520 - seq.length * 28); await sl(500); for(const i of seq){ if(dead) return; flash(i, gap * .7); await sl(gap); } if(dead) return; state = 'in'; inp = 0; hud.msg(L('Du bist dran.', 'Your turn.')); }
  function nextRound(){ seq.push(Math.floor(Math.random() * 4)); play(); }
  function press(i){ if(state !== 'in') return; flash(i, 160); if(seq[inp] !== i){ state = 'over'; hud.msg(L('Falsch.', 'Wrong.')); setTimeout(() => end(lvl), 900); return; } inp++; if(inp === seq.length){ lvl++; hud.score(lvl); state = 'wait'; setTimeout(() => { if(!dead) nextRound(); }, 700); } }
  host.querySelectorAll('.hdpad').forEach((e, i) => e.onpointerdown = () => press(i)); nextRound(); return () => { dead = true; state = 'over'; };
 } };
G.linie = { name: 'Die Linie', icon: '🎯', hint: ['Tippe, wenn der Zeiger im Feld ist.', 'Tap when the hand is in the zone.'], pace: 1.8, rng: [6, 15],
 run(host, hud, end){
  host.innerHTML = '<canvas id="hdC" width="360" height="330" style="display:block;margin:0 auto;max-width:100%;height:auto"></canvas>'; const c = $('hdC'), x = c.getContext('2d');
  let lvl = 0, a = 0, dir = 1, tg = 1.2, w = .8, fl = 0, over = false, raf = 0, last = performance.now();
  const norm = v => { v %= Math.PI * 2; return v < 0 ? v + Math.PI * 2 : v; }; const newT = () => { w = Math.max(.75, 1.31 * Math.pow(.95, lvl)); tg = a + 1.2 + Math.random() * 3.5; }; newT();
  const spd = () => Math.min(4.2, 1.2 + lvl * .1);
  function tap(){ if(over) return; let d = Math.abs(norm(a) - norm(tg)); d = Math.min(d, Math.PI * 2 - d); if(d <= w / 2){ lvl++; fl = 1; hud.score(lvl); if(lvl >= 6 && lvl % 3 === 0) dir *= -1; newT(); } else { over = true; hud.msg(L('Knapp daneben.', 'So close.')); setTimeout(() => end(lvl), 900); } }
  function loop(t){ const dt = Math.min(.05, (t - last) / 1000); last = t; if(!over) a += dir * spd() * dt;
   x.clearRect(0, 0, 360, 330); x.lineWidth = 26; x.strokeStyle = '#161d30'; x.beginPath(); x.arc(180, 165, 125, 0, 7); x.stroke(); x.strokeStyle = over ? '#ff4d6a' : 'rgba(200,255,61,' + (.5 + .4 * fl) + ')'; x.beginPath(); x.arc(180, 165, 125, tg - w / 2, tg + w / 2); x.stroke(); fl = Math.max(0, fl - dt * 3);
   x.fillStyle = '#fff'; x.beginPath(); x.arc(180 + 125 * Math.cos(a), 165 + 125 * Math.sin(a), 12, 0, 7); x.fill(); x.strokeStyle = '#fff'; x.lineWidth = 3; x.beginPath(); x.moveTo(180, 165); x.lineTo(180 + 95 * Math.cos(a), 165 + 95 * Math.sin(a)); x.stroke(); raf = requestAnimationFrame(loop); }
  raf = requestAnimationFrame(loop); host.onpointerdown = tap; return () => { over = true; cancelAnimationFrame(raf); host.onpointerdown = null; };
 } };
G.gegenteil = { name: 'Das Gegenteil', icon: '🔄', hint: ['Roter Pfeil: gegen die Richtung wischen. Grüner Pfeil: mit der Richtung.', 'Red arrow: swipe against it. Green arrow: swipe with it.'], pace: 1.5, rng: [6, 17],
 run(host, hud, end){
  const A = ['⬆', '➡', '⬇', '⬅']; let cur = 0, lvl = 0, rule = 0, pc = -1, t0 = 0, lim = 2000, over = false, timer = null, iv = null, sx = 0, sy = 0;
  host.innerHTML = '<div id="hdRule" style="font-size:13px;font-weight:800;color:#ffb24d;min-height:18px"></div><div id="hdArr" style="font-size:140px;line-height:1.1;margin-top:10px">⬆</div><div style="width:300px;height:10px;background:#161d30;border-radius:5px;margin:14px auto 0"><div id="hdTb" style="height:100%;width:100%;background:#c8ff3d;border-radius:5px"></div></div>';
  const limit = () => Math.max(1100, 2800 - lvl * 50);
  function show(){ cur = Math.floor(Math.random() * 4); rule = Math.random() < .5 ? 0 : 1; const ar = $('hdArr'); ar.textContent = A[cur]; ar.style.color = rule ? '#3dff7a' : '#ff4d6a'; t0 = performance.now(); lim = limit() + (pc >= 0 && pc !== rule ? 350 : 0); pc = rule; clearTimeout(timer); timer = setTimeout(() => lose(L('Zu langsam.', 'Too slow.')), lim); }
  function lose(m){ if(over) return; over = true; clearTimeout(timer); hud.msg(m); const a = $('hdArr'); if(a) a.style.opacity = '.4'; setTimeout(() => end(lvl), 900); }
  function swipe(d){ if(over) return; const want = rule === 0 ? (cur + 2) % 4 : cur; if(d === want){ lvl++; hud.score(lvl); show(); } else lose(rule === 0 ? L('Rot heißt: dagegen.', 'Red means: against.') : L('Grün heißt: mit dem Pfeil.', 'Green means: with the arrow.')); }
  host.onpointerdown = e => { sx = e.clientX; sy = e.clientY; }; host.onpointerup = e => { const dx = e.clientX - sx, dy = e.clientY - sy; if(Math.hypot(dx, dy) < 30) return; swipe(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 3) : (dy > 0 ? 2 : 0)); };
  iv = setInterval(() => { const b = $('hdTb'); if(b && !over) b.style.width = Math.max(0, 100 - (performance.now() - t0) / lim * 100) + '%'; }, 40);
  hud.msg(L('Rot = dagegen, Grün = mit dem Pfeil.', 'Red = against, green = with the arrow.')); show();
  return () => { over = true; clearTimeout(timer); clearInterval(iv); host.onpointerdown = null; host.onpointerup = null; };
 } };
G.flug = { name: 'Der Farbflug', icon: '🚀', hint: ['Fliege durch die Farbe, die oben steht. Links oder rechts tippen.', 'Fly through the color shown on top. Tap left or right.'], pace: 1.6, rng: [5, 16],
 run(host, hud, end){
  host.innerHTML = '<canvas id="hdC" width="360" height="430" style="display:block;margin:0 auto;max-width:100%;height:auto"></canvas>'; const c = $('hdC'), x = c.getContext('2d');
  const CL = { R: '#ff4d6a', G: '#3dff7a', B: '#3db0ff', Y: '#ffc83d' }, NM = { R: L('ROT', 'RED'), G: L('GRÜN', 'GREEN'), B: L('BLAU', 'BLUE'), Y: L('GELB', 'YELLOW') }, K = Object.keys(CL), LX = [100, 260], BY = 330;
  let bx = 100, dest = 0, lvl = 0, over = false, gates = [], raf = 0, last = performance.now();
  const addG = y => { const a = K[Math.floor(Math.random() * 4)]; let b; do { b = K[Math.floor(Math.random() * 4)]; } while(b === a); gates.push({ y, cols: [a, b], t: Math.random() < .5 ? 0 : 1, done: false }); };
  for(let i = 0; i < 4; i++) addG(120 - i * 230);
  const spd = () => Math.min(400, 190 + lvl * 9), cur = () => gates.filter(g => !g.done).sort((a, b) => b.y - a.y)[0];
  const go = d => { if(!over) dest = d; };
  function loop(t){ const dt = Math.min(.05, (t - last) / 1000); last = t; x.clearRect(0, 0, 360, 430); const g = cur();
   x.globalAlpha = .22; x.fillStyle = g ? CL[g.cols[0]] : '#333'; x.fillRect(0, 0, 14, 430); x.fillStyle = g ? CL[g.cols[1]] : '#333'; x.fillRect(346, 0, 14, 430); x.globalAlpha = 1;
   if(g){ x.fillStyle = CL[g.cols[g.t]]; x.font = '800 22px system-ui'; x.textAlign = 'center'; x.fillText(L('DURCH: ', 'THROUGH: ') + NM[g.cols[g.t]], 180, 26); }
   if(!over){ gates.forEach(q => q.y += spd() * dt); bx += (LX[dest] - bx) * Math.min(1, dt * 7);
    if(g && g.y >= BY - 10 && g.y <= BY + 40 && !g.done){ g.done = true; const lane = Math.abs(bx - LX[0]) < Math.abs(bx - LX[1]) ? 0 : 1; if(lane === g.t){ lvl++; hud.score(lvl); } else { over = true; hud.msg(L('Falsche Farbe.', 'Wrong color.')); setTimeout(() => end(lvl), 900); } }
    gates = gates.filter(q => q.y < 520); if(gates.length < 5) addG(Math.min.apply(null, gates.map(q => q.y)) - 230); }
   gates.forEach(q => [0, 1].forEach(l => { x.fillStyle = CL[q.cols[l]]; x.globalAlpha = q.done ? .25 : .95; x.fillRect(l ? 185 : 10, q.y - 14, 165, 28); x.globalAlpha = 1; }));
   x.fillStyle = over ? '#ff4d6a' : '#fff'; x.shadowColor = '#fff'; x.shadowBlur = 20; x.beginPath(); x.arc(bx, BY, 20, 0, 7); x.fill(); x.shadowBlur = 0;
   x.fillStyle = 'rgba(255,255,255,.14)'; x.fillRect(10, 380, 165, 44); x.fillRect(185, 380, 165, 44); x.fillStyle = '#fff'; x.font = '800 30px system-ui'; x.fillText('◀', 92, 412); x.fillText('▶', 267, 412);
   raf = requestAnimationFrame(loop); }
  raf = requestAnimationFrame(loop);
  host.onpointerdown = e => { const r = (document.documentElement.clientWidth || window.innerWidth) / 2; go(e.clientX < r ? 0 : 1); };
  return () => { over = true; cancelAnimationFrame(raf); host.onpointerdown = null; };
 } };
const ORDER = ['balken', 'turm', 'gedaechtnis', 'linie', 'gegenteil', 'flug'];
/* ---------- Bot-Gegner: Zielwert + Anzeige, die mitzählt ---------- */
function botTarget(game, diff){ const r = G[game].rng, f = diff === 0 ? .65 : diff === 2 ? 1.35 : 1; return Math.max(1, Math.round((r[0] + Math.random() * (r[1] - r[0])) * f)); }
function botTicker(target, pace, label){ let n = 0, stop = false; const iv = setInterval(() => { if(stop) return; if(n < target){ n++; const e = $('hdBot'); if(e) e.textContent = label + ': ' + n; } }, Math.max(350, pace * 1000)); return { value: () => n, finish(){ stop = true; clearInterval(iv); const e = $('hdBot'); if(e) e.textContent = label + ': ' + target; }, stop(){ stop = true; clearInterval(iv); } }; }
/* ---------- Server: Bestenlisten ---------- */
async function submit(game, score){ if(!account || !(score > 0)) return null; return await apiCall('/api/hard', { token: account.token, action: 'submit', game, score }); }
async function board(game){ return await apiCall('/api/hard', { token: account && account.token, action: 'board', game }); }
function boardHtml(b){ if(!b || !b.ok || !b.board || !b.board.length) return '<div style="opacity:.6;text-align:center;padding:8px">' + L('Noch keine Einträge.', 'No entries yet.') + '</div>'; return b.board.map((r, i) => '<div class="hdrow"><b>' + (i + 1) + '</b><span>' + esc(r.name) + '</span><span style="flex:none;font-weight:800">' + fmt(r.best) + '</span></div>').join(''); }
function rankBox(b){
  if(!b || !b.ok) return '';
  const me = b.rank ? `<div style="font-size:16px;font-weight:800;margin-top:14px">${L('Dein Platz: ', 'Your rank: ')}${b.rank}${b.board && b.board.length ? L(' von ', ' of ') + '…' : ''}</div>` : (account ? '' : `<div class="explanation" style="margin-top:12px">${L('Melde dich an, um in die Bestenliste zu kommen.', 'Log in to get on the leaderboard.')}</div>`);
  const top = (b.board || []).slice(0, 5).map((r, i) => '<div class="hdrow"><b>' + (i + 1) + '</b><span>' + esc(r.name) + '</span><span style="flex:none;font-weight:800">' + fmt(r.best) + '</span></div>').join('') || '<div style="opacity:.6;text-align:center;padding:8px">' + L('Noch keine Einträge.', 'No entries yet.') + '</div>';
  return me.replace(/ von …| of …/, '') + '<div class="settings-label" style="margin-top:12px">' + L('TOP 5', 'TOP 5') + '</div>' + top;
}
/* ---------- Bildschirme ---------- */
let diff = 1;
window.startHardFlow = function(){
  killGame();
  if(typeof featureLocked === 'function' && featureLocked('hard') && !(typeof adminViewOn === 'function' && adminViewOn())){ renderMainMenu(); return; }
  const cards = ORDER.map(k => `<div class="hdcard"><div class="ic">${G[k].icon}</div><div class="tx"><h3>${G[k].name}</h3><p>${L(G[k].hint[0], G[k].hint[1])}</p></div><button class="hdb1" onclick="hdPlay('${k}',0)">Solo</button><button class="hdb2" onclick="hdPlay('${k}',1)">${L('Gegen Bot', 'vs Bot')}</button></div>`).join('');
  renderApp(CSS + `<div class="panel" id="hdApp"><div class="picker-title">💀 ${L('DAS SCHWERSTE SPIEL DER WELT', 'THE HARDEST GAME IN THE WORLD')}</div>
   <div class="picker-sub">${L('Ein Fehler und es ist vorbei. Wie weit kommst du?', 'One mistake and it is over. How far can you get?')}</div>
   <div class="settings-label" style="margin-top:12px">${L('Schwierigkeit des Bots', 'Bot difficulty')}</div>
   <div class="hdlvl">${[[0, 'Leicht', 'Easy'], [1, 'Normal', 'Normal'], [2, 'Schwer', 'Hard']].map(d => `<button class="${diff === d[0] ? 'on' : ''}" onclick="hdDiff(${d[0]})">${L(d[1], d[2])}</button>`).join('')}</div>
   <div class="hdcard" style="border-color:#ffb24d"><div class="ic">🏅</div><div class="tx"><h3>${L('Olympiade', 'Olympics')}</h3><p>${L('Alle fünf Spiele durcheinander, jedes mit einem Leben. Die Punkte zählen zusammen.', 'All five games shuffled, one life each. Points add up.')}</p></div><button class="hdb1" onclick="hdOlymp(0)">Solo</button><button class="hdb2" onclick="hdOlymp(1)">${L('Gegen Bot', 'vs Bot')}</button></div>
   ${cards}
   <div class="actions-row" style="flex-direction:column;gap:8px;margin-top:14px"><button class="btn btn-ghost" onclick="brDuelHub()">${L('Zurück', 'Back')}</button></div></div>`);
};
window.hdDiff = function(d){ diff = d; startHardFlow(); };
function shell(title, sub, withBot, game){ renderApp(CSS + `<div class="panel" id="hdApp"><div class="picker-title" style="margin:0">${title}</div><div style="font-size:13px;font-weight:800;opacity:.85;margin-top:4px">${game ? statLine(game) : ''}</div><div class="picker-sub">${sub}</div><div class="hdbig" id="hdSc">0</div><div id="hdBot">${withBot ? '&nbsp;' : ''}</div><div id="hdMsg">&nbsp;</div><div id="hdHost" style="touch-action:none;user-select:none;min-height:60vh"></div></div>`); }
const INTRO = {
 balken: ['Eine Kugel fliegt hin und her.', 'Tippe auf den Bildschirm, wenn die Kugel im Feld ist.', 'A ball flies back and forth.', 'Tap the screen when the ball is in the field.', '<div style="height:18px;border-radius:9px;background:#161d30;position:relative;margin:14px auto;max-width:260px"><div style="position:absolute;left:30%;width:36%;top:0;bottom:0;background:#c8ff3d;border-radius:9px"></div><div style="position:absolute;left:44%;top:-4px;width:26px;height:26px;border-radius:50%;background:#fff"></div></div>'],
 turm: ['Ein Block fährt hin und her.', 'Tippe, um ihn fallen zu lassen. Was überhängt, fällt ab.', 'A block slides back and forth.', 'Tap to drop it. Overhang falls off.', '<div style="margin:14px auto;max-width:200px"><div style="height:16px;background:#3de0ff;margin:0 auto;width:110px;border-radius:3px"></div><div style="height:16px;background:#ff4d6a;margin:2px auto 0;width:150px;border-radius:3px"></div></div>'],
 gedaechtnis: ['Vier Farben leuchten nacheinander auf.', 'Merke dir die Folge und tippe sie danach in derselben Reihenfolge.', 'Four colors light up one after another.', 'Remember the order and tap them in the same order.', '<div style="display:flex;gap:8px;justify-content:center;margin:14px"><span style="width:34px;height:34px;border-radius:8px;background:#ff4d6a"></span><span style="width:34px;height:34px;border-radius:8px;background:#3de0ff"></span><span style="width:34px;height:34px;border-radius:8px;background:#c8ff3d"></span><span style="width:34px;height:34px;border-radius:8px;background:#ffc83d"></span></div>'],
 linie: ['Ein Zeiger kreist.', 'Tippe auf den Bildschirm, wenn er im Feld ist.', 'A hand is spinning.', 'Tap the screen when it is in the field.', '<div style="width:90px;height:90px;border-radius:50%;border:5px solid #161d30;margin:12px auto;position:relative"><div style="position:absolute;left:50%;top:-5px;width:46px;height:20px;margin-left:-23px;background:#c8ff3d;border-radius:10px;opacity:.9"></div></div>'],
 flug: ['Du fliegst nach oben. Von oben kommen Farbfelder.', 'Oben steht die Farbe, durch die du fliegen musst. Tippe links oder rechts auf den Bildschirm, um die Seite zu wechseln. Bist du schon richtig, bleibst du.', 'You fly upward. Color fields come from above.', 'The color on top is the one to fly through. Tap left or right on the screen to switch sides. If you are already right, stay.', '<div style="display:flex;gap:12px;justify-content:center;margin:14px"><span style="width:70px;height:18px;border-radius:5px;background:#ffc83d"></span><span style="width:70px;height:18px;border-radius:5px;background:#ff4d6a"></span></div><div style="font-size:26px">◀ &nbsp; ▶</div>'],
 gegenteil: ['Ein Pfeil erscheint. Seine Farbe sagt dir, wohin du wischst.', 'Roter Pfeil: wische in die GEGENÜBERLIEGENDE Richtung. Grüner Pfeil: wische in Pfeilrichtung.', 'An arrow appears. Its color tells you where to swipe.', 'Red arrow: swipe the OPPOSITE way. Green arrow: swipe the same way.', '<div style="display:flex;gap:30px;justify-content:center;font-size:54px;margin:10px"><span style="color:#ff4d6a">⬆</span><span style="color:#3dff7a">⬆</span></div><div style="display:flex;gap:30px;justify-content:center;font-size:13px;font-weight:800"><span>⬇ swipe</span><span>⬆ swipe</span></div>']
};
window.hdPlay = function(game, mode, go){
  if(!go && INTRO[game]){ killGame(); const g = G[game], I = INTRO[game];
    renderApp(CSS + `<div class="panel" id="hdApp"><div class="picker-title">${g.icon} ${g.name.toUpperCase()}</div><div style="font-size:16px;font-weight:700;margin-top:10px">${L(I[0], I[2])}</div><div style="font-size:15px;opacity:.9;margin-top:6px">${L(I[1], I[3])}</div>${I[4]}<div class="actions-row" style="flex-direction:column;gap:8px;margin-top:14px"><button class="btn" onclick="hdPlay('${game}',${mode},1)">START</button><button class="btn btn-ghost" onclick="startHardFlow()">${L('Zurück', 'Back')}</button></div></div>`); return; }
  killGame(); const my = alive, g = G[game];
  shell(g.icon + ' ' + g.name.toUpperCase(), L(g.hint[0], g.hint[1]), mode === 1, game);
  const tgt = mode === 1 ? botTarget(game, diff) : 0, tk = mode === 1 ? botTicker(tgt, g.pace, 'Bot') : null;
  stopFn = g.run($('hdHost'), hud, async score => { if(my !== alive) return; if(tk) tk.finish(); stopFn = null; detachLayer(); stSet(game, score); const sub = await submit(game, score); const b = await board(game);
   const win = mode === 1 ? (score > tgt ? 1 : score === tgt ? 0 : -1) : 0;
   renderApp(CSS + `<div class="panel" id="hdApp"><div class="picker-title">${g.icon} ${g.name.toUpperCase()}</div>
    <div class="hdbig">${fmt(score)}</div>
    <div style="font-size:15px;font-weight:700;margin-top:4px">${mode === 1 ? (win > 0 ? L('Du hast den Bot geschlagen!', 'You beat the bot!') + ' (Bot: ' + tgt + ')' : win === 0 ? L('Unentschieden gegen den Bot.', 'Draw with the bot.') + ' (Bot: ' + tgt + ')' : L('Der Bot war besser.', 'The bot was better.') + ' (Bot: ' + tgt + ')') : (score >= 12 ? L('Stark.', 'Strong.') : L('Die meisten hören hier auf.', 'Most people stop here.'))}</div>
    ${sub && sub.ok ? `<div style="opacity:.75;font-size:13px;margin-top:4px">${L('Dein Rekord: ', 'Your best: ')}${fmt(sub.mine || score)}${sub.rank ? ' · ' + L('Platz ', 'Rank ') + sub.rank : ''}</div>` : (!account ? `<div class="explanation" style="margin-top:8px">${L('Melde dich an, um in die Bestenliste zu kommen.', 'Log in to get on the leaderboard.')}</div>` : '')}
    <div style="font-size:13px;font-weight:800;opacity:.85;margin-top:6px">${statLine(game)}</div>
    <div class="actions-row" style="flex-direction:row;gap:10px;margin-top:14px"><button class="btn" style="flex:1" onclick="hdPlay('${game}',${mode},1)">${L('Nochmal', 'Again')}</button><button class="btn btn-ghost" style="flex:1" onclick="startHardFlow()">${L('Raus', 'Exit')}</button></div>
    ${rankBox(b)}</div>`);
  });
  if(game !== 'gedaechtnis') attachLayer();
};
window.hdOlymp = async function(mode){
  killGame(); const my = alive; const order = ORDER.slice().sort(() => Math.random() - .5); const res = []; let total = 0, botTotal = 0; const targets = order.map(k => botTarget(k, diff));
  for(let i = 0; i < order.length; i++){
    if(my !== alive) return; const k = order[i], g = G[k];
    renderApp(CSS + `<div class="panel" id="hdApp"><div class="picker-title">🏅 ${L('OLYMPIADE', 'OLYMPICS')} ${i + 1}/${order.length}</div><div class="hdbig" style="font-size:80px">${g.icon}</div><div class="picker-title" style="margin-top:6px">${g.name}</div><div class="picker-sub">${L(g.hint[0], g.hint[1])}</div><div style="margin-top:14px;font-weight:800">${L('Gesamt bisher: ', 'Total so far: ')}${fmt(total)}${mode ? ' · Bot ' + fmt(botTotal) : ''}</div></div>`);
    await sl(2200); if(my !== alive) return;
    const score = await new Promise(resolve => { shell('🏅 ' + g.name.toUpperCase() + ' (' + (i + 1) + '/' + order.length + ')', L('Gesamt bisher: ', 'Total so far: ') + fmt(total), mode === 1, 'olympiade'); const tk = mode === 1 ? botTicker(targets[i], g.pace, 'Bot') : null; stopFn = g.run($('hdHost'), hud, s => { if(tk) tk.finish(); stopFn = null; detachLayer(); resolve(s); }); if(k !== 'gedaechtnis') attachLayer(); });
    if(my !== alive) return; res.push([k, score]); total += score; botTotal += targets[i];
  }
  stSet('olympiade', total); const sub = await submit('olympiade', total); const b = await board('olympiade'); if(my !== alive) return;
  renderApp(CSS + `<div class="panel" id="hdApp"><div class="picker-title">🏅 ${L('OLYMPIADE GESCHAFFT', 'OLYMPICS DONE')}</div><div class="hdbig">${fmt(total)}</div>
   ${mode ? `<div style="font-size:15px;font-weight:700">${total > botTotal ? L('Du hast den Bot geschlagen!', 'You beat the bot!') : total === botTotal ? L('Unentschieden.', 'Draw.') : L('Der Bot war besser.', 'The bot was better.')} (Bot: ${fmt(botTotal)})</div>` : ''}
   <div style="margin-top:10px;text-align:left">${res.map(([k, s], i) => `<div class="hdrow"><span>${G[k].icon} ${G[k].name}</span><span style="flex:none;font-weight:800">${fmt(s)}${mode ? ' <small style="opacity:.6">(Bot ' + targets[ORDER.indexOf(k) >= 0 ? order.indexOf(k) : 0] + ')</small>' : ''}</span></div>`).join('')}</div>
   ${sub && sub.ok ? `<div style="opacity:.75;font-size:13px;margin-top:6px">${L('Dein Rekord: ', 'Your best: ')}${fmt(sub.mine || total)}${sub.rank ? ' · ' + L('Platz ', 'Rank ') + sub.rank : ''}</div>` : (!account ? `<div class="explanation" style="margin-top:8px">${L('Melde dich an, um in die Bestenliste zu kommen.', 'Log in to get on the leaderboard.')}</div>` : '')}
   <div style="font-size:13px;font-weight:800;opacity:.85;margin-top:6px">${statLine('olympiade')}</div>
   <div class="actions-row" style="flex-direction:row;gap:10px;margin-top:14px"><button class="btn" style="flex:1" onclick="hdOlymp(${mode})">${L('Nochmal', 'Again')}</button><button class="btn btn-ghost" style="flex:1" onclick="startHardFlow()">${L('Raus', 'Exit')}</button></div>
   ${rankBox(b)}</div>`);
};
window.__hdG = G;
})();
