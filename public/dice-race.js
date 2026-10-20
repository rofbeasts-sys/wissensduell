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
  { id:'healer', ic:'💚', de:'Heiler', en:'Healer', sp:'+20 ❤️ (voll: +1 Mana)', spEn:'+20 ❤️ (full: +1 mana)', cap:9 },
  { id:'robot',  ic:'🤖', de:'Roboter', en:'Robot', sp:'4/5 wird zu ↓', spEn:'4/5 becomes ↓', cap:3 }
];
const GOOD = ['boost','schild','stern','herz'], BAD = ['loch','drift','mauer','pause','bombe'];
const TI = { boost:'🚀', schild:'🛡️', stern:'⭐', herz:'❤️', loch:'🕳️', drift:'🌀', mauer:'🧱', pause:'⏸️', bombe:'💣' };
const TN = { boost:['Boost','Boost'], schild:['Schild','Shield'], stern:['Stern','Star'], herz:['Herz','Heart'], loch:['Loch','Hole'], drift:['Drift','Drift'], mauer:['Mauer','Wall'], pause:['Pause','Pause'], bombe:['Bombe','Bomb'] };
const INST = {
  neu:{ic:'🎲',c:2,lv:15,de:'Neu würfeln',en:'Re-roll'}, heil:{ic:'💚',c:3,lv:30,de:'Heilung',en:'Heal'},
  feuerball:{ic:'🔥',c:4,lv:45,de:'Feuerball',en:'Fireball'}, schild:{ic:'🛡️',c:3,lv:50,de:'Schild',en:'Shield'},
  richtung:{ic:'🎯',c:4,lv:60,de:'Richtung ↓',en:'Direction ↓'}, eis:{ic:'❄️',c:4,lv:65,de:'Einfrieren',en:'Freeze'},
  turbo:{ic:'⚡',c:5,lv:70,de:'Turbo',en:'Turbo'}, sperre:{ic:'🚧',c:4,lv:75,de:'Sperre',en:'Block'}, tausch:{ic:'🔄',c:6,lv:80,de:'Tausch',en:'Swap'},
  doppel:{ic:'⏩',c:4,lv:85,de:'Doppel-Schritt',en:'Double step'}, spiegel:{ic:'🪞',c:5,lv:90,de:'Spiegel',en:'Mirror'}, zeit:{ic:'🐌',c:5,lv:95,de:'Zeitlupe',en:'Slow-mo'}
};
const TLV = { boost:1, loch:1, stern:5, drift:10, schild:20, mauer:25, herz:35, pause:40, bombe:55 };
const DIRS = { 1:[1,0,'↓'], 2:[1,-1,'↙'], 3:[1,1,'↘'], 4:[0,1,'→'], 5:[0,-1,'←'] };
const ARENA_LV = { wald:1, strand:10, wueste:25, eis:40, vulkan:55, spuk:70 };
const ARENA_NAME = { wald:['Wald-Wiese','Forest'], strand:['Insel & Strand','Beach'], wueste:['Wüste','Desert'], eis:['Eis & Schnee','Ice'], vulkan:['Vulkan','Volcano'], spuk:['Spuk-Nacht','Haunted'] };
const TIERS = ['Rekrut','Bronze','Silber','Gold','Smaragd','Diamant','Black Knight','Lava','Engel','Legende'];
const TCOL = ['#a07848','#c27a3a','#7fa4ff','#ffd45a','#4be08c','#6fe8ff','#ff3b4e','#ff8a30','#fff2b0','#ff6ad5'];
let g = null, timers = [], drMode = 'normal', drTestLv = 100, drDiff = 'normal', drArena = 'random';

/* ---- XP / Level je Figur (lokal gespeichert) ---- */
const cum = L => L <= 1 ? 0 : Math.floor(62 * Math.pow(L - 1, 1.6));
function lvOf(xp){ let l = 1; while(l < 100 && xp >= cum(l + 1)) l++; return l; }
function xpGet(id){ try{ return parseInt(localStorage.getItem('dr_xp_' + id) || '0', 10) || 0; }catch(e){ return 0; } }
function xpSet(id, v){ if(drMode === 'test') return; try{ localStorage.setItem('dr_xp_' + id, String(v)); }catch(e){} }
function maxLv(){ let m = 1; FIGS.forEach(f => { m = Math.max(m, lvOf(xpGet(f.id))); }); return m; }
function arenaOpen(k){ return drMode === 'test' || ARENA_LV[k] <= maxLv(); }
function tierOf(l){ return Math.min(9, Math.floor(l / 10)); }
function usesOf(f, lv){ return Math.min(f.cap, 1 + Math.floor(lv / 25)); }
const rnd = n => Math.floor(Math.random() * n);
const pick = a => a[rnd(a.length)];
function tm(fn, ms){ const id = setTimeout(fn, ms); timers.push(id); }
function clr(){ timers.forEach(clearTimeout); timers = []; }
const nm = p => p === 0 ? L('Du','You') : L('Gegner','Enemy');
const figOf = p => FIGS.find(f => f.id === g.fig[p]);

