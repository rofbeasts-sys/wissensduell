/* Bilder malen: pixelgenauer Rasterizer (ohne Antialiasing), Bausteine, Flaechenbildung */
(function(){
var MB = window.MB = window.MB || [];
function hexRGB(h){ h = h.replace('#',''); return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)]; }
MB.hexRGB = hexRGB;

function Draw(S, asp, seed){
  var H = S, W = Math.round(S*asp), k = S/100, col = new Uint8Array(W*H), s = seed || 1;
  var d = { W:W, H:H, k:k, col:col, U:100*asp };
  d.rnd = function(){ s |= 0; s = s + 0x6D2B79F5 | 0; var t = Math.imul(s ^ s>>>15, 1|s); t = t + Math.imul(t ^ t>>>7, 61|t) ^ t; return ((t ^ t>>>14)>>>0)/4294967296; };
  d.fill = function(c){ col.fill(c); };
  d.R = function(x,y,w,h,c){
    var x0 = Math.max(0, Math.round(x*k)), x1 = Math.min(W, Math.round((x+w)*k)), y0 = Math.max(0, Math.round(y*k)), y1 = Math.min(H, Math.round((y+h)*k));
    for(var j=y0;j<y1;j++) if(x1>x0) col.fill(c, j*W+x0, j*W+x1);
  };
  d.E = function(cx,cy,rx,ry,c,rot){
    rot = rot || 0;
    var a = rx*k, b = ry*k, m = Math.max(a,b)+1, px = cx*k, py = cy*k, cs = Math.cos(rot), sn = Math.sin(rot);
    var x0 = Math.max(0,Math.floor(px-m)), x1 = Math.min(W-1,Math.ceil(px+m)), y0 = Math.max(0,Math.floor(py-m)), y1 = Math.min(H-1,Math.ceil(py+m));
    for(var j=y0;j<=y1;j++) for(var i=x0;i<=x1;i++){
      var dx = i+.5-px, dy = j+.5-py, u = dx*cs+dy*sn, v = -dx*sn+dy*cs;
      if(u*u/(a*a)+v*v/(b*b) <= 1) col[j*W+i] = c;
    }
  };
  d.P = function(pts,c){
    var n = pts.length/2, ymin = 1e9, ymax = -1e9, i;
    for(i=0;i<n;i++){ var yv = pts[2*i+1]*k; if(yv<ymin)ymin=yv; if(yv>ymax)ymax=yv; }
    for(var j=Math.max(0,Math.floor(ymin)); j<=Math.min(H-1,Math.ceil(ymax)); j++){
      var yy = j+.5, xs = [];
      for(i=0;i<n;i++){
        var x1 = pts[2*i]*k, y1 = pts[2*i+1]*k, x2 = pts[(2*i+2)%(2*n)]*k, y2 = pts[(2*i+3)%(2*n)]*k;
        if((y1<=yy && y2>yy) || (y2<=yy && y1>yy)) xs.push(x1+(yy-y1)*(x2-x1)/(y2-y1));
      }
      xs.sort(function(p,q){return p-q;});
      for(var t=0;t+1<xs.length;t+=2){ var a0 = Math.max(0,Math.round(xs[t])), a1 = Math.min(W,Math.round(xs[t+1])); if(a1>a0) col.fill(c, j*W+a0, j*W+a1); }
    }
  };
  d.L = function(x1,y1,x2,y2,w,c){
    var r = w/2*k, ax = x1*k, ay = y1*k, bx = x2*k, by = y2*k;
    var xa = Math.max(0,Math.floor(Math.min(ax,bx)-r)), xb = Math.min(W-1,Math.ceil(Math.max(ax,bx)+r)), ya = Math.max(0,Math.floor(Math.min(ay,by)-r)), yb = Math.min(H-1,Math.ceil(Math.max(ay,by)+r));
    var vx = bx-ax, vy = by-ay, L2 = vx*vx+vy*vy || 1;
    for(var j=ya;j<=yb;j++) for(var i=xa;i<=xb;i++){
      var px = i+.5, py = j+.5, t = ((px-ax)*vx+(py-ay)*vy)/L2; t = t<0?0:t>1?1:t;
      var dx = px-(ax+t*vx), dy = py-(ay+t*vy);
      if(dx*dx+dy*dy <= r*r) col[j*W+i] = c;
    }
  };
  d.PL = function(pts,w,c){ for(var i=0;i<pts.length-2;i+=2) d.L(pts[i],pts[i+1],pts[i+2],pts[i+3],w,c); };
  /* Ring / Bogen: half = 'u' oben, 'd' unten, 'l' links, 'r' rechts */
  d.Ring = function(cx,cy,ro,ri,c,half){
    var px = cx*k, py = cy*k, R1 = ro*k, R0 = ri*k;
    var x0 = Math.max(0,Math.floor(px-R1)), x1 = Math.min(W-1,Math.ceil(px+R1)), y0 = Math.max(0,Math.floor(py-R1)), y1 = Math.min(H-1,Math.ceil(py+R1));
    for(var j=y0;j<=y1;j++) for(var i=x0;i<=x1;i++){
      var dx = i+.5-px, dy = j+.5-py, q = dx*dx+dy*dy;
      if(q>R1*R1 || q<R0*R0) continue;
      if(half==='u' && dy>0) continue; if(half==='d' && dy<0) continue; if(half==='l' && dx>0) continue; if(half==='r' && dx<0) continue;
      col[j*W+i] = c;
    }
  };
  d.Hill = function(y,amp,fr,ph,c){
    var pts = [];
    for(var x=-4; x<=d.U+4; x+=2) pts.push(x, y+amp*Math.sin(x*fr+ph));
    pts.push(d.U+4, 104, -4, 104);
    d.P(pts,c);
  };
  d.star = function(x,y,r,c){
    var pts = [];
    for(var i=0;i<10;i++){ var a = -Math.PI/2+i*Math.PI/5, q = i%2 ? r*0.45 : r; pts.push(x+Math.cos(a)*q, y+Math.sin(a)*q); }
    d.P(pts,c);
  };
  d.heart = function(x,y,s,c){ d.E(x-3*s,y-2*s,3.6*s,3.6*s,c); d.E(x+3*s,y-2*s,3.6*s,3.6*s,c); d.P([x-6.4*s,y-0.2*s,x+6.4*s,y-0.2*s,x,y+7.5*s],c); };
  d.cloud = function(x,y,s,c){ d.E(x,y,9*s,4.5*s,c); d.E(x-5*s,y+0.8*s,6*s,3.6*s,c); d.E(x+5*s,y+1.2*s,6*s,3.6*s,c); d.E(x-1*s,y-3*s,5*s,4*s,c); };
  d.sun = function(x,y,r,c,rc,n){
    if(rc!==undefined){ n = n||10; for(var i=0;i<n;i++){ var a = i*2*Math.PI/n; d.L(x+Math.cos(a)*r*1.25,y+Math.sin(a)*r*1.25,x+Math.cos(a)*r*1.85,y+Math.sin(a)*r*1.85,r*0.34,rc); } }
    d.E(x,y,r,r,c);
  };
  d.tree = function(x,y,s,tc,lc,lc2){
    d.R(x-1.6*s,y-12*s,3.2*s,12*s,tc);
    d.E(x,y-19*s,9*s,9*s,lc); d.E(x-5.5*s,y-14*s,6*s,6*s,lc); d.E(x+5.5*s,y-14*s,6*s,6*s,lc);
    if(lc2!==undefined){ d.E(x-2*s,y-21*s,3.2*s,3.2*s,lc2); d.E(x+4*s,y-15*s,2.4*s,2.4*s,lc2); }
  };
  d.pine = function(x,y,s,tc,lc,lc2){
    d.R(x-1.4*s,y-6*s,2.8*s,6*s,tc);
    d.P([x,y-32*s,x-8*s,y-17*s,x+8*s,y-17*s],lc); d.P([x,y-24*s,x-10.5*s,y-9*s,x+10.5*s,y-9*s],lc); d.P([x,y-15*s,x-13*s,y-3*s,x+13*s,y-3*s],lc);
    if(lc2!==undefined){ d.P([x,y-32*s,x-3.5*s,y-24*s,x+3.5*s,y-24*s],lc2); }
  };
  d.bush = function(x,y,s,c){ d.E(x,y-3*s,5*s,4*s,c); d.E(x-4.5*s,y-1.5*s,4*s,3*s,c); d.E(x+4.5*s,y-1.5*s,4*s,3*s,c); };
  d.flower = function(x,y,s,pc,cc,sc){
    d.L(x,y,x,y+13*s,0.9*s,sc);
    for(var i=0;i<5;i++){ var a = -Math.PI/2+i*2*Math.PI/5; d.E(x+Math.cos(a)*3.1*s,y+Math.sin(a)*3.1*s,2.5*s,2.5*s,pc); }
    d.E(x,y,2.1*s,2.1*s,cc);
  };
  d.house = function(x,y,s,wall,roof,door,win){
    d.R(x-10*s,y-12*s,20*s,12*s,wall);
    d.P([x-12.5*s,y-11.5*s,x,y-22*s,x+12.5*s,y-11.5*s],roof);
    d.R(x-2.2*s,y-7.5*s,4.4*s,7.5*s,door);
    d.R(x-8*s,y-9.5*s,4*s,4*s,win); d.R(x+4*s,y-9.5*s,4*s,4*s,win);
  };
  d.fence = function(x0,x1,y,s,c){ d.R(x0,y-5*s,x1-x0,1*s,c); d.R(x0,y-2.4*s,x1-x0,1*s,c); for(var x=x0;x<x1;x+=4*s) d.R(x,y-7*s,1.6*s,8*s,c); };
  return d;
}
MB.Draw = Draw;

