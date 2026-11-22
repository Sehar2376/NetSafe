// Run: node tests/url.test.js
const assert = require('assert'); const { analyzeUrl, punyDecode, registeredDomain } = require('../js/url.js');
const t = (name, input, check) => { check(analyzeUrl(input)); console.log('PASS', name); };
const ids = r => r.findings.map(f => f.id);
t('plain https site: Low, no findings', 'https://example.com/account', r => assert(r.ok && r.level === 'Low' && r.findings.length === 0));
t('Low summary does not say safe', 'https://example.com', r => assert(/does not make the site safe/.test(r.summary)));
t('http flagged', 'http://example.com', r => assert(ids(r).includes('http')));
t('no scheme: note, no http finding', 'example.com', r => assert(r.schemeMissing && !ids(r).includes('http') && r.notes.some(n => /http/.test(n))));
t('ip address', 'https://203.0.113.10/login', r => assert(ids(r).includes('ip') && ['Medium', 'High'].includes(r.level)));
t('obfuscated hex ip normalised', 'http://0x7f.1/', r => assert(ids(r).includes('ip') && r.host === '127.0.0.1'));
t('userinfo trick', 'https://paypal.com@account-check.example/', r => assert(ids(r).includes('userinfo') && r.domain === 'account-check.example'));
t('brand on other domain', 'http://paypal.com.secure-login.example/verify', r => assert(ids(r).includes('brand') && r.level === 'High'));
t('real brand domain not flagged', 'https://www.paypal.com/signin', r => assert(!ids(r).includes('brand') && !ids(r).includes('keywords')));
t('real subdomain of brand not flagged', 'https://accounts.google.com/signin', r => assert(r.level === 'Low' && r.findings.length === 0));
t('leet look-alike brand is flagged as a look-alike and High', 'https://paypa1-secure.top', r => assert(ids(r).includes('lookalike') && r.level === 'High'));
t('regional brand domain ok', 'https://amazon.co.uk/x', r => assert(!ids(r).includes('brand')));
t('punycode + mixed script', 'https://xn--pypal-4ve.example', r => assert(ids(r).includes('punycode') && ids(r).includes('mixed-script')));
t('punycode does not trigger hyphen rule', 'https://xn--pypal-4ve.example', r => assert(!ids(r).includes('hyphens')));
t('unicode input converted', 'https://p\u0430ypal.example', r => assert(ids(r).includes('mixed-script')));
t('shortener', 'https://bit.ly/3AbCdEf', r => assert(ids(r).includes('shortener') && r.level === 'Medium'));
t('many subdomains', 'https://a.b.c.d.example.com', r => assert(ids(r).includes('deep-sub')));
t('unusual port', 'https://example.com:8443/', r => assert(ids(r).includes('port')));
t('redirect parameter', 'https://example.com/?next=https://other.example', r => assert(ids(r).includes('redirect-param')));
t('risky tld is only a weak signal', 'https://example.top', r => assert(ids(r).includes('tld') && r.level === 'Low'));
t('javascript: link', 'javascript:alert(1)', r => assert(r.ok && r.level === 'High' && ids(r).includes('code-link')));
t('data: link', 'data:text/html,hi', r => assert(r.level === 'High'));
t('ftp rejected', 'ftp://example.com', r => assert(!r.ok));
t('mailto rejected', 'mailto:a@b.c', r => assert(!r.ok));
t('empty rejected', '   ', r => assert(!r.ok));
t('spaces rejected', 'hello world', r => assert(!r.ok));
t('control chars rejected', 'https://exa\u0000mple.com', r => assert(!r.ok));
t('too long rejected', 'https://example.com/' + 'a'.repeat(2100), r => assert(!r.ok));
t('garbage rejected', 'https://', r => assert(!r.ok));
t('null/undefined safe', null, r => assert(!r.ok));
t('limitations always present', 'https://example.com', r => assert(r.limitations.some(l => /did not open/.test(l)) && r.notChecked.includes('Security certificate')));
t('HTTPS note says encryption only', 'https://example.com', r => assert(r.notes.some(n => /only means/.test(n))));
t('every finding has the 4 explanation fields', 'http://paypal.com.secure-login.example/verify', r => r.findings.forEach(f => assert(f.found && f.why && f.could && f.action)));
t('score capped at 100', 'http://user@paypal.0x7f.1.xn--pypal-4ve.zip:81/?a=https://x.y', r => assert(r.score <= 100));
assert.strictEqual(punyDecode('mnchen-3ya'), 'm\u00fcnchen');
assert.deepStrictEqual(registeredDomain(['www', 'bank', 'com', 'pk']), { domain: 'bank.com.pk', sub: ['www'] });
// Phase 6: what to do if already opened
{ const r = analyzeUrl('http://paypal.com.secure-login.example/verify'); assert(r.ifAlready.length === 1 && /change it on the real site/.test(r.ifAlready[0])); console.log('PASS ifAlready for risky links'); }
{ const r = analyzeUrl('https://example.com'); assert.deepStrictEqual(r.ifAlready, []); console.log('PASS no ifAlready for Low links'); }

