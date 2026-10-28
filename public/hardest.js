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
function STARTILE(sz, n, seed, r0){ let x = seed * 9301 % 233280; const rnd = () => { x = (x * 9301 + 49297) % 233280; return x / 233280; }; let c = '';
  for(let k = 0; k < n; k++){ const col = rnd() < .22 ? '%23ffd9ff' : rnd() < .5 ? '%23cfe6ff' : '%23ffffff'; c += "<circle cx='" + (rnd() * sz).toFixed(0) + "' cy='" + (rnd() * sz).toFixed(0) + "' r='" + (r0 * (.5 + rnd())).toFixed(1) + "' fill='" + col + "'/>"; }
  return "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='" + sz + "' height='" + sz + "'>" + c + "</svg>\")"; }
const SB = v => Math.min(v, 9);
function STARS(n, seed, size){ let x = seed * 9301 % 233280, o = []; const rnd = () => { x = (x * 9301 + 49297) % 233280; return x / 233280; };
  for(let k = 0; k < n; k++){ const px = (rnd() * 100).toFixed(1), py = (rnd() * 100).toFixed(1), sz = (size * (.6 + rnd() * .9)).toFixed(1), c = rnd() < .22 ? '#ffd9ff' : rnd() < .5 ? '#cfe6ff' : '#ffffff'; o.push('radial-gradient(' + sz + 'px ' + sz + 'px at ' + px + '% ' + py + '%,' + c + ',transparent)'); }
  return o.join(','); }
/* ---------- gemeinsames Rahmen-Layout ---------- */
const CSS = `<style>
 #hdApp{text-align:center;position:relative;overflow:hidden;border-radius:30px;border:1px solid rgba(160,140,255,.35);background:radial-gradient(ellipse at 15% 0%,#4a1f9c 0,transparent 48%),radial-gradient(ellipse at 100% 30%,#173fa8 0,transparent 52%),radial-gradient(ellipse at 20% 75%,#5e2090 0,transparent 46%),radial-gradient(ellipse at 90% 100%,#1e2080 0,transparent 50%),#070626;box-shadow:0 0 40px rgba(106,44,214,.35)}
 #hdApp:before,#hdApp:after{content:"";position:absolute;left:0;top:0;right:0;bottom:0;pointer-events:none;transform:translateZ(0)}
 #hdApp:before{background-image:${STARTILE(360, 12, 7, 1.2)},${STARTILE(560, 14, 31, .9)};opacity:.65}
 #hdApp:after{display:none}
 @keyframes hdTw{from{opacity:.15}to{opacity:1}}
 #hdApp .hdsh{position:absolute;left:-20%;top:12%;width:90px;height:2px;background:linear-gradient(90deg,transparent,#fff);transform:rotate(22deg);opacity:0;display:none;pointer-events:none}
 @keyframes hdShoot{0%{opacity:0;transform:translate(0,0) rotate(22deg)}4%{opacity:1}14%{opacity:0;transform:translate(520px,210px) rotate(22deg)}100%{opacity:0}}
 #hdApp{display:flex;flex-direction:column;min-height:calc(100dvh - 28px)}
 #hdApp>*{position:relative}
 #hdApp{padding-top:20px}
 .hdback{padding:8px 14px;border-radius:14px;border:1px solid rgba(255,255,255,.28);background:rgba(255,255,255,.1);color:#fff;font-weight:800;font-size:14px;cursor:pointer}
 .hdmid{flex:1;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center}
 .hdbot{padding-top:18px}
 #hdApp .picker-title{color:#9fe8ff;letter-spacing:4px;font-weight:900;text-shadow:0 0 14px #3db0ff}
 #hdApp .picker-sub{opacity:.75}
 .hdbig{font-size:88px;line-height:1;font-weight:900;font-variant-numeric:tabular-nums;margin-top:6px;color:#e8f8ff;text-shadow:0 0 18px rgba(61,176,255,.9)}
 #hdMsg{min-height:34px;font-size:16px;font-weight:800;margin-top:4px;color:#c8ff3d;text-shadow:0 0 14px #c8ff3d;letter-spacing:1px}
 #hdBot{font-size:13px;font-weight:800;opacity:.9;min-height:18px;margin-top:2px;color:#ffb24d}
 .hdcard{margin-top:12px;border-radius:24px;padding:14px;text-align:left;border:2px solid var(--c,#9fe8ff);background:linear-gradient(135deg,color-mix(in srgb,var(--c,#9fe8ff) 22%,transparent),rgba(255,255,255,.04));box-shadow:0 0 22px color-mix(in srgb,var(--c,#9fe8ff) 38%,transparent),inset 0 0 24px rgba(255,255,255,.04)}
 .hdcT{display:flex;gap:12px;align-items:center}
 .hdcard .ic{flex:none;width:56px;height:56px;border-radius:18px;display:flex;align-items:center;justify-content:center;font-size:30px;background:rgba(0,0,0,.28);border:2px solid var(--c,#9fe8ff);box-shadow:0 0 18px var(--c,#9fe8ff)}
 .hdcard .tx{flex:1;min-width:0}.hdcard h3{margin:0;font-size:18px;font-weight:900;letter-spacing:1.5px;text-transform:uppercase;text-shadow:0 0 12px var(--c,#9fe8ff)}.hdcard p{margin:3px 0 0;font-size:12.5px;opacity:.78;line-height:1.3}
 .hdbest{flex:none;text-align:center;font-size:10px;font-weight:900;letter-spacing:1.5px;opacity:.9}.hdbest b{display:block;font-size:24px;letter-spacing:0;color:var(--c,#9fe8ff);text-shadow:0 0 12px var(--c,#9fe8ff)}
 .hdcB{display:flex;gap:10px;margin-top:12px}
 .hdcard button{flex:1;padding:13px 6px;border-radius:16px;border:0;font-weight:900;font-size:15px;letter-spacing:.5px;cursor:pointer}
 .hdb1{background:#c8ff3d;color:#0b0f1a;box-shadow:0 0 18px rgba(200,255,61,.55)}.hdb2{background:linear-gradient(135deg,#ff8a4d,#ff4d9a);color:#fff;box-shadow:0 0 18px rgba(255,77,154,.5)}
 .hdrow{display:flex;gap:8px;align-items:center;padding:6px 0;border-bottom:1px solid rgba(255,255,255,.08);font-size:14px;text-align:left}.hdrow b{width:24px;text-align:center}.hdrow span{flex:1}
 .hdpad{height:20vh;border-radius:30px;transition:all .1s;box-shadow:0 0 14px currentColor}.hdpad.on{filter:brightness(2.4) saturate(1.2);transform:scale(.97);box-shadow:0 0 56px currentColor,inset 0 0 34px rgba(255,255,255,.45);border-color:#fff!important}
 .hdlvl{display:flex;gap:6px;margin-top:8px}.hdlvl button{flex:1;padding:8px 0;border-radius:12px;border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.06);color:inherit;font-weight:800}.hdlvl button.on{background:linear-gradient(135deg,#ff8a4d,#ff4d9a);color:#fff;border-color:transparent;box-shadow:0 0 16px rgba(255,77,154,.55)}
 .hdcard{border:1px solid rgba(255,255,255,.14);border-left:4px solid var(--c);background:rgba(255,255,255,.06);box-shadow:none;border-radius:20px}
 .hdcard .ic{border:0;box-shadow:none;background:color-mix(in srgb,var(--c) 22%,transparent);color:var(--c)}
 .hdcard h3{text-shadow:none;letter-spacing:1px;font-size:17px}.hdbest b{text-shadow:none}
 .hdb1{background:#d7f27a;box-shadow:none}.hdb2{background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.28)!important;box-shadow:none;color:#fff}
 .hdlvl button.on{background:rgba(255,255,255,.2);box-shadow:none;color:#fff;border:1px solid rgba(255,255,255,.5)}
</style>`;
const hud = { score(n){ const e = $('hdSc'); if(e) e.textContent = fmt(n); }, msg(t){ const e = $('hdMsg'); if(e) e.textContent = t || ' '; } };
/* ---------- die fünf Spiele: run(host, hud, end) -> stop() ; end(score) genau einmal bei Fehler ---------- */
const G = {};
G.balken = { name: 'Der Balken', icon: '📏', hint: ['Tippe, wenn die Kugel in der Zone ist.', 'Tap when the ball is in the zone.'], pace: 1.5, rng: [5, 14],
 run(host, hud, end){
  host.innerHTML = '<canvas id="hdC" width="360" height="300" style="display:block;margin:0 auto;max-width:100%;height:auto"></canvas>'; const c = $('hdC'), x = c.getContext('2d');
  let lvl = 0, pos = 20, dir = 1, zone = 0, zw = 120, fl = 0, trl = [], over = false, raf = 0, last = performance.now(); const W = 340, X0 = 10;
  const newZ = () => { zw = Math.max(44, 150 * Math.pow(.95, lvl)); zone = X0 + zw / 2 + Math.random() * (W - zw); }; newZ();
  const spd = () => Math.min(400, 140 + lvl * 16);
  function tap(){ if(over) return; if(Math.abs(pos - zone) <= zw / 2){ lvl++; fl = 1; hud.score(lvl); newZ(); } else { over = true; hud.msg(L('Knapp daneben.', 'So close.')); setTimeout(() => end(lvl), 900); } }
  function loop(t){ const dt = Math.min(.05, (t - last) / 1000); last = t; if(!over){ pos += dir * spd() * dt; if(pos > X0 + W - 10){ pos = X0 + W - 10; dir = -1; } if(pos < X0 + 10){ pos = X0 + 10; dir = 1; } }
   x.clearRect(0, 0, 360, 300);
   // Bahn: Glas-Balken mit Rand und Markierungen
   const tg = x.createLinearGradient(0, 105, 0, 195); tg.addColorStop(0, 'rgba(255,255,255,.12)'); tg.addColorStop(1, 'rgba(255,255,255,.04)'); x.fillStyle = tg; x.beginPath(); x.roundRect(X0, 105, W, 90, 45); x.fill(); x.save(); x.shadowColor = '#3db0ff'; x.shadowBlur = SB(26); x.strokeStyle = 'rgba(159,232,255,.9)'; x.lineWidth = 3; x.stroke(); x.restore();
   x.fillStyle = 'rgba(255,255,255,.08)'; for(let k = 1; k < 17; k++){ x.fillRect(X0 + k * W / 17 - 1, 112, 2, 10); x.fillRect(X0 + k * W / 17 - 1, 178, 2, 10); }
   // Zone: leuchtend, halbtransparent
   const zc = over ? '255,77,106' : '200,255,61', za = .6 + .35 * fl; x.save(); x.shadowColor = 'rgb(' + zc + ')'; x.shadowBlur = SB(22 + 20 * fl); const zg = x.createLinearGradient(0, 105, 0, 195); zg.addColorStop(0, 'rgba(' + zc + ',' + za + ')'); zg.addColorStop(1, 'rgba(' + zc + ',' + (za * .55) + ')'); x.fillStyle = zg; x.beginPath(); x.roundRect(zone - zw / 2, 110, zw, 80, 18); x.fill(); x.restore();
   x.strokeStyle = 'rgba(' + zc + ',.95)'; x.lineWidth = 3; x.beginPath(); x.roundRect(zone - zw / 2, 110, zw, 80, 18); x.stroke(); fl = Math.max(0, fl - dt * 3);
   // Kugel mit Schweif
   trl.unshift(pos); trl.length = Math.min(trl.length, 9); trl.forEach((p, k) => { x.globalAlpha = (1 - k / 9) * .3; x.fillStyle = '#9fe8ff'; x.beginPath(); x.arc(p, 150, 20 - k * 1.5, 0, 7); x.fill(); }); x.globalAlpha = 1;
   x.save(); x.shadowColor = '#9fe8ff'; x.shadowBlur = SB(26); const bg = x.createRadialGradient(pos - 5, 144, 2, pos, 150, 22); bg.addColorStop(0, '#fff'); bg.addColorStop(1, '#bfeaff'); x.fillStyle = bg; x.beginPath(); x.arc(pos, 150, 21, 0, 7); x.fill(); x.restore();
   raf = requestAnimationFrame(loop); }
  raf = requestAnimationFrame(loop); host.onpointerdown = tap; return () => { over = true; cancelAnimationFrame(raf); host.onpointerdown = null; };
 } };
