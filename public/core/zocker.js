/* BRAINUPS: Hauptmenü-Karte, Bestenlisten (gesamt / Monat / je Spiel), Tages- und Wochen-Belohnungen, Einblendung nach jeder Partie */
(function(){
const N = v => (Number(v) || 0).toLocaleString('de-DE');
const q = id => document.getElementById(id);
const tok = () => (typeof account !== 'undefined' && account && account.token) || null;
const api = (body) => apiCall('/api/zp', Object.assign({ token: tok() }, body));
const CSS = `<style>
.zp .row{display:flex;gap:10px;align-items:center;padding:9px 0;border-top:1px solid rgba(255,255,255,.08);font-size:15px}
.zp .row:first-child{border-top:0}.zp .row b.n{width:26px;opacity:.8}.zp .row span.nm{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.zp .row.me{background:rgba(198,255,61,.12);border-radius:10px;padding-left:8px;padding-right:8px}
.zp .tabs{display:flex;gap:8px;margin:12px 0}.zp .tabs button{flex:1;padding:10px 4px;border-radius:12px;border:1px solid var(--line);background:rgba(255,255,255,.06);color:var(--text);font-weight:800;font-size:13px;cursor:pointer}
.zp .tabs button.on{background:var(--accent);color:#10150a;border-color:var(--accent)}
.zp .box{background:rgba(255,255,255,.06);border:1px solid var(--line);border-radius:16px;padding:14px;margin-top:12px}
.zp .bar{height:12px;border-radius:8px;background:rgba(255,255,255,.12);margin-top:8px;overflow:hidden}.zp .bar i{display:block;height:100%;background:linear-gradient(90deg,#c6ff3d,#3de0ff)}
.zp .d{opacity:.7;font-size:12px}.zp .gold{color:#ffc83d}.zp .ok{color:var(--accent);font-weight:900}
.zp .take{background:var(--accent);color:#10150a;font-weight:900;border-radius:10px;padding:5px 12px;font-size:12px;border:0;cursor:pointer}
.zp .g{opacity:.45}
#zpToast{position:fixed;left:12px;right:12px;bottom:14px;z-index:9999;background:#151b2b;border:1px solid var(--accent);border-radius:16px;padding:12px 16px;box-shadow:0 8px 30px rgba(0,0,0,.5);display:flex;align-items:center;gap:12px;cursor:pointer}
#zpToast b{color:var(--accent);font-size:24px}
</style>`;
let cache = null, cardTimer = 0;
async function status(){ if(!tok()) return null; const r = await api({ action: 'status' }); if(r && r.ok) cache = r; return r && r.ok ? r : null; }

/* ---- Hauptmenü-Karte ---- */
window.zpCardHtml = function(){
  setTimeout(zpFillCard, 30);
  return `<div class="mode-card" id="zpCard" onclick="zpOpen('total')" style="border-color:var(--accent)"><div class="d" style="font-size:12px;opacity:.75;letter-spacing:1px">${L('BRAINUPS','BRAINUPS')}</div><div id="zpCardBody" style="margin-top:4px;font-size:15px">${L('Lädt…','Loading…')}</div></div>`;
};
async function zpFillCard(){
  const el = q('zpCardBody'); if(!el) return;
  if(!tok()){ el.innerHTML = `<div style="font-size:14px;opacity:.85">${L('Melde dich an, spiele und sammle Punkte, Belohnungen und Plätze.','Log in, play and collect points, rewards and ranks.')}</div>`; return; }
  const s = await status(); const el2 = q('zpCardBody'); if(!el2) return; if(!s){ el2.textContent = L('Nicht erreichbar.', 'Not reachable.'); return; }
  const nextD = (s.day.tiers.find((t, i) => i >= s.day.claimed && s.day.pts < t.p) || null), nextP = nextD ? nextD.p : s.day.tiers[s.day.tiers.length - 1].p;
  el2.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center"><div style="font-size:26px;font-weight:900">${N(s.total)}</div><div style="text-align:right"><div class="d">${L('Heute','Today')}</div><div style="font-weight:900">${N(s.day.pts)} / ${N(nextP)}</div></div></div><div style="height:10px;border-radius:8px;background:rgba(255,255,255,.12);margin-top:8px;overflow:hidden"><i style="display:block;height:100%;width:${Math.min(100, Math.round(s.day.pts / nextP * 100))}%;background:linear-gradient(90deg,#c6ff3d,#3de0ff)"></i></div><div class="d" style="margin-top:6px;display:flex;justify-content:space-between"><span>${L('Platz ','Rank ')}#${s.rank}</span><span>${nextD ? L('Nächste Belohnung bei ', 'Next reward at ') + N(nextD.p) : L('Heute alles erreicht', 'All reached today')}</span></div>`;
}

/* ---- Seiten ---- */
function shell(title, sub, tab, inner){
  const tabs = [['total', L('Gesamt','Total')], ['rewards', L('Belohnungen','Rewards')], ['month', L('Monat','Month')]];
  return CSS + `<div class="panel zp"><div style="display:flex;align-items:center;gap:10px"><button class="btn btn-ghost" style="padding:8px 14px" onclick="renderMainMenu()">${L('Zurück','Back')}</button><div style="font-size:20px;font-weight:900">${title}</div></div><div class="d" style="margin-top:6px">${sub}</div>` +
    (tab ? `<div class="tabs">${tabs.map(t => `<button class="${t[0] === tab ? 'on' : ''}" onclick="zpOpen('${t[0]}')">${t[1]}</button>`).join('')}</div>` : '') + inner + `<div class="d" style="text-align:center;margin-top:14px">${L('Mitspielen 50 · Sieg 100 (nur Online-Spiele) · Klasse bestanden 250','Playing 50 · Win 100 (online games only) · Class passed 250')}</div></div>`;
}
function rows(top, me, rewards){
  if(!top || !top.length) return `<div class="d" style="text-align:center;padding:10px">${L('Noch keine Einträge.','No entries yet.')}</div>`;
  let h = top.map(r => `<div class="row ${me && me.pos === r.pos ? 'me' : ''}"><b class="n">${r.pos}</b><span class="nm">${esc(r.name)}</span><b>${N(r.pts)}</b>${rewards && rewards[r.pos - 1] ? `<span class="gold" style="font-size:12px">${N(rewards[r.pos - 1])}</span>` : ''}</div>`).join('');
  if(me && me.pos && me.pos > top.length) h += `<div class="row me"><b class="n">${me.pos}</b><span class="nm">${L('Du','You')}</span><b>${N(me.pts)}</b></div>`;
  return h;
}
window.zpOpen = async function(tab){
  tab = tab || 'total';
  renderApp(shell(L('BRAINUPS','BRAINUPS'), L('Alle Spiele zusammen','All games together'), tab, `<div class="box d">${L('Lädt…','Loading…')}</div>`));
  const s = tok() ? await status() : null;
  let inner = '';
  if(tab === 'total'){
    const b = await api({ action: 'board', kind: 'total' });
    inner = (s ? `<div class="box" style="border-color:var(--accent)"><div class="d">${L('DEINE PUNKTE','YOUR POINTS')}</div><div style="font-size:30px;font-weight:900">${N(s.total)}</div><div class="d">${L('Platz ','Rank ')}#${s.rank}</div></div>` : `<div class="box d">${L('Melde dich an, um Punkte zu sammeln.','Log in to collect points.')}</div>`) + `<div class="box">${rows(b.top, b.me)}</div>` + gameButtons();
  } else if(tab === 'rewards'){
    inner = !s ? `<div class="box d">${L('Melde dich an.','Log in.')}</div>` : rewardBox(L('HEUTE','TODAY'), 'day', s.day, s.day.pts) + rewardBox(L('DIESE WOCHE','THIS WEEK'), 'week', s.week, s.week.pts) + `<div class="d" style="text-align:center;margin-top:10px">${L('Tageslimit: ','Daily limit: ')}${N(s.day.cap)} ${L('Punkte','points')}</div>`;
  } else {
    const b = await api({ action: 'board', kind: 'month' });
    const pm = s && s.prevMonth && s.prevMonth.claimable ? `<div class="box" style="border-color:#ffc83d"><b>${L('Letzter Monat: Platz ','Last month: rank ')}${s.prevMonth.rank}</b><div class="d">${N(s.prevMonth.coins)} ${L('Münzen warten auf dich','coins are waiting')}</div><button class="take" style="margin-top:8px" onclick="zpClaim('month')">${L('Abholen','Collect')}</button></div>` : '';
    inner = pm + `<div class="box"><div class="d" style="margin-bottom:6px">${L('Noch ','') + (s ? s.month.endsInDays : '–') + L(' Tage · die besten 10 werden belohnt (Münzen)',' days left · top 10 get rewards (coins)')}</div>${rows(b.top, b.me, b.rewards)}</div>`;
  }
  renderApp(shell(L('BRAINUPS','BRAINUPS'), tab === 'month' ? L('Monats-Bestenliste','Monthly leaderboard') : L('Alle Spiele zusammen','All games together'), tab, inner));
};
function rewardBox(title, kind, st, pts){
  const rowsH = st.tiers.map((t, i) => {
    const got = i < st.claimed, can = !got && pts >= t.p;
    return `<div class="row ${got || can ? '' : 'g'}"><span class="nm">${N(t.p)} ${L('Punkte','points')}</span><span class="gold" style="font-weight:800">${N(t.c)} ${L('Münzen','coins')}</span>${got ? `<span class="ok">✓</span>` : can ? `<button class="take" onclick="zpClaim('${kind}')">${L('Abholen','Collect')}</button>` : `<span class="d">${L('Noch ','')}${N(t.p - pts)}</span>`}</div>`;
  }).join('');
  const max = st.tiers[st.tiers.length - 1].p;
  return `<div class="box"><div style="display:flex;justify-content:space-between"><b>${title}</b><b>${N(pts)}</b></div><div class="bar"><i style="width:${Math.min(100, Math.round(pts / max * 100))}%"></i></div><div style="margin-top:8px">${rowsH}</div></div>`;
}
window.zpClaim = async function(kind){
  const r = await api({ action: 'claim', kind });
  if(r && r.ok){ try{ if(account && account.profile) account.profile.coins = r.coins; }catch(e){} zpToastShow(r.granted ? '+' + N(r.granted) : '', r.granted ? L('Münzen abgeholt','coins collected') : L('Nichts abzuholen','Nothing to collect')); }
  zpOpen(kind === 'month' ? 'month' : 'rewards');
};
const GAMESF = () => [['ttt', 'Tic Tac Toe'], ['chess', L('Schach & Dame','Chess & Checkers')], ['fourups', L('4 gewinnt','Connect 4')], ['taboo', 'Taboo']];
function gameButtons(){
  return `<div class="box"><div class="d" style="margin-bottom:8px">${L('BESTENLISTEN JE SPIEL','LEADERBOARD PER GAME')}</div><div style="display:flex;gap:8px;flex-wrap:wrap">${GAMESF().map(g => `<button class="btn btn-ghost" style="flex:1;min-width:30%;padding:10px 6px" onclick="zpGame('${g[0]}')">${g[1]}</button>`).join('')}</div></div>`;
}
window.zpGame = async function(game){
  const name = (GAMESF().find(g => g[0] === game) || [0, game])[1];
  renderApp(CSS + `<div class="panel zp"><div class="d">${L('Lädt…','Loading…')}</div></div>`);
  const b = await api({ action: 'board', kind: 'game', game });
  renderApp(CSS + `<div class="panel zp"><div style="display:flex;align-items:center;gap:10px"><button class="btn btn-ghost" style="padding:8px 14px" onclick="zpOpen('total')">${L('Zurück','Back')}</button><div style="font-size:20px;font-weight:900">${name.toUpperCase()}</div></div><div class="d" style="margin-top:6px">${L('Punkte aus Online-Partien','Points from online games')}</div>${b && b.me && b.me.pts ? `<div class="box" style="border-color:var(--accent)"><div class="d">${L('DEINE PUNKTE','YOUR POINTS')}</div><div style="font-size:28px;font-weight:900">${N(b.me.pts)}</div></div>` : ''}<div class="box">${rows(b.top, b.me)}</div></div>`);
};
window.zpGameLabel = function(game){ return (GAMESF().find(g => g[0] === game) || [0, ''])[1]; };

/* ---- Einblendung nach der Partie ---- */
let toastT = 0, lastT = 0;
function zpToastShow(big, text, game){
  if(!q('zpToastCss')){ const st = document.createElement('style'); st.id = 'zpToastCss'; st.textContent = '#zpToast{position:fixed;left:12px;right:12px;bottom:14px;z-index:9999;background:#151b2b;border:1px solid var(--accent);border-radius:16px;padding:12px 16px;box-shadow:0 8px 30px rgba(0,0,0,.5);display:flex;align-items:center;gap:12px;cursor:pointer;color:var(--text)}#zpToast b{color:var(--accent);font-size:24px}'; document.head.appendChild(st); }
  let el = q('zpToast'); if(el) el.remove();
  el = document.createElement('div'); el.id = 'zpToast';
  el.innerHTML = `<b>${big}</b><div style="flex:1"><div style="font-weight:800">${text}</div></div><span class="d" style="opacity:.7;font-size:12px">${L('Liste','List')} ›</span>`;
  el.onclick = () => { el.remove(); try{ game ? zpGame(game) : zpOpen('total'); }catch(e){} };
  document.body.appendChild(el); clearTimeout(toastT); toastT = setTimeout(() => { try{ el.remove(); }catch(e){} }, 7000);
}
let gainSum = 0;
function zpGainModal(gain, total, game){
  const old = q('zpGainBox'); if(old) gainSum += gain; else gainSum = gain;
  if(old) old.remove();
  if(!q('zpGainCss')){ const st = document.createElement('style'); st.id = 'zpGainCss'; st.textContent = '#zpGainBox{position:fixed;inset:0;z-index:100010;background:#000b;display:flex;align-items:center;justify-content:center;padding:18px}#zpGainBox .c{background:#101a2b;border:2px solid var(--accent);border-radius:20px;padding:22px 20px;max-width:340px;width:100%;text-align:center;color:#fff;font-family:inherit;animation:zpPop .35s ease-out}#zpGainBox .big{font-size:56px;font-weight:900;color:var(--accent);line-height:1.05}@keyframes zpPop{from{transform:scale(.7);opacity:0}to{transform:scale(1);opacity:1}}'; document.head.appendChild(st); }
  const el = document.createElement('div'); el.id = 'zpGainBox';
  el.innerHTML = `<div class="c"><svg width="120" height="64" viewBox="0 0 110 70" style="display:block;margin:0 auto"><defs><filter id="zpG"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><polyline points="4,40 30,40 40,40 48,12 60,58 70,30 78,40 106,40" fill="none" stroke="#c6ff3d" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" filter="url(#zpG)"/></svg><div style="font-weight:900;font-size:16px;letter-spacing:1px;margin-top:4px">${L('DEINE BRAINUPS STEIGEN!','YOUR BRAINUPS ARE RISING!')}</div><div class="big">+${N(gainSum)}</div><div style="opacity:.85;margin:6px 0 14px">${L('Brainups gesamt: ','Total Brainups: ')}<b>${N(total)}</b></div><button class="btn btn-primary btn-block" id="zpGainOk">${L('WEITER','CONTINUE')}</button><button class="btn btn-ghost btn-block" id="zpGainList" style="margin-top:8px">${L('Bestenliste ansehen','View leaderboard')}</button></div>`;
  document.body.appendChild(el);
  q('zpGainOk').onclick = () => { el.remove(); gainSum = 0; };
  q('zpGainList').onclick = () => { el.remove(); gainSum = 0; try{ game ? zpGame(game) : zpOpen('total'); }catch(e){} };
}
window.zpOnGain = function(m){
  if(!m || !m.gain || m.t === lastT) return; lastT = m.t;
  zpGainModal(m.gain, m.total, m.game);
  try{ if(q('zpCardBody')) zpFillCard(); }catch(e){}
};
window.zpFillCard = zpFillCard;
window.zpChemFound = function(name){ try{ if(tok()) api({ action: 'once', kind: 'chem', id: String(name) }); }catch(e){} };
window.zpVocabPassed = function(id){ try{ if(tok()) api({ action: 'once', kind: 'vocab', id: String(id) }); }catch(e){} };
})();
