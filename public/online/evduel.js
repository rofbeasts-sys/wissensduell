/* Duell-Anzeige fuer Turnier-Events: Tic Tac Toe, 4 gewinnt, Muehle, Dame, Schach.
 * Der Server schickt Zustand + erlaubte Zuege; hier wird nur gezeichnet und der Zug-Index zurueckgeschickt. */
(function () {
  'use strict';
  const sel = { key: '', path: [], from: null, to: null };
  const C = { a: '#c6ff3d', b: '#ff4d6a' };
  const esc2 = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const T = (de, en) => (typeof L === 'function' ? L(de, en) : de);

  function css() {
    if (document.getElementById('evdCss')) return;
    const st = document.createElement('style'); st.id = 'evdCss';
    st.textContent = `.evd{margin-top:8px}.evd .st{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:8px;font-weight:800}
.evd .who{flex:1;text-align:center;border-radius:12px;padding:6px 4px;background:rgba(255,255,255,.07);font-size:13px;border:2px solid transparent}.evd .who.on{border-color:var(--accent);background:rgba(198,255,61,.14)}
.evd .who i{display:inline-block;width:12px;height:12px;border-radius:50%;margin-right:5px;vertical-align:-1px}
.evd .bd{margin:0 auto;width:100%;max-width:360px;touch-action:manipulation;user-select:none;-webkit-user-select:none}
.evd .tt{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}.evd .tt button{aspect-ratio:1;border-radius:14px;border:0;background:rgba(255,255,255,.09);font-size:44px;font-weight:900;color:#fff;padding:0}
.evd .tt button.ok{outline:2px dashed rgba(198,255,61,.55)}
.evd .c4{background:#1b2a6b;border-radius:14px;padding:8px}.evd .c4 .cols{display:grid;grid-template-columns:repeat(7,1fr);gap:5px}.evd .c4 .col{display:grid;gap:5px;border-radius:10px;cursor:pointer}.evd .c4 .col.ok{background:rgba(198,255,61,.14)}
.evd .c4 .cell{aspect-ratio:1;border-radius:50%;background:#0c1238}.evd .c4 .cell.a{background:${C.a}}.evd .c4 .cell.b{background:${C.b}}.evd .c4 .cell.l{box-shadow:0 0 0 3px #fff inset}
.evd .sq{display:grid;grid-template-columns:repeat(8,1fr);border-radius:10px;overflow:hidden}.evd .sq div{aspect-ratio:1;display:flex;align-items:center;justify-content:center;position:relative;font-size:min(8.6vw,34px);line-height:1}
.evd .sq .lt{background:#d9c9a3}.evd .sq .dk{background:#7a5a36}.evd .sq .lm{box-shadow:0 0 0 100px rgba(198,255,61,.28) inset}.evd .sq .sl{box-shadow:0 0 0 100px rgba(255,214,0,.5) inset}
.evd .sq .tg::after{content:'';width:34%;height:34%;border-radius:50%;background:rgba(40,160,40,.75);position:absolute}.evd .sq .mv{box-shadow:0 0 0 3px rgba(198,255,61,.9) inset}
.evd .pc{width:78%;height:78%;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:.55em;font-weight:900}
.evd .pc.a{background:#f4f4f4;color:#222;box-shadow:0 2px 0 #aaa}.evd .pc.b{background:#222;color:#fff;box-shadow:0 2px 0 #000;border:2px solid #555}
.evd .ch{font-size:1em;text-shadow:0 1px 2px rgba(0,0,0,.4)}.evd .ch.a{color:#fff;-webkit-text-stroke:1px #333}.evd .ch.b{color:#161616;-webkit-text-stroke:.5px #888}
.evd .ml{width:100%;display:block}.evd .ml circle.pt{cursor:pointer}
.evd .msg{text-align:center;margin-top:8px;font-weight:800;min-height:22px}.evd .sub{text-align:center;font-size:12px;opacity:.75;margin-top:2px}`;
    document.head.appendChild(st);
  }

  function me() { return evs && evs.v && evs.v.run && evs.v.run.duel; }
  function reset(d) { const k = d ? d.g + '|' + d.rev + '|' + d.round : ''; if (sel.key !== k) { sel.key = k; sel.path = []; sel.from = null; sel.to = null; } }

  /* ---------- Rendering ---------- */
  function ttt(d) {
    const pend = d.g === 'ttq' && d.st.pend, ok = pend ? [] : (d.legal || []), old = d.g === 'ttx' ? d.st.old : null; let h = '<div class="tt">';
    for (let i = 0; i < 9; i++) {
      const v = d.st.b[i], can = ok.indexOf(i) >= 0, fade = old && (old.a === i || old.b === i), pc = pend && pend.cell === i;
      h += `<button class="${can ? 'ok' : ''}" ${can ? `onclick="evDuelMove(${ok.indexOf(i)})"` : ''} style="color:${v === 'a' ? C.a : C.b};${fade ? 'opacity:.45;' : ''}${pc ? 'outline:3px solid #fff;' : ''}">${v === 'a' ? '✕' : v === 'b' ? '◯' : (pc ? '?' : '')}</button>`;
    }
    h += '</div>';
    if (pend) {
      const my = d.legal && d.legal.length, other = d.you === 'a' ? pend.ans.b : pend.ans.a, mine = d.you === 'a' ? pend.ans.a : pend.ans.b;
      h += `<div class="bx2" style="margin-top:10px;background:rgba(255,255,255,.07);border-radius:12px;padding:10px"><div class="d" style="font-size:12px;opacity:.7">${esc2(pend.cat)} · ⏱ ${pend.left}s</div><div style="font-weight:800;font-size:16px;margin:4px 0 8px">${esc2(pend.q)}</div>` +
        (my ? pend.a.map((a, i) => `<button class="ans" onclick="evDuelMove(${i})">${esc2(a)}</button>`).join('') : `<div class="d" style="text-align:center">${mine ? '✅ ' + T('Antwort gesendet', 'Answer sent') : ''}${other && !mine ? '' : ''} ${T('Warte auf den Gegner …', 'Waiting for the opponent …')}</div>`) +
        `<div class="d" style="font-size:12px;margin-top:6px;text-align:center">${T('Wer richtig und schneller antwortet, bekommt das Feld.', 'Correct and fastest wins the cell.')}</div></div>`;
    }
    return h;
  }
  function c4(d) {
    const ok = d.legal || []; let h = '<div class="c4"><div class="cols">';
    for (let c = 0; c < 7; c++) {
      const can = ok.indexOf(c) >= 0;
      h += `<div class="col ${can ? 'ok' : ''}" ${can ? `onclick="evDuelMove(${ok.indexOf(c)})"` : ''}>`;
      for (let r = 0; r < 6; r++) { const v = d.st.b[r * 7 + c]; h += `<div class="cell ${v || ''} ${d.last === c && v && (r === 0 || !d.st.b[(r - 1) * 7 + c]) ? 'l' : ''}"></div>`; }
      h += '</div>';
    }
    return h + '</div></div>';
  }
  const MP = (() => { const o = []; [[20, 280], [70, 230], [120, 180]].forEach(([a, z]) => { const m = (a + z) / 2; o.push([a, a], [m, a], [z, a], [z, m], [z, z], [m, z], [a, z], [a, m]); }); return o; })();
  function mill(d) {
    const ok = d.legal || [], b = d.st.b;
    let from = sel.from, cands = ok.filter(m => (from == null || m.f === from) && (sel.to == null || m.t === sel.to));
    let stage = 'to';
    if (ok.some(m => m.f != null) && from == null) stage = 'from'; else if (sel.to != null) stage = 'rm';
    const hi = new Set();
    if (d.turn === d.you && !d.over) cands.forEach(m => { if (stage === 'from') hi.add(m.f); else if (stage === 'to') hi.add(m.t); else if (m.r != null) hi.add(m.r); });
    let s = '<svg class="ml" viewBox="0 0 300 300"><rect width="300" height="300" rx="16" fill="#7a5a36"/><g stroke="#e8d7b0" stroke-width="3" fill="none">';
    [[20, 280], [70, 230], [120, 180]].forEach(([a, z]) => { s += `<rect x="${a}" y="${a}" width="${z - a}" height="${z - a}"/>`; });
    s += '<path d="M150 20V120M150 180V280M20 150H120M180 150H280"/></g>';
    for (let i = 0; i < 24; i++) {
      const [x, y] = MP[i], v = b[i], h = hi.has(i), last = d.last && (d.last.t === i || d.last.f === i);
      s += `<circle class="pt" cx="${x}" cy="${y}" r="${v ? 13 : 7}" fill="${v === 'a' ? '#f4f4f4' : v === 'b' ? '#222' : '#e8d7b0'}" stroke="${h ? '#c6ff3d' : v === 'b' ? '#777' : last ? '#fff' : 'none'}" stroke-width="${h ? 4 : 2}" onclick="evDuelMill(${i})"/>`;
      if (h) s += `<circle cx="${x}" cy="${y}" r="20" fill="none" stroke="#c6ff3d" stroke-width="2" stroke-dasharray="4 3" pointer-events="none"/>`;
    }
    return s + '</svg>';
  }
  function grid(d, chess) {
    const flip = d.you === 'b', ok = d.legal || [], bd = d.st.board;
    let targets = new Set(), froms = new Set();
    if (chess) { ok.forEach(m => froms.add(m.fr + ',' + m.fc)); if (sel.from) ok.filter(m => m.fr === sel.from[0] && m.fc === sel.from[1]).forEach(m => targets.add(m.tr + ',' + m.tc)); }
    else {
      ok.forEach(p => froms.add(p[0][0] + ',' + p[0][1]));
      if (sel.path.length) ok.filter(p => pre(p, sel.path) && p.length > sel.path.length).forEach(p => targets.add(p[sel.path.length][0] + ',' + p[sel.path.length][1]));
    }
    const lm = new Set(); if (d.last) { if (chess) { lm.add(d.last.fr + ',' + d.last.fc); lm.add(d.last.tr + ',' + d.last.tc); } else if (Array.isArray(d.last)) { lm.add(d.last[0].join(',')); lm.add(d.last[d.last.length - 1].join(',')); } }
    const G = { P: '♟', N: '♞', B: '♝', R: '♜', Q: '♛', K: '♚' };
    let h = '<div class="sq">';
    for (let i = 0; i < 64; i++) {
      let r = Math.floor(i / 8), c = i % 8; if (flip) { r = 7 - r; c = 7 - c; }
      const v = bd[r][c], key = r + ',' + c, dark = (r + c) % 2 === 1, isSel = chess ? (sel.from && sel.from[0] === r && sel.from[1] === c) : (sel.path.length && sel.path[0][0] === r && sel.path[0][1] === c);
      const cls = (chess ? ((r + c) % 2 === 0 ? 'lt' : 'dk') : (dark ? 'dk' : 'lt')) + (lm.has(key) ? ' lm' : '') + (isSel ? ' sl' : '') + (targets.has(key) ? ' tg' : '') + (froms.has(key) && !sel.from && !sel.path.length ? ' mv' : '');
      let inner = '';
      if (v) inner = chess ? `<span class="ch ${v[0]}">${G[v[1]]}</span>` : `<span class="pc ${v[0]}">${v.length > 1 ? '♛' : ''}</span>`;
      h += `<div class="${cls}" onclick="evDuelSq(${r},${c},${chess ? 1 : 0})">${inner}</div>`;
    }
    return h + '</div>';
  }
  function pre(p, pf) { if (p.length < pf.length) return false; for (let i = 0; i < pf.length; i++) if (p[i][0] !== pf[i][0] || p[i][1] !== pf[i][1]) return false; return true; }

  function html(r) {
    css(); const d = r.duel; if (!d) return '';
    reset(d);
    const nm = evs && evs.v && evs.v.run, meN = (account && account.profile && account.profile.username) || T('Du', 'You'), opp = r.opp || '?';
    const youA = d.you === 'a', pa = youA ? meN : opp, pb = youA ? opp : meN, mine = d.turn === d.you;
    const col = s => (d.g === 'mill' || d.g === 'dame' || d.g === 'chess') ? (s === 'a' ? '#f4f4f4' : '#222;border:1px solid #888') : C[s];
    let h = `<div class="evd"><div class="st"><div class="who ${d.turn === 'a' && !d.over ? 'on' : ''}"><i style="background:${col('a')}"></i>${esc2(pa)}${d.g === 'mill' ? ` <span class="d">(${d.st.hand.a})</span>` : ''}</div><div class="who ${d.turn === 'b' && !d.over ? 'on' : ''}"><i style="background:${col('b')}"></i>${esc2(pb)}${d.g === 'mill' ? ` <span class="d">(${d.st.hand.b})</span>` : ''}</div></div><div class="bd">`;
    h += (d.g === 'ttt' || d.g === 'ttx' || d.g === 'ttq') ? ttt(d) : d.g === 'c4' ? c4(d) : d.g === 'mill' ? mill(d) : grid(d, d.g === 'chess');
    h += '</div>';
    let msg;
    if (d.over) msg = d.res === 'draw' ? '🤝 ' + T('Remis', 'Draw') : d.res === d.you ? '🏆 ' + T('Gewonnen!', 'You won!') : '💀 ' + T('Verloren', 'You lost');
    else if (mine) msg = '👉 ' + T('Du bist dran', 'Your turn') + (d.g === 'mill' && d.st.hand[d.you] > 0 ? ' · ' + T('Stein setzen', 'place a stone') : '');
    else msg = '⏳ ' + T(esc2(opp) + ' denkt …', esc2(opp) + ' is thinking …');
    let sub = '';
    if (d.g === 'ttx' && !d.over) sub = T('Max. 3 Zeichen je Spieler – das älteste (blass) verschwindet.', 'Max 3 marks each – the oldest (faded) vanishes.'); else if (d.g === 'ttq' && !d.over && !(d.st.pend)) sub = mine ? T('Wähle ein Feld, dann gibt es eine Quizfrage.', 'Pick a cell, then a quiz question follows.') : ''; else if (d.round > 1 && (d.g === 'ttt' || d.g === 'c4')) sub = T('Unentschieden – neue Runde!', 'Draw – new round!');
    else if (d.g === 'mill' && mine && sel.to != null) sub = T('Mühle! Tippe einen gegnerischen Stein zum Entfernen.', 'Mill! Tap an enemy stone to remove.');
    else if (d.g === 'chess' && !d.over && mine) sub = T('Bauer erreicht das Ende → wird automatisch Dame.', 'Pawns auto-promote to a queen.');
    return h + `<div class="msg">${msg}</div><div class="sub">${sub}</div></div>`;
  }

  /* ---------- Eingaben ---------- */
  async function send(mi) {
    const d = me(); if (!d || evs.busy) return; evs.busy = true;
    sel.path = []; sel.from = null; sel.to = null;
    const r = await apiCall('/api/event', { action: 'move', mi, rev: d.rev, id: evs && evs.id || undefined, token: account && account.token });
    if (!evs) return; evs.busy = false;
    if (r && r.ok && r.run) { evs.v = r; evs.off = r.now - Date.now(); evs.sig = ''; paint(); }
  }
  window.evDuelMove = mi => send(mi);
  window.evDuelMill = i => {
    const d = me(); if (!d || d.turn !== d.you || d.over) return;
    const ok = d.legal;
    const filt = () => ok.filter(m => (sel.from == null || m.f === sel.from) && (sel.to == null || m.t === sel.to));
    const stage = () => (sel.from == null && ok.some(m => m.f != null)) ? 'from' : (sel.to == null ? 'to' : 'rm');
    const st = stage(); let cs = filt();
    const nc = cs.filter(m => (st === 'from' ? m.f : st === 'to' ? m.t : m.r) === i);
    if (!nc.length) { sel.from = null; sel.to = null; if (ok.some(m => m.f === i)) sel.from = i; return paint(); }
    if (st === 'from') sel.from = i; else if (st === 'to') sel.to = i;
    cs = filt(); if (st === 'rm') cs = cs.filter(m => m.r === i);
    if (st === 'rm' || (cs.length === 1 && sel.to != null)) return send(ok.indexOf(cs[0]));
    paint();
  };
  window.evDuelSq = (r, c, chess) => {
    const d = me(); if (!d || d.turn !== d.you || d.over) return; const ok = d.legal;
    if (chess) {
      if (sel.from) { const i = ok.findIndex(m => m.fr === sel.from[0] && m.fc === sel.from[1] && m.tr === r && m.tc === c); if (i >= 0) return send(i); }
      sel.from = ok.some(m => m.fr === r && m.fc === c) ? [r, c] : null;
    } else {
      if (!sel.path.length) { if (ok.some(p => p[0][0] === r && p[0][1] === c)) sel.path = [[r, c]]; }
      else {
        const np = sel.path.concat([[r, c]]), cs = ok.filter(p => pre(p, np));
        if (!cs.length) { sel.path = ok.some(p => p[0][0] === r && p[0][1] === c) ? [[r, c]] : []; }
        else if (cs.length === 1 && cs[0].length === np.length) return send(ok.indexOf(cs[0]));
        else sel.path = np;
      }
    }
    paint();
  };
  function paint() { const el = document.getElementById('evDuelBox'); if (!el || !evs || !evs.v || !evs.v.run) return; const r = evs.v.run; el.innerHTML = html(r); evs.duelSig = sigOf(r); }
  function sigOf(r) { const d = r.duel; return d ? d.g + '|' + d.rev + '|' + d.turn + '|' + d.over + '|' + sel.from + '|' + sel.path.length + '|' + sel.to : ''; }
  window.evDuelPaint = paint;
  window.evDuelSig = sigOf;
  window.evDuelHtml = html;
})();
