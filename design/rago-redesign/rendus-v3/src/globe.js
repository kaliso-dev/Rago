// Globe filaire + réticule de visée, dessiné en SVG.
// <div data-globe data-r="150" data-lon="-28" data-tilt="36" data-label="18 ms"></div>
(function () {
  const D = Math.PI / 180;
  const css = n => getComputedStyle(document.body).getPropertyValue(n).trim();
  const vec = (lat, lon) => [Math.cos(lat * D) * Math.sin(lon * D), Math.sin(lat * D), Math.cos(lat * D) * Math.cos(lon * D)];
  const SERVERS = { paris: [48.86, 2.35], ashburn: [39.04, -77.49], frankfurt: [50.11, 8.68], london: [51.5, -0.12], stockholm: [59.33, 18.06],
    madrid: [40.4, -3.7], warsaw: [52.23, 21.01], milan: [45.46, 9.19], montreal: [45.5, -73.57], dallas: [32.78, -96.8], saopaulo: [-23.55, -46.63], johannesburg: [-26.2, 28.05], dubai: [25.2, 55.27], chicago: [41.88, -87.63], miami: [25.76, -80.19] };

  document.querySelectorAll('[data-globe]').forEach((el, gi) => {
    const R = +el.dataset.r || 150, lon0 = +(el.dataset.lon || -28), tilt = +(el.dataset.tilt || 36) * D;
    const ring = R * 1.17, S = Math.ceil(R * 1.5) * 2, c = S / 2;
    const tech = css('--tech'), tech2 = css('--tech-2'), red = css('--rouge'), gris = css('--gris');
    const id = 'g' + gi;

    const rot = v => { // longitude de vue puis inclinaison
      const a = -lon0 * D, x = v[0] * Math.cos(a) + v[2] * Math.sin(a), z = -v[0] * Math.sin(a) + v[2] * Math.cos(a), y = v[1];
      return [x, y * Math.cos(tilt) - z * Math.sin(tilt), y * Math.sin(tilt) + z * Math.cos(tilt)];
    };
    const scr = p => [c + R * p[0], c - R * p[1]];
    const f = n => n.toFixed(1);

    // lignes de latitude / longitude : face avant et face arrière séparées
    let front = '', back = '';
    const line = pts => {
      let cur = null, seg = [];
      const flush = () => { if (seg.length > 1) { const d = 'M' + seg.map(p => f(p[0]) + ' ' + f(p[1])).join('L'); cur ? front += d : back += d; } seg = []; };
      for (const p of pts) { const vis = p[2] > 0; if (cur !== null && vis !== cur) { flush(); } cur = vis; seg.push(scr(p)); }
      flush();
    };
    for (let lat = -75; lat <= 75; lat += 15) { const pts = []; for (let lon = -180; lon <= 180; lon += 2) pts.push(rot(vec(lat, lon))); line(pts); }
    for (let lon = 0; lon < 360; lon += 15) { const pts = []; for (let lat = -90; lat <= 90; lat += 2) pts.push(rot(vec(lat, lon))); line(pts); }

    // réticule : graduations, quatre branches, un secteur rouge
    let ticks = '', hot = '';
    for (let i = 0; i < 180; i++) {
      const a = i * 2 * D, long = i % 15 === 0, r2 = ring + (long ? 13 : 6);
      const d = `M${f(c + ring * Math.cos(a))} ${f(c + ring * Math.sin(a))}L${f(c + r2 * Math.cos(a))} ${f(c + r2 * Math.sin(a))}`;
      (i >= +(el.dataset.hot || 104) && i < +(el.dataset.hot || 104) + 16) ? hot += d : ticks += d;
    }
    const arm = (a, r1, r2) => `M${f(c + r1 * Math.cos(a))} ${f(c + r1 * Math.sin(a))}L${f(c + r2 * Math.cos(a))} ${f(c + r2 * Math.sin(a))}`;
    const arms = (el.dataset.arms ?? '0 90 180 270').split(' ').filter(Boolean).map(Number).map(d => arm(d * D, ring + 22, ring + 52)).join('');

    // routes : arc de grand cercle levé au-dessus de la surface
    const route = (a, b, lift) => {
      const p = vec(...SERVERS[a]), q = vec(...SERVERS[b]);
      const om = Math.acos(Math.min(1, p[0] * q[0] + p[1] * q[1] + p[2] * q[2]));
      const pts = [];
      for (let i = 0; i <= 60; i++) {
        const t = i / 60, s1 = Math.sin((1 - t) * om) / Math.sin(om), s2 = Math.sin(t * om) / Math.sin(om);
        const h = 1 + (lift ?? (0.06 + 0.22 * om / Math.PI)) * Math.sin(Math.PI * t);
        const v = rot([(s1 * p[0] + s2 * q[0]) * h, (s1 * p[1] + s2 * q[1]) * h, (s1 * p[2] + s2 * q[2]) * h]);
        pts.push(v);
      }
      route.apex = scr(pts[30]);
      return 'M' + pts.filter(v => v[2] > 0 || Math.hypot(v[0], v[1]) > 1).map(v => scr(v).map(f).join(' ')).join('L');
    };
    const home = el.dataset.home || 'paris', main = el.dataset.main || 'ashburn';
    const others = (el.dataset.others || 'frankfurt london stockholm madrid warsaw dubai montreal johannesburg').split(' ');
    const thin = others.map(o => route(home, o)).join('');
    const hero = route(home, main, +(el.dataset.lift || .26)); const ap = route.apex;

    const node = (k, col, s) => { const v = rot(vec(...SERVERS[k])); if (v[2] < 0.05) return ''; const [x, y] = scr(v);
      return `<rect x="${f(x - s / 2)}" y="${f(y - s / 2)}" width="${s}" height="${s}" fill="${col}" transform="rotate(45 ${f(x)} ${f(y)})"/>`; };
    const nodes = Object.keys(SERVERS).filter(k => k !== home && k !== main).map(k => node(k, tech, 5)).join('');
    const hp = scr(rot(vec(...SERVERS[home]))), mp = scr(rot(vec(...SERVERS[main])));
    const fs = Math.round(R / 9);
    const label = el.dataset.label ? `<path d="M${f(ap[0])} ${f(ap[1] - 8)}v-${fs + 2}" stroke="${gris}" stroke-opacity=".6"/>
      <text x="${f(ap[0])}" y="${f(ap[1] - fs - 18)}" text-anchor="middle" font-family="Unbounded" font-weight="800" font-size="${fs}" fill="${gris}" letter-spacing="-.5">${el.dataset.label}</text>` : '';

    el.innerHTML = `<svg viewBox="0 0 ${S} ${S}" width="${S}" height="${S}" fill="none" style="overflow:visible;display:block">
      <defs>
        <radialGradient id="${id}s" cx=".38" cy=".3" r=".8"><stop stop-color="${tech}" stop-opacity=".34"/><stop offset=".55" stop-color="${tech}" stop-opacity=".08"/><stop offset="1" stop-color="${tech}" stop-opacity=".02"/></radialGradient>
        <filter id="${id}b" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${R / 20}"/></filter>
        <filter id="${id}r" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="3"/></filter>
      </defs>
      <circle cx="${c}" cy="${c}" r="${R * 1.02}" stroke="${tech}" stroke-width="${R / 22}" opacity=".45" filter="url(#${id}b)"/>
      <circle cx="${c}" cy="${c}" r="${R}" fill="url(#${id}s)"/>
      <path d="${back}" stroke="${tech}" stroke-opacity=".1" stroke-width="1"/>
      <path d="${front}" stroke="${tech}" stroke-opacity=".5" stroke-width="1.1"/>
      <circle cx="${c}" cy="${c}" r="${R}" stroke="${tech}" stroke-opacity=".8" stroke-width="1.4"/>
      <path d="${ticks}" stroke="${tech}" stroke-opacity=".45" stroke-width="1.2"/>
      <path d="${hot}" stroke="${red}" stroke-width="2"/>
      <path d="${arms}" stroke="${gris}" stroke-opacity=".55" stroke-width="1.4"/>
      <path d="${thin}" stroke="${tech2}" stroke-opacity=".8" stroke-width="1.5"/>
      ${nodes}
      <path d="${hero}" stroke="${red}" stroke-width="6" opacity=".7" filter="url(#${id}r)"/>
      <path d="${hero}" stroke="${red}" stroke-width="2.4"/>
      ${node(main, red, 9)}
      <circle cx="${f(hp[0])}" cy="${f(hp[1])}" r="${R / 9}" stroke="${red}" stroke-opacity=".35"/>
      <circle cx="${f(hp[0])}" cy="${f(hp[1])}" r="${R / 17}" stroke="${red}" stroke-opacity=".7"/>
      <rect x="${f(hp[0] - 5)}" y="${f(hp[1] - 5)}" width="10" height="10" fill="${red}" transform="rotate(45 ${f(hp[0])} ${f(hp[1])})"/>
      ${label}
    </svg>`;
  });
})();
