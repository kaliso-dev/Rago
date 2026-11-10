// Rago admin (/admin), 2026-11-10: small enhancements. Every page and every form works without this file
// (forms post, links navigate, the menu opens with a checkbox); this adds the confirmation dialog, copy buttons,
// notices that fade out, clickable rows and keyboard shortcuts.

const $ = (sel, root = document) => root.querySelector(sel);
const ICON_ALERT = '<svg class="ic" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 2.2l6 10.6a.8.8 0 0 1-.7 1.2H2.7a.8.8 0 0 1-.7-1.2zM8 6.5v3M8 11.6v.1" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const ICON_INFO = '<svg class="ic" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 14.5a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13zM8 7.5v4M8 5v.1" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';

// ---------- confirmation before an action that changes something important ----------
let dialog = null;
function confirmDialog({ text, danger, label }) {
  if (typeof HTMLDialogElement !== 'function') return Promise.resolve(window.confirm(text));
  if (!dialog) {
    dialog = document.createElement('dialog');
    dialog.className = 'dlg';
    dialog.innerHTML = '<form method="dialog"><div class="dlg-b"><span class="tag"></span><div><h2></h2><p></p></div></div>'
      + '<div class="dlg-f"><button class="btn btn-ghost" value="no" type="submit">Annuler</button><button class="btn" value="yes" type="submit" data-ok></button></div></form>';
    document.body.append(dialog);
  }
  dialog.classList.toggle('danger', !!danger);
  $('.tag', dialog).innerHTML = danger ? ICON_ALERT : ICON_INFO;
  $('h2', dialog).textContent = danger ? 'Action irréversible ou sensible' : 'Confirmer';
  $('p', dialog).textContent = text;
  const ok = $('[data-ok]', dialog);
  ok.textContent = label || 'Confirmer';
  ok.className = `btn ${danger ? 'btn-danger' : 'btn-primary'}`;
  return new Promise((resolve) => {
    dialog.returnValue = '';
    dialog.addEventListener('close', () => resolve(dialog.returnValue === 'yes'), { once: true });
    dialog.showModal();
    ok.focus();
  });
}

document.addEventListener('submit', (e) => {
  const form = e.target;
  if (form.method === 'dialog') return;
  if (form.dataset.confirm && !form.dataset.confirmed) {
    e.preventDefault();
    const submitter = e.submitter;
    const danger = form.hasAttribute('data-danger') || !!submitter?.classList.contains('btn-danger');
    confirmDialog({ text: form.dataset.confirm, danger, label: submitter?.textContent.trim() }).then((yes) => {
      if (!yes) return;
      form.dataset.confirmed = '1';
      if (form.requestSubmit) form.requestSubmit(submitter && form.contains(submitter) ? submitter : undefined);
      else form.submit();
    });
    return;
  }
  // Busy state: the button says what is happening and can't be pressed twice.
  const btn = e.submitter || form.querySelector('[type=submit]');
  if (btn && form.method.toLowerCase() === 'post') {
    btn.setAttribute('aria-busy', 'true');
    if (form.dataset.busy) btn.textContent = form.dataset.busy;
    setTimeout(() => { btn.removeAttribute('aria-busy'); delete form.dataset.confirmed; }, 15000);
  }
});

// ---------- copy, password reveal, close buttons, clickable rows ----------
function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
  const ta = Object.assign(document.createElement('textarea'), { value: text, readOnly: true });
  ta.className = 'sr-only';
  document.body.append(ta); ta.select();
  const ok = document.execCommand('copy'); ta.remove();
  return ok ? Promise.resolve() : Promise.reject(new Error('copy failed'));
}
function toast(text) {
  let box = $('.toasts');
  if (!box) { box = Object.assign(document.createElement('div'), { className: 'toasts' }); box.setAttribute('aria-live', 'polite'); document.body.append(box); }
  const t = document.createElement('div');
  t.className = 'toast';
  t.setAttribute('role', 'status');
  t.innerHTML = '<svg class="ic" viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg><p></p>';
  $('p', t).textContent = text;
  box.append(t);
  autoHide(t, 2600);
}
function autoHide(el, ms) {
  let timer = setTimeout(() => hide(el), ms);
  el.addEventListener('mouseenter', () => clearTimeout(timer));
  el.addEventListener('mouseleave', () => { timer = setTimeout(() => hide(el), 2000); });
}
function hide(el) {
  el.classList.add('out');
  setTimeout(() => el.remove(), 220);
}

document.addEventListener('click', (e) => {
  const copy = e.target.closest('[data-copy]');
  if (copy) {
    copyText(copy.dataset.copy).then(() => toast(copy.dataset.copied || 'Copié dans le presse-papiers.'), () => toast('Copie impossible : sélectionne le texte à la main.'));
    return;
  }
  const close = e.target.closest('[data-dismiss]');
  if (close) { hide(close.closest('.toast, .alert')); return; }
  const eye = e.target.closest('[data-reveal]');
  if (eye) {
    const input = eye.parentElement.querySelector('input');
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    eye.textContent = show ? 'Masquer' : 'Afficher';
    eye.setAttribute('aria-pressed', String(show));
    input.focus();
    return;
  }
  // A whole table row opens the player (the first cell holds the real link).
  const row = e.target.closest('tr[data-href]');
  if (row && !e.target.closest('a, button, input, select, textarea, label, form') && !String(window.getSelection())) {
    if (e.ctrlKey || e.metaKey) window.open(row.dataset.href, '_blank', 'noopener');
    else location.href = row.dataset.href;
  }
});

// Filters that apply as soon as they change.
document.addEventListener('change', (e) => {
  if (e.target.matches('[data-autosubmit]')) e.target.form?.requestSubmit?.();
});

// The menu button is a label (the menu opens without this file): Enter and Space work on it too.
document.addEventListener('keydown', (e) => {
  const label = e.target.closest?.('label[for="nav-t"][role="button"]');
  if (label && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); label.click(); }
});

// ---------- keyboard: "/" to search, Escape closes the menu ----------
document.addEventListener('keydown', (e) => {
  const typing = e.target.closest?.('input, textarea, select, [contenteditable]');
  if ((e.key === '/' && !typing) || (e.key.toLowerCase() === 'k' && (e.ctrlKey || e.metaKey))) {
    const search = $('#q-global');
    if (!search) return;
    e.preventDefault();
    const nav = $('#nav-t');
    if (nav && getComputedStyle($('.side')).transform !== 'none' && !nav.checked) nav.checked = true;
    search.focus(); search.select();
  }
  if (e.key === 'Escape') {
    const nav = $('#nav-t');
    if (nav?.checked) nav.checked = false;
    if (typing && e.target.id === 'q-global') e.target.blur();
  }
});

// After a form shown again on the page that sent it (a link shown once, a refused action), the address goes back to
// the page itself, so a reload doesn't post the form again.
{
  const path = document.getElementById('main')?.dataset.path;
  if (path && location.pathname !== path) history.replaceState(null, '', path);
}

// ---------- one-time notices ----------
// Success notices fade out; errors stay. ?n=… (and ?frais=1) leave the address so a reload doesn't show them or read Stripe again.
for (const t of document.querySelectorAll('.toast')) autoHide(t, 7000);
{
  const url = new URL(location.href);
  if (url.searchParams.has('n') || url.searchParams.has('frais')) {
    for (const k of ['n', 'count', 'code', 'frais']) url.searchParams.delete(k);
    history.replaceState(null, '', url.pathname + url.search + url.hash);
  }
}
