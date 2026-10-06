// Small progressive enhancements. Every page works without this file.
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
  }

  const reveal = e.target.closest('[data-reveal-key]');
  if (reveal) {
    const code = reveal.parentElement.querySelector('code');
    const showing = code.textContent === code.dataset.key;
    code.classList.add('flip');
    setTimeout(() => { code.textContent = showing ? code.dataset.masked : code.dataset.key; code.classList.remove('flip'); }, 120);
    reveal.textContent = showing ? 'Show' : 'Hide';
  }

  const copy = e.target.closest('[data-copy]');
  if (copy && navigator.clipboard) {
    navigator.clipboard.writeText(copy.dataset.copy).then(() => {
      const label = copy.querySelector('span');
      copy.dataset.label ||= label.textContent;
      label.textContent = 'Copied';
      copy.classList.remove('copied'); void copy.offsetWidth; copy.classList.add('copied');
      setTimeout(() => (label.textContent = copy.dataset.label), 1600);
    });
  }

  const dl = e.target.closest('[data-download]');
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

// Numbers count up when the page opens (affiliate progress)
if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
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
