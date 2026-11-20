/* Brain Pulse: kleine Info oben rechts ("Blob"), z.B. Quest geschafft, Figur freigeschaltet.
   Aufruf: bpNotify({icon:'🏆', title:'Quest geschafft', text:'Töte 10 Monster', color:'#c6ff3d'}) */
(function(){
  if(window.bpNotify) return;
  var st = document.createElement('style');
  st.textContent = '#bpNfBox{position:fixed;top:calc(10px + env(safe-area-inset-top,0px));right:calc(10px + env(safe-area-inset-right,0px));z-index:2147483000;display:flex;flex-direction:column;gap:8px;align-items:flex-end;pointer-events:none;max-width:min(88vw,340px)}'
    + '.bpNf{pointer-events:auto;display:flex;gap:10px;align-items:center;background:rgba(18,24,40,.96);color:#fff;border:1.5px solid var(--c,#c6ff3d);border-radius:16px;padding:10px 14px;box-shadow:0 8px 26px rgba(0,0,0,.5),0 0 0 3px rgba(255,255,255,.04);font:600 14px/1.3 system-ui,sans-serif;transform:translateX(120%) scale(.6);opacity:0;transition:transform .45s cubic-bezier(.2,1.4,.4,1),opacity .3s;transform-origin:right top;cursor:pointer}'
    + '.bpNf.in{transform:none;opacity:1}.bpNf.out{transform:translateX(120%) scale(.8);opacity:0}'
    + '.bpNf .ic{font-size:26px;flex:none}.bpNf b{display:block;color:var(--c,#c6ff3d);font-size:12px;letter-spacing:.4px;text-transform:uppercase}';
  (document.head || document.documentElement).appendChild(st);
  function box(){ var b = document.getElementById('bpNfBox'); if(!b){ b = document.createElement('div'); b.id = 'bpNfBox'; document.body.appendChild(b); } return b; }
  window.bpNotify = function(o){
    try{
      o = o || {}; if(!document.body){ document.addEventListener('DOMContentLoaded', function(){ window.bpNotify(o); }); return; }
      var b = box(); while(b.children.length >= 4) b.removeChild(b.firstChild);
      var d = document.createElement('div'); d.className = 'bpNf'; if(o.color) d.style.setProperty('--c', o.color);
      var ic = document.createElement('span'); ic.className = 'ic'; ic.textContent = o.icon || '🔔';
      var t = document.createElement('div'), h = document.createElement('b'); h.textContent = o.title || ''; t.appendChild(h);
      if(o.text) t.appendChild(document.createTextNode(o.text));
      d.appendChild(ic); d.appendChild(t); b.appendChild(d);
      requestAnimationFrame(function(){ requestAnimationFrame(function(){ d.classList.add('in'); }); });
      var gone = function(){ d.classList.remove('in'); d.classList.add('out'); setTimeout(function(){ try{ d.remove(); }catch(e){} }, 450); };
      d.onclick = gone; setTimeout(gone, o.ms || 5000);
    }catch(e){}
  };
})();
