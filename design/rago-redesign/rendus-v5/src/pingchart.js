// Graphe de ping "imprimé" : courbe papier avec la couche rouge décalée dessous (comme les icônes), trame rouge sous la courbe,
// repères en temps de match (00:10, 00:20...), moyenne et pic sur des bandes de papier, paquet perdu hachuré. Stats en tableau d'affichage.
(function () {
  const TAPE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 56' preserveAspectRatio='none'%3E%3Cpath d='M8.0 3.3 L9.9 2.6 L11.9 3.8 L15.0 3.6 L16.7 4.1 L18.8 3.5 L21.0 3.9 L25.3 4.6 L29.3 5.3 L33.4 5.9 L37.1 5.8 L38.8 5.0 L42.2 6.4 L46.7 6.1 L50.1 6.5 L52.1 6.9 L53.9 7.0 L58.4 5.6 L61.2 6.3 L63.0 5.9 L65.5 6.8 L68.5 6.1 L71.9 5.8 L73.8 6.7 L77.6 6.3 L80.1 4.9 L82.2 3.6 L83.8 4.0 L87.8 3.7 L91.3 4.7 L94.4 4.7 L97.3 3.6 L101.1 5.2 L103.1 5.2 L105.0 5.1 L108.6 5.0 L112.3 5.2 L116.5 4.7 L119.1 5.0 L121.2 3.7 L123.8 3.6 L127.2 3.8 L129.5 2.3 L131.9 0.2 L135.7 2.4 L138.4 1.9 L142.4 1.8 L145.6 1.0 L150.0 1.4 L152.4 1.3 L154.6 1.3 L158.2 1.2 L160.6 2.0 L162.9 2.3 L164.5 0.8 L167.6 -1.6 L170.5 1.4 L174.7 2.6 L176.7 -0.1 L180.9 1.3 L185.2 0.0 L188.1 2.2 L192.3 2.9 L195.5 2.9 L198.7 4.2 L201.4 2.9 L204.1 2.4 L207.7 1.8 L209.9 2.6 L211.8 3.3 L214.6 2.1 L217.7 2.4 L220.6 1.8 L224.7 2.1 L228.3 2.5 L231.4 2.8 L234.6 3.3 L238.7 4.1 L242.0 4.6 L245.1 5.4 L248.0 4.5 L252.1 4.5 L256.1 4.6 L258.1 4.5 L261.7 5.0 L265.8 5.1 L269.2 5.0 L273.2 6.1 L274.9 4.2 L278.8 5.1 L280.8 4.0 L285.3 5.4 L287.7 5.0 L292.0 4.0 L292.0 4.0 L291.1 0.0 L290.3 3.0 L287.7 7.0 L290.0 9.6 L288.8 11.2 L291.9 15.5 L295.8 20.0 L293.3 21.6 L291.9 25.9 L292.0 29.1 L293.8 31.2 L294.7 35.7 L293.4 39.6 L294.5 41.3 L300.8 44.0 L292.4 47.6 L291.9 51.6 L291.9 53.8 L292.0 56.0 L292.0 51.4 L288.5 50.4 L285.1 50.7 L282.0 50.4 L279.6 53.6 L275.9 51.2 L272.7 54.7 L270.4 51.7 L268.5 53.0 L267.0 53.0 L264.9 54.3 L261.2 54.3 L259.3 54.9 L257.2 54.9 L254.3 55.2 L251.9 55.4 L248.0 57.2 L245.2 55.2 L243.2 57.0 L239.9 55.4 L236.9 55.3 L233.9 55.9 L231.5 56.0 L228.1 55.3 L223.7 54.6 L219.4 53.1 L216.4 52.3 L214.2 53.4 L211.0 53.8 L209.3 52.1 L204.8 52.3 L202.0 50.3 L200.4 51.2 L198.2 52.4 L194.5 50.8 L190.5 52.9 L187.2 53.1 L184.6 52.7 L182.9 53.5 L180.2 52.7 L177.3 54.5 L174.8 53.4 L170.8 53.2 L168.4 54.5 L164.0 53.5 L160.5 52.3 L158.9 52.2 L155.0 52.2 L151.7 53.3 L148.9 52.4 L144.7 51.9 L140.3 50.8 L138.5 50.4 L136.9 50.7 L134.9 50.3 L133.0 49.9 L129.8 50.7 L125.6 51.0 L121.7 49.8 L119.3 49.6 L116.4 49.1 L114.0 48.6 L109.7 48.1 L106.9 48.9 L102.7 49.1 L101.1 49.3 L97.2 49.2 L94.7 49.7 L92.8 51.5 L91.2 50.3 L88.4 50.4 L86.1 52.0 L82.4 51.6 L80.7 51.7 L76.3 51.8 L72.4 52.0 L69.9 51.9 L68.2 51.5 L64.1 51.0 L62.1 51.5 L59.0 51.7 L57.5 51.9 L53.8 51.4 L51.3 51.5 L49.5 50.8 L45.7 51.2 L42.3 50.7 L38.0 50.6 L35.3 51.2 L31.2 50.7 L28.2 51.6 L25.6 52.1 L23.5 53.8 L19.5 55.2 L16.4 53.7 L13.8 55.6 L11.2 54.3 L8.0 52.0 L9.2 56.0 L9.0 51.9 L6.2 49.4 L7.4 47.1 L4.2 45.4 L7.1 41.3 L4.5 37.9 L5.4 34.8 L4.7 32.0 L4.2 28.3 L6.9 26.0 L5.9 22.1 L6.1 18.4 L4.4 16.5 L3.0 14.8 L3.7 12.1 L4.4 9.0 L3.8 5.7 L4.7 3.2 L2.7 0.6 L8.0 0.0 Z' fill='%23000'/%3E%3C/svg%3E";
  const plot = document.querySelector('.plot');
  const V = [...plot.querySelectorAll('i')].map(i => i.classList.contains('lost') ? null : Math.round(parseFloat(i.style.getPropertyValue('--v')) * 40));
  const st = document.createElement('style');
  st.textContent = `
.plot{display:block;border-bottom:0;margin-top:16px;min-height:290px}
.plot svg.pc{position:absolute;inset:0;overflow:visible}
.plot .ptag{position:absolute;padding:5px 12px 3px 10px;font-family:var(--cond);font-weight:900;font-style:italic;font-size:15px;line-height:1;text-transform:uppercase;letter-spacing:.03em;color:#0A0A0B;isolation:isolate;white-space:nowrap}
.plot .ptag::before{content:"";position:absolute;inset:0;z-index:-1;background:#ECE9E2;transform:rotate(-2deg);-webkit-mask:url("${TAPE}") 0 0/100% 100% no-repeat;mask:url("${TAPE}") 0 0/100% 100% no-repeat}
.plot .ptag.r::before{background:var(--red)}
.chart .ch .clk{margin-left:auto;font-family:var(--cond);font-weight:900;font-style:italic;font-size:22px;letter-spacing:.02em}
.chart .ch .clk small{font-size:12px;font-style:normal;font-weight:800;letter-spacing:.12em;color:var(--ink-3);margin-right:8px}
.cs{gap:8px;margin-top:20px}
.cs div{position:relative;padding:12px 18px 11px!important;border:0!important;isolation:isolate}
.cs div::before{content:"";position:absolute;inset:0;z-index:-1;background:var(--bg-3);transform:skewX(var(--skew));border-radius:4px}
.cs div.bad::before{background:var(--red)}
.cs div.bad .lbl,.cs div.bad b{color:#0A0A0B}
.cs div.bad b small{color:rgba(10,10,11,.6)}
`;
  document.head.appendChild(st);
  plot.innerHTML = '';
  const W = plot.clientWidth, H = plot.clientHeight;
  const X0 = 34, X1 = W - 78, Y0 = 34, Y1 = H - 28, MAX = 40, n = V.length;
  const px = i => X0 + i * (X1 - X0) / (n - 1), py = v => Y1 - v / MAX * (Y1 - Y0);
  const valid = V.filter(v => v != null), avg = Math.round(valid.reduce((a, b) => a + b, 0) / valid.length);
  const hiI = V.indexOf(Math.max(...valid)), lostI = V.indexOf(null);
  const flt = (id, f, s, seed, sf, sa, sb, xs = 'R', ys = 'G') => `<filter id="${id}" x="-5%" y="-20%" width="110%" height="140%" primitiveUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
    <feTurbulence type="fractalNoise" baseFrequency="${f}" numOctaves="2" seed="${seed}" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="${s}" xChannelSelector="${xs}" yChannelSelector="${ys}" result="d"/>
    <feTurbulence type="fractalNoise" baseFrequency="${sf}" numOctaves="2" seed="${seed + 6}" result="s"/><feColorMatrix in="s" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  ${sa} 0 0 0 ${sb}" result="sm"/><feComposite in="d" in2="sm" operator="in"/></filter>`;
  const defs = `<defs>${flt('pc-f', .5, 1.6, 5, .5, -16, 13.2)}${flt('pc-b', .4, 2.2, 17, .4, -14, 12, 'G', 'R')}
    <pattern id="pc-dot" width="7" height="7" patternUnits="userSpaceOnUse"><circle cx="3.5" cy="3.5" r="1.35" fill="#FF3B30"/></pattern>
    <pattern id="pc-hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(-30)"><rect width="2.4" height="7" fill="#FF3B30" fill-opacity=".55"/></pattern>
    <linearGradient id="pc-fade" x1="0" y1="${Y0}" x2="0" y2="${Y1}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fff" stop-opacity=".85"/><stop offset="1" stop-color="#fff" stop-opacity=".08"/></linearGradient>
    <mask id="pc-m" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}"><rect x="0" y="0" width="${W}" height="${H}" fill="url(#pc-fade)"/></mask></defs>`;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.setAttribute('class', 'pc'); svg.setAttribute('width', W); svg.setAttribute('height', H);
  plot.appendChild(svg);
  const tAvg = document.createElement('span'); tAvg.className = 'ptag'; plot.appendChild(tAvg);
  const tHi = document.createElement('span'); tHi.className = 'ptag'; plot.appendChild(tHi);
  const tLost = document.createElement('span'); tLost.className = 'ptag r'; tLost.textContent = 'lost'; plot.appendChild(tLost);
  // horloge de match dans l'en-tête du graphe
  const ch = document.querySelector('.chart .ch'); const clk = document.createElement('span'); clk.className = 'clk'; ch.appendChild(clk);
  const cs = [...document.querySelectorAll('.cs div')]; cs[3].classList.add('bad'); const csv = cs.map(c => c.querySelector('b').innerHTML);
  const mmss = s => `00:${String(s).padStart(2, '0')}`;
  function render(p) {   // p : part du test écoulée (0..1)
    const head = p * (n - 1), last = Math.floor(head);
    let segs = [], cur = [];
    for (let i = 0; i <= Math.min(last, n - 1); i++) { if (V[i] == null) { if (cur.length) segs.push(cur); cur = []; continue; } cur.push([px(i), py(V[i])]); }
    if (last < n - 1 && V[last] != null && V[last + 1] != null) { const f = head - last; cur.push([px(last) + f * (px(last + 1) - px(last)), py(V[last] + f * (V[last + 1] - V[last]))]); }
    if (cur.length) segs.push(cur);
    const pl = segs.map(s => s.map(q => q.map(v => v.toFixed(1)).join(',')).join(' '));
    const area = segs.filter(s => s.length > 1).map(s => `M${s[0][0]},${Y1}L` + s.map(q => q.join(',')).join('L') + `L${s[s.length - 1][0]},${Y1}Z`).join('');
    let g = '';
    for (const v of [10, 20, 30, 40]) g += `<line x1="${X0}" x2="${X1}" y1="${py(v)}" y2="${py(v)}" stroke="#fff" stroke-opacity=".06"/><text x="${X0 - 10}" y="${py(v) + 4}" text-anchor="end" font-family="Barlow Condensed" font-weight="700" font-size="12" fill="#6E6E78">${v}</text>`;
    g += `<line x1="${X0}" x2="${X1}" y1="${Y1}" y2="${Y1}" stroke="#fff" stroke-opacity=".14"/>`;
    for (let s = 0; s < n; s += 10) g += `<line x1="${px(s)}" x2="${px(s)}" y1="${Y1}" y2="${Y1 + 6}" stroke="#fff" stroke-opacity=".3" stroke-width="2"/><text x="${px(s)}" y="${Y1 + 21}" text-anchor="${s ? 'middle' : 'start'}" font-family="Barlow Condensed" font-weight="800" font-style="italic" font-size="13" fill="#A1A1AA" letter-spacing=".5">${mmss(s)}</text>`;
    for (let s = 0; s < n; s += 2) if (s % 10) g += `<line x1="${px(s)}" x2="${px(s)}" y1="${Y1}" y2="${Y1 + 3}" stroke="#fff" stroke-opacity=".18"/>`;
    const showLost = last >= lostI, showHi = last >= hiI, done = p >= 1;
    if (showLost) g += `<rect x="${px(lostI) - 7}" y="${Y0 - 6}" width="14" height="${Y1 - Y0 + 6}" fill="url(#pc-hatch)"/><rect x="${px(lostI) - 7}" y="${Y0 - 6}" width="14" height="3" fill="#FF3B30"/>`;
    g += `<g mask="url(#pc-m)"><path d="${area}" fill="#FF3B30" opacity=".13"/></g>`;
    if (done) g += `<line x1="${X0}" x2="${X1}" y1="${py(avg)}" y2="${py(avg)}" stroke="#FF3B30" stroke-width="2" stroke-dasharray="7 6"/>`;
    const line = (col, extra) => pl.map(pts => `<polyline points="${pts}" fill="none" stroke="${col}" stroke-width="3" stroke-linejoin="miter" stroke-miterlimit="4" ${extra}/>`).join('');
    g += `<g transform="translate(2 2.6)" filter="url(#pc-b)">${line('#FF3B30', '')}</g><g filter="url(#pc-f)">${line('#ECE9E2', '')}</g>`;
    if (showHi) g += `<line x1="${px(hiI)}" x2="${px(hiI)}" y1="${py(V[hiI]) - 26}" y2="${py(V[hiI]) - 6}" stroke="#ECE9E2" stroke-width="2"/>`;
    const hp = segs.length && segs[segs.length - 1].length ? segs[segs.length - 1][segs[segs.length - 1].length - 1] : null;
    if (hp) g += `<rect x="${hp[0] - 5}" y="${hp[1] - 5}" width="10" height="10" fill="#FF3B30" transform="rotate(-12 ${hp[0]} ${hp[1]})"/>`;
    svg.innerHTML = defs + g;
    tAvg.textContent = `avg ${avg}`; tAvg.style.display = done ? '' : 'none'; tAvg.style.left = (X1 + 10) + 'px'; tAvg.style.top = (py(avg) - 11) + 'px';
    tHi.textContent = `${V[hiI]} ms`; tHi.style.display = showHi ? '' : 'none'; tHi.style.left = (px(hiI) - 26) + 'px'; tHi.style.top = (py(V[hiI]) - 52) + 'px';
    tLost.style.display = showLost ? '' : 'none'; tLost.style.left = (px(lostI) - 22) + 'px'; tLost.style.top = (Y0 - 34) + 'px';
    clk.innerHTML = done ? `<small>tested</small>${mmss(n - 1)}` : `<small>live</small>${mmss(Math.floor(head))}`;
    cs.forEach((c, i) => { c.style.opacity = done ? 1 : .45; c.querySelector('b').innerHTML = done ? csv[i] : '–'; c.classList.toggle('bad', done && i === 3); });
  }
  window.__seq = { duration: 5200, seek(t) { render(E.k(t, 300, 4600)); } };
  render(1);
})();