G.turm = { name: 'Der Turm', icon: '🧱', hint: ['Lass den Block fallen. Was überhängt, fällt ab.', 'Drop the block. Overhang falls off.'], pace: 1.7, rng: [7, 20],
 run(host, hud, end){
  host.innerHTML = '<canvas id="hdC" width="360" height="400" style="display:block;margin:0 auto;max-width:100%;height:auto"></canvas>'; const c = $('hdC'), x = c.getContext('2d');
  let stack = [{ x: 80, w: 200 }], cur = { x: 0, w: 200 }, dir = 1, lvl = 0, off = 0, over = false, raf = 0, last = performance.now(), cuts = [];
  const H = 46, spd = () => Math.min(330, 150 + lvl * 6);
  function drop(){ if(over) return; const t = stack[stack.length - 1], l = Math.max(cur.x, t.x), r = Math.min(cur.x + cur.w, t.x + t.w);
   if(r - l <= 2){ over = true; hud.msg(L('Daneben.', 'Missed.')); setTimeout(() => end(lvl), 900); return; }
   cuts.push({ x: cur.x < t.x ? cur.x : r, w: cur.w - (r - l), y: stack.length, t: performance.now() });
   if(Math.abs(cur.x - t.x) < 7 && Math.abs(cur.w - t.w) < 7){ const nw = Math.min(240, t.w + 16); cur.x = Math.max(0, Math.min(360 - nw, t.x - (nw - t.w) / 2)); cur.w = nw; hud.msg(L('PERFEKT! Der Block wächst.', 'PERFECT! The block grows.')); } else { cur.x = l; cur.w = r - l; hud.msg(' '); }
   stack.push({ x: cur.x, w: cur.w }); lvl++; hud.score(lvl); cur = { x: 0, w: cur.w }; dir = 1; }
  function loop(t){ const dt = Math.min(.05, (t - last) / 1000); last = t; if(!over){ cur.x += dir * spd() * dt; if(cur.x + cur.w > 360){ cur.x = 360 - cur.w; dir = -1; } if(cur.x < 0){ cur.x = 0; dir = 1; } }
   const target = Math.max(0, (stack.length - 6) * H); off += (target - off) * Math.min(1, dt * 6); x.clearRect(0, 0, 360, 400); const base = 380 + off;
   const blk = (bx, by, bw, hue, a) => { const D = 12, hh = H - 4, c1 = 'hsl(' + hue + ',90%,60%)', c2 = 'hsl(' + hue + ',80%,38%)', hl = 'hsl(' + hue + ',95%,78%)'; x.save(); x.globalAlpha = a; x.shadowColor = 'hsl(' + hue + ',100%,60%)'; x.shadowBlur = SB(14); const g2 = x.createLinearGradient(0, by, 0, by + hh); g2.addColorStop(0, c1); g2.addColorStop(1, c2); x.fillStyle = g2; x.beginPath(); x.roundRect(bx, by, bw, hh, 7); x.fill(); x.shadowBlur = 0; x.fillStyle = hl; x.globalAlpha = a * .9; x.beginPath(); x.moveTo(bx + 6, by); x.lineTo(bx + bw - 6, by); x.lineTo(bx + bw - 6 + D, by - D); x.lineTo(bx + 6 + D, by - D); x.closePath(); x.fill(); x.fillStyle = 'rgba(0,0,0,.35)'; x.beginPath(); x.moveTo(bx + bw, by + 6); x.lineTo(bx + bw + D, by - D + 6); x.lineTo(bx + bw + D, by + hh - D); x.lineTo(bx + bw, by + hh); x.closePath(); x.fill(); x.fillStyle = 'rgba(255,255,255,.3)'; x.globalAlpha = a; x.beginPath(); x.roundRect(bx + 7, by + 5, Math.max(0, bw - 14), 5, 3); x.fill(); x.restore(); };
   x.fillStyle = 'rgba(255,255,255,.06)'; x.fillRect(0, base, 360, 40);
   const tp = stack[stack.length - 1]; if(!over && tp){ x.strokeStyle = 'rgba(255,255,255,.22)'; x.setLineDash([5, 6]); x.lineWidth = 2; x.beginPath(); x.moveTo(tp.x, 0); x.lineTo(tp.x, base - stack.length * H); x.moveTo(tp.x + tp.w, 0); x.lineTo(tp.x + tp.w, base - stack.length * H); x.stroke(); x.setLineDash([]); }
   stack.forEach((b, i) => blk(b.x, base - (i + 1) * H, b.w, (200 + i * 9) % 360, 1));
   if(!over){ x.save(); x.shadowColor = '#fff'; x.shadowBlur = SB(18); x.fillStyle = '#fff'; x.beginPath(); x.roundRect(cur.x, base - stack.length * H, cur.w, H - 4, 7); x.fill(); x.restore(); }
   cuts = cuts.filter(k => t - k.t < 700); cuts.forEach(k => { const a = (t - k.t) / 700; blk(k.x, base - (k.y + 1) * H + a * 140, k.w, (200 + k.y * 9) % 360, 1 - a); }); raf = requestAnimationFrame(loop); }
  raf = requestAnimationFrame(loop); host.onpointerdown = drop; return () => { over = true; cancelAnimationFrame(raf); host.onpointerdown = null; };
 } };
G.gedaechtnis = { name: 'Das Gedächtnis', icon: '🧠', hint: ['Merke dir die Folge und tippe sie nach.', 'Memorize the sequence and repeat it.'], pace: 3.4, rng: [4, 11],
 run(host, hud, end){
  const cols = ['#ff4d6a', '#3db0ff', '#c8ff3d', '#ffc83d']; let seq = [], inp = 0, state = 'show', lvl = 0, dead = false;
  host.innerHTML = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;max-width:340px;margin:20px auto 0">' + cols.map((cl, i) => `<div class="hdpad" id="hdp${i}" style="background:linear-gradient(${cl}88,${cl}22);border:3px solid ${cl}bb;color:${cl}"></div>`).join('') + '</div>';
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
  const norm = v => { v %= Math.PI * 2; return v < 0 ? v + Math.PI * 2 : v; }; const newT = () => { w = .52; tg = a + 1.3 + Math.random() * 3.4; }; newT();
  const spd = () => Math.min(5.6, 1.3 + lvl * .14);
  function tap(){ if(over) return; let d = Math.abs(norm(a) - norm(tg)); d = Math.min(d, Math.PI * 2 - d); if(d <= w / 2){ lvl++; fl = 1; hud.score(lvl); if(lvl >= 6 && lvl % 3 === 0) dir *= -1; newT(); } else { over = true; hud.msg(L('Knapp daneben.', 'So close.')); setTimeout(() => end(lvl), 900); } }
  const CX = 180, CY = 165, R = 115;
  function loop(t){ const dt = Math.min(.05, (t - last) / 1000); last = t; if(!over) a += dir * spd() * dt;
   x.clearRect(0, 0, 360, 330); x.lineCap = 'round';
   x.lineWidth = 26; x.strokeStyle = 'rgba(159,232,255,.14)'; x.beginPath(); x.arc(CX, CY, R, 0, 7); x.stroke();
   x.strokeStyle = 'rgba(255,255,255,.3)'; x.lineWidth = 2; x.beginPath(); x.arc(CX, CY, R + 20, 0, 7); x.stroke(); x.beginPath(); x.arc(CX, CY, R - 20, 0, 7); x.stroke();
   const zc = over ? '#ff4d6a' : '#c8ff3d'; x.save(); x.shadowColor = zc; x.shadowBlur = SB(24 + 20 * fl); x.strokeStyle = zc; x.lineWidth = 26; x.beginPath(); x.arc(CX, CY, R, tg - w / 2, tg + w / 2); x.stroke(); x.restore(); fl = Math.max(0, fl - dt * 3);
   const px = CX + (R + 4) * Math.cos(a), py = CY + (R + 4) * Math.sin(a);
   x.save(); x.shadowColor = '#9fe8ff'; x.shadowBlur = SB(24); x.strokeStyle = '#fff'; x.lineWidth = 6; x.beginPath(); x.moveTo(CX, CY); x.lineTo(px, py); x.stroke(); x.fillStyle = '#fff'; x.beginPath(); x.arc(px, py, 13, 0, 7); x.fill(); x.fillStyle = '#9fe8ff'; x.beginPath(); x.arc(CX, CY, 14, 0, 7); x.fill(); x.restore();
   raf = requestAnimationFrame(loop); }
  raf = requestAnimationFrame(loop); host.onpointerdown = tap; return () => { over = true; cancelAnimationFrame(raf); host.onpointerdown = null; };
 } };
