// Run: node tests/password.test.js
const assert = require('assert'); const fs = require('fs'); const { analyzePassword: a } = require('../js/password.js');
const t = (name, pw, check, opts) => { check(a(pw, opts)); console.log('PASS', name); };
const ids = r => r.issues.map(i => i.id);
t('empty gives no category', '', r => assert(r.category === '' && r.score === 0));
t('null safe', null, r => assert(r.category === ''));
t('famous XKCD phrase is Weak', 'correct horse battery staple', r => assert(r.category === 'Weak' && ids(r).includes('famous')));
t('own passphrase is Strong', 'river lantern copper maple', r => assert(r.category === 'Strong' && r.positives.some(p => /passphrase/.test(p))));
t('leet-speak common password is Weak', 'P@ssw0rd', r => assert(r.category === 'Weak' && ids(r).includes('common')));
t('Password1! is Weak', 'Password1!', r => assert(r.category === 'Weak'));
t('word + year + symbol is Weak', 'Summer2024!', r => assert(r.category === 'Weak' && ids(r).includes('pattern')));
t('common numbers Weak', '12345678', r => assert(r.category === 'Weak'));
t('keyboard walk flagged', 'qwertyuiop', r => assert(ids(r).includes('keyboard') && r.category === 'Weak'));
t('sequence flagged', 'xyz1234abcdPlm', r => assert(ids(r).includes('sequence')));
t('descending sequence flagged', 'Zq9987654!x', r => assert(ids(r).includes('sequence')));
t('repeated chars Weak', 'aaaaaaaaaaaaaaaa', r => assert(r.category === 'Weak' && ids(r).includes('repeat')));
t('repeated chunk Weak', 'abababababababab', r => assert(ids(r).includes('repeat') && r.tips.some(x => /repeated/.test(x))));
t('emoji repeat Weak, counted by characters', '\u{1F600}'.repeat(12), r => assert(r.category === 'Weak' && r.length === 12));
t('short password capped Weak', 'aB3$xY', r => assert(r.category === 'Weak' && ids(r).includes('short')));
t('8-11 chars never above Fair', 'aB3$xY9!qW', r => assert(['Weak', 'Fair'].includes(r.category)));
t('random 16 chars Strong', 'fz8#Kp2!vQ9@mL4x', r => assert(r.category === 'Strong' && r.issues.length === 0));
t('long string with common word capped at Fair', 'thisisaverylongpassword', r => assert(['Weak', 'Fair'].includes(r.category) && ids(r).includes('common-word')));
t('length beats complexity', 'mountain bicycle orbit', r => assert(r.category === 'Strong'));
t('every issue explains why and how to fix', 'Summer2024!', r => r.issues.forEach(i => assert(i.title && i.why && i.fix)));
t('tips never empty', 'river lantern copper maple', r => assert(r.tips.length >= 1));
t('reuse flag is reported but does not change the score', 'river lantern copper maple', r => assert(r.reuse === true && r.score === a('river lantern copper maple').score), { reused: true });
t('very long input is bounded', 'x'.repeat(100000) + 'Qz', r => assert(r.length <= 256));
t('unicode passphrase handled', 'k\u00fcche tisch fenster lampe', r => assert(r.category !== ''));
t('score within 0..100', 'Tr4in-Lamp!Orbit#92x', r => assert(r.score >= 0 && r.score <= 100 && r.category === 'Strong'));
// Privacy guard: the password code must not use storage, network, logging or timers
const src = fs.readFileSync(__dirname + '/../js/password.js', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
assert(!/localStorage|sessionStorage|indexedDB|fetch\(|XMLHttpRequest|sendBeacon|console\.|document\.cookie|WebSocket/.test(src)); console.log('PASS password.js has no storage, network or logging calls');
const t0 = Date.now(); for (let i = 0; i < 200; i++) a('Zx' + i + '!'.repeat(i % 7) + 'qwer'.repeat(60)); assert(Date.now() - t0 < 1500); console.log('PASS performance');
// Regression kept from the old wrapper tests
t('no false "repeated" tip on a strong passphrase', 'river lantern copper maple', r => assert(!r.tips.some(x => /repeated/.test(x))));
console.log('Password regression tests passed');

// Personal numbers and digits-only passwords; NordPass 2025/2026 common passwords
for (const [pw, kind] of [['03001234567', 'phone number'], ['+923001234567', 'phone number'], ['3520212345671', 'CNIC number'], ['35202-1234567-1', 'CNIC number'], ['14081995', 'date of birth'], ['19950814', 'date of birth']]) {
  const r = a(pw); assert(r.category === 'Weak' && r.issues.some(i => i.id === 'personal' && i.title.includes(kind)), pw); console.log('PASS ' + pw + ' is Weak and recognised as a ' + kind); }
{ const r = a('7392058461'); assert(r.issues.some(i => i.id === 'digits') && r.category === 'Weak'); console.log('PASS digits-only password is Weak'); }
for (const pw of ['pakistan786', 'Naruto2024', 'skibidi123', 'babarazam56']) { assert(a(pw).category === 'Weak', pw); console.log('PASS common password ' + pw + ' is Weak'); }
{ const r = a('tiger-lamp-orbit-cactus-91'); assert(r.category === 'Strong' && !r.issues.some(i => ['personal', 'digits'].includes(i.id))); console.log('PASS random passphrase is still Strong'); }
// Every check shown on the Learn page must really fire on its example
{ const { PW_CHECKS } = require('../js/password.js'); for (const c of PW_CHECKS) assert(a(c.example).issues.some(i => i.id === c.id), c.id + ' not triggered by ' + c.example); console.log('PASS every documented password check is triggered by its example'); }
console.log('Password check-example tests passed');
console.log(' tests passed');
