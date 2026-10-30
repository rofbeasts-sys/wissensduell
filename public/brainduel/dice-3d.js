/* 3D-Voxel-Figuren (reines CSS 3D) fuer das Wuerfel-Rennen */
(function(){
const col=(r,g,b,k)=>`rgb(${Math.min(255,r*k|0)},${Math.min(255,g*k|0)},${Math.min(255,b*k|0)})`;
function face(p,fw,fh,tr,c){const d=document.createElement('div');d.className='f';d.style.cssText=`width:${fw}px;height:${fh}px;left:${-fw/2}px;top:${-fh/2}px;background:${c};transform:${tr}`;p.appendChild(d);return d}
function box(w,d,h,c,x=0,y=0,z=0,ex=''){const e=document.createElement('div');e.className='b';e.style.transform=`translate3d(${x}px,${y}px,${z}px)${ex}`;
 face(e,w,d,`translateZ(${h/2}px)`,col(...c,1.18));face(e,w,d,`translateZ(${-h/2}px)`,col(...c,.5));
 face(e,w,h,`translateY(${d/2}px) rotateX(90deg)`,col(...c,1));face(e,w,h,`translateY(${-d/2}px) rotateX(90deg)`,col(...c,.7));
 face(e,d,h,`translateX(${w/2}px) rotateZ(90deg) rotateX(90deg)`,col(...c,.85));face(e,d,h,`translateX(${-w/2}px) rotateZ(90deg) rotateX(90deg)`,col(...c,.6));return e}
function grp(x=0,y=0,z=0,ex=''){const e=document.createElement('div');e.className='g';e.style.transform=`translate3d(${x}px,${y}px,${z}px)${ex}`;return e}
// Figuren
const STEEL=[170,180,198],DARK=[50,54,70],GOLD=[255,200,60],SKIN=[240,190,150],WHITE=[240,240,245];
function base(o){const K=grp();
 const sh=document.createElement('div');sh.className='f';sh.style.cssText='width:90px;height:60px;left:-45px;top:-30px;border-radius:50%;background:rgba(0,0,0,.4);transform:translateZ(1px)';K.appendChild(sh);
 if(!o.robe){for(const s of [-1,1]){const g=grp(s*15,0,58);g.appendChild(box(22,24,52,o.leg,0,0,-26));g.appendChild(box(26,34,12,o.boot,0,4,-56));K.appendChild(g)}}
 else K.appendChild(box(70,48,64,o.robe,0,0,32));
 K.appendChild(box(62,38,58,o.torso,0,0,88));
 const arms=[];for(const s of [-1,1]){const a=grp(s*44,0,110,`rotateX(${o.armA[s>0?1:0]}deg)`);a.appendChild(box(22,24,52,o.arm,0,0,-26));a.appendChild(box(24,26,14,o.hand||SKIN,0,0,-54));K.appendChild(a);arms.push(a)}
 const head=grp(0,0,116);head.appendChild(box(44,44,40,o.head,0,0,20));K.appendChild(head);K.head=head;K.arms=arms;return K}
const FIG={
knight(tab=[50,90,200],plume=[220,40,50]){const K=base({leg:STEEL,boot:DARK,torso:[120,140,180],arm:STEEL,head:[205,210,222],armA:[35,40],hand:STEEL});
 K.appendChild(box(44,3,50,tab,0,20,90));K.appendChild(box(8,4,40,GOLD,0,22,90));K.appendChild(box(28,4,8,GOLD,0,22,98));K.appendChild(box(64,40,8,[120,70,30],0,0,64));
 K.head.appendChild(box(32,3,9,[20,20,30],0,23,24));K.head.appendChild(box(6,3,22,[20,20,30],0,23,14));K.head.appendChild(box(10,36,22,plume,0,-6,51));
 const sw=grp(44,24,64);sw.appendChild(box(10,10,20,[110,70,30],0,0,0));sw.appendChild(box(36,8,6,GOLD,0,0,11));sw.appendChild(box(9,6,92,[235,240,250],0,0,60));K.appendChild(sw);
 K.appendChild(box(10,52,64,GOLD,-62,26,76));K.appendChild(box(10,44,56,tab,-68,26,76));K.appendChild(box(8,6,34,GOLD,-74,26,76));return K},
mage(){const K=base({robe:[110,60,200],torso:[120,70,215],arm:[110,60,200],head:SKIN,armA:[25,35]});
 K.appendChild(box(64,4,10,GOLD,0,20,60));for(const [x,z] of [[-14,96],[12,80],[0,110],[-10,60]])K.appendChild(box(8,3,8,GOLD,x,24,z));
 const h=K.head;h.appendChild(box(30,3,8,[240,240,245],0,23,12));h.appendChild(box(10,3,6,[40,40,60],-9,23,26));h.appendChild(box(10,3,6,[40,40,60],9,23,26));h.appendChild(box(34,10,22,[240,240,245],0,22,6));
 h.appendChild(box(66,66,6,[80,40,160],0,0,41));h.appendChild(box(44,44,22,[100,50,190],0,0,55));h.appendChild(box(28,28,22,[100,50,190],0,0,77));h.appendChild(box(14,14,18,[100,50,190],0,-2,97,'rotateX(-10deg)'));
 K.appendChild(box(8,8,170,[110,70,30],62,22,85));K.appendChild(box(24,24,24,[80,240,255],62,22,182));return K},
thief(){const K=base({leg:[40,60,50],boot:[30,30,30],torso:[50,80,60],arm:[40,60,50],head:[45,70,55],armA:[50,50]});
 K.appendChild(box(64,40,8,[30,30,30],0,0,64));K.appendChild(box(36,6,14,[200,40,50],0,18,112));K.appendChild(box(12,8,24,[200,40,50],-10,16,98));
 const h=K.head;h.appendChild(box(30,3,14,SKIN,0,23,24));h.appendChild(box(6,3,5,WHITE,-8,24,26));h.appendChild(box(6,3,5,WHITE,8,24,26));h.appendChild(box(46,46,8,[35,55,42],0,0,41));
 K.appendChild(box(34,16,36,[130,90,40],0,-26,92));
 for(const s of [-1,1]){const d=grp(s*44,26,60,`rotateX(-10deg)`);d.appendChild(box(8,8,14,[90,60,30],0,0,0));d.appendChild(box(14,6,4,GOLD,0,0,8));d.appendChild(box(5,4,42,[220,230,240],0,0,32));K.appendChild(d)}return K},
archer(){const K=base({leg:[110,80,50],boot:[80,55,30],torso:[60,150,80],arm:[60,150,80],head:SKIN,armA:[60,30]});
 K.appendChild(box(64,40,8,[110,70,30],0,0,64));
 const h=K.head;h.appendChild(box(6,3,5,[40,40,60],-8,23,26));h.appendChild(box(6,3,5,[40,40,60],8,23,26));h.appendChild(box(56,56,6,[120,80,40],0,0,41));h.appendChild(box(40,40,12,[120,80,40],0,0,50));h.appendChild(box(6,30,10,[220,50,60],14,-4,62,'rotateY(20deg)'));
 K.appendChild(box(22,18,56,[110,70,30],0,-26,100,'rotateX(15deg)'));for(const x of [-6,0,6])K.appendChild(box(3,3,16,[220,220,230],x,-30,138));
 const bow=grp(-52,30,96);bow.appendChild(box(6,6,100,[120,80,40],0,0,0));bow.appendChild(box(6,6,42,[120,80,40],0,-8,40,'rotateX(25deg)'));bow.appendChild(box(6,6,42,[120,80,40],0,-8,-40,'rotateX(-25deg)'));bow.appendChild(box(2,2,100,[240,240,240],0,-26,0));K.appendChild(bow);return K},
healer(){const K=base({robe:[245,245,250],torso:[245,245,250],arm:[245,245,250],head:SKIN,armA:[25,35]});
 K.appendChild(box(64,4,12,GOLD,0,22,56));K.appendChild(box(14,4,38,[225,50,70],0,21,92));K.appendChild(box(36,4,12,[225,50,70],0,21,98));
 const h=K.head;h.appendChild(box(6,3,5,[40,40,60],-8,23,26));h.appendChild(box(6,3,5,[40,40,60],8,23,26));h.appendChild(box(14,3,4,[200,90,90],0,23,12));h.appendChild(box(50,50,10,GOLD,0,-2,40));h.appendChild(box(46,12,30,GOLD,0,-24,24));h.appendChild(box(30,30,6,GOLD,0,0,48));
 K.appendChild(box(8,8,150,[220,190,120],62,22,75));K.appendChild(box(26,10,26,[255,110,160],62,22,160));K.appendChild(box(10,10,26,[255,110,160],62,22,160));return K},
robot(){const K=base({leg:[110,125,150],boot:[60,70,90],torso:[140,160,190],arm:[110,125,150],head:[150,170,200],armA:[20,20],hand:[60,70,90]});
 K.appendChild(box(36,4,30,[40,45,70],0,21,92));for(const [x,c] of [[-10,[255,140,40]],[0,[110,231,160]],[10,[255,90,110]]])K.appendChild(box(7,5,7,c,x,23,92));
 const h=K.head;h.appendChild(box(36,3,14,[20,25,40],0,23,22));h.appendChild(box(8,3,8,[80,240,255],-8,24,22));h.appendChild(box(8,3,8,[80,240,255],8,24,22));h.appendChild(box(4,4,20,[100,110,130],0,0,50));h.appendChild(box(10,10,10,[255,90,110],0,0,64));h.appendChild(box(6,24,12,[80,90,110],-26,0,20));h.appendChild(box(6,24,12,[80,90,110],26,0,20));
 K.appendChild(box(80,30,14,[100,110,130],0,0,114));return K}};

window.DR3D={box,grp,FIG,col};
})();
