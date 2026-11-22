// Run: node tests/wifi.test.js  (Phase 5: context-aware Wi-Fi scoring, new protocols, structured findings)
const assert = require('assert'); const { assess, validate } = require('../js/rules.js');
const base = { ssid: 'Demo', type: 'public', password: 'yes', sharing: 'shared', protocol: 'wpa2', location: 'cafe', captive: 'no' };
const t = (name, over, check) => { const r = assess({ ...base, ...over }); check(r); console.log('PASS', name); };
const ids = r => r.findings.map(f => f.id);
// Public is not automatically dangerous
t('cafe WPA2 shared password is Medium, not High', {}, r => assert(r.level === 'Medium'));
t('cafe WPA2 shared + login page stays Medium', { captive: 'yes' }, r => assert(r.level === 'Medium'));
t('hotel WPA2 shared + login page stays Medium', { location: 'hotel', captive: 'yes' }, r => assert(r.level === 'Medium'));
t('university Enterprise is Low', { protocol: 'enterprise', sharing: 'individual', location: 'university' }, r => assert(r.level === 'Low'));
t('home WPA2/WPA3 mixed is Low', { type: 'private', sharing: 'private', location: 'home', protocol: 'wpa2wpa3' }, r => assert(r.level === 'Low'));
t('public note says public is not automatically dangerous', {}, r => assert(/not automatically/.test(r.contextNote)));
t('private network has no public context note', { type: 'private', sharing: 'private' }, r => assert(r.contextNote === ''));
// Technical accuracy
t('shared password penalty applies to WPA2', {}, r => assert(r.factors.some(x => /Shared/.test(x.label)) && ids(r).includes('shared')));
t('shared password penalty does NOT apply to WPA3 (per-device keys)', { protocol: 'wpa3' }, r => assert(!r.factors.some(x => /Shared/.test(x.label)) && !ids(r).includes('shared') && r.positives.some(p => /matters less/.test(p))));
t('WPA3 public shared scores lower than WPA2 public shared', { protocol: 'wpa3' }, r => assert(r.score < assess(base).score));
t('Enhanced Open (no password) is Medium at an airport portal', { protocol: 'owe', password: 'no', sharing: '', location: 'airport', captive: 'yes' }, r => assert(r.level === 'Medium' && ids(r).includes('owe')));
t('Enhanced Open scores far below truly open', { protocol: 'owe', password: 'no', sharing: '' }, r => assert(r.score < assess({ ...base, protocol: 'open', password: 'no', sharing: '' }).score - 25));
t('open network is still High', { protocol: 'open', password: 'no', sharing: '' }, r => assert(r.level === 'High' && ids(r).includes('open')));
t('open network does not double-report "no password"', { protocol: 'open', password: 'no', sharing: '' }, r => assert(!ids(r).includes('nopass')));
t('WEP High', { type: 'private', sharing: 'private', protocol: 'wep' }, r => assert(r.level === 'High' && ids(r).includes('wep')));
t('unknown protocol at a cafe is Medium, not High (uncertainty is not proof of danger)', { protocol: 'unknown' }, r => assert(r.level === 'Medium'));
t('unknown protocol is never Low', { type: 'private', sharing: 'private', protocol: 'unknown', location: 'home' }, r => assert(r.level !== 'Low'));
// Validation of new options
t('Enhanced Open with a password rejected', { protocol: 'owe' }, r => assert(!r.ok && /no password/.test(r.errors.join())));
t('Enterprise with shared password rejected', { protocol: 'enterprise' }, r => assert(!r.ok && /individual logins/.test(r.errors.join())));
t('WPA2/WPA3 without password rejected', { protocol: 'wpa2wpa3', password: 'no', sharing: '' }, r => assert(!r.ok));
t('Enterprise without login rejected', { protocol: 'enterprise', password: 'no', sharing: '' }, r => assert(!r.ok));
t('individual sharing option accepted', { protocol: 'enterprise', sharing: 'individual' }, r => assert(r.ok));
t('unknown protocol name still rejected', { protocol: 'wpa4' }, r => assert(!r.ok));
// Structured output (same shape as the other modules)
t('every finding has all explanation fields', { protocol: 'open', password: 'no', sharing: '', captive: 'yes' }, r => { assert(r.findings.length >= 3); r.findings.forEach(f => assert(f.title && f.found && f.why && f.could && f.action && f.pts > 0)); });
t('findings sorted by weight', { protocol: 'open', password: 'no', sharing: '', captive: 'yes' }, r => assert(r.findings.every((f, i, a) => !i || a[i - 1].pts >= f.pts)));
t('top action comes from the biggest finding', { protocol: 'wep' }, r => assert(r.topAction === r.findings[0].action && r.topAction.length > 0));
t('no findings for a clean private WPA3 network', { type: 'private', sharing: 'private', location: 'home', protocol: 'wpa3' }, r => assert(r.findings.length === 0 && r.topAction === '' && r.positives.length >= 2));
t('guidance matches the level', {}, r => assert(/banking|VPN|mobile data/.test(r.guidance)));
t('not-checked list is present and mentions fake hotspots', {}, r => assert(r.notChecked.some(n => /fake hotspot/.test(n))));
t('limitations still say nothing is scanned', {}, r => assert(r.limitations.some(l => /does not scan/.test(l))));
t('captive finding only when user reports a portal', { captive: 'no' }, r => assert(!ids(r).includes('captive')));
t('score is capped at 100', { protocol: 'open', password: 'no', sharing: '', captive: 'yes', location: 'airport' }, r => assert(r.score === 100));
console.log('Wi-Fi tests passed');
// Unknown security type: uncertainty must not flip the level on small differences
t('unknown protocol + unknown portal at a cafe is held at Medium', { protocol: 'unknown', captive: 'unknown' }, r => assert(r.level === 'Medium' && /held at Medium/.test(r.floorNote)));
t('unknown protocol with NO password can still be High', { protocol: 'unknown', password: 'no', sharing: '', captive: 'yes' }, r => assert(r.level === 'High'));
t('level never depends on captive yes/no/unknown for unknown protocol with password', { protocol: 'unknown' }, r => ['yes', 'no', 'unknown'].forEach(c => assert(assess({ ...base, protocol: 'unknown', captive: c }).level === 'Medium')));
console.log('Wi-Fi ceiling tests passed');
// Phase 6 additions (used by the overview)
// Network-name checks (evil-twin style "free" names, factory router names)
t('generic free name on a public network is flagged', { ssid: 'Airport_Free_WiFi', protocol: 'open', password: 'no', sharing: '' }, r => assert(r.findings.some(f => f.id === 'free-name') && r.recs.some(x => /exact network name/.test(x))));
t('Free_Cafe_WiFi is flagged', { ssid: 'Free_Cafe_WiFi' }, r => assert(r.findings.some(f => f.id === 'free-name')));
t('"Freedom Cafe" is not a free name', { ssid: 'Freedom Cafe' }, r => assert(!r.findings.some(f => f.id === 'free-name')));
t('factory router name on a private network is flagged with router advice', { ssid: 'PTCL-BB', type: 'private', sharing: 'private', location: 'home' }, r => assert(r.findings.some(f => f.id === 'default-name') && r.recs.some(x => /admin password/.test(x)) && r.level === 'Low'));
t('TP-Link_3F2A is a factory name', { ssid: 'TP-Link_3F2A', type: 'private', sharing: 'private', location: 'home' }, r => assert(r.findings.some(f => f.id === 'default-name')));
t('own home network name is not flagged', { ssid: 'Smith_Home', type: 'private', sharing: 'private', location: 'home' }, r => assert(!r.findings.some(f => f.id === 'default-name' || f.id === 'free-name')));
t('wifi summary label has no network name', { ssid: 'Smith_Family_Home' }, r => assert(!/Smith/.test(r.summaryLabel) && /Public network, WPA2/.test(r.summaryLabel)));
t('unknown protocol is flagged as limited', { protocol: 'unknown' }, r => assert(r.limited === true && r.limitedReason.length > 0));
t('known protocol is not limited', {}, r => assert(r.limited === false && r.limitedReason === ''));
t('prevent tips are conditional on the findings', { type: 'private', sharing: 'private', protocol: 'wpa3', location: 'home' }, r => assert(r.prevent.length === 0));
t('public network gets away-from-home advice', {}, r => assert(r.prevent.some(x => /mobile data|VPN/.test(x))));
console.log('Wi-Fi overview-support tests passed');
