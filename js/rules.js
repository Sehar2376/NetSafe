/* NetSafe scoring rules. Educational, rule-based estimate - NOT a scientific measurement.
   Edit CONFIG to change scoring; everything else reads from it. */
const CONFIG = {
  thresholds: { medium: 25, high: 60 },           // score >= value -> that level
  protocol: { open: 60, wep: 55, wpa: 45, wpa2: 15, wpa3: 5, unknown: 35 },
  noPassword: 25,       // no password = anyone can join and read traffic
  publicNetwork: 25,    // public networks: unknown strangers share the network
  sharedPassword: 15,   // everyone knows the key, so encryption protects little from other users
  captive: { yes: 10, unknown: 5, no: 0 },
  location: { cafe: 3, airport: 3, hotel: 3, university: 2, other: 2, office: 0, home: 0 },
  floors: { open: 'High', wep: 'High', wpa: 'High', unknown: 'Medium' } // minimum level per protocol
};
const ORDER = ['Low', 'Medium', 'High'];
const PROTO_TEXT = {
  open: 'Open network: no encryption, nearby people can read unprotected traffic.',
  wep: 'WEP is broken and can be cracked in minutes.',
  wpa: 'Original WPA (TKIP) is outdated and has known weaknesses.',
  wpa2: 'WPA2 is solid when the password is private and strong.',
  wpa3: 'WPA3 is the strongest current Wi-Fi protection.',
  unknown: 'Security type unknown, so it cannot be treated as safe.'
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
  if (i.sharing && !['private', 'shared'].includes(i.sharing)) e.push('Invalid password sharing option.');
  if (i.protocol === 'open' && i.password === 'yes') e.push('Contradiction: an Open network cannot be password-protected.');
  if (i.password === 'no' && ['wep', 'wpa', 'wpa2', 'wpa3'].includes(i.protocol)) e.push('Contradiction: ' + i.protocol.toUpperCase() + ' requires a password.');
  if (i.password === 'yes' && !i.sharing) e.push('Say whether the password is private or shared publicly.');
  return e;
}

function assess(i) {
  const errors = validate(i);
  if (errors.length) return { ok: false, errors };
  const f = [], concerns = [], recs = [];
  const add = (label, pts, why) => { if (pts > 0) f.push({ label, pts, why }); };
  const p = i.protocol;
  add('Security protocol: ' + p.toUpperCase(), CONFIG.protocol[p], PROTO_TEXT[p]);
  if (i.password === 'no') add('No password', CONFIG.noPassword, 'Anyone can join without authentication.');
  if (i.type === 'public') add('Public network', CONFIG.publicNetwork, 'Strangers share this network with you.');
  if (i.password === 'yes' && i.sharing === 'shared') add('Shared public password', CONFIG.sharedPassword, 'Everyone who knows the password can potentially monitor others on the network.');
  add('Captive portal: ' + i.captive, CONFIG.captive[i.captive], i.captive === 'yes' ? 'Login pages can be imitated by fake hotspots, and some do not use HTTPS.' : 'Unconfirmed login page behaviour.');
  add('Location: ' + i.location, CONFIG.location[i.location], 'Shared places mean more unknown devices on the same network.');
  const score = Math.min(100, f.reduce((s, x) => s + x.pts, 0));
  let level = score >= CONFIG.thresholds.high ? 'High' : score >= CONFIG.thresholds.medium ? 'Medium' : 'Low';
  let floorNote = '';
  const floor = CONFIG.floors[p];
  if (floor && ORDER.indexOf(level) < ORDER.indexOf(floor)) { level = floor; floorNote = 'Level raised to ' + floor + ' because of the ' + p.toUpperCase() + ' protocol, whatever the score.'; }
  if (['open', 'wep', 'wpa'].includes(p)) concerns.push(PROTO_TEXT[p]);
  if (p === 'unknown') concerns.push(PROTO_TEXT.unknown);
  if (i.type === 'public') concerns.push('Public networks expose you to other users on the same network.');
  if (i.sharing === 'shared') concerns.push('The password is shared widely, so it gives limited privacy from other users.');
  if (i.captive === 'yes') concerns.push('You reported a captive portal: never enter a password you use elsewhere on a Wi-Fi login page.');
  if (i.captive === 'unknown') concerns.push('Captive portal status unknown.');
  const pub = i.type === 'public', weak = ['open', 'wep', 'wpa'].includes(p);
  if (level === 'High') recs.push('Avoid banking, shopping and logins on this network.', 'Use mobile data for anything sensitive.');
  else if (level === 'Medium') recs.push('Avoid banking and other sensitive logins unless you use mobile data or a trusted VPN.');
  if (level !== 'Low' && !(level === 'Medium' && recs.length)) recs.push('Use a trusted VPN if you must connect.');
  if (weak || p === 'unknown' || i.password === 'no') recs.push('Only use websites showing HTTPS (padlock); do not ignore browser certificate warnings.');
  if (pub || p === 'unknown') recs.push('Confirm the exact network name with staff to avoid fake hotspots.');
  if (pub) recs.push('Turn off file sharing and auto-connect to open networks on your device.');
  if (i.sharing === 'shared') recs.push('Treat the shared password as public: other users know it too.');
  if (p === 'unknown') recs.push('Check the security type in your device Wi-Fi settings, then assess again.');
  if (weak) recs.push('If you own this network, switch the router to WPA3 or WPA2-AES.');
  if (level === 'Low') recs.push('Lower risk is not "safe": keep devices updated and prefer HTTPS sites.');
  return { ok: true, score, level, factors: f, concerns, recs, floorNote, limitations: LIMITATIONS };
}

const NetSafeRules = { CONFIG, validate, assess };
if (typeof module !== 'undefined') module.exports = NetSafeRules;
