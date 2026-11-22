// Password checker interface. The password is read from the field, analysed in memory and never stored, logged or sent.
// All text is inserted with textContent (never innerHTML).
(() => {
  const $ = s => document.querySelector(s);
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const input = $('#pwin'), out = $('#pwResult'), reuse = $('#pwreuse'), showBtn = $('#pwshow');
  const COLORS = { Weak: 'var(--r)', Fair: 'var(--a)', Good: 'var(--g)', Strong: 'var(--g)' };
  const TAG = { Weak: 'High', Fair: 'Medium', Good: 'Low', Strong: 'Low' };
  const list = items => { const ul = el('ul'); items.forEach(t => ul.append(el('li', null, t))); return ul; };
  const empty = () => { out.textContent = ''; out.append(el('p', 'note empty', 'Type a password to see an estimate.')); };

  function render(r) {
    out.textContent = '';
    const bar = el('div', 'pwbar'), fill = el('i'); fill.style.width = Math.max(r.score, 4) + '%'; fill.style.background = COLORS[r.category]; bar.append(fill);
    bar.setAttribute('role', 'img'); bar.setAttribute('aria-label', 'Strength estimate: ' + r.category);
    out.append(bar, el('div', 'tag ' + TAG[r.category], r.category + ' (estimate only)'), el('p', 'brief ' + TAG[r.category], r.summary));
    if (r.reuse) { const t = el('div', 'todo'); t.append(el('b', null, 'Reuse risk: '), document.createTextNode('If this password is used on other accounts, a breach of any one of them exposes all of them, however strong it is. Use a different password for each account.')); out.append(t); }
    if (r.issues.length) {
      out.append(el('h2', null, 'What is weakening it'));
      r.issues.forEach(i => { const box = el('div', 'finding' + (i.pts >= 30 ? ' strong' : '')); box.append(el('h3', null, i.title)); const dl = el('dl'); dl.append(el('dt', null, 'Why it matters'), el('dd', null, i.why), el('dt', null, 'How to fix'), el('dd', null, i.fix)); box.append(dl); out.append(box); });
    }
    if (r.positives.length) out.append(el('h2', null, 'What is helping'), list(r.positives));
    out.append(el('h2', null, 'Next steps'), list(r.tips.concat(['Turn on multi-factor authentication wherever it is offered.'])));
    out.append(el('p', 'note', 'This is a rough estimate, not a prediction of how long cracking would take. It cannot tell whether this password has already leaked in a data breach, so never reuse a password. NetSafe does not check breach lists because that would mean sending your password to another service.'));
  }
  const run = () => { if (!input.value) { empty(); return; } render(analyzePassword(input.value, { reused: reuse.checked })); };
  // The overview is updated when the person finishes typing (field loses focus), so a half-typed password is never reported.
  const sync = () => { if (input.value) NetSafeOverview.record('password', analyzePassword(input.value, { reused: reuse.checked })); else NetSafeOverview.remove('password'); };
  input.addEventListener('input', run); input.addEventListener('change', sync); reuse.addEventListener('change', () => { run(); sync(); });
  showBtn.addEventListener('click', () => { const show = input.type === 'password'; input.type = show ? 'text' : 'password'; showBtn.textContent = show ? 'Hide' : 'Show'; showBtn.setAttribute('aria-pressed', String(show)); });
})();
