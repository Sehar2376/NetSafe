const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const form = $('#form');

// Education cards
$('#edu').innerHTML = EDU.map(([t, d]) => `<div class="card"><b>${esc(t)}</b><p>${esc(d)}</p></div>`).join('');

// Show the sharing question only when a password is used
form.addEventListener('change', () => { $('#sharingBox').hidden = form.password.value !== 'yes'; });
$('#reset').addEventListener('click', () => setTimeout(() => { $('#sharingBox').hidden = true; $('#errors').hidden = true; $('#result').innerHTML = ''; }));

form.addEventListener('submit', e => {
  e.preventDefault();
  const d = Object.fromEntries(new FormData(form));
  d.ssid = (d.ssid || '').trim();
  if (d.password !== 'yes') d.sharing = '';
  const r = NetSafeRules.assess(d);
  const box = $('#errors');
  if (!r.ok) { box.hidden = false; box.innerHTML = '<b>Please fix:</b><ul>' + r.errors.map(x => `<li>${esc(x)}</li>`).join('') + '</ul>'; $('#result').innerHTML = ''; return; }
  box.hidden = true;
  const li = a => a.map(x => `<li>${esc(x)}</li>`).join('');
  const brief = { High: 'High risk: avoid sensitive logins on this network.', Medium: 'Medium risk: connect only with extra precautions.', Low: 'Lower risk, not risk-free: keep HTTPS and updates on.' }[r.level];
  $('#result').innerHTML = `<div class="card"><div class="score"><div class="badge ${r.level}">${r.score}</div>
   <div><div class="tag ${r.level}">${r.level} Risk</div><div>${esc(d.ssid)}</div><small>Educational estimate (0-100). Not a guarantee of safety.</small></div></div>
   <p class="brief ${r.level}" id="brief">${esc(brief)}</p><div class="meter" aria-hidden="true"><i id="mtr" class="${r.level}"></i><u id="m1"></u><u id="m2"></u></div>
   ${r.floorNote ? `<p class="note">${esc(r.floorNote)}</p>` : ''}
   <h3>Why this score</h3>${r.factors.map(f => `<div class="fac"><span>${esc(f.label)}</span><span>+${f.pts}</span><small>${esc(f.why)}</small></div>`).join('')}
   <h3>Concerns</h3><ul>${li(r.concerns) || '<li>No major concerns from the details given.</li>'}</ul>
   <h3>Recommended actions</h3><ul>${li(r.recs)}</ul>
   <h3>Limitations</h3><ul>${li(r.limitations)}</ul></div>`;
  // Results are already fully visible; only the one-line briefing types in. Meter is set via CSSOM (CSP blocks inline styles).
  const T = NetSafeRules.CONFIG.thresholds;
  $('#mtr').style.width = r.score + '%'; $('#m1').style.left = T.medium + '%'; $('#m2').style.left = T.high + '%';
  NSType.type($('#brief'), brief);
  $('#result').scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
});

// Caesar cipher lab (classical, educational only) - logic lives in tools.js
const shift = () => { const k = Number($('#cshift').value); return Number.isInteger(k) && k >= 1 && k <= 25 ? k : null; };
const out = t => { $('#cout').textContent = t; };
$('#enc').onclick = () => { const k = shift(); out(k ? caesar($('#ctext').value, k) : 'Shift must be a whole number from 1 to 25.'); };
$('#dec').onclick = () => { const k = shift(); out(k ? caesar($('#ctext').value, -k) : 'Shift must be a whole number from 1 to 25.'); };
$('#brute').onclick = () => { const t = $('#ctext').value; out(Array.from({ length: 25 }, (_, i) => `Shift ${String(i + 1).padStart(2)}: ${caesar(t, -(i + 1))}`).join('\n') + '\n\nOne line is readable: the attacker finds it instantly.'); };

// Password strength: evaluated locally; the value is never stored or sent
$('#pwin').addEventListener('input', e => {
  const r = pwStrength(e.target.value);
  if (!r.category) { $('#pwout').textContent = 'Type to see an estimate.'; $('#pwbar').style.width = 0; return; }
  $('#pwbar').style.width = r.score + '%'; $('#pwbar').style.background = r.score < 35 ? 'var(--r)' : r.score < 60 ? 'var(--a)' : 'var(--g)';
  $('#pwout').textContent = `${r.category} (estimate only).` + (r.tips.length ? ' Tips: ' + r.tips.join('; ') + '.' : '');
});
