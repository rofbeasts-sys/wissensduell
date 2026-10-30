/* ============================================================================
   BACKGAMMON - Regeln, Bot und Oberflaeche (Mini Game). Zwei Looks: Holz (wie Dame) und Brain Pulse.
   Du (w) ziehst von Punkt 24 nach 1 (Heimfeld 1-6), der Bot (b) von 1 nach 24 (Heimfeld 19-24).
   Zustand: pts[1..24] (+ = deine Steine, - = Bot), bar{w,b}, off{w,b}.
   ============================================================================ */
(function(){
'use strict';
const OPP = s => s === 'w' ? 'b' : 'w';
function startState(){
  const pts = new Array(26).fill(0);
  pts[24] = 2; pts[13] = 5; pts[8] = 3; pts[6] = 5;
  pts[1] = -2; pts[12] = -5; pts[17] = -3; pts[19] = -5;
  return { pts, bar:{ w:0, b:0 }, off:{ w:0, b:0 } };
}
function clone(s){ return { pts:s.pts.slice(), bar:{ w:s.bar.w, b:s.bar.b }, off:{ w:s.off.w, b:s.off.b } }; }
const cnt = (s, p, i) => p === 'w' ? Math.max(s.pts[i], 0) : Math.max(-s.pts[i], 0);
// "from": 0 = Bar (beide), sonst Punkt 1..24. "to": 0 = Raus (beide), sonst Punkt.
function allHome(s, p){
  if(s.bar[p]) return false;
  for(let i = 1; i <= 24; i++){ if(cnt(s, p, i) && (p === 'w' ? i > 6 : i < 19)) return false; }
  return true;
}
function stepsFor(s, p, d){
  const out = [], dir = p === 'w' ? -1 : 1, o = OPP(p);
  const open = to => cnt(s, o, to) < 2;
  if(s.bar[p]){
    const to = p === 'w' ? 25 - d : d;
    if(open(to)) out.push({ from:0, to, die:d, hit: cnt(s, o, to) === 1 });
    return out;
  }
  const home = allHome(s, p);
  for(let i = 1; i <= 24; i++){
    if(!cnt(s, p, i)) continue;
    const to = i + dir * d;
    if(to >= 1 && to <= 24){ if(open(to)) out.push({ from:i, to, die:d, hit: cnt(s, o, to) === 1 }); }
    else if(home){
      const dist = p === 'w' ? i : 25 - i;
      if(dist === d) out.push({ from:i, to:0, die:d, hit:false });
      else if(d > dist){
        let far = 0; for(let k = 1; k <= 24; k++){ if(cnt(s, p, k)){ const dk = p === 'w' ? k : 25 - k; if(dk > far) far = dk; } }
        if(dist === far) out.push({ from:i, to:0, die:d, hit:false });
      }
    }
  }
  return out;
}
function applyStep(s, p, st){
  const n = clone(s), o = OPP(p), sg = p === 'w' ? 1 : -1;
  if(st.from === 0) n.bar[p]--; else n.pts[st.from] -= sg;
  if(st.to === 0) n.off[p]++;
  else { if(st.hit){ n.pts[st.to] = 0; n.bar[o]++; } n.pts[st.to] += sg; }
  return n;
}
// Alle Zugfolgen (maximale Laenge, Regeln: beide Wuerfel wenn moeglich, sonst den groesseren)
function sequences(s, p, dice){
  const ds = dice[0] === dice[1] ? [dice[0], dice[0], dice[0], dice[0]] : dice.slice();
  const res = new Map(); let best = 0;
  function dfs(st, rem, seq){
    let any = false;
    const tried = new Set();
    rem.forEach((d, idx) => {
      if(tried.has(d)) return; tried.add(d);
      const rest = rem.slice(0, idx).concat(rem.slice(idx + 1));
      stepsFor(st, p, d).forEach(m => { any = true; dfs(applyStep(st, p, m), rest, seq.concat([m])); });
    });
    if(!any){
      if(seq.length > best){ best = seq.length; res.clear(); }
      if(seq.length === best) res.set(seq.map(m => m.from + '>' + m.to).join(','), seq);
    }
  }
  dfs(s, ds, []);
  if(best === 0) return []; // kein Zug moeglich
  let list = Array.from(res.values());
  if(best === 1 && dice[0] !== dice[1]){
    const hi = Math.max(dice[0], dice[1]);
    const usingHi = list.filter(q => q[0].die === hi);
    if(usingHi.length) list = usingHi;
  }
  return list;
}
function pip(s, p){
  let t = s.bar[p] * 25;
  for(let i = 1; i <= 24; i++){ const c = cnt(s, p, i); if(c) t += c * (p === 'w' ? i : 25 - i); }
  return t;
}
function evalPos(s, p, hard){
  const o = OPP(p);
  let v = (pip(s, o) - pip(s, p)) * 1.0;
  v += (s.off[p] - s.off[o]) * 3;
  v -= s.bar[p] * 8; v += s.bar[o] * 7;
  const dist = (q, i) => q === 'w' ? i : 25 - i; // Abstand zum eigenen Ziel
  for(let i = 1; i <= 24; i++){
    const c = cnt(s, p, i), co = cnt(s, o, i);
    if(c >= 2){ v += 2.2; const dd = dist(p, i); if(dd <= 6) v += 1.8; if(dd >= 7 && dd <= 12) v += .6; }
    if(c === 1){
      let risk = 0;
      // Gegner-Steine "hinter" dem Blot koennen ihn treffen
      for(let j = 1; j <= 24; j++){
        const cj = cnt(s, o, j); if(!cj) continue;
        const d = o === 'w' ? j - i : i - j; // Abstand, den der Gegner laufen muss
        if(d >= 1 && d <= 6) risk = Math.max(risk, 11 / 36 + (d <= 6 ? .05 : 0));
        else if(d >= 7 && d <= 12) risk = Math.max(risk, 6 / 36);
      }
      if(s.bar[o]) risk = Math.max(risk, 11 / 36);
      v -= (hard ? 14 : 6) * risk * (1 + (24 - dist(p, i)) / 24);
    }
    if(co === 1 && c === 0) v += 0.5;
  }
  return v;
}
function botPick(s, p, dice, level){
  const seqs = sequences(s, p, dice);
  if(!seqs.length) return [];
  if(level === 'easy' && Math.random() < .65) return seqs[Math.floor(Math.random() * seqs.length)];
  let best = null, bv = -1e9;
  let pool = seqs;
  if(level === 'hard' && seqs.length > 8){
    pool = seqs.map(q => { let st = s; q.forEach(m => { st = applyStep(st, p, m); }); return [evalPos(st, p, true), q]; }).sort((a, b) => b[0] - a[0]).slice(0, 8).map(x => x[1]);
  }
  pool.forEach(q => {
    let st = s; q.forEach(m => { st = applyStep(st, p, m); });
    let v = evalPos(st, p, level === 'hard') + (level === 'easy' ? Math.random() * 6 : Math.random() * .3);
    if(level === 'hard'){
      // Antwort des Gegners grob mitrechnen (Durchschnitt ueber ein paar Wuerfe)
      const o = OPP(p); let sum = 0, n = 0;
      for(let a = 1; a <= 6; a++) for(let b = a; b <= 6; b++){
        const w = a === b ? 1 : 2; const rs = sequences(st, o, [a, b]);
        if(!rs.length){ sum += w * evalPos(st, p, true); n += w; continue; }
        let worst = 1e9;
        rs.slice(0, 40).forEach(r2 => { let s2 = st; r2.forEach(m => { s2 = applyStep(s2, o, m); }); const e = evalPos(s2, p, true); if(e < worst) worst = e; });
        sum += w * worst; n += w;
      }
      v = v * .35 + (sum / n) * .65;
    }
    if(v > bv){ bv = v; best = q; }
  });
  return best;
}
function winnerOf(s){ return s.off.w >= 15 ? 'w' : (s.off.b >= 15 ? 'b' : null); }
function winPoints(s, win){
  const lose = OPP(win);
  if(s.off[lose] > 0) return 1;
  // Gammon: Verlierer hat noch nichts draussen; Backgammon: noch Steine auf der Bar/im Heimfeld des Siegers
  let bg = s.bar[lose] > 0;
  for(let i = 1; i <= 24; i++){ if(cnt(s, lose, i) && (win === 'w' ? i <= 6 : i >= 19)) bg = true; }
  return bg ? 3 : 2;
}
window.BG = { startState, clone, cnt, stepsFor, applyStep, sequences, pip, botPick, winnerOf, winPoints, evalPos, OPP };

/* ------------------------------- Oberflaeche ------------------------------- */
let bg = null, bgTimers = [];
const T = (fn, ms) => { const id = setTimeout(fn, ms); bgTimers.push(id); return id; };
function clearT(){ bgTimers.forEach(clearTimeout); bgTimers = []; }
function skin(){ let s = 'wood'; try{ s = localStorage.getItem('bg_skin') || 'wood'; }catch(e){} return s === 'pulse' ? 'pulse' : 'wood'; }
function setSkin(s){ try{ localStorage.setItem('bg_skin', s); }catch(e){} if(bg && bg.state) render(); else intro(); }
const roll = () => 1 + Math.floor(Math.random() * 6);
function pips(n){
  const P = { 1:[[50,50]], 2:[[25,25],[75,75]], 3:[[25,25],[50,50],[75,75]], 4:[[25,25],[75,25],[25,75],[75,75]], 5:[[25,25],[75,25],[50,50],[25,75],[75,75]], 6:[[25,22],[75,22],[25,50],[75,50],[25,78],[75,78]] }[n] || [];
  return P.map(p => `<i style="left:calc(${p[0]}% - 4px);top:calc(${p[1]}% - 4px)"></i>`).join('');
}
const CSS = `<style>
.bgp{--bgl:#c6ff3d;--bgc:#3de0ff}
.bgp .bghd{display:flex;gap:12px;align-items:center}.bgp .bgic{width:54px;height:54px;flex:0 0 54px;border-radius:16px;background:linear-gradient(135deg,#c6ff3d,#3de0ff);display:grid;place-items:center;color:#0b1024;box-shadow:0 6px 20px #3de0ff44}
.bgp h1{margin:0;font-size:26px}.bgp .bgsub{color:#9aa5c8;font-size:13px;margin-top:2px}
.bgp .bglab{margin:16px 2px 8px;font-size:11px;font-weight:800;letter-spacing:1.4px;color:#8d97b5}
.bgp .bgseg{display:flex;gap:8px}.bgp .bgseg button{flex:1;padding:12px 6px;border-radius:14px;background:#ffffff0d;border:1.5px solid #ffffff22;color:#fff;font-weight:800;font-size:14px;cursor:pointer}
.bgp .bgseg button.on{border-color:#c6ff3d;color:#c6ff3d;box-shadow:0 0 18px -8px #c6ff3d}
.bgp .bggo{display:block;width:100%;margin-top:16px;border:0;border-radius:16px;padding:15px;font-weight:900;font-size:16px;color:#0b1024;background:linear-gradient(90deg,#c6ff3d,#3de0ff);cursor:pointer}
.bgp .bgback{display:block;width:100%;margin-top:12px;background:none;border:0;color:#9aa5c8;font-weight:700;font-size:14px;cursor:pointer}
.bgp .bgpl{display:flex;align-items:center;gap:10px;background:#ffffff0d;border:1.5px solid #ffffff1a;border-radius:14px;padding:7px 10px;margin:8px 0}
.bgp .bgpl.bgact{border-color:#c6ff3d;box-shadow:0 0 18px -6px #c6ff3d}.bgp .bgpl b{font-size:14px}.bgp .bgpl small{display:block;color:#9aa5c8;font-size:11px}.bgp .bgpl .bgr{margin-left:auto;font-size:12px;color:#9aa5c8;text-align:right}
.bgp .bgav{width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:13px}
.bgb{position:relative;width:calc(100% + 18px);max-width:540px;margin:8px -9px;aspect-ratio:380/470;border-radius:18px;padding:8px 36px 8px 8px;user-select:none;-webkit-user-select:none;touch-action:manipulation}
.bgb .row{position:absolute;left:8px;right:36px;height:42.5%;display:flex;z-index:1}.bgb .row.t{top:2%}.bgb .row.b{bottom:2%}
.bgb .pt{flex:1;position:relative;height:100%;cursor:pointer}
.bgb .tri{position:absolute;left:2px;right:2px;top:0;bottom:0;clip-path:polygon(0 0,100% 0,50% 100%)}
.bgb .b .tri{clip-path:polygon(0 100%,100% 100%,50% 0)}
.bgb .bar{width:6.5%;flex:none;position:relative;cursor:pointer;margin:-2% 0}
.bgb .stack{position:absolute;left:0;right:0;display:flex;flex-direction:column;align-items:center}
.bgb .t .stack{top:1%}.bgb .b .stack{bottom:1%;flex-direction:column-reverse}
.bgb .ck{width:88%;max-width:42px;aspect-ratio:1;border-radius:50%;margin-bottom:-12%;position:relative;flex:none;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:900}
.bgb .t .ck{margin-bottom:0;margin-top:-12%}
.bgb .ck:after{content:"";position:absolute;inset:22%;border-radius:50%;border:1.5px solid rgba(0,0,0,.2)}
.bgb .ck.sel{transform:translateY(-3px);z-index:5}.bgb .t .ck.sel{transform:translateY(3px)}
.bgb .tgt{position:absolute;left:50%;width:70%;max-width:34px;aspect-ratio:1;transform:translateX(-50%);border-radius:50%;z-index:4;pointer-events:none}
.bgb .t .tgt{top:2%}.bgb .b .tgt{bottom:2%}
.bgb .mid{position:absolute;left:8px;right:36px;top:50%;height:12%;margin-top:-6%;display:flex;align-items:center;justify-content:center;gap:14px;z-index:3}
.bgb .die{width:46px;height:46px;border-radius:11px;position:relative;transform:rotate(-8deg)}.bgb .die.dB{transform:rotate(9deg)}.bgb .die.used{opacity:.3}
.bgb .die i{position:absolute;width:8px;height:8px;border-radius:50%}
.bgb .off{position:absolute;right:6px;top:2%;bottom:2%;width:30px;border-radius:8px;display:flex;flex-direction:column;justify-content:space-between;padding:3px;align-items:center;z-index:2;cursor:pointer}
.bgb .offg{display:flex;flex-direction:column;gap:1px;align-items:center}.bgb .offg.bt{justify-content:flex-end}
.bgb .offg span{width:22px;height:6px;border-radius:2px;display:block}
.bgb .barst{position:absolute;left:0;right:0;display:flex;flex-direction:column;align-items:center;z-index:2}
.bgb .offtgt{position:absolute;left:-2px;right:-2px;bottom:-2px;height:46%;border-radius:8px;pointer-events:none}
.bgp .rollbtn{display:block;margin:8px auto;border:0;border-radius:16px;padding:13px 30px;font-weight:900;font-size:16px;color:#0b1024;background:linear-gradient(90deg,#c6ff3d,#3de0ff);cursor:pointer}
.bgp .bgmsg{text-align:center;font-size:13px;color:#9aa5c8;margin:6px 0;min-height:18px}
.bgp .bgacts{display:flex;gap:8px;margin-top:8px}.bgp .bgacts button{flex:1;border:1.5px solid #ffffff22;background:#ffffff0d;color:#fff;border-radius:14px;padding:12px 6px;font-weight:800;font-size:14px;cursor:pointer}
.bgp .bgacts button:disabled{opacity:.4}
.bgov{position:fixed;inset:0;z-index:80;background:rgba(5,7,12,.7);display:flex;align-items:center;justify-content:center;padding:22px}
.bgov .rc{width:100%;max-width:380px;background:#151b2b;border:2px solid #c6ff3d;border-radius:24px;padding:24px 18px;text-align:center;box-shadow:0 0 60px -10px rgba(198,255,61,.6);color:#fff}
.bgov h2{margin:6px 0 0;font-size:28px}.bgov p{color:#9aa5c8;font-size:14px;margin:6px 0 14px}
.bgov button{display:block;width:100%;border:0;border-radius:14px;padding:13px;font-weight:900;font-size:15px;cursor:pointer;margin-top:8px}
.bgov .sc{display:flex;justify-content:space-around;margin:6px 0 10px}.bgov .sc div{font-size:11px;color:#9aa5c8}.bgov .sc b{display:block;font-size:26px;color:#fff}
/* ---------- Look: Holz ---------- */
.bgb.wood{background:linear-gradient(#5a3a22,#4a2e1a);border:3px solid #2a170a;box-shadow:0 14px 30px #0009,inset 0 0 0 3px #7a5537,inset 0 0 22px rgba(0,0,0,.45)}
.bgb.wood:before{content:"";position:absolute;left:14px;right:42px;top:14px;bottom:14px;background:#ebdcbc;border-radius:6px;box-shadow:inset 0 0 14px rgba(90,55,20,.5)}
.bgb.wood .pt.o .tri{background:linear-gradient(#8a5c3a,#6e4529)}.bgb.wood .b .pt.o .tri{background:linear-gradient(0deg,#8a5c3a,#6e4529)}
.bgb.wood .pt.e .tri{background:linear-gradient(#d9b98a,#c39a62)}.bgb.wood .b .pt.e .tri{background:linear-gradient(0deg,#d9b98a,#c39a62)}
.bgb.wood .bar{background:linear-gradient(90deg,#5a3a22,#7a5537,#5a3a22);border-left:1.5px solid #2a170a;border-right:1.5px solid #2a170a}
.bgb.wood .ck.w{background:radial-gradient(circle at 35% 30%,#f5dfae,#ebcd96 35%,#aa783c);border:2px solid #1e0f05;box-shadow:0 3px 5px rgba(0,0,0,.5),inset 0 0 0 5px rgba(0,0,0,.1)}
.bgb.wood .ck.b{background:radial-gradient(circle at 35% 30%,#7a4e34,#5a3723 45%,#28160c);border:2px solid #1e0f05;box-shadow:0 3px 5px rgba(0,0,0,.55),inset 0 0 0 5px rgba(0,0,0,.2);color:#ebdcbc}
.bgb.wood .ck.w{color:#3a2208}.bgb.wood .ck.sel{box-shadow:0 0 0 3px #7cff8c,0 0 16px 4px rgba(124,255,140,.8)}
.bgb.wood .tgt{background:rgba(124,255,140,.4);border:2px solid #7cff8c;box-shadow:0 0 12px #7cff8c}
.bgb.wood .die{background:linear-gradient(#fffaf0,#ecdcb8);box-shadow:0 5px 8px #0008,inset 0 -3px 0 rgba(120,80,30,.25)}.bgb.wood .die i{background:#2a170a}
.bgb.wood .off{background:#2a170a;border:1.5px solid #7a5537}.bgb.wood .offtgt{background:rgba(124,255,140,.3);box-shadow:0 0 12px #7cff8c}
/* ---------- Look: Brain Pulse ---------- */
.bgb.pulse{background:linear-gradient(#171e33,#10162a);border:1.5px solid #2c3556;box-shadow:0 14px 30px #0008}
.bgb.pulse .pt.o .tri{background:linear-gradient(#4a5fae,#3a4a8c)}.bgb.pulse .b .pt.o .tri{background:linear-gradient(0deg,#4a5fae,#3a4a8c)}
.bgb.pulse .pt.e .tri{background:linear-gradient(#2b3566,#232c58)}.bgb.pulse .b .pt.e .tri{background:linear-gradient(0deg,#2b3566,#232c58)}
.bgb.pulse .bar{background:#0b0f1e;border-left:1.5px solid #2c3556;border-right:1.5px solid #2c3556}
.bgb.pulse .ck.w{background:radial-gradient(circle at 35% 30%,#e7ff9c,#c6ff3d 55%,#8fcb18);box-shadow:0 3px 4px #0007,inset 0 -3px 0 rgba(0,0,0,.2),inset 0 2px 0 rgba(255,255,255,.4);color:#1b2a05}
.bgb.pulse .ck.b{background:radial-gradient(circle at 35% 30%,#ffb1c9,#ff5d8f 55%,#c8305f);box-shadow:0 3px 4px #0007,inset 0 -3px 0 rgba(0,0,0,.2),inset 0 2px 0 rgba(255,255,255,.4);color:#3a0618}
.bgb.pulse .ck.sel{box-shadow:0 0 0 3px #fff,0 0 16px 4px #c6ff3d}
.bgb.pulse .tgt{background:rgba(198,255,61,.25);border:2px solid #c6ff3d;box-shadow:0 0 14px #c6ff3d}
.bgb.pulse .die{background:#fff;box-shadow:0 5px 8px #0008,inset 0 -3px 0 rgba(0,0,0,.14)}.bgb.pulse .die i{background:#10131f}
.bgb.pulse .off{background:#0b0f1e;border:1.5px solid #2c3556}.bgb.pulse .offtgt{background:rgba(198,255,61,.28);box-shadow:0 0 12px #c6ff3d}
</style>`;
const LVL = { easy:['Leicht','Easy'], normal:['Normal','Normal'], hard:['Schwer','Hard'] };

function intro(msg){
  clearT(); bg = null;
  const sk = skin(); let lv = 'normal', tg = 3;
  try{ lv = localStorage.getItem('bg_lv') || 'normal'; tg = +(localStorage.getItem('bg_tg') || 3); }catch(e){}
  const seg = (arr, cur, fn) => `<div class="bgseg">${arr.map(a => `<button class="${a[0] === cur ? 'on' : ''}" onclick="${fn}('${a[0]}')">${a[1]}</button>`).join('')}</div>`;
  renderApp(`${CSS}
  <div class="panel bgp">
    <div class="bghd"><div class="bgic"><svg viewBox="0 0 40 40" width="34" height="34"><path d="M5 34L11 6L17 34ZM18 34L24 6L30 34Z" fill="#0b1024"/><circle cx="31" cy="28" r="5" fill="#0b1024"/></svg></div><div><h1>BACKGAMMON</h1><div class="bgsub">${L('Würfeln, ziehen, Steine rauswerfen. Wer zuerst alle 15 Steine draußen hat, gewinnt.','Roll, move, hit. First to bear off all 15 checkers wins.')}</div></div></div>
    ${msg ? `<div class="bgmsg" style="color:#ff8a8a">${esc(msg)}</div>` : ''}
    <div class="bglab">${L('BOT-STÄRKE','BOT LEVEL')}</div>
    ${seg([['easy', L('Leicht','Easy')], ['normal', 'Normal'], ['hard', L('Schwer','Hard')]], lv, 'BG.setLv')}
    <div class="bglab">${L('SPIELLÄNGE (PUNKTE)','MATCH LENGTH (POINTS)')}</div>
    ${seg([['1', L('1 Partie','1 game')], ['3', L('Bis 3','To 3')], ['5', L('Bis 5','To 5')]], String(tg), 'BG.setTg')}
    <div class="settings-track" style="margin-top:6px;font-size:12px;color:#9aa5c8">${L('Gewinn zählt 1 Punkt, Gammon 2, Backgammon 3.','A win is 1 point, gammon 2, backgammon 3.')}</div>
    <div class="bglab">${L('LOOK','LOOK')}</div>
    ${seg([['wood', L('Holz','Wood')], ['pulse', 'Brain Pulse']], sk, 'BG.setSkin')}
    <button class="bggo" onclick="BG.start()">${L('SPIEL STARTEN','START GAME')}</button>
    <div class="settings-track" style="text-align:center;margin-top:8px">${L('Bot-Spiele zählen nicht für Brainups.','Bot games do not give Brainups.')}</div>
    <button class="bgback" onclick="renderMainMenu()">← ${L('Zurück','Back')}</button>
  </div>`);
}
function startGame(){
  clearT();
  let lv = 'normal', tg = 3; try{ lv = localStorage.getItem('bg_lv') || 'normal'; tg = +(localStorage.getItem('bg_tg') || 3); }catch(e){}
  bg = { level: lv, target: tg, score:{ w:0, b:0 }, game: 0 };
  newGame();
}
function newGame(){
  clearT();
  bg.state = startState(); bg.game++; bg.turn = null; bg.dice = null; bg.seqs = []; bg.played = []; bg.sel = null; bg.over = false; bg.busy = true;
  bg.msg = L('Wer die höhere Zahl würfelt, fängt an.','Higher roll starts.'); bg.open = null;
  render();
  T(() => { let a, b; do{ a = roll(); b = roll(); }while(a === b); bg.open = [a, b]; bg.turn = a > b ? 'w' : 'b'; bg.dice = [a, b]; bg.msg = (bg.turn === 'w' ? L('Du fängst an','You start') : L('Der Bot fängt an','Bot starts')) + ' (' + a + ' : ' + b + ')'; beginMoves(); }, 900);
}
function beginRoll(){ // Spieler tippt "Wuerfeln"
  if(!bg || bg.over || bg.turn !== 'w' || bg.dice) return;
  bg.dice = [roll(), roll()]; beginMoves();
}
function beginMoves(){
  bg.seqs = sequences(bg.state, bg.turn, bg.dice); bg.played = []; bg.sel = null; bg.busy = false;
  if(!bg.seqs.length){ bg.msg = bg.turn === 'w' ? L('Kein Zug möglich.','No move possible.') : L('Bot kann nicht ziehen.','Bot cannot move.'); bg.busy = true; render(); T(endTurn, 1400); return; }
  if(bg.turn === 'b'){ bg.busy = true; render(); T(botPlay, 800); return; }
  bg.msg = L('Tippe einen Stein, dann das Zielfeld.','Tap a checker, then the target.'); render();
}
function nextSteps(){ // moegliche naechste Schritte
  const k = bg.played.length, key = bg.played.map(m => m.from + '>' + m.to).join(',');
  const out = [];
  bg.seqs.forEach(q => { if(q.length > k && q.slice(0, k).map(m => m.from + '>' + m.to).join(',') === key){ const m = q[k]; if(!out.some(o => o.from === m.from && o.to === m.to)) out.push(m); } });
  return out;
}
function doStep(m){
  bg.state = applyStep(bg.state, bg.turn, m); bg.played.push(m); bg.sel = null;
  const w = winnerOf(bg.state);
  if(w){ bg.over = true; bg.winner = w; render(); T(() => finish(w), 700); return; }
  if(!nextSteps().length){ bg.busy = true; render(); T(endTurn, 650); return; }
  render();
}
function endTurn(){
  if(!bg || bg.over) return;
  bg.turn = OPP(bg.turn); bg.dice = null; bg.seqs = []; bg.played = []; bg.sel = null; bg.busy = false;
  if(bg.turn === 'w'){ bg.msg = L('Du bist dran, würfle.','Your turn, roll.'); render(); }
  else { bg.busy = true; bg.msg = L('Bot würfelt …','Bot rolls …'); render(); T(() => { bg.dice = [roll(), roll()]; beginMoves(); }, 700); }
}
function botPlay(){
  if(!bg || bg.over) return;
  const seq = botPick(bg.state, 'b', bg.dice, bg.level) || [];
  bg.msg = L('Bot zieht …','Bot moves …');
  let i = 0;
  const step = () => {
    if(!bg || bg.over) return;
    if(i >= seq.length){ T(endTurn, 500); return; }
    const m = seq[i++]; bg.state = applyStep(bg.state, 'b', m); bg.played.push(m);
    const w = winnerOf(bg.state); if(w){ bg.over = true; bg.winner = w; render(); T(() => finish(w), 700); return; }
    render(); T(step, 650);
  };
  step();
}
function onPoint(i){
  if(!bg || bg.over || bg.busy || bg.turn !== 'w' || !bg.dice) return;
  const ns = nextSteps();
  if(bg.sel !== null){
    const m = ns.find(x => x.from === bg.sel && x.to === i);
    if(m){ doStep(m); return; }
  }
  // Stein waehlen (Bar hat Vorrang: i === 0 steht fuer die Bar)
  const cand = ns.filter(x => x.from === i);
  if(cand.length){ bg.sel = (bg.sel === i ? null : i); render(); if(bg.sel !== null && cand.length === 1 && false) doStep(cand[0]); }
  else if(bg.sel !== null){ bg.sel = null; render(); }
}
function tapOff(){
  if(!bg || bg.over || bg.busy || bg.turn !== 'w' || bg.sel === null) return;
  const m = nextSteps().find(x => x.from === bg.sel && x.to === 0); if(m) doStep(m);
}
function undo(){
  if(!bg || bg.over || bg.busy || bg.turn !== 'w' || !bg.played.length) return;
  const keep = bg.played.slice(0, -1); let st = bg.snapshot; // Zustand zum Zugbeginn neu aufbauen
  st = bg.turnStart; keep.forEach(m => { st = applyStep(st, 'w', m); });
  bg.state = st; bg.played = keep; bg.sel = null; render();
}
function hint(){
  if(!bg || bg.over || bg.busy || bg.turn !== 'w' || !bg.dice) return;
  const best = botPick(bg.turnStart || bg.state, 'w', bg.dice, 'normal');
  const ns = nextSteps(); if(!ns.length) return;
  // Den ersten Schritt der besten Folge zeigen, die zu bisher gespielten Zuegen passt
  const k = bg.played.length; let pick = ns[0];
  if(best && best.length > k && best.slice(0, k).every((m, j) => m.from === bg.played[j].from && m.to === bg.played[j].to)){ const m = best[k]; const f = ns.find(x => x.from === m.from && x.to === m.to); if(f) pick = f; }
  bg.sel = pick.from; bg.msg = L('Tipp: von ','Tip: from ') + (pick.from === 0 ? 'Bar' : pick.from) + L(' nach ',' to ') + (pick.to === 0 ? L('Raus','off') : pick.to); render();
}
function finish(w){
  const pts = winPoints(bg.state, w); bg.score[w] += pts; bg.lastPts = pts; bg.lastWin = w;
  const done = bg.score[w] >= bg.target;
  const kind = pts === 3 ? 'Backgammon!' : pts === 2 ? 'Gammon!' : (w === 'w' ? L('Gewonnen!','You win!') : L('Verloren','You lose'));
  const ov = document.createElement('div'); ov.className = 'bgov'; ov.id = 'bgOv';
  ov.innerHTML = `<div class="rc"><div style="font-size:12px;letter-spacing:3px;color:#c6ff3d;font-weight:800">${w === 'w' ? L('DU GEWINNST','YOU WIN') : L('BOT GEWINNT','BOT WINS')}${done ? ' · ' + L('MATCH','MATCH') : ''}</div>
    <h2>${kind}</h2><p>${pts > 1 ? L('Das zählt ' + pts + ' Punkte.', 'Worth ' + pts + ' points.') : L('Das zählt 1 Punkt.', 'Worth 1 point.')}</p>
    <div class="sc"><div><b>${bg.score.w}</b>${L('Du','You')}</div><div><b>${bg.target}</b>${L('Ziel','Goal')}</div><div><b>${bg.score.b}</b>Bot</div></div>
    ${done ? `<button style="background:linear-gradient(90deg,#c6ff3d,#3de0ff);color:#0b1024" onclick="BG.start()">${L('NOCH EIN MATCH','PLAY AGAIN')}</button>` : `<button style="background:linear-gradient(90deg,#c6ff3d,#3de0ff);color:#0b1024" onclick="BG.next()">${L('NÄCHSTE PARTIE','NEXT GAME')}</button>`}
    <button style="background:#1c2338;color:#fff" onclick="BG.intro()">${L('Zur Übersicht','Overview')}</button></div>`;
  document.body.appendChild(ov);
}
function render(){
  if(!bg || !bg.state) return;
  const ov = document.getElementById('bgOv'); if(ov) ov.remove();
  const sk = skin(), s = bg.state;
  // Zugbeginn merken (fuer Zurueck): Zustand vor dem ersten Schritt dieses Zuges
  if(bg.turn === 'w' && bg.dice && !bg.played.length) bg.turnStart = clone(s);
  const ns = (bg.turn === 'w' && !bg.busy && bg.dice) ? nextSteps() : [];
  if(bg.sel === null && ns.length && ns.every(m => m.from === ns[0].from)) bg.sel = ns[0].from;
  const tgts = new Set(), starts = new Set(); let offTgt = false;
  ns.forEach(m => starts.add(m.from));
  if(bg.sel !== null) ns.filter(m => m.from === bg.sel).forEach(m => { if(m.to === 0) offTgt = true; else tgts.add(m.to); });
  const stack = (i, side) => {
    const c = Math.abs(s.pts[i]); if(!c) return '';
    const who = s.pts[i] > 0 ? 'w' : 'b', shown = Math.min(c, 5), cks = [];
    for(let k = 0; k < shown; k++){
      const last = k === shown - 1;
      cks.push(`<div class="ck ${who}${last && bg.sel === i && who === 'w' ? ' sel' : ''}">${last && c > 5 ? c : ''}</div>`);
    }
    return `<div class="stack">${cks.join('')}</div>`;
  };
  const pt = (i, k, top) => {
    const odd = top ? k % 2 === 0 : k % 2 === 1;
    const hl = starts.has(i) && bg.sel === null ? 'outline:0;' : '';
    return `<div class="pt ${odd ? 'o' : 'e'}" onclick="BG.pt(${i})"><div class="tri"></div>${stack(i)}${tgts.has(i) ? '<div class="tgt"></div>' : ''}</div>`;
  };
  let top = '', bot = '';
  for(let k = 0; k < 12; k++){ top += (k === 6 ? `<div class="bar" onclick="BG.pt(0)"></div>` : '') + pt(13 + k, k, true); }
  for(let k = 0; k < 12; k++){ bot += (k === 6 ? `<div class="bar" onclick="BG.pt(0)"></div>` : '') + pt(12 - k, k, false); }
  const dieHtml = (v, cls, used) => `<div class="die ${cls}${used ? ' used' : ''}">${pips(v)}</div>`;
  let usedA = false, usedB = false;
  if(bg.dice){ const used = bg.played.map(m => m.die).slice(); const d = bg.dice; if(d[0] === d[1]){ const n = used.length; usedA = n >= 2; usedB = n >= 4; } else { const iA = used.indexOf(d[0]); if(iA >= 0){ usedA = true; used.splice(iA, 1); } if(used.indexOf(d[1]) >= 0) usedB = true; } }
  const mid = bg.dice ? `<div class="mid">${dieHtml(bg.dice[0], '', usedA)}${dieHtml(bg.dice[1], 'dB', usedB)}${bg.dice[0] === bg.dice[1] ? `<span style="font-size:11px;font-weight:900;color:${sk === 'wood' ? '#2a170a' : '#c6ff3d'}">×4</span>` : ''}</div>` : '';
  // Bar-Steine (in der Mitte der Leiste)
  const barW = s.bar.w, barB = s.bar.b;
  const barHtml = (barB || barW) ? `<div style="position:absolute;left:calc(8px + 46.7%);width:6.5%;top:0;bottom:0;z-index:2;pointer-events:none"><div class="barst" style="top:18%">${Array.from({ length: Math.min(barB, 4) }, () => '<div class="ck b" style="margin:1px 0"></div>').join('')}</div><div class="barst" style="bottom:18%;${bg.sel === 0 ? '' : ''}">${Array.from({ length: Math.min(barW, 4) }, (_, k) => `<div class="ck w${bg.sel === 0 && k === Math.min(barW, 4) - 1 ? ' sel' : ''}" style="margin:1px 0"></div>`).join('')}</div></div>` : '';
  const offHtml = `<div class="off" onclick="BG.off()"><div class="offg">${('<span style="background:' + (sk === 'wood' ? '#5a3723' : '#ff5d8f') + '"></span>').repeat(Math.min(s.off.b, 15))}</div><div class="offg bt">${('<span style="background:' + (sk === 'wood' ? '#ebcd96' : '#c6ff3d') + '"></span>').repeat(Math.min(s.off.w, 15))}</div>${offTgt ? '<div class="offtgt"></div>' : ''}</div>`;
  const pW = pip(s, 'w'), pB = pip(s, 'b');
  const avW = sk === 'wood' ? 'background:#ebcd96;color:#3a2208' : 'background:#c6ff3d;color:#0b1024';
  const avB = sk === 'wood' ? 'background:#5a3723;color:#ebdcbc' : 'background:#ff5d8f;color:#2a0614';
  const nm = (typeof account !== 'undefined' && account && account.profile && account.profile.username) || L('Du','You');
  const canRoll = bg.turn === 'w' && !bg.dice && !bg.busy && !bg.over;
  renderApp(`${CSS}
  <div class="panel bgp">
    <div style="display:flex;gap:8px;align-items:center;justify-content:center;font-size:13px;font-weight:800;color:#9aa5c8"><span>BACKGAMMON</span><span>·</span><span>${L('Partie','Game')} ${bg.game}</span><span>·</span><span>${L('Bis','To')} ${bg.target}</span></div>
    <div class="bgpl ${bg.turn === 'b' ? 'bgact' : ''}"><div class="bgav" style="${avB}">B</div><div><b>Bot · ${LVL[bg.level][currentLang === 'de' ? 0 : 1]}</b><small>${L('Draußen','Off')}: ${s.off.b} · Bar: ${s.bar.b}</small></div><div class="bgr">Pip ${pB}<br><b style="color:#fff">${bg.score.b}</b> ${L('Pkt','pts')}</div></div>
    <div class="bgb ${sk}" id="bgBoard"><div class="row t">${top}</div>${mid}<div class="row b">${bot}</div>${barHtml}${offHtml}</div>
    ${canRoll ? `<button class="rollbtn" onclick="BG.roll()">${L('WÜRFELN','ROLL')}</button>` : `<div class="bgmsg">${esc(bg.msg || '')}</div>`}
    <div class="bgpl ${bg.turn === 'w' ? 'bgact' : ''}"><div class="bgav" style="${avW}">${esc((nm[0] || 'M').toUpperCase())}</div><div><b>${esc(nm)}</b><small>${L('Draußen','Off')}: ${s.off.w} · Bar: ${s.bar.w}</small></div><div class="bgr">Pip ${pW}<br><b style="color:#fff">${bg.score.w}</b> ${L('Pkt','pts')}</div></div>
    <div class="bgacts"><button onclick="BG.undo()" ${bg.played.length && bg.turn === 'w' && !bg.busy ? '' : 'disabled'}>↩ ${L('Zurück','Undo')}</button><button onclick="BG.hint()" ${bg.dice && bg.turn === 'w' && !bg.busy ? '' : 'disabled'}>${L('Hinweis','Hint')}</button><button onclick="BG.quit()">${L('Aufgeben','Quit')}</button></div>
    <div class="settings-track" style="text-align:center;margin-top:8px;font-size:12px;color:#9aa5c8">${L('Du ziehst von 24 nach 1. Bot-Spiele zählen nicht für Brainups.','You move from 24 to 1. Bot games do not give Brainups.')}</div>
  </div>`);
}
function quit(){ clearT(); const o = document.getElementById('bgOv'); if(o) o.remove(); bg = null; intro(); }
window.BG = Object.assign(window.BG, {
  intro, start: startGame, next: () => { const o = document.getElementById('bgOv'); if(o) o.remove(); newGame(); },
  roll: beginRoll, pt: onPoint, off: tapOff, undo, hint, quit,
  setSkin, setLv: v => { try{ localStorage.setItem('bg_lv', v); }catch(e){} intro(); },
  setTg: v => { try{ localStorage.setItem('bg_tg', v); }catch(e){} intro(); }
});
window.bgIntro = intro;
})();