G.gegenteil = { name: 'Das Gegenteil', icon: '🔄', hint: ['Roter Pfeil: gegen die Richtung wischen. Grüner Pfeil: mit der Richtung.', 'Red arrow: swipe against it. Green arrow: swipe with it.'], pace: 1.5, rng: [6, 17],
 run(host, hud, end){
  const A = ['⬆', '➡', '⬇', '⬅']; let cur = 0, lvl = 0, rule = 0, pc = -1, t0 = 0, lim = 2000, over = false, timer = null, iv = null, sx = 0, sy = 0;
  host.innerHTML = '<div id="hdRule" style="font-size:13px;font-weight:800;color:#ffb24d;min-height:18px"></div><div id="hdArr" style="width:170px;height:170px;margin:10px auto 0;color:#ff4d6a;filter:drop-shadow(0 0 26px currentColor);transition:transform .08s"><svg viewBox="0 0 100 100" width="100%" height="100%"><path d="M50 4 L94 52 H67 V96 H33 V52 H6 Z" fill="currentColor"/><path d="M50 12 L82 46 H50 Z" fill="rgba(255,255,255,.3)"/></svg></div><div style="width:300px;height:14px;background:rgba(255,255,255,.1);border-radius:7px;margin:16px auto 0"><div id="hdTb" style="height:100%;width:100%;background:#c8ff3d;border-radius:7px;box-shadow:0 0 16px #c8ff3d"></div></div>';
  const limit = () => Math.max(1100, 2800 - lvl * 50);
  function show(){ cur = Math.floor(Math.random() * 4); rule = Math.random() < .5 ? 0 : 1; const ar = $('hdArr'); ar.style.transform = 'rotate(' + cur * 90 + 'deg)'; ar.style.opacity = '1'; ar.style.color = rule ? '#3dff7a' : '#ff4d6a'; t0 = performance.now(); lim = limit() + (pc >= 0 && pc !== rule ? 350 : 0); pc = rule; clearTimeout(timer); timer = setTimeout(() => lose(L('Zu langsam.', 'Too slow.')), lim); }
  function lose(m){ if(over) return; over = true; clearTimeout(timer); hud.msg(m); const a = $('hdArr'); if(a) a.style.opacity = '.4'; setTimeout(() => end(lvl), 900); }
  function swipe(d){ if(over) return; const want = rule === 0 ? (cur + 2) % 4 : cur; if(d === want){ lvl++; hud.score(lvl); show(); } else lose(rule === 0 ? L('Rot heißt: dagegen.', 'Red means: against.') : L('Grün heißt: mit dem Pfeil.', 'Green means: with the arrow.')); }
  host.onpointerdown = e => { sx = e.clientX; sy = e.clientY; }; host.onpointerup = e => { const dx = e.clientX - sx, dy = e.clientY - sy; if(Math.hypot(dx, dy) < 30) return; swipe(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 3) : (dy > 0 ? 2 : 0)); };
  iv = setInterval(() => { const b = $('hdTb'); if(b && !over) b.style.width = Math.max(0, 100 - (performance.now() - t0) / lim * 100) + '%'; }, 40);
  hud.msg(L('Rot = dagegen, Grün = mit dem Pfeil.', 'Red = against, green = with the arrow.')); show();
  return () => { over = true; clearTimeout(timer); clearInterval(iv); host.onpointerdown = null; host.onpointerup = null; };
 } };
