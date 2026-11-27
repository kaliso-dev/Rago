// Barre latérale v5 "Match day" + boutons de fenêtre.
(function () {
  if (/round/.test(location.hash)) document.documentElement.classList.add('round');
  if (/poster/.test(location.hash)) document.documentElement.classList.add('poster');
  // barre repliée et détachée (#rail), dépliée (#rail-open), avec une bulle au survol (#rail-tip)
  if (/rail/.test(location.hash)) document.documentElement.classList.add('rail');
  if (/rail-open/.test(location.hash)) document.documentElement.classList.add('rail-open');
  const tip = /rail-tip/.test(location.hash) ? { games: 'display', dashboard: 'analysis', display: 'hitreg' }[document.body.dataset.page] : '';
  const active = document.body.dataset.page;
  const G = [
    ['optimize', [['dashboard', 'grid', 'dashboard', ''], ['analysis', 'activity', 'analyze my pc', ''], ['network', 'wifi', 'network', ''], ['latency', 'gauge', 'latency', '6/82'], ['gpu', 'gpu', 'graphics card', '4/29'], ['windows', 'windows', 'windows', '12/50'], ['tools', 'wrench', 'tools', '']]],
    ['play', [['games', 'library', 'games', '9'], ['display', 'palette', 'display', '2/9'], ['hitreg', 'crosshair', 'hitreg', '2/9'], ['mouse', 'mouse', 'mouse', ''], ['gamemode', 'pad', 'game mode', 'on'], ['minecraft', 'box', 'minecraft', ''], ['rbw', 'shield', 'rbw mod', 'off']]],
    ['pro', [['expert', 'terminal', 'expert mode', '0/18'], ['restore', 'undo', 'restore', '']]],
  ];
  // PC sans rien d'appliqué (data-on="0") : compteurs des modules à 0, mode jeu éteint
  if (document.body.dataset.on === '0') G.forEach(([, items]) => items.forEach((it) => { if (/^\d+\/\d+$/.test(it[3])) it[3] = '0/' + it[3].split('/')[1]; if (it[0] === 'gamemode') it[3] = 'off'; }));
  const item = ([id, ic, name, n]) => `<a class="${id === active ? 'on' : ''}${id === tip ? ' tip' : ''}" data-t="${name}${n ? '  ' + n : ''}"><i data-i="${ic}"></i><span class="t">${name}</span>${n ? `<em>${n}</em>` : ''}</a>`;
  let h = '<aside class="side"><div class="logo" aria-label="rago"><i data-logo></i><b>ago</b></div>';
  G.forEach(([g, items]) => { h += `<div class="grp">${g}</div>` + items.map(item).join(''); });
  const onN = document.body.dataset.on ?? '21'; const onS = onN === '0' ? 'nothing applied yet' : 'last check 2 days ago';
  h += `<div class="foot"><div class="pc"><span class="k">this pc</span><b>${onN} tweaks <span>on</span></b><small>${onS}</small></div>${item(['settings', 'sliders', 'settings', ''])}<div class="pcmini"><b>${onN}</b><small>on</small></div><span class="tog"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 17 5-5-5-5M13 17l5-5-5-5"/></svg><span class="t">collapse</span></span><div class="motto">every millisecond counts.</div></div></aside><div class="scrim"></div>`;
  document.querySelector('.win').insertAdjacentHTML('afterbegin', h);
  const wc = document.querySelector('.topbar .wc');
  if (wc) wc.innerHTML = '<span><svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M2 7h10"/></svg></span><span><svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="2.5" y="2.5" width="9" height="9"/></svg></span><span><svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 3l8 8M11 3l-8 8"/></svg></span>';
})();
