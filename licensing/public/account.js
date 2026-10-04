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
      label.textContent = 'Copied';
      setTimeout(() => (label.textContent = 'Copy'), 1600);
    });
  }

  const dl = e.target.closest('[data-download]');
  if (dl) {
    const ring = document.createElement('span');
    ring.className = 'ring';
    dl.append(ring);
    setTimeout(() => ring.remove(), 700);
    dl.querySelector('span').textContent = 'Downloading…';
    setTimeout(() => (dl.querySelector('span').textContent = 'Download Rago Hub'), 4000);
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
