// Dashboard : on applique les 18 tweaks gratuits. La barre se remplit, le compteur descend, un tampon APPLIED se pose, le score monte.
(function () {
  const STAMP = "<svg class=\"stamp\" id=\"stamp\" width=\"292\" height=\"124\" viewBox=\"0 0 292 124\" overflow=\"visible\"><defs><filter id=\"st-f\" x=\"-10%\" y=\"-15%\" width=\"120%\" height=\"130%\" primitiveUnits=\"userSpaceOnUse\" color-interpolation-filters=\"sRGB\"><feTurbulence type=\"fractalNoise\" baseFrequency=\"0.32\" numOctaves=\"2\" seed=\"7\" result=\"n\"/><feDisplacementMap in=\"SourceGraphic\" in2=\"n\" scale=\"2.4\" xChannelSelector=\"R\" yChannelSelector=\"G\" result=\"d\"/><feTurbulence type=\"fractalNoise\" baseFrequency=\"0.26\" numOctaves=\"2\" seed=\"13\" result=\"s\"/><feColorMatrix in=\"s\" type=\"matrix\" values=\"0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -16 0 0 0 12.6\" result=\"sm\"/><feComposite in=\"d\" in2=\"sm\" operator=\"in\"/></filter><filter id=\"st-b\" x=\"-10%\" y=\"-15%\" width=\"120%\" height=\"130%\" primitiveUnits=\"userSpaceOnUse\" color-interpolation-filters=\"sRGB\"><feTurbulence type=\"fractalNoise\" baseFrequency=\"0.24\" numOctaves=\"2\" seed=\"19\" result=\"n\"/><feDisplacementMap in=\"SourceGraphic\" in2=\"n\" scale=\"3.2\" xChannelSelector=\"G\" yChannelSelector=\"R\" result=\"d\"/><feTurbulence type=\"fractalNoise\" baseFrequency=\"0.2\" numOctaves=\"2\" seed=\"25\" result=\"s\"/><feColorMatrix in=\"s\" type=\"matrix\" values=\"0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -14 0 0 0 11.4\" result=\"sm\"/><feComposite in=\"d\" in2=\"sm\" operator=\"in\"/></filter><mask id=\"st-m\" maskUnits=\"userSpaceOnUse\" x=\"-10\" y=\"-10\" width=\"312\" height=\"144\"><rect x=\"-10\" y=\"-10\" width=\"312\" height=\"144\" fill=\"#fff\"/><text x=\"146.0\" y=\"80\" text-anchor=\"middle\" font-family=\"Barlow Condensed\" font-weight=\"900\" font-style=\"italic\" font-size=\"84\" letter-spacing=\"1\">APPLIED</text><rect x=\"18\" y=\"92\" width=\"256\" height=\"3\" fill=\"#000\"/><text x=\"146.0\" y=\"114\" text-anchor=\"middle\" font-family=\"Barlow Condensed\" font-weight=\"800\" font-size=\"15\" letter-spacing=\"3.5\">18 TWEAKS ON</text></mask><g id=\"st-g\" mask=\"url(#st-m)\"><path fill=\"currentColor\" d=\"M0 0H276L292 16V124H0Z\"/></g></defs><use id=\"st-back\" href=\"#st-g\" style=\"color:#FF3B30\" filter=\"url(#st-b)\"/><use id=\"st-face\" href=\"#st-g\" style=\"color:#ECE9E2\" filter=\"url(#st-f)\"/></svg>";
  const free = document.querySelector('.free');
  free.parentElement.style.position = 'relative'; free.parentElement.insertAdjacentHTML('beforeend', STAMP);
  const st = document.createElement('style');
  st.textContent = '.row .stamp{position:absolute;z-index:5;pointer-events:none;transform-origin:50% 50%}'
    + '.free .btn.done{color:var(--ink)}.free .btn.done::before{background:var(--bg-4);border-color:var(--line-2);box-shadow:none}'
    + '.free .btn.done svg.ck{width:18px;height:18px;fill:none;stroke:var(--red);stroke-width:3;stroke-linecap:butt;stroke-linejoin:miter}'
    + '.free .sub a{color:var(--red);text-decoration:underline;text-underline-offset:3px;margin-left:8px;font-weight:600}'
    + '#cur{position:fixed;left:0;top:0;z-index:99;pointer-events:none;width:0;height:0}';
  document.head.appendChild(st);
  document.body.insertAdjacentHTML('beforeend', '<div id="cur"><i style="position:absolute;left:-16px;top:-16px;width:32px;height:32px;border-radius:50%;border:2px solid rgba(236,233,226,.7);opacity:0"></i>'
    + '<svg width="22" height="26" viewBox="0 0 22 26" style="position:absolute;left:-2px;top:-2px;transform-origin:2px 2px;filter:drop-shadow(0 2px 3px rgba(0,0,0,.5))"><path d="M2 2V21L7 16.5L10.5 24L14 22.5L10.6 15.2H17Z" fill="#ECE9E2" stroke="#0A0A0B" stroke-width="1.6" stroke-linejoin="round"/></svg></div>');
  const segs = [...free.querySelectorAll('.seg i')], hero = [...document.querySelectorAll('.score .seg i')];
  const left = free.querySelector('.left b'), sub = free.querySelector('.go .sub'), btn = free.querySelector('.go .btn');
  const btnOn = btn.innerHTML, pv = document.querySelector('.score .pv b');
  const stamp = document.getElementById('stamp'), cur = document.getElementById('cur'), lf = free.querySelector('.left');
  stamp.style.left = (free.offsetLeft + free.offsetWidth - 292 - 46) + 'px'; stamp.style.top = (free.offsetTop + 30) + 'px';
  const cv = cur.querySelector('svg'), ring = cur.querySelector('i');
  const b = btn.getBoundingClientRect(), BX = b.x + b.width * .62, BY = b.y + b.height * .58;
  const CLICK = 900, FILL0 = 960, FILL1 = 1560, HIT = 1640, D = 4200;
  let mode = '';
  window.__seq = { duration: D, seek(t) {
    // curseur : arrive sur le bouton, clic, puis s'écarte
    const m1 = E.inOut(E.k(t, 150, CLICK - 120)), m2 = E.inOut(E.k(t, 2300, 3000));
    const x = E.lerp(E.lerp(BX + 330, BX, m1), BX + 120, m2), y = E.lerp(E.lerp(BY + 170, BY, m1), BY + 150, m2);
    cur.style.transform = `translate(${x}px,${y}px)`;
    const pr = t - (CLICK - 90);
    cv.style.transform = `scale(${pr < 0 || pr > 220 ? 1 : pr < 90 ? 1 - .14 * pr / 90 : .86 + .14 * (pr - 90) / 130})`;
    const rp = (pr - 90) / 330; ring.style.opacity = rp < 0 || rp > 1 ? 0 : (1 - rp) * .8; ring.style.transform = `scale(${.4 + rp * 1.1})`;
    // bouton enfoncé
    const bp = t - CLICK; btn.style.transform = bp < 0 || bp > 200 ? '' : `scale(${1 - .035 * Math.sin(bp / 200 * Math.PI)})`;
    // la barre se remplit case par case, le compteur descend
    const f = E.k(t, FILL0, FILL1), n = 12 + Math.floor(E.outQ(f) * 18 + 1e-6);
    segs.forEach((s, i) => { s.className = i < n ? 'f' : ''; const age = t - (FILL0 + (i - 12) / 18 * (FILL1 - FILL0));
      s.style.transform = i >= 12 && age > 0 && age < 160 ? `skewX(var(--skew)) scaleY(${1 + .45 * (1 - age / 160)})` : ''; });
    left.textContent = 18 - (n - 12);
    // le tampon tombe
    const a = E.k(t, HIT - 200, HIT), s = E.lerp(2.1, 1, E.slam(a));
    stamp.style.opacity = t < HIT - 200 ? 0 : E.k(t, HIT - 200, HIT - 120);
    stamp.style.transform = `rotate(${E.lerp(-15, -7, E.slam(a))}deg) scale(${s})`;
    const bk = E.out(E.k(t, HIT - 10, HIT + 170));
    document.getElementById('st-back').setAttribute('transform', `translate(${5 * bk} ${6 * bk})`);
    document.getElementById('st-back').style.opacity = E.k(t, HIT - 10, HIT + 20);
    lf.style.opacity = 1 - E.k(t, HIT - 40, HIT + 40);
    free.style.transform = `translate(${E.shake(t, HIT, 300, 3)}px,${E.shake(t, HIT + 20, 300, 1.6)}px)`;
    // bouton et ligne d'état passent en "fait"
    const done = t >= HIT;
    if ((done ? 'd' : 'n') !== mode) { mode = done ? 'd' : 'n';
      btn.classList.toggle('red', !done); btn.classList.toggle('done', done);
      btn.innerHTML = done ? '<svg class="ck" viewBox="0 0 24 24"><path d="M4.5 12.5L9.5 17.5L19.5 6.5"/></svg>18 tweaks applied' : btnOn;
      sub.innerHTML = done ? '30 of 30 on<a>Undo</a>' : '12 of 30 already on'; }
    // le score monte
    const g = E.outQ(E.k(t, HIT + 150, HIT + 900));
    pv.textContent = Math.round(E.lerp(21, 39, g));
    pv.style.transform = `scale(${1 + .06 * Math.sin(E.k(t, HIT + 820, HIT + 1100) * Math.PI)})`; pv.style.transformOrigin = '0 100%';
    hero.forEach((h, i) => h.className = i < (g >= .5 ? 4 : 3) ? 'f' : '');
  } };
  __seq.seek(/applied-end/.test(location.hash) ? 99999 : 0);
})();
