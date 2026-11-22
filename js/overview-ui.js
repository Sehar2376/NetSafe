// Overview interface. Renders the privacy-safe summaries from overview.js. All text via textContent (never innerHTML).
(() => {
  const $ = s => document.querySelector(s);
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const list = items => { const ul = el('ul'); items.forEach(t => ul.append(el('li', null, t))); return ul; };
  const PILL = { assessed: ['assessed', 'Assessed'], 'not-assessed': ['na', 'Not assessed'], unavailable: ['unav', 'Information unavailable'] };
  const SEV = ['Low', 'Medium', 'High'];

  function card(m) {
    const c = el('div', 'card ovcard ' + PILL[m.status][0]);
    const head = el('div', 'ovtitle'); head.append(el('h2', null, m.title), el('span', 'pill ' + PILL[m.status][0], PILL[m.status][1])); c.append(head);
    if (m.status === 'not-assessed') {
      c.append(el('p', null, 'Not checked yet. This is not a sign that it is safe.'));
    } else {
      if (m.count > 1) c.append(el('p', 'ovsum', m.count + ' checked this visit. Highest: ' + m.worstText + '.'));
      if (m.status === 'unavailable') c.append(el('p', 'note', 'Information unavailable: ' + m.limitedReasons.join(' ')));
      const ul = el('ul', 'ovitems');
      m.items.slice(0, 5).forEach(i => {
        const li = el('li'); li.append(el('span', 'tag ' + SEV[i.severity], i.levelText), document.createTextNode(' ' + i.label + ': ' + (i.findings.length ? i.findings[0].title : 'no warning signs found')));
        if (i.limited && m.status === 'assessed') li.append(el('small', 'note', ' (limited: ' + i.limitedReason + ')'));
        ul.append(li);
      });
      c.append(ul);
      if (m.count > 5) c.append(el('p', 'note', '+ ' + (m.count - 5) + ' earlier checks not shown.'));
    }
    const a = el('a', 'btn ghost', m.status === 'not-assessed' ? m.cta : 'Check another'); a.href = m.section; c.append(a);
    return c;
  }

  function planItem(p, open) {
    const d = el('details', 'plan'); if (open) d.open = true;
    d.append(el('summary', null, p.label + ' (' + p.levelText + ')'));
    const body = el('div', 'planbody'), dl = el('dl');
    dl.append(el('dt', null, 'What was detected')); const d1 = el('dd'); d1.append(list(p.what)); dl.append(d1);
    if (p.why) dl.append(el('dt', null, 'Why it matters'), el('dd', null, p.why));
    if (p.could) dl.append(el('dt', null, 'What could happen'), el('dd', null, p.could));
    dl.append(el('dt', null, 'Do this now')); const d2 = el('dd'); d2.append(list(p.now)); dl.append(d2);
    if (p.ifAlready.length) { dl.append(el('dt', null, 'If you already responded')); const d3 = el('dd'); d3.append(list(p.ifAlready)); dl.append(d3); }
    if (p.future.length) { dl.append(el('dt', null, 'Avoid it next time')); const d4 = el('dd'); d4.append(list(p.future)); dl.append(d4); }
    body.append(dl); if (p.limitedReason) body.append(el('p', 'note', 'Limited result: ' + p.limitedReason)); d.append(body);
    return d;
  }

  function render() {
    const m = NetSafeOverview.build();
    const h = $('#ovHead'); h.textContent = '';
    const bar = el('div', 'ovbar ' + m.headline.tone); bar.append(el('b', null, m.headline.text));
    const cov = m.coverage;
    bar.append(el('span', 'ovcov', 'Assessed: ' + cov.assessed + ' of ' + cov.total + (cov.unavailable ? ' | Information unavailable: ' + cov.unavailable : '') + ' | Not assessed: ' + cov.notAssessed));
    h.append(bar);
    const g = $('#ovGrid'); g.textContent = ''; m.modules.forEach(x => g.append(card(x)));
    const w = $('#ovWarn'); w.textContent = '';
    if (m.warnings.length) { const c = el('div', 'card ovwarn'); c.append(el('h2', null, 'Important warnings')); const ul = el('ul'); m.warnings.forEach(x => ul.append(el('li', null, x.label + ': ' + x.text + '.'))); c.append(ul); w.append(c); }
    const pl = $('#ovPlan'); pl.textContent = '';
    if (m.hasResults) {
      const c = el('div', 'card'); c.append(el('h2', null, 'What to do next'), el('p', 'note', 'Based only on the checks you completed, most urgent first.'));
      if (m.plan.length) m.plan.forEach((p, i) => c.append(planItem(p, i === 0)));
      else c.append(el('p', null, 'No action needed from the checks you completed. This is not a guarantee, and checks you have not done are not counted as safe.'));
      pl.append(c);
    }
    const n = $('#ovNotes'); n.textContent = ''; m.notes.forEach(t => n.append(el('li', null, t)));
  }
  // Report: built locally from the privacy-safe summaries and saved by the browser. Nothing is uploaded.
  const rep = $('#ovReport'), prt = $('#ovPrint');
  const sync = () => { const has = NetSafeOverview.build().hasResults; rep.disabled = !has; prt.disabled = !has; const t = has ? '' : 'Run a check first'; rep.title = t; prt.title = t; };
  rep.addEventListener('click', () => {
    const text = NetSafeOverview.report(NetSafeOverview.build(), new Date());
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = 'netsafe-report-' + new Date().toISOString().slice(0, 10) + '.txt';
    document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  prt.addEventListener('click', () => window.print());
  window.addEventListener('beforeprint', () => document.querySelectorAll('details.plan').forEach(d => { d.open = true; }));
  NetSafeOverview.subscribe(sync);
  NetSafeOverview.subscribe(render);
  $('#ovClear').addEventListener('click', () => NetSafeOverview.clear());
  render(); sync();
})();