G.flug = { name: 'Der Farbflug', icon: '🚀', hint: ['Fliege durch die Farbe, die oben steht. Links oder rechts tippen.', 'Fly through the color shown on top. Tap left or right.'], pace: 1.6, rng: [5, 16],
 run(host, hud, end){
  host.innerHTML = '<div id="hdTgt" style="height:44px;margin:0 auto 6px"></div><canvas id="hdC" width="360" height="540" style="display:block;margin:0 auto;max-width:100%;height:auto"></canvas>'; const c = $('hdC'), x = c.getContext('2d'); let lastTg = '';
  const CL = { R: '#ff4d6a', G: '#3dff7a', B: '#3db0ff', Y: '#ffc83d' }, WALLS = {}, NM = { R: L('ROT', 'RED'), G: L('GRÜN', 'GREEN'), B: L('BLAU', 'BLUE'), Y: L('GELB', 'YELLOW') }, K = Object.keys(CL), LX = [105, 255], BY = 380, GAP = 240;
  let bx = 105, dest = 0, lvl = 0, over = false, gates = [], trail = [], raf = 0, last = performance.now(), sl = 0;
  const addG = y => { const a = K[Math.floor(Math.random() * 4)]; let b; do { b = K[Math.floor(Math.random() * 4)]; } while(b === a); gates.push({ y, cols: [a, b], t: Math.random() < .5 ? 0 : 1, done: false }); };
  for(let i = 0; i < 4; i++) addG(150 - i * GAP);
  const spd = () => Math.min(400, 190 + lvl * 9), cur = () => gates.filter(g => !g.done).sort((a, b) => b.y - a.y)[0];
  const go = d => { if(!over) dest = d; };
  const rr = (a, b, w, h, r) => { x.beginPath(); x.roundRect(a, b, w, h, r); };
  function loop(t){ const dt = Math.min(.05, (t - last) / 1000); last = t; x.clearRect(0, 0, 360, 540); const g = cur();
   // Mauern: Verlauf von der Kante nach innen
   [0, 1].forEach(l => { const wk = (g ? g.cols[l] : '0') + l; let wc = WALLS[wk]; if(!wc){ const col = g ? CL[g.cols[l]] : '#556'; wc = WALLS[wk] = document.createElement('canvas'); wc.width = 70; wc.height = 540; const wx = wc.getContext('2d'); const gr = wx.createLinearGradient(l ? 70 : 0, 0, l ? 0 : 70, 0); gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(0,0,0,0)'); wx.fillStyle = gr; wx.fillRect(0, 0, 70, 540); wx.globalCompositeOperation = 'destination-in'; const vg = wx.createLinearGradient(0, 0, 0, 540); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(.12, 'rgba(0,0,0,1)'); vg.addColorStop(.72, 'rgba(0,0,0,1)'); vg.addColorStop(.82, 'rgba(0,0,0,0)'); wx.fillStyle = vg; wx.fillRect(0, 0, 70, 540); } x.globalAlpha = .5; x.drawImage(wc, l ? 290 : 0, 0); x.globalAlpha = 1; });
   // Tempo-Linien
   sl = (sl + spd() * dt) % 60; x.fillStyle = 'rgba(255,255,255,.07)'; for(let k = -1; k < 8; k++){ x.fillRect(178, k * 60 + sl, 4, 26); }
   if(g){ const tc = CL[g.cols[g.t]], tx = L('DURCH: ', 'THROUGH: ') + NM[g.cols[g.t]]; if(tx !== lastTg){ lastTg = tx; const e = $('hdTgt'); if(e) e.innerHTML = '<span style="display:inline-block;padding:7px 26px;border-radius:24px;background:' + tc + ';color:#0a0e1a;font-weight:900;font-size:22px;letter-spacing:1px;box-shadow:0 0 18px ' + tc + '">' + tx + '</span>'; } }
   if(!over){ gates.forEach(q => q.y += spd() * dt); bx += (LX[dest] - bx) * Math.min(1, dt * 7); trail.unshift({ x: bx, y: BY }); trail.forEach(p => p.y += spd() * dt * .9); trail = trail.filter(p => p.y < BY + 140).slice(0, 18);
    if(g && g.y >= BY - 10 && g.y <= BY + 44 && !g.done){ g.done = true; const lane = Math.abs(bx - LX[0]) < Math.abs(bx - LX[1]) ? 0 : 1; if(lane === g.t){ lvl++; hud.score(lvl); } else { over = true; hud.msg(L('Falsche Farbe.', 'Wrong color.')); setTimeout(() => end(lvl), 900); } }
    gates = gates.filter(q => q.y < 620); if(gates.length < 5) addG(Math.min.apply(null, gates.map(q => q.y)) - GAP); }
   // Felder: leuchtend, halbtransparent, mit Farbnamen
   gates.forEach(q => [0, 1].forEach(l => { const col = CL[q.cols[l]], a = l ? 190 : 28; x.save(); x.globalAlpha = q.done ? .22 : .8; x.shadowColor = col; x.shadowBlur = SB(q.done ? 0 : 26); const gr = x.createLinearGradient(0, q.y - 28, 0, q.y + 28); gr.addColorStop(0, col); gr.addColorStop(1, col + '88'); x.fillStyle = gr; rr(a, q.y - 28, 142, 56, 16); x.fill(); x.restore(); if(!q.done){ x.fillStyle = 'rgba(8,12,24,.75)'; x.font = '900 18px system-ui'; x.textAlign = 'center'; x.fillText(NM[q.cols[l]], a + 71, q.y + 6); } }));
   // Schweif + Kugel
   trail.forEach((p, k) => { x.globalAlpha = (1 - k / trail.length) * .35; x.fillStyle = over ? '#ff4d6a' : '#9fe8ff'; x.beginPath(); x.arc(p.x, p.y + k * 5, 18 - k * .8, 0, 7); x.fill(); }); x.globalAlpha = 1;
   x.fillStyle = over ? '#ff4d6a' : '#fff'; x.shadowColor = over ? '#ff4d6a' : '#9fe8ff'; x.shadowBlur = SB(28); x.beginPath(); x.arc(bx, BY, 21, 0, 7); x.fill(); x.shadowBlur = 0;
   // Knoepfe: grosse Glas-Flaechen, dicke Pfeile
   [0, 1].forEach(l => { const a = l ? 188 : 12, gr = x.createLinearGradient(0, 440, 0, 530); gr.addColorStop(0, 'rgba(255,255,255,.16)'); gr.addColorStop(1, 'rgba(255,255,255,.05)'); x.fillStyle = gr; rr(a, 440, 160, 90, 22); x.fill(); x.strokeStyle = dest === l ? 'rgba(159,232,255,.9)' : 'rgba(255,255,255,.25)'; x.lineWidth = 3; x.stroke();
    const cx = a + 80, d = l ? 1 : -1; x.strokeStyle = '#fff'; x.lineWidth = 14; x.lineCap = 'round'; x.lineJoin = 'round'; x.beginPath(); x.moveTo(cx - d * 14, 460); x.lineTo(cx + d * 14, 485); x.lineTo(cx - d * 14, 510); x.stroke(); });
   raf = requestAnimationFrame(loop); }
  raf = requestAnimationFrame(loop);
  host.onpointerdown = e => { const r = (document.documentElement.clientWidth || window.innerWidth) / 2; go(e.clientX < r ? 0 : 1); };
  return () => { over = true; cancelAnimationFrame(raf); host.onpointerdown = null; };
 } };

/* ---------- neue Spiele: Blasen, Puls, Farbe, Tasten ---------- */
G.blasen = { name: 'Die Blasen', icon: '', hint: ['Tippe die Blasen, bevor sie platzen. Bis zu fünf gleichzeitig.', 'Pop the bubbles before they burst. Up to five at once.'], pace: 1.1, rng: [10, 34],
 run(host, hud, end){
  host.innerHTML = '<canvas id="hdC" width="360" height="540" style="display:block;margin:0 auto;max-width:100%;height:auto"></canvas>'; const c = $('hdC'), x = c.getContext('2d');
  const COL = ['#ff4d6a', '#3db0ff', '#c8ff3d', '#ffc83d', '#b36bff'];
  let lvl = 0, over = false, raf = 0, last = performance.now(), bubs = [], parts = [], nextSp = 400, clock = 0;
  const maxN = () => Math.min(5, 1 + Math.floor(lvl / 6)), life = () => Math.max(1000, 2600 - lvl * 55);
  function spawn(){ for(let tr = 0; tr < 30; tr++){ const r = 34 + Math.random() * 14, px = r + 8 + Math.random() * (360 - 2 * r - 16), py = r + 10 + Math.random() * (540 - 2 * r - 20); if(bubs.every(b => Math.hypot(b.x - px, b.y - py) > b.r + r + 8)){ bubs.push({ x: px, y: py, r, c: COL[Math.floor(Math.random() * 5)], t0: clock, life: life() }); return; } } }
  function pop(b){ for(let k = 0; k < 14; k++){ const a = Math.random() * 7, v = 80 + Math.random() * 160; parts.push({ x: b.x, y: b.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 0, c: b.c }); } }
  host.onpointerdown = e => { if(over) return; const rc = c.getBoundingClientRect(), px = (e.clientX - rc.left) * (360 / rc.width), py = (e.clientY - rc.top) * (540 / rc.height);
    for(let i = bubs.length - 1; i >= 0; i--){ const b = bubs[i]; if(Math.hypot(b.x - px, b.y - py) <= b.r + 14){ pop(b); bubs.splice(i, 1); lvl++; hud.score(lvl); return; } } };
  function loop(t){ const dt = Math.min(.05, (t - last) / 1000); last = t; clock += dt * 1000;
   if(!over){ nextSp -= dt * 1000; if(bubs.length < maxN() && nextSp <= 0){ spawn(); nextSp = 200 + Math.random() * 280; }
    for(const b of bubs){ if(clock - b.t0 > b.life){ over = true; b.bad = true; hud.msg(L('Geplatzt.', 'Burst.')); setTimeout(() => end(lvl), 900); break; } } }
   x.clearRect(0, 0, 360, 540);
   for(const b of bubs){ const age = clock - b.t0, sc = Math.min(1, age / 140), r = b.r * (.5 + .5 * sc), rem = Math.max(0, 1 - age / b.life), col = b.bad ? '#ff4d6a' : b.c;
    x.save(); x.globalAlpha = Math.min(1, sc * 1.4); x.shadowColor = col; x.shadowBlur = SB(18);
    const g = x.createRadialGradient(b.x, b.y + r * .1, r * .1, b.x, b.y, r); g.addColorStop(0, col + '33'); g.addColorStop(.75, col + 'aa'); g.addColorStop(1, col); x.fillStyle = g; x.beginPath(); x.arc(b.x, b.y, r, 0, 7); x.fill(); x.shadowBlur = 0;
    x.strokeStyle = 'rgba(255,255,255,.55)'; x.lineWidth = 2; x.stroke(); x.fillStyle = 'rgba(255,255,255,.75)'; x.beginPath(); x.ellipse(b.x - r * .36, b.y - r * .4, r * .22, r * .12, -.6, 0, 7); x.fill();
    x.strokeStyle = '#fff'; x.lineWidth = 4; x.lineCap = 'round'; x.beginPath(); x.arc(b.x, b.y, r + 7, -Math.PI / 2, -Math.PI / 2 + rem * Math.PI * 2); x.stroke(); x.restore(); }
   parts = parts.filter(p => p.t < .5); parts.forEach(p => { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; x.globalAlpha = 1 - p.t / .5; x.fillStyle = p.c; x.beginPath(); x.arc(p.x, p.y, 4, 0, 7); x.fill(); }); x.globalAlpha = 1;
   raf = requestAnimationFrame(loop); }
  raf = requestAnimationFrame(loop); return () => { over = true; cancelAnimationFrame(raf); host.onpointerdown = null; };
 } };

G.puls = { name: 'Der Puls', icon: '', hint: ['Tippe, wenn die Kugel genau die Form füllt. Nur 100 % zählt.', 'Tap when the ball exactly fills the shape. Only 100% counts.'], pace: 2.3, rng: [3, 10],
 run(host, hud, end){
  host.innerHTML = '<canvas id="hdC" width="360" height="440" style="display:block;margin:0 auto;max-width:100%;height:auto"></canvas>'; const c = $('hdC'), x = c.getContext('2d');
  const CX = 180, CY = 210, R0 = 78, LO = .25, HI = 1.2, SH = ['circle', 'square', 'triangle', 'hex', 'star', 'heart'];
  let lvl = 0, ph = 0, over = false, raf = 0, last = performance.now(), order = SH.slice().sort(() => Math.random() - .5), oi = 0, fl = 0, shown = '', shownT = 0, bad = false;
  const per = () => Math.max(.95, 2.5 - lvl * .07), tol = () => Math.max(.012, .035 - lvl * .0015), sc = () => LO + (HI - LO) * (.5 - .5 * Math.cos(ph * Math.PI * 2));
  function path(sh, r){ x.beginPath();
   if(sh === 'circle') x.arc(CX, CY, r, 0, 7);
   else if(sh === 'square') x.roundRect(CX - r, CY - r, 2 * r, 2 * r, r * .18);
   else if(sh === 'triangle'){ x.moveTo(CX, CY - r * 1.1); x.lineTo(CX + r * 1.0, CY + r * .75); x.lineTo(CX - r * 1.0, CY + r * .75); x.closePath(); }
   else if(sh === 'hex'){ for(let k = 0; k < 6; k++){ const a = Math.PI / 6 + k * Math.PI / 3; x[k ? 'lineTo' : 'moveTo'](CX + r * Math.cos(a), CY + r * Math.sin(a)); } x.closePath(); }
   else if(sh === 'star'){ for(let k = 0; k < 10; k++){ const a = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? r * .46 : r * 1.05; x[k ? 'lineTo' : 'moveTo'](CX + rr * Math.cos(a), CY + rr * Math.sin(a)); } x.closePath(); }
   else { for(let k = 0; k <= 60; k++){ const a = k / 60 * Math.PI * 2, px = 16 * Math.pow(Math.sin(a), 3), py = -(13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)); x[k ? 'lineTo' : 'moveTo'](CX + px * r / 15.5, CY + 1 + py * r / 15.5); } x.closePath(); } }
  host.onpointerdown = () => { if(over) return; const s = sc(), ok = Math.abs(s - 1) <= tol();
   if(ok){ lvl++; hud.score(lvl); fl = 1; shown = '100%'; shownT = 700; bad = false; oi = (oi + 1) % order.length; ph = 0; hud.msg(L('100 %!', '100%!')); }
   else { over = true; bad = true; const pc = Math.round(s * 100); shown = pc + '%'; shownT = 9999; hud.msg(L('Nicht genau genug: ', 'Not exact: ') + pc + ' %'); setTimeout(() => end(lvl, Math.max(0, Math.min(100, pc > 100 ? 200 - pc : pc))), 1100); } };
  function loop(t){ const dt = Math.min(.05, (t - last) / 1000); last = t; if(!over) ph = (ph + dt / per()) % 1; shownT -= dt * 1000; fl = Math.max(0, fl - dt * 3);
   x.clearRect(0, 0, 360, 440); const sh = order[oi], s = sc();
   x.save(); x.strokeStyle = 'rgba(255,255,255,.14)'; x.lineWidth = 2; x.setLineDash([6, 8]); path(sh, R0 * HI); x.stroke(); x.restore();
   x.save(); const zc = bad ? '#ff4d6a' : '#c8ff3d'; x.shadowColor = zc; x.shadowBlur = SB(24 + 20 * fl); x.strokeStyle = zc; x.lineWidth = 6; path(sh, R0); x.stroke(); x.restore();
   x.save(); x.shadowColor = '#9fe8ff'; x.shadowBlur = SB(30); const g = x.createRadialGradient(CX - R0 * s * .3, CY - R0 * s * .3, 4, CX, CY, Math.max(8, R0 * s * 1.2)); g.addColorStop(0, '#fff'); g.addColorStop(1, '#3db0ff'); x.fillStyle = g; x.globalAlpha = .9; path(sh, R0 * s); x.fill(); x.restore();
   if(shownT > 0){ x.font = '900 50px system-ui'; x.textAlign = 'center'; x.fillStyle = bad ? '#ff4d6a' : '#c8ff3d'; x.fillText(shown, CX, 410); }
   raf = requestAnimationFrame(loop); }
  raf = requestAnimationFrame(loop); return () => { over = true; cancelAnimationFrame(raf); host.onpointerdown = null; };
 } };

G.farbe = { name: 'Die Farbe', icon: '', hint: ['Mische die Zielfarbe nach. Nur 100 % zählt.', 'Mix the target color. Only 100% counts.'], pace: 5, rng: [2, 7],
 run(host, hud, end){
  const BASE = [['Rot', 'Red', [230, 40, 60]], ['Gelb', 'Yellow', [250, 205, 40]], ['Blau', 'Blue', [50, 110, 235]], ['Weiß', 'White', [255, 255, 255]], ['Schwarz', 'Black', [15, 15, 20]]];
  let lvl = 0, over = false, target = [0, 0, 0];
  const mix = ws => { const s = ws.reduce((a, b) => a + b, 0); if(!s) return [20, 20, 28]; const o = [0, 0, 0]; ws.forEach((w, i) => { for(let k = 0; k < 3; k++) o[k] += BASE[i][2][k] * w / s; }); return o; };
  const css = a => 'rgb(' + a.map(v => Math.round(v)).join(',') + ')', dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]), tol = () => Math.max(5, 14 - lvl * .5);
  function newTarget(){ const n = 2 + (lvl > 4 ? 1 : 0) + (lvl > 10 ? 1 : 0), idx = BASE.map((_, i) => i).sort(() => Math.random() - .5).slice(0, n), ws = [0, 0, 0, 0, 0]; idx.forEach(i => ws[i] = (1 + Math.floor(Math.random() * 5)) * 10); target = mix(ws); }
  host.innerHTML = '<div style="display:flex;gap:12px;align-items:stretch;justify-content:center;margin:6px 8px 0"><div style="flex:1"><div style="font-size:11px;font-weight:900;letter-spacing:2px;opacity:.8">' + L('DEINE MISCHUNG', 'YOUR MIX') + '</div><div id="hdMix" style="height:96px;border-radius:20px;margin-top:6px;border:3px solid rgba(255,255,255,.3)"></div></div><div style="flex:1"><div style="font-size:11px;font-weight:900;letter-spacing:2px;opacity:.8">' + L('ZIEL', 'TARGET') + '</div><div id="hdTg" style="height:96px;border-radius:20px;margin-top:6px;border:3px solid rgba(255,255,255,.3)"></div></div></div>' +
   '<div style="margin:14px 8px 0">' + BASE.map((b, i) => '<div style="display:flex;align-items:center;gap:10px;margin-top:8px"><span style="width:64px;text-align:left;font-weight:800;font-size:13px">' + L(b[0], b[1]) + '</span><input type="range" min="0" max="100" value="0" id="hdS' + i + '" style="flex:1;height:34px;accent-color:' + css(b[2]) + '"></div>').join('') + '</div>' +
   '<button class="btn" id="hdOk" style="width:calc(100% - 16px);margin:16px 8px 0">' + L('FERTIG', 'DONE') + '</button>';
  const ws = () => BASE.map((_, i) => +$('hdS' + i).value), upd = () => { $('hdMix').style.background = css(mix(ws())); };
  const reset = () => { BASE.forEach((_, i) => $('hdS' + i).value = 0); newTarget(); $('hdTg').style.background = css(target); upd(); };
  BASE.forEach((_, i) => $('hdS' + i).oninput = upd); reset(); hud.msg(L('Mische die Farbe rechts nach.', 'Match the color on the right.'));
  $('hdOk').onclick = () => { if(over) return; const d = dist(mix(ws()), target), pc = Math.max(0, Math.round(100 - d * .35));
   if(d <= tol()){ lvl++; hud.score(lvl); hud.msg(L('100 %!', '100%!')); reset(); }
   else { over = true; hud.msg(L('Nicht genau genug: ', 'Not exact: ') + Math.min(99, pc) + ' %'); setTimeout(() => end(lvl, Math.min(99, pc)), 1100); } };
  return () => { over = true; };
 } };

