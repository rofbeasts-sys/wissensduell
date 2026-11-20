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
 {id:'fantasie', de:'Fantasie', en:'Fantasy', elo:0, price:10000, fprice:500},
 {id:'waldtiere', de:'Waldtiere', en:'Forest animals', elo:0, price:10000, fprice:500},
 {id:'weltraum', de:'Weltraum', en:'Space', elo:0, price:10000, fprice:500},
 {id:'drache', de:'Drachen', en:'Dragons', elo:0, price:10000, fprice:500},
 {id:'ozean', de:'Ozean', en:'Ocean', elo:0, price:10000, fprice:500}];
var BOARDS=[
 {id:'holzgruen', de:'Holzrahmen', en:'Wood frame', img:'/chess/boards/holzgruen.jpg', pf:0.0470, co:'#000', cs:'none'},
 {id:'holzblau', de:'Holzrahmen blau', en:'Wood frame blue', img:'/chess/boards/holzblau.jpg', pf:0.0470, co:'#000', cs:'none'},
 {id:'gruen', de:'Grün', en:'Green', l:'#eeeed2', d:'#769656'},
 {id:'blau', de:'Blau', en:'Blue', l:'#dee3e6', d:'#8ca2ad'},
 {id:'holz', de:'Holz', en:'Wood', l:'#f0d9b5', d:'#b58863'},
 {id:'violett', de:'Violett', en:'Purple', l:'#e8e0f5', d:'#8a6fb8'},
 {id:'grau', de:'Grau', en:'Grey', l:'#e5e5e5', d:'#7d8a99'},
 {id:'nacht', de:'Nacht', en:'Night', l:'#c9d4e8', d:'#4a5f86'}];
function ls(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } }
function lset(k,v){ try{ localStorage.setItem(k,v); }catch(e){} }
var BS=window.BpSets={ list:SETS, boards:BOARDS,
  maxElo:function(){ return parseInt(ls('bp_max_elo'),10)||0; },
  noteElo:function(e){ e=parseInt(e,10)||0; if(e>BS.maxElo()) lset('bp_max_elo',String(e)); },
  admin:function(){ return !!ls('bp_admin_key'); },
  owned:function(){ try{ return JSON.parse(ls('bp_sets_owned')||'[]'); }catch(e){ return []; } },
  setOwned:function(a){ lset('bp_sets_owned',JSON.stringify(a||[])); },
  earned:function(){ try{ return JSON.parse(ls('bp_sets_earned')||'[]'); }catch(e){ return []; } },
  earn:function(id){ var a=BS.earned(); if(a.indexOf(id)>=0) return; a.push(id); lset('bp_sets_earned',JSON.stringify(a));
    var x=SETS.filter(function(q){return q.id===id;})[0]; if(!x) return;
    try{ var t=document.createElement('div'); t.textContent='🎉 Neues Figuren-Set freigeschaltet: '+x.de; t.style.cssText='position:fixed;left:50%;top:14px;transform:translateX(-50%);z-index:99999;background:#c6ff3d;color:#08110c;font:800 15px system-ui,sans-serif;padding:12px 18px;border-radius:14px;box-shadow:0 8px 30px rgba(0,0,0,.5);max-width:90vw;text-align:center'; document.body.appendChild(t); setTimeout(function(){ t.remove(); },5000); }catch(e){} },
  unlocked:function(id){ var x=SETS.filter(function(q){return q.id===id;})[0]; if(!x) return false; if(x.price) return BS.owned().indexOf(id)>=0; if(x.earn) return BS.earned().indexOf(id)>=0; return true; },
  get:function(){ var id=ls('bp_piece_set')||'normal'; return BS.unlocked(id)?id:'normal'; },
  set:function(id){ if(BS.unlocked(id)){ lset('bp_piece_set',id); BS.preload(); return true; } return false; },
  board:function(){ var id=ls('bp_board_theme')||'holzgruen'; return BOARDS.filter(function(q){return q.id===id;})[0]||BOARDS[0]; },
  setBoard:function(id){ lset('bp_board_theme',id); BS.applyBoard(); },
  applyBoard:function(){ var b=BS.board(), de=document.documentElement, st=de.style;
    if(b.img){ de.classList.add('bd-img'); st.setProperty('--bd-url','url('+b.img+')'); st.setProperty('--pf',String(b.pf)); st.setProperty('--co',b.co||'#fff'); st.setProperty('--cs',b.cs||'0 0 3px #000'); st.setProperty('--k',String(1+2*b.pf)); }
    else { de.classList.remove('bd-img'); st.setProperty('--k','1'); st.setProperty('--sq-light',b.l); st.setProperty('--sq-dark',b.d); } },
  preload:function(){ var id=BS.get(); if(id==='alt') return; ['K','Q','R','B','N','P'].forEach(function(t){ ['w','b'].forEach(function(c){ var i=new Image(); i.src='/chess/sets/'+id+'/'+c+t+'.png'; }); }); }
};
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
