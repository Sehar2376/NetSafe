/* NetSafe URL analyzer. Pure logic: no DOM, no network, nothing stored.
   It only reads the TEXT of a link. It never opens it and cannot judge reputation, certificates,
   redirects or ownership. Edit CONFIG to change weights. */
const URL_CONFIG = {
  thresholds: { medium: 15, high: 40 },
  pts: { http: 20, ip: 30, userinfo: 40, punycode: 20, mixedScript: 20, shortener: 20, brand: 35,
         lookalike: 35, fakeGov: 30, freeHost: 10, deepSub: 10, hyphens: 10, longHost: 10, keywords: 10, tld: 10, port: 10, redirectParam: 10, longUrl: 5, encodedHost: 10, codeLink: 60 },
  maxLength: 2048
};
const SHORTENERS = ['bit.ly', 'tinyurl.com', 't.co', 'goo.gl', 'ow.ly', 'is.gd', 'buff.ly', 'rebrand.ly', 'cutt.ly', 'shorturl.at', 'tiny.cc', 'rb.gy', 't.ly', 's.id', 'v.gd', 'bit.do', 'tiny.one', 'surl.li', 'u.to', 'shorturl.asia', 'short.gy', 'cutt.us'];
const RISKY_TLDS = ['zip', 'mov', 'xyz', 'top', 'click', 'icu', 'gq', 'tk', 'ml', 'cf', 'ga', 'work', 'rest', 'country', 'loan', 'monster', 'cc', 'buzz', 'sbs', 'cfd', 'bond', 'vip', 'cyou', 'quest', 'site', 'online', 'live', 'lol'];
const KEYWORDS = ['login', 'signin', 'verify', 'secure', 'account', 'update', 'wallet', 'otp', 'confirm', 'password'];
// Small, incomplete list of well-known brands. A brand name on a domain that is not in `ok` is only a warning sign.
const BRANDS = {
  paypal: ['paypal.com', 'paypalobjects.com'], google: ['google.com', 'gmail.com', 'google.com.pk', 'google.co.uk', 'google.co.in', 'google.ca', 'google.de', 'google.com.au', 'google.ae', 'google.com.sa', 'googleapis.com', 'googleusercontent.com', 'gstatic.com', 'googlemail.com'], microsoft: ['microsoft.com', 'live.com', 'office.com', 'outlook.com', 'microsoftonline.com', 'sharepoint.com', 'office365.com', 'microsoft365.com'],
  apple: ['apple.com', 'icloud.com'], amazon: ['amazon.com', 'amazon.co.uk', 'amazon.de', 'amazon.in', 'amazon.ca', 'amazon.ae', 'amazonaws.com', 'media-amazon.com'],
  facebook: ['facebook.com', 'fb.com', 'facebook.net', 'fbcdn.net'], instagram: ['instagram.com'], whatsapp: ['whatsapp.com', 'whatsapp.net'], netflix: ['netflix.com', 'netflix.net', 'nflxvideo.net'],
  binance: ['binance.com'], dhl: ['dhl.com'], fedex: ['fedex.com'], easypaisa: ['easypaisa.com.pk'], jazzcash: ['jazzcash.com.pk'],
  hbl: ['hbl.com'], ubl: ['ubl.com.pk'], meezanbank: ['meezanbank.com'], meezan: ['meezanbank.com'], abl: ['abl.com'], alliedbank: ['abl.com'], nadra: ['nadra.gov.pk'],
  bisp: ['bisp.gov.pk'], psca: ['psca.gop.pk', 'punjab.gov.pk'], echallan: ['psca.gop.pk', 'punjab.gov.pk', 'sindhpolice.gov.pk', 'islamabadpolice.gov.pk'], fbr: ['fbr.gov.pk'],
  pta: ['pta.gov.pk'], sbp: ['sbp.org.pk'], mcb: ['mcb.com.pk'], bankalfalah: ['bankalfalah.com'], daraz: ['daraz.pk', 'daraz.com'], tcs: ['tcsexpress.com', 'tcs.com.pk'],
  pakpost: ['pakpost.gov.pk'], telenor: ['telenor.com', 'telenor.com.pk'], usps: ['usps.com'], tiktok: ['tiktok.com'], telegram: ['telegram.org', 't.me'],
  linkedin: ['linkedin.com'], coinbase: ['coinbase.com'], youtube: ['youtube.com', 'youtu.be']
};
// Free hosting and app-builder platforms where anyone can publish a page in minutes. Security reports from 2024-2026 list these among
// the most abused for phishing. The person's own subdomain (name.pages.dev) is treated as the site name.
const FREE_HOSTS = ['pages.dev', 'workers.dev', 'r2.dev', 'trycloudflare.com', 'vercel.app', 'netlify.app', 'web.app', 'firebaseapp.com', 'github.io', 'glitch.me',
  'ngrok.io', 'ngrok.app', 'ngrok-free.app', 'surge.sh', 'onrender.com', 'replit.app', 'repl.co', 'herokuapp.com', 'azurewebsites.net', 'appspot.com', 'blogspot.com',
  'weebly.com', 'wixsite.com', '000webhostapp.com', 'webflow.io', 'framer.app', 'firebasestorage.googleapis.com'];
