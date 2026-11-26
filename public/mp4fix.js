/* MP4Fix: macht aus einer Browser-Aufnahme (fragmentiertes MP4 von MediaRecorder) ein normales MP4
   mit richtiger Laenge, Index und fester Reihenfolge. Ohne Bibliothek, ohne Download aus dem Netz.
   Benutzung: MP4Fix.fix(blob).then(function(neuerBlob){...})  (bei Fehlern kommt der alte Blob zurueck). */
(function(root){
function u32(d,o){return ((d[o]<<24)|(d[o+1]<<16)|(d[o+2]<<8)|d[o+3])>>>0}
function i32(d,o){return (d[o]<<24)|(d[o+1]<<16)|(d[o+2]<<8)|d[o+3]}
function u64(d,o){return u32(d,o)*4294967296+u32(d,o+4)}
function typ(d,o){return String.fromCharCode(d[o],d[o+1],d[o+2],d[o+3])}
function boxes(d,s,e){var out=[];while(s+8<=e){var sz=u32(d,s),t=typ(d,s+4),h=8;if(sz===1){sz=u64(d,s+8);h=16}else if(sz===0)sz=e-s;if(sz<h||s+sz>e)break;out.push({t:t,s:s,e:s+sz,b:s+h});s+=sz}return out}
function find(d,bx,t){for(var i=0;i<bx.length;i++)if(bx[i].t===t)return bx[i];return null}
function kids(d,b){return boxes(d,b.b,b.e)}
function W32(a,v){a.push((v>>>24)&255,(v>>>16)&255,(v>>>8)&255,v&255)}
function W64(a,v){W32(a,Math.floor(v/4294967296));W32(a,v>>>0)}
function mk(t,parts){var len=8,i;for(i=0;i<parts.length;i++)len+=parts[i].length;var o=new Uint8Array(len);o[0]=len>>>24;o[1]=len>>>16&255;o[2]=len>>>8&255;o[3]=len&255;for(i=0;i<4;i++)o[4+i]=t.charCodeAt(i);var p=8;for(i=0;i<parts.length;i++){o.set(parts[i],p);p+=parts[i].length}return o}
function arr(a){return new Uint8Array(a)}
function slice(d,b){return d.subarray(b.s,b.e)}

function parse(d){
  var top=boxes(d,0,d.length),moov=find(d,top,'moov');if(!moov)throw new Error('kein moov');
  var mk_=kids(d,moov),mvhd=find(d,mk_,'mvhd'),mv=mvhd.b,mver=d[mv],mts=u32(d,mv+(mver===1?20:12));
  var tracks={},order=[];
  mk_.forEach(function(b){if(b.t!=='trak')return;var k=kids(d,b),tkhd=find(d,k,'tkhd'),mdia=find(d,k,'mdia'),mk2=kids(d,mdia),mdhd=find(d,mk2,'mdhd'),hdlr=find(d,mk2,'hdlr'),minf=find(d,mk2,'minf'),mf=kids(d,minf),stbl=find(d,mf,'stbl'),sb=kids(d,stbl),stsd=find(d,sb,'stsd');
    var tv=d[tkhd.b],id=u32(d,tkhd.b+(tv===1?20:12)),dv=d[mdhd.b],ts=u32(d,mdhd.b+(dv===1?20:12));
    tracks[id]={id:id,trak:b,tkhd:tkhd,mdhd:mdhd,hdlr:hdlr,minf:minf,mf:mf,stsd:stsd,ts:ts,handler:typ(d,hdlr.b+8),samples:[],chunks:[],start:null,def:{di:1,dur:0,size:0,flags:0}};order.push(id)});
  var mvex=find(d,mk_,'mvex');
  if(mvex)kids(d,mvex).forEach(function(b){if(b.t==='trex'){var id=u32(d,b.b+4),t=tracks[id];if(t)t.def={di:u32(d,b.b+8),dur:u32(d,b.b+12),size:u32(d,b.b+16),flags:u32(d,b.b+20)}}});
  var pos=0,anyFrag=false;
  top.forEach(function(mo){
    if(mo.t!=='moof')return;anyFrag=true;var moofStart=mo.s,endPrev=null;
    kids(d,mo).forEach(function(tf){
      if(tf.t!=='traf')return;var tk=kids(d,tf),tfhd=find(d,tk,'tfhd'),tfdt=find(d,tk,'tfdt');if(!tfhd)return;
      var fl=(d[tfhd.b+1]<<16)|(d[tfhd.b+2]<<8)|d[tfhd.b+3],id=u32(d,tfhd.b+4),t=tracks[id];if(!t)return;var p=tfhd.b+8,base=moofStart;
      if(fl&1){base=u64(d,p);p+=8}if(fl&2)p+=4;var dd=t.def.dur,ds=t.def.size,df=t.def.flags;
      if(fl&8){dd=u32(d,p);p+=4}if(fl&16){ds=u32(d,p);p+=4}if(fl&32){df=u32(d,p);p+=4}
      if(tfdt&&t.start===null){var tv=d[tfdt.b];t.start=tv===1?u64(d,tfdt.b+4):u32(d,tfdt.b+4)}
      var cur=null,t0=null,firstTr=true;if(tfdt){var tv2=d[tfdt.b];t0=tv2===1?u64(d,tfdt.b+4):u32(d,tfdt.b+4)}
      tk.forEach(function(tr){
        if(tr.t!=='trun')return;var tfl=(d[tr.b+1]<<16)|(d[tr.b+2]<<8)|d[tr.b+3],ver=d[tr.b],cnt=u32(d,tr.b+4),q=tr.b+8,off;
        if(tfl&1){off=base+i32(d,q);q+=4}else off=endPrev!==null?endPrev:base;
        var ff=null;if(tfl&4){ff=u32(d,q);q+=4}
        var ch={off:off,n:0,bytes:0,t0:firstTr?t0:null};firstTr=false;
        for(var i=0;i<cnt;i++){var s_={dur:dd,size:ds,flags:df,cto:0};
          if(tfl&0x100){s_.dur=u32(d,q);q+=4}if(tfl&0x200){s_.size=u32(d,q);q+=4}if(tfl&0x400){s_.flags=u32(d,q);q+=4}else if(i===0&&ff!==null)s_.flags=ff;
          if(tfl&0x800){s_.cto=ver===1?i32(d,q):u32(d,q);q+=4}
          s_.off=off;off+=s_.size;ch.n++;ch.bytes+=s_.size;t.samples.push(s_)}
        endPrev=off;t.chunks.push(ch);
      });
    });
  });
  return {d:d,mts:mts,tracks:tracks,order:order,anyFrag:anyFrag,mvhd:mvhd,moov:moov};
}

function build(P,mdatStart){
  var d=P.d,tr=P.order.map(function(id){return P.tracks[id]}).filter(function(t){return t.samples.length}),
      minStart=Infinity;
  tr.forEach(function(t){var s=(t.start||0)/t.ts;if(s<minStart)minStart=s});if(!isFinite(minStart))minStart=0;
  var pos=mdatStart,movDur=0,traks=[],allc=[];
  tr.forEach(function(t){t.chunks.forEach(function(ch){allc.push(ch)})});
  allc.sort(function(a,b){return a.off-b.off});allc.forEach(function(ch){ch.no=pos;pos+=ch.bytes});
  tr.forEach(function(t){
    var s=t.samples,i;
    for(i=0;i<s.length;i++)if(!s[i].dur)s[i].dur=Math.round(t.ts/30);
    if(!t.__gaps){t.__gaps=1;var si=0,acc=0;t.chunks.forEach(function(ch){if(ch.t0!==null&&si>0){var ex=ch.t0-(t.start||0);if(ex>acc){s[si-1].dur+=ex-acc;acc=ex}}for(var j=0;j<ch.n;j++)acc+=s[si+j].dur;si+=ch.n})}
    if(t.handler==='vide'&&!t.__even){t.__even=1;var sj=0;t.chunks.forEach(function(ch){var sum=0,j;for(j=0;j<ch.n;j++)sum+=s[sj+j].dur;if(ch.n>1){var base=Math.floor(sum/ch.n),rest=sum-base*ch.n;for(j=0;j<ch.n;j++)s[sj+j].dur=base+(j<rest?1:0)}sj+=ch.n})}
    var tot=0;for(i=0;i<s.length;i++)tot+=s[i].dur;
    var delay=Math.round(((t.start||0)/t.ts-minStart)*P.mts),segDur=Math.round(tot/t.ts*P.mts),tkDur=segDur+delay;if(tkDur>movDur)movDur=tkDur;
    /* stts */
    var a=[];W32(a,0);var runs=[],c=0,last=-1;for(i=0;i<s.length;i++){if(s[i].dur===last)runs[runs.length-1][0]++;else{runs.push([1,s[i].dur]);last=s[i].dur}}W32(a,runs.length);runs.forEach(function(r){W32(a,r[0]);W32(a,r[1])});var stts=mk('stts',[arr(a)]);
    /* ctts */
    var ctts=null,anyC=false;for(i=0;i<s.length;i++)if(s[i].cto){anyC=true;break}
    if(anyC){a=[];W32(a,0);var cr=[],lc=null;for(i=0;i<s.length;i++){if(s[i].cto===lc)cr[cr.length-1][0]++;else{cr.push([1,s[i].cto]);lc=s[i].cto}}W32(a,cr.length);cr.forEach(function(r){W32(a,r[0]);W32(a,r[1])});ctts=mk('ctts',[arr(a)])}
    /* stss (nur Video) */
    var stss=null;if(t.handler==='vide'){var sync=[];for(i=0;i<s.length;i++)if(!(s[i].flags&0x10000))sync.push(i+1);if(sync.length&&sync.length<s.length){a=[];W32(a,0);W32(a,sync.length);sync.forEach(function(v){W32(a,v)});stss=mk('stss',[arr(a)])}}
    /* stsz */
    a=[];W32(a,0);W32(a,0);W32(a,s.length);for(i=0;i<s.length;i++)W32(a,s[i].size);var stsz=mk('stsz',[arr(a)]);
    /* stsc + stco */
    var sc=[],lastN=-1,co=[];t.chunks.forEach(function(ch,k){if(ch.n!==lastN){sc.push([k+1,ch.n]);lastN=ch.n}co.push(ch.no)});
    a=[];W32(a,0);W32(a,sc.length);sc.forEach(function(r){W32(a,r[0]);W32(a,r[1]);W32(a,1)});var stsc=mk('stsc',[arr(a)]);
    a=[];W32(a,0);W32(a,co.length);co.forEach(function(v){W32(a,v)});var stco=mk('stco',[arr(a)]);
    var stbl=mk('stbl',[slice(d,t.stsd),stts].concat(ctts?[ctts]:[],stss?[stss]:[],[stsc,stsz,stco]));
    /* minf ohne alten stbl */
    var mparts=[];t.mf.forEach(function(b){if(b.t!=='stbl')mparts.push(slice(d,b))});mparts.push(stbl);var minf=mk('minf',mparts);
    /* mdhd mit neuer Dauer */
    var md=new Uint8Array(slice(d,t.mdhd)),dv=md[8];if(dv===1){var h=Math.floor(tot/4294967296),l=tot>>>0;md[8+24]=h>>>24;md[8+25]=h>>>16&255;md[8+26]=h>>>8&255;md[8+27]=h&255;md[8+28]=l>>>24;md[8+29]=l>>>16&255;md[8+30]=l>>>8&255;md[8+31]=l&255}else{var o=8+16;md[o]=tot>>>24;md[o+1]=tot>>>16&255;md[o+2]=tot>>>8&255;md[o+3]=tot&255}
    var mdia=mk('mdia',[md,slice(d,t.hdlr),minf]);
    /* tkhd mit neuer Dauer */
    var tk=new Uint8Array(slice(d,t.tkhd)),tv=tk[8];if(tv===1){var o2=8+28;var hh=Math.floor(tkDur/4294967296),ll=tkDur>>>0;tk[o2]=hh>>>24;tk[o2+1]=hh>>>16&255;tk[o2+2]=hh>>>8&255;tk[o2+3]=hh&255;tk[o2+4]=ll>>>24;tk[o2+5]=ll>>>16&255;tk[o2+6]=ll>>>8&255;tk[o2+7]=ll&255}else{var o3=8+20;tk[o3]=tkDur>>>24;tk[o3+1]=tkDur>>>16&255;tk[o3+2]=tkDur>>>8&255;tk[o3+3]=tkDur&255}
    /* Start-Versatz als Schnittliste */
    var parts=[tk];
    if(delay>0){a=[];W32(a,0);W32(a,2);W32(a,delay);W32(a,0xFFFFFFFF);W32(a,0x00010000);W32(a,segDur);W32(a,0);W32(a,0x00010000);parts.push(mk('edts',[mk('elst',[arr(a)])]))}
    parts.push(mdia);traks.push(mk('trak',parts));
  });
  /* mvhd mit neuer Dauer */
  var mv=new Uint8Array(slice(d,P.mvhd)),vv=mv[8];
  if(vv===1){var h2=Math.floor(movDur/4294967296),l2=movDur>>>0,q=8+28;mv[q]=h2>>>24;mv[q+1]=h2>>>16&255;mv[q+2]=h2>>>8&255;mv[q+3]=h2&255;mv[q+4]=l2>>>24;mv[q+5]=l2>>>16&255;mv[q+6]=l2>>>8&255;mv[q+7]=l2&255}
  else{var q2=8+16;mv[q2]=movDur>>>24;mv[q2+1]=movDur>>>16&255;mv[q2+2]=movDur>>>8&255;mv[q2+3]=movDur&255}
  var moov=mk('moov',[mv].concat(traks));
  return {moov:moov,end:pos,tr:tr,allc:allc};
}

function fixBytes(d){
  var P=parse(d);if(!P.anyFrag)return null;
  var ftyp=mk('ftyp',[arr([105,115,111,109,0,0,2,0,105,115,111,109,105,115,111,50,97,118,99,49,109,112,52,49])]);
  var first=build(P,0),mdatStart=ftyp.length+first.moov.length+8;
  /* Zeiger neu, damit die Offsets stimmen */
  P=parse(d);var fin=build(P,mdatStart),total=fin.end-mdatStart;
  if(total>4000000000)return null;
  var mh=mk('mdat',[]);mh[0]=(total+8)>>>24;mh[1]=((total+8)>>>16)&255;mh[2]=((total+8)>>>8)&255;mh[3]=(total+8)&255;
  /* Nutzdaten in der Reihenfolge der Chunks (nach Dateiposition) */
  var parts=[ftyp,fin.moov,mh];
  fin.allc.forEach(function(ch){parts.push(d.subarray(ch.off,ch.off+ch.bytes))});
  return parts;
}

function fix(blob){
  if(!blob||!/mp4/i.test(blob.type||''))return Promise.resolve(blob);
  return blob.arrayBuffer().then(function(ab){
    try{var parts=fixBytes(new Uint8Array(ab));if(!parts)return blob;return new Blob(parts,{type:'video/mp4'})}catch(e){try{console.warn('MP4Fix',e)}catch(_){}return blob}
  }).catch(function(){return blob});
}
var API={fix:fix,fixBytes:fixBytes};
if(typeof module!=='undefined'&&module.exports)module.exports=API;else root.MP4Fix=API;
})(typeof window!=='undefined'?window:this);
