// Small progressive enhancements. Every page works without this file.

function isWindows() {
  const p = navigator.userAgentData?.platform || navigator.platform || '';
  return /win/i.test(p) || /Windows NT/.test(navigator.userAgent);
}

// Clipboard, with a fallback for browsers that block the async API.
function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
  const ta = Object.assign(document.createElement('textarea'), { value: text, readOnly: true });
  ta.className = 'sr-only';
  document.body.append(ta); ta.select();
  const ok = document.execCommand('copy'); ta.remove();
  return ok ? Promise.resolve() : Promise.reject(new Error('copy failed'));
}

// Screen readers hear "Copied" without moving focus.
function announce(text) {
  let live = document.getElementById('live');
  if (!live) { live = Object.assign(document.createElement('div'), { id: 'live', className: 'sr-only' }); live.setAttribute('aria-live', 'polite'); document.body.append(live); }
  live.textContent = ''; setTimeout(() => (live.textContent = text), 50);
}
// Show / hide password
document.addEventListener('click', (e) => {
  const eye = e.target.closest('[data-reveal]');
  if (eye) {
    const input = eye.parentElement.querySelector('input');
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    input.toggleAttribute('data-revealed', show);
    eye.textContent = show ? 'Hide' : 'Show';
    eye.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
    eye.setAttribute('aria-pressed', String(show));
  }

  const reveal = e.target.closest('[data-reveal-key]');
  if (reveal) {
    const code = reveal.closest('.key').querySelector('code');
    const showing = code.textContent === code.dataset.key;
    code.classList.add('flip');
    setTimeout(() => { code.textContent = showing ? code.dataset.masked : code.dataset.key; code.classList.remove('flip'); }, 120);
    reveal.textContent = showing ? 'Show' : 'Hide';
  }

  const copy = e.target.closest('[data-copy]');
  if (copy) {
    copyText(copy.dataset.copy).then(() => {
      announce('Copied');
      const label = copy.querySelector('span');
      copy.dataset.label ||= label.textContent;
      label.textContent = 'Copied';
      copy.classList.remove('copied'); void copy.offsetWidth; copy.classList.add('copied');
      setTimeout(() => (label.textContent = copy.dataset.label), 1600);
    });
  }

  const dl = e.target.closest('[data-download]');
  // On a phone or a Mac, explain first: the installer only runs on Windows. A second click downloads anyway.
  if (dl && !isWindows() && !dl.dataset.confirmed) {
    e.preventDefault();
    dl.dataset.confirmed = '1';
    if (!dl.parentElement.querySelector('.notwin')) {
      const note = document.createElement('p');
      note.className = 'notwin';
      note.setAttribute('role', 'status');
      note.textContent = 'Rago Optimizer runs on Windows 10 and 11. Open this page on your Windows PC to download it, or tap the button again to download it here anyway.';
      dl.insertAdjacentElement('afterend', note);
    }
    return;
  }
  if (dl) {
    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    dl.append(ripple);
    setTimeout(() => ripple.remove(), 750);
    const label = dl.querySelector('span');
    dl.dataset.label ||= label.textContent;
    label.textContent = 'Downloading…';
    setTimeout(() => (label.textContent = dl.dataset.label), 4000);
  }
});

// Busy state on submit, and confirmation for destructive forms
document.addEventListener('submit', (e) => {
  const form = e.target;
  if (form.dataset.confirm && !confirm(form.dataset.confirm)) { e.preventDefault(); return; }
  const btn = form.querySelector('[type=submit]');
  if (btn && form.dataset.busy) {
    btn.setAttribute('aria-busy', 'true');
    btn.textContent = form.dataset.busy;
  }
});

// Numbers count up when the page opens (affiliate progress). Kept with reduced motion: nothing moves.
{
  for (const el of document.querySelectorAll('[data-count]')) {
    const to = Number(el.dataset.count);
    if (!to) continue;
    const t0 = performance.now() + 300;
    const tick = (now) => {
      const p = Math.min(1, Math.max(0, (now - t0) / 1400));
      el.textContent = String(Math.round(to * (1 - Math.pow(1 - p, 4))));
      if (p < 1) requestAnimationFrame(tick);
    };
    el.textContent = '0';
    requestAnimationFrame(tick);
  }
}

// Referral code field: uppercase as you type
for (const input of document.querySelectorAll('input[name=code]')) {
  input.addEventListener('input', () => {
    const pos = input.selectionStart;
    input.value = input.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    input.setSelectionRange(pos, pos);
  });
}

