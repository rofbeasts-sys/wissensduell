/* Brain Pulse statt Firebase: Konto, Spielstand und Bestenliste laufen ueber den eigenen Server */
(function(){
var PP=null; try{ if(window.parent!==window&&typeof window.parent.tfApi==="function") PP=window.parent; }catch(e){}
function api(p,b){ try{ if(PP) return PP.tfApi(p,b||{}).catch(function(){ return null; }); }catch(e){} return Promise.resolve(null); }
var me=null;
function snap(val){ return { val:function(){ return val; }, exists:function(){ return val!=null; }, forEach:function(fn){ if(Array.isArray(val)) val.forEach(function(v){ fn({ val:function(){ return v; } }); }); } }; }
function Ref(path){ this.path=path; this.n=100; }
Ref.prototype.orderByChild=function(){ return this; };
Ref.prototype.limitToLast=function(n){ this.n=n; return this; };
Ref.prototype.once=function(){
  var p=this.path, n=this.n;
  if(p==="leaderboard") return api("/api/realm/board",{n:n}).then(function(r){ var t=r&&r.ok?r.top.slice().reverse():[]; return snap(t); });
  if(p.indexOf("leaderboard/")===0) return api("/api/realm/board",{n:1}).then(function(r){ return snap(r&&r.ok?r.mine:null); });
  if(/\/state$/.test(p)) return api("/api/realm/load",{}).then(function(r){ window.__bpLoadOk=!!(r&&r.ok); return snap(r&&r.ok?r.state:null); });
  return Promise.resolve(snap(null));
};
Ref.prototype.on=function(ev,cb){ var self=this; var tries=0; function go(){ self.once().then(function(s){ cb(s); if(/\/state$/.test(self.path)&&!window.__bpLoadOk&&tries<10){ tries++; setTimeout(go,4000); } }); } go(); setInterval(go,60000); };
Ref.prototype.set=function(v){
  var p=this.path;
  if(p.indexOf("leaderboard/")===0) return api("/api/realm/score",{entry:v});
  if(/\/state$/.test(p)) return api("/api/realm/save",{state:v});
  return Promise.resolve();
};
window.db={ ref:function(p){ return new Ref(p); } };
var cbs=[];
function fire(){ cbs.forEach(function(cb){ cb(me); }); }
function init(n){
  n=n||0;
  if(!PP||!PP.tfHasAccount||!PP.tfHasAccount()){ if(n===0){ me=null; fire(); } if(PP&&n<30) setTimeout(function(){ init(n+1); },1500); return; }
  api("/api/session",{}).then(function(r){
    var name=r&&r.ok&&r.profile&&r.profile.username;
    if(name){ window.bpUser=name; try{ localStorage.setItem("robPlayerName",name); }catch(e){} }
    me=name?{ uid:name, email:"", displayName:name, isAnonymous:false }:null; fire();
  });
}
var noLogin=function(){ var m="Melde dich in Brain Pulse an. Dann wird dein Spielstand automatisch gespeichert."; try{ var e=document.getElementById("accError"); if(e) e.textContent=m; }catch(x){} return Promise.reject({ code:"brain-pulse", message:m }); };
window.auth={
  onAuthStateChanged:function(cb){ cbs.push(cb); if(document.readyState==="complete") setTimeout(init,0); else window.addEventListener("load",function(){ setTimeout(init,0); }); },
  isSignInWithEmailLink:function(){ return false; },
  signInWithEmailLink:noLogin, signInWithPopup:noLogin, signInAnonymously:noLogin, sendSignInLinkToEmail:noLogin,
  signOut:function(){ return Promise.resolve(); }
};
window.firebase={ auth:{ GoogleAuthProvider:function(){} } };
})();
;window.__ver=window.__ver||{};window.__ver['shim']='11-11c';