G.tasten = { name: 'Die Tasten', icon: '', hint: ['Tippe die Kacheln der Reihe nach. Keine auslassen.', 'Tap the tiles in order. Do not miss any.'], pace: .7, rng: [15, 60],
 run(host, hud, end){
  host.innerHTML = '<canvas id="hdC" width="360" height="520" style="display:block;margin:0 auto;max-width:100%;height:auto"></canvas>'; const c = $('hdC'), x = c.getContext('2d');
  const MEL = [[64, 64, 65, 67, 67, 65, 64, 62, 60, 60, 62, 64, 64, 62, 62, 64, 64, 65, 67, 67, 65, 64, 62, 60, 60, 62, 64, 62, 60, 60], [60, 62, 64, 65, 67, 67, 69, 69, 69, 69, 67, 69, 69, 69, 69, 67, 65, 65, 65, 65, 64, 64, 62, 62, 62, 62, 60], [76, 75, 76, 75, 76, 71, 74, 72, 69, 60, 64, 69, 71, 64, 68, 71, 72, 64, 76, 75, 76, 75, 76, 71, 74, 72, 69]], mel = MEL[Math.floor(Math.random() * MEL.length)];
  let lvl = 0, over = false, raf = 0, last = performance.now(), tiles = [], mi = 0, flash = 0, ctxA = null; const TH = 130, W = 90;
  hdDuck(0);
  const note = m => { try{ ctxA = ctxA || (HM && HM.ctx) || new (window.AudioContext || window.webkitAudioContext)(); if(ctxA.state === 'suspended') ctxA.resume(); const f = 440 * Math.pow(2, (m - 69) / 12), o = ctxA.createOscillator(), o2 = ctxA.createOscillator(), g = ctxA.createGain(), t0 = ctxA.currentTime; o.type = 'triangle'; o2.type = 'sine'; o.frequency.value = f; o2.frequency.value = f * 2; g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(.32, t0 + .012); g.gain.exponentialRampToValueAtTime(.001, t0 + .7); o.connect(g); o2.connect(g); g.connect(ctxA.destination); o.start(t0); o2.start(t0); o.stop(t0 + .75); o2.stop(t0 + .75); }catch(e){} };
  const spd = () => Math.min(700, 250 + lvl * 9);
  const addT = y => tiles.push({ lane: Math.floor(Math.random() * 4), y, hit: false, f: 0 }); for(let i = 0; i < 5; i++) addT(250 - i * TH);
  const lose = (m) => { if(over) return; over = true; flash = 1; hud.msg(m); hdDuck(.5); setTimeout(() => end(lvl), 900); };
  host.onpointerdown = e => { if(over) return; const rc = c.getBoundingClientRect(), lane = Math.max(0, Math.min(3, Math.floor((e.clientX - rc.left) / rc.width * 4)));
   const nx = tiles.filter(t => !t.hit).sort((a, b) => b.y - a.y)[0]; if(!nx) return;
   if(nx.lane === lane && nx.y + TH > 0){ nx.hit = true; lvl++; hud.score(lvl); note(mel[mi++ % mel.length]); } else lose(L('Falsche Spur.', 'Wrong lane.')); };
  function loop(t){ const dt = Math.min(.05, (t - last) / 1000); last = t;
   if(!over){ tiles.forEach(q => q.y += spd() * dt); const nx = tiles.filter(q => !q.hit).sort((a, b) => b.y - a.y)[0]; if(nx && nx.y > 520 - 24) lose(L('Zu spät.', 'Too late.'));
    tiles = tiles.filter(q => q.y < 560); if(Math.min.apply(null, tiles.map(q => q.y)) > -TH + 6) addT(Math.min.apply(null, tiles.map(q => q.y)) - TH); }
   x.clearRect(0, 0, 360, 520); x.strokeStyle = 'rgba(255,255,255,.1)'; x.lineWidth = 1; for(let k = 1; k < 4; k++){ x.beginPath(); x.moveTo(k * W, 0); x.lineTo(k * W, 520); x.stroke(); }
   const nxt = tiles.filter(q => !q.hit).sort((a, b) => b.y - a.y)[0];
   tiles.forEach(q => { const px = q.lane * W + 5, w = W - 10; x.save(); if(q.hit){ x.globalAlpha = .35; x.fillStyle = 'rgba(100,190,255,.6)'; x.beginPath(); x.roundRect(px, q.y, w, TH - 6, 14); x.fill(); } else { const g = x.createLinearGradient(0, q.y, 0, q.y + TH); g.addColorStop(0, 'rgba(14,8,52,.95)'); g.addColorStop(1, 'rgba(36,20,96,.95)'); x.fillStyle = g; x.shadowColor = q === nxt ? '#c8ff3d' : '#3db0ff'; x.shadowBlur = SB(q === nxt ? 16 : 10); x.beginPath(); x.roundRect(px, q.y, w, TH - 6, 14); x.fill(); x.shadowBlur = 0; x.strokeStyle = q === nxt ? '#c8ff3d' : 'rgba(159,232,255,.6)'; x.lineWidth = q === nxt ? 3 : 2; x.stroke(); } x.restore(); });
   if(over){ x.fillStyle = 'rgba(255,77,106,' + (.25 * flash) + ')'; x.fillRect(0, 0, 360, 520); flash = Math.max(0, flash - dt * 2); }
   raf = requestAnimationFrame(loop); }
  raf = requestAnimationFrame(loop); return () => { over = true; cancelAnimationFrame(raf); host.onpointerdown = null; hdDuck(.5); };
 } };

