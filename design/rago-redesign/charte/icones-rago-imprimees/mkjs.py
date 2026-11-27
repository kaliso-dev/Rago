import json
from solid import icon, defs, PAPER, RED
MAP = {'grid':'dashboard','activity':'analysis','wifi':'network','gauge':'latency','gpu':'graphics','windows':'windows','wrench':'tools',
       'library':'library','palette':'display','crosshair':'hitreg','mouse':'mouse','pad':'games','box':'minecraft','shield':'rbw',
       'terminal':'expert','undo':'restore','sliders':'settings'}
I = {}
for n in set(MAP.values()):
    I[n] = {'on': icon(n, 21), 'rest': icon(n, 21, face='#A1A1AA', back='#34343A')}
APPLY = icon('apply', 18, face='#0A0A0B', back='#C9221A')
CSS = (
 '.side a svg.pi{width:21px;height:21px;overflow:visible;flex:none}html.rail .side a svg.pi{width:23px;height:23px}.btn svg.pi{width:18px;height:18px;overflow:visible;flex:none}'
 # état sélectionné piloté par --p
 "@property --p{syntax:'<number>';inherits:true;initial-value:0}"
 '.side a{--p:0;transition:--p 220ms cubic-bezier(0,0,.58,1)}.side a.on{--p:1;transition:--p 320ms cubic-bezier(.16,1,.3,1)}'
 '.side a,.side a.on{background:linear-gradient(90deg,rgba(255,59,48,calc(.13*var(--p))),rgba(255,59,48,0) 85%);color:color-mix(in srgb,var(--ink) calc(var(--p)*100%),var(--ink-2))}'
 '.side a::before,.side a.on::before{content:"";position:absolute;left:0;top:8px;bottom:8px;width:3px;border-radius:3px;background:var(--red);transform:scaleY(var(--p));opacity:var(--p)}'
 'html.rail .side a::before,html.rail .side a.on::before{left:-11px;top:11px;bottom:11px}'
 'html.rail .side a.on{background:rgba(255,59,48,calc(.15*var(--p)))}'
 '.side a .t{display:inline-block;transform:translateX(calc(10px*var(--p)))}'
 '.side a em,.side a.on em{color:color-mix(in srgb,var(--red) calc(var(--p)*100%),var(--ink-3))}'
 '@media (prefers-reduced-motion:reduce){.side a{transition:none}}'
)
js = f'''// Icônes Rago "imprimées" posées dans les maquettes (22/11/2026). Rouge derrière toutes les icônes du menu (#pgrey : gris hors onglet ouvert).\n// Onglet sélectionné : le nom glisse de 10 px vers la droite, la barre et le voile rouges apparaissent ; tout suit --p (0 → 1), animé.
(function () {{
  const all = !/pgrey/.test(location.hash);
  const MAP = {json.dumps(MAP)};
  const I = {json.dumps(I)};
  const APPLY = {json.dumps(APPLY)};
  document.body.insertAdjacentHTML('afterbegin', {json.dumps(defs())});
  const st = document.createElement('style');
  st.textContent = {json.dumps(CSS)};
  document.head.appendChild(st);
  document.querySelectorAll('.side a i[data-i]').forEach(el => {{
    const n = MAP[el.dataset.i]; if (!n) return;
    const on = el.closest('a').classList.contains('on');
    el.outerHTML = (on || all) ? I[n].on : I[n].rest;
  }});
  document.querySelectorAll('.btn.red i[data-i="zap"], .ap .btn i[data-i="zap"]').forEach(el => {{ el.outerHTML = APPLY; }});
}})();
'''
open('/mnt/project-files/rago-redesign/rendus-v5/src/printicons.js','w').write(js)
print(len(js))
