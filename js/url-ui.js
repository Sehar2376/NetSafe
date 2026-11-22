// URL analyzer interface. All text is inserted with textContent (never innerHTML), so pasted links cannot inject markup.
(() => {
  const $ = s => document.querySelector(s);
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const EXAMPLES = [
    ['Normal site', 'https://example.com/account'],
    ['Fake brand', 'http://paypal.com.secure-login.example/verify'],
    ['Numbers only', 'http://203.0.113.10/bank/login'],
    ['Tricky @', 'https://paypal.com@account-check.example/'],
    ['Look-alike letters', 'https://xn--pypal-4ve.example'],
    ['Short link', 'https://bit.ly/3AbCdEf']
  ];
  const input = $('#urlIn'), out = $('#urlResult'), err = $('#urlErr');
  EXAMPLES.forEach(([label, url]) => { const b = el('button', 'chip', label); b.type = 'button'; b.addEventListener('click', () => { input.value = url; run(); }); $('#urlExamples').append(b); });

  function list(items) { const ul = el('ul'); items.forEach(t => ul.append(el('li', null, t))); return ul; }
  function render(r) {
    out.textContent = '';
    const card = el('div', 'card');
    const head = el('div', 'score');
    head.append(el('div', 'tag ' + r.level, r.level + ' warning level'));
    card.append(head, el('p', 'brief ' + r.level, r.summary));
    if (r.parts) {
      card.append(el('h2', null, 'How this link is built'));
      const box = el('div', 'urlparts'); box.setAttribute('aria-label', 'Link broken into parts');
      if (r.parts.scheme) box.append(el('span', 'p-rest', r.parts.scheme + '://'));
      if (r.parts.subdomain) box.append(el('span', 'p-sub', r.parts.subdomain + '.'));
      box.append(el('span', 'p-dom', r.parts.domain));
      if (r.parts.rest) box.append(el('span', 'p-rest', r.parts.rest));
      card.append(box, el('p', 'note', 'The highlighted part is the website the link really goes to (approximate). What comes before it can be chosen by anyone.'));
    }
    r.notes.forEach(n => card.append(el('p', 'note', n)));
    card.append(el('h2', null, r.findings.length ? 'Warning signs found (' + r.findings.length + ')' : 'Warning signs found'));
    if (!r.findings.length) card.append(el('p', null, 'None in the link text. See the limits below.'));
    r.findings.forEach(f => {
      const box = el('div', 'finding' + (f.pts >= 30 ? ' strong' : ''));
      box.append(el('h3', null, f.title));
      const dl = el('dl');
      [['What we noticed', f.found], ['Why it matters', f.why], ['What could happen', f.could], ['What to do', f.action]].forEach(([k, v]) => { dl.append(el('dt', null, k), el('dd', null, v)); });
      box.append(dl); card.append(box);
    });
    if (r.ifAlready.length) card.append(el('h2', null, 'If you already opened it'), list(r.ifAlready));
    card.append(el('h2', null, 'How to avoid this in future'), list(r.prevent));
    card.append(el('h2', null, 'What NetSafe did not check'), list(r.notChecked));
    card.append(el('h2', null, 'Limitations'), list(r.limitations));
    card.append(el('p', 'note', 'NetSafe never opens links. If you are unsure, do not open this one. Contact the sender or organisation through an official website or phone number you already trust.'));
    out.append(card);
  }
  function run() {
    err.hidden = true; err.textContent = '';
    let r;
    try { r = NetSafeUrl.analyzeUrl(input.value); } catch (e) { r = { ok: false, errors: ['NetSafe could not read this link, so it was not checked. Do not open it if you are unsure.'] }; }
    if (!r.ok) { err.hidden = false; err.append(el('b', null, 'Please check: '), document.createTextNode(r.errors.join(' '))); out.textContent = ''; out.append(el('p', 'note empty', 'No link checked yet. Results appear here.')); return; }
    render(r); NetSafeOverview.record('link', r);
    out.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  }
  $('#urlForm').addEventListener('submit', e => { e.preventDefault(); run(); });
  $('#urlClear').addEventListener('click', () => { input.value = ''; err.hidden = true; out.textContent = ''; out.append(el('p', 'note empty', 'No link checked yet. Results appear here.')); input.focus(); });
})();
