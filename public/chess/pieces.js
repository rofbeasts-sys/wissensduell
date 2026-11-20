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
 {id:'voelker', de:'Völker', en:'Peoples', elo:0, earn:1, hd:'Gewinne 15 Partien (gegen Bots oder online).', he:'Win 15 games (against bots or online).'},
 {id:'ritter', de:'Ritter', en:'Knights', elo:0, earn:1, hd:'Gewinne 5 Partien (gegen Bots oder online).', he:'Win 5 games (against bots or online).'},
 {id:'goblin', de:'Goblins', en:'Goblins', elo:0, price:10000, fprice:500, off:1}];
var BOARDS=[
 {id:'holzgruen', de:'Holzrahmen', en:'Wood frame', img:'/chess/boards/holzgruen.jpg', pf:0.0470, co:'#000', cs:'none'},
 {id:'holzblau', de:'Holzrahmen blau', en:'Wood frame blue', img:'/chess/boards/holzblau.jpg', pf:0.0470, co:'#000', cs:'none'},
 {id:'f_schaedel', de:'Totenschädel', en:'Skulls', img:'/chess/boards/f_schaedel.webp', pl:0.2122, pr:0.203, pt:0.3255, pb:0.1997, tr:1, co:'#000', cs:'0 0 3px #fff'},
 {id:'f_gold', de:'Königsgold', en:'Royal gold', img:'/chess/boards/f_gold.webp', pl:0.2174, pr:0.2119, pt:0.3412, pb:0.1929, tr:1, co:'#000', cs:'0 0 3px #fff'},
 {id:'f_schlange', de:'Schlangen', en:'Serpents', img:'/chess/boards/f_schlange.webp', pl:0.2259, pr:0.2148, pt:0.3111, pb:0.1963, tr:1, co:'#000', cs:'0 0 3px #fff'},
 {id:'f_eis', de:'Eis', en:'Ice', img:'/chess/boards/f_eis.webp', pl:0.2081, pr:0.1989, pt:0.3286, pb:0.192, tr:1, co:'#000', cs:'0 0 3px #fff'},
 {id:'f_feuer', de:'Feuer', en:'Fire', img:'/chess/boards/f_feuer.webp', pl:0.235, pr:0.2295, pt:0.3273, pb:0.1888, tr:1, co:'#000', cs:'0 0 3px #fff'},
 {id:'f_knochen', de:'Knochen', en:'Bones', img:'/chess/boards/f_knochen.webp', pl:0.2102, pr:0.1992, pt:0.3195, pb:0.1959, tr:1, co:'#000', cs:'0 0 3px #fff'},
 {id:'f_wald', de:'Dschungel', en:'Jungle', img:'/chess/boards/f_wald.webp', pl:0.2113, pr:0.1984, pt:0.2951, pb:0.1644, tr:1, co:'#000', cs:'0 0 3px #fff'},
 {id:'f_dunkel', de:'Dunkelkristall', en:'Dark crystal', img:'/chess/boards/f_dunkel.webp', pl:0.2165, pr:0.2073, pt:0.3255, pb:0.187, tr:1, co:'#000', cs:'0 0 3px #fff'},
 {id:'f_welle', de:'Ozean', en:'Ocean', img:'/chess/boards/f_welle.webp', pl:0.2284, pr:0.2173, pt:0.3039, pb:0.1713, tr:1, co:'#000', cs:'0 0 3px #fff'},
 {id:'f_koenig', de:'Königsbanner', en:'Royal banners', img:'/chess/boards/f_koenig.webp', pl:0.1595, pr:0.1584, pt:0.1879, pb:0.1846, tr:1, co:'#000', cs:'0 0 3px #fff'},
 {id:'f_drache', de:'Drache', en:'Dragon', img:'/chess/boards/f_drache.webp', pl:0.2448, pr:0.2448, pt:0.3427, pb:0.1883, tr:1, co:'#000', cs:'0 0 3px #fff'},
 {id:'f_engel', de:'Engel', en:'Angel', img:'/chess/boards/f_engel.webp', pl:0.2578, pr:0.2578, pt:0.3462, pb:0.1805, tr:1, co:'#000', cs:'0 0 3px #fff'},
 {id:'f_geist', de:'Geisterfeuer', en:'Ghost fire', img:'/chess/boards/f_geist.webp', pl:0.2177, pr:0.2214, pt:0.31, pb:0.1956, tr:1, co:'#000', cs:'0 0 3px #fff'},
 {id:'f_burg', de:'Burg', en:'Castle', img:'/chess/boards/f_burg.webp', pl:0.2741, pr:0.2664, pt:0.3205, pb:0.2201, tr:1, co:'#000', cs:'0 0 3px #fff'},
 {id:'f_maerchen', de:'Märchenwald', en:'Fairy forest', img:'/chess/boards/f_maerchen.webp', pl:0.2144, pr:0.2107, pt:0.2847, pb:0.2588, tr:1, co:'#000', cs:'0 0 3px #fff'},
 {id:'f_phoenix', de:'Phönix', en:'Phoenix', img:'/chess/boards/f_phoenix.webp', pl:0.2583, pr:0.2661, pt:0.3601, pb:0.2818, tr:1, co:'#000', cs:'0 0 3px #fff'},
 {id:'f_kristall', de:'Eiskristall', en:'Ice crystal', img:'/chess/boards/f_kristall.webp', pl:0.2288, pr:0.2362, pt:0.2731, pb:0.2325, tr:1, co:'#000', cs:'0 0 3px #fff'},
 {id:'f_daemon', de:'Dämon', en:'Demon', img:'/chess/boards/f_daemon.webp', pl:0.2364, pr:0.2402, pt:0.3002, pb:0.2251, tr:1, co:'#000', cs:'0 0 3px #fff'},
 {id:'f_arkan', de:'Arkanmagie', en:'Arcane', img:'/chess/boards/f_arkan.webp', pl:0.2342, pr:0.2305, pt:0.2639, pb:0.2342, tr:1, co:'#000', cs:'0 0 3px #fff'}];
