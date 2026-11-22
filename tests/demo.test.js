// Verifies every expected result claimed in docs/DEMO.md. If a rule changes, this fails until the demo script is updated.
const assert = require('assert');
const { analyzeMessage: am } = require('../js/message.js'), { analyzeUrl: au } = require('../js/url.js'), { analyzePassword: ap } = require('../js/password.js'), { assess } = require('../js/rules.js');
const t = (name, fn) => { fn(); console.log('PASS', name); };
const ids = r => (r.findings || r.issues).map(f => f.id);
const has = (r, list) => list.forEach(i => assert(ids(r).includes(i), 'missing ' + i + ' in ' + ids(r)));

t('A1 bank SMS: High, asks for OTP and CNIC, threat, urgency, risky link, ordinary-number sender', () => { const r = am('HBL Alert: Your account will be blocked within 24 hours. Verify your CNIC and OTP now at http://hbl-verify.example/login', { sender: '+92 300 0000000', channel: 'sms' }); assert(r.level === 'High'); has(r, ['otp', 'banking', 'threat', 'urgency', 'link', 'sender-number']); assert(r.ifAlready.length >= 2); });
t('A2 prize via WhatsApp: High, prize + fee', () => { const r = am('Congratulations! You have won Rs. 500,000 in the lucky draw. To claim your prize, send Rs. 5,000 processing fee via JazzCash.', { channel: 'whatsapp' }); assert(r.level === 'High'); has(r, ['prize', 'payment']); });
t('A3 family emergency: High, new number + money + secrecy', () => { const r = am('Hi Mum, this is my new number. I am in trouble and my phone broke. Can you transfer money to this account today? Please do not tell Dad.', { channel: 'whatsapp' }); assert(r.level === 'High'); has(r, ['payment', 'secrecy', 'new-number']); });
t('A4 genuine code notice: Low with a note, no false alarm', () => { const r = am('Your verification code is 482913. It expires in 10 minutes. Never share this code with anyone.', { channel: 'sms' }); assert(r.level === 'Low' && r.findings.length === 0 && r.notes.length >= 1); });
t('A5 ordinary message: Low', () => assert.strictEqual(am('Hi, are we still meeting at 6? I will bring the notes.').level, 'Low'));
t('B1 fake-brand link: High (http, brand, account words)', () => { const r = au('http://paypal.com.secure-login.example/verify'); assert(r.level === 'High'); has(r, ['http', 'brand', 'keywords']); assert.strictEqual(r.domain, 'secure-login.example'); });
t('B2 @ trick: High, real destination is account-check.example', () => { const r = au('https://paypal.com@account-check.example/'); assert(r.level === 'High'); has(r, ['userinfo']); assert.strictEqual(r.domain, 'account-check.example'); });
t('B3 look-alike letters: High (punycode + mixed alphabets)', () => { const r = au('https://xn--pypal-4ve.example'); assert(r.level === 'High'); has(r, ['punycode', 'mixed-script']); });
t('B4 normal link: Low, and the page still says Low is not proof of safety', () => { const r = au('https://example.com/account'); assert(r.level === 'Low' && /does not make the site safe/.test(r.summary)); });
t('C1 Summer2024! is Weak', () => assert.strictEqual(ap('Summer2024!').category, 'Weak'));
t('C2 "correct horse battery staple" is Weak (famous phrase)', () => { const r = ap('correct horse battery staple'); assert(r.category === 'Weak'); has(r, ['famous']); });
t('C3 "river lantern copper maple" is Strong', () => assert.strictEqual(ap('river lantern copper maple').category, 'Strong'));
t('C4 P@ssw0rd is Weak despite the symbol swaps', () => assert.strictEqual(ap('P@ssw0rd').category, 'Weak'));
const b = { ssid: 'Cafe_Guest', type: 'public', password: 'yes', sharing: 'shared', protocol: 'wpa2', location: 'cafe', captive: 'yes' };
t('D1 cafe, WPA2 shared password, login page: Medium (58), NOT High', () => { const r = assess(b); assert(r.level === 'Medium' && r.score === 58); has(r, ['public', 'shared', 'captive']); });
t('D2 airport open network with login page: High', () => assert.strictEqual(assess({ ...b, protocol: 'open', password: 'no', sharing: '', location: 'airport' }).level, 'High'));
t('D3 university Enterprise: Low (20)', () => { const r = assess({ ...b, protocol: 'enterprise', sharing: 'individual', location: 'university', captive: 'no' }); assert(r.level === 'Low' && r.score === 20); });
t('D4 home WPA3: Low (5), no findings', () => { const r = assess({ ...b, type: 'private', protocol: 'wpa3', sharing: 'private', location: 'home', captive: 'no' }); assert(r.level === 'Low' && r.score === 5 && r.findings.length === 0); });
t('D5 unknown security type: Medium, held, flagged as limited', () => { const r = assess({ ...b, protocol: 'unknown', captive: 'unknown' }); assert(r.level === 'Medium' && r.limited && /held at Medium/.test(r.floorNote)); });
console.log('Demo tests passed');
