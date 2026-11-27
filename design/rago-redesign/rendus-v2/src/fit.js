// Ajuste la taille des grands titres d'affiche pour qu'ils remplissent la largeur
document.fonts.ready.then(() => document.querySelectorAll('[data-fit]').forEach(el => {
  const max = +el.dataset.fit || 200, box = el.parentElement.clientWidth - (+el.dataset.pad || 0);
  el.style.whiteSpace = 'nowrap'; el.style.display = 'inline-block'; el.style.fontSize = '100px';
  el.style.fontSize = Math.min(max, 100 * box / el.scrollWidth) + 'px'; el.style.display = 'block';
  document.body.dataset.fitted = '1';
}));
