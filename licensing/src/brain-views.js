// The page of the brain (/admin/cerveau, brain.js): a full-screen app, drawn and filled by public/cerveau.js from
// /admin/cerveau/donnees.json. Same strict CSP as the rest of /admin: no inline style or script in this HTML.
import { html } from './views.js';

const ASSETS = '20261112b'; // bumped when cerveau.css / cerveau.js change, so browsers don't keep the old ones
const MARK = html`<svg viewBox="0 0 164 180" aria-hidden="true"><path d="M0 0H160V46L93.83 101.42L164 180H114L65.17 125.42L0 180V132L112.24 38H39V78.34L0 111Z" fill="#FF3B30"/></svg>`;
const ic = (d) => html`<svg class="ic" viewBox="0 0 16 16" aria-hidden="true"><path d="${d}" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const I = {
  left: ic('M10 3.5L5.5 8 10 12.5'),
  search: ic('M7 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM10.6 10.6l3.4 3.4'),
  menu: ic('M2.5 4.5h11M2.5 8h11M2.5 11.5h11'),
  x: ic('M4 4l8 8M12 4l-8 8'),
  refresh: ic('M13.5 8a5.5 5.5 0 1 1-1.6-3.9M13.5 2.5v3h-3'),
  fit: ic('M2.5 6V3.5a1 1 0 0 1 1-1H6M10 2.5h2.5a1 1 0 0 1 1 1V6M13.5 10v2.5a1 1 0 0 1-1 1H10M6 13.5H3.5a1 1 0 0 1-1-1V10'),
  plus: ic('M8 3.5v9M3.5 8h9'),
  minus: ic('M3.5 8h9'),
  local: ic('M8 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM3 4.5a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM13 4.5a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM3 13.5a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM13 13.5a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM6.8 7L3.7 4.2M9.2 7l3.1-2.8M6.8 9l-3.1 2.8M9.2 9l3.1 2.8'),
  files: ic('M2.5 4a1 1 0 0 1 1-1h3l1.5 1.5h4.5a1 1 0 0 1 1 1V12a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1z'),
  sliders: ic('M3 4.5h6M12 4.5h1M3 11.5h1M7 11.5h6M10.5 3v3M5.5 10v3'),
  chevron: ic('M4.5 6.5L8 10l3.5-3.5'),
  check: ic('M3.5 8.5l3 3 6-7'),
};

/** The brain switcher: a drop-down menu (<details>, works without script) with one link per brain; following one
 * loads that brain (and is remembered, admin.js). Sofiene, 12/11: « pour changer de cerveau je veux un menu dépliant ». */
function switcher(brains, current) {
  if (!brains || brains.length < 2) return '';
  return html`<details class="cv-brains" id="cv-brains">
      <summary aria-label="Changer de cerveau"><span class="cv-brains-l">Cerveau</span><b>${current.name}</b>${I.chevron}</summary>
      <ul class="cv-brains-menu" aria-label="Cerveaux">${brains.map((b) => html`<li><a href="/admin/cerveau?c=${encodeURIComponent(b.id)}"${b.id === current.id ? html` aria-current="page"` : ''}><span>${b.name}</span>${b.repo ? html`<small>${b.repo}</small>` : ''}${b.id === current.id ? I.check : ''}</a></li>`)}</ul>
    </details>`;
}

export function brainPage(cfg, { brains = [], current = { id: 'rago', name: 'Rago Optimizer' } } = {}) {
  const q = `?c=${encodeURIComponent(current.id)}`;
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#070708">
<meta name="robots" content="noindex, nofollow">
<title>Cerveau ${html`${current.name}`} · Rago Admin</title>
<link rel="icon" href="/assets/favicon.svg?v=3" type="image/svg+xml">
<link rel="icon" href="/assets/favicon-32.png?v=3" type="image/png" sizes="32x32">
<link rel="preload" href="/assets/fonts/Geist-Variable.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/assets/fonts/GeistMono-Variable.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/assets/tokens.css">
<link rel="stylesheet" href="/assets/cerveau.css?v=${ASSETS}">
<script src="/assets/cerveau.js?v=${ASSETS}" defer></script>
</head>
<body class="cv">
${html`<div class="cv-app" id="cv" data-src="/admin/cerveau/donnees.json${q}" data-file="/admin/cerveau/fichier${q}" data-brain="${current.id}" data-env="${cfg.envName}">
  <input type="checkbox" id="cv-nav" class="cv-nav-t" tabindex="-1" aria-hidden="true">
  <aside class="cv-side" aria-label="Explorateur">
    <div class="cv-brand">
      <a class="cv-logo" href="/admin" title="Retour à l’admin">${MARK}<span><b>Cerveau</b><small>${current.name}</small></span></a>
      <a class="cv-ibtn cv-back" href="/admin" aria-label="Retour à l’admin" title="Retour à l’admin">${I.left}</a>
      <label class="cv-ibtn cv-side-close" for="cv-nav" aria-label="Fermer le panneau">${I.x}</label>
    </div>
    ${switcher(brains, current)}
    <button class="cv-searchbtn" type="button" data-palette>${I.search}<span>Rechercher une note ou un fichier</span><kbd>Ctrl K</kbd></button>
    <label class="cv-filter">${I.sliders}<input id="cv-filter" type="search" placeholder="Filtrer le graphe" autocomplete="off" spellcheck="false" aria-label="Filtrer le graphe"></label>
    <div class="cv-tabs" role="tablist">
      <button type="button" role="tab" id="tab-files" aria-controls="panel-files" aria-selected="true">${I.files}Fichiers</button>
      <button type="button" role="tab" id="tab-view" aria-controls="panel-view" aria-selected="false">${I.sliders}Affichage</button>
    </div>
    <div class="cv-panels">
      <section class="cv-panel" id="panel-files" role="tabpanel" aria-labelledby="tab-files"></section>
      <section class="cv-panel" id="panel-view" role="tabpanel" aria-labelledby="tab-view" hidden></section>
    </div>
    <footer class="cv-foot"><div class="cv-sync" id="cv-sync" aria-live="polite">Lecture du vault…</div>
      <button class="cv-ibtn" type="button" id="cv-refresh" aria-label="Relire le vault sur GitHub" title="Relire le vault sur GitHub">${I.refresh}</button></footer>
  </aside>
  <label class="cv-scrim" for="cv-nav" aria-hidden="true"></label>
  <main class="cv-stage" id="cv-stage">
    <canvas id="cv-canvas" role="img" aria-label="Graphe des notes du vault et de leurs liens"></canvas>
    <div class="cv-hud cv-hud-l">
      <label class="cv-ibtn cv-menu" for="cv-nav" aria-label="Ouvrir l’explorateur" role="button" tabindex="0">${I.menu}</label>
      <div class="cv-stats" id="cv-stats"></div>
    </div>
    <div class="cv-hud cv-hud-r" role="toolbar" aria-label="Graphe">
      <div class="cv-seg" id="cv-local" hidden><button type="button" class="cv-ibtn" data-local aria-pressed="false" title="Graphe local : seulement les voisins de la note ouverte (L)">${I.local}<span>Local</span></button>
        <button type="button" class="cv-depth" data-depth aria-label="Profondeur du graphe local" title="Profondeur">1</button></div>
      <button type="button" class="cv-ibtn" data-zoom="in" aria-label="Zoomer">${I.plus}</button>
      <button type="button" class="cv-ibtn" data-zoom="out" aria-label="Dézoomer">${I.minus}</button>
      <button type="button" class="cv-ibtn" data-fit aria-label="Tout voir (F)" title="Tout voir (F)">${I.fit}</button>
      <button type="button" class="cv-ibtn cv-search-m" data-palette aria-label="Rechercher">${I.search}</button>
    </div>
    <div class="cv-tip" id="cv-tip" role="tooltip" hidden></div>
    <div class="cv-loading" id="cv-loading" role="status"><div class="cv-pulse">${MARK}</div><p>Lecture du vault…</p><small></small></div>
    <p class="cv-hint" id="cv-hint" hidden>Clique sur un point pour lire la note · glisse pour déplacer · molette pour zoomer</p>
  </main>
  <section class="cv-reader" id="cv-reader" aria-label="Lecteur" hidden>
    <div class="cv-resize" id="cv-resize" role="separator" aria-orientation="vertical" aria-label="Largeur du lecteur" tabindex="0"></div>
    <header class="cv-rbar">
      <button type="button" class="cv-ibtn" data-hist="back" aria-label="Précédent">${I.left}</button>
      <div class="cv-crumbs" id="cv-crumbs"></div>
      <div class="cv-ractions" id="cv-ractions"></div>
      <button type="button" class="cv-ibtn" data-close aria-label="Fermer le lecteur (Échap)">${I.x}</button>
    </header>
    <div class="cv-scroll" id="cv-scroll"><article class="cv-doc" id="cv-doc"></article></div>
  </section>
  <div class="cv-palette" id="cv-palette" hidden>
    <div class="cv-pal" role="dialog" aria-modal="true" aria-label="Rechercher">
      <label class="cv-pal-in">${I.search}<input id="cv-q" type="search" placeholder="Une note, un mot, un fichier du dépôt…" autocomplete="off" spellcheck="false" aria-label="Rechercher" aria-controls="cv-results"></label>
      <ul class="cv-results" id="cv-results" role="listbox"></ul>
      <p class="cv-pal-foot"><kbd>↑</kbd><kbd>↓</kbd> choisir · <kbd>Entrée</kbd> ouvrir · <kbd>Échap</kbd> fermer</p>
    </div>
  </div>
</div>
<noscript><p class="cv-noscript">Le Cerveau a besoin de JavaScript pour dessiner le graphe.</p></noscript>`}
</body>
</html>`;
}
