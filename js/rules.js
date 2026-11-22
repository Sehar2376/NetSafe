/* NetSafe scoring rules. Educational, rule-based estimate - NOT a scientific measurement.
   Edit CONFIG to change scoring; everything else reads from it. */
const CONFIG = {
  thresholds: { medium: 25, high: 60 },           // score >= value -> that level
  protocol: { open: 60, wep: 55, wpa: 45, wpa2: 15, wpa2wpa3: 12, wpa3: 5, owe: 20, enterprise: 8, unknown: 35 },
  noPassword: 25,       // no password = anyone can join
  noPasswordOwe: 5,     // Enhanced Open (OWE) has no password but still encrypts each device's traffic
  publicNetwork: 20,    // public networks: unknown people share the network (not automatically dangerous)
  publicEnterprise: 10, // Enterprise logins give each person their own credentials and keys
  sharedPassword: 15,   // everyone knows the key
  sharedApplies: ['wep', 'wpa', 'wpa2', 'wpa2wpa3'], // WPA3 (SAE) and Enterprise give each device its own keys, so a shared password matters much less
  captive: { yes: 5, unknown: 3, no: 0 },
  freeName: 5,          // public network with a generic "free" name, easy for a fake hotspot to copy
  defaultName: 5,       // private router still using its factory name (the default admin password is often unchanged too)
  location: { cafe: 3, airport: 3, hotel: 3, university: 2, other: 2, office: 0, home: 0 },
  floors: { open: 'High', wep: 'High', wpa: 'High', unknown: 'Medium' }, // minimum level per protocol
  ceilings: { unknown: 'Medium' } // not knowing the security type is not proof of danger: hold at Medium when a password exists
};
const ORDER = ['Low', 'Medium', 'High'];
const FREE_NAME = /(?:^|[^a-z])free(?:[^a-z]|$)|free_?wi-?fi|^(?:wi-?fi|public[-_ ]?wi-?fi)$/i;
const DEFAULT_NAME = /^(?:ptcl[-_ ]?bb|ptcl|tp-?link[-_ ]|netgear|d-?link|dlink|tenda[-_ ]|huawei[-_ ]|zte[-_ ]|linksys|asus[-_ ]?|xiaomi[-_ ]|redmi[-_ ]|mi[-_ ]router|jazz[-_ ]?4g|zong[-_ ]?4g|nayatel|stormfiber|optix|fiberhome|wi-?fi[-_ ]?[0-9a-f]{4})/i;
const PROTO_NAME = { open: 'Open', wep: 'WEP', wpa: 'WPA', wpa2: 'WPA2', wpa2wpa3: 'WPA2/WPA3', wpa3: 'WPA3', owe: 'Enhanced Open', enterprise: 'Enterprise', unknown: 'Unknown' };
const PROTO_TEXT = {
  open: 'Open network: no encryption, nearby people can read unprotected traffic.',
  wep: 'WEP is broken and can be cracked in minutes.',
  wpa: 'Original WPA (TKIP) is outdated and has known weaknesses.',
  wpa2: 'WPA2 is solid when the password is private and strong.',
  wpa2wpa3: 'WPA2/WPA3 mixed mode: supports WPA3, but older devices may connect with WPA2.',
  wpa3: 'WPA3 is the strongest current Wi-Fi protection for personal networks.',
  owe: 'Enhanced Open encrypts traffic without a password, but cannot prove the network is genuine.',
  enterprise: 'Enterprise security gives each person their own login and encryption keys.',
  unknown: 'Security type unknown, so it cannot be treated as safe.'
};
const WIFI_NOT_CHECKED = ['Whether this is the genuine network (a fake hotspot can copy a name)', 'Whether the security type you entered is correct', 'How well the router is set up or updated', 'Other devices on the network', 'The websites and apps you use'];
// Explanations in the same what / why / what could happen / what to do shape as the other NetSafe tools.
const WIFI_FINDINGS = {
  open: ['No encryption (open network)', 'The network is open, so traffic is not scrambled over the air.', 'Anyone nearby can capture unencrypted traffic, and anyone can create a fake network with the same name.', 'Logins on pages without HTTPS could be seen or changed, and the sites you visit can be seen.', 'Use mobile data or a protected network for anything sensitive. If you must connect, stick to HTTPS sites and avoid banking and work logins.'],
  wep: ['Outdated WEP security', 'The network uses WEP.', 'WEP is broken. Free tools can recover its key in minutes.', 'Others nearby could read your traffic as if the network were open.', 'Do not rely on this network for anything sensitive. If you own it, change the router to WPA3, or WPA2 with AES.'],
  wpa: ['Outdated WPA security', 'The network uses the original WPA.', 'Original WPA (TKIP) has known weaknesses and has been replaced.', 'A determined attacker nearby may break in and read traffic.', 'Avoid sensitive logins on it. If you own it, change the router to WPA3, or WPA2 with AES.'],
  unknown: ['Security type unknown', 'You said you do not know the security type.', 'Without knowing it, NetSafe cannot say whether traffic is encrypted.', 'The network could be open or use outdated security.', 'Check the security type in your device Wi-Fi settings, then assess again.'],
  owe: ['Encrypted, but the network is not verified', 'The network uses Enhanced Open: encrypted, with no password.', 'It stops other users passively listening in, but it cannot prove the network is the genuine one.', 'A fake hotspot with the same name could still be joined by mistake.', 'Check the exact network name with staff and stick to HTTPS sites.'],
  nopass: ['No password', 'The network does not need a password.', 'There is no check on who joins the network.', 'Anyone, including an attacker, can join and look for other devices on it.', 'Turn off file sharing and avoid sensitive logins.'],
  public: ['Public network', 'You said this network is open to guests.', 'People you do not know share the network. Public does not automatically mean unsafe: the security type and how the password is shared matter more.', 'Another user, or a careless operator, could try to reach your device or run a fake login page.', 'Turn off file sharing and auto-connect, and use HTTPS sites.'],
  shared: ['Password shared with everyone', 'The password is public (a sign, a receipt, word of mouth).', 'On this kind of network, anyone who knows the password may be able to read other users\' traffic.', 'Another guest could watch traffic on pages that are not HTTPS.', 'Treat it like an open network: stick to HTTPS sites and avoid sensitive logins. WPA3 would protect you better.'],
  'free-name': ['Generic "free" network name', 'The network name looks like a generic free or guest hotspot.', 'Names like "Free WiFi" or "Airport_Free_WiFi" are the easiest to copy. Fake hotspots (evil twins) use them to attract people.', 'You could join a fake network run by an attacker who sees or changes your traffic.', 'Ask staff for the exact network name, turn off auto-connect, and use mobile data for anything sensitive.'],
  'default-name': ['Router still uses its factory name', 'The network name looks like a router or provider default (for example PTCL-BB or TP-Link_1234).', 'A default name tells attackers the router model. Routers left with a default name often still have the default admin password and old firmware.', 'Someone nearby could log in to the router and change its settings.', 'Change the network name, the Wi-Fi password and the router admin password, and update the router firmware.'],
  captive: ['Login page after connecting (captive portal)', 'You reported a login page after connecting.', 'Fake hotspots copy these pages to collect details, and some real ones do not use HTTPS.', 'A fake page could capture an email address, a password you reuse, or card details.', 'Never enter a password you use elsewhere. Give only what is needed, such as a room number.']
};
const LIMITATIONS = [
  'NetSafe only evaluates what you type. It does not scan or test any network.',
  'It cannot detect an evil twin (a fake hotspot copying a real name) from typed input.',
  'The score is an educational estimate, not proof that a network is safe or unsafe.'
];