const GOV_ENDINGS = ['gov.pk', 'gop.pk', 'gos.pk', 'gkp.pk', 'gob.pk', 'gov', 'mil', 'gov.uk', 'gov.au', 'gov.in', 'gc.ca', 'gov.ae', 'gov.sa', 'gov.bd'];
// Common two-part public suffixes. Not the full Public Suffix List, so the "registered domain" is an approximation.
const TWO_PART = ['gop.pk', 'gos.pk', 'gkp.pk', 'gob.pk', 'gov.ae', 'gov.sa', 'gov.in', 'gov.au', 'co.uk', 'org.uk', 'ac.uk', 'gov.uk', 'com.pk', 'org.pk', 'net.pk', 'edu.pk', 'gov.pk', 'com.au', 'co.in', 'co.jp', 'com.br', 'co.za', 'com.tr', 'com.sa', 'com.bd'];
// Every signal the link checker looks for, with a made-up example. Shown on the Learn page; tests check each example triggers its signal.
const URL_SIGNALS = [
  { key: 'http', id: 'http', label: 'Link starts with http:// (not encrypted)', example: 'http://example.com' },
  { key: 'ip', id: 'ip', label: 'Numbers instead of a website name', example: 'https://203.0.113.10/login' },
  { key: 'userinfo', id: 'userinfo', label: 'Misleading "@" in the link', example: 'https://paypal.com@account-check.example/' },
  { key: 'punycode', id: 'punycode', label: 'Look-alike characters in the name', example: 'https://xn--pypal-4ve.example' },
  { key: 'mixedScript', id: 'mixed-script', label: 'Letters from different alphabets in one word', example: 'https://xn--pypal-4ve.example' },
  { key: 'shortener', id: 'shortener', label: 'Shortened link (destination hidden)', example: 'https://bit.ly/3AbCdEf' },
  { key: 'brand', id: 'brand', label: 'Famous brand name on another website', example: 'https://paypal.com.secure-login.example' },
  { key: 'lookalike', id: 'lookalike', label: 'Name that imitates a famous brand (googIe, paypai, amazom, Cyrillic letters)', example: 'https://googIe.com' },
  { key: 'fakeGov', id: 'fake-gov', label: 'Government-looking name on a non-government address', example: 'https://echallan-psca-gop.cc' },
  { key: 'freeHost', id: 'free-host', label: 'Free hosting or app-builder address (pages.dev, vercel.app ...)', example: 'https://hbl-verify.pages.dev' },
  { key: 'deepSub', id: 'deep-sub', label: 'Many subdomains', example: 'https://a.b.c.d.example.com' },
  { key: 'hyphens', id: 'hyphens', label: 'Many hyphens in the site name', example: 'https://my-secure-login-update.example' },
  { key: 'longHost', id: 'long-host', label: 'Very long website name', example: 'https://' + 'a'.repeat(52) + '.example' },
  { key: 'keywords', id: 'keywords', label: 'Account words in the site name (login, verify ...)', example: 'https://account-verify.example' },
  { key: 'tld', id: 'tld', label: 'Ending often abused (.top, .xyz ...)', example: 'https://example.top' },
  { key: 'port', id: 'port', label: 'Unusual port number', example: 'https://example.com:8443/' },
  { key: 'redirectParam', id: 'redirect-param', label: 'Link contains another link', example: 'https://example.com/?next=https://other.example' },
  { key: 'longUrl', id: 'long-url', label: 'Very long link', example: 'https://example.com/' + 'a'.repeat(200) },
  { key: 'encodedHost', id: 'encoded-host', label: 'Hidden %-encoded characters in the name', example: 'https://exa%6Dple.com' },
  { key: 'codeLink', id: 'code-link', label: 'Not a web link (javascript: or data:)', example: 'javascript:alert(1)' }
];
const URL_LIMITATIONS = [
  'NetSafe only reads the text of the link. It did not open it, so it cannot see the page.',
  'Not checked: website reputation or blocklists, the security certificate, redirects, domain age or ownership.',
  'Unusual link text is a warning sign, not proof. Many legitimate sites look unusual, and some harmful sites look perfectly normal.',
  'The "registered domain" is an approximation (small built-in suffix list), and the brand and look-alike lists are short, so many imitations of other names are not recognised.'
];