function ls(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } }
function lset(k,v){ try{ localStorage.setItem(k,v); }catch(e){} }
var BS=window.BpSets={ list:SETS, boards:BOARDS,
  maxElo:function(){ return parseInt(ls('bp_max_elo'),10)||0; },
  noteElo:function(e){ e=parseInt(e,10)||0; var old=BS.maxElo(); if(e>old){ lset('bp_max_elo',String(e)); try{ var _de=(ls('wq_lang')!=='en'); SETS.filter(function(q){return q.elo>0&&q.elo>old&&q.elo<=e;}).forEach(function(q){ if(window.bpNotify) window.bpNotify({icon:'🏆',title:_de?'Elo-Figuren freigeschaltet':'Elo pieces unlocked',text:(_de?q.de:q.en)+' (Elo '+q.elo+')',color:'#ffd45a'}); }); }catch(x){} } },
  admin:function(){ return !!ls('bp_admin_key'); },
  owned:function(){ try{ return JSON.parse(ls('bp_sets_owned')||'[]'); }catch(e){ return []; } },
  setOwned:function(a){ lset('bp_sets_owned',JSON.stringify(a||[])); },
  earned:function(){ try{ return JSON.parse(ls('bp_sets_earned')||'[]'); }catch(e){ return []; } },
  noteWin:function(){ var n=(parseInt(ls('bp_chess_wins'),10)||0)+1; lset('bp_chess_wins',String(n)); if(n>=5) BS.earn('ritter'); if(n>=15) BS.earn('voelker'); return n; },
  earn:function(id){ var a=BS.earned(); if(a.indexOf(id)>=0) return; a.push(id); lset('bp_sets_earned',JSON.stringify(a));
    var x=SETS.filter(function(q){return q.id===id;})[0]; if(!x) return;
    try{ var _de=(ls('wq_lang')!=='en'); if(window.bpNotify) window.bpNotify({icon:'♟',title:_de?'Figuren freigeschaltet':'Pieces unlocked',text:(_de?x.de:x.en),color:'#c6ff3d'}); }catch(e){} },
  unlocked:function(id){ var x=SETS.filter(function(q){return q.id===id;})[0]; if(!x) return false; if(x.price) return BS.owned().indexOf(id)>=0; if(x.earn) return BS.earned().indexOf(id)>=0; if(x.elo>0) return BS.maxElo()>=x.elo; return true; },
  get:function(){ var id=ls('bp_piece_set')||'normal'; return BS.unlocked(id)?id:'normal'; },
  set:function(id){ if(BS.unlocked(id)){ lset('bp_piece_set',id); BS.preload(); return true; } return false; },
  board:function(){ var id=ls('bp_board_theme')||'holzgruen'; return BOARDS.filter(function(q){return q.id===id;})[0]||BOARDS[0]; },
  setBoard:function(id){ lset('bp_board_theme',id); BS.applyBoard(); },
  applyBoard:function(){ var b=BS.board(), de=document.documentElement, st=de.style;
    if(b.img){ var pl=b.pl!=null?b.pl:b.pf, pr=b.pr!=null?b.pr:b.pf, pt=b.pt!=null?b.pt:b.pf, pb=b.pb!=null?b.pb:b.pf; de.classList.add('bd-img'); de.classList.toggle('bd-tr',!!b.tr); st.setProperty('--bd-url','url('+b.img+')'); st.setProperty('--pf',String(b.pf||0)); st.setProperty('--pl',String(pl)); st.setProperty('--pr',String(pr)); st.setProperty('--pt',String(pt)); st.setProperty('--pb',String(pb)); st.setProperty('--co',b.co||'#fff'); st.setProperty('--cs',b.cs||'0 0 3px #000'); st.setProperty('--k',String(1+pl+pr)); }
    else { de.classList.remove('bd-img'); de.classList.remove('bd-tr'); st.setProperty('--k','1'); st.setProperty('--sq-light',b.l); st.setProperty('--sq-dark',b.d); } },
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