/* ---- Effekte & Sound ---- */
let drMuted = false; try{ drMuted = localStorage.getItem('dr_mute') === '1'; }catch(e){}
let actx = null;
function tone(f0, f1, d, type, vol, delay){
  try{
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    const t = actx.currentTime + (delay || 0), o = actx.createOscillator(), gn = actx.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + d);
    gn.gain.setValueAtTime(vol || .12, t); gn.gain.exponentialRampToValueAtTime(.001, t + d);
    o.connect(gn); gn.connect(actx.destination); o.start(t); o.stop(t + d + .02);
  }catch(e){}
}
function sfx(k){
  if(drMuted) return;
  if(k === 'dice'){ for(let i = 0; i < 5; i++) tone(300 + rnd(300), 200, .06, 'square', .06, i * .07); }
  else if(k === 'hit') { tone(220, 50, .35, 'sawtooth', .16); }
  else if(k === 'fire'){ tone(900, 200, .5, 'sawtooth', .08); }
  else if(k === 'heal'){ tone(500, 900, .25, 'sine', .12); tone(750, 1200, .25, 'sine', .1, .12); }
  else if(k === 'star'){ tone(800, 1400, .15, 'triangle', .1); }
  else if(k === 'win'){ [523, 659, 784, 1047].forEach((f, i) => tone(f, f, .22, 'triangle', .13, i * .14)); }
  else if(k === 'lose'){ [392, 330, 262].forEach((f, i) => tone(f, f * .9, .3, 'sawtooth', .08, i * .2)); }
}
function fx(kind, p, val){
  const st = document.getElementById('drStage'); if(!st) return;
  const e = document.createElement('div'); e.style.cssText = 'position:absolute;left:50%;z-index:9;pointer-events:none;transform:translate(-50%,-50%);text-align:center;';
  const rm = ms => setTimeout(() => { if(e.parentNode) e.remove(); }, ms);
  if(kind === 'dice'){
    e.style.top = '42%'; e.style.fontSize = '64px'; e.innerHTML = '🎲'; e.style.animation = 'drdice .8s ease-out forwards'; st.appendChild(e);
    setTimeout(() => { e.innerHTML = '<span style="display:inline-block;background:#fff;color:#222;border-radius:14px;padding:4px 18px;font:800 54px sans-serif;box-shadow:0 4px 14px #0008">' + val + '</span>'; }, 420); rm(900);
  } else if(kind === 'fire'){
    const fromTop = p === 0; e.style.fontSize = '58px'; e.innerHTML = '🔥'; e.style.top = fromTop ? '8%' : '86%'; e.style.transition = 'top .5s ease-in, transform .5s'; st.appendChild(e);
    requestAnimationFrame(() => requestAnimationFrame(() => { e.style.top = fromTop ? '78%' : '24%'; e.style.transform = 'translate(-50%,-50%) scale(1.5) rotate(25deg)'; })); rm(650);
  } else if(kind === 'boom'){
    const mine = p === 0; e.style.top = mine ? '70%' : '30%'; e.style.fontSize = '30px'; e.innerHTML = '💥'; e.style.animation = 'drboom .7s ease-out forwards'; st.appendChild(e);
    st.style.animation = 'none'; void st.offsetWidth; st.style.animation = 'drshake .4s'; sfx('hit'); rm(750);
  } else if(kind === 'heal'){
    const mine = p === 0; e.style.top = mine ? '70%' : '30%'; e.style.fontSize = '30px'; e.innerHTML = '➕💚➕'; e.style.animation = 'drplus 1s ease-out forwards'; st.appendChild(e); rm(1050);
  }
}
const LEVEL_LIST = function(){
  const out = [];
  Object.keys(TLV).forEach(t => out.push([TLV[t], TI[t], L(TN[t][0], TN[t][1]), GOOD.indexOf(t) !== -1 ? L('Feld für dich', 'tile for you') : L('Falle für Gegner', 'trap for enemy')]));
  Object.keys(INST).forEach(k => out.push([INST[k].lv, INST[k].ic, L(INST[k].de, INST[k].en), L('Sofort-Karte', 'instant card')]));
  Object.keys(ARENA_LV).forEach(k => out.push([ARENA_LV[k], '🗺️', L(ARENA_NAME[k][0], ARENA_NAME[k][1]), L('Arena', 'arena')]));
  [25, 50, 75, 100].forEach(l => out.push([l, '✨', L('Fähigkeit +1× pro Spiel', 'Ability +1× per game'), L('Figur', 'figure')]));
  out.sort((a, b) => a[0] - b[0]); return out;
};
window.drLevels = function(){
  const cur = drMode === 'test' ? 100 : maxLv(); let marked = false;
  const rows = LEVEL_LIST().map(x => {
    const ok = x[0] <= cur, next = !ok && !marked; if(next) marked = true;
    return `<div style="display:flex;gap:8px;align-items:center;padding:6px 8px;border-radius:10px;margin:3px 0;background:${ok ? 'rgba(60,207,122,.15)' : next ? 'rgba(255,196,70,.2)' : 'rgba(255,255,255,.04)'};${next ? 'border:2px solid #ffc446;' : ''}opacity:${ok || next ? 1 : .6}">
      <b style="width:48px">Lv ${x[0]}</b><span style="font-size:20px">${x[1]}</span><span style="flex:1;font-size:13px">${x[2]}<br><small style="color:#9ab">${x[3]}</small></span><span>${ok ? '✅' : next ? '⬅️' : '🔒'}</span></div>`;
  }).join('');
  renderApp(`<div class="panel"><div class="picker-title">📊 ${L('Level-Tabelle', 'Level table')}</div><div class="picker-sub">${L('Dein höchstes Level', 'Your highest level')}: <b>${cur}</b></div>${rows}
    <div class="actions-row" style="flex-direction:column;gap:8px;margin-top:10px"><button class="btn btn-ghost" onclick="drIntro()">${L('Zurück', 'Back')}</button></div></div>`);
};
window.drTutDone = function(){ try{ localStorage.setItem('dr_tut', '1'); }catch(e){} drIntro(); };
function smoothEdges(root){ root.querySelectorAll('.f').forEach(f => { const bg = f.style.background; if(bg && bg.indexOf('rgb') === 0 && bg.indexOf('gradient') === -1){ f.style.outline = '1px solid ' + bg; f.style.outlineOffset = '-0.5px'; } }); }

