/* NetSafe overview. Pure logic: no DOM, no network, no browser storage.
   It keeps only a privacy-safe SUMMARY of each assessment, in memory, for this page visit. It never keeps passwords, message text,
   matched phrases, senders, full links or network names. There is deliberately NO combined score: the checks measure different things.
   Statuses: "assessed" (a result exists), "not-assessed" (nothing done yet: NOT a sign of safety), "unavailable" (checked, but a key detail was unknown). */
const OV_MODULES = [
  { id: 'link', title: 'Website links', section: '#link', cta: 'Check a link' },
  { id: 'message', title: 'Messages', section: '#message', cta: 'Check a message' },
  { id: 'password', title: 'Password', section: '#password', cta: 'Check a password' },
  { id: 'wifi', title: 'Wi-Fi', section: '#wifi', cta: 'Assess a network' }
];
const OV_SEV = { Low: 0, Medium: 1, High: 2 }, OV_MAX = 8;
const OV_URGENCY = { message: 0, link: 1, wifi: 2, password: 3 };   // tie-break at equal severity: things you may act on right now come first
const OV_CHANNEL = { sms: 'SMS', whatsapp: 'WhatsApp', email: 'email', other: 'other' };
const OV_NOTES = [
  'There is no overall safety score. A link, a message, a password and a network measure different things, so combining them would be misleading.',
  '"Not assessed" means nothing was checked. It does not mean safe.',
  'Results come only from what you entered, and each check has its own limits.',
  'Summaries stay in this tab only. They are never saved, and disappear when you close or reload the page.'
];
let OV_STATE = Object.fromEntries(OV_MODULES.map(m => [m.id, []]));
const OV_LISTENERS = [];
const ovClean = t => String(t).replace(/\s*\([^)]*\)/g, '').trim();   // drops parentheses, which can hold lengths or quoted words
const ovFindings = fs => (fs || []).map(f => ({ title: ovClean(f.title), why: f.why || '', could: f.could || '', action: f.action || '', pts: f.pts || 0 })).sort((a, b) => b.pts - a.pts);
const ovNow = () => Date.now();

// Adapters: copy ONLY generic, rule-written text. Never `found`, `phrases`, `text`, `segments`, `links`, `sender` or raw input.
function ovFromLink(r) {
  if (!r || !r.ok) return null;
  return { module: 'link', label: r.domain ? 'Link to ' + r.domain : 'Web link', severity: OV_SEV[r.level], levelText: r.level + ' warning level', findings: ovFindings(r.findings),
    prevent: r.prevent || [], ifAlready: r.ifAlready || [], limited: !!r.schemeMissing, limitedReason: r.schemeMissing ? 'The link had no http:// or https://, so encryption could not be judged.' : '' };
}
function ovFromMessage(r) {
  if (!r || !r.ok) return null;
  return { module: 'message', label: r.channel ? 'Message (' + OV_CHANNEL[r.channel] + ')' : 'Message', severity: OV_SEV[r.level], levelText: r.level + ' scam warning level', findings: ovFindings(r.findings),
    prevent: r.prevent || [], ifAlready: r.ifAlready || [], limited: false, limitedReason: '' };
}
function ovFromPassword(r) {
  if (!r || !r.category) return null;
  let severity = { Weak: 2, Fair: 1, Good: 0, Strong: 0 }[r.category], levelText = r.category;
  const fs = ovFindings((r.issues || []).map(i => ({ title: i.title, why: i.why, could: 'Someone could guess the password and sign in as you.', action: i.fix, pts: i.pts })));
  const prevent = [], ifAlready = [];
  if (r.reuse) {
    fs.unshift({ title: 'Password reused on other accounts', why: 'A breach of any one account exposes every account that uses the same password.', could: 'Attackers try leaked passwords on other sites, so one leak can open many accounts.',
      action: 'Use a different password for every account, starting with your email and bank.', pts: 40 });
    severity = Math.max(severity, 1); levelText += ', reused';
    prevent.push('Use a password manager so every account can have its own password.', 'Turn on multi-factor authentication, starting with email and banking.');
  } else if (severity >= 1) prevent.push('Use a long passphrase of 4 or more unrelated words, or a password manager.', 'Turn on multi-factor authentication wherever it is offered.');
  if (severity >= 1) ifAlready.push('If you already use this password for a real account, change it now.');
  return { module: 'password', label: 'The password you tested', severity, levelText, findings: fs, prevent, ifAlready, limited: false, limitedReason: '' };
}
function ovFromWifi(r) {
  if (!r || !r.ok) return null;
  return { module: 'wifi', label: r.summaryLabel, severity: OV_SEV[r.level], levelText: r.level + ' risk', findings: ovFindings(r.findings),
    prevent: r.prevent || [], ifAlready: [], limited: !!r.limited, limitedReason: r.limitedReason || '' };
}
const OV_ADAPT = { link: ovFromLink, message: ovFromMessage, password: ovFromPassword, wifi: ovFromWifi };
const ovNotify = () => OV_LISTENERS.slice().forEach(fn => { try { fn(); } catch (e) { /* a faulty listener must not break recording */ } });

