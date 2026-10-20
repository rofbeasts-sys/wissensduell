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
  neu:{ic:'🎲',c:2,lv:15,de:'Neu würfeln',en:'Re-roll'}, heil:{ic:'💚',c:3,lv:30,de:'Heilung',en:'Heal'},
  feuerball:{ic:'🔥',c:4,lv:45,de:'Feuerball',en:'Fireball'}, schild:{ic:'🛡️',c:3,lv:50,de:'Schild',en:'Shield'},
  richtung:{ic:'🎯',c:4,lv:60,de:'Richtung ↓',en:'Direction ↓'}, eis:{ic:'❄️',c:4,lv:65,de:'Einfrieren',en:'Freeze'},
  turbo:{ic:'⚡',c:5,lv:70,de:'Turbo',en:'Turbo'}, sperre:{ic:'🚧',c:4,lv:75,de:'Sperre',en:'Block'}, tausch:{ic:'🔄',c:6,lv:80,de:'Tausch',en:'Swap'}
};
const TLV = { boost:1, loch:1, stern:5, drift:10, schild:20, mauer:25, herz:35, pause:40, bombe:55 };
const DIRS = { 1:[1,0,'↓'], 2:[1,-1,'↙'], 3:[1,1,'↘'], 4:[0,1,'→'], 5:[0,-1,'←'] };
const TIERS = ['Rekrut','Bronze','Silber','Gold','Smaragd','Diamant','Black Knight','Lava','Engel','Legende'];
const TCOL = ['#a07848','#c27a3a','#7fa4ff','#ffd45a','#4be08c','#6fe8ff','#ff3b4e','#ff8a30','#fff2b0','#ff6ad5'];
let g = null, timers = [], drMode = 'normal', drTestLv = 100, drDiff = 'normal';

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
    <div class="picker-title">🎲 ${L('BRAIN MANA','BRAIN MANA')} <span style="font-size:12px;color:var(--warn);">ADMIN TEST${drMode === 'test' ? ' · 🧪' : ''}</span></div>
    <div class="picker-sub">${L('Würfeln, Fallen & Fähigkeiten. Jeder hat sein eigenes Brett. Wer zuerst unten ankommt, gewinnt.','Everyone has their own board. First one at the bottom wins.')}</div>
    <div class="explanation" style="margin:10px 0;text-align:left;">
      🎲 ${L('1 ↓ · 2 ↙ · 3 ↘ · 4 → · 5 ← · 6 Joker (Richtung frei)','1 ↓ · 2 ↙ · 3 ↘ · 4 → · 5 ← · 6 Joker (free direction)')}<br>
      🔷 ${L('Mana: Start 8, max. 10, +1 alle 2 eigenen Runden.','Mana: start 8, max 10, +1 every 2 own turns.')}<br>
      ❤️ ${L('3 Leben. Bei 0 ❤️ geht es zurück an den Start.','3 lives. At 0 ❤️ you go back to start.')}
    </div>
    <div style="display:flex;gap:8px;margin:8px 0">
      <button class="btn ${drMode === 'normal' ? 'btn-primary' : ''}" style="flex:1" onclick="drSetMode('normal')">🎮 ${L('Normal (wie online)', 'Normal (like online)')}</button>
      <button class="btn ${drMode === 'test' ? 'btn-primary' : ''}" style="flex:1" onclick="drSetMode('test')">🧪 ${L('Alles freigeschaltet', 'Everything unlocked')}</button></div>
    ${drMode === 'test' ? `<div class="settings-label">${L('Level der Figur','Figure level')}</div><div style="display:flex;gap:6px;margin:4px 0 8px">${[1, 25, 50, 75, 100].map(l => `<button class="btn ${drTestLv === l ? 'btn-primary' : ''}" style="flex:1;padding:6px 0" onclick="drSetLv(${l})">${l}</button>`).join('')}</div><div class="settings-track">${L('Testmodus: alle 9 Sofort-Fähigkeiten und alle 9 Feld-Fähigkeiten zur Wahl, kein XP.','Test mode: all 9 instant and all 9 field abilities, no XP.')}</div>` : ''}
    <div class="settings-label">${L('Schwierigkeit gegen den Bot','Bot difficulty')}</div>
    <div style="display:flex;gap:6px;margin:4px 0 4px">${[['easy', 'Leicht', 'Easy'], ['normal', 'Normal', 'Normal'], ['hard', 'Schwer', 'Hard']].map(d => `<button class="btn ${drDiff === d[0] ? 'btn-primary' : ''}" style="flex:1;padding:6px 0" onclick="drSetDiff('${d[0]}')">${L(d[1], d[2])}</button>`).join('')}</div>
    <div class="settings-track" style="margin-bottom:6px">${drDiff === 'easy' ? L('Bot: 20 Level niedriger, setzt Fähigkeiten selten ein. XP-Sieg ×0,5.','Bot: 20 levels lower, rarely uses abilities. Win XP ×0.5.') : drDiff === 'hard' ? L('Bot: 20 Level höher, nutzt Fähigkeiten clever. XP-Sieg ×1,5.','Bot: 20 levels higher, uses abilities smartly. Win XP ×1.5.') : L('Bot: gleiches Level wie du.','Bot: same level as you.')}</div>
    <div class="settings-label">${L('Figur wählen (jede hat eigenes Level)','Pick a figure (own level each)')}</div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:6px 0">${cards}</div>
    <div class="actions-row" style="flex-direction:column;gap:8px;"><button class="btn btn-ghost" onclick="brDuelHub()">${L('Zurück','Back')}</button></div></div>`);
};

/* ---- Start / Aufbau ---- */
window.drSetMode = function(m){ drMode = m; drIntro(); };
window.drSetDiff = function(d){ drDiff = d; drIntro(); };
window.drSetLv = function(l){ drTestLv = l; drIntro(); };
window.drStart = function(figId){
  clr();
  const lv = drMode === 'test' ? drTestLv : lvOf(xpGet(figId)), opp = pick(FIGS).id;
  const aiLv = Math.max(1, Math.min(100, lv + (drDiff === 'easy' ? -20 : drDiff === 'hard' ? 20 : 0)));
  g = { fig:[figId, opp], lv:[lv, aiLv], pos:[[0, 2], [0, 3]], mana:[8, 8], hp:[3, 3], shield:[0, 0], skip:[0, 0], turns:[0, 0],
        tiles:[{}, {}], sp:[null, null], left:[0, 0], used:[{}, {}], rev:[0, 0], undo:[0, 0], inst:[[], []],
        skill: drDiff === 'easy' ? 0.35 : 1, phase:'setup', cur:0, d:null, turbo:false, log:[], over:false, xpMsg:'' };
  g.left = [usesOf(figOf(0), lv), usesOf(figOf(1), aiLv)];
  const instPool = l => Object.keys(INST).filter(k => INST[k].lv <= l);
  g.inst[0] = drMode === 'test' ? Object.keys(INST) : shuffle(instPool(lv)).slice(0, 4);
  g.inst[1] = shuffle(instPool(aiLv)).slice(0, 4);
  const tilePool = l => GOOD.concat(BAD).filter(t => TLV[t] <= l);
  g.cards = []; if(drMode === 'test') g.cards = GOOD.concat(BAD); else { const tp = tilePool(lv); for(let i = 0; i < 8; i++) g.cards.push(pick(tp)); }
  g.chosen = [];
  drSetupRender();
};
function shuffle(a){ a = a.slice(); for(let i = a.length - 1; i > 0; i--){ const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function nextUnlock(){
  if(drMode === 'test') return '';
  const lv = g.lv[0], list = [];
  Object.keys(TLV).forEach(t => { if(TLV[t] > lv) list.push([TLV[t], TI[t] + ' ' + L(TN[t][0], TN[t][1]) + ' (' + (GOOD.indexOf(t) !== -1 ? L('für dich', 'for you') : L('gegen Gegner', 'vs enemy')) + ')']); });
  Object.keys(INST).forEach(k => { if(INST[k].lv > lv) list.push([INST[k].lv, INST[k].ic + ' ' + L(INST[k].de, INST[k].en) + ' (' + L('sofort', 'instant') + ')']); });
  list.sort((a, b) => a[0] - b[0]);
  return list.length ? `<div style="font-size:12px;color:#ffd45a;margin-bottom:10px">🔓 ${L('Nächste Freischaltung', 'Next unlock')}: Lv ${list[0][0]} · ${list[0][1]}</div>` : '';
}
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
    <div class="settings-label">${L('Deine Sofort-Fähigkeiten (Mana)','Your instant abilities (mana)')}</div><div style="margin:4px 0 6px">${hand || '<span style="font-size:13px;color:#9ab">' + L('Noch keine – erspiele sie dir durch Level.', 'None yet – unlock them by leveling.') + '</span>'}</div>${nextUnlock()}
    <div class="actions-row" style="flex-direction:column;gap:8px;">
      <button class="btn btn-primary" ${sel.length === 5 ? '' : 'disabled style="opacity:.4"'} onclick="drToPlace()">${L('Weiter: Felder legen','Next: place fields')}</button>
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
    if(!g.tiles[owner][key] && key !== g.pos[owner].join(',')){ g.tiles[owner][key] = t; return key; }
  }
  return null;
}
function botPlace(){
  const tpA = GOOD.concat(BAD).filter(t => TLV[t] <= g.lv[1]), gA = tpA.filter(t => GOOD.indexOf(t) !== -1), bA = tpA.filter(t => BAD.indexOf(t) !== -1);
  [0, 1, 2].forEach(() => place(1, pick(gA))); [0, 1].forEach(() => place(0, pick(bA)));
}
window.drToPlace = function(){
  if(g.chosen.length !== 5) return;
  g.hand = g.chosen.map(i => ({ t:g.cards[i], at:null })); g.selH = 0; botPlace(); g.phase = 'place'; drPlaceRender();
};
function drGrid(o){
  const cs = 27; let h = '';
  const sel = g.selH != null ? g.hand[g.selH] : null, need = sel && !sel.at ? (GOOD.indexOf(sel.t) !== -1 ? 0 : 1) : -1;
  for(let r = 0; r < R; r++) for(let c = 0; c < C; c++){
    const key = r + ',' + c, t = g.tiles[o][key], ok = need === o && !t && r >= 1 && r <= R - 3;
    const mineT = g.hand.some(x => x.at && x.at[0] === o && x.at[1] === key);
    const bg = r === R - 1 ? 'rgba(80,220,120,.3)' : r === 0 ? 'rgba(80,180,255,.25)' : ((r + c) % 2 ? 'rgba(255,255,255,.05)' : 'rgba(255,255,255,.1)');
    h += `<div onclick="drPlaceCell(${o},${r},${c})" style="height:${cs}px;display:flex;align-items:center;justify-content:center;font-size:16px;border-radius:4px;background:${bg};${ok ? 'box-shadow:inset 0 0 0 2px #7cff8c;cursor:pointer;' : ''}${mineT ? 'box-shadow:inset 0 0 0 2px #ffc446;' : ''}">${t ? TI[t] : ''}</div>`;
  }
  return `<div style="flex:1"><div style="text-align:center;font-size:12px;font-weight:700;margin-bottom:3px">${o === 0 ? L('Dein Brett (gute)', 'Your board (good)') : L('Gegner-Brett (schlechte)', 'Enemy board (bad)')}</div><div style="display:grid;grid-template-columns:repeat(${C},1fr);gap:2px">${h}</div></div>`;
}
function drPlaceRender(){
  const left = g.hand.filter(x => !x.at).length;
  const chips = g.hand.map((x, i) => `<div onclick="drHandSel(${i})" style="cursor:pointer;text-align:center;padding:6px 8px;border-radius:12px;border:3px solid ${g.selH === i ? '#ffc446' : (GOOD.indexOf(x.t) !== -1 ? '#3ccf7a' : '#ff5d7a')};background:rgba(255,255,255,${x.at ? '.02' : '.08'});opacity:${x.at ? .4 : 1}"><div style="font-size:26px">${TI[x.t]}</div><div style="font-size:10px">${L(TN[x.t][0], TN[x.t][1])}</div></div>`).join('');
  renderApp(`<div class="panel" style="padding:10px"><div class="picker-title">🧩 ${L('FELDER LEGEN', 'PLACE FIELDS')}</div>
    <div class="picker-sub">${L('Karte antippen, dann ein grün markiertes Feld. Gute auf dein Brett, schlechte auf das des Gegners. Der Gegner legt seine auch.', 'Tap a card, then a green field. Good on your board, bad on the enemy’s. The enemy places too.')}</div>
    <div style="display:flex;gap:6px;justify-content:center;margin:8px 0">${chips}</div>
    <div style="display:flex;gap:8px">${drGrid(0)}${drGrid(1)}</div>
    <div class="actions-row" style="flex-direction:column;gap:8px;margin-top:10px">
      <button class="btn btn-primary" ${left ? 'disabled style="opacity:.4"' : ''} onclick="drPlaceDone()">${L('Los geht’s', 'Go')}</button>
      <button class="btn" onclick="drAuto()">🎲 ${L('Rest zufällig legen', 'Place the rest randomly')}</button></div></div>`);
}
window.drHandSel = function(i){
  const h = g.hand[i];
  if(h.at){ delete g.tiles[h.at[0]][h.at[1]]; h.at = null; }
  g.selH = i; drPlaceRender();
};
window.drPlaceCell = function(o, r, c){
  if(g.selH == null) return; const h = g.hand[g.selH], key = r + ',' + c;
  if(h.at || (GOOD.indexOf(h.t) !== -1 ? 0 : 1) !== o || r < 1 || r > R - 3 || g.tiles[o][key]) return;
  g.tiles[o][key] = h.t; h.at = [o, key];
  const nx = g.hand.findIndex(x => !x.at); g.selH = nx === -1 ? null : nx; drPlaceRender();
};
window.drAuto = function(){
  g.hand.forEach(h => { if(!h.at){ const o = GOOD.indexOf(h.t) !== -1 ? 0 : 1, k = place(o, h.t); if(k) h.at = [o, k]; } });
  g.selH = null; drPlaceRender();
};
window.drPlaceDone = function(){
  if(g.hand.some(x => !x.at)) return;
  g.phase = 'play'; g.sc = null; g.view = 0; g.log = [L('Los! Du beginnst.', 'Go! You start.')];
  startTurn(0);
};
window.drBegin = function(){ drToPlace(); drAuto(); drPlaceDone(); };

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
  const mul = drDiff === 'easy' ? .5 : drDiff === 'hard' ? 1.5 : 1, gain = Math.round(100 * mul), loss = drDiff === 'easy' ? 15 : 30;
  let xp = xp0 + (w === 0 ? gain : -loss); xp = Math.max(0, xp);
  const floorLv = l0 >= 10 ? Math.floor(l0 / 10) * 10 : 1; if(lvOf(xp) < floorLv) xp = cum(floorLv);
  xpSet(id, xp); const l1 = lvOf(xp);
  g.xpMsg = drMode === 'test' ? L('Testmodus – kein XP','Test mode – no XP') : (w === 0 ? '+' + gain + ' XP' : '−' + loss + ' XP') + (l1 > l0 ? ' · ⬆️ Level ' + l1 + (tierOf(l1) > tierOf(l0) ? ' · ' + TIERS[tierOf(l1)] + '!' : '') : (l1 < l0 ? ' · ⬇️ Level ' + l1 : ''));
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
  const p = 1, o = 0, diff = g.pos[o][0] - g.pos[p][0], has = a => g.inst[p].indexOf(a) !== -1 && g.mana[p] >= INST[a].c && Math.random() < g.skill;
  const f = g.fig[p];
  if(g.left[p] > 0 && Math.random() < g.skill){
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

/* ---- 3D-Szene (CSS 3D, Figuren aus dice-3d.js) ---- */
const T3 = 60, TILT = 54, SC = 0.7;
function ensureCss(){
  if(document.getElementById('dr3dCss')) return;
  const st = document.createElement('style'); st.id = 'dr3dCss';
  st.textContent = '.drst{position:relative;width:100%;height:340px;perspective:1800px;overflow:visible}.drcam{position:absolute;left:50%;top:50%;width:0;height:0;transform-style:preserve-3d}.drst .b,.drst .g{position:absolute;left:0;top:0;width:0;height:0;transform-style:preserve-3d}.drst .f{position:absolute;backface-visibility:visible}.drrac{transition:transform .45s ease-out}.dritem{position:absolute;width:44px;height:44px;left:-22px;top:-44px;font-size:34px;line-height:44px;text-align:center;transform-origin:50% 100%;transform:translateZ(6px) rotateX(-' + TILT + 'deg)}.drlbl{position:absolute;left:6px;top:0;font-size:12px;font-weight:700;z-index:2}#drMini{position:absolute;right:4px;top:18px;z-index:6;padding:4px;border-radius:10px;background:rgba(10,12,40,.85);border:2px solid #ffc446;cursor:pointer;text-align:center;font-size:10px;line-height:1.2}';
  document.head.appendChild(st);
}
const tx = c => (c - (C - 1) / 2) * T3, ty = r => (r - (R - 1) / 2) * T3;
function buildScenes(){
  ensureCss(); const D = window.DR3D;
  g.sc = [0, 1].map(p => {
    const el = document.createElement('div'); el.className = 'drst';
    const lbl = document.createElement('div'); lbl.className = 'drlbl'; lbl.textContent = p === 0 ? L('Dein Brett', 'Your board') : L('Brett des Gegners', 'Enemy board'); el.appendChild(lbl);
    const cam = document.createElement('div'); cam.className = 'drcam'; cam.style.transform = 'scale(' + SC + ') rotateX(' + TILT + 'deg)'; el.appendChild(cam);
    for(let r = 0; r < R; r++) for(let c = 0; c < C; c++){
      const goal = r === R - 1, start = r === 0, chk = (r + c) % 2;
      const col = goal ? (chk ? '#3cbe6e' : '#f0f0f0') : start ? '#4682e6' : (chk ? '#40466f' : '#30365c');
      const tl = document.createElement('div'); tl.className = 'f'; tl.style.cssText = 'width:' + (T3 - 3) + 'px;height:' + (T3 - 3) + 'px;left:' + (tx(c) - (T3 - 3) / 2) + 'px;top:' + (ty(r) - (T3 - 3) / 2) + 'px;background:' + col + ';box-shadow:0 7px 0 rgba(0,0,0,.4)';
      cam.appendChild(tl);
    }
    const blk = document.createElement('div'); blk.className = 'f'; blk.style.cssText = 'display:none;width:' + (C * T3) + 'px;height:' + (T3 - 4) + 'px;left:' + (-C * T3 / 2) + 'px;top:' + (-(T3 - 4) / 2) + 'px;background:rgba(255,150,50,.55);transform:translateZ(2px)'; cam.appendChild(blk);
    const rac = D.grp(tx(g.pos[p][1]), ty(g.pos[p][0]), 0); rac.classList.add('drrac');
    const fig = D.FIG[g.fig[p]](); const inner = D.grp(0, 0, 0, 'scale3d(.62,.62,.62)'); inner.appendChild(fig); rac.appendChild(inner); cam.appendChild(rac);
    el._cam = cam; el._rac = rac; el._blk = blk; el._items = {}; el.style.display = p === (g.view || 0) ? '' : 'none'; return el;
  });
}
function updScene(p){
  const el = g.sc[p], cam = el._cam;
  el._rac.style.transform = 'translate3d(' + tx(g.pos[p][1]) + 'px,' + ty(g.pos[p][0]) + 'px,0)';
  const keys = Object.keys(g.tiles[p]);
  keys.forEach(k => {
    if(el._items[k]) return;
    const [r, c] = k.split(',').map(Number), d = document.createElement('div'); d.className = 'g'; d.style.transform = 'translate3d(' + tx(c) + 'px,' + ty(r) + 'px,0)';
    const t = g.tiles[p][k], good = GOOD.indexOf(t) !== -1;
    const pad = document.createElement('div'); pad.className = 'f'; pad.style.cssText = 'width:' + (T3 - 10) + 'px;height:' + (T3 - 10) + 'px;left:' + (-(T3 - 10) / 2) + 'px;top:' + (-(T3 - 10) / 2) + 'px;border-radius:12px;background:' + (good ? 'rgba(60,220,130,.45)' : 'rgba(255,70,100,.45)') + ';border:2px solid ' + (good ? '#3cdc82' : '#ff4664') + ';transform:translateZ(1px)';
    d.appendChild(pad);
    const it = document.createElement('div'); it.className = 'dritem'; it.textContent = TI[t]; d.appendChild(it);
    cam.appendChild(d); el._items[k] = d;
  });
  Object.keys(el._items).forEach(k => { if(!g.tiles[p][k]){ el._items[k].remove(); delete el._items[k]; } });
  const b = el._blk; if(g.sp[p] != null){ b.style.display = 'block'; b.style.transform = 'translate3d(0,' + ty(g.sp[p]) + 'px,2px)'; } else b.style.display = 'none';
}
function bar(p){
  const f = figOf(p), hearts = '❤️'.repeat(Math.max(0, g.hp[p])) + '🖤'.repeat(Math.max(0, 3 - g.hp[p]));
  return `<div style="flex:1;font-size:12px;line-height:1.5;padding:2px 3px;border-radius:10px;${g.cur === p && !g.over ? 'background:rgba(255,196,70,.15);' : ''}"><div>${f.ic} <b>${nm(p)}</b>${g.shield[p] ? ' 🛡️' : ''}${g.skip[p] ? ' ⏸️' : ''}</div><div>${hearts}</div><div>🔷 <b>${g.mana[p]}</b>/10 · ✨ ${g.left[p]}×</div></div>`;
}
function render(){
  if(!g || g.phase === 'setup' || g.phase === 'place') return;
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
  if(!g.sc) buildScenes();
  const st = document.getElementById('drStage');
  if(!st || !g.sc[0].parentNode || g.sc[0].parentNode !== st){
    renderApp(`<div class="panel" style="padding:10px">
      <div id="drTop" style="display:flex;gap:8px"></div>
      <div id="drStage" style="position:relative;margin:2px 0 4px"></div>
      <div id="drAct" style="margin:6px 0"></div>
      <div id="drLog" style="font-size:12px;color:#9ab;line-height:1.5;min-height:60px"></div>
      <button class="btn btn-ghost" style="width:100%;margin-top:6px" onclick="drIntro()">${L('Beenden', 'Quit')}</button></div>`);
    const s2 = document.getElementById('drStage'); s2.appendChild(g.sc[0]); s2.appendChild(g.sc[1]); const mn = document.createElement('div'); mn.id = 'drMini'; mn.onclick = drSwap; s2.appendChild(mn);
  }
  document.getElementById('drTop').innerHTML = bar(0) + bar(1);
  document.getElementById('drAct').innerHTML = actions;
  document.getElementById('drLog').innerHTML = g.log.map((x, i) => `<div style="opacity:${1 - i * .18}">${x}</div>`).join('');
  updScene(g.view || 0); updMini();
}
window.drSwap = function(){ if(!g || !g.sc) return; g.view = 1 - (g.view || 0); g.sc[0].style.display = g.view === 0 ? '' : 'none'; g.sc[1].style.display = g.view === 1 ? '' : 'none'; updScene(g.view); updMini(); };
function updMini(){
  const mn = document.getElementById('drMini'); if(!mn) return; const q = 1 - (g.view || 0), cs = 8; let h = '';
  for(let r = 0; r < R; r++) for(let c = 0; c < C; c++){
    const t = g.tiles[q][r + ',' + c], me = g.pos[q][0] === r && g.pos[q][1] === c;
    const bg = me ? '#ffd45a' : t ? (GOOD.indexOf(t) !== -1 ? '#3cdc82' : '#ff4664') : (r === R - 1 ? '#3a8a5a' : r === 0 ? '#3a64a8' : ((r + c) % 2 ? '#262b52' : '#30365c'));
    h += '<div style="width:' + cs + 'px;height:' + cs + 'px;background:' + bg + (me ? ';border-radius:50%' : '') + '"></div>';
  }
  mn.innerHTML = '<div style="display:grid;grid-template-columns:repeat(' + C + ',' + cs + 'px);gap:1px">' + h + '</div><div>' + (q === 1 ? '🤖 ' + L('Gegner', 'Enemy') : '🧍 ' + L('Du', 'You')) + '</div>';
}

window.brDuelHub = function(){
  if(typeof brAllowed === 'function' && !brAllowed()){ renderMainMenu(); return; }
  if(typeof brClearTimers === 'function') brClearTimers(); clr(); g = null;
  renderApp(`<div class="panel">
    <div class="picker-title">⚔️ BRAIN DUEL <span style="font-size:12px;color:var(--warn);">ADMIN TEST</span></div>
    <div class="picker-sub">${L('Zwei Duell-Modi – wähle deinen.','Two duel modes – pick yours.')}</div>
    <div class="actions-row" style="flex-direction:column;gap:10px;margin-top:10px">
      <div class="mode-card" onclick="brIntro()" style="border-color:var(--warn);cursor:pointer"><div class="icon">⚔️</div><h3>Brain Royale</h3><p>${L('Figuren-Duell mit Quiz','Piece duel with quiz')}</p></div>
      <div class="mode-card" onclick="drIntro()" style="border-color:#ffc446;cursor:pointer"><div class="icon">🎲</div><h3>Brain Mana</h3><p>${L('Würfeln, Fallen & Fähigkeiten','Dice, traps & abilities')}</p></div>
      <button class="btn btn-ghost" onclick="renderMainMenu()">${L('Zurück zum Menü','Back to menu')}</button></div></div>`);
};
window.drState = function(){ return g; };
})();