// Punycode decoder (RFC 3492) so xn-- names can be shown in readable form without any network lookup.
function punyDecode(input) {
  const base = 36, tMin = 1, tMax = 26, skew = 38, damp = 700;
  const adapt = (d, n, first) => { d = first ? Math.floor(d / damp) : d >> 1; d += Math.floor(d / n); let k = 0; while (d > (((base - tMin) * tMax) >> 1)) { d = Math.floor(d / (base - tMin)); k += base; } return Math.floor(k + ((base - tMin + 1) * d) / (d + skew)); };
  const out = []; let n = 128, i = 0, bias = 72;
  let b = input.lastIndexOf('-'); if (b < 0) b = 0;
  for (let j = 0; j < b; j++) { if (input.charCodeAt(j) >= 128) throw new Error('bad punycode'); out.push(input.charCodeAt(j)); }
  for (let idx = b > 0 ? b + 1 : 0; idx < input.length;) {
    const oldi = i; let w = 1;
    for (let k = base; ; k += base) {
      if (idx >= input.length) throw new Error('bad punycode');
      const c = input.charCodeAt(idx++);
      const digit = c >= 48 && c <= 57 ? c - 22 : c >= 65 && c <= 90 ? c - 65 : c >= 97 && c <= 122 ? c - 97 : base;
      if (digit >= base) throw new Error('bad punycode');
      i += digit * w;
      const t = k <= bias ? tMin : k >= bias + tMax ? tMax : k - bias;
      if (digit < t) break;
      w *= base - t;
    }
    const len = out.length + 1; bias = adapt(i - oldi, len, oldi === 0);
    n += Math.floor(i / len); i %= len; out.splice(i++, 0, n);
  }
  return String.fromCodePoint(...out);
}
function labelToUnicode(l) { if (!/^xn--/i.test(l)) return l; try { return punyDecode(l.slice(4).toLowerCase()); } catch (e) { return l; } }

function registeredDomain(labels) {
  if (labels.length <= 2) return { domain: labels.join('.'), sub: [] };
  const last2 = labels.slice(-2).join('.');
  const n = TWO_PART.includes(last2) ? 3 : 2;
  return { domain: labels.slice(-n).join('.'), sub: labels.slice(0, -n) };
}
const IPV4 = /^\d{1,3}(\.\d{1,3}){3}$/;
const isPrivateIp = h => /^(10\.|127\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)/.test(h);
const scriptsOf = s => ['Latin', 'Cyrillic', 'Greek'].filter(x => new RegExp('\\p{Script=' + x + '}', 'u').test(s));
const leet = s => s.replace(/0/g, 'o').replace(/1/g, 'l').replace(/3/g, 'e').replace(/5/g, 's');
// Letters from other alphabets that look like Latin letters (small, incomplete list), used to compare names with brands.
const CONFUSABLE = { 'а': 'a', 'е': 'e', 'о': 'o', 'р': 'p', 'с': 'c', 'у': 'y', 'х': 'x', 'і': 'i', 'ј': 'j', 'ӏ': 'l',
  'ԁ': 'd', 'ѕ': 's', 'ԛ': 'q', 'ԝ': 'w', 'һ': 'h', 'ɡ': 'g', 'ο': 'o', 'α': 'a', 'ν': 'v', 'ρ': 'p', 'ι': 'i', 'κ': 'k', 'τ': 't' };
