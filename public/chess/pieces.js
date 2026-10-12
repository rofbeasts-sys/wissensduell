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
window.chessPieceSVG=function(t,c,theme,opts){
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
