// Message analyzer interface. All text is inserted with textContent (never innerHTML); pasted links are shown as plain text, never as links.
(() => {
  const $ = s => document.querySelector(s);
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const EXAMPLES = [
    ['Bank SMS scam', 'HBL Alert: Your account will be blocked within 24 hours. Verify your CNIC and OTP now at http://hbl-verify.example/login'],
    ['Prize scam', 'Congratulations! You have won Rs. 500,000 in the lucky draw. To claim your prize, send Rs. 5,000 processing fee via JazzCash.'],
    ['Family emergency', 'Hi Mum, this is my new number. I am in trouble and my phone broke. Can you transfer money to this account today? Please do not tell Dad.'],
    ['Kidnap threat', 'Your son is with us. Send Rs. 500,000 today or we will hurt him. Do not call the police.'],
    ['Sent by mistake', 'Rs 85,000 has been transferred to your account by mistake. Please send it back immediately to 03001234567.'],
    ['Easy job offer', 'Hello, I am from TikTok HR. Like videos and get paid. Earn Rs 5000 per day from home. A small recharge unlocks VIP tasks.'],
    ['Genuine code notice', 'Your verification code is 482913. It expires in 10 minutes. Never share this code with anyone.'],
    ['Normal message', 'Hi, are we still meeting at 6? I will bring the notes.']
  ];
  const input = $('#msgIn'), out = $('#msgResult'), err = $('#msgErr'), sender = $('#msgSender'), channel = $('#msgChannel');
  const empty = () => { out.textContent = ''; out.append(el('p', 'note empty', 'No message checked yet. Results appear here.')); };
  EXAMPLES.forEach(([label, text]) => { const b = el('button', 'chip', label); b.type = 'button'; b.addEventListener('click', () => { input.value = text; sender.value = ''; channel.value = ''; run(); }); $('#msgExamples').append(b); });
  const list = items => { const ul = el('ul'); items.forEach(t => ul.append(el('li', null, t))); return ul; };

  function render(r) {
    out.textContent = '';
    const card = el('div', 'card');
    card.append(el('div', 'tag ' + r.level, r.level + ' scam warning level'), el('p', 'brief ' + r.level, r.summary));
    if (r.floorNote) card.append(el('p', 'note', r.floorNote));
    if (r.topAction) { const t = el('div', 'todo'); t.append(el('b', null, 'Most important step: '), document.createTextNode(r.topAction)); card.append(t); }
    if (r.findings.length) {
      card.append(el('h2', null, 'Your message, with warning phrases marked'));
      const box = el('div', 'msgbox'); box.setAttribute('role', 'group'); box.setAttribute('aria-label', 'Your message with numbered warning phrases');
      r.segments.forEach(s => {
        if (!s.n.length) { box.append(document.createTextNode(s.text)); return; }
        const m = el('mark', 'hl', s.text); m.append(el('sup', 'hl-n', '[' + s.n.join(',') + ']')); box.append(m);
      });
      card.append(box, el('p', 'note', 'Numbers match the warning signs below. Links in the message are shown as plain text and were not opened.'));
    }
    r.notes.forEach(n => card.append(el('p', 'note', n)));
    card.append(el('h2', null, r.findings.length ? 'Warning signs found (' + r.findings.length + ')' : 'Warning signs found'));
    if (!r.findings.length) card.append(el('p', null, 'None found. See the limits below.'));
    r.findings.forEach((f, i) => {
      const box = el('div', 'finding' + (f.pts >= 30 ? ' strong' : ''));
      box.append(el('h3', null, (i + 1) + '. ' + f.title));
      const dl = el('dl');
      [['What we noticed', f.found], ['Why it matters', f.why], ['What could happen', f.could], ['What to do', f.action]].forEach(([k, v]) => dl.append(el('dt', null, k), el('dd', null, v)));
      box.append(dl); card.append(box);
    });
    if (r.ifAlready.length) card.append(el('h2', null, 'If you already replied or clicked'), list(r.ifAlready));
    if (r.prevent.length) card.append(el('h2', null, 'How to avoid this in future'), list(r.prevent));
    card.append(el('h2', null, 'What NetSafe did not check'), list(r.notChecked), el('h2', null, 'Limitations'), list(r.limitations));
    card.append(el('p', 'note', 'If you are unsure, do not reply, click or pay. Contact the organisation or person through an official website or a phone number you already trust.'));
    out.append(card);
  }
  function run() {
    err.hidden = true; err.textContent = '';
    let r;
    try { r = NetSafeMessage.analyzeMessage(input.value, { sender: sender.value, channel: channel.value }); } catch (e) { r = { ok: false, errors: ['NetSafe could not read this message, so it was not checked. If it asks for money, codes or details, verify it through an official channel.'] }; }
    if (!r.ok) { err.hidden = false; err.append(el('b', null, 'Please check: '), document.createTextNode(r.errors.join(' '))); empty(); return; }
    render(r); NetSafeOverview.record('message', r);
    out.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  }
  $('#msgForm').addEventListener('submit', e => { e.preventDefault(); run(); });
  $('#msgClear').addEventListener('click', () => { input.value = ''; sender.value = ''; channel.value = ''; err.hidden = true; empty(); input.focus(); });
})();
