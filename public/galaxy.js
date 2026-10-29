/* Brain Galaxy - Teil von Brainmania. Eine Galaxie aus Planeten-Blasen in der Mitte. Schiesse von unten, 3+ gleiche platzen.
   Triffst du die rechte Seite, dreht sich die Galaxie nach rechts (links: nach links). Bomben sprengen ein Loch. */
(function(){
'use strict';
const L2 = (a, b) => (typeof L === 'function' ? L(a, b) : a);
const W = 400, H = 560, CX = 200, CY = 235, R = 17, D = R * 2, DANGER = 184, SX = 200, SY = 505, SQ3 = Math.sqrt(3) / 2;
const COL = ['#ff5a5a', '#3de0ff', '#7dff6a', '#ffd45a', '#b07bff'], FR = ['🍓', '🫐', '🍏', '🍋', '🍇'];
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, -1], [-1, 1]];
const key = (q, r) => q + ',' + r;
const pos = (q, r) => ({ x: D * (q + r / 2), y: D * SQ3 * r });
function toAx(x, y){ const r = y / (D * SQ3), q = x / D - r / 2; let rx = Math.round(q), rz = Math.round(r), ry = Math.round(-q - r); const dx = Math.abs(rx - q), dz = Math.abs(rz - r), dy = Math.abs(ry + q + r); if(dx > dz && dx > dy) rx = -ry - rz; else if(dz > dy) rz = -rx - ry; return [rx, rz]; }
let G = null, raf = 0, SPR = null, HERO = 0, BACK = null;
/* ---------- Helden (gleiche Figuren, Besitz und Stufen wie Brain Fruit) ---------- */
const KV = { 0: [1.25, 1.3, 1.35, 1.4, 1.5], 1: [3, 4, 5, 6, 8], 2: [1.15, 1.2, 1.25, 1.3, 1.4], 3: [0, .1, .2, .3, .5], 4: [15, 17, 19, 21, 25], 5: [0, 1, 2, 3, 4] }, XPT = [0, 5, 15, 30, 50];
const KN = [['Königin Beere', 'Queen Berry'], ['König Zitrone', 'King Lemon'], ['Königin Kirsche', 'Queen Cherry'], ['König Apfel', 'King Apple'], ['Königin Traube', 'Queen Grape'], ['König Heidelbeere', 'King Blueberry']];
const fdat = () => { try{ return typeof fruitData === 'function' ? fruitData() : {}; }catch(e){ return {}; } };
const lsGet = (k, d) => { try{ const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); }catch(e){ return d; } };
function kArr(name){ const a = [0, 0, 0, 0, 0, 0], d = fdat(), l = lsGet('bp_fruit_' + name, []); for(let i = 0; i < 6; i++) a[i] = Math.max(Array.isArray(d[name]) ? d[name][i] | 0 : 0, l[i] | 0); return a; }
function kArrSet(name, a){ try{ localStorage.setItem('bp_fruit_' + name, JSON.stringify(a)); }catch(e){} try{ if(typeof fruitSet === 'function'){ const o = {}; o[name] = a; fruitSet(o); } }catch(e){} }
function kLvl(i){ const xp = kArr('galaxyKX')[i], kl = kArr('galaxyKL')[i]; let lv = 1; for(let j = 1; j < 5; j++) if(xp >= XPT[j]) lv = j + 1; return Math.max(1, Math.min(5, Math.max(lv, kl))); }
const kv = i => KV[i][kLvl(i) - 1];
const kOwn = i => { try{ return typeof kingOwned === 'function' ? !!kingOwned(i) : i === 0; }catch(e){ return i === 0; } };
function kDesc(i, lv){ const v = KV[i][(lv || kLvl(i)) - 1]; return [L2('Bomben-/Raketen-Leiste füllt sich +' + Math.round((v - 1) * 100) + ' % schneller', 'Charge bar fills +' + Math.round((v - 1) * 100) + '% faster'), L2('+' + v + ' Extra-Schüsse, bevor die Galaxie wächst', '+' + v + ' extra shots before the galaxy grows'), L2('+' + Math.round((v - 1) * 100) + ' % Punkte', '+' + Math.round((v - 1) * 100) + '% points'), L2('Jede Welle mit Rakete' + (v > 0 ? ' + Leiste ' + Math.round(v * 100) + ' % voll' : ''), 'Every wave starts with a rocket' + (v > 0 ? ' + bar ' + Math.round(v * 100) + '% full' : '')), L2('Galaxie wächst erst nach ' + v + ' Schüssen', 'Galaxy grows only after ' + v + ' shots'), L2('Drehung klingt schneller ab' + (v > 0 ? ' (+' + v * 25 + ' %)' : ''), 'Spin fades faster' + (v > 0 ? ' (+' + v * 25 + '%)' : ''))][i]; }
const HC = ['#ff5d8f', '#ffd45a', '#ff3b5c', '#7dff9a', '#b07bff', '#3de0ff'];
/* Raumhelm: Glas mit Verlauf, Spiegelung, Rand, Kragen mit Schrauben, Antenne mit leuchtender Kugel */
const HELM = '<defs><radialGradient id="hmG" cx=".3" cy=".2" r=".95"><stop offset="0" stop-color="#fff" stop-opacity=".32"/><stop offset=".5" stop-color="#bfe9ff" stop-opacity=".07"/><stop offset="1" stop-color="#7fd0ff" stop-opacity=".16"/></radialGradient></defs>'
  + '<ellipse cx="60" cy="80" rx="52" ry="58" fill="url(#hmG)" stroke="#d9efff" stroke-width="2.2" stroke-opacity=".85"/>'
  + '<path d="M22 52Q28 30 50 22" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".7"/><circle cx="17" cy="68" r="2.2" fill="#fff" opacity=".6"/>'
  + '<path d="M96 100Q92 120 74 130" fill="none" stroke="#9fd8ff" stroke-width="3" stroke-linecap="round" opacity=".45"/>'
  + '<ellipse cx="60" cy="137" rx="30" ry="6" fill="#8f9bb8" stroke="#e6f3ff" stroke-width="2"/><ellipse cx="60" cy="135.5" rx="27" ry="4" fill="#b9c4dd"/>';
