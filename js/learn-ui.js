// Learn page: the glossary and "How NetSafe decides". The rule tables are generated from the same data the analyzers use,
// so this page cannot drift from what the tools really do. All text is inserted with textContent.
(() => {
  const $ = s => document.querySelector(s);
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

  EDU.forEach(([t, d]) => { const c = el('div', 'card'); c.append(el('b', null, t), el('p', null, d)); $('#edu').append(c); });

  function table(caption, head, rows) {
    const wrap = el('div', 'tablewrap'), t = el('table', 'rules'), cap = el('caption', 'visually-hidden', caption), tr = el('tr');
    head.forEach(h => { const th = el('th', null, h); th.scope = 'col'; tr.append(th); });
    const thead = el('thead'); thead.append(tr); t.append(cap, thead);
    const tb = el('tbody'); rows.forEach(r => { const row = el('tr'); r.forEach(c => row.append(el('td', null, c))); tb.append(row); }); t.append(tb); wrap.append(t); return wrap;
  }
  function block(title, intro, tbl, open) {
    const d = el('details', 'help'); if (open) d.open = true;
    d.append(el('summary', null, title), el('p', 'note', intro), tbl); $('#rules').append(d);
  }
  const q = s => '\u201c' + s + '\u201d';
  const M = NetSafeMessage, U = NetSafeUrl, W = NetSafeRules.CONFIG, P = NetSafePassword;

  block('Scam messages (' + M.MSG_RULES.length + ' rules)',
    'Each rule adds points when a message matches it. ' + M.MSG_CONFIG.thresholds.medium + ' points is Medium and ' + M.MSG_CONFIG.thresholds.high + ' is High. Asking for a code, password or card details always makes it High. The wording below is made up.',
    table('Scam message rules', ['What it looks for', 'Points', 'Example wording'], M.MSG_RULES.map(r => [r.title + (r.floor ? ' (always High)' : ''), String(r.pts), r.examples.map(q).join(', ')])), true);

  block('Website links (' + U.URL_SIGNALS.length + ' signals)',
    'Links are judged by their text only, never opened. ' + U.URL_CONFIG.thresholds.medium + ' points is Medium and ' + U.URL_CONFIG.thresholds.high + ' is High. Example links are made up.',
    table('Link signals', ['Signal', 'Points', 'Example'], U.URL_SIGNALS.map(s => [s.label, String(U.URL_CONFIG.pts[s.key]), s.example.length > 60 ? s.example.slice(0, 57) + '...' : s.example])));

  block('Passwords (' + P.PW_CHECKS.length + ' checks)',
    'Length counts most. Each check below lowers the score, and the weakest ones cap it at Weak. This is an estimate, not a cracking time. Examples are made up.',
    table('Password checks', ['Check', 'Example that triggers it'], P.PW_CHECKS.map(c => [c.label, c.example])));

  const T = W.thresholds, name = k => PROTO_NAME[k];
  const wifi = Object.keys(W.protocol).map(k => [name(k) + ' security', String(W.protocol[k])]).concat([
    ['No password (Enhanced Open: ' + W.noPasswordOwe + ')', String(W.noPassword)], ['Public network (Enterprise: ' + W.publicEnterprise + ')', String(W.publicNetwork)],
    ['Password shared with everyone (only WEP, WPA, WPA2, mixed)', String(W.sharedPassword)], ['Login page after connecting (reported)', String(W.captive.yes)], ['Location: cafe, airport, hotel / other places / home, office', '3 / 2 / 0'], ['Generic "free" name on a public network', String(W.freeName)], ['Factory router name on a private network (PTCL-BB, TP-Link_ ...)', String(W.defaultName)]]);
  block('Wi-Fi networks',
    'Points are added up from your answers. Below ' + T.medium + ' is Low, ' + T.medium + ' to ' + (T.high - 1) + ' is Medium, ' + T.high + ' and above is High. Open, WEP and WPA are always High; an unknown security type is at least Medium, and held at Medium when a password exists.',
    table('Wi-Fi scoring', ['Factor', 'Points'], wifi));
})();