// Every signal shown on the Learn page must be real, with the documented points
// Look-alike names (added with the lookalike rule)
t('capital I posing as l (googIe.com)', 'https://googIe.com', r => assert(ids(r).includes('lookalike') && r.level !== 'Low'));
t('one letter changed (paypai.com)', 'https://paypai.com/login', r => assert(ids(r).includes('lookalike')));
t('rn posing as m (rnicrosoft.com)', 'https://rnicrosoft.com', r => assert(ids(r).includes('lookalike')));
t('one letter wrong (amazom.com)', 'https://amazom.com', r => assert(ids(r).includes('lookalike')));
t('all-Cyrillic apple (xn--80ak6aa92e.com) is High', 'https://xn--80ak6aa92e.com', r => assert(ids(r).includes('lookalike') && r.level === 'High'));
t('exact brand on other domain uses the brand rule, not both', 'https://paypal.com.secure-login.example', r => assert(ids(r).includes('brand') && !ids(r).includes('lookalike')));
for (const ok of ['https://www.google.com/', 'https://google.co.uk', 'https://www.amazon.com', 'https://apple.com', 'https://github.com', 'https://wikipedia.org', 'https://maple.com', 'https://applied.com', 'https://youtube.com'])
  t('real or unrelated site not flagged as look-alike: ' + ok, ok, r => assert(!ids(r).includes('lookalike') && !ids(r).includes('brand') && r.level === 'Low', ok + ' ' + ids(r)));
t('https://www.google.com/ is Low but never called safe', 'https://www.google.com/', r => assert(r.level === 'Low' && /does not make the site safe/.test(r.summary) && !/\bis safe\b/i.test(r.summary)));
// Free hosting, fake government names and Pakistani brands (added from 2024-2026 phishing reports and PTA/PSCA warnings)
t('bank name on a free hosting platform is High', 'https://hbl-verify.pages.dev', r => assert(ids(r).includes('free-host') && ids(r).includes('brand') && r.level === 'High' && r.domain === 'hbl-verify.pages.dev'));
t('brand on vercel.app is High', 'https://netflix-billing.vercel.app', r => assert(ids(r).includes('free-host') && r.level === 'High'));
t('personal github.io page: weak signal only, stays Low', 'https://myportfolio.github.io', r => assert(ids(r).includes('free-host') && r.level === 'Low'));
t('fake e-challan site (gop on .cc) is High', 'https://echallan-psca-gop.cc', r => assert(ids(r).includes('fake-gov') && ids(r).includes('tld') && r.level === 'High'));
t('fake BISP site is High', 'https://bisp-gov-pk.com/apply', r => assert(ids(r).includes('fake-gov') && ids(r).includes('brand') && r.level === 'High'));
t('courier name on a cheap ending is High', 'https://tcs-delivery.top', r => assert(ids(r).includes('brand') && r.level === 'High'));
for (const ok of ['https://echallan.psca.gop.pk', 'https://8171.bisp.gov.pk', 'https://www.fbr.gov.pk', 'https://www.daraz.pk/products/x', 'https://fonts.googleapis.com/css',
  'https://s3.amazonaws.com/bucket', 'https://login.microsoftonline.com', 'https://static.xx.fbcdn.net/x.png', 'https://www.youtube.com/watch?v=1', 'https://t.me/channel', 'https://docs.github.com'])
  t('real official or service address not flagged: ' + ok, ok, r => assert(r.level === 'Low' && r.findings.length === 0, ok + ' ' + ids(r)));
t('broken %-code before @ does not crash (found by fuzzing)', 'https://%E0%A4%A@evil.example', r => assert(r.ok && ids(r).includes('userinfo')));
{ const { URL_SIGNALS, URL_CONFIG } = require('../js/url.js'); const keys = Object.keys(URL_CONFIG.pts);
  assert.deepStrictEqual(URL_SIGNALS.map(s => s.key).sort(), keys.slice().sort()); console.log('PASS the signal table covers every weighted signal exactly once');
  for (const s of URL_SIGNALS) { const f = analyzeUrl(s.example, s.opts).findings.find(x => x.id === s.id); assert(f, s.id + ' not triggered by ' + s.example); assert.strictEqual(f.pts, URL_CONFIG.pts[s.key], s.id + ' points differ'); } console.log('PASS every documented link signal is triggered by its example, with the documented points'); }
console.log('URL signal tests passed');
console.log('URL tests passed');
// Hidden links: the text a link shows vs where it really goes
{ const { compareLinkText } = require('../js/url.js');
  assert(compareLinkText('www.google.com', 'https://evil-site.top/login').realDomain === 'evil-site.top'); console.log('PASS link text google.com going to another site is a mismatch');
  assert.strictEqual(compareLinkText('www.google.com', 'https://www.google.com/search?q=x'), null); console.log('PASS link text matching its real address is not a mismatch');
  assert.strictEqual(compareLinkText('https://hbl.com', 'https://accounts.hbl.com/x'), null); console.log('PASS a subdomain of the shown site is not a mismatch');
  assert.strictEqual(compareLinkText('Click here', 'https://evil.top'), null); console.log('PASS ordinary link words are not compared');
  assert(compareLinkText('google.com', 'javascript:alert(1)').realHost === ''); console.log('PASS a web-address text pointing to javascript: is a mismatch');
  assert(analyzeUrl('https://evil-site.top/login', { shownAs: 'www.google.com' }).level === 'High'); console.log('PASS checked link that showed google.com is High');
  assert(!analyzeUrl('https://www.google.com/', { shownAs: 'www.google.com' }).findings.length); console.log('PASS real google.com shown as google.com has no findings');
  for (const u of ['https://www.goog1e.com/', 'https://www.paypa1.com/', 'https://g00gle.com', 'https://rnicrosoft.com', 'https://www.googIe.com']) { assert.strictEqual(analyzeUrl(u).level, 'High', u); } console.log('PASS look-alike brand names are High');
}
