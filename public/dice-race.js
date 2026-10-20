/* ============================================================================
   WUERFEL-RENNEN (Brain Royale Extra, nur Admin-Test) - Version 1: gegen den Computer
   Brett 6 x 11, jeder hat sein eigenes Brett. Start oben (Reihe 0), Ziel unten (Reihe 10).
   Nutzt aus index.html: renderApp, L, brIntro, adminViewOn, featureLocked.
   ============================================================================ */
(function(){
const R = 11, C = 6;
const FIGS = [
  { id:'knight', ic:'🛡️', de:'Ritter', en:'Knight', sp:'Gratis-Schild + 1 Reihe vor', spEn:'Free shield + 1 row', cap:9 },
  { id:'mage',   ic:'🪄', de:'Magier', en:'Mage', sp:'Wurf gratis wiederholen', spEn:'Re-roll for free', cap:9 },
  { id:'thief',  ic:'🗡️', de:'Dieb', en:'Thief', sp:'1 Mana vom Gegner klauen', spEn:'Steal 1 mana', cap:9 },
  { id:'archer', ic:'🏹', de:'Bogenschütze', en:'Archer', sp:'Gegner 1 Reihe zurück', spEn:'Enemy 1 row back', cap:3 },
  { id:'healer', ic:'💚', de:'Heiler', en:'Healer', sp:'+1 ❤️ (voll: +1 Mana)', spEn:'+1 ❤️ (full: +1 mana)', cap:9 },
  { id:'robot',  ic:'🤖', de:'Roboter', en:'Robot', sp:'4/5 wird zu ↓', spEn:'4/5 becomes ↓', cap:3 }
];
const GOOD = ['boost','schild','stern','herz'], BAD = ['loch','drift','mauer','pause','bombe'];
const TI = { boost:'🚀', schild:'🛡️', stern:'⭐', herz:'❤️', loch:'🕳️', drift:'🌀', mauer:'🧱', pause:'⏸️', bombe:'💣' };
const TN = { boost:['Boost','Boost'], schild:['Schild','Shield'], stern:['Stern','Star'], herz:['Herz','Heart'], loch:['Loch','Hole'], drift:['Drift','Drift'], mauer:['Mauer','Wall'], pause:['Pause','Pause'], bombe:['Bombe','Bomb'] };
const INST = {
  neu:{ic:'🎲',c:2,lv:1,de:'Neu würfeln',en:'Re-roll'}, heil:{ic:'💚',c:3,lv:1,de:'Heilung',en:'Heal'},
  feuerball:{ic:'🔥',c:4,lv:15,de:'Feuerball',en:'Fireball'}, schild:{ic:'🛡️',c:3,lv:30,de:'Schild',en:'Shield'},
  richtung:{ic:'🎯',c:4,lv:45,de:'Richtung ↓',en:'Direction ↓'}, eis:{ic:'❄️',c:4,lv:55,de:'Einfrieren',en:'Freeze'},
  turbo:{ic:'⚡',c:5,lv:65,de:'Turbo',en:'Turbo'}, sperre:{ic:'🚧',c:4,lv:75,de:'Sperre',en:'Block'}, tausch:{ic:'🔄',c:6,lv:95,de:'Tausch',en:'Swap'}
};
const DIRS = { 1:[1,0,'↓'], 2:[1,-1,'↙'], 3:[1,1,'↘'], 4:[0,1,'→'], 5:[0,-1,'←'] };
const TIERS = ['Rekrut','Bronze','Silber','Gold','Smaragd','Diamant','Black Knight','Lava','Engel','Legende'];
const TCOL = ['#a07848','#c27a3a','#7fa4ff','#ffd45a','#4be08c','#6fe8ff','#ff3b4e','#ff8a30','#fff2b0','#ff6ad5'];
let g = null, timers = [], drMode = 'normal', drTestLv = 100;

/* ---- XP / Level je Figur (lokal gespeichert) ---- */
const cum = L => L <= 1 ? 0 : Math.floor(62 * Math.pow(L - 1, 1.6));
function lvOf(xp){ let l = 1; while(l < 100 && xp >= cum(l + 1)) l++; return l; }
function xpGet(id){ try{ return parseInt(localStorage.getItem('dr_xp_' + id) || '0', 10) || 0; }catch(e){ return 0; } }
function xpSet(id, v){ if(drMode === 'test') return; try{ localStorage.setItem('dr_xp_' + id, String(v)); }catch(e){} }
function tierOf(l){ return Math.min(9, Math.floor(l / 10)); }
function usesOf(f, lv){ return Math.min(f.cap, 1 + Math.floor(lv / 25)); }
const rnd = n => Math.floor(Math.random() * n);
const pick = a => a[rnd(a.length)];
function tm(fn, ms){ const id = setTimeout(fn, ms); timers.push(id); }
function clr(){ timers.forEach(clearTimeout); timers = []; }
const nm = p => p === 0 ? L('Du','You') : L('Gegner','Enemy');
const figOf = p => FIGS.find(f => f.id === g.fig[p]);

/* ---- Menue ---- */
window.drIntro = function(){
  if(typeof adminViewOn === 'function' && typeof featureLocked === 'function' && featureLocked('brain_royale') && !adminViewOn()){ renderMainMenu(); return; }
  clr(); g = null;
  const cards = FIGS.map(f => {
    const xp = drMode === 'test' ? cum(drTestLv) : xpGet(f.id), lv = lvOf(xp), t = tierOf(lv), nxt = lv >= 100 ? 1 : (xp - cum(lv)) / (cum(lv + 1) - cum(lv));
    return `<div onclick="drStart('${f.id}')" style="cursor:pointer;border:2px solid ${TCOL[t]};border-radius:14px;padding:8px 4px;text-align:center;background:rgba(255,255,255,.05)">
      <div style="font-size:34px">${f.ic}</div><div style="font-weight:800;font-size:14px">${L(f.de, f.en)}</div>
      <div style="font-size:11px;color:${TCOL[t]}">${TIERS[t]} · Lv ${lv}</div>
      <div style="height:5px;border-radius:3px;background:#0006;margin:4px 8px"><div style="height:100%;width:${Math.round(nxt * 100)}%;background:${TCOL[t]};border-radius:3px"></div></div>
      <div style="font-size:10px;color:#9ab;padding:0 4px">${L(f.sp, f.spEn)} · ${usesOf(f, lv)}×</div></div>`;
  }).join('');
  renderApp(`<div class="panel">
    <div class="picker-title">🎲 ${L('WÜRFEL-RENNEN','DICE RACE')} <span style="font-size:12px;color:var(--warn);">ADMIN TEST${drMode === 'test' ? ' · 🧪' : ''}</span></div>
    <div class="picker-sub">${L('Jeder hat sein eigenes Brett. Wer zuerst unten ankommt, gewinnt.','Everyone has their own board. First one at the bottom wins.')}</div>
    <div class="explanation" style="margin:10px 0;text-align:left;">
      🎲 ${L('1 ↓ · 2 ↙ · 3 ↘ · 4 → · 5 ← · 6 Joker (Richtung frei)','1 ↓ · 2 ↙ · 3 ↘ · 4 → · 5 ← · 6 Joker (free direction)')}<br>
      🔷 ${L('Mana: Start 8, max. 10, +1 alle 2 eigenen Runden.','Mana: start 8, max 10, +1 every 2 own turns.')}<br>
      ❤️ ${L('3 Leben. Bei 0 ❤️ geht es zurück an den Start.','3 lives. At 0 ❤️ you go back to start.')}
    </div>
    <div style="display:flex;gap:8px;margin:8px 0">
      <button class="btn ${drMode === 'normal' ? 'btn-primary' : ''}" style="flex:1" onclick="drSetMode('normal')">🎮 ${L('Normal (wie online)', 'Normal (like online)')}</button>
      <button class="btn ${drMode === 'test' ? 'btn-primary' : ''}" style="flex:1" onclick="drSetMode('test')">🧪 ${L('Alles freigeschaltet', 'Everything unlocked')}</button></div>
    ${drMode === 'test' ? `<div class="settings-label">${L('Level der Figur','Figure level')}</div><div style="display:flex;gap:6px;margin:4px 0 8px">${[1, 25, 50, 75, 100].map(l => `<button class="btn ${drTestLv === l ? 'btn-primary' : ''}" style="flex:1;padding:6px 0" onclick="drSetLv(${l})">${l}</button>`).join('')}</div><div class="settings-track">${L('Testmodus: alle 9 Sofort-Fähigkeiten und alle 9 Feld-Fähigkeiten zur Wahl, kein XP.','Test mode: all 9 instant and all 9 field abilities, no XP.')}</div>` : ''}
    <div class="settings-label">${L('Figur wählen (jede hat eigenes Level)','Pick a figure (own level each)')}</div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:6px 0">${cards}</div>
    <div class="actions-row" style="flex-direction:column;gap:8px;"><button class="btn btn-ghost" onclick="brIntro()">${L('Zurück','Back')}</button></div></div>`);
};

/* ---- Start / Aufbau ---- */
window.drSetMode = function(m){ drMode = m; drIntro(); };
window.drSetLv = function(l){ drTestLv = l; drIntro(); };
window.drStart = function(figId){
  clr();
  const lv = drMode === 'test' ? drTestLv : lvOf(xpGet(figId)), opp = pick(FIGS).id;
  g = { fig:[figId, opp], lv:[lv, lv], pos:[[0, 2], [0, 3]], mana:[8, 8], hp:[3, 3], shield:[0, 0], skip:[0, 0], turns:[0, 0],
        tiles:[{}, {}], sp:[null, null], left:[0, 0], used:[{}, {}], rev:[0, 0], undo:[0, 0], inst:[[], []],
        phase:'setup', cur:0, d:null, turbo:false, log:[L('Wähle 5 von 8 Feld-Fähigkeiten.','Pick 5 of 8 field abilities.')], over:false, xpMsg:'' };
  g.left = [usesOf(figOf(0), lv), usesOf(figOf(1), lv)];
  const pool = Object.keys(INST).filter(k => INST[k].lv <= lv);
  g.inst[0] = drMode === 'test' ? Object.keys(INST) : shuffle(pool).slice(0, 4);
  g.inst[1] = shuffle(Object.keys(INST).filter(k => INST[k].lv <= lv)).slice(0, 4);
  g.cards = []; if(drMode === 'test') g.cards = GOOD.concat(BAD); else for(let i = 0; i < 8; i++) g.cards.push(pick(GOOD.concat(BAD)));
  g.chosen = [];
  drSetupRender();
};
function shuffle(a){ a = a.slice(); for(let i = a.length - 1; i > 0; i--){ const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function drSetupRender(){
  const sel = g.chosen;
  const cards = g.cards.map((t, i) => {
    const on = sel.indexOf(i) !== -1, good = GOOD.indexOf(t) !== -1;
    return `<div onclick="drPickCard(${i})" style="cursor:pointer;text-align:center;padding:10px 4px;border-radius:12px;border:3px solid ${on ? '#ffc446' : (good ? '#3ccf7a' : '#ff5d7a')};background:${on ? 'rgba(255,196,70,.2)' : 'rgba(255,255,255,.05)'}">
      <div style="font-size:30px">${TI[t]}</div><div style="font-size:12px;font-weight:700">${L(TN[t][0], TN[t][1])}</div><div style="font-size:10px;color:#9ab">${good ? L('auf dein Brett', 'your board') : L('auf Gegner', 'enemy board')}</div></div>`;
  }).join('');
  const hand = g.inst[0].map(k => `<span style="display:inline-block;margin:2px 4px;padding:4px 8px;border-radius:10px;background:#3a2f8a;font-size:13px">${INST[k].ic} ${L(INST[k].de, INST[k].en)} (${INST[k].c})</span>`).join('');
  renderApp(`<div class="panel"><div class="picker-title">🎲 ${L('AUFBAU','SETUP')} · ${figOf(0).ic} ${L(figOf(0).de, figOf(0).en)} Lv ${g.lv[0]}</div>
    <div class="picker-sub">${L('Tippe 5 Karten an' + (drMode === 'test' ? ' (alle 9 zur Wahl)' : '') + '. Gute landen zufällig auf deinem Brett, schlechte auf dem des Gegners.','Tap 5 cards. Good ones go on your board, bad ones on the enemy board.')} (${sel.length}/5)</div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:8px 0">${cards}</div>
    <div class="settings-label">${L('Deine Sofort-Fähigkeiten (Mana)','Your instant abilities (mana)')}</div><div style="margin:4px 0 10px">${hand}</div>
    <div class="actions-row" style="flex-direction:column;gap:8px;">
      <button class="btn btn-primary" ${sel.length === 5 ? '' : 'disabled style="opacity:.4"'} onclick="drBegin()">${L('Los geht’s','Go')}</button>
      <button class="btn btn-ghost" onclick="drIntro()">${L('Abbrechen','Cancel')}</button></div></div>`);
}
window.drPickCard = function(i){
  const k = g.chosen.indexOf(i);
  if(k !== -1) g.chosen.splice(k, 1); else if(g.chosen.length < 5) g.chosen.push(i);
  drSetupRender();
};
function place(owner, t){
  for(let n = 0; n < 60; n++){
    const key = (1 + rnd(R - 3)) + ',' + rnd(C);
    if(!g.tiles[owner][key] && key !== g.pos[owner].join(',')){ g.tiles[owner][key] = t; return; }
  }
}
window.drBegin = function(){
  if(g.chosen.length !== 5) return;
  g.chosen.forEach(i => { const t = g.cards[i]; place(GOOD.indexOf(t) !== -1 ? 0 : 1, t); });
  // KI: 3 gute + 2 schlechte
  const gs = shuffle(GOOD.concat(GOOD)).slice(0, 3), bs = shuffle(BAD.concat(BAD)).slice(0, 2);
  gs.forEach(t => place(1, t)); bs.forEach(t => place(0, t));
  g.phase = 'play'; g.log = [L('Los! Du beginnst.', 'Go! You start.')];
  startTurn(0);
};

/* ---- Rundenablauf ---- */
function say(s){ g.log.unshift(s); if(g.log.length > 5) g.log.pop(); }
function startTurn(p){
  if(g.over) return;
  g.cur = p; g.locked = false; g.turns[p]++; g.d = null; g.turbo = false; g.rolled = false; g.spUsedNow = false;
  if(g.turns[p] % 2 === 0 && g.mana[p] < 10) g.mana[p]++;
  if(g.skip[p]){ g.skip[p] = 0; say(nm(p) + ': ' + L('Pause – Runde ausgesetzt.', 'Paused – turn skipped.')); render(); tm(() => startTurn(1 - p), 1100); return; }
  g.phase = 'play'; render();
  if(p === 1) tm(aiTurn, 900);
}
function damage(p, n, why){
  g.hp[p] -= n;
  const f = g.fig[p];
  if(g.hp[p] <= 0){
    if(f === 'healer' && g.lv[p] >= 100 && !g.rev[p]){ g.rev[p] = 1; g.hp[p] = 1; say(nm(p) + ': 💚 ' + L('Wiederbelebung!', 'Revive!')); return; }
    g.hp[p] = 3; g.pos[p] = [0, g.pos[p][1]]; say(nm(p) + ': 💥 ' + L('kaputt – zurück zum Start, ❤️ voll', 'broken – back to start, ❤️ full'));
  }
}
function useInst(p, a){
  const I = INST[a]; if(g.inst[p].indexOf(a) === -1 || g.mana[p] < I.c) return false;
  g.mana[p] -= I.c; g.inst[p].splice(g.inst[p].indexOf(a), 1);
  const o = 1 - p; say(nm(p) + ': ' + I.ic + ' ' + L(I.de, I.en));
  if(a === 'heil') g.hp[p] = Math.min(3, g.hp[p] + 1);
  else if(a === 'schild') g.shield[p] = 1;
  else if(a === 'feuerball'){ g.pos[o][0] = Math.max(0, g.pos[o][0] - 2); if(g.shield[o]){ g.shield[o] = 0; say(L('Schild blockt den Schaden!', 'Shield blocks the damage!')); } else damage(o, 2, 'f'); }
  else if(a === 'eis') g.skip[o] = 1;
  else if(a === 'sperre') g.sp[o] = g.pos[o][0] + 1;
  else if(a === 'tausch'){ const t = g.pos[p][0]; g.pos[p][0] = g.pos[o][0]; g.pos[o][0] = t; }
  else if(a === 'turbo') g.turbo = true;
  else if(a === 'richtung'){ g.d = 1; }
  else if(a === 'neu'){ g.d = 1 + rnd(6); }
  return true;
}
function useSpecial(p){
  if(g.left[p] <= 0) return false;
  const f = g.fig[p], o = 1 - p; let ok = false;
  if(f === 'knight' && !g.shield[p]){ g.shield[p] = 1; g.pos[p][0] = Math.min(R - 2, g.pos[p][0] + 1); ok = true; }
  else if(f === 'healer'){ if(g.hp[p] < 3) g.hp[p]++; else if(g.mana[p] < 10) g.mana[p]++; else return false; ok = true; }
  else if(f === 'thief' && g.mana[o] > 0){ g.mana[o]--; g.mana[p] = Math.min(10, g.mana[p] + 1); ok = true; }
  else if(f === 'archer' && g.pos[o][0] > 0){ g.pos[o][0]--; ok = true; }
  else if(f === 'mage' && g.d != null){ g.d = 1 + rnd(6); ok = true; }
  else if(f === 'robot' && (g.d === 4 || g.d === 5)){ g.d = 1; ok = true; }
  if(ok){ g.left[p]--; say(nm(p) + ': ✨ ' + L(figOf(p).sp, figOf(p).spEn)); }
  return ok;
}
function roll(p){ g.d = 1 + rnd(6); g.rolled = true; say(nm(p) + ': 🎲 ' + g.d + (g.d === 6 ? ' Joker' : ' ' + DIRS[g.d][2])); }
function move(p, d){
  const o = 1 - p; const steps = g.turbo ? 2 : 1; const dir = DIRS[d];
  for(let s = 0; s < steps && !g.over; s++){
    const nr = Math.min(R - 1, g.pos[p][0] + dir[0]), nc = Math.max(0, Math.min(C - 1, g.pos[p][1] + dir[1]));
    const key = nr + ',' + nc;
    if(g.tiles[p][key] === 'mauer' || (g.sp[p] === nr && dir[0] > 0)){ say(nm(p) + ': 🧱 ' + L('blockiert!', 'blocked!')); break; }
    g.pos[p] = [nr, nc];
    if(nr >= R - 1){ finish(p); break; }
    const t = g.tiles[p][key];
    if(!t) continue;
    if(t === 'stern'){ g.mana[p] = Math.min(10, g.mana[p] + 2); delete g.tiles[p][key]; say(nm(p) + ': ⭐ +2 Mana'); }
    else if(t === 'herz'){ g.hp[p] = Math.min(3, g.hp[p] + 1); delete g.tiles[p][key]; say(nm(p) + ': ❤️ +1'); }
    else if(t === 'schild'){ g.shield[p] = 1; delete g.tiles[p][key]; say(nm(p) + ': 🛡️'); }
    else if(t === 'boost'){ g.pos[p][0] = Math.min(R - 1, nr + 2); say(nm(p) + ': 🚀 +2'); if(g.pos[p][0] >= R - 1) finish(p); }
    else {
      if(g.fig[p] === 'healer' && g.lv[p] >= 75 && !g.undo[p]){ g.undo[p] = 1; say(nm(p) + ': 💚 ' + L('Rückholer macht die Falle ungeschehen', 'Undo cancels the trap')); continue; }
      if(g.shield[p]){ g.shield[p] = 0; say(nm(p) + ': 🛡️ ' + L('blockt die Falle', 'blocks the trap')); continue; }
      if(t === 'loch'){ g.pos[p][0] = Math.max(0, nr - 2); say(nm(p) + ': 🕳️ −2'); }
      else if(t === 'drift'){ g.pos[p][1] = Math.max(0, Math.min(C - 1, nc + (nc <= 2 ? 2 : -2))); say(nm(p) + ': 🌀 Drift'); }
      else if(t === 'pause'){ g.skip[p] = 1; delete g.tiles[p][key]; say(nm(p) + ': ⏸️ Pause'); }
      else if(t === 'bombe'){ g.pos[p][0] = Math.max(0, nr - 1); delete g.tiles[p][key]; say(nm(p) + ': 💣 −2 ❤️'); damage(p, 2, 'b'); }
    }
  }
  g.sp[p] = null;
}
function endTurn(p){ if(g.over) return; g.locked = true; g.d = null; g.rolled = false; render(); tm(() => startTurn(1 - p), 1000); }
function finish(w){
  g.over = true; g.winner = w;
  const id = g.fig[0], xp0 = xpGet(id), l0 = lvOf(xp0);
  let xp = xp0 + (w === 0 ? 100 : -30); xp = Math.max(0, xp);
  const floorLv = l0 >= 10 ? Math.floor(l0 / 10) * 10 : 1; if(lvOf(xp) < floorLv) xp = cum(floorLv);
  xpSet(id, xp); const l1 = lvOf(xp);
  g.xpMsg = drMode === 'test' ? L('Testmodus – kein XP','Test mode – no XP') : (w === 0 ? '+100 XP' : '−30 XP') + (l1 > l0 ? ' · ⬆️ Level ' + l1 + (tierOf(l1) > tierOf(l0) ? ' · ' + TIERS[tierOf(l1)] + '!' : '') : (l1 < l0 ? ' · ⬇️ Level ' + l1 : ''));
  say(w === 0 ? L('🏆 Du gewinnst!', '🏆 You win!') : L('Der Gegner gewinnt.', 'The enemy wins.'));
  render();
}

/* ---- Spieler-Aktionen ---- */
window.drRoll = function(){ if(!g || g.over || g.locked || g.cur !== 0 || g.rolled) return; roll(0); render(); };
window.drMoveDir = function(d){ if(!g || g.over || g.locked || g.cur !== 0 || !g.rolled) return; g.d = d; const dd = d; move(0, dd); g.rolled = false; endTurn(0); };
window.drGo = function(){ if(!g || g.over || g.locked || g.cur !== 0 || !g.rolled || g.d === 6) return; const d = g.d; move(0, d); g.rolled = false; endTurn(0); };
window.drInst = function(a){ if(!g || g.over || g.locked || g.cur !== 0) return;
  if(a === 'turbo' && g.rolled) return;
  if(['neu', 'richtung'].indexOf(a) !== -1 && !g.rolled) return;
  if(useInst(0, a)){ if(a === 'richtung' || a === 'neu') g.rolled = true; render(); } };
window.drSpecial = function(){ if(!g || g.over || g.locked || g.cur !== 0) return; const needRoll = ['mage', 'robot'].indexOf(g.fig[0]) !== -1; if(needRoll && !g.rolled) return; useSpecial(0); render(); };

/* ---- Computer ---- */
function aiTurn(){
  if(!g || g.over || g.cur !== 1) return;
  const p = 1, o = 0, diff = g.pos[o][0] - g.pos[p][0], has = a => g.inst[p].indexOf(a) !== -1 && g.mana[p] >= INST[a].c;
  const f = g.fig[p];
  if(g.left[p] > 0){
    if(f === 'knight' && !g.shield[p] && g.turns[p] >= 2) useSpecial(p);
    else if(f === 'healer' && (g.hp[p] < 3 || diff >= 2)) useSpecial(p);
    else if(f === 'thief' && g.mana[o] >= 3 && g.mana[p] <= 8) useSpecial(p);
    else if(f === 'archer' && diff >= 0 && g.pos[o][0] > 1) useSpecial(p);
  }
  if(has('heil') && g.hp[p] <= 1) useInst(p, 'heil');
  if(has('feuerball') && (diff >= 0 || g.hp[o] <= 1) && Math.random() < .7) useInst(p, 'feuerball');
  if(has('tausch') && diff >= 3) useInst(p, 'tausch');
  else if(has('sperre') && diff >= 2) useInst(p, 'sperre');
  else if(has('eis') && diff >= 1 && Math.random() < .6) useInst(p, 'eis');
  if(has('turbo') && g.mana[p] >= 9 && Math.random() < .7) useInst(p, 'turbo');
  if(has('schild') && !g.shield[p] && Math.random() < .3) useInst(p, 'schild');
  render();
  tm(() => {
    if(g.over) return;
    roll(p);
    if(g.d === 6) g.d = 1;
    if(g.d === 4 || g.d === 5){
      if(f === 'robot' && g.left[p] > 0) useSpecial(p);
      else if(has('richtung') && g.mana[p] >= 7) useInst(p, 'richtung');
      else if(f === 'mage' && g.left[p] > 0) useSpecial(p);
      else if(has('neu')) useInst(p, 'neu');
    }
    if(g.d === 6) g.d = 1;
    render();
    tm(() => { if(g.over) return; move(p, g.d); g.rolled = false; endTurn(p); }, 900);
  }, 1000);
}

/* ---- Darstellung ---- */
function board(p, small){
  const you = p === 0; const cells = [];
  for(let r = 0; r < R; r++) for(let c = 0; c < C; c++){
    const key = r + ',' + c, t = g.tiles[p][key], here = g.pos[p][0] === r && g.pos[p][1] === c;
    const goal = r === R - 1, start = r === 0;
    const hidden = !you && t && BAD.indexOf(t) === -1 && false;
    const bg = goal ? 'rgba(80,220,120,.25)' : start ? 'rgba(80,180,255,.18)' : ((r + c) % 2 ? 'rgba(255,255,255,.04)' : 'rgba(255,255,255,.09)');
    const blocked = g.sp[p] === r ? 'box-shadow:inset 0 0 0 2px #ff9a3d;' : '';
    cells.push(`<div style="height:26px;display:flex;align-items:center;justify-content:center;border-radius:4px;background:${bg};${blocked}font-size:${small}px;line-height:1">${here ? (you ? '🧍' : '🤖') : (t ? TI[t] : (goal ? '🏁' : ''))}</div>`);
  }
  return `<div style="flex:1"><div style="text-align:center;font-size:12px;margin-bottom:3px;font-weight:700">${you ? L('Dein Brett', 'Your board') : L('Brett des Gegners', 'Enemy board')}</div><div style="display:grid;grid-template-columns:repeat(${C},1fr);gap:2px">${cells.join('')}</div></div>`;
}
function bar(p){
  const f = figOf(p), hearts = '❤️'.repeat(Math.max(0, g.hp[p])) + '🖤'.repeat(Math.max(0, 3 - g.hp[p]));
  return `<div style="display:flex;justify-content:space-between;align-items:center;font-size:13px;padding:3px 2px"><span>${f.ic} <b>${nm(p)}</b> · ${hearts}${g.shield[p] ? ' 🛡️' : ''}${g.skip[p] ? ' ⏸️' : ''}</span><span>🔷 <b>${g.mana[p]}</b>/10 · ✨ ${g.left[p]}×</span></div>`;
}
function render(){
  if(!g || g.phase === 'setup') return;
  const mine = g.cur === 0 && !g.over, rolled = g.rolled;
  const btn = (txt, fn, dis, col) => `<button class="btn" ${dis ? 'disabled' : ''} onclick="${fn}" style="${dis ? 'opacity:.35;' : ''}${col ? 'border-color:' + col : ''};padding:8px 10px;font-size:13px">${txt}</button>`;
  let actions = '';
  if(g.over){
    actions = `<div style="text-align:center;font-size:20px;font-weight:800;margin:8px 0">${g.winner === 0 ? '🏆 ' + L('Gewonnen!', 'Won!') : L('Verloren', 'Lost')}</div><div style="text-align:center;color:#ffd45a;margin-bottom:8px">${g.xpMsg}</div>
      <button class="btn btn-primary" style="width:100%" onclick="drStart('${g.fig[0]}')">${L('Nochmal', 'Again')}</button><button class="btn btn-ghost" style="width:100%;margin-top:6px" onclick="drIntro()">${L('Figuren', 'Figures')}</button>`;
  } else {
    let main;
    if(!mine) main = `<div style="text-align:center;padding:10px;color:#9ab">${L('Gegner ist dran …', 'Enemy’s turn …')}</div>`;
    else if(!rolled) main = `<button class="btn btn-primary" style="width:100%;font-size:18px" onclick="drRoll()">🎲 ${L('Würfeln', 'Roll')}</button>`;
    else if(g.d === 6) main = `<div style="text-align:center;margin-bottom:4px">🎲 6 – Joker: ${L('Richtung wählen', 'choose direction')}</div><div style="display:flex;gap:6px;justify-content:center">${[1, 2, 3, 4, 5].map(k => `<button class="btn btn-primary" onclick="drMoveDir(${k})" style="font-size:20px;padding:6px 12px">${DIRS[k][2]}</button>`).join('')}</div>`;
    else main = `<button class="btn btn-primary" style="width:100%;font-size:18px" onclick="drGo()">🎲 ${g.d} → ${DIRS[g.d][2]} ${L('Gehen', 'Move')}${g.turbo ? ' ⚡×2' : ''}</button>`;
    const needRoll = ['mage', 'robot'].indexOf(g.fig[0]) !== -1;
    const spDis = !mine || g.left[0] <= 0 || (needRoll && !rolled);
    const ib = g.inst[0].map(a => {
      const I = INST[a], dis = !mine || g.mana[0] < I.c || (a === 'turbo' && rolled) || ((a === 'neu' || a === 'richtung') && !rolled);
      return btn(`${I.ic} ${L(I.de, I.en)} <small>${I.c}</small>`, `drInst('${a}')`, dis, '#7b6cff');
    }).join('');
    actions = main + `<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px">${btn('✨ ' + L(figOf(0).sp, figOf(0).spEn) + ' (' + g.left[0] + '×)', 'drSpecial()', spDis, '#ffc446')}${ib}</div>`;
  }
  renderApp(`<div class="panel" style="padding:10px">
    ${bar(1)}
    <div style="display:flex;gap:8px">${board(0, 14)}${board(1, 14)}</div>
    ${bar(0)}
    <div style="margin:8px 0">${actions}</div>
    <div style="font-size:12px;color:#9ab;line-height:1.5;min-height:60px">${g.log.map((x, i) => `<div style="opacity:${1 - i * .18}">${x}</div>`).join('')}</div>
    <button class="btn btn-ghost" style="width:100%;margin-top:6px" onclick="drIntro()">${L('Beenden', 'Quit')}</button></div>`);
}
window.drState = function(){ return g; };
})();
