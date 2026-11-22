// Run: node tests/message.test.js
const assert = require('assert'); const { analyzeMessage } = require('../js/message.js');
const t = (name, text, check, opts) => { check(analyzeMessage(text, opts)); console.log('PASS', name); };
const ids = r => r.findings.map(f => f.id);
const BANK = 'HBL Alert: Your account will be blocked within 24 hours. Verify your CNIC and OTP now at http://hbl-verify.example/login';
t('bank phishing is High with key findings', BANK, r => assert(r.level === 'High' && ['otp', 'banking', 'threat', 'urgency', 'link'].every(i => ids(r).includes(i))));
t('prize + fee scam High', 'Congratulations! You have won Rs. 500,000 in the lucky draw. To claim your prize, send Rs. 5,000 processing fee via JazzCash.', r => assert(r.level === 'High' && ids(r).includes('prize') && ids(r).includes('payment')));
t('family emergency scam High', 'Hi Mum, this is my new number. I am in trouble. Can you transfer money to this account today? Please do not tell Dad.', r => assert(r.level === 'High' && ids(r).includes('new-number') && ids(r).includes('secrecy')));
t('genuine OTP notice stays Low and gets a note', 'Your verification code is 482913. It expires in 10 minutes. Never share this code with anyone.', r => assert(r.level === 'Low' && r.findings.length === 0 && r.notes.some(n => /Never share the code/.test(n))));
t('ordinary chat Low', 'Hi, are we still meeting at 6? I will bring the notes.', r => assert(r.level === 'Low' && r.findings.length === 0));
t('urgent word alone is not enough', 'Urgent: call me asap about the meeting', r => assert(r.level === 'Low' && ids(r).includes('urgency')));
t('"new number" alone is not flagged', 'This is my new number, save it', r => assert(!ids(r).includes('new-number')));
t('asking for OTP forces High', 'Please share your OTP', r => assert(r.level === 'High' && /code, password or private details/.test(r.floorNote)));
t('asking for password forces High', 'Please send your password to confirm', r => assert(r.level === 'High' && ids(r).includes('password')));
t('Roman Urdu OTP + threat', 'Aap ka account band ho jayega foran. Apna OTP bhej dein.', r => assert(r.level === 'High' && ids(r).includes('otp') && ids(r).includes('threat')));
t('gift card / crypto payment', 'Buy gift cards and send the codes', r => assert(ids(r).includes('payment')));
t('link-only message is Low with link finding', 'Check this https://example.com/page.', r => assert(r.level === 'Low' && ids(r).includes('link') && r.links[0].url === 'https://example.com/page'));
t('risky link raises level', 'Pay here: http://203.0.113.10/pay', r => assert(r.level !== 'Low' && r.findings.find(f => f.id === 'link').pts === 40));
t('link is never turned into markup', 'see http://x.example/<script>alert(1)</script>', r => assert(r.segments.every(s => typeof s.text === 'string')));
t('empty rejected', '   ', r => assert(!r.ok));
t('null safe', null, r => assert(!r.ok));
t('too long rejected', 'a'.repeat(5001), r => assert(!r.ok));
t('every finding has all explanation fields', BANK, r => r.findings.forEach(f => assert(f.title && f.found && f.why && f.could && f.action)));
t('findings sorted: always-High rules first, then by weight', BANK, r => assert(r.findings.every((f, i, a) => !i || (a[i - 1].floor ? 1 : 0) > (f.floor ? 1 : 0) || ((a[i - 1].floor ? 1 : 0) === (f.floor ? 1 : 0) && a[i - 1].pts >= f.pts)) && r.findings[0].id === 'otp' && /Never share an OTP/.test(r.topAction)));
t('segments rebuild the original text exactly', BANK, r => assert.strictEqual(r.segments.map(s => s.text).join(''), r.text));
t('highlighted segments carry finding numbers that exist', BANK, r => { const marked = r.segments.filter(s => s.n.length); assert(marked.length >= 4); marked.forEach(s => s.n.forEach(n => assert(n >= 1 && n <= r.findings.length))); });
t('plain text segments have no numbers', 'Hi, share your OTP please, thanks', r => assert(r.segments.some(s => !s.n.length) && r.segments.some(s => s.n.length)));
t('overlapping matches merge, not duplicate', 'Send your OTP immediately', r => assert.strictEqual(r.segments.map(s => s.text).join(''), r.text));
t('limitations say not AI', 'hello', r => assert(r.limitations.some(l => /not artificial intelligence/.test(l))));
t('CRLF normalised', 'share your OTP\r\nnow', r => assert(!/\r/.test(r.text)));
// Sender
t('free email claiming bank', 'Dear customer your bank needs details', r => assert(ids(r).includes('sender-free-email')), { sender: 'hbl.support@gmail.com', channel: 'email' });
t('look-alike sender domain', 'Hello from support', r => assert(ids(r).includes('sender-lookalike')), { sender: 'help@paypal-secure.example' });
t('look-alike spelling in sender domain', 'Your Amazon parcel', r => assert(ids(r).includes('sender-lookalike')), { sender: 'help@amazom.com', channel: 'email' });
t('real brand domain sender not flagged', 'Your PayPal receipt', r => assert(!ids(r).includes('sender-lookalike')), { sender: 'service@paypal.com' });
t('mobile number claiming bank via SMS', 'Your bank card is updated', r => assert(ids(r).includes('sender-number')), { sender: '+92 300 0000000', channel: 'sms' });
t('number not flagged when message not organisational', 'See you at 6', r => assert(!ids(r).includes('sender-number')), { sender: '+92 300 0000000', channel: 'sms' });
t('invalid channel ignored', 'hello', r => assert(r.ok && r.channel === ''), { channel: 'x' });
// Performance / ReDoS guard
const t0 = Date.now(); analyzeMessage(('share ' + 'word '.repeat(4) + 'x ').repeat(600).slice(0, 5000)); analyzeMessage('account ' + 'a '.repeat(2400)); analyzeMessage('!'.repeat(5000));
assert(Date.now() - t0 < 1500, 'slow: ' + (Date.now() - t0) + 'ms'); console.log('PASS performance on adversarial input (' + (Date.now() - t0) + 'ms)');
// Phase 3 polish
{ const r = analyzeMessage('Please Share Your OTP'); assert(r.findings[0].found.includes('Share Your OTP')); console.log('PASS quoted phrases keep original casing'); }
{ const r = analyzeMessage('share your otp. SHARE YOUR OTP'); assert.strictEqual(r.findings[0].phrases.length, 1); console.log('PASS duplicate phrases listed once'); }
// Phase 6: what to do if already responded
{ const r = analyzeMessage('Please share your OTP'); assert(r.ifAlready.some(x => /shared a code/.test(x))); console.log('PASS ifAlready for OTP request'); }
{ const r = analyzeMessage('Send Rs. 5000 processing fee'); assert(r.ifAlready.some(x => /sent money/.test(x)) && !r.ifAlready.some(x => /shared a code/.test(x))); console.log('PASS ifAlready only matches the findings'); }
{ const r = analyzeMessage('Hi, see you at 6'); assert.deepStrictEqual(r.ifAlready, []); console.log('PASS no ifAlready for clean messages'); }