function ovRecord(moduleId, result) {
  const adapt = OV_ADAPT[moduleId];
  if (!adapt) return false;
  const item = adapt(result);
  if (!item) return false;
  item.at = ovNow();
  OV_STATE[moduleId] = (moduleId === 'link' || moduleId === 'message') ? [item].concat(OV_STATE[moduleId]).slice(0, OV_MAX) : [item];
  ovNotify(); return true;
}
function ovRemove(moduleId) { if (OV_STATE[moduleId] && OV_STATE[moduleId].length) { OV_STATE[moduleId] = []; ovNotify(); } }
function ovClear() { OV_STATE = Object.fromEntries(OV_MODULES.map(m => [m.id, []])); ovNotify(); }
function ovSubscribe(fn) { OV_LISTENERS.push(fn); return () => { const i = OV_LISTENERS.indexOf(fn); if (i >= 0) OV_LISTENERS.splice(i, 1); }; }

function ovBuild() {
  const modules = OV_MODULES.map(m => {
    const items = OV_STATE[m.id];
    const status = !items.length ? 'not-assessed' : items.every(i => i.limited) ? 'unavailable' : 'assessed';
    const top = items.slice().sort((a, b) => b.severity - a.severity || b.at - a.at)[0] || null;
    return { ...m, status, items, count: items.length, worst: top ? top.severity : null, worstText: top ? top.levelText : '', limitedReasons: [...new Set(items.filter(i => i.limited).map(i => i.limitedReason))] };
  });
  const all = modules.flatMap(m => m.items.map(i => ({ ...i, moduleTitle: m.title })));
  const byUrgency = (a, b) => b.severity - a.severity || OV_URGENCY[a.module] - OV_URGENCY[b.module] || b.at - a.at;
  const coverage = { total: modules.length, assessed: modules.filter(m => m.status === 'assessed').length, unavailable: modules.filter(m => m.status === 'unavailable').length, notAssessed: modules.filter(m => m.status === 'not-assessed').length };
  const high = all.filter(i => i.severity === 2).length, med = all.filter(i => i.severity === 1).length;
  const unchecked = modules.filter(m => m.status !== 'assessed').map(m => m.title);
  let tone, text;
  if (!all.length) { tone = 'none'; text = 'Nothing checked yet. Choose a check below. Areas you have not checked are not counted as safe.'; }
  else if (high) { tone = 'High'; text = 'Attention needed: ' + high + ' high-level result' + (high > 1 ? 's' : '') + '. See "What to do next".'; }
  else if (med) { tone = 'Medium'; text = 'Some caution is advised: ' + med + ' medium-level result' + (med > 1 ? 's' : '') + '. See "What to do next".'; }
  else { tone = 'Low'; text = 'No warnings in the checks you completed. This is not a guarantee.'; }
  const warnings = all.filter(i => i.severity === 2).sort(byUrgency).map(i => ({ module: i.moduleTitle, label: i.label, text: i.findings.length ? i.findings[0].title : i.levelText, levelText: i.levelText }));
  const plan = all.filter(i => i.severity >= 1).sort(byUrgency).map(i => {
    const fs = i.findings.slice(0, 3), now = [...new Set(fs.map(f => f.action).filter(Boolean))];
    return { module: i.moduleTitle, label: i.label, levelText: i.levelText, severity: i.severity, what: fs.map(f => f.title), why: fs[0] ? fs[0].why : '', could: fs[0] ? fs[0].could : '',
      now, ifAlready: i.ifAlready, future: i.prevent.slice(0, 3), limitedReason: i.limited ? i.limitedReason : '' };
  });
  return { modules, coverage, headline: { tone, text }, unchecked, warnings, plan, notes: OV_NOTES, hasResults: all.length > 0 };
}

