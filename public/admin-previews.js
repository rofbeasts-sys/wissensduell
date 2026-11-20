/* Vorschau der Spielsteine im Admin: gleicher Code wie im Spiel (aus index.html kopiert) */
let _tttUid = 0;
function dmStone(skin, color, king, pct){
  if(String(skin).indexOf('i_') === 0){ const wd = Math.min(100, pct * 1.12); return `<div style="width:${pct}%;aspect-ratio:1;display:flex;align-items:center;justify-content:center"><img src="/chess/dame/${String(skin).slice(2)}/${color}${king ? 'k' : 's'}.png" draggable="false" alt="" style="width:${wd / pct * 100}%;height:${wd / pct * 100}%;object-fit:contain;pointer-events:none"></div>`; }
  const w = color === 'w'; let bg, bd, sh, gc;
  if(skin === 'neon'){ const c = w ? '#50dcff' : '#ff5da2'; bg = '#0a0e1e'; bd = '4px solid ' + c; sh = `0 0 10px ${c}99, inset 0 0 0 7px #0a0e1e, inset 0 0 0 9px ${c}66`; gc = c; }
  else if(skin === 'glass'){ const a = w ? '#c8f5ff' : '#ffcde1', b = w ? '#1e8cc8' : '#be2864'; bg = `radial-gradient(ellipse at 35% 22%, rgba(255,255,255,.75) 0 16%, transparent 18%), radial-gradient(circle at 35% 30%, ${a}, ${b})`; bd = '2px solid rgba(255,255,255,.5)'; sh = '0 3px 6px rgba(0,0,0,.5)'; gc = '#fff'; }
  else if(skin === 'flat'){ bg = w ? '#f0f4ff' : '#232d50'; bd = '3px solid ' + (w ? '#aab9d7' : '#5a6eaa'); sh = `0 2px 4px rgba(0,0,0,.35), inset 0 0 0 7px ${w ? '#f0f4ff' : '#232d50'}, inset 0 0 0 9px ${w ? '#aab9d7' : '#5a6eaa'}`; gc = w ? '#232d50' : '#f0f4ff'; }
  else if(skin === 'metal'){ const a = w ? '#fff0aa' : '#f5f8ff', b = w ? '#aa7814' : '#6e788c'; bg = `radial-gradient(circle at 40% 30%, ${a}, ${b})`; bd = '3px solid ' + (w ? '#5a3c08' : '#3c4452'); sh = `0 3px 5px rgba(0,0,0,.5), inset 0 0 0 6px transparent, inset 0 0 0 8px ${w ? '#7a550f88' : '#4a526088'}`; gc = w ? '#5a3c08' : '#2c323e'; }
  else if(skin === 'pulse'){ bg = w ? 'linear-gradient(135deg,#c8ff3c,#50e1ff)' : 'linear-gradient(135deg,#ffc446,#ff5da2)'; bd = '3px solid #fff'; sh = '0 3px 6px rgba(0,0,0,.45), inset 0 0 0 7px transparent, inset 0 0 0 9px rgba(8,12,26,.25)'; gc = '#08110c'; }
  else { const a = w ? '#ebcd96' : '#5a3723', b = w ? '#aa783c' : '#28160c'; bg = `radial-gradient(circle at 35% 30%, ${a}, ${b})`; bd = '2px solid #1e0f05'; sh = '0 3px 5px rgba(0,0,0,.5), inset 0 0 0 5px rgba(0,0,0,.12), inset 0 0 0 9px rgba(0,0,0,.08)'; gc = w ? '#4a2c0e' : '#ffd778'; }
  return `<div style="width:${pct}%;aspect-ratio:1;border-radius:50%;background:${bg};border:${bd};box-shadow:${sh};display:flex;align-items:center;justify-content:center;color:${gc};font-size:clamp(14px,5.2vw,28px);font-weight:900;box-sizing:border-box">${king ? '♛' : ''}</div>`;
}
function tttMarkInner(key, sym){
  const id = 'tm'+(++_tttUid);
  const X = {
    neon:`<g stroke="#c6ff3d" stroke-width="12" stroke-linecap="round" style="filter:drop-shadow(0 0 6px #c6ff3d) drop-shadow(0 0 14px #c6ff3dcc)"><path d="M20 20L80 80M80 20L20 80"/></g>`,
    glass:`<defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff9ad5"/><stop offset="1" stop-color="#8b5cf6"/></linearGradient></defs><path d="M22 14L50 42L78 14L86 22L58 50L86 78L78 86L50 58L22 86L14 78L42 50L14 22Z" fill="url(#${id})" stroke="#fff" stroke-opacity=".8" stroke-width="2.5" style="filter:drop-shadow(0 4px 8px #0009)"/><path d="M22 14L50 42L40 50Z" fill="#fff" opacity=".35"/>`,
    wood:`<g stroke="#3a210e" stroke-width="13" stroke-linecap="round"><path d="M22 22L78 78M78 22L22 78"/></g><g stroke="#e9b878" stroke-width="5" stroke-linecap="round" opacity=".55"><path d="M22 20L78 76M78 20L22 76"/></g>`,
    led:[[0,0],[1,1],[2,2],[3,3],[4,4],[4,0],[3,1],[1,3],[0,4]].map(([x,y])=>`<circle cx="${14+x*18}" cy="${14+y*18}" r="6.5" fill="#ff3d6e" style="filter:drop-shadow(0 0 4px #ff3d6e) drop-shadow(0 0 10px #ff3d6e)"/>`).join(''),
    pixel:[[0,0],[1,1],[2,2],[3,3],[4,4],[4,0],[3,1],[1,3],[0,4]].map(([x,y])=>`<rect x="${10+x*16}" y="${10+y*16}" width="16" height="16" fill="#ff5d8f" stroke="#7a1a3a" stroke-width="3"/>`).join(''),
    chalk:`<g filter="url(#tttchalk)" stroke="#f5f5f0" stroke-width="7" stroke-linecap="round" fill="none"><path d="M22 20Q50 52 80 82"/><path d="M80 20Q52 50 20 80"/></g>`,
    galaxy:`<g style="filter:drop-shadow(0 0 6px #ffd45a) drop-shadow(0 0 14px #ffd45a)"><path d="M50 8L58 42L92 50L58 58L50 92L42 58L8 50L42 42Z" fill="#ffe27a" stroke="#fff" stroke-width="2"/></g>`
  };
  const O = {
    neon:`<circle cx="50" cy="50" r="30" fill="none" stroke="#3de0ff" stroke-width="12" style="filter:drop-shadow(0 0 6px #3de0ff) drop-shadow(0 0 14px #3de0ffcc)"/>`,
    glass:`<defs><radialGradient id="${id}" cx=".35" cy=".3"><stop offset="0" stop-color="#fff"/><stop offset=".5" stop-color="#7dd3fc"/><stop offset="1" stop-color="#0369a1"/></radialGradient></defs><circle cx="50" cy="50" r="32" fill="url(#${id})" stroke="#fff" stroke-opacity=".7" stroke-width="2.5" style="filter:drop-shadow(0 6px 8px #0009)"/><circle cx="50" cy="50" r="15" fill="#0b0620" opacity=".55"/>`,
    wood:`<defs><radialGradient id="${id}" cx=".35" cy=".3"><stop offset="0" stop-color="#fafafa"/><stop offset="1" stop-color="#b9b5ad"/></radialGradient></defs><circle cx="50" cy="52" r="31" fill="#0006"/><circle cx="50" cy="49" r="31" fill="url(#${id})" stroke="#8a8579" stroke-width="1.5"/>`,
    led:[[1,0],[2,0],[3,0],[0,1],[4,1],[0,2],[4,2],[0,3],[4,3],[1,4],[2,4],[3,4]].map(([x,y])=>`<circle cx="${14+x*18}" cy="${14+y*18}" r="6.5" fill="#22e0ff" style="filter:drop-shadow(0 0 4px #22e0ff) drop-shadow(0 0 10px #22e0ff)"/>`).join(''),
    pixel:[[1,0],[2,0],[3,0],[0,1],[4,1],[0,2],[4,2],[0,3],[4,3],[1,4],[2,4],[3,4]].map(([x,y])=>`<rect x="${10+x*16}" y="${10+y*16}" width="16" height="16" fill="#4ade80" stroke="#14532d" stroke-width="3"/>`).join(''),
    chalk:`<g filter="url(#tttchalk)" stroke="#9de0ff" stroke-width="7" fill="none" stroke-linecap="round"><path d="M50 18C75 16 84 40 80 56C76 76 52 84 36 76C16 66 16 36 34 24C40 20 46 18 52 18"/></g>`,
    galaxy:`<defs><radialGradient id="${id}" cx=".35" cy=".3"><stop offset="0" stop-color="#ffb3f0"/><stop offset="1" stop-color="#6d28d9"/></radialGradient></defs><ellipse cx="50" cy="50" rx="44" ry="12" fill="none" stroke="#a5f3fc" stroke-width="4" transform="rotate(-20 50 50)" opacity=".5"/><circle cx="50" cy="50" r="24" fill="url(#${id})" style="filter:drop-shadow(0 0 10px #a78bfa)"/><path d="M8 58Q50 80 92 42" fill="none" stroke="#a5f3fc" stroke-width="4" stroke-linecap="round" opacity=".9"/>`
  };
  return (sym==='X' ? X : O)[key] || '';
}
const FU_SKINS = [
  {id:'classic', n:['Klassisch','Classic'], bg:'linear-gradient(160deg,#3a6bff,#1737b8)', trim:'#0f2a8c', hole:'#0a1030', page:'#1737b8',
   d1:'radial-gradient(circle at 34% 28%,#ffb0b0 0,#ff4a5c 28%,#c9162b 75%)', d2:'radial-gradient(circle at 34% 28%,#fff3b0 0,#ffd23a 28%,#d99a00 75%)', c1:'#e5233a', c2:'#f0b400', s1:'', s2:'', glow:'#ffffff'},
  {id:'neon', n:['Neon','Neon'], bg:'linear-gradient(160deg,#150a33,#07041a)', trim:'#7b3dff', hole:'#05020f', page:'#7b3dff',
   d1:'radial-gradient(circle at 34% 28%,#ffd0f5 0,#ff3df0 30%,#a00098 80%)', d2:'radial-gradient(circle at 34% 28%,#d0fffa 0,#26f3ff 30%,#0089a0 80%)', c1:'#ff3df0', c2:'#26f3ff', s1:'', s2:'', glow:'#ffffff', neon:true},
  {id:'gold', n:['Gold & Silber','Gold & Silver'], bg:'linear-gradient(160deg,#2b2b33,#0e0e13)', trim:'#c9a24a', hole:'#050507', page:'#c9a24a',
   d1:'radial-gradient(circle at 34% 28%,#fff6c8 0,#f6d365 30%,#b8860b 80%)', d2:'radial-gradient(circle at 34% 28%,#ffffff 0,#d6dbe6 30%,#7c8496 80%)', c1:'#f6d365', c2:'#d6dbe6', s1:'★', s2:'★', glow:'#fff6c8'},
  {id:'fireice', n:['Feuer & Eis','Fire & Ice'], bg:'linear-gradient(160deg,#394a63,#1b2433)', trim:'#5d7396', hole:'#0a0f18', page:'#5d7396',
   d1:'radial-gradient(circle at 34% 28%,#fff2b0 0,#ff9a1f 30%,#d12a00 80%)', d2:'radial-gradient(circle at 34% 28%,#ffffff 0,#8fe3ff 30%,#2a7fd4 80%)', c1:'#ff7a1f', c2:'#8fe3ff', s1:'🔥', s2:'❄️', glow:'#ffffff'},
  {id:'space', n:['Weltraum','Space'], bg:'radial-gradient(circle at 30% 20%,#3a2a7a,#0c0722 70%)', trim:'#4b3aa8', hole:'#03020c', page:'#4b3aa8',
   d1:'radial-gradient(circle at 34% 28%,#ffe2b0 0,#ff8a3d 35%,#9a3a00 85%)', d2:'radial-gradient(circle at 34% 28%,#d8f2ff 0,#3fa0ff 35%,#0b3a8a 85%)', c1:'#ff8a3d', c2:'#3fa0ff', s1:'🪐', s2:'🌍', glow:'#ffffff'},
  {id:'candy', n:['Candy','Candy'], bg:'linear-gradient(160deg,#ff8fc4,#d63a8c)', trim:'#a81f6b', hole:'#4a0b30', page:'#d63a8c',
   d1:'radial-gradient(circle at 34% 28%,#ffe0e0 0,#ff5c7a 35%,#c01036 85%)', d2:'radial-gradient(circle at 34% 28%,#ffffd8 0,#ffe53a 35%,#c9a400 85%)', c1:'#ff5c7a', c2:'#ffe53a', s1:'🍓', s2:'🍋', glow:'#ffffff'},
  {id:'wood', n:['Holz','Wood'], bg:'repeating-linear-gradient(90deg,#a8743c 0 14px,#9a6733 14px 28px)', trim:'#5a3a1a', hole:'#2a1a0a', page:'#7a5028',
   d1:'radial-gradient(circle at 34% 28%,#7a7a7a 0,#222 40%,#000 85%)', d2:'radial-gradient(circle at 34% 28%,#ffffff 0,#ececec 40%,#aaa 85%)', c1:'#6b6b6b', c2:'#ececec', s1:'', s2:'', glow:'#ffd23a'}
];
(function(){ try{ document.body.insertAdjacentHTML('beforeend','<svg width="0" height="0" style="position:absolute"><filter id="tttchalk"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="3"/><feDisplacementMap in="SourceGraphic" scale="4"/></filter></svg>'); }catch(e){} })();
function stonePv(id){
  const p = id.split('_'); const type = p[1], key = p.slice(2).join('_');
  if(type === 'dame') return '<div style="display:flex;gap:6px;width:92px">' + dmStone(key, 'w', false, 48) + dmStone(key, 'b', true, 48) + '</div>';
  if(type === 'fu'){ const k = FU_SKINS.find(x => x.id === key); if(!k) return ''; return '<div style="display:flex;gap:6px;padding:6px;border-radius:10px;background:' + k.bg + '"><span style="width:30px;height:30px;border-radius:50%;background:radial-gradient(circle at 35% 28%,rgba(255,255,255,.5),rgba(255,255,255,0) 52%),' + k.d1 + '"></span><span style="width:30px;height:30px;border-radius:50%;background:radial-gradient(circle at 35% 28%,rgba(255,255,255,.5),rgba(255,255,255,0) 52%),' + k.d2 + '"></span></div>'; }
  if(type === 'ttt') return '<div style="display:flex;gap:6px;padding:6px;border-radius:10px;background:#0a1124"><svg viewBox="0 0 100 100" style="width:34px;height:34px">' + tttMarkInner(key, 'X') + '</svg><svg viewBox="0 0 100 100" style="width:34px;height:34px">' + tttMarkInner(key, 'O') + '</svg></div>';
  return '';
}