/* ---- Menue ---- */
window.drIntro = function(){
  if(typeof adminViewOn === 'function' && typeof featureLocked === 'function' && featureLocked('brain_royale') && !adminViewOn()){ renderMainMenu(); return; }
  clr(); g = null;
  let tut = true; try{ tut = localStorage.getItem('dr_tut') !== '1'; }catch(e){}
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
      ❤️ ${L('Lebensleiste 100. Bei 0 geht es zurück an den Start.','Life bar 100. At 0 you go back to start.')}
    </div>
    <div style="display:flex;gap:8px;margin:8px 0">
      <button class="btn ${drMode === 'normal' ? 'btn-primary' : ''}" style="flex:1" onclick="drSetMode('normal')">🎮 ${L('Normal (wie online)', 'Normal (like online)')}</button>
      <button class="btn ${drMode === 'test' ? 'btn-primary' : ''}" style="flex:1" onclick="drSetMode('test')">🧪 ${L('Alles freigeschaltet', 'Everything unlocked')}</button></div>
    ${drMode === 'test' ? `<div class="settings-label">${L('Level der Figur','Figure level')}</div><div style="display:flex;gap:6px;margin:4px 0 8px">${[1, 25, 50, 75, 100].map(l => `<button class="btn ${drTestLv === l ? 'btn-primary' : ''}" style="flex:1;padding:6px 0" onclick="drSetLv(${l})">${l}</button>`).join('')}</div><div class="settings-track">${L('Testmodus: alle 9 Sofort-Fähigkeiten und alle 9 Feld-Fähigkeiten zur Wahl, kein XP.','Test mode: all 9 instant and all 9 field abilities, no XP.')}</div>` : ''}
    <div class="settings-label">${L('Arena','Arena')}</div>
    <div style="display:flex;flex-wrap:wrap;gap:6px;margin:4px 0 8px">${['random'].concat(Object.keys(ARENA_LV)).map(k => { const open = k === 'random' || arenaOpen(k); return `<button class="btn ${drArena === k ? 'btn-primary' : ''}" ${open ? '' : 'disabled'} style="padding:6px 10px;font-size:13px;${open ? '' : 'opacity:.4;'}" onclick="drSetArena('${k}')">${k === 'random' ? '🎲 ' + L('Zufall', 'Random') : (open ? '' : '🔒 ') + L(ARENA_NAME[k][0], ARENA_NAME[k][1]) + (open ? '' : ' Lv' + ARENA_LV[k])}</button>`; }).join('')}</div>
    <div class="settings-label">${L('Schwierigkeit gegen den Bot','Bot difficulty')}</div>
    <div style="display:flex;gap:6px;margin:4px 0 4px">${[['easy', 'Leicht', 'Easy'], ['normal', 'Normal', 'Normal'], ['hard', 'Schwer', 'Hard']].map(d => `<button class="btn ${drDiff === d[0] ? 'btn-primary' : ''}" style="flex:1;padding:6px 0" onclick="drSetDiff('${d[0]}')">${L(d[1], d[2])}</button>`).join('')}</div>
    <div class="settings-track" style="margin-bottom:6px">${drDiff === 'easy' ? L('Bot: 20 Level niedriger, setzt Fähigkeiten selten ein. XP-Sieg ×0,5.','Bot: 20 levels lower, rarely uses abilities. Win XP ×0.5.') : drDiff === 'hard' ? L('Bot: 20 Level höher, nutzt Fähigkeiten clever. XP-Sieg ×1,5.','Bot: 20 levels higher, uses abilities smartly. Win XP ×1.5.') : L('Bot: gleiches Level wie du.','Bot: same level as you.')}</div>
    <div style="margin:6px 0"><label style="font-size:13px;cursor:pointer"><input type="checkbox" ${drDeco ? 'checked' : ''} onchange="drToggleDeco(this.checked)"> 🏔️ ${L('Landschaft (Berge, Wald, Wasserfall) – bei Ruckeln ausschalten','Scenery (mountains, forest, waterfall) – turn off if laggy')}</label></div>
    ${tut ? `<div class="explanation" style="margin:8px 0;text-align:left;border:2px solid #ffc446"><b>${L('So geht’s', 'How to play')}</b><br>🎲 ${L('Würfeln und laufen: Wer zuerst unten ist, gewinnt.', 'Roll and move: first one down wins.')}<br>🪤 ${L('Vorher legst du Felder: gute auf dein Brett, Fallen auf das des Gegners.', 'Before the game place tiles: good on yours, traps on the enemy’s.')}<br>❤️ ${L('Leben 0 = zurück an den Start.', 'Life 0 = back to start.')}<br>🔷 ${L('Mana für Sofort-Karten, ✨ für die Figuren-Fähigkeit.', 'Mana for instant cards, ✨ for your figure ability.')}<br>🔄 ${L('Einmal pro Spiel: Gratis-Wurf.', 'Once per game: free re-roll.')}<button class="btn btn-primary" style="width:100%;margin-top:8px" onclick="drTutDone()">${L('Verstanden', 'Got it')}</button></div>` : ''}
    <button class="btn" style="width:100%;margin:4px 0" onclick="drLevels()">📊 ${L('Level-Tabelle', 'Level table')}</button>
    <div class="settings-label">${L('Figur wählen (jede hat eigenes Level)','Pick a figure (own level each)')}</div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:6px 0">${cards}</div>
    <div class="actions-row" style="flex-direction:column;gap:8px;"><button class="btn btn-ghost" onclick="brDuelHub()">${L('Zurück','Back')}</button></div></div>`);
};

/* ---- Start / Aufbau ---- */
window.drSetMode = function(m){ drMode = m; drIntro(); };
window.drToggleDeco = function(v){ drDeco = !!v; try{ localStorage.setItem('dr_deco', v ? '1' : '0'); }catch(e){} };
window.drSetArena = function(k){ drArena = k; drIntro(); };
window.drSetDiff = function(d){ drDiff = d; drIntro(); };
window.drSetLv = function(l){ drTestLv = l; drIntro(); };
window.drStart = function(figId){
  clr();
  const lv = drMode === 'test' ? drTestLv : lvOf(xpGet(figId)), opp = pick(FIGS).id;
  const aiLv = Math.max(1, Math.min(100, lv + (drDiff === 'easy' ? -20 : drDiff === 'hard' ? 20 : 0)));
  g = { fig:[figId, opp], lv:[lv, aiLv], pos:[[0, 2], [0, 3]], mana:[8, 8], hp:[100, 100], shield:[0, 0], skip:[0, 0], turns:[0, 0],
        tiles:[{}, {}], sp:[null, null], left:[0, 0], used:[{}, {}], rev:[0, 0], undo:[0, 0], rr:[1, 1], mirror:[0, 0], slow:[0, 0], inst:[[], []],
        skill: drDiff === 'easy' ? 0.35 : 1, phase:'setup', cur:0, d:null, turbo:false, log:[], over:false, xpMsg:'' };
  g.left = [usesOf(figOf(0), lv), usesOf(figOf(1), aiLv)];
  { const open = Object.keys(ARENA_LV).filter(arenaOpen); g.arena = (drArena !== 'random' && open.indexOf(drArena) !== -1) ? drArena : pick(open); }
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
  if(g.mirror[p] && why !== 'm'){ g.mirror[p] = 0; say(nm(p) + ': 🪞 ' + L('Spiegel wirft den Schaden zurück!', 'Mirror reflects the damage!')); sfx('hit'); fx('boom', 1 - p); damage(1 - p, n, 'm'); return; }
  g.hp[p] -= n; if(n >= 25) fx('boom', p);
  const f = g.fig[p];
  if(g.hp[p] <= 0){
    if(f === 'healer' && g.lv[p] >= 100 && !g.rev[p]){ g.rev[p] = 1; g.hp[p] = 20; say(nm(p) + ': 💚 ' + L('Wiederbelebung!', 'Revive!')); return; }
    g.hp[p] = 100; g.pos[p] = [0, g.pos[p][1]]; say(nm(p) + ': 💥 ' + L('kaputt – zurück zum Start, Leben voll', 'broken – back to start, life full'));
  }
}
function useInst(p, a){
  const I = INST[a]; if(g.inst[p].indexOf(a) === -1 || g.mana[p] < I.c) return false;
  g.mana[p] -= I.c; g.inst[p].splice(g.inst[p].indexOf(a), 1);
  const o = 1 - p; say(nm(p) + ': ' + I.ic + ' ' + L(I.de, I.en));
  if(a === 'heil'){ g.hp[p] = Math.min(100, g.hp[p] + 30); fx('heal', p); sfx('heal'); }
  else if(a === 'schild') g.shield[p] = 1;
  else if(a === 'feuerball'){ fx('fire', o); sfx('fire'); g.pos[o][0] = Math.max(0, g.pos[o][0] - 2); if(g.shield[o]){ g.shield[o] = 0; say(L('Schild blockt den Schaden!', 'Shield blocks the damage!')); } else damage(o, 55, 'f'); }
  else if(a === 'eis') g.skip[o] = 1;
  else if(a === 'sperre') g.sp[o] = g.pos[o][0] + 1;
  else if(a === 'tausch'){ const t = g.pos[p][0]; g.pos[p][0] = g.pos[o][0]; g.pos[o][0] = t; }
  else if(a === 'turbo') g.turbo = true;
  else if(a === 'doppel'){ g.pos[p][0] = Math.min(R - 2, g.pos[p][0] + 1); }
  else if(a === 'spiegel') g.mirror[p] = 1;
  else if(a === 'zeit') g.slow[o] = 1;
  else if(a === 'richtung'){ g.d = 1; }
  else if(a === 'neu'){ g.d = 1 + rnd(6); }
  return true;
}
function useSpecial(p){
  if(g.left[p] <= 0) return false;
  const f = g.fig[p], o = 1 - p; let ok = false;
  if(f === 'knight' && !g.shield[p]){ g.shield[p] = 1; g.pos[p][0] = Math.min(R - 2, g.pos[p][0] + 1); ok = true; }
  else if(f === 'healer'){ if(g.hp[p] < 100) g.hp[p] = Math.min(100, g.hp[p] + 20); else if(g.mana[p] < 10) g.mana[p]++; else return false; ok = true; }
  else if(f === 'thief' && g.mana[o] > 0){ g.mana[o]--; g.mana[p] = Math.min(10, g.mana[p] + 1); ok = true; }
  else if(f === 'archer' && g.pos[o][0] > 0){ g.pos[o][0]--; ok = true; }
  else if(f === 'mage' && g.d != null){ g.d = 1 + rnd(6); ok = true; }
  else if(f === 'robot' && (g.d === 4 || g.d === 5)){ g.d = 1; ok = true; }
  if(ok){ g.left[p]--; say(nm(p) + ': ✨ ' + L(figOf(p).sp, figOf(p).spEn)); }
  return ok;
}
function roll(p){ if(g.slow[p]){ g.d = 1 + rnd(3); g.slow[p] = 0; say(nm(p) + ': 🐌 ' + L('Zeitlupe: nur 1–3', 'Slow-mo: only 1–3')); } else g.d = 1 + rnd(6); g.rolled = true; fx('dice', g.d); sfx('dice'); say(nm(p) + ': 🎲 ' + g.d + (g.d === 6 ? ' Joker' : ' ' + DIRS[g.d][2])); }
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
    if(t === 'stern'){ g.mana[p] = Math.min(10, g.mana[p] + 2); delete g.tiles[p][key]; say(nm(p) + ': ⭐ +2 Mana'); sfx('star'); }
    else if(t === 'herz'){ g.hp[p] = Math.min(100, g.hp[p] + 25); delete g.tiles[p][key]; say(nm(p) + ': ❤️ +25'); fx('heal', p); sfx('heal'); }
    else if(t === 'schild'){ g.shield[p] = 1; delete g.tiles[p][key]; say(nm(p) + ': 🛡️'); }
    else if(t === 'boost'){ g.pos[p][0] = Math.min(R - 1, nr + 2); say(nm(p) + ': 🚀 +2'); if(g.pos[p][0] >= R - 1) finish(p); }
    else {
      if(g.fig[p] === 'healer' && g.lv[p] >= 75 && !g.undo[p]){ g.undo[p] = 1; say(nm(p) + ': 💚 ' + L('Rückholer macht die Falle ungeschehen', 'Undo cancels the trap')); continue; }
      if(g.shield[p]){ g.shield[p] = 0; say(nm(p) + ': 🛡️ ' + L('blockt die Falle', 'blocks the trap')); continue; }
      if(t === 'loch'){ g.pos[p][0] = Math.max(0, nr - 2); say(nm(p) + ': 🕳️ −2 · −25 ❤️'); damage(p, 25, 'l'); }
      else if(t === 'drift'){ g.pos[p][1] = Math.max(0, Math.min(C - 1, nc + (nc <= 2 ? 2 : -2))); say(nm(p) + ': 🌀 Drift'); }
      else if(t === 'pause'){ g.skip[p] = 1; delete g.tiles[p][key]; say(nm(p) + ': ⏸️ Pause'); }
      else if(t === 'bombe'){ g.pos[p][0] = Math.max(0, nr - 1); delete g.tiles[p][key]; say(nm(p) + ': 💣 −2 · −45 ❤️'); damage(p, 45, 'b'); }
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
  sfx(w === 0 ? 'win' : 'lose'); say(w === 0 ? L('🏆 Du gewinnst!', '🏆 You win!') : L('Der Gegner gewinnt.', 'The enemy wins.'));
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
window.drReroll = function(){ if(!g || g.over || g.locked || g.cur !== 0 || !g.rolled || !g.rr[0]) return; g.rr[0] = 0; roll(0); say(nm(0) + ': 🔄 ' + L('Gratis-Wurf', 'Free re-roll')); render(); };
window.drMute = function(){ drMuted = !drMuted; try{ localStorage.setItem('dr_mute', drMuted ? '1' : '0'); }catch(e){} render(); };
window.drSpecial = function(){ if(!g || g.over || g.locked || g.cur !== 0) return; const needRoll = ['mage', 'robot'].indexOf(g.fig[0]) !== -1; if(needRoll && !g.rolled) return; useSpecial(0); render(); };

/* ---- Computer ---- */
function aiTurn(){
  if(!g || g.over || g.cur !== 1) return;
  const p = 1, o = 0, diff = g.pos[o][0] - g.pos[p][0], has = a => g.inst[p].indexOf(a) !== -1 && g.mana[p] >= INST[a].c && Math.random() < g.skill;
  const f = g.fig[p];
  if(g.left[p] > 0 && Math.random() < g.skill){
    if(f === 'knight' && !g.shield[p] && g.turns[p] >= 2) useSpecial(p);
    else if(f === 'healer' && (g.hp[p] <= 70 || diff >= 2)) useSpecial(p);
    else if(f === 'thief' && g.mana[o] >= 3 && g.mana[p] <= 8) useSpecial(p);
    else if(f === 'archer' && diff >= 0 && g.pos[o][0] > 1) useSpecial(p);
  }
  if(has('heil') && g.hp[p] <= 45) useInst(p, 'heil');
  if(has('feuerball') && (diff >= 0 || g.hp[o] <= 55) && Math.random() < .7) useInst(p, 'feuerball');
  if(has('tausch') && diff >= 3) useInst(p, 'tausch');
  else if(has('sperre') && diff >= 2) useInst(p, 'sperre');
  else if(has('eis') && diff >= 1 && Math.random() < .6) useInst(p, 'eis');
  if(has('spiegel') && !g.mirror[p] && g.inst[o] && g.inst[o].some(k => k === 'feuerball') && Math.random() < .6) useInst(p, 'spiegel');
  if(has('zeit') && diff >= 0 && Math.random() < .5) useInst(p, 'zeit');
  if(has('doppel') && g.mana[p] >= 6 && Math.random() < .5) useInst(p, 'doppel');
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
      else if(g.rr[p]){ g.rr[p] = 0; roll(p); say(nm(p) + ': 🔄 ' + L('Gratis-Wurf', 'Free re-roll')); }
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
const T3 = 60, TILT = 54, SC = 0.5;
function ensureCss(){
  if(document.getElementById('dr3dCss')) return;
  const st = document.createElement('style'); st.id = 'dr3dCss';
  st.textContent = '.drst{position:relative;width:100%;height:520px;perspective:1800px;overflow:hidden;border-radius:18px;background:linear-gradient(#3b4bb0 0%,#8a7fd6 22%,#2a3358 23%,#10152e 100%)}.drcam{position:absolute;left:50%;top:47%;width:0;height:0;transform-style:preserve-3d}.drst .b,.drst .g{position:absolute;left:0;top:0;width:0;height:0;transform-style:preserve-3d}.drst .f{position:absolute;backface-visibility:visible}.drrac{transition:transform .45s ease-out}.dritem{position:absolute;width:44px;height:44px;left:-22px;top:-44px;font-size:34px;line-height:44px;text-align:center;transform-origin:50% 100%;transform:translateZ(6px) rotateX(-' + TILT + 'deg)}.drlbl{position:absolute;left:6px;top:0;font-size:12px;font-weight:700;z-index:2}@keyframes drdice{0%{transform:translate(-50%,-50%) rotate(0) scale(.6)}60%{transform:translate(-50%,-50%) rotate(540deg) scale(1.2)}100%{transform:translate(-50%,-50%) rotate(720deg) scale(1);opacity:0}}@keyframes drboom{0%{transform:translate(-50%,-50%) scale(.3);opacity:1}100%{transform:translate(-50%,-50%) scale(3.2);opacity:0}}@keyframes drplus{0%{transform:translate(-50%,-30%);opacity:1}100%{transform:translate(-50%,-160%);opacity:0}}@keyframes drshake{0%,100%{transform:translateX(0)}20%{transform:translateX(-7px)}40%{transform:translateX(6px)}60%{transform:translateX(-4px)}80%{transform:translateX(3px)}}@keyframes drcloud{from{transform:translateX(-14px)}to{transform:translateX(34px)}}#drMini{position:absolute;right:4px;top:18px;z-index:6;padding:4px;border-radius:10px;background:rgba(10,12,40,.85);border:2px solid #ffc446;cursor:pointer;text-align:center;font-size:10px;line-height:1.2}';
  document.head.appendChild(st);
}
const tx = c => (c - (C - 1) / 2) * T3, ty = r => (r - (R - 1) / 2) * T3;

/* ---- Landschaft rund ums Brett (leichte Voxel-Boxen, nur 4 Seiten) ---- */
let drDeco = true; try{ drDeco = localStorage.getItem('dr_deco') !== '0'; }catch(e){}
function sbox(w, d, h, c, x, y, z, ex){
  const D = window.DR3D, e = document.createElement('div'); e.className = 'b'; e.style.transform = 'translate3d(' + x + 'px,' + y + 'px,' + (z + h / 2) + 'px)' + (ex || '');
  const mk = (fw, fh, tr, k) => { const f = document.createElement('div'); f.className = 'f'; f.style.cssText = 'width:' + fw + 'px;height:' + fh + 'px;left:' + (-fw / 2) + 'px;top:' + (-fh / 2) + 'px;background:' + D.col(c[0], c[1], c[2], k) + ';transform:' + tr; e.appendChild(f); };
  mk(w, d, 'translateZ(' + h / 2 + 'px)', 1.15); mk(w, h, 'translateY(' + d / 2 + 'px) rotateX(90deg)', .85);
  mk(d, h, 'translateX(' + w / 2 + 'px) rotateZ(90deg) rotateX(90deg)', .7); mk(d, h, 'translateX(' + -w / 2 + 'px) rotateZ(90deg) rotateX(90deg)', .6);
  return e;
}
function flat(cam, w, h, x, y, z, bg){ const f = document.createElement('div'); f.className = 'f'; f.style.cssText = 'width:' + w + 'px;height:' + h + 'px;left:' + (x - w / 2) + 'px;top:' + (y - h / 2) + 'px;background:' + bg + ';transform:translateZ(' + z + 'px)'; cam.appendChild(f); }
function pine(cam, x, y, sc, g1){
  sc = sc || 1; cam.appendChild(sbox(10 * sc, 10 * sc, 22 * sc, [110, 75, 40], x, y, 0));
  [[46, 26, 18], [34, 24, 40], [22, 22, 60]].forEach(a => cam.appendChild(sbox(a[0] * sc, a[0] * sc, a[1] * sc, g1, x, y, a[2] * sc)));
}
function rock(cam, x, y, sc, c){ sc = sc || 1; cam.appendChild(sbox(36 * sc, 28 * sc, 20 * sc, c, x, y, 0)); cam.appendChild(sbox(22 * sc, 18 * sc, 14 * sc, [c[0] + 25, c[1] + 25, c[2] + 25], x + 4 * sc, y - 2 * sc, 20 * sc)); }
function mountain(cam, x, y, w, h, c, snow){
  const n = 5, hh = h / n;
  for(let i = 0; i < n; i++){ const ww = w * (1 - i * .19), top = i >= n - 2; cam.appendChild(sbox(ww, ww * .8, hh + 2, top && snow ? [245, 248, 255] : [c[0] - i * 4, c[1] - i * 4, c[2] - i * 3], x, y, i * hh)); }
}
function scenery(cam, theme){
  const grass = theme ? [150, 90, 50] : [60, 130, 70], dark = theme ? [200, 80, 40] : [40, 110, 70], stone = theme ? [120, 80, 80] : [130, 135, 150];
  flat(cam, 1100, 1700, 0, 40, -6, theme ? 'linear-gradient(#6a3a2a,#3a2418)' : 'linear-gradient(#2f6a46,#1d4630)');
  // Berge hinten
  mountain(cam, -190, -600, 210, 200, stone, true); mountain(cam, 40, -680, 260, 250, [110, 118, 140], true); mountain(cam, 250, -620, 170, 150, stone, true);
  // Steinrand am Brett
  for(let r = 0; r < R; r++){ [-1, 1].forEach(sd => cam.appendChild(sbox(16, T3 - 2, 12, [118, 122, 140], sd * (C * T3 / 2 + 10), ty(r), 0))); }
  // Baeume links
  [[-250, -520, 1.2], [-300, -380, 1], [-255, -230, 1.1], [-310, -60, 1.3], [-260, 90, 1], [-300, 250, 1.2], [-250, 400, 1]].forEach(a => pine(cam, a[0], a[1], a[2], dark));
  // Felsen
  [[-230, -330, 1], [-270, 30, 1.2], [-240, 330, .9], [230, 460, 1.1], [-200, 500, 1]].forEach(a => rock(cam, a[0], a[1], a[2], stone));
  // Fluss rechts + Wasserfall
  flat(cam, 74, 1200, 275, 280, -4, theme ? '#ff8a30' : '#2a9bff'); flat(cam, 14, 1200, 240, 280, -3, theme ? '#ffd45a' : '#bfeaff'); flat(cam, 14, 1200, 312, 280, -3, theme ? '#ffd45a' : '#bfeaff');
  cam.appendChild(sbox(120, 70, 170, stone, 280, -330, 0)); cam.appendChild(sbox(90, 60, 110, [stone[0] + 12, stone[1] + 12, stone[2] + 12], 285, -345, 170));
  cam.appendChild(sbox(52, 14, 160, theme ? [255, 160, 60] : [150, 215, 255], 275, -283, 0)); cam.appendChild(sbox(30, 10, 120, [255, 255, 255], 275, -278, 0));
  [-30, 0, 30].forEach(dx => cam.appendChild(sbox(18, 14, 10, [255, 255, 255], 275 + dx, -262, 0)));
  pine(cam, 305, -200, 1, dark); rock(cam, 320, 120, 1, stone); rock(cam, 235, 300, .8, stone);
  // Zielfahnen
  [-1, 1].forEach(sd => { const x = sd * (C * T3 / 2 + 22), y = ty(R - 1); cam.appendChild(sbox(6, 6, 110, [110, 75, 40], x, y, 0)); cam.appendChild(sbox(40, 4, 24, sd < 0 ? [230, 60, 70] : [70, 130, 240], x + sd * 20, y, 84)); });
}
function palm(cam,x,y,sc,leaf){sc=sc||1;[[0,0],[3,-4],[6,-9],[8,-15]].forEach((a,i)=>cam.appendChild(sbox(10*sc,10*sc,18*sc,[130,90,50],x+a[0]*sc,y+a[1]*sc,i*18*sc)));
  const hx=x+8*sc,hy=y-15*sc,z=72*sc;[[0,-26],[0,26],[-26,0],[26,0],[-18,-18],[18,18]].forEach(d=>cam.appendChild(sbox((d[0]?34:12)*sc,(d[1]?34:12)*sc,6*sc,leaf,hx+d[0]*sc,hy+d[1]*sc,z-(Math.abs(d[0])+Math.abs(d[1]))/8)));cam.appendChild(sbox(16*sc,16*sc,10*sc,leaf,hx,hy,z+4*sc));}
function cactus(cam,x,y,sc,c){sc=sc||1;cam.appendChild(sbox(14*sc,14*sc,56*sc,c,x,y,0));cam.appendChild(sbox(8*sc,8*sc,22*sc,c,x-14*sc,y,24*sc));cam.appendChild(sbox(14*sc,8*sc,8*sc,c,x-9*sc,y,24*sc));cam.appendChild(sbox(8*sc,8*sc,18*sc,c,x+14*sc,y,34*sc));cam.appendChild(sbox(14*sc,8*sc,8*sc,c,x+9*sc,y,34*sc));}
function dead(cam,x,y,sc,c){sc=sc||1;cam.appendChild(sbox(10*sc,10*sc,48*sc,c,x,y,0));cam.appendChild(sbox(8*sc,8*sc,26*sc,c,x-12*sc,y,34*sc,'rotateY(35deg)'));cam.appendChild(sbox(8*sc,8*sc,22*sc,c,x+12*sc,y,40*sc,'rotateY(-35deg)'));cam.appendChild(sbox(6*sc,6*sc,16*sc,c,x-18*sc,y,52*sc,'rotateY(55deg)'));}
function snowpine(cam,x,y,sc,c){pine(cam,x,y,sc,c);}
function crystal(cam,x,y,sc){cam.appendChild(sbox(16*sc,16*sc,70*sc,[170,235,255],x,y,0,'rotateZ(30deg)'));cam.appendChild(sbox(12*sc,12*sc,44*sc,[210,248,255],x+16*sc,y+6*sc,0,'rotateZ(10deg)'));}
function grave(cam,x,y){cam.appendChild(sbox(22,8,30,[110,106,130],x,y,0));cam.appendChild(sbox(30,8,8,[110,106,130],x,y,16));}
function mesa(cam,x,y,w,h,c){cam.appendChild(sbox(w,w*.7,h,c,x,y,0));cam.appendChild(sbox(w*.8,w*.56,h*.35,[c[0]+20,c[1]+14,c[2]+8],x,y,h));}

function lowGrp(cam,z){const g=document.createElement('div');g.className='g';g.style.transform='translate3d(0,0,'+z+'px)';cam.appendChild(g);return g;}
function mountainBlock(cam, x, y, w, h, c, snow){
  const n = 5, hh = h / n;
  for(let i = 0; i < n; i++){ const ww = w * (1 - i * .19), top = i >= n - 2; cam.appendChild(sbox(ww, ww * .8, hh + 2, top && snow ? [245, 248, 255] : [c[0] - i * 4, c[1] - i * 4, c[2] - i * 3], x, y, i * hh)); }
}
function bush(cam,x,y,sc,c){cam.appendChild(sbox(30*sc,26*sc,16*sc,c,x,y,0));cam.appendChild(sbox(20*sc,18*sc,12*sc,[c[0]+14,c[1]+16,c[2]+8],x+3*sc,y-2*sc,16*sc));}
function flower(cam,x,y,col){cam.appendChild(sbox(3,3,12,[60,150,70],x,y,0));cam.appendChild(sbox(9,9,6,col,x,y,12));}
const AR = {
 wald:{n:'Wald-Wiese',sk:['#3b4bb0','#8a7fd6'],gr:['#58b05f','#2f7a45'],stone:[128,120,112],top:['#3f8f52','#2d7040'],wa:[[120,205,255],[255,255,255],'#3aa5ff','#d8f3ff'],mt:[130,135,150],snow:true,tree:'pine',tc:[40,115,66],rock:[130,135,150],bush:[56,140,70],fl:[[255,90,120],[255,220,90],[255,255,255],[150,120,255]],deco:[['☁️',12,30,46],['☁️',70,14,36]]},
 vulkan:{n:'Vulkan',sk:['#3a0d12','#b8381c'],gr:['#4a2218','#241008'],stone:[70,52,54],top:['#5a3426','#3a2016'],wa:[[255,130,30],[255,230,120],'#ff7a1a','#ffd45a'],mt:[70,50,52],snow:'lava',tree:'dead',tc:[60,40,36],rock:[96,64,62],bush:[110,50,36],fl:[[255,120,30],[255,200,60],[255,80,60],[255,160,60]],deco:[['🔥',16,28,36],['🌋',66,16,44]]},
 eis:{n:'Eis & Schnee',sk:['#6fb6ff','#d4ecff'],gr:['#e6f2fb','#a9c7e6'],stone:[150,185,215],top:['#eef7ff','#c8def2'],wa:[[150,225,255],[255,255,255],'#7fd6ff','#ffffff'],mt:[150,180,215],snow:true,tree:'snowpine',tc:[225,240,250],rock:[170,195,220],bush:[210,230,245],fl:[[120,200,255],[255,255,255],[190,230,255],[160,160,255]],deco:[['❄️',14,30,30],['☁️',66,14,40]],crys:true},
 wueste:{n:'Wüste',sk:['#ff9a3d','#ffd98a'],gr:['#e2b569','#b57f3d'],stone:[196,140,80],top:['#e8c27a','#c8963f'],wa:[[40,200,196],[232,255,251],'#27c4c0','#e8fffb'],mt:[190,110,60],snow:false,mesa:true,tree:'cactus',tc:[60,150,80],rock:[176,118,74],bush:[130,150,70],fl:[[255,120,160],[255,220,90],[255,255,255],[255,160,60]],deco:[['☀️',66,14,54]]},
 strand:{n:'Insel & Strand',sk:['#27a6ff','#9fe4ff'],gr:['#f2dfa4','#d8bd78'],stone:[170,160,140],top:['#f6e8b8','#e0c67a'],wa:[[23,195,216],[255,255,255],'#17c3d8','#ffffff'],mt:[90,160,110],snow:false,tree:'palm',tc:[40,160,70],rock:[160,160,160],bush:[50,160,80],fl:[[255,90,160],[255,220,90],[255,255,255],[120,200,255]],deco:[['☁️',10,26,46],['☀️',70,12,46]]},
 spuk:{n:'Spuk-Nacht',sk:['#150b30','#3c1f6e'],gr:['#2c2342','#161026'],stone:[70,62,92],top:['#3a3058','#2a2244'],wa:[[110,80,220],[198,182,255],'#6b4bd8','#c6b6ff'],mt:[70,60,100],snow:false,tree:'dead',tc:[50,40,60],rock:[90,85,110],bush:[70,60,100],fl:[[170,120,255],[255,150,60],[120,255,170],[255,255,255]],deco:[['🌙',68,12,54],['🦇',20,34,28],['🦇',50,22,24]],grave:true}
};
function sceneryIsland(cam,A){
  const W=C*T3, Hh=R*T3, dep=170, st=A.stone;
  flat(cam,1500,2000,0,0,-dep-4,'linear-gradient('+A.gr[0]+','+A.gr[1]+')');
  const lo=lowGrp(cam,-dep);
  const mt=A.mt;
  if(A.mesa){mesa(lo,-190,-700,330,300,mt);mesa(lo,100,-780,380,380,[mt[0]-15,mt[1]-10,mt[2]-6]);mesa(lo,360,-690,230,220,mt);}
  else{mountainBlock(lo,-190,-700,330,470,mt,A.snow===true);mountainBlock(lo,100,-780,380,560,[mt[0]-18,mt[1]-16,mt[2]-10],A.snow===true);mountainBlock(lo,360,-690,230,340,mt,A.snow===true);
    if(A.snow==='lava')[[-190,-700,470],[100,-780,560],[360,-690,340]].forEach(q=>{lo.appendChild(sbox(60,46,26,[255,120,30],q[0],q[1],q[2]-6));lo.appendChild(sbox(34,26,30,[255,210,80],q[0],q[1],q[2]+16));});}
  const T0={pine:pine,snowpine:snowpine,palm:palm,cactus:cactus,dead:dead}[A.tree];
  [[-330,-560,1.3],[-420,-380,1.1],[-340,-200,1.2],[-430,-30,1.3],[-350,150,1.1],[-420,320,1.2],[-340,480,1],[350,-540,1.2],[430,-360,1.1],[340,-120,1.2],[430,80,1.3],[350,260,1.1],[420,430,1.2],[-260,600,1],[250,600,1.1],[-170,-560,1],[200,-540,1]].forEach(a=>T0(lo,a[0],a[1],a[2],A.tc));
  [[-300,-470,1.1],[390,-250,1],[-390,230,1.2],[330,380,1],[-250,520,.9]].forEach(a=>rock(lo,a[0],a[1],a[2],A.rock));
  [[-290,-300,1],[300,-420,1.1],[-320,90,1],[320,130,1],[-300,400,1.1],[300,520,1]].forEach(a=>bush(lo,a[0],a[1],a[2],A.bush));
  if(A.crys)[[-300,-120],[310,40],[-330,350],[380,-200]].forEach(q=>crystal(lo,q[0],q[1],1.2));
  if(A.grave)[[-300,-120],[310,40],[-330,350],[380,-200],[-260,200]].forEach(q=>grave(lo,q[0],q[1]));
  for(let i=0;i<46;i++){const x=(Math.sin(i*12.9)*430),y=(Math.cos(i*7.3)*560)+40;if(Math.abs(x)<290&&Math.abs(y-10)<380)continue;flower(lo,x,y,A.fl[i%4]);}
  cam.appendChild(sbox(W+150,Hh+70,dep,st,0,10,-dep-2));
  cam.appendChild(sbox(W+150,Hh+70,10,[st[0]-30,st[1]-28,st[2]-26],0,10,-14));
  flat(cam,W+140,Hh+60,0,10,-1,'linear-gradient('+A.top[0]+','+A.top[1]+')');
  for(let r=0;r<R;r++){[-1,1].forEach(sd=>cam.appendChild(sbox(14,T3-2,12,[st[0]+24,st[1]+24,st[2]+24],sd*(W/2+8),ty(r),0)));}
  const w=A.wa;
  [-1,1].forEach(sd=>{const x=sd*(W/2+48);flat(cam,34,Hh+50,x,10,0.6,w[2]);flat(cam,5,Hh+50,x-sd*17,10,0.8,w[3]);flat(cam,5,Hh+50,x+sd*17,10,0.8,w[3]);
    const fy=Hh/2+46;cam.appendChild(sbox(34,10,dep,w[0],x,fy,-dep));cam.appendChild(sbox(18,8,dep,w[1],x,fy+2,-dep));
    flat(cam,96,70,x,fy+34,-dep-2,'radial-gradient('+w[2]+','+w[0].map((v,i)=>Math.round(v*.6))+')'.replace(/^/,''));[-1,0,1].forEach(k=>cam.appendChild(sbox(20,16,8,w[1],x+k*16,fy+22,-dep-2)));});
  cam.appendChild(sbox(46,12,150,w[0],0,-Hh/2-30,-20));cam.appendChild(sbox(24,8,150,w[1],0,-Hh/2-26,-20));
  [-1,1].forEach(sd=>{const x=sd*(W/2+22),y=ty(R-1);cam.appendChild(sbox(6,6,110,[110,75,40],x,y,0));cam.appendChild(sbox(40,4,24,sd<0?[230,60,70]:[70,130,240],x+sd*20,y,84));});
}

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
    const AA = AR[g.arena] || AR.wald; el.style.background = 'linear-gradient(' + AA.sk[0] + ' 0%,' + AA.sk[1] + ' 28%,' + AA.gr[0] + ' 29%,' + AA.gr[1] + ' 100%)';
    if(drDeco){ sceneryIsland(cam, AA); AA.deco.forEach(d => { const e = document.createElement('div'); e.textContent = d[0]; e.style.cssText = 'position:absolute;left:' + d[1] + '%;top:' + d[2] + 'px;font-size:' + d[3] + 'px;z-index:1;opacity:.9' + (d[0] === '☁️' ? ';animation:drcloud ' + (30 + d[1] % 20) + 's ease-in-out infinite alternate' : ''); el.appendChild(e); }); }
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
  const f = figOf(p), hearts = '❤️ ' + Math.max(0, g.hp[p]);
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
    actions = main + `<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px">${btn('🔄 ' + L('Gratis-Wurf', 'Free re-roll'), 'drReroll()', !mine || !rolled || !g.rr[0], '#3ccf7a')}${btn('✨ ' + L(figOf(0).sp, figOf(0).spEn) + ' (' + g.left[0] + '×)', 'drSpecial()', spDis, '#ffc446')}${ib}</div>`;
  }
  if(!g.sc) buildScenes();
  const st = document.getElementById('drStage');
  if(!st || !g.sc[0].parentNode || g.sc[0].parentNode !== st){
    renderApp(`<div class="panel" style="padding:10px">
      <div id="drTop" style="display:flex;gap:8px"></div>
      <div id="drStage" style="position:relative;margin:2px 0 4px"></div>
      <div id="drAct" style="margin:6px 0"></div>
      <div id="drLog" style="font-size:12px;color:#9ab;line-height:1.5;min-height:60px"></div>
      <div style="display:flex;gap:6px;margin-top:6px"><button class="btn btn-ghost" style="flex:1" onclick="drIntro()">${L('Beenden', 'Quit')}</button><button class="btn btn-ghost" style="width:60px" onclick="drMute()">${drMuted ? '🔇' : '🔊'}</button></div></div>`);
    const s2 = document.getElementById('drStage'); s2.appendChild(g.sc[0]); s2.appendChild(g.sc[1]); smoothEdges(g.sc[0]); smoothEdges(g.sc[1]); const mn = document.createElement('div'); mn.id = 'drMini'; mn.onclick = drSwap; s2.appendChild(mn);
  }
  document.getElementById('drTop').innerHTML = bar(0) + bar(1);
  updBars();
  document.getElementById('drAct').innerHTML = actions;
  document.getElementById('drLog').innerHTML = g.log.map((x, i) => `<div style="opacity:${1 - i * .18}">${x}</div>`).join('');
  updScene(g.view || 0); updMini();
}
window.drSwap = function(){ if(!g || !g.sc) return; g.view = 1 - (g.view || 0); g.sc[0].style.display = g.view === 0 ? '' : 'none'; g.sc[1].style.display = g.view === 1 ? '' : 'none'; updScene(g.view); updMini(); };
function lifeBar(id, big){
  const st = document.getElementById('drStage'); if(!st) return null;
  let d = document.getElementById(id);
  if(!d){
    d = document.createElement('div'); d.id = id;
    d.style.cssText = 'position:absolute;z-index:7;pointer-events:none;box-sizing:border-box;border-radius:14px;padding:4px 3px;background:rgba(10,12,40,.35);' + (big ? 'top:34px;left:6px;height:400px;width:30px;' : 'right:6px;top:230px;height:120px;width:20px;');
    d.innerHTML = '<div style="position:relative;width:100%;height:100%;border-radius:9px;background:rgba(0,0,0,.25);overflow:hidden"><div class="lf" style="position:absolute;left:0;right:0;top:0;transition:height .5s;background:linear-gradient(90deg,rgba(255,255,255,.35),rgba(255,255,255,.1));border-bottom:2px solid rgba(255,255,255,.9);box-shadow:inset 0 0 8px rgba(255,255,255,.5)"></div><div class="lg" style="position:absolute;left:0;right:0;transition:all .5s;background:repeating-linear-gradient(45deg,#ff5d7a,#ff5d7a 4px,#b8283f 4px,#b8283f 8px)"></div><div style="position:absolute;left:0;right:0;top:33.3%;height:2px;background:rgba(0,0,0,.55)"></div><div style="position:absolute;left:0;right:0;top:66.6%;height:2px;background:rgba(0,0,0,.55)"></div></div><div class="lt" style="position:absolute;text-align:center;font:800 ' + (big ? 13 : 10) + 'px sans-serif;color:#fff;left:-6px;right:-6px;bottom:' + (big ? -24 : -18) + 'px"></div>';
    st.appendChild(d);
  }
  return d;
}
function updBars(){
  [0, 1].forEach(p => {
    const d = lifeBar('drLife' + p, p === 0); if(!d) return;
    const hp = Math.max(0, g.hp[p]), prev = d._prev == null ? hp : d._prev, ghost = prev > hp ? prev - hp : 0;
    d.querySelector('.lf').style.height = hp + '%';
    const gg = d.querySelector('.lg'); gg.style.top = hp + '%'; gg.style.height = ghost + '%';
    if(ghost){ clearTimeout(d._t); d._t = setTimeout(() => { gg.style.height = '0%'; }, 900); }
    d._prev = hp; d.style.border = '2px solid ' + (hp <= 30 ? '#ff5d7a' : 'rgba(255,255,255,.7)');
    d.querySelector('.lt').textContent = hp;
  });
}
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