MB.raster = function(pic,S){ var d = Draw(S, pic.a||1, (pic.id||1)*7+3); pic.draw(d); return d; };

/* Flaechen bilden: zusammenhaengende gleiche Farben, winzige Flaechen verschmelzen */
MB.regions = function(d){
  var W = d.W, H = d.H, N = W*H, col = d.col;
  var lab, n, sizes, colOf, stack = new Int32Array(N);
  function label(){
    lab = new Int32Array(N).fill(-1); n = 0; sizes = []; colOf = [];
    for(var s=0;s<N;s++){
      if(lab[s]>=0) continue;
      var c = col[s], sp = 0, cnt = 0; stack[sp++] = s; lab[s] = n;
      while(sp){
        var p = stack[--sp]; cnt++; var x = p%W, y = (p/W)|0;
        if(x>0   && lab[p-1]<0 && col[p-1]===c){ lab[p-1]=n; stack[sp++]=p-1; }
        if(x<W-1 && lab[p+1]<0 && col[p+1]===c){ lab[p+1]=n; stack[sp++]=p+1; }
        if(y>0   && lab[p-W]<0 && col[p-W]===c){ lab[p-W]=n; stack[sp++]=p-W; }
        if(y<H-1 && lab[p+W]<0 && col[p+W]===c){ lab[p+W]=n; stack[sp++]=p+W; }
      }
      sizes.push(cnt); colOf.push(c); n++;
    }
  }
  var minA = Math.max(10, Math.round(N*0.00045));
  for(var pass=0; pass<4; pass++){
    label(); var mp = {}, any = false;
    for(var p=0;p<N;p++){
      var l = lab[p];
      if(sizes[l]<minA && mp[l]===undefined){
        var x = p%W, y = (p/W)|0, q = -1;
        if(x>0 && lab[p-1]!==l) q = p-1; else if(x<W-1 && lab[p+1]!==l) q = p+1; else if(y>0 && lab[p-W]!==l) q = p-W; else if(y<H-1 && lab[p+W]!==l) q = p+W;
        if(q>=0) mp[l] = col[q];
      }
    }
    for(p=0;p<N;p++){ var m = mp[lab[p]]; if(m!==undefined){ col[p] = m; any = true; } }
    if(!any) break;
  }
  label();
  var dist = new Float32Array(N), x, y, l2;
  for(p=0;p<N;p++){
    x = p%W; y = (p/W)|0; l2 = lab[p];
    dist[p] = (x===0||y===0||x===W-1||y===H-1||lab[p-1]!==l2||lab[p+1]!==l2||lab[p-W]!==l2||lab[p+W]!==l2) ? 0 : 99999;
  }
  for(y=1;y<H-1;y++) for(x=1;x<W-1;x++){ p=y*W+x; dist[p] = Math.min(dist[p],dist[p-1]+1,dist[p-W]+1,dist[p-W-1]+1.41,dist[p-W+1]+1.41); }
  for(y=H-2;y>0;y--) for(x=W-2;x>0;x--){ p=y*W+x; dist[p] = Math.min(dist[p],dist[p+1]+1,dist[p+W]+1,dist[p+W+1]+1.41,dist[p+W-1]+1.41); }
  var best = new Float32Array(n), ax = new Float32Array(n), ay = new Float32Array(n);
  for(p=0;p<N;p++){ l2 = lab[p]; if(dist[p]>best[l2]){ best[l2]=dist[p]; ax[l2]=p%W; ay[l2]=(p/W)|0; } }
  return { W:W, H:H, lab:lab, n:n, sizes:sizes, colOf:colOf, best:best, ax:ax, ay:ay };
};

/* Vorschaubild (farbig) */
MB.thumb = function(pic,px){
  var d = MB.raster(pic,px), cv = document.createElement('canvas'); cv.width = d.W; cv.height = d.H;
  var x = cv.getContext('2d'), img = x.createImageData(d.W,d.H), pal = pic.pal.map(hexRGB);
  for(var i=0;i<d.W*d.H;i++){ var c = pal[d.col[i]]||[255,255,255]; img.data[i*4]=c[0]; img.data[i*4+1]=c[1]; img.data[i*4+2]=c[2]; img.data[i*4+3]=255; }
  x.putImageData(img,0,0); return cv;
};
})();