const skeleton = s => leet([...s.toLowerCase()].map(c => CONFUSABLE[c] || c).join(''));
// One edit apart (insert, delete or change one letter): "paypall", "amazom", "gooogle".
function oneEdit(a, b) {
  if (a === b || Math.abs(a.length - b.length) > 1) return false;
  let i = 0, j = 0, diff = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++diff > 1) return false;
    if (a.length > b.length) i++; else if (b.length > a.length) j++; else { i++; j++; }
  }
  return diff + (a.length - i) + (b.length - j) <= 1;
}
// Returns the brand a name imitates, or '' (the registered domain must not be one of that brand's real domains).
function lookalikeBrand(label, domain) {
  const tokens = label.split('-').filter(Boolean);
  for (const tok of tokens) {
    const sk = skeleton(tok);
    const cands = [sk, sk.replace(/rn/g, 'm').replace(/vv/g, 'w'), sk.replace(/i/g, 'l'), sk.replace(/l/g, 'i')];
    for (const brand in BRANDS) {
      if (BRANDS[brand].includes(domain) || tok === brand) continue;
      if (cands.includes(brand) || (brand.length >= 6 && sk.length >= 5 && oneEdit(sk, brand))) return brand;
    }
  }
  return '';
}

function analyzeUrl(raw) {
  const errors = [];
  const input = String(raw == null ? '' : raw).trim();
  if (!input) return { ok: false, errors: ['Paste a link to check.'] };
  if (input.length > URL_CONFIG.maxLength) return { ok: false, errors: ['That link is too long to check (over ' + URL_CONFIG.maxLength + ' characters).'] };
  if (/[\u0000-\u001f\u007f]/.test(input)) return { ok: false, errors: ['The link contains hidden control characters, which is itself unusual. Do not open it.'] };
  if (/\s/.test(input)) return { ok: false, errors: ['The text contains spaces. Paste only the link, without the rest of the message.'] };

  const findings = [];
  const add = (id, pts, title, found, why, could, action) => findings.push({ id, pts, title, found, why, could, action });
  const base = { ok: true, input, limitations: URL_LIMITATIONS, notChecked: ['Website reputation', 'Security certificate', 'Redirects', 'Domain age and ownership', 'Page content'] };

  // Links that run code or embed content instead of pointing to a website
  if (/^(javascript|data|vbscript):/i.test(input)) {
    add('code-link', URL_CONFIG.pts.codeLink, 'Not a website address', 'This starts with "' + input.split(':')[0].toLowerCase() + ':", which is not a normal web link.',
      'These link types can run code or show content created by the sender instead of opening a website.', 'Running the code could change a page or capture what you type.',
      'Do not open or paste it anywhere. Delete the message.');
    return finalize({ ...base, scheme: input.split(':')[0].toLowerCase(), parts: null, host: '', domain: '' }, findings);
  }
  if (/^(mailto|tel|sms|file|blob):/i.test(input) || (/^[a-z][a-z0-9+.-]*:\/\//i.test(input) && !/^https?:\/\//i.test(input))) {
    return { ok: false, errors: ['NetSafe checks web links that start with http:// or https://, or plain website names.'] };
  }

  const hasScheme = /^https?:\/\//i.test(input);
  let u;
  try { u = new URL(hasScheme ? input : 'https://' + input.replace(/^\/\//, '')); } catch (e) { return { ok: false, errors: ['This could not be read as a web link. Check for typing mistakes.'] }; }
  const host = u.hostname.replace(/\.$/, '').toLowerCase();
  if (!host) return { ok: false, errors: ['No website name was found in this link.'] };
  const scheme = hasScheme ? u.protocol.replace(':', '') : null;
  const isIpv6 = host.startsWith('[');
  const isIp = IPV4.test(host) || isIpv6;
  const labels = isIp ? [host] : host.split('.');
  const unicodeLabels = labels.map(labelToUnicode);
  let rd = isIp ? { domain: host, sub: [] } : registeredDomain(labels);
  const fh = isIp ? '' : (FREE_HOSTS.find(f => host === f || host.endsWith('.' + f)) || '');
  const freeHost = fh && (host !== fh || fh.split('.').length > 2) ? fh : '';
  if (freeHost && host !== fh) {   // name.pages.dev: the person's own part is the site name
    const own = host.slice(0, -(fh.length + 1)).split('.');
    rd = { domain: own[own.length - 1] + '.' + fh, sub: own.slice(0, -1) };
  }
  const tld = isIp ? '' : labels[labels.length - 1];

  // 1. HTTP vs HTTPS
  if (scheme === 'http') add('http', URL_CONFIG.pts.http, 'Not encrypted (HTTP)', 'The link starts with http://, not https://.',
    'HTTP does not encrypt what you send. Anyone on the same network can read or change it.', 'Passwords or card details typed on the page could be seen by others.',
    'Do not enter any personal information on this page. Look for the same site starting with https://.');
  // 2. IP address host
  if (isIp) {
    const priv = !isIpv6 && isPrivateIp(host);
    add('ip', URL_CONFIG.pts.ip, 'Numbers instead of a website name', 'The link goes to ' + host + (priv ? ', an address on a private or local network' : '') + '.',
      'Real services almost always use a name. Links made of numbers are common in scams and hide who runs the site.', 'You could land on a page that copies a real login page.',
      'Do not log in through this link. Go to the service by typing its official address yourself.');
  }
  // 3. Text before @ (userinfo trick)
  if (u.username || u.password) add('userinfo', URL_CONFIG.pts.userinfo, 'Misleading "@" in the link', 'Text before the @ ("' + decodeURIComponent(u.username).slice(0, 40) + '") is ignored. The link really goes to ' + host + '.',
    'Attackers put a trusted name first so the link looks like it goes there.', 'You might think you are on a trusted site when you are not.',
    'Look only at the part after the @. Do not open the link unless you recognise that site.');
  // 4. Punycode and look-alike characters
  const idn = labels.filter(l => /^xn--/i.test(l));
  if (idn.length) {
    const shown = unicodeLabels.join('.');
    const mixed = unicodeLabels.some(l => scriptsOf(l).length > 1);
    add('punycode', URL_CONFIG.pts.punycode, 'International characters in the name', 'The name is written in a special encoded form (' + host + ') and displays as "' + shown + '".',
      'Some letters from other alphabets look identical to English letters, so a fake name can look just like a real one.', 'A look-alike name could imitate a trusted site.',
      'Compare the name with the real site letter by letter, or type the real address yourself.');
    if (mixed) add('mixed-script', URL_CONFIG.pts.mixedScript, 'Letters from different alphabets mixed in one word', 'One part of the name mixes alphabets (for example Latin and Cyrillic).',
      'Real brands rarely do this. It is a typical look-alike trick.', 'The name may be imitating another site.', 'Treat the link with extra caution and do not enter any information.');
  }
  // 5. URL shorteners
  if (!isIp && SHORTENERS.includes(rd.domain)) add('shortener', URL_CONFIG.pts.shortener, 'Shortened link', rd.domain + ' is a link-shortening service. The real destination is hidden.',
    'You cannot see where the link leads before opening it. NetSafe does not open or expand links.', 'It could lead anywhere, including a fake login page.',
    'Ask the sender for the full link, or use a link-expander service you trust that shows the destination without visiting it.');
  // 6. Brand name on someone else's domain
  let brandHit = false;
  if (!isIp) {
    const tokens = host.split(/[.-]/).concat(rd.domain.split('.')[0].replace(/-/g, '')).map(leet);
    for (const brand in BRANDS) {
      const Brand = brand.charAt(0).toUpperCase() + brand.slice(1);
      const hit = tokens.some(t => t === brand || (brand.length >= 5 && t.includes(brand)));
      if (hit && !BRANDS[brand].includes(rd.domain)) {
        add('brand', URL_CONFIG.pts.brand, 'Uses the name "' + Brand + '" on a different website', 'The name "' + Brand + '" appears in the link, but the site the link goes to is ' + rd.domain + '.',
          'The real ' + Brand + ' sites are on a different domain. Putting a trusted name in the address is a common way to look genuine.', 'You could be shown a fake page that collects your login or payment details.',
          'Do not use this link. Open the official ' + Brand + ' app or type its official address yourself.');
        brandHit = true;
        break;
      }
    }
  }
  // 6b. A name that imitates a brand without spelling it exactly (googIe, paypai, amazom, Cyrillic look-alikes)
  if (!isIp && !brandHit) {
    const label = labelToUnicode(rd.domain.split('.')[0]);
    const like = lookalikeBrand(label, rd.domain);
    if (like) {
      const Like = like.charAt(0).toUpperCase() + like.slice(1);
      add('lookalike', URL_CONFIG.pts.lookalike, 'Name imitates "' + Like + '"', 'The site name "' + label + '" looks very similar to ' + Like + ', but the link goes to ' + rd.domain + ', which is not a ' + Like + ' domain NetSafe knows.',
        'Scammers register names one letter off, or with look-alike letters (I for l, rn for m, Cyrillic a for Latin a), so a quick glance reads the real brand.',
        'You could be shown a fake ' + Like + ' page that collects your login or payment details.',
        'Do not use this link. Open the official ' + Like + ' app or type its official address yourself.');
    }
  }
  // 6c. Free hosting platforms and government look-alikes
  if (freeHost) add('free-host', URL_CONFIG.pts.freeHost, 'Free hosting or app-builder address', 'The page is published on ' + freeHost + ', a free service where anyone can create a site in minutes.',
    'Banks, government offices and big companies do not run their login or payment pages on free hosting addresses. Phishing kits are often put there because it is fast and free.',
    'The page could copy a real login or payment page.', 'Do not log in or pay through this link. Go to the organisation\'s official website yourself.');
  if (!isIp) {
    const tokens = host.split(/[.-]/);
    const realGov = GOV_ENDINGS.some(e => host === e || host.endsWith('.' + e));
    if (!realGov && tokens.some(t => ['gov', 'gop', 'govt', 'government', 'sarkar'].includes(t))) add('fake-gov', URL_CONFIG.pts.fakeGov, 'Government-looking name on a non-government address',
      'The name contains a government word, but it does not end in an official government ending such as .gov.pk or .gop.pk.',
      'Fake e-challan, tax refund and aid-scheme sites put "gov" or "gop" in the name to look official.', 'You could pay a fake fine or give your CNIC and bank details to criminals.',
      'Do not use this link. Type the official government website yourself, for example psca.gop.pk or bisp.gov.pk.');
  }
  // 7. Structure
  if (!isIp && rd.sub.length >= 3) add('deep-sub', URL_CONFIG.pts.deepSub, 'Many subdomains', 'There are ' + rd.sub.length + ' extra name parts before ' + rd.domain + '.',
    'Long chains push the real site name out of view. Some legitimate services also use them.', 'The part you recognise may not be the part that decides where you go.', 'Read the name from the right: the last two parts before the first "/" show who runs the site.');
  const hy = (labelToUnicode(rd.domain.split('.')[0]).match(/-/g) || []).length;
  if (!isIp && hy >= 3) add('hyphens', URL_CONFIG.pts.hyphens, 'Many hyphens in the site name', 'The site name has ' + hy + ' hyphens.', 'Long hyphenated names are common in throwaway or imitation sites, but not proof.', 'The name may be built to look official.', 'Prefer the official address you already know.');
  if (host.length > 50) add('long-host', URL_CONFIG.pts.longHost, 'Very long website name', 'The name is ' + host.length + ' characters long.', 'Long names can hide the important part.', 'The real site name may be hard to spot.', 'Check the end of the name carefully.');
  if (!isIp) {
    const knownBrandDomain = Object.values(BRANDS).some(list => list.includes(rd.domain));
    const kw = knownBrandDomain ? [] : KEYWORDS.filter(k => host.includes(k));
    if (kw.length) add('keywords', URL_CONFIG.pts.keywords, 'Account words in the site name', 'The site name contains: ' + kw.join(', ') + '.', 'Sites made to collect logins often include words like these. Legitimate sites can too.', 'It may be trying to look like an official account page.', 'Do not rely on the wording. Check who runs the site.');
    if (RISKY_TLDS.includes(tld)) add('tld', URL_CONFIG.pts.tld, 'Ending ".' + tld + '" is often abused', 'The link ends in .' + tld + '.', 'Cheap or unusual endings are used a lot in scams, but many honest sites use them too.', 'Slightly higher chance the site is throwaway.', 'Treat as a weak signal. Look at the other findings.');
  }
  if (u.port && !['80', '443'].includes(u.port)) add('port', URL_CONFIG.pts.port, 'Unusual port number', 'The link uses port ' + u.port + '.', 'Normal websites rarely need a visible port number.', 'It may be a test or temporary server.', 'Be careful about entering information.');
  if (/%[0-9a-f]{2}/i.test(input.split(/[/?#]/)[hasScheme ? 2 : 0] || '')) add('encoded-host', URL_CONFIG.pts.encodedHost, 'Hidden characters in the site name', 'The site name contains %-encoded characters.', 'Encoding can hide what the name really says.', 'The displayed name may not match the real one.', 'Do not open the link.');
  if (/[?&][^=&]*=[^&]*(https?:)?(%3a|:)(%2f|\/)(%2f|\/)/i.test(u.search)) add('redirect-param', URL_CONFIG.pts.redirectParam, 'Link contains another link', 'The part after "?" contains another web address.', 'Some sites bounce you to the address inside. Scammers use trusted sites this way.', 'You may start on a trusted site and end on another.', 'Be careful if the page asks you to log in after bouncing.');
  if (input.length > 200) add('long-url', URL_CONFIG.pts.longUrl, 'Very long link', 'The link is ' + input.length + ' characters.', 'Long links can hide the important part.', 'Hard to judge by eye.', 'Check the beginning of the link carefully.');

  const q = (u.pathname === '/' && !u.search && !u.hash) ? '' : u.pathname + u.search + u.hash;
  const parts = { scheme: scheme || '', subdomain: rd.sub.join('.'), domain: rd.domain, rest: q.length > 120 ? q.slice(0, 120) + '...' : q };
  return finalize({ ...base, scheme, parts, host, domain: rd.domain, schemeMissing: !hasScheme }, findings);
}

function finalize(res, findings) {
  const score = Math.min(100, findings.reduce((s, f) => s + f.pts, 0));
  const T = URL_CONFIG.thresholds;
  const level = score >= T.high ? 'High' : score >= T.medium ? 'Medium' : 'Low';
  const summary = {
    High: 'Several warning signs in this link. Do not open it or enter any information. Verify through an official channel.',
    Medium: 'Some warning signs in this link. Be careful and verify before opening or entering anything.',
    Low: 'No strong warning signs in the link text. That does not make the site safe: NetSafe could not check the site itself.'
  }[level];
  const notes = [];
  if (res.schemeMissing) notes.push('No http:// or https:// was given, so NetSafe could not judge whether the link is encrypted.');
  if (res.scheme === 'https') notes.push('HTTPS only means the connection is encrypted. Scam sites can use HTTPS too.');
  const prevent = [];
  const ids = findings.map(f => f.id);
  if (ids.some(i => ['brand', 'lookalike', 'fake-gov', 'free-host', 'punycode', 'mixed-script', 'userinfo', 'keywords'].includes(i))) prevent.push('For banks and online accounts, open the official app or type the address yourself instead of tapping links in messages.');
  if (ids.includes('shortener')) prevent.push('Be wary of shortened links from people you do not know.');
  if (ids.includes('http')) prevent.push('Avoid entering personal information on http:// pages.');
  if (!ids.length) prevent.push('Even for links with no warning signs, be careful with messages that rush you or ask for personal information.');
  const ifAlready = level === 'Low' ? [] : ['If you already opened it: do not enter anything more, and close the page. If you typed a password, change it on the real site and turn on multi-factor authentication. If you entered card details, call your bank.'];
  return { ...res, score, level, summary, findings, notes, prevent, ifAlready };
}

const NetSafeUrl = { URL_CONFIG, URL_SIGNALS, BRANDS, analyzeUrl, punyDecode, registeredDomain };
if (typeof module !== 'undefined') module.exports = NetSafeUrl;