const SV = p => '<svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-.14em">' + p + '</svg>';
const ICO = {
 balken: SV('<rect x="2" y="9" width="20" height="6" rx="3"/><rect x="4.5" y="10.8" width="7" height="2.4" rx="1.2" fill="currentColor" stroke="none" opacity=".55"/><circle cx="16" cy="12" r="2" fill="currentColor"/>'),
 turm: SV('<rect x="5" y="17" width="14" height="4" rx="1.2"/><rect x="7" y="11" width="10" height="4" rx="1.2"/><rect x="9" y="5" width="6" height="4" rx="1.2" fill="currentColor" opacity=".7"/>'),
 gedaechtnis: SV('<rect x="3" y="3" width="8" height="8" rx="2.5" fill="currentColor" opacity=".7"/><rect x="13" y="3" width="8" height="8" rx="2.5"/><rect x="3" y="13" width="8" height="8" rx="2.5"/><rect x="13" y="13" width="8" height="8" rx="2.5"/>'),
 linie: SV('<circle cx="12" cy="12" r="9"/><path d="M17.5 5.5A9 9 0 0 1 21 12" stroke-width="3.6" opacity=".65"/><path d="M12 12L17 8"/><circle cx="12" cy="12" r="1.7" fill="currentColor"/>'),
 gegenteil: SV('<path d="M7 20V5M3 9l4-4 4 4"/><path d="M17 4v15M13 15l4 4 4-4"/>'),
 blasen: SV('<circle cx="8" cy="9" r="5"/><circle cx="16.5" cy="15" r="4"/><circle cx="17" cy="6" r="2.2" fill="currentColor" opacity=".6"/><path d="M6 7.5a2.5 2.5 0 0 1 2-1.5"/>'),
 puls: SV('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4.6" fill="currentColor" opacity=".6"/>'),
 farbe: SV('<path d="M12 3c3.5 4.2 6 7 6 10a6 6 0 0 1-12 0c0-3 2.5-5.8 6-10Z"/><path d="M9 14a3 3 0 0 0 3 3"/>'),
 tasten: SV('<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M9 3v18M15 3v18"/><rect x="7.4" y="3" width="3.2" height="10" rx="1" fill="currentColor"/><rect x="13.4" y="3" width="3.2" height="10" rx="1" fill="currentColor"/>'),
 flug: SV('<path d="M12 2c4 4 5 9 3 15H9C7 11 8 6 12 2Z"/><path d="M9 17l-3 4M15 17l3 4"/><circle cx="12" cy="9.5" r="1.8" fill="currentColor"/>'),
 olymp: SV('<path d="M7 4h10v5a5 5 0 0 1-10 0V4Z"/><path d="M7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 1-3 3"/><path d="M12 14v4M8 21h8M9.5 18h5"/>')
};
Object.keys(ICO).forEach(k => { if(G[k]) G[k].icon = ICO[k]; });
const hdGate = id => { try{ if(typeof featureLocked === 'function' && featureLocked(id) && !(typeof adminViewOn === 'function' && adminViewOn())) return (typeof hiddenFeatures !== 'undefined' && hiddenFeatures.indexOf(id) !== -1) ? 'hide' : 'lock'; }catch(e){} return 'ok'; };
const hdOn = k => hdGate('hard_' + k) === 'ok';
const ORDER = ['balken', 'gedaechtnis', 'linie', 'gegenteil', 'flug', 'blasen', 'puls', 'farbe', 'tasten']; /* 'turm' bleibt im Code, ist aber aktuell aus dem Spiel genommen */
/* ---------- Bot-Gegner: Zielwert + Anzeige, die mitzählt ---------- */
function botTarget(game, diff){ const r = G[game].rng, f = diff === 0 ? .65 : diff === 2 ? 1.35 : 1; return Math.max(1, Math.round((r[0] + Math.random() * (r[1] - r[0])) * f)); }
function botTicker(target, pace, label){ let n = 0, stop = false; const iv = setInterval(() => { if(stop) return; if(n < target){ n++; const e = $('hdBot'); if(e) e.textContent = label + ': ' + n; } }, Math.max(350, pace * 1000)); return { value: () => n, finish(){ stop = true; clearInterval(iv); const e = $('hdBot'); if(e) e.textContent = label + ': ' + target; }, stop(){ stop = true; clearInterval(iv); } }; }
/* ---------- Server: Bestenlisten ---------- */
async function submit(game, score, pct){ if(!account || !(score > 0)) return null; return await apiCall('/api/hard', { token: account.token, action: 'submit', game, score, pct: pct == null ? undefined : pct }); }
async function board(game){ return await apiCall('/api/hard', { token: account && account.token, action: 'board', game }); }
function boardHtml(b){ if(!b || !b.ok || !b.board || !b.board.length) return '<div style="opacity:.6;text-align:center;padding:8px">' + L('Noch keine Einträge.', 'No entries yet.') + '</div>'; return b.board.map((r, i) => '<div class="hdrow"><b>' + (i + 1) + '</b><span>' + esc(r.name) + '</span><span style="flex:none;font-weight:800">' + fmt(r.best) + '</span></div>').join(''); }
function rankBox(b){
  if(!b || !b.ok) return '';
  const me = b.rank ? `<div style="font-size:16px;font-weight:800;margin-top:14px">${L('Dein Platz: ', 'Your rank: ')}${b.rank}${b.board && b.board.length ? L(' von ', ' of ') + '…' : ''}</div>` : '';
  const top = (b.board || []).slice(0, 5).map((r, i) => '<div class="hdrow"><b>' + (i + 1) + '</b><span>' + esc(r.name) + '</span><span style="flex:none;font-weight:800">' + L('Level ', 'Level ') + fmt(r.best) + (r.pct != null ? ' · ' + r.pct + '%' : '') + '</span></div>').join('') || '<div style="opacity:.6;text-align:center;padding:8px">' + L('Noch keine Einträge.', 'No entries yet.') + '</div>';
  return me.replace(/ von …| of …/, '') + '<div class="settings-label" style="margin-top:12px">' + L('TOP 5', 'TOP 5') + '</div>' + top;
}
/* ---------- Bildschirme ---------- */
let diff = 1;

/* ---------- Musik (nahtlose Schleife, Web Audio) ---------- */
let HM = null;
const hdMuted = () => { try{ return localStorage.getItem('hd_mute') === '1'; }catch(e){ return false; } };
async function hdLoad(ctx, url){ const r = await fetch(url); return await ctx.decodeAudioData(await r.arrayBuffer()); }
window.hdMusic = async function(){
  if(hdMuted() || HM) { if(HM && HM.ctx.state === 'suspended') HM.ctx.resume().catch(() => {}); return; }
  const AC = window.AudioContext || window.webkitAudioContext; if(!AC) return;
  const h = HM = { ctx: new AC(), stopped: false }; try{ await h.ctx.resume(); }catch(e){}
  try{
    const [a, b] = await Promise.all([hdLoad(h.ctx, '/audio/PartyB_start.wav'), hdLoad(h.ctx, '/audio/PartyB_loop.wav')]); if(h.stopped || HM !== h) return;
    const g = h.ctx.createGain(); g.gain.value = .5; h.gain = g; g.connect(h.ctx.destination); const t0 = h.ctx.currentTime + .1;
    const s1 = h.ctx.createBufferSource(); s1.buffer = a; s1.connect(g); s1.start(t0);
    const s2 = h.ctx.createBufferSource(); s2.buffer = b; s2.loop = true; s2.connect(g); s2.start(t0 + a.duration);
  }catch(e){ hdMusicStop(); }
};
window.hdDuck = function(v){ if(HM && HM.gain) HM.gain.gain.value = v; };
window.hdMusicStop = function(){ if(HM){ HM.stopped = true; try{ HM.ctx.close(); }catch(e){} HM = null; } };
window.hdMute = function(){ const m = !hdMuted(); try{ localStorage.setItem('hd_mute', m ? '1' : '0'); }catch(e){} if(m) hdMusicStop(); else hdMusic(); const b = $('hdMuteBtn'); if(b) b.textContent = m ? L('🔇 Musik: aus', '🔇 Music: off') : L('🔊 Musik: an', '🔊 Music: on'); };
document.addEventListener('visibilitychange', () => { if(HM){ if(document.hidden) HM.ctx.suspend().catch(() => {}); else if($('hdApp')) HM.ctx.resume().catch(() => {}); } });
setInterval(() => { if(HM && !$('hdApp')) hdMusicStop(); }, 800);

