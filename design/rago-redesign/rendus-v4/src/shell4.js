// Barre latérale flottante v4 + boutons de fenêtre. #dark pour le thème sombre.
(function () {
  if (/dark/.test(location.hash)) document.body.classList.add('dark');
  const active = document.body.dataset.page;
  const G = [
    [['dashboard', 'grid', 'dashboard', 'at a glance'], ['analysis', 'activity', 'analyze my pc', 'last run 2 days ago']],
    [['network', 'wifi', 'network', 'ping 18 ms'], ['latency', 'gauge', 'latency', '6 of 86 on'], ['gpu', 'gpu', 'graphics card', '4 of 30 on'], ['windows', 'windows', 'windows', '12 of 57 on'], ['tools', 'wrench', 'tools', 'ram, dns, cleanup']],
    [['hitreg', 'crosshair', 'hitreg', '2 of 9 on'], ['minecraft', 'box', 'minecraft', 'lunar client'], ['rbw', 'shield', 'rbw mod', 'off'], ['gamemode', 'pad', 'game mode', 'on'], ['games', 'library', 'games', '9 games'], ['display', 'palette', 'display', 'colors & resolution'], ['mouse', 'mouse', 'mouse', 'no acceleration']],
    [['expert', 'terminal', 'expert mode', '18 tweaks'], ['restore', 'undo', 'restore', '3 restore points']],
  ];
  const item = ([id, ic, name, sub]) => `<a class="${id === active ? 'on' : ''}"><span class="ci"><i data-i="${ic}"></i></span><span><b>${name}</b><small>${sub}</small></span></a>`;
  let h = '<div class="blob a"></div><div class="blob b"></div><aside class="side"><div class="logo"><i data-logo></i></div>';
  G.forEach((g, i) => { if (i) h += '<div class="gap"></div>'; h += g.map(item).join(''); });
  h += `<div class="foot">${item(['settings', 'sliders', 'settings', 'premium, night mode'])}</div><div class="motto">every millisecond counts.</div></aside>`;
  document.querySelector('.win').insertAdjacentHTML('afterbegin', h);
  const wc = document.querySelector('.topbar .wc');
  if (wc) wc.innerHTML = '<span><svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M2 7h10"/></svg></span><span><svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="2.5" y="2.5" width="9" height="9" rx="2"/></svg></span><span><svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 3l8 8M11 3l-8 8"/></svg></span>';
})();
