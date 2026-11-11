// Run: node tests/rules.test.js
const assert = require('assert'); const { assess } = require('../js/rules.js');
const base = { ssid: 'Demo', type: 'private', password: 'yes', sharing: 'private', protocol: 'wpa2', location: 'home', captive: 'no' };
const t = (name, over, check) => { const r = assess({ ...base, ...over }); check(r); console.log('PASS', name); };
t('1 open + private', { protocol: 'open', password: 'no', sharing: '' }, r => assert(r.level === 'High'));
t('2 WEP', { protocol: 'wep' }, r => assert(r.level === 'High'));
t('3 old WPA', { protocol: 'wpa' }, r => assert(r.level === 'High'));
t('4 WPA2 private pw', {}, r => assert(r.level === 'Low'));
t('5 WPA2 shared public', { type: 'public', sharing: 'shared', location: 'cafe' }, r => assert(r.level === 'Medium' && r.factors.some(x => /Shared/.test(x.label))));
t('6 WPA3 public not Low', { protocol: 'wpa3', type: 'public' }, r => assert(r.level === 'Medium'));
t('7 WPA3 private', { protocol: 'wpa3' }, r => assert(r.level === 'Low'));
t('8 no password + WPA3', { protocol: 'wpa3', password: 'no' }, r => assert(!r.ok && /Contradiction/.test(r.errors[0])));
t('9 missing fields', { ssid: '', protocol: '' }, r => assert(!r.ok && r.errors.length >= 2));
t('10 invalid input', { ssid: 'x'.repeat(40), protocol: 'zzz' }, r => assert(!r.ok));
t('11 captive portal', { captive: 'yes', type: 'public' }, r => assert(r.concerns.some(c => /captive portal/i.test(c))));
t('12 unknown protocol', { protocol: 'unknown' }, r => assert(r.level !== 'Low'));
t('13 evil twin limitation', {}, r => assert(r.limitations.some(l => /evil twin/.test(l))));
t('open + password yes rejected', { protocol: 'open', password: 'yes' }, r => assert(!r.ok));
// Regression tests for bugs found in audit
t('inherited protocol name rejected', { protocol: 'constructor' }, r => assert(!r.ok));
t('invalid password option rejected', { password: 'maybe' }, r => assert(!r.ok));
t('invalid location rejected', { location: 'zzz' }, r => assert(!r.ok));
t('invalid captive rejected', { captive: 'zzz' }, r => assert(!r.ok));
t('invalid sharing rejected', { sharing: 'zzz' }, r => assert(!r.ok));
console.log('All tests passed');
// Phase 1 regression tests
t('captive wording says reported, not detected', { captive: 'yes', type: 'public' }, r => assert(r.concerns.some(c => /reported/.test(c)) && !r.concerns.some(c => /detected/.test(c))));
t('SSID limit is bytes', { ssid: '\u00e9'.repeat(20) }, r => assert(!r.ok));
t('32 ASCII char SSID ok', { ssid: 'a'.repeat(32) }, r => assert(r.ok));
t('private WPA2 home: no fake-hotspot or file-sharing advice', {}, r => assert(!r.recs.some(x => /fake hotspots|file sharing/.test(x))));
t('public network gets fake-hotspot advice', { type: 'public', location: 'cafe' }, r => assert(r.recs.some(x => /fake hotspots/.test(x))));
t('shared password advice only when shared', { type: 'public', sharing: 'shared' }, r => assert(r.recs.some(x => /shared password/.test(x))));
t('unknown protocol advice', { protocol: 'unknown' }, r => assert(r.recs.some(x => /security type/.test(x))));
t('router advice only for weak protocols', { protocol: 'wpa2' }, r => assert(!r.recs.some(x => /router/.test(x))));
t('location rationale has no attacker claim', { location: 'cafe', type: 'public' }, r => assert(!r.factors.some(f => /attract more attackers/.test(f.why))));
console.log('Phase 1 tests passed');
