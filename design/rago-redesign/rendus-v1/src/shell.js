// Barre latérale + barre de titre de l'app (mêmes sur tous les écrans)
(function () {
  const active = document.body.dataset.page;
  const G = [
    [null, [['dashboard', 'grid', 'Tableau de bord'], ['analysis', 'activity', 'Analyse du PC']]],
    ['Optimiser', [['network', 'wifi', 'Réseau', 24], ['latency', 'gauge', 'Latence', 86], ['gpu', 'gpu', 'Carte graphique', 30], ['windows', 'windows', 'Windows', 57], ['tools', 'wrench', 'Outils']]],
    ['En jeu', [['hitreg', 'crosshair', 'Hitreg', 9], ['minecraft', 'box', 'Minecraft', 4], ['rbw', 'shield', 'RBW Mod', 1], ['gamemode', 'pad', 'Mode jeu', 1], ['games', 'library', 'Jeux'], ['display', 'palette', 'Couleurs et résolution'], ['mouse', 'mouse', 'Souris']]],
    ['Avancé', [['expert', 'terminal', 'Mode expert', 18], ['restore', 'undo', 'Restaurer', 5]]],
  ];
  let h = '<aside class="side glass"><div class="brand"><i data-logo></i><div><b>Rago</b><small>Optimizer</small></div></div><nav class="nav">';
  for (const [label, items] of G) {
    if (label) h += `<div class="nav-g">${label}</div>`;
    for (const [id, ic, name, n] of items) h += `<a class="${id === active ? 'on' : ''}"><i data-i="${ic}"></i>${name}${n ? `<span class="n">${n}</span>` : ''}</a>`;
  }
  h += '</nav><div class="side-foot"><i data-i="sliders"></i>Paramètres</div></aside>';
  h += `<header class="titlebar"><div class="search glass soft"><i data-i="search"></i>Rechercher un réglage<span class="kbd">Ctrl K</span></div>
    <div class="tb-right"><span class="plan">Premium</span><span class="avatar"></span>
    <div class="wctl"><span><svg viewBox="0 0 14 14"><path d="M2 7h10"/></svg></span><span><svg viewBox="0 0 14 14"><rect x="2.5" y="2.5" width="9" height="9" rx="2"/></svg></span><span><svg viewBox="0 0 14 14"><path d="M3 3l8 8M11 3l-8 8"/></svg></span></div></div></header>`;
  document.querySelector('.win').insertAdjacentHTML('afterbegin', h);
})();