function validate(i) {
  const e = [];
  const req = { ssid: 'Network name', type: 'Network type', password: 'Password protection', protocol: 'Security protocol', location: 'Location', captive: 'Captive portal' };
  for (const k in req) if (!i[k] || !String(i[k]).trim()) e.push(req[k] + ' is required.');
  const ssid = String(i.ssid || '');
  if (new TextEncoder().encode(ssid).length > 32) e.push('Network name must be 32 bytes or fewer (about 32 characters for plain English names).');
  if (/[\u0000-\u001f]/.test(ssid)) e.push('Network name contains invalid characters.');
  // Own-property checks only: `in` would accept inherited names like "constructor" and score them as safe.
  const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
  if (i.protocol && !own(CONFIG.protocol, i.protocol)) e.push('Unknown security protocol value.');
  if (i.type && !['public', 'private'].includes(i.type)) e.push('Invalid network type.');
  if (i.password && !['yes', 'no'].includes(i.password)) e.push('Invalid password option.');
  if (i.location && !own(CONFIG.location, i.location)) e.push('Invalid location.');
  if (i.captive && !own(CONFIG.captive, i.captive)) e.push('Invalid captive portal option.');
  if (i.sharing && !['private', 'shared', 'individual'].includes(i.sharing)) e.push('Invalid password sharing option.');
  if (i.protocol === 'open' && i.password === 'yes') e.push('Contradiction: an Open network cannot be password-protected.');
  if (i.password === 'no' && ['wep', 'wpa', 'wpa2', 'wpa2wpa3', 'wpa3', 'enterprise'].includes(i.protocol)) e.push('Contradiction: ' + (PROTO_NAME[i.protocol] || i.protocol.toUpperCase()) + ' requires a password or login.');
  if (i.password === 'yes' && i.protocol === 'owe') e.push('Contradiction: Enhanced Open has no password.');
  if (i.protocol === 'enterprise' && i.sharing === 'shared') e.push('Contradiction: Enterprise networks use individual logins, not one shared password.');
  if (i.password === 'yes' && !i.sharing) e.push('Say whether the password is private or shared publicly.');
  return e;
}