// Plain-text report built ONLY from the privacy-safe model (no raw input exists here to leak). `when` is a Date, passed in so tests are deterministic.
function ovReport(model, when) {
  const m = model || ovBuild(), L = [], bullets = (arr, ind) => arr.forEach(t => L.push(ind + '- ' + t));
  const stamp = new Date(when || ovNow()).toISOString().slice(0, 16).replace('T', ' ') + ' UTC';
  const NAME = { assessed: 'Assessed', 'not-assessed': 'Not assessed', unavailable: 'Information unavailable' };
  L.push('NETSAFE SECURITY OVERVIEW', 'Generated: ' + stamp, 'NetSafe is an educational, rule-based tool. This report is not a guarantee of safety.', '');
  L.push('SUMMARY', m.headline.text, 'Assessed: ' + m.coverage.assessed + ' of ' + m.coverage.total + ' | Information unavailable: ' + m.coverage.unavailable + ' | Not assessed: ' + m.coverage.notAssessed,
    'There is no overall score: the checks measure different things. "Not assessed" means nothing was checked. It does not mean safe.', '');
  L.push('RESULTS BY CHECK');
  m.modules.forEach((mod, i) => {
    L.push((i + 1) + '. ' + mod.title + ': ' + NAME[mod.status]);
    if (mod.status === 'not-assessed') L.push('   Not checked. No information.');
    mod.items.forEach(it => L.push('   - ' + it.label + ': ' + it.levelText + '. ' + (it.findings.length ? it.findings[0].title : 'No warning signs found') + '.' + (it.limited ? ' (Limited: ' + it.limitedReason + ')' : '')));
  });
  L.push('', 'WHAT TO DO NEXT');
  if (!m.hasResults) L.push('Nothing has been checked yet.');
  else if (!m.plan.length) L.push('No action needed from the checks completed. This is not a guarantee, and checks not done are not counted as safe.');
  m.plan.forEach((p, i) => {
    L.push((i + 1) + '. ' + p.label + ' (' + p.levelText + ')', '   Detected: ' + p.what.join('; ') + '.');
    if (p.why) L.push('   Why it matters: ' + p.why);
    if (p.could) L.push('   What could happen: ' + p.could);
    L.push('   Do this now:'); bullets(p.now, '     ');
    if (p.ifAlready.length) { L.push('   If you already responded:'); bullets(p.ifAlready, '     '); }
    if (p.future.length) { L.push('   Avoid it next time:'); bullets(p.future, '     '); }
    if (p.limitedReason) L.push('   Limited result: ' + p.limitedReason);
  });
  L.push('', 'NOTES AND LIMITS'); bullets(m.notes, '');
  L.push('', 'PRIVACY', 'This report holds only summaries written by NetSafe\'s rules. It does not contain passwords, message text, full links or network names. NetSafe never sent it anywhere.', '');
  return L.join('\n');
}

const NetSafeOverview = { OV_MODULES, report: ovReport, record: ovRecord, remove: ovRemove, clear: ovClear, subscribe: ovSubscribe, build: ovBuild, _state: () => OV_STATE };
if (typeof module !== 'undefined') module.exports = NetSafeOverview;