const SPARK = '<g fill="#fff"><path d="M14 30l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" opacity=".9"/><path d="M104 66l1.6 4 4 1.6-4 1.6-1.6 4-1.6-4-4-1.6 4-1.6z" opacity=".8"/><circle cx="22" cy="92" r="1.8" opacity=".8"/><circle cx="100" cy="100" r="1.4" opacity=".7"/></g>';
function lvFx(i, lv){ const c = HC[i] || '#fff', back = [], front = [];
  if(lv >= 2) back.push(`<ellipse cx="60" cy="141" rx="40" ry="8" fill="none" stroke="${lv >= 3 ? '#ffd45a' : '#cfd8ee'}" stroke-width="${lv >= 3 ? 4 : 3}" opacity=".9"/>`);
  if(lv >= 3) back.push('<ellipse cx="60" cy="141" rx="46" ry="10" fill="none" stroke="#ffd45a" stroke-width="1.5" opacity=".55"/>');
  if(lv >= 4) front.push(`<ellipse cx="60" cy="84" rx="56" ry="15" fill="none" stroke="${c}" stroke-width="2.5" opacity=".85" transform="rotate(-18 60 84)"/><circle cx="12" cy="97" r="5" fill="#4de1ff" stroke="#fff" stroke-width="1.5"/><circle cx="108" cy="71" r="4" fill="#ff7ad9" stroke="#fff" stroke-width="1.5"/>`);
  if(lv >= 5) back.unshift(`<defs><radialGradient id="hlo"><stop offset="0" stop-color="${c}" stop-opacity=".55"/><stop offset=".6" stop-color="#ffd45a" stop-opacity=".25"/><stop offset="1" stop-color="#ffd45a" stop-opacity="0"/></radialGradient></defs><circle cx="60" cy="82" r="66" fill="url(#hlo)"/>`);
  return { back: back.join(''), front: front.join('') }; }