// Violence, kidnapping and extortion threats (added after a real kidnap-threat message was rated Low)
t('kidnap threat with typos is High (screenshot case)', 'your son is with us sent us moeny or we will kill him we need 1000k', r => assert(r.level === 'High' && ids(r).includes('extortion') && ids(r).includes('payment') && ids(r).includes('held') && /contact the police/.test(r.floorNote) && /police/.test(r.topAction)));
t('kidnapping and ransom words are High', 'We have kidnapped your daughter. Pay the ransom.', r => assert(r.level === 'High' && ids(r).includes('extortion')));
t('"we have your son" plus a money demand is High', 'We have your son. Send 5 lakh or else.', r => assert(r.level === 'High' && ids(r).includes('held') && ids(r).includes('payment')));
t('threat to harm a person is High even without money', 'Pay attention: we will hurt your brother', r => assert(r.level === 'High' && ids(r).includes('extortion')));
t('extortion adds if-already and prevention advice', 'We will kill him unless you pay the ransom', r => assert(r.ifAlready.some(x => /police/.test(x)) && r.prevent.some(x => /code word/.test(x))));
t('past tense and misspelled money is a payment request', 'sent us moeny now', r => assert(ids(r).includes('payment')));
t('amount in thousands (1000k) is a payment request', 'send 1000k today', r => assert(ids(r).includes('payment')));
for (const ok of ['This movie will kill it at the box office', 'I am going to beat the traffic, see you soon', 'Your son is with us at the park, come pick him up at 5', 'I need money for books', 'Kill the lights when you leave', 'I will beat you at chess tonight', 'The ransomware article was interesting'])
  t('everyday wording not flagged as a threat: ' + ok, ok, r => assert(!ids(r).includes('extortion') && !ids(r).includes('held'), ok + ' ' + ids(r)));
// The examples shown on the Learn page must really trigger their rule
{ for (const r of require('../js/message.js').MSG_RULES) { assert(r.examples.length >= 2, r.id + ' needs examples'); for (const ex of r.examples) assert(r.re.some(re => [...ex.matchAll(re)].length > 0), r.id + ' does not match its own example: ' + ex); } console.log('PASS every message rule matches each of its documented examples'); }
console.log('Message rule-example tests passed');
console.log(' tests passed');