function assess(i) {
  const errors = validate(i);
  if (errors.length) return { ok: false, errors };
  const f = [], concerns = [], recs = [], findings = [], positives = [];
  const p = i.protocol, pub = i.type === 'public', weak = ['open', 'wep', 'wpa'].includes(p);
  const add = (label, pts, why) => { if (pts > 0) f.push({ label, pts, why }); };
  const find = (key, pts) => { const t = WIFI_FINDINGS[key]; findings.push({ id: key, pts, title: t[0], found: t[1], why: t[2], could: t[3], action: t[4] }); };
  add('Security protocol: ' + PROTO_NAME[p], CONFIG.protocol[p], PROTO_TEXT[p]);
  if (['open', 'wep', 'wpa', 'unknown', 'owe'].includes(p)) find(p, CONFIG.protocol[p]);
  if (i.password === 'no') { const pts = p === 'owe' ? CONFIG.noPasswordOwe : CONFIG.noPassword; add('No password', pts, 'Anyone can join without authentication.'); if (p !== 'open') find('nopass', pts); }
  if (pub) { const pts = p === 'enterprise' ? CONFIG.publicEnterprise : CONFIG.publicNetwork; add('Public network', pts, 'Unknown people share this network with you. Public is not automatically unsafe.'); find('public', pts); }
  const sharedMatters = i.sharing === 'shared' && CONFIG.sharedApplies.includes(p);
  if (sharedMatters) { add('Shared public password', CONFIG.sharedPassword, 'Everyone who knows the password can potentially monitor others on the network.'); find('shared', CONFIG.sharedPassword); }
  const ssidName = String(i.ssid || '');
  const freeName = pub && FREE_NAME.test(ssidName), defaultName = !pub && DEFAULT_NAME.test(ssidName);
  if (freeName) { add('Generic "free" network name', CONFIG.freeName, 'Easy for a fake hotspot to copy.'); find('free-name', CONFIG.freeName); }
  if (defaultName) { add('Factory network name', CONFIG.defaultName, 'Default names often mean default settings and passwords.'); find('default-name', CONFIG.defaultName); }
  if (i.captive === 'yes') find('captive', CONFIG.captive.yes);
  add('Captive portal: ' + i.captive, CONFIG.captive[i.captive], i.captive === 'yes' ? 'Login pages can be imitated by fake hotspots, and some do not use HTTPS.' : 'Unconfirmed login page behaviour.');
  add('Location: ' + i.location, CONFIG.location[i.location], 'Shared places mean more unknown devices on the same network.');
  const score = Math.min(100, f.reduce((s, x) => s + x.pts, 0));
  let level = score >= CONFIG.thresholds.high ? 'High' : score >= CONFIG.thresholds.medium ? 'Medium' : 'Low';
  let floorNote = '';
  const floor = CONFIG.floors[p];
  if (floor && ORDER.indexOf(level) < ORDER.indexOf(floor)) { level = floor; floorNote = 'Level raised to ' + floor + ' because of the ' + PROTO_NAME[p] + ' protocol, whatever the score.'; }
  const ceil = CONFIG.ceilings[p];
  if (ceil && i.password === 'yes' && ORDER.indexOf(level) > ORDER.indexOf(ceil)) { level = ceil; floorNote = 'Level held at ' + ceil + ' because the security type is unknown: it could be better or worse than the score suggests. Find out the type and assess again.'; }
  findings.sort((a, b) => b.pts - a.pts);

  if (weak) concerns.push(PROTO_TEXT[p]);
  if (p === 'unknown') concerns.push(PROTO_TEXT.unknown);
  if (p === 'owe') concerns.push(PROTO_TEXT.owe);
  if (pub) concerns.push('Public networks expose you to other users on the same network.');
  if (sharedMatters) concerns.push('The password is shared widely, so it gives limited privacy from other users.');
  if (i.captive === 'yes') concerns.push('You reported a captive portal: never enter a password you use elsewhere on a Wi-Fi login page.');
  if (i.captive === 'unknown') concerns.push('Captive portal status unknown.');

  if (p === 'wpa3') positives.push('WPA3 gives each device its own encryption keys, so other people on the network cannot easily read your traffic.');
  if (p === 'wpa2') positives.push('WPA2 encrypts your traffic. It is solid when the password is private and strong.');
  if (p === 'wpa2wpa3') positives.push('Supports WPA3, with WPA2 for older devices.');
  if (p === 'enterprise') positives.push('Each person has their own login and keys, which is stronger than one shared password.');
  if (p === 'owe') positives.push('Your traffic is encrypted even though there is no password.');
  if (i.password === 'yes' && i.sharing === 'private') positives.push('Only people you trust know the password.');
  if (i.sharing === 'shared' && !sharedMatters && p !== 'unknown') positives.push('The password is public, but this security type gives each device its own keys, so it matters less.');
  if (i.captive === 'no') positives.push('No login page that could be imitated.');
  if (!pub) positives.push('A private network has fewer unknown users.');

  if (level === 'High') recs.push('Avoid banking, shopping and logins on this network.', 'Use mobile data for anything sensitive.');
  else if (level === 'Medium') recs.push('Avoid banking and other sensitive logins unless you use mobile data or a trusted VPN.');
  if (level !== 'Low' && !(level === 'Medium' && recs.length)) recs.push('Use a trusted VPN if you must connect.');
  if (weak || p === 'unknown' || i.password === 'no') recs.push('Only use websites showing HTTPS (padlock); do not ignore browser certificate warnings.');
  if (pub || p === 'unknown' || p === 'owe') recs.push('Confirm the exact network name with staff to avoid fake hotspots.');
  if (pub) recs.push('Turn off file sharing and auto-connect to open networks on your device.');
  if (i.sharing === 'shared') recs.push('Treat the shared password as public: other users know it too.');
  if (p === 'unknown') recs.push('Check the security type in your device Wi-Fi settings, then assess again.');
  if (weak) recs.push('If you own this network, switch the router to WPA3 or WPA2-AES.');
  if (freeName) recs.push('Ask staff for the exact network name before joining a "free" network.');
  if (defaultName) recs.push('Change the router network name and admin password, turn off WPS, and update the firmware.');
  if (level === 'Low') recs.push('Lower risk is not "safe": keep devices updated and prefer HTTPS sites.');

  const guidance = { Low: 'Fine for everyday use such as browsing, streaming and email. Keep your device updated and use HTTPS sites.',
    Medium: 'Fine for casual browsing and streaming. For banking, work or important account logins, use mobile data or a trusted VPN.',
    High: 'Avoid logging in to anything important. Use mobile data instead, or a trusted VPN with HTTPS sites if you have no choice.' }[level];
  const contextNote = pub ? 'Public does not automatically mean dangerous. The security type and how the password is shared matter more than the word "public".' : '';
  const prevent = [];
  if (weak || p === 'unknown') prevent.push('Prefer networks secured with WPA2 or WPA3, and avoid open ones for anything sensitive.');
  if (pub) prevent.push('When away from home, use mobile data or a trusted VPN for banking and work logins.');
  if (i.captive === 'yes') prevent.push('Never reuse an important password on a Wi-Fi login page.');
  if (sharedMatters) prevent.push('A password printed on a sign gives no privacy from other guests on this type of network.');
  return { ok: true, score, level, factors: f, concerns, recs, floorNote, findings, positives, guidance, contextNote, prevent,
    summaryLabel: (pub ? 'Public' : 'Private') + ' network, ' + PROTO_NAME[p],   // no network name: it is not kept in the overview
    limited: p === 'unknown', limitedReason: p === 'unknown' ? 'The security type was unknown, so this result is limited.' : '',
    topAction: findings.length ? findings[0].action : '', limitations: LIMITATIONS, notChecked: WIFI_NOT_CHECKED };
}

const NetSafeRules = { CONFIG, validate, assess };
if (typeof module !== 'undefined') module.exports = NetSafeRules;
