// Pose les grandes icônes imprimées et ajuste le menu pour les états vides.
document.querySelectorAll('[data-big]').forEach(el => { el.innerHTML = BIG[el.dataset.big]; });
if (document.querySelector('.empty [data-big="games"]')) document.querySelectorAll('.side a').forEach(a => { if (a.querySelector('.t')?.textContent === 'games') { const e = a.querySelector('em'); if (e) e.textContent = '0'; } });
const st = document.createElement('style');
st.textContent = '.gr.off b{color:var(--red)}';
document.head.appendChild(st);
