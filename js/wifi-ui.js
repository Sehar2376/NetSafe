// Wi-Fi assessment interface. All text is inserted with textContent (never innerHTML). Nothing is scanned, stored or sent.
(() => {
  const $ = s => document.querySelector(s);
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const form = $('#form'), out = $('#result'), box = $('#errors');
  const BRIEF = { High: 'High risk: avoid sensitive logins on this network.', Medium: 'Medium risk: fine for casual use, take precautions for anything sensitive.', Low: 'Lower risk, not risk-free: keep HTTPS and updates on.' };
  const list = items => { const ul = el('ul'); items.forEach(t => ul.append(el('li', null, t))); return ul; };

  form.addEventListener('change', () => { $('#sharingBox').hidden = form.password.value !== 'yes'; });
  $('#reset').addEventListener('click', () => setTimeout(() => { $('#sharingBox').hidden = true; box.hidden = true; out.textContent = ''; }));

  function render(r, ssid) {
    out.textContent = '';
    const card = el('div', 'card');
    const head = el('div', 'score'), info = el('div');
    head.append(el('div', 'badge ' + r.level, String(r.score)), info);
    info.append(el('div', 'tag ' + r.level, r.level + ' Risk'), el('div', null, ssid), el('small', null, 'Educational estimate (0-100) based only on the answers you gave. Not a guarantee of safety.'));
    card.append(head, el('p', 'brief ' + r.level, BRIEF[r.level]));
    const meter = el('div', 'meter'); meter.setAttribute('aria-hidden', 'true');
    const fill = el('i', r.level), m1 = el('u'), m2 = el('u'); meter.append(fill, m1, m2); card.append(meter);
    const T = NetSafeRules.CONFIG.thresholds; fill.style.width = r.score + '%'; m1.style.left = T.medium + '%'; m2.style.left = T.high + '%';
    if (r.floorNote) card.append(el('p', 'note', r.floorNote));
    if (r.contextNote) card.append(el('p', 'note', r.contextNote));
    const todo = el('div', 'todo'); todo.append(el('b', null, 'What is reasonable here: '), document.createTextNode(r.guidance)); card.append(todo);
    card.append(el('h2', null, r.findings.length ? 'What we found (' + r.findings.length + ')' : 'What we found'));
    if (!r.findings.length) card.append(el('p', null, 'No concerns from the details given. See the limits below.'));
    r.findings.forEach(f => {
      const b = el('div', 'finding' + (f.pts >= 30 ? ' strong' : '')); b.append(el('h3', null, f.title));
      const dl = el('dl');
      [['What we noticed', f.found], ['Why it matters', f.why], ['What could happen', f.could], ['What to do', f.action]].forEach(([k, v]) => dl.append(el('dt', null, k), el('dd', null, v)));
      b.append(dl); card.append(b);
    });
    if (r.positives.length) card.append(el('h2', null, 'What is helping'), list(r.positives));
    card.append(el('h2', null, 'How the score was built'));
    r.factors.forEach(f => { const row = el('div', 'fac'); row.append(el('span', null, f.label), el('span', null, '+' + f.pts), el('small', null, f.why)); card.append(row); });
    card.append(el('h2', null, 'Recommended actions'), list(r.recs), el('h2', null, 'What NetSafe did not check'), list(r.notChecked), el('h2', null, 'Limitations'), list(r.limitations));
    out.append(card);
  }

  form.addEventListener('submit', e => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(form));
    d.ssid = (d.ssid || '').trim();
    if (d.password !== 'yes') d.sharing = '';
    const r = NetSafeRules.assess(d);
    if (!r.ok) {
      box.hidden = false; box.textContent = ''; box.append(el('b', null, 'Please fix:'));
      const ul = el('ul'); r.errors.forEach(x => ul.append(el('li', null, x))); box.append(ul); out.textContent = ''; return;
    }
    box.hidden = true; render(r, d.ssid); NetSafeOverview.record('wifi', r);
    out.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  });
})();