// One-time notices (?n=claimed, ?n=out…): drop them from the address so a reload doesn't show them again.
{
  const url = new URL(location.href);
  if (url.searchParams.has('n')) {
    url.searchParams.delete('n');
    history.replaceState(null, '', url.pathname + url.search + url.hash);
  }
}

// Profile photo: show the chosen file's name, and preview the picture before it's uploaded (the server crops it the same way).
for (const drop of document.querySelectorAll('[data-file-drop]')) {
  const input = drop.querySelector('input[type=file]');
  const name = drop.querySelector('[data-file-name]');
  const empty = name.textContent;
  input.addEventListener('change', () => {
    const file = input.files && input.files[0];
    name.textContent = file ? file.name : empty;
    drop.classList.toggle('chosen', !!file);
  });
  for (const e of ['dragenter', 'dragover']) input.addEventListener(e, () => drop.classList.add('drag'));
  for (const e of ['dragleave', 'drop']) input.addEventListener(e, () => drop.classList.remove('drag'));
}
for (const input of document.querySelectorAll('[data-avatar-input]')) {
  input.addEventListener('change', () => {
    const file = input.files && input.files[0];
    const box = document.querySelector('[data-avatar-preview]');
    if (!file || !box || !/^image\/(jpeg|png|webp|gif)$/.test(file.type) || file.size > 5 * 1024 * 1024) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = Object.assign(document.createElement('img'), { className: 'avatar avatar-lg', alt: '', width: 96, height: 96, src: String(reader.result) });
      box.replaceChildren(img);
    };
    reader.readAsDataURL(file);
  });
}

// Review form (/account/review): what the rating means, characters left, and the preview of the card players
// see on the site, updated as the player types. The server checks everything again.
for (const form of document.querySelectorAll('[data-review-form]')) {
  const word = form.querySelector('[data-rate-word]');
  const text = form.querySelector('textarea[name=comment]');
  const counter = form.querySelector('[data-counter]');
  const name = form.querySelector('input[name=name]');
  const card = document.querySelector('[data-review-preview]');
  const picked = () => form.querySelector('input[name=rating]:checked');
  const wordOf = (input) => (input ? form.querySelector(`label[for="${input.id}"]`).dataset.word : word.dataset.empty);
  const first = (s) => ([...s.trim()][0] || '').toUpperCase();
  const fallback = card ? card.querySelector('[data-preview-name]').textContent : '';

  const stars = () => {
    word.textContent = wordOf(picked());
    const n = Number(picked()?.value || 0);
    if (card) card.querySelectorAll('[data-preview-stars] span').forEach((s, i) => s.classList.toggle('on', i < n));
    if (card) card.querySelector('[data-preview-stars]').setAttribute('aria-label', `${n} out of 5 stars`);
  };
  const count = () => {
    const n = text.value.length, max = Number(text.maxLength) || 600;
    counter.textContent = `${n} / ${max}`;
    counter.classList.toggle('near', n >= max - 60 && n < max);
    counter.classList.toggle('full', n >= max);
    if (!card) return;
    const p = card.querySelector('[data-preview-text]');
    const v = text.value.trim();
    p.textContent = v || p.dataset.empty;
    p.classList.toggle('is-empty', !v);
  };
  // Without a photo, the circle shows the first letter of the name being typed, here and on the preview.
  const named = () => {
    const v = name.value.replace(/\s+/g, ' ').trim();
    if (card) card.querySelector('[data-preview-name]').textContent = v || fallback;
    const letter = first(v);
    if (letter) document.querySelectorAll('[data-name-avatar] .avatar-none, [data-preview-avatar] .avatar-none').forEach((a) => { a.textContent = letter; });
  };

  form.addEventListener('change', (e) => { if (e.target.name === 'rating') stars(); });
  for (const label of form.querySelectorAll('.rate label')) {
    label.addEventListener('mouseenter', () => { word.textContent = label.dataset.word; });
    label.addEventListener('mouseleave', () => { word.textContent = wordOf(picked()); });
  }
  text.addEventListener('input', count);
  name.addEventListener('input', named);
  // No stars picked: say so next to them instead of the browser's bubble on a hidden radio.
  form.addEventListener('invalid', (e) => {
    if (e.target.name !== 'rating') return;
    e.preventDefault();
    word.textContent = 'Pick 1 to 5 stars first';
    word.classList.add('missing');
    form.querySelector('input[name=rating]').focus();
  }, true);
  form.addEventListener('change', () => word.classList.remove('missing'));
  stars(); count();
}