window.startHardFlow = function(){
  killGame(); hdMusic();
  if(typeof featureLocked === 'function' && featureLocked('hard') && !(typeof adminViewOn === 'function' && adminViewOn())){ renderMainMenu(); return; }
  const ACC = {balken:'#c8ff3d',turm:'#3db0ff',gedaechtnis:'#ff4d6a',linie:'#ffc83d',gegenteil:'#b36bff',flug:'#3dffe0',blasen:'#ff8ad8',puls:'#5ee1ff',farbe:'#ff9a3d',tasten:'#d9d9ff'};
  const cards = ORDER.map(k => { const gt = hdGate('hard_' + k); if(gt === 'hide') return ''; if(gt === 'lock') return `<div class="hdcard" style="--c:${ACC[k]};opacity:.45"><div class="hdcT"><div class="ic">${G[k].icon}</div><div class="tx"><h3>${G[k].name}</h3><p>Coming soon</p></div></div></div>`; return `<div class="hdcard" style="--c:${ACC[k]}"><div class="hdcT"><div class="ic">${G[k].icon}</div><div class="tx"><h3>${G[k].name}</h3><p>${L(G[k].hint[0], G[k].hint[1])}</p></div><div class="hdbest">${L('BESTE', 'BEST')}<b>${fmt(st(k).best)}</b></div></div><div class="hdcB"><button class="hdb1" onclick="hdPlay('${k}',0)">Solo</button><button class="hdb2" onclick="hdPlay('${k}',1)">${L('Gegen Bot', 'vs Bot')}</button></div></div>`; }).join('');
  renderApp(CSS + `<div class="panel" id="hdApp"><i class="hdsh"></i><div class="picker-title" style="font-size:20px;line-height:1.25">💀 ${L('DAS SCHWERSTE SPIEL<br>DER WELT', 'THE HARDEST GAME<br>IN THE WORLD')}</div>
   <div class="picker-sub">${L('Ein Fehler und es ist vorbei. Wie weit kommst du?', 'One mistake and it is over. How far can you get?')}</div>
   <div class="settings-label" style="margin-top:12px">${L('Schwierigkeit des Bots', 'Bot difficulty')}</div>
   <div class="hdlvl">${[[0, 'Leicht', 'Easy'], [1, 'Normal', 'Normal'], [2, 'Schwer', 'Hard']].map(d => `<button class="${diff === d[0] ? 'on' : ''}" onclick="hdDiff(${d[0]})">${L(d[1], d[2])}</button>`).join('')}</div>
   <div class="hdcard" style="--c:#ffd23d"><div class="hdcT"><div class="ic">${ICO.olymp}</div><div class="tx"><h3>${L('Olympiade', 'Olympics')}</h3><p>${L('Alle Spiele durcheinander, jedes mit einem Leben. Die Punkte zählen zusammen.', 'All games shuffled, one life each. Points add up.')}</p></div><div class="hdbest">${L('BESTE', 'BEST')}<b>${fmt(st('olympiade').best)}</b></div></div><div class="hdcB"><button class="hdb1" onclick="hdOlymp(0)">Solo</button><button class="hdb2" onclick="hdOlymp(1)">${L('Gegen Bot', 'vs Bot')}</button></div></div>
   ${cards}
   <div class="actions-row" style="flex-direction:column;gap:8px;margin-top:14px"><button class="btn btn-ghost" id="hdMuteBtn" onclick="hdMute()">${hdMuted() ? L('🔇 Musik: aus', '🔇 Music: off') : L('🔊 Musik: an', '🔊 Music: on')}</button><button class="btn btn-ghost" onclick="brDuelHub()">${L('Zurück', 'Back')}</button></div></div>`);
  (function(){ // Olympiade einzeln schaltbar + Stein-Spiel (ehem. Brainmania) als Karte
    const app = $('hdApp'); if(!app) return;
    if(hdGate('hard_olympiade') !== 'ok'){ const o = app.querySelector('.hdcard[style*="#ffd23d"]'); if(o) o.remove(); }
    const gt = hdGate('mania'); if(gt === 'hide') return;
    const box = document.createElement('div'); box.className = 'hdcard'; box.style.setProperty('--c', '#7ee8ff');
    const ic = '<span style="display:inline-block;width:34px;height:24px;border-radius:50% 50% 45% 45%;background:radial-gradient(circle at 35% 30%,#b9a07f,#74583c 60%,#4a3826)"></span>';
    if(gt === 'lock'){ box.style.opacity = '.45'; box.innerHTML = `<div class="hdcT"><div class="ic">${ic}</div><div class="tx"><h3>${L('Der Stein', 'The Rock')}</h3><p>Coming soon</p></div></div>`; }
    else { box.innerHTML = `<div class="hdcT"><div class="ic">${ic}</div><div class="tx"><h3>${L('Der Stein', 'The Rock')}</h3><p>${L('Das sinnloseste Spiel der Welt. Tippe auf den Stein.', 'The most pointless game in the world. Tap the rock.')}</p></div></div><div class="hdcB"><button class="hdb1" onclick="startManiaFlow()">${L('Spielen', 'Play')}</button></div>`; }
    const row = app.querySelector('.actions-row'); if(row) row.parentNode.insertBefore(box, row); else app.appendChild(box);
  })();
};
window.hdDiff = function(d){ diff = d; startHardFlow(); };
function shell(title, sub, withBot, game){ renderApp(CSS + `<div class="panel" id="hdApp"><i class="hdsh"></i><div class="picker-title" style="margin:0">${title}</div><div style="font-size:13px;font-weight:800;opacity:.85;margin-top:4px">${game ? statLine(game) : ''}</div><div class="picker-sub">${sub}</div><div class="hdbig" id="hdSc">0</div><div id="hdBot">${withBot ? '&nbsp;' : ''}</div><div id="hdMsg">&nbsp;</div><div id="hdHost" style="touch-action:none;user-select:none;min-height:60vh"></div></div>`); }
const INTRO = {
 balken: ['Eine Kugel fliegt hin und her.', 'Tippe auf den Bildschirm, wenn die Kugel im Feld ist.', 'A ball flies back and forth.', 'Tap the screen when the ball is in the field.', '<div style="height:18px;border-radius:9px;background:#161d30;position:relative;margin:14px auto;max-width:260px"><div style="position:absolute;left:30%;width:36%;top:0;bottom:0;background:#c8ff3d;border-radius:9px"></div><div style="position:absolute;left:44%;top:-4px;width:26px;height:26px;border-radius:50%;background:#fff"></div></div>'],
 turm: ['Ein Block fährt hin und her.', 'Tippe, um ihn fallen zu lassen. Was überhängt, fällt ab.', 'A block slides back and forth.', 'Tap to drop it. Overhang falls off.', '<div style="margin:14px auto;max-width:200px"><div style="height:16px;background:#3de0ff;margin:0 auto;width:110px;border-radius:3px"></div><div style="height:16px;background:#ff4d6a;margin:2px auto 0;width:150px;border-radius:3px"></div></div>'],
 gedaechtnis: ['Vier Farben leuchten nacheinander auf.', 'Merke dir die Folge und tippe sie danach in derselben Reihenfolge.', 'Four colors light up one after another.', 'Remember the order and tap them in the same order.', '<div style="display:flex;gap:8px;justify-content:center;margin:14px"><span style="width:34px;height:34px;border-radius:8px;background:#ff4d6a"></span><span style="width:34px;height:34px;border-radius:8px;background:#3de0ff"></span><span style="width:34px;height:34px;border-radius:8px;background:#c8ff3d"></span><span style="width:34px;height:34px;border-radius:8px;background:#ffc83d"></span></div>'],
 linie: ['Ein Zeiger kreist.', 'Tippe auf den Bildschirm, wenn er im Feld ist.', 'A hand is spinning.', 'Tap the screen when it is in the field.', '<div style="width:90px;height:90px;border-radius:50%;border:5px solid #161d30;margin:12px auto;position:relative"><div style="position:absolute;left:50%;top:-5px;width:46px;height:20px;margin-left:-23px;background:#c8ff3d;border-radius:10px;opacity:.9"></div></div>'],
 flug: ['Du fliegst nach oben. Von oben kommen Farbfelder.', 'Oben steht die Farbe, durch die du fliegen musst. Tippe links oder rechts auf den Bildschirm, um die Seite zu wechseln. Bist du schon richtig, bleibst du.', 'You fly upward. Color fields come from above.', 'The color on top is the one to fly through. Tap left or right on the screen to switch sides. If you are already right, stay.', '<div style="display:flex;gap:12px;justify-content:center;margin:14px"><span style="width:70px;height:18px;border-radius:5px;background:#ffc83d"></span><span style="width:70px;height:18px;border-radius:5px;background:#ff4d6a"></span></div><div style="font-size:26px">◀ &nbsp; ▶</div>'],
 blasen: ['Blasen erscheinen und platzen nach kurzer Zeit.', 'Tippe jede Blase an, bevor ihr Ring abgelaufen ist. Später sind bis zu fünf gleichzeitig da. Nimm beide Hände.', 'Bubbles appear and burst after a short time.', 'Tap every bubble before its ring runs out. Later up to five at once. Use both hands.', '<div style="display:flex;gap:14px;justify-content:center;margin:14px"><span style="width:56px;height:56px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff8,#ff4d6a);box-shadow:0 0 18px #ff4d6a"></span><span style="width:44px;height:44px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff8,#3db0ff);box-shadow:0 0 18px #3db0ff;margin-top:10px"></span></div>'],
 puls: ['Eine Kugel wächst und schrumpft in einer Form.', 'Tippe genau dann, wenn die Kugel die Form ausfüllt. Nur 100 % zählt. Die Form wechselt jedes Level.', 'A ball grows and shrinks inside a shape.', 'Tap exactly when the ball fills the shape. Only 100% counts. The shape changes every level.', '<div style="position:relative;width:90px;height:90px;margin:12px auto"><div style="position:absolute;inset:0;border-radius:50%;border:4px solid #c8ff3d;box-shadow:0 0 16px #c8ff3d"></div><div style="position:absolute;inset:14px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff,#3db0ff)"></div></div>'],
 farbe: ['Oben siehst du eine Zielfarbe.', 'Mische sie mit den Reglern nach und tippe auf FERTIG. Nur 100 % zählt.', 'You see a target color.', 'Mix it with the sliders and tap DONE. Only 100% counts.', '<div style="display:flex;gap:10px;justify-content:center;margin:14px"><span style="width:60px;height:40px;border-radius:12px;background:#b85a8a"></span><span style="width:60px;height:40px;border-radius:12px;background:#b85a8a;outline:3px solid rgba(255,255,255,.4)"></span></div>'],
 tasten: ['Dunkle Kacheln fallen in vier Spuren.', 'Tippe jede Kachel in ihrer Spur an, von unten nach oben. Jede getroffene Kachel spielt einen Ton der Melodie. Keine auslassen.', 'Dark tiles fall in four lanes.', 'Tap each tile in its lane, from the bottom up. Each hit plays a note of the melody. Do not miss any.', '<div style="display:flex;gap:6px;justify-content:center;margin:14px"><span style="width:30px;height:60px;border-radius:8px;background:#1b1450;border:2px solid #9fe8ff"></span><span style="width:30px;height:60px;border-radius:8px;background:#1b1450;border:2px solid #c8ff3d;margin-top:16px"></span><span style="width:30px;height:60px;border-radius:8px;background:#1b1450;border:2px solid #9fe8ff;margin-top:-10px"></span></div>'],
 gegenteil: ['Ein Pfeil erscheint. Seine Farbe sagt dir, wohin du wischst.', 'Roter Pfeil: wische in die GEGENÜBERLIEGENDE Richtung. Grüner Pfeil: wische in Pfeilrichtung.', 'An arrow appears. Its color tells you where to swipe.', 'Red arrow: swipe the OPPOSITE way. Green arrow: swipe the same way.', '<div style="display:flex;gap:30px;justify-content:center;font-size:54px;margin:10px"><span style="color:#ff4d6a">⬆</span><span style="color:#3dff7a">⬆</span></div><div style="display:flex;gap:30px;justify-content:center;font-size:13px;font-weight:800"><span>⬇ swipe</span><span>⬆ swipe</span></div>']
};
window.hdPlay = function(game, mode, go){
  if(!go && INTRO[game]){ killGame(); const g = G[game], I = INTRO[game];
    renderApp(CSS + `<div class="panel" id="hdApp"><i class="hdsh"></i><div style="text-align:left"><button class="hdback" onclick="startHardFlow()">‹ ${L('Zurück', 'Back')}</button></div>
     <div class="hdmid"><div class="picker-title">${g.icon} ${g.name.toUpperCase()}</div><div style="font-size:18px;font-weight:800;margin-top:14px">${L(I[0], I[2])}</div><div style="font-size:16px;opacity:.9;margin-top:8px;max-width:320px">${L(I[1], I[3])}</div><div style="margin-top:6px;width:100%">${I[4]}</div></div>
     <div class="hdbot"><button class="btn" style="width:100%" onclick="hdPlay('${game}',${mode},1)">START</button></div></div>`); return; }
  killGame(); const my = alive, g = G[game];
  shell(g.icon + ' ' + g.name.toUpperCase(), L(g.hint[0], g.hint[1]), mode === 1, game);
  const tgt = mode === 1 ? botTarget(game, diff) : 0, tk = mode === 1 ? botTicker(tgt, g.pace, 'Bot') : null;
  stopFn = g.run($('hdHost'), hud, async (score, pct) => { if(my !== alive) return; if(tk) tk.finish(); stopFn = null; detachLayer(); stSet(game, score); const sub = await submit(game, score, pct); const b = await board(game);
   const win = mode === 1 ? (score > tgt ? 1 : score === tgt ? 0 : -1) : 0;
   renderApp(CSS + `<div class="panel" id="hdApp"><i class="hdsh"></i><div class="picker-title">${g.icon} ${g.name.toUpperCase()}</div>
    <div class="hdbig">${fmt(score)}</div>
    ${pct != null ? `<div style="font-size:15px;font-weight:800;opacity:.85">${L('Genauigkeit: ', 'Accuracy: ')}${pct}%</div>` : ''}
    <div style="font-size:15px;font-weight:700;margin-top:4px">${mode === 1 ? (win > 0 ? L('Du hast den Bot geschlagen!', 'You beat the bot!') + ' (Bot: ' + tgt + ')' : win === 0 ? L('Unentschieden gegen den Bot.', 'Draw with the bot.') + ' (Bot: ' + tgt + ')' : L('Der Bot war besser.', 'The bot was better.') + ' (Bot: ' + tgt + ')') : (score >= 12 ? L('Stark.', 'Strong.') : L('Die meisten hören hier auf.', 'Most people stop here.'))}</div>
    ${sub && sub.ok ? `<div style="opacity:.75;font-size:13px;margin-top:4px">${L('Dein Rekord: ', 'Your best: ')}${fmt(sub.mine || score)}${sub.rank ? ' · ' + L('Platz ', 'Rank ') + sub.rank : ''}</div>` : (!account ? `<div class="explanation" style="margin-top:8px">${L('Melde dich an, um in die Bestenliste zu kommen.', 'Log in to get on the leaderboard.')}</div>` : '')}
    <div style="font-size:13px;font-weight:800;opacity:.85;margin-top:6px">${statLine(game)}</div>
    ${rankBox(b)}
    <div class="actions-row" style="flex-direction:row;gap:10px;margin-top:auto;padding-top:18px"><button class="btn" style="flex:1" onclick="hdPlay('${game}',${mode},1)">${L('Nochmal', 'Again')}</button><button class="btn btn-ghost" style="flex:1" onclick="startHardFlow()">${L('Raus', 'Exit')}</button></div></div>`);
  });
  if(game !== 'gedaechtnis' && game !== 'farbe') attachLayer();
};
window.hdOlymp = async function(mode){
  killGame(); const my = alive; const order = ORDER.filter(hdOn).sort(() => Math.random() - .5); const res = []; let total = 0, botTotal = 0; const targets = order.map(k => botTarget(k, diff));
  for(let i = 0; i < order.length; i++){
    if(my !== alive) return; const k = order[i], g = G[k];
    renderApp(CSS + `<div class="panel" id="hdApp"><i class="hdsh"></i><div class="picker-title">${ICO.olymp} ${L('OLYMPIADE', 'OLYMPICS')} ${i + 1}/${order.length}</div><div class="hdbig" style="font-size:80px">${g.icon}</div><div class="picker-title" style="margin-top:6px">${g.name}</div><div class="picker-sub">${L(g.hint[0], g.hint[1])}</div><div style="margin-top:14px;font-weight:800">${L('Gesamt bisher: ', 'Total so far: ')}${fmt(total)}${mode ? ' · Bot ' + fmt(botTotal) : ''}</div></div>`);
    await sl(2200); if(my !== alive) return;
    const score = await new Promise(resolve => { shell(ICO.olymp + ' ' + g.name.toUpperCase() + ' (' + (i + 1) + '/' + order.length + ')', L('Gesamt bisher: ', 'Total so far: ') + fmt(total), mode === 1, 'olympiade'); const tk = mode === 1 ? botTicker(targets[i], g.pace, 'Bot') : null; stopFn = g.run($('hdHost'), hud, s => { if(tk) tk.finish(); stopFn = null; detachLayer(); resolve(s); }); if(k !== 'gedaechtnis' && k !== 'farbe') attachLayer(); });
    if(my !== alive) return; res.push([k, score]); total += score; botTotal += targets[i];
  }
  stSet('olympiade', total); const sub = await submit('olympiade', total); const b = await board('olympiade'); if(my !== alive) return;
  renderApp(CSS + `<div class="panel" id="hdApp"><i class="hdsh"></i><div class="picker-title">${ICO.olymp} ${L('OLYMPIADE GESCHAFFT', 'OLYMPICS DONE')}</div><div class="hdbig">${fmt(total)}</div>
   ${mode ? `<div style="font-size:15px;font-weight:700">${total > botTotal ? L('Du hast den Bot geschlagen!', 'You beat the bot!') : total === botTotal ? L('Unentschieden.', 'Draw.') : L('Der Bot war besser.', 'The bot was better.')} (Bot: ${fmt(botTotal)})</div>` : ''}
   <div style="margin-top:10px;text-align:left">${res.map(([k, s], i) => `<div class="hdrow"><span>${G[k].icon} ${G[k].name}</span><span style="flex:none;font-weight:800">${fmt(s)}${mode ? ' <small style="opacity:.6">(Bot ' + targets[ORDER.indexOf(k) >= 0 ? order.indexOf(k) : 0] + ')</small>' : ''}</span></div>`).join('')}</div>
   ${sub && sub.ok ? `<div style="opacity:.75;font-size:13px;margin-top:6px">${L('Dein Rekord: ', 'Your best: ')}${fmt(sub.mine || total)}${sub.rank ? ' · ' + L('Platz ', 'Rank ') + sub.rank : ''}</div>` : (!account ? `<div class="explanation" style="margin-top:8px">${L('Melde dich an, um in die Bestenliste zu kommen.', 'Log in to get on the leaderboard.')}</div>` : '')}
   <div style="font-size:13px;font-weight:800;opacity:.85;margin-top:6px">${statLine('olympiade')}</div>
   ${rankBox(b)}
   <div class="actions-row" style="flex-direction:row;gap:10px;margin-top:auto;padding-top:18px"><button class="btn" style="flex:1" onclick="hdOlymp(${mode})">${L('Nochmal', 'Again')}</button><button class="btn btn-ghost" style="flex:1" onclick="startHardFlow()">${L('Raus', 'Exit')}</button></div></div>`);
};
window.__hdG = G;
})();
