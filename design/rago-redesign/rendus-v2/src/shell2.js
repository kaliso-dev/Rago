// Barre latérale + barre du haut v2 : pas de compteurs, pas de titres de groupe
(function () {
  const active = document.body.dataset.page;
  const G = [
    [['dashboard', 'grid', 'Tableau de bord'], ['analysis', 'activity', 'Analyse du PC']],
    [['network', 'wifi', 'Réseau'], ['latency', 'gauge', 'Latence'], ['gpu', 'gpu', 'Carte graphique'], ['windows', 'windows', 'Windows'], ['tools', 'wrench', 'Outils']],
    [['hitreg', 'crosshair', 'Hitreg'], ['minecraft', 'box', 'Minecraft'], ['rbw', 'shield', 'RBW Mod'], ['gamemode', 'pad', 'Mode jeu'], ['games', 'library', 'Jeux'], ['display', 'palette', 'Couleurs et résolution'], ['mouse', 'mouse', 'Souris']],
    [['expert', 'terminal', 'Mode expert'], ['restore', 'undo', 'Restaurer']],
  ];
  let h = '<aside class="side"><div class="logo"><i data-logo></i></div>';
  G.forEach((g, i) => { if (i) h += '<div class="gap"></div>'; for (const [id, ic, name] of g) h += `<a class="${id === active ? 'on' : ''}"><i data-i="${ic}"></i>${name}</a>`; });
  h += '<a class="foot"><i data-i="sliders"></i>Paramètres</a></aside>';
  h += `<header class="top"><span class="search"><i data-i="search"></i>Rechercher</span><div class="r"><span class="av"></span>
    <span class="w"><svg viewBox="0 0 14 14"><path d="M2 7h10"/></svg></span><span class="w"><svg viewBox="0 0 14 14"><rect x="2.5" y="2.5" width="9" height="9" rx="2"/></svg></span><span class="w"><svg viewBox="0 0 14 14"><path d="M3 3l8 8M11 3l-8 8"/></svg></span></div></header>`;
  h += '<div class="grain"></div>';
  document.querySelector('.win').insertAdjacentHTML('afterbegin', h);
})();