function heroInner(i, o){ o = o || {}; const base = (typeof KING_SVG !== 'undefined' && KING_SVG[i]) ? KING_SVG[i] : '', fx = lvFx(i, o.lvl || 1); return base; }
function heroSvg(i, px, o){ o = o || {}; const gl = ''; return `<svg viewBox="0 0 120 150" width="${Math.round(px * .8)}" height="${px}" style="display:block;margin:auto;${gl}">${heroInner(i, o)}</svg>`; }
function heroImg(i, lv){ const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 150" width="240" height="300">' + heroInner(i, { lvl: lv }) + '</svg>'; const im = new Image(); im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg); return im; }
function heroLoad(){ let v = lsGet('bp_galaxy_king', fdat().galaxyKing | 0); v = (v >= 0 && v < 6 && kOwn(v)) ? v : 0; HERO = v; }
function heroSet(i){ HERO = i; try{ localStorage.setItem('bp_galaxy_king', JSON.stringify(i)); }catch(e){} try{ if(typeof fruitSet === 'function') fruitSet({ galaxyKing: i }); }catch(e){} }
function heroXp(){ const xs = kArr('galaxyKX'); xs[HERO]++; kArrSet('galaxyKX', xs); const ks = kArr('galaxyKL'), lv = kLvl(HERO); if(lv > ks[HERO]){ ks[HERO] = lv; kArrSet('galaxyKL', ks); } }

/* ---------- Planeten-Sprites ---------- */
function sprites(){
  if(SPR) return SPR; const s = 2, sz = Math.ceil(D * s) + 6; SPR = [];
  for(let t = 0; t < 5; t++){
    const c = document.createElement('canvas'); c.width = c.height = sz; const x = c.getContext('2d'), m = sz / 2, rr = R * s - 1;
    const base = COL[t];
    const g = x.createRadialGradient(m - rr * .35, m - rr * .4, rr * .1, m, m, rr);
    g.addColorStop(0, '#ffffff'); g.addColorStop(.3, shade(base, .35)); g.addColorStop(.7, base); g.addColorStop(1, shade(base, -.5));
    x.fillStyle = g; x.beginPath(); x.arc(m, m, rr, 0, 7); x.fill();
    x.font = Math.round(rr * 1.18) + 'px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",system-ui'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(FR[t], m, m + rr * .07);
    x.globalAlpha = .55; x.fillStyle = '#fff'; x.beginPath(); x.ellipse(m - rr * .38, m - rr * .46, rr * .3, rr * .16, -.6, 0, 7); x.fill(); x.globalAlpha = 1;
    x.beginPath(); x.arc(m, m, rr, 0, 7); x.strokeStyle = shade(base, .25); x.lineWidth = 3; x.stroke();
    SPR.push(c);
  }
  const b = document.createElement('canvas'); b.width = b.height = Math.ceil(D * s) + 6; const x = b.getContext('2d'), m = b.width / 2, rr = R * s - 1;
  const g = x.createRadialGradient(m - rr * .3, m - rr * .3, rr * .1, m, m, rr); g.addColorStop(0, '#6b7491'); g.addColorStop(1, '#0b0e18');
  x.fillStyle = g; x.beginPath(); x.arc(m, m, rr, 0, 7); x.fill(); x.strokeStyle = '#ff7a3d'; x.lineWidth = 3; x.stroke();
  x.fillStyle = '#ff7a3d'; x.beginPath(); x.arc(m, m - rr * 1.02, rr * .18, 0, 7); x.fill(); x.font = Math.round(rr * 1.1) + 'px system-ui'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('💣', m, m + 2);
  SPR.push(b);
  { const r = document.createElement('canvas'); r.width = r.height = b.width; const y = r.getContext('2d'), m = r.width / 2, rr = R * s - 1; const g2 = y.createRadialGradient(m - rr * .3, m - rr * .3, rr * .1, m, m, rr); g2.addColorStop(0, '#ffffff'); g2.addColorStop(.35, '#3de0ff'); g2.addColorStop(1, '#0a4a7a'); y.fillStyle = g2; y.beginPath(); y.arc(m, m, rr, 0, 7); y.fill(); y.strokeStyle = '#bff6ff'; y.lineWidth = 3; y.stroke(); y.font = Math.round(rr * 1.2) + 'px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",system-ui'; y.textAlign = 'center'; y.textBaseline = 'middle'; y.fillText('🚀', m, m + rr * .06); SPR.push(r); }
  return SPR;
}
function shade(hex, p){ const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255; const f = v => Math.max(0, Math.min(255, Math.round(p < 0 ? v * (1 + p) : v + (255 - v) * p))); return '#' + ((1 << 24) + (f(r) << 16) + (f(g) << 8) + f(b)).toString(16).slice(1); }
/* ---------- Spiel ---------- */
const bubCols = () => { const s = new Set(); G.cl.forEach(b => s.add(b.c)); return s.size ? Array.from(s) : [0, 1, 2, 3, 4]; };
const pickCol = () => { const a = bubCols(); return a[Math.floor(Math.random() * a.length)]; };
function buildCluster(){
  const rad = Math.min(3, 1 + G.wave); G.cl = new Map();
  for(let q = -rad; q <= rad; q++) for(let r = -rad; r <= rad; r++) if(Math.abs(q + r) <= rad) G.cl.set(key(q, r), { q, r, c: Math.floor(Math.random() * 5) });
}
function fresh(best){
  G = { rockets: 1, rarmed: false, charge: 0, award: false, waveShots: 0, hero: HERO, smul: HERO === 2 ? kv(2) : 1, cmul: HERO === 0 ? kv(0) : 1, grace: 0, wave: 1, score: 0, best: best || 0, combo: 0, theta: 0, wi: 0, dir: 1, miss: 0, bombs: 2, armed: false, shot: null, parts: [], texts: [], over: false, aim: null, lastT: 0, shots: 0, stars: Array.from({ length: 70 }, () => ({ x: Math.random() * W, y: Math.random() * H, r: Math.random() * 1.4 + .3, a: Math.random() * .6 + .2 })) };
  buildCluster(); G.cur = pickCol(); G.next = pickCol(); waveStart(); G.himg = heroImg(HERO, kLvl(HERO)); G.far = 0; G.cheer = 0;
}
function subm(){ try{ if(G && !G.subm && G.score > 0 && window.brainSubmit){ G.subm = 1; brainSubmit('galaxy', Math.max(1, Math.min(500, G.wave)), G.score); } }catch(e){} }
function waveStart(){ G.waveShots = 0; G.grace = HERO === 4 ? Math.round(kv(4)) : 0; if(HERO === 3){ G.rockets++; G.charge = Math.min(99, kv(3) * 100); } }
const addScore = n => { const v = Math.round(n * G.smul); G.score += v; return v; };
const rot = (x, y, a) => ({ x: x * Math.cos(a) - y * Math.sin(a), y: x * Math.sin(a) + y * Math.cos(a) });
const wpos = b => { const p = pos(b.q, b.r), w = rot(p.x, p.y, G.theta); return { x: CX + w.x, y: CY + w.y }; };
const baseW = () => (G.wave > 1 ? Math.min(1.1, .1 * (G.wave - 1)) : 0) * G.dir;
function fire(){
  if(G.over || G.shot || !G.aim) return;
  const dx = G.aim.x - SX, dy = G.aim.y - SY; if(dy > -20) return; const l = Math.hypot(dx, dy), vx = dx / l, vy = dy / l;
  G.shot = { x: SX, y: SY, vx, vy, c: G.cur, bomb: G.armed, rocket: G.rarmed, n: 0, spun: false }; G.shots++; G.waveShots++;
  if(G.armed){ G.armed = false; G.bombs--; } else if(G.rarmed){ G.rarmed = false; G.rockets--; } else { G.cur = G.next; G.next = pickCol(); }
  hud();
}
function neighbors(b){ return DIRS.map(d => [b.q + d[0], b.r + d[1]]); }
function land(sh, hit){
  const w = { x: sh.x - CX, y: sh.y - CY }, lp = rot(w.x, w.y, -G.theta);
  const hx = (sh.x - CX) / (Math.hypot(sh.x - CX, sh.y - CY) || 1);
  G.wi = Math.max(-4, Math.min(4, G.wi + 1.7 * hx)); // rechts getroffen = nach rechts drehen
  if(sh.bomb){ explode(hit); return; }
  let best = null, bd = 1e9;
  neighbors(hit).forEach(([q, r]) => { if(G.cl.has(key(q, r))) return; const p = pos(q, r), d = Math.hypot(p.x - lp.x, p.y - lp.y); if(d < bd){ bd = d; best = [q, r]; } });
  if(!best){ return; }
  const nb = { q: best[0], r: best[1], c: sh.c }; G.cl.set(key(nb.q, nb.r), nb);
  const grp = flood(nb);
  if(grp.length >= 3){
    G.combo++; const gain = addScore(grp.length * 10 * G.combo); G.miss = 0;
    grp.forEach(b => popB(b)); text(wpos(nb), '+' + gain, COL[sh.c]);
    if(grp.length >= 5){ G.rockets++; text({ x: CX, y: CY - 70 }, '🚀 +1', '#3de0ff'); }
    chargeUp(grp.length);
    dropFloaters();
  } else { G.combo = 0; G.miss++; spawnCheck(); }
  afterShot();
}
function chargeUp(n){ G.charge += n * 7 * G.cmul; if(G.charge >= 100){ G.charge -= 100; G.award = !G.award; if(G.award){ G.bombs++; text({ x: CX, y: CY - 95 }, '💣 +1', '#ffd45a'); } else { G.rockets++; text({ x: CX, y: CY - 95 }, '🚀 +1', '#3de0ff'); } } }
function flood(s){ const seen = new Set([key(s.q, s.r)]), out = [s], st = [s]; while(st.length){ const b = st.pop(); neighbors(b).forEach(([q, r]) => { const k = key(q, r), n = G.cl.get(k); if(n && n.c === s.c && !seen.has(k)){ seen.add(k); out.push(n); st.push(n); } }); } return out; }
function popB(b){ const p = wpos(b); G.cl.delete(key(b.q, b.r)); for(let i = 0; i < 7; i++){ const a = Math.random() * 6.28, v = 60 + Math.random() * 120; G.parts.push({ x: p.x, y: p.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: .6, c: COL[b.c] }); } }
function dropFloaters(){ // alles, was nicht mehr mit der Galaxie (groesster Teil) verbunden ist, faellt weg
  const seen = new Set(), comps = [];
  G.cl.forEach(b => { const k = key(b.q, b.r); if(seen.has(k)) return; const comp = [], st = [b]; seen.add(k); while(st.length){ const x = st.pop(); comp.push(x); neighbors(x).forEach(([q, r]) => { const kk = key(q, r), n = G.cl.get(kk); if(n && !seen.has(kk)){ seen.add(kk); st.push(n); } }); } comps.push(comp); });
  if(comps.length < 2) return; comps.sort((a, b) => b.length - a.length);
  let n = 0; comps.slice(1).forEach(c => c.forEach(b => { n++; popB(b); })); if(n){ const g = addScore(n * 20 * Math.max(1, G.combo)); text({ x: CX, y: CY + 60 }, '+' + g, '#c6ff3d'); }
}
function explode(hit){
  const c = wpos(hit); let n = 0;
  Array.from(G.cl.values()).forEach(b => { const p = wpos(b); if(Math.hypot(p.x - c.x, p.y - c.y) <= D * 2.3){ popB(b); n++; } });
  for(let i = 0; i < 26; i++){ const a = Math.random() * 6.28, v = 80 + Math.random() * 200; G.parts.push({ x: c.x, y: c.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: .7, c: '#ffb04a' }); }
  const gb = addScore(n * 15); text(c, '💥 +' + gb, '#ffb04a'); G.combo = 0; dropFloaters(); afterShot();
}
function text(p, t, c){ G.texts.push({ x: p.x, y: p.y, t, c, life: 1 }); }
function spawnCheck(){
  if(G.waveShots <= G.grace) { G.miss = 0; return; } const limit = Math.max(3, 6 - Math.floor(G.wave / 2)) + (HERO === 1 ? Math.round(kv(1)) : 0); if(G.miss < limit) return; G.miss = 0;
  const n = Math.min(4, 1 + Math.floor(G.wave / 2)), front = new Map();
  G.cl.forEach(b => neighbors(b).forEach(([q, r]) => { const k = key(q, r); if(!G.cl.has(k)) front.set(k, [q, r]); }));
  const arr = Array.from(front.values()).sort(() => Math.random() - .5);
  for(let i = 0; i < n && i < arr.length; i++) G.cl.set(key(arr[i][0], arr[i][1]), { q: arr[i][0], r: arr[i][1], c: Math.floor(Math.random() * 5) });
  text({ x: CX, y: 40 }, L2('Die Galaxie wächst!', 'The galaxy grows!'), '#ff8aa0');
}
function afterShot(){
  if(!G.cl.size){ G.wave++; addScore(200 * G.wave); G.bombs++; G.dir = -G.dir; heroXp(); G.cheer = 1.6; text({ x: CX, y: CY }, L2('Welle ', 'Wave ') + G.wave + '!', '#c6ff3d'); buildCluster(); waveStart(); }
  if(!bubCols().includes(G.cur)) G.cur = pickCol(); if(!bubCols().includes(G.next)) G.next = pickCol();
  let far = 0; G.cl.forEach(b => { const p = wpos(b); far = Math.max(far, Math.hypot(p.x - CX, p.y - CY) + R); });
  G.far = far;
  if(far > DANGER){ G.over = true; subm(); G.best = Math.max(G.best, G.score); try{ localStorage.setItem('bp_galaxy_best', String(G.best)); }catch(e){} }
  hud();
}
function step(dt){
  G.wi *= Math.pow(.5, dt * (1 + (HERO === 5 ? kv(5) * .25 : 0))); G.theta += (G.wi + baseW()) * dt;
  if(G.shot && !G.over){
    const s = G.shot, spd = 760; let moved = 0;
    while(moved < spd * dt){
      const m = Math.min(6, spd * dt - moved); moved += m; s.x += s.vx * m; s.y += s.vy * m;
      if(s.rocket){
        let any = false; Array.from(G.cl.values()).forEach(b => { const p = wpos(b); if(Math.hypot(p.x - s.x, p.y - s.y) < R * 1.1){ any = true; if(!s.spun){ s.spun = true; G.wi = Math.max(-4, Math.min(4, G.wi + 1.7 * ((s.x - CX) / (Math.hypot(s.x - CX, s.y - CY) || 1)))); } popB(b); s.n++; } });
        if(any){ G.score += 0; }
        if(s.y < -30 || s.x < -30 || s.x > W + 30){ G.shot = null; if(s.n){ const gr = addScore(s.n * 15); text({ x: s.x < 30 ? 60 : s.x > W - 30 ? W - 60 : s.x, y: 60 }, '🚀 +' + gr, '#3de0ff'); G.combo = 0; dropFloaters(); chargeUp(Math.ceil(s.n / 2)); } afterShot(); break; }
        continue;
      }
      let hit = null; for(const b of G.cl.values()){ const p = wpos(b); if(Math.hypot(p.x - s.x, p.y - s.y) < D * .9){ hit = b; break; } }
      if(hit){ G.shot = null; land(s, hit); break; }
      if(s.y < -30 || s.x < -30 || s.x > W + 30){ G.shot = null; if(!s.bomb){ G.combo = 0; G.miss++; spawnCheck(); afterShot(); } else afterShot(); break; }
    }
  }
  if(G.cheer > 0) G.cheer -= dt;
  G.parts = G.parts.filter(p => (p.life -= dt) > 0); G.parts.forEach(p => { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= .96; p.vy *= .96; });
  G.texts = G.texts.filter(t => (t.life -= dt * .8) > 0); G.texts.forEach(t => { t.y -= 24 * dt; });
}
function draw(){
  const cv = document.getElementById('bgCv'); if(!cv) return false; const x = cv.getContext('2d'), dpr = cv.width / W;
  x.setTransform(dpr, 0, 0, dpr, 0, 0);
  const bg = x.createRadialGradient(CX, CY, 10, CX, CY, 330); bg.addColorStop(0, '#1b2a66'); bg.addColorStop(1, '#080c1c'); x.fillStyle = bg; x.fillRect(0, 0, W, H);
  G.stars.forEach(s => { x.globalAlpha = s.a; x.fillStyle = '#fff'; x.beginPath(); x.arc(s.x, s.y, s.r, 0, 7); x.fill(); }); x.globalAlpha = 1;
  const pulse = G.cl.size ? 0 : 0; x.setLineDash([8, 6]); x.strokeStyle = 'rgba(255,90,110,.65)'; x.lineWidth = 2; x.beginPath(); x.arc(CX, CY, DANGER, 0, 7); x.stroke(); x.setLineDash([]);
  const sp = sprites(), sz = sp[0].width / 4;
  G.cl.forEach(b => { const p = wpos(b); x.save(); x.translate(p.x, p.y); x.rotate(G.theta * 1.4); x.drawImage(sp[b.c], -sz, -sz, sz * 2, sz * 2); x.restore(); });
  // Zielhilfe
  if(G.aim && !G.shot && !G.over){ const dx = G.aim.x - SX, dy = G.aim.y - SY, l = Math.hypot(dx, dy) || 1; if(dy < -20){ const vx = dx / l, vy = dy / l; for(let k = 1; k <= 14; k++){ const d = k * 22, px = SX + vx * d, py = SY + vy * d; let stop = false; for(const b of G.cl.values()){ const p = wpos(b); if(Math.hypot(p.x - px, p.y - py) < D * .9){ stop = true; break; } } if(stop && !G.rarmed) break; x.globalAlpha = 1 - k * .05; x.fillStyle = G.rarmed ? HC[HERO] : '#fff'; x.beginPath(); x.arc(px, py, G.rarmed ? 3.6 : 3, 0, 7); x.fill(); } x.globalAlpha = 1; } }
  // Schiesser
  x.fillStyle = '#141c3d'; x.strokeStyle = HC[HERO]; x.lineWidth = 2.5; x.beginPath(); x.arc(SX, SY, 31, 0, 7); x.fill(); x.stroke();
  drawHero(x);
  if(!G.shot || true){ const img = G.armed ? sp[5] : G.rarmed ? sp[6] : sp[G.cur]; if(!(G.shot)) x.drawImage(img, SX - sz, SY - sz, sz * 2, sz * 2); }
  x.drawImage(sp[G.next], 52 - sz * .8, 512 - sz * .8, sz * 1.6, sz * 1.6); x.fillStyle = '#8892b0'; x.font = '10px system-ui'; x.textAlign = 'center'; x.fillText(L2('NÄCHSTE', 'NEXT'), 52, 543);
  if(G.shot){ if(G.shot.rocket){ x.globalAlpha = .6; x.strokeStyle = HC[HERO]; x.lineWidth = 9; x.lineCap = 'round'; x.beginPath(); x.moveTo(G.shot.x - G.shot.vx * 70, G.shot.y - G.shot.vy * 70); x.lineTo(G.shot.x, G.shot.y); x.stroke(); x.globalAlpha = 1; } const img = G.shot.bomb ? sp[5] : G.shot.rocket ? sp[6] : sp[G.shot.c]; x.drawImage(img, G.shot.x - sz, G.shot.y - sz, sz * 2, sz * 2); }
  G.parts.forEach(p => { x.globalAlpha = Math.max(0, p.life * 1.5); x.fillStyle = p.c; x.beginPath(); x.arc(p.x, p.y, 3, 0, 7); x.fill(); }); x.globalAlpha = 1;
  x.textAlign = 'center'; x.font = '900 20px system-ui'; G.texts.forEach(t => { x.globalAlpha = Math.min(1, t.life * 1.6); x.fillStyle = t.c; x.fillText(t.t, t.x, t.y); }); x.globalAlpha = 1;
  // Drehrichtung
  const om = G.wi + baseW(); if(Math.abs(om) > .15){ x.strokeStyle = '#3de0ff'; x.lineWidth = 4; x.lineCap = 'round'; x.beginPath(); x.arc(CX, CY, DANGER + 10, -2.2, -2.2 + Math.min(1.2, Math.abs(om) * .4) * Math.sign(om), om < 0); x.stroke(); x.fillStyle = '#3de0ff'; x.font = '800 12px system-ui'; x.textAlign = 'left'; x.fillText((om > 0 ? '↻ ' : '↺ ') + Math.abs(om).toFixed(1) + 'x', 12, 24); }
  if(G.over){ x.fillStyle = 'rgba(5,8,20,.72)'; x.fillRect(0, 0, W, H); x.textAlign = 'center'; x.fillStyle = '#ff8aa0'; x.font = '900 30px system-ui'; x.fillText(L2('Galaxie zu groß!', 'Galaxy too big!'), CX, 210); x.fillStyle = '#fff'; x.font = '800 18px system-ui'; x.fillText(L2('Punkte: ', 'Score: ') + G.score + '  ·  ' + L2('Welle ', 'Wave ') + G.wave, CX, 245); x.fillStyle = '#c6ff3d'; x.fillText(L2('Rekord: ', 'Best: ') + G.best, CX, 275); }
  return true;
}
function drawHero(x){
  const im = G.himg; if(!im || !im.complete || !im.naturalWidth) return; const t = performance.now() / 1000, lv = kLvl(HERO);
  const danger = G.far > DANGER - 45 && !G.over, combo = G.combo >= 3, cheer = G.cheer > 0;
  let glow = lv >= 5 ? '#ffd45a' : lv >= 3 ? '#ffd45a' : null, em = '';
  if(danger){ glow = '#ff3b5c'; em = '❗'; } else if(cheer){ glow = '#c6ff3d'; em = '🎉'; } else if(combo){ glow = '#c6ff3d'; em = '🔥'; } else if(G.over) em = '😵';
  const w = 66, h = 82; let hx = W - 62, hy = SY - 12 - h / 2 + 6;
  if(combo || cheer) hy += -Math.abs(Math.sin(t * 7)) * (cheer ? 14 : 5);
  if(danger) hx += Math.sin(t * 32) * 1.8;
  x.save(); if(G.over) x.globalAlpha = .55; if(glow){ x.shadowColor = glow; x.shadowBlur = danger ? 16 + Math.sin(t * 9) * 6 : 14; }
  x.drawImage(im, hx - w / 2, hy - h / 2, w, h); x.restore();
  if(em){ x.font = '20px system-ui'; x.textAlign = 'center'; x.fillText(em, hx + 22, hy - h / 2 + 4); }
}
function hud(){
  const g = id => document.getElementById(id); if(!g('bgSc')) return;
  g('bgSc').textContent = G.score.toLocaleString(); g('bgBest').textContent = Math.max(G.best, G.score).toLocaleString(); g('bgWave').textContent = G.wave; g('bgCombo').textContent = G.combo > 1 ? '🔥 x' + G.combo : '';
  g('bgBomb').textContent = '💣 ×' + G.bombs; g('bgBomb').style.borderColor = G.armed ? '#ffb04a' : ''; g('bgBomb').style.background = G.armed ? 'rgba(255,176,74,.22)' : '';
  g('bgRock').textContent = '🚀 ×' + G.rockets; g('bgRock').style.borderColor = G.rarmed ? '#3de0ff' : ''; g('bgRock').style.background = G.rarmed ? 'rgba(61,224,255,.22)' : '';
  g('bgBar').style.width = Math.min(100, G.charge) + '%';
}
function loop(t){
  if(!document.getElementById('bgCv')){ raf = 0; return; }
  const dt = Math.min(.05, (t - (G.lastT || t)) / 1000); G.lastT = t; if(!G.over) step(dt); else step(dt * .2); draw(); raf = requestAnimationFrame(loop);
}
function point(e, cv){ const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height }; }
function open(back){ BACK = back || null; showHeroes(); }
function showHeroes(msg){
  heroLoad(); if(raf){ cancelAnimationFrame(raf); raf = 0; }
  const coins = (typeof fruitCoins === 'function') ? fruitCoins() : 0;
  const card = i => { const ow = kOwn(i), sel = i === HERO, free = i === 1, lock = !ow && free;
    const st = ow ? (sel ? '✓ ' + L2('Gewählt', 'Selected') : L2('Besitzt', 'Owned')) : (free ? '🔒 ' + L2('Ab Level 50', 'From level 50') : '500 🪙');
    return `<div data-h="${i}" style="border-radius:18px;padding:10px 6px;text-align:center;cursor:pointer;background:#141b36;border:2px solid ${sel ? '#ffd45a' : '#2a3358'};${sel ? 'box-shadow:0 0 16px rgba(255,212,90,.5);' : ''}${lock ? 'opacity:.5;' : ''}">${heroSvg(i, 110, { lvl: kLvl(i) })}<div style="font-weight:800;font-size:14px;margin-top:2px">${L2(KN[i][0], KN[i][1])}</div>${ow ? `<div style="font-size:10.5px;color:#c6ff3d;font-weight:800">${L2('Stufe', 'Level')} ${kLvl(i)}/5</div>` : ''}<div style="font-size:11px;opacity:.75;min-height:30px;margin:2px 4px">${kDesc(i)}</div><div style="margin-top:6px;padding:6px;border-radius:10px;background:${ow || lock ? '#2a3358' : '#ffd45a'};color:${ow || lock ? '#e8eefc' : '#2b1c00'};font-weight:900;font-size:12px">${st}</div>${ow ? `<div data-up="${i}" style="margin-top:6px;padding:7px;border-radius:10px;background:linear-gradient(135deg,#c6ff3d,#3de0ff);color:#06121a;font-weight:900;font-size:12px">${kLvl(i) >= 5 ? '★ MAX' : '⬆ Upgrade'}</div>` : ''}</div>`; };
  renderApp(`<div class="panel" id="bgApp" style="text-align:center"><div style="display:flex;justify-content:space-between;align-items:center"><div class="picker-title" style="margin:0">👑 ${L2('Wähle deinen Helden', 'Choose your hero')}</div><span style="font-weight:800;font-size:13px">🪙 ${coins}</span></div>
    <div class="picker-sub">${L2('Gleiche Helden wie in Brain Fruit – Besitz und Stufe gelten in beiden Spielen. Jeder Held hat in Galaxy eine eigene Fähigkeit.', 'Same heroes as Brain Fruit – ownership and level count in both games. Each hero has its own Galaxy ability.')}</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px">${[0, 1, 2, 3, 4, 5].map(card).join('')}</div>
    <div id="bgMsg" style="min-height:20px;font-size:12px;color:#ffc446;margin-top:8px">${msg || ''}</div>
    <button class="btn btn-primary btn-block" onclick="BGX.play()">▶ ${L2('Spielen mit ', 'Play with ')}${L2(KN[HERO][0], KN[HERO][1])}</button>
    <button class="btn btn-ghost btn-block" style="margin-top:8px" onclick="BGX.back()">${L2('Zurück', 'Back')}</button></div>`);
  document.querySelectorAll('#bgApp [data-up]').forEach(el => el.onclick = e => { e.stopPropagation(); upgradeWin(+el.dataset.up); });
  document.querySelectorAll('#bgApp [data-h]').forEach(el => el.onclick = async () => {
    const i = +el.dataset.h; if(kOwn(i)){ heroSet(i); return showHeroes(); }
    if(i === 1) return showHeroes(L2('König Zitrone wird in Brain Fruit ab Level 50 frei.', 'King Lemon unlocks at Brain Fruit level 50.'));
    if(typeof fruitPay !== 'function' || !(await bpConfirm(L2(KN[i][0] + ' für 500 Münzen freischalten?', 'Unlock ' + KN[i][1] + ' for 500 coins?'), { danger: false, icon: '👑', yes: L2('Kaufen', 'Buy') }))) return;
    const r = fruitPay(500); if(!r.ok) return showHeroes(r.why === 'coins' ? L2('Nicht genug Münzen.', 'Not enough coins.') : L2('Bitte anmelden, um Helden zu kaufen.', 'Log in to buy heroes.'));
    try{ fruitSet({ fruitKings: (fdat().fruitKings | 0) | (1 << i) }); }catch(e){} heroSet(i); showHeroes();
  });
}
const LVC = [0, 200, 400, 700, 1000];
function upgradeWin(i){
  const old = document.getElementById('bgUp'); if(old) old.remove();
  const lv = kLvl(i), coins = (typeof fruitCoins === 'function') ? fruitCoins() : 0;
  const rows = [1, 2, 3, 4, 5].map(n => { const done = n <= lv, cur = n === lv, next = n === lv + 1;
    return `<div style="display:flex;gap:8px;align-items:center;padding:9px 10px;border-radius:12px;margin-top:6px;background:${cur ? 'rgba(198,255,61,.12)' : 'rgba(255,255,255,.04)'};border:1.5px solid ${cur ? '#c6ff3d' : next ? '#3de0ff' : 'rgba(255,255,255,.1)'};opacity:${done || next ? 1 : .55}"><b style="min-width:54px;color:${done ? '#c6ff3d' : '#fff'}">${L2('Stufe', 'Level')} ${n}</b><span style="flex:1;font-size:12px;text-align:left">${kDesc(i, n)}</span><span style="font-size:11px;font-weight:800">${done ? '✓' : (LVC[n - 1] + ' 🪙')}</span></div>`; }).join('');
  const o = document.createElement('div'); o.id = 'bgUp';
  o.style.cssText = 'position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(4,7,16,.78);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)';
  o.innerHTML = `<div style="width:100%;max-width:380px;max-height:90vh;overflow:auto;border-radius:22px;padding:18px 16px;background:linear-gradient(160deg,#1b2442,#10172c);border:1px solid rgba(61,224,255,.4);box-shadow:0 20px 60px rgba(0,0,0,.6);color:#e8eefc;text-align:center">
    ${heroSvg(i, 96, { lvl: lv })}<div style="font-weight:900;font-size:18px;margin-top:2px">${L2(KN[i][0], KN[i][1])}</div><div style="font-size:12px;opacity:.75;margin:2px 0 4px">🪐 Galaxy · ${L2('Stufe', 'Level')} ${lv}/5 · 🪙 ${coins}</div>
    <div style="font-size:11px;opacity:.7">${L2('Die Stufe gilt nur für Galaxy. Brain Fruit hat eigene Stufen, der Held gehört dir in beiden Spielen.', 'This level only counts in Galaxy. Brain Fruit has its own levels; the hero is yours in both games.')}</div>
    ${rows}<div id="bgUpMsg" style="min-height:18px;font-size:12px;color:#ffc446;margin-top:8px"></div>
    ${lv < 5 ? `<button class="btn btn-primary btn-block" id="bgUpGo">⬆ ${L2('Auf Stufe ', 'To level ')}${lv + 1} · ${LVC[lv]} 🪙</button>` : `<div style="font-weight:900;color:#c6ff3d;margin-top:6px">★ ${L2('Höchste Stufe erreicht', 'Max level reached')}</div>`}
    <button class="btn btn-ghost btn-block" id="bgUpX" style="margin-top:8px">${L2('Schließen', 'Close')}</button></div>`;
  document.body.appendChild(o);
  o.onclick = e => { if(e.target === o){ o.remove(); showHeroes(); } }; o.querySelector('#bgUpX').onclick = () => { o.remove(); showHeroes(); };
  const go = o.querySelector('#bgUpGo');
  if(go) go.onclick = () => {
    if(typeof fruitPay !== 'function') return; const r = fruitPay(LVC[lv]);
    if(!r.ok){ o.querySelector('#bgUpMsg').textContent = r.why === 'coins' ? L2('Nicht genug Münzen.', 'Not enough coins.') : L2('Bitte anmelden.', 'Please log in.'); return; }
    const ks = kArr('galaxyKL'); ks[i] = lv + 1; kArrSet('galaxyKL', ks); o.remove(); upgradeWin(i);
  };
}
function play(){
  heroLoad(); let best = 0; try{ best = +localStorage.getItem('bp_galaxy_best') || 0; }catch(e){}
  fresh(best); G.back = BACK; if(raf){ cancelAnimationFrame(raf); raf = 0; }
  renderApp(`<div class="panel" id="bgApp" style="text-align:center">
    <div style="display:flex;align-items:center;gap:10px"><div class="picker-title" style="margin:0;flex:1;text-align:left">🪐 BRAIN GALAXY</div><button class="btn btn-ghost" style="padding:6px 12px;font-size:12px" onclick="BGX.heroes()">👑 ${L2(KN[HERO][0], KN[HERO][1])}</button></div>
    <div style="display:flex;justify-content:space-around;margin:8px 0;font-weight:800;font-size:14px"><span>${L2('Punkte', 'Score')} <b id="bgSc" style="color:#c6ff3d;font-size:19px">0</b></span><span>${L2('Rekord', 'Best')} <b id="bgBest">0</b></span><span>${L2('Welle', 'Wave')} <b id="bgWave">1</b></span><span id="bgCombo" style="min-width:42px"></span></div>
    <div style="height:7px;border-radius:99px;background:rgba(255,255,255,.1);overflow:hidden;margin-bottom:8px" title="${L2('Leiste: füllt sich, gibt Bomben und Raketen', 'Bar: fills up, gives bombs and rockets')}"><div id="bgBar" style="height:100%;width:0;background:linear-gradient(90deg,#ffb04a,#3de0ff);transition:width .25s"></div></div>
    <canvas id="bgCv" width="${W * 2}" height="${H * 2}" style="width:100%;max-width:420px;border-radius:18px;display:block;margin:0 auto;touch-action:none;background:#080c1c"></canvas>
    <div style="display:flex;gap:8px;margin-top:10px"><button class="btn btn-ghost" style="flex:1" onclick="BGX.swap()">🔄 ${L2('Tauschen', 'Swap')}</button><button class="btn btn-ghost" id="bgBomb" style="flex:1" onclick="BGX.bomb()">💣</button><button class="btn btn-ghost" id="bgRock" style="flex:1" onclick="BGX.rocket()">🚀</button></div>
    <div style="display:flex;gap:8px;margin-top:8px"><button class="btn btn-ghost" style="flex:1" onclick="BGX.restart()">${L2('Neu starten', 'Restart')}</button><button class="btn btn-ghost" style="flex:1" onclick="BGX.back()">${L2('Zurück', 'Back')}</button></div>
    <div style="font-size:12px;opacity:.75;margin-top:8px;line-height:1.4">${L2('Zielen und loslassen. Rechts getroffen: Galaxie dreht nach rechts, links: nach links. 💣 sprengt rundherum, 🚀 fliegt genau auf deiner Ziellinie mitten durch alles. Berührt die Galaxie den roten Kreis, ist Schluss.', 'Aim and release. Hit the right side and it spins right, left side spins left. 💣 blasts around itself, 🚀 flies along your aim line through everything. If the galaxy touches the red circle, it is over.')}</div>
  </div>`);
  const cv = document.getElementById('bgCv');
  cv.addEventListener('pointerdown', e => { G.aim = point(e, cv); try{ cv.setPointerCapture(e.pointerId); }catch(_){} });
  cv.addEventListener('pointermove', e => { if(e.buttons || e.pointerType === 'mouse') G.aim = point(e, cv); });
  cv.addEventListener('pointerup', e => { G.aim = point(e, cv); fire(); });
  hud(); raf = requestAnimationFrame(loop);
}
function barHtml(){
  heroLoad(); const coins = (typeof fruitCoins === 'function') ? fruitCoins() : 0;
  const av = [0, 1, 2, 3, 4, 5].map(i => `<div style="width:46px;height:46px;border-radius:50%;background:#1b2240;border:2.5px solid ${i === HERO ? '#ffd45a' : '#2a3358'};overflow:hidden;flex:none;${kOwn(i) ? '' : 'opacity:.4;'}">${typeof kingSvg === 'function' ? kingSvg(i, 56).replace('style="display:block;margin:auto"', 'style="display:block;margin:-2px auto 0"') : ''}</div>`).join('');
  return `<div onclick="BGX.open(startBrainingHub)" style="cursor:pointer;margin-top:12px;border-radius:18px;padding:10px 12px;background:rgba(10,14,32,.75);border:1.5px solid #ffd45a;box-shadow:0 0 14px rgba(255,212,90,.25);text-align:left"><div style="display:flex;justify-content:space-between;align-items:center"><b style="font-size:14px">👑 ${L2('Charaktere-Auswahl', 'Hero selection')}</b><span style="font-size:12px;opacity:.85">🪙 ${coins} · ${L2(KN[HERO][0], KN[HERO][1])} ›</span></div><div style="display:flex;gap:8px;margin-top:8px;overflow:hidden">${av}</div><div style="font-size:11px;opacity:.75;margin-top:6px">${L2('Gehören dir in beiden Spielen · Tippen zum Wählen oder Upgraden', 'Yours in both games · tap to choose or upgrade')}</div></div>`;
}
window.BGX = {
  open, play, bar: barHtml, heroes(){ if(raf){ cancelAnimationFrame(raf); raf = 0; } showHeroes(); },
  swap(){ if(!G || G.over || G.shot) return; const t = G.cur; G.cur = G.next; G.next = t; },
  bomb(){ if(!G || G.over || G.shot) return; if(G.bombs > 0){ G.armed = !G.armed; G.rarmed = false; } hud(); },
  rocket(){ if(!G || G.over || G.shot) return; if(G.rockets > 0){ G.rarmed = !G.rarmed; G.armed = false; } hud(); },
  restart(){ if(!G) return; subm(); fresh(Math.max(G.best, G.score)); hud(); },
  back(){ subm(); if(raf){ cancelAnimationFrame(raf); raf = 0; } const b = BACK; G = null; if(b) b(); else renderMainMenu(); }
};
window.__bgEngine = { state: () => G, fire, step, wpos };
})();
