/* Eigene Schachfiguren (SVG) – Themes: "classic" (Weiß/Schwarz) und "dark" (dunkles Brett) */
(function(){
var P={
P:'<circle cx="50" cy="27" r="13"/><rect x="35" y="39" width="30" height="8" rx="4"/><path d="M41 46C41 60 29 68 27 80H73C71 68 59 60 59 46Z"/><rect x="18" y="79" width="64" height="13" rx="6.5"/>',
R:'<path d="M26 14h12v9h8v-9h8v9h8v-9h12v26H26z"/><rect x="32" y="38" width="36" height="8" rx="3"/><path d="M35 46L30 80H70L65 46Z"/><rect x="18" y="79" width="64" height="13" rx="6.5"/>',
B:'<circle cx="50" cy="11" r="6"/><path d="M50 17C66 28 68 44 62 50H38C32 44 34 28 50 17Z"/><rect x="33" y="48" width="34" height="8" rx="4"/><path d="M40 56C40 66 30 72 28 80H72C70 72 60 66 60 56Z"/><rect x="18" y="79" width="64" height="13" rx="6.5"/>',
N:'<path d="M24 80C24 62 32 52 42 42C34 42 28 46 22 52C20 44 28 32 40 24L42 12L52 20C72 24 80 44 78 80Z"/><rect x="18" y="79" width="64" height="13" rx="6.5"/>',
Q:'<circle cx="18" cy="22" r="5"/><circle cx="34" cy="14" r="5"/><circle cx="50" cy="11" r="5"/><circle cx="66" cy="14" r="5"/><circle cx="82" cy="22" r="5"/><path d="M20 28L32 24L38 36L50 22L62 36L68 24L80 28L72 52H28Z"/><rect x="30" y="50" width="40" height="8" rx="4"/><path d="M36 58C36 68 28 72 26 80H74C72 72 64 68 64 58Z"/><rect x="18" y="79" width="64" height="13" rx="6.5"/>',
K:'<rect x="46" y="3" width="8" height="22" rx="2"/><rect x="39" y="9" width="22" height="8" rx="2"/><path d="M50 26C70 26 78 40 72 52H28C22 40 30 26 50 26Z"/><rect x="30" y="50" width="40" height="8" rx="4"/><path d="M36 58C36 68 28 72 26 80H74C72 72 64 68 64 58Z"/><rect x="18" y="79" width="64" height="13" rx="6.5"/>'};
var TH={
 classic:{w:{a:'#ffffff',b:'#dfe3ea',s:'#111'},b:{a:'#3a3f4d',b:'#0b0d12',s:'#000'}},
 dark:{w:{a:'#ffffff',b:'#d5dae4',s:'#0b0d12'},b:{a:'#2a2f3d',b:'#07090e',s:'#e8ecf5'}}};
/* opts.accent: Farbe (Rang/Skin) -> farbige Kontur + Glow */
function star(x,y,r,col){var p='';for(var i=0;i<10;i++){var an=-Math.PI/2+i*Math.PI/5,rr=i%2?r*0.45:r;p+=(x+rr*Math.cos(an)).toFixed(1)+','+(y+rr*Math.sin(an)).toFixed(1)+' ';}return '<polygon points="'+p+'" fill="'+col+'" stroke="#0008" stroke-width=".6"/>';}
/* rank: 0..4 -> Sterne am Sockel, ab 3 (Rang 4) Krone */
function rankMarks(rank,c){ if(rank===undefined||rank===null||c!=='w') return ''; var n=rank+1,g=rank===4?'#ffd84a':(rank===0?'#c9ced9':'#ffe9a0'),o='';
  for(var k=0;k<n;k++) o+=star(50+(k-(n-1)/2)*11,85.5,4.6,g);
  if(rank>=3) o+='<g transform="translate(80,10)"><path d="M-9 8L-8 -3L-4 3L0 -5L4 3L8 -3L9 8Z" fill="'+(rank===4?'#ffd84a':'#ffe9a0')+'" stroke="#000a" stroke-width="1"/></g>';
  return o; }
var _uid=0;
/* Figuren-Sets (Bilder) und Brettfarben. Auswahl liegt im Browser; Elo-Sets werden ab einer Online-Elo frei. */
var SETS=[
 {id:'normal', de:'Standard', en:'Standard', elo:0},
 {id:'alt', de:'Klassisch (alt)', en:'Classic (old)', elo:0},
 {id:'wald', de:'Wald', en:'Forest', elo:0, earn:1, hd:'Rochiere einmal (König und Turm tauschen).', he:'Castle once (king and rook swap).'},
 {id:'kristall', de:'Kristall', en:'Crystal', elo:0, earn:1, hd:'Setze einen Gegner schachmatt.', he:'Checkmate an opponent.'},
 {id:'zoo', de:'Zoo', en:'Zoo', elo:0, earn:1, hd:'Bringe einen Bauern auf die andere Seite (Umwandlung).', he:'Get a pawn to the far side (promotion).'},
 {id:'bronze', de:'Bronze', en:'Bronze', elo:1500},
 {id:'silber', de:'Silber', en:'Silver', elo:1650},
 {id:'gold', de:'Gold', en:'Gold', elo:1800},
 {id:'diamant', de:'Diamant', en:'Diamond', elo:1950},
 {id:'smaragd', de:'Smaragd', en:'Emerald', elo:2100},
 {id:'rubin', de:'Rubin', en:'Ruby', elo:2300},
 {id:'fantasie', de:'Fantasie', en:'Fantasy', elo:0, price:10000, fprice:500, off:1},
 {id:'waldtiere', de:'Waldtiere', en:'Forest animals', elo:0, price:10000, fprice:500},
 {id:'weltraum', de:'Weltraum', en:'Space', elo:0, price:10000, fprice:500},
 {id:'drache', de:'Drachen', en:'Dragons', elo:0, price:10000, fprice:500, off:1},
 {id:'ozean', de:'Ozean', en:'Ocean', elo:0, price:10000, fprice:500, off:1},
 {id:'ozean2', de:'Ozean 2', en:'Ocean 2', elo:0, price:10000, fprice:500, off:1},
 {id:'engel', de:'Engel', en:'Angels', elo:0, price:10000, fprice:500, off:1},
 {id:'untote1', de:'Untote 1', en:'Undead 1', elo:0, price:10000, fprice:500, off:1},
 {id:'untote2', de:'Untote 2', en:'Undead 2', elo:0, price:10000, fprice:500, off:1},
 {id:'anime', de:'Anime', en:'Anime', elo:0, price:10000, fprice:500, off:1},
 {id:'untote3', de:'Untote 3', en:'Undead 3', elo:0, price:10000, fprice:500, off:1},
 {id:'neon', de:'Neon', en:'Neon', elo:0, price:10000, fprice:500, off:1},
 {id:'voelker', de:'Völker', en:'Peoples', elo:0, earn:1, te:1650, tn:'Silber', tne:'Silver', hd:'Gewinne 20 Partien gegen Silber-Bots (Stärke ab Elo 1650) oder 10 Online-Partien, wenn deine Elo mindestens Silber ist.', he:'Win 20 games against Silver bots (strength from Elo 1650) or 10 online games while your Elo is at least Silver.'},
 {id:'ritter', de:'Ritter', en:'Knights', elo:0, earn:1, te:1800, tn:'Gold', tne:'Gold', hd:'Gewinne 20 Partien gegen Gold-Bots (Stärke ab Elo 1800) oder 10 Online-Partien, wenn deine Elo mindestens Gold ist.', he:'Win 20 games against Gold bots (strength from Elo 1800) or 10 online games while your Elo is at least Gold.'},
 {id:'goblin', de:'Goblins', en:'Goblins', elo:0, price:10000, fprice:500, off:1}];
var BOARDS=[
 {id:'gruen', de:'Grün', en:'Green', l:'#eeeed2', d:'#769656'},
 {id:'blau', de:'Blau', en:'Blue', l:'#dfe6ee', d:'#5f86b5'},
 {id:'rotblau', de:'Rot und Blau', en:'Red and blue', l:'#e9696d', d:'#4f7bd6'},
 {id:'schwarzrot', de:'Schwarz und Rot', en:'Black and red', l:'#d9494f', d:'#5b5b66'},
 {id:'rotweiss', de:'Rot und Weiß', en:'Red and white', l:'#f6eded', d:'#cf4a55'},
 {id:'braun', de:'Braun', en:'Brown', l:'#f0d9b5', d:'#b58863'},
 {id:'lila', de:'Lila', en:'Purple', l:'#ece4f4', d:'#8d70b8'},
 {id:'tuerkis', de:'Türkis', en:'Teal', l:'#e3f1ee', d:'#3f9c92'},
 {id:'grau', de:'Grau', en:'Grey', l:'#e6e6e6', d:'#8c8f96'}];
function ls(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } }
function lset(k,v){ try{ localStorage.setItem(k,v); }catch(e){} }
var BS=window.BpSets={ list:SETS, boards:BOARDS,
  maxElo:function(){ return parseInt(ls('bp_max_elo'),10)||0; },
  noteElo:function(e){ e=parseInt(e,10)||0; var old=BS.maxElo(); if(e>old){ lset('bp_max_elo',String(e)); try{ var _de=(ls('wq_lang')!=='en'); SETS.filter(function(q){return q.elo>0&&q.elo>old&&q.elo<=e;}).forEach(function(q){ if(window.bpNotify) window.bpNotify({icon:'🏆',title:_de?'Elo-Figuren freigeschaltet':'Elo pieces unlocked',text:(_de?q.de:q.en)+' (Elo '+q.elo+')',color:'#ffd45a'}); }); }catch(x){} } },
  admin:function(){ return !!ls('bp_admin_key'); },
  owned:function(){ try{ return JSON.parse(ls('bp_sets_owned')||'[]'); }catch(e){ return []; } },
  setOwned:function(a){ lset('bp_sets_owned',JSON.stringify(a||[])); },
  earned:function(){ try{ return JSON.parse(ls('bp_sets_earned')||'[]'); }catch(e){ return []; } },
  preview:function(id, lang, info){ var x=SETS.filter(function(q){return q.id===id;})[0]; if(!x) return; var de=(lang||ls('wq_lang'))!=='en';
    var old=document.getElementById('bpPrevOv'); if(old) old.remove();
    var ov=document.createElement('div'); ov.id='bpPrevOv';
    ov.style.cssText='position:fixed;inset:0;z-index:100005;background:#05081a;overflow:auto;color:#fff;font-family:system-ui,sans-serif;padding:16px;display:flex;flex-direction:column;align-items:center';
    var G={K:'♚',Q:'♛',R:'♜',B:'♝',N:'♞',P:'♟'}, sz='min(27vw,130px)';
    function row(c){ return '<div style="display:flex;flex-wrap:wrap;justify-content:center;gap:6px;margin:6px 0;padding:10px;border-radius:16px;background:'+(c==='w'?'rgba(255,255,255,.10)':'rgba(255,255,255,.04)')+'">'+['K','Q','R','B','N','P'].map(function(t){
      return id==='alt' ? '<div style="width:'+sz+';height:'+sz+';display:flex;align-items:center;justify-content:center;font-size:min(20vw,96px);color:'+(c==='w'?'#fff':'#111')+';text-shadow:'+(c==='w'?'0 0 3px #000':'0 0 3px #fff')+'">'+G[t]+'</div>' : '<img src="/chess/sets/'+id+'/'+c+t+'.png" alt="" style="width:'+sz+';height:'+sz+';object-fit:contain">'; }).join('')+'</div>'; }
    ov.innerHTML='<div style="max-width:560px;width:100%"><div style="display:flex;justify-content:space-between;align-items:center;gap:10px"><b style="font-size:22px">'+(de?x.de:x.en)+'</b><button id="bpPrevX" style="padding:8px 16px;border-radius:10px;border:1px solid rgba(255,255,255,.3);background:transparent;color:#fff;font-size:15px;cursor:pointer">'+(de?'Schließen':'Close')+'</button></div>'
      +(info?'<div style="opacity:.8;font-size:13px;margin:6px 0">'+info+'</div>':'')+'<div style="font-size:12px;opacity:.6;margin:8px 0 2px">'+(de?'Weiß':'White')+'</div>'+row('w')+'<div style="font-size:12px;opacity:.6;margin:8px 0 2px">'+(de?'Schwarz':'Black')+'</div>'+row('b')+'</div>';
    ov.onclick=function(e){ if(e.target===ov||e.target.id==='bpPrevX') ov.remove(); };
    document.body.appendChild(ov); },
  noteChallenges:function(total){ var cfg=BS.earnCfg(), earned=BS.earned(); Object.keys(cfg).forEach(function(id){ var e=cfg[id]; if(e.type==='challenges' && earned.indexOf(id)<0 && total>=e.n) BS.earn(id); }); },
  earnCfg:function(){ try{ return JSON.parse(ls('bp_earn_cfg')||'{}'); }catch(e){ return {}; } },
  applyEarn:function(map){ map=map||{}; try{ lset('bp_earn_cfg',JSON.stringify(map)); }catch(e){}
    SETS.forEach(function(q){ var c=map[q.id]; if(c){ delete q.price; q.earn=1; q.ec=c; q.hd=c.de; q.he=c.en; q.off=0; } }); },
  noteGame:function(c){ c=c||{}; var win=c.res==='win';
    var st=parseInt(ls('bp_ea_streak'),10)||0; st=win?st+1:0; lset('bp_ea_streak',String(st));
    var cfg=BS.earnCfg(), earned=BS.earned();
    Object.keys(cfg).forEach(function(id){ if(earned.indexOf(id)>=0) return; var e=cfg[id], k='bp_ea_'+id, v=parseInt(ls(k),10)||0, done=false;
      if(e.type==='wins'){ if(win) v++; done=v>=e.n; }
      else if(e.type==='online'){ if(win&&c.online) v++; done=v>=e.n; }
      else if(e.type==='mates'){ if(win&&c.mate) v++; done=v>=e.n; }
      else if(e.type==='streak'){ v=st; done=v>=e.n; }
      else if(e.type==='winFast'){ done=win&&c.moves>0&&c.moves<=e.n; }
      else if(e.type==='winBotElo'){ done=win&&c.bot>=e.n; }
      lset(k,String(v)); if(done) BS.earn(id); }); },
  progress:function(id){ var x=SETS.filter(function(q){return q.id===id;})[0]; if(x&&x.ec){ var c=x.ec, cnt=parseInt(ls('bp_ea_'+id),10)||0, counted=(c.type==='wins'||c.type==='online'||c.type==='mates'||c.type==='streak'||c.type==='challenges'); if(c.type==='challenges'){ try{ cnt=Object.keys(JSON.parse(ls('bp_ch_done')||'{}')).length; }catch(e){ cnt=0; } } return { ec:true, c:counted?Math.min(cnt,c.n):null, n:c.n, de:c.de, en:c.en }; } if(!x||!x.te) return null; return { wb:parseInt(ls('bp_wb_'+id),10)||0, wo:parseInt(ls('bp_wo_'+id),10)||0, nb:20, no:10, te:x.te, tn:x.tn, tne:x.tne }; },
  noteWin:function(ctx){ ctx=ctx||{}; var n=(parseInt(ls('bp_chess_wins'),10)||0)+1; lset('bp_chess_wins',String(n));
    SETS.filter(function(q){return q.te;}).forEach(function(q){ var k, v;
      if(ctx.bot>=q.te){ k='bp_wb_'+q.id; v=(parseInt(ls(k),10)||0)+1; lset(k,String(v)); if(v>=20) BS.earn(q.id); }
      if(ctx.online && BS.maxElo()>=q.te){ k='bp_wo_'+q.id; v=(parseInt(ls(k),10)||0)+1; lset(k,String(v)); if(v>=10) BS.earn(q.id); } });
    return n; },
  earn:function(id){ var a=BS.earned(); if(a.indexOf(id)>=0) return; a.push(id); lset('bp_sets_earned',JSON.stringify(a));
    var x=SETS.filter(function(q){return q.id===id;})[0]; if(!x) return;
    try{ var _de=(ls('wq_lang')!=='en'); if(window.bpNotify) window.bpNotify({icon:'♟',title:_de?'Figuren freigeschaltet':'Pieces unlocked',text:(_de?x.de:x.en),color:'#c6ff3d'}); }catch(e){} },
  unlocked:function(id){ var x=SETS.filter(function(q){return q.id===id;})[0]; if(!x) return false; if(x.price) return BS.owned().indexOf(id)>=0; if(x.earn) return BS.earned().indexOf(id)>=0; if(x.elo>0) return BS.maxElo()>=x.elo; return true; },
  get:function(){ var id=ls('bp_piece_set')||'normal'; return BS.unlocked(id)?id:'normal'; },
  set:function(id){ if(BS.unlocked(id)){ lset('bp_piece_set',id); BS.preload(); return true; } return false; },
  board:function(){ var id=ls('bp_board_theme')||'gruen'; return BOARDS.filter(function(q){return q.id===id;})[0]||BOARDS[0]; },
  setBoard:function(id){ lset('bp_board_theme',id); BS.applyBoard(); },
  applyBoard:function(){ var b=BS.board(), de=document.documentElement, st=de.style;
    if(b.img){ var pl=b.pl!=null?b.pl:b.pf, pr=b.pr!=null?b.pr:b.pf, pt=b.pt!=null?b.pt:b.pf, pb=b.pb!=null?b.pb:b.pf; de.classList.add('bd-img'); de.classList.toggle('bd-tr',!!b.tr); st.setProperty('--bd-url','url('+b.img+')'); st.setProperty('--pf',String(b.pf||0)); st.setProperty('--pl',String(pl)); st.setProperty('--pr',String(pr)); st.setProperty('--pt',String(pt)); st.setProperty('--pb',String(pb)); st.setProperty('--co',b.co||'#fff'); st.setProperty('--cs',b.cs||'0 0 3px #000'); st.setProperty('--k',String(1+pl+pr)); }
    else { de.classList.remove('bd-img'); de.classList.remove('bd-tr'); st.setProperty('--k','1'); st.setProperty('--sq-light',b.l); st.setProperty('--sq-dark',b.d); } },
  preload:function(){ var id=BS.get(); if(id==='alt') return; ['K','Q','R','B','N','P'].forEach(function(t){ ['w','b'].forEach(function(c){ var i=new Image(); i.src='/chess/sets/'+id+'/'+c+t+'.png'; }); }); }
};
try{ BS.applyEarn(BS.earnCfg()); var _tk=ls('wq_account_token'); if(_tk && typeof fetch==='function') fetch('/api/pieceset-status',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:_tk})}).then(function(r){return r.json();}).then(function(r){ if(r&&r.ok&&r.earn) BS.applyEarn(r.earn); }).catch(function(){}); }catch(e){}
BS.applyBoard(); BS.preload();
window.chessPieceSVG=function(t,c,theme,opts){
  if(!(opts&&(opts.accent||opts.body||opts.rank!==undefined))&&(!theme||theme==='classic')){ var sid=BS.get(); if(sid!=='alt') return '<svg viewBox="0 0 100 100" class="pcs" style="filter:drop-shadow(0 2px 2px rgba(0,0,0,.35))"><image href="/chess/sets/'+sid+'/'+c+t+'.png" x="6" y="6" width="88" height="88"/></svg>'; }
  opts=opts||{}; var th=(TH[theme]||TH.classic)[c], id='pg'+(++_uid)+(theme||'c')+c+t+(opts.accent?opts.accent.replace('#',''):'')+(opts.body?opts.body.join('').replace(/#/g,''):'');
  var stroke=opts.accent||th.s, a=th.a, b=th.b;
  if(opts.accent && c==='w' && !opts.body){ a='#ffffff'; b=opts.accent; }
  if(opts.body){ a=opts.body[0]; b=opts.body[1]; }
  var f=opts.accent?'drop-shadow(0 0 5px '+opts.accent+'cc) drop-shadow(0 2px 3px #0008)':'drop-shadow(0 3px 3px #0007)';
  var hi=(c==='w')?'#00000000':'#ffffff55';
  return '<svg viewBox="0 0 100 100" class="pcs" style="filter:'+f+'"><defs><linearGradient id="'+id+'" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="'+a+'"/><stop offset="1" stop-color="'+b+'"/></linearGradient></defs>'+
  '<g fill="url(#'+id+')" stroke="'+stroke+'" stroke-width="3.5" stroke-linejoin="round">'+P[t]+'</g>'+
  (t==='N'?'<circle cx="54" cy="32" r="3.2" fill="'+stroke+'"/>':'')+rankMarks(opts.rank,c)+
  '<path d="M31 18Q27 40 30 70" fill="none" stroke="'+(c==='w'?'#9aa3b5':'#ffffff')+'" stroke-opacity=".35" stroke-width="1.4" stroke-linecap="round"/></svg>';
};
})();
