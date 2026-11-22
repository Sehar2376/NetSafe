/* NetSafe password analyzer. HEURISTIC ESTIMATE ONLY: it is not a cracking-time calculation and cannot know whether a
   password has leaked in a breach. Pure logic: the password is never stored, logged or sent anywhere. */
const PW_COMMON = ['password', '123456', '123456789', '12345678', '12345', '1234567', '1234567890', 'qwerty', 'qwerty123', 'abc123', '111111', '000000', '123123', '654321', '121212', '666666',
  'iloveyou', 'admin', 'welcome', 'letmein', 'monkey', 'dragon', 'football', 'baseball', 'sunshine', 'princess', 'master', 'login', 'shadow', 'superman', 'michael', 'trustno1', 'starwars',
  'whatever', 'freedom', 'hello', 'charlie', 'donald', '1q2w3e4r', 'zaq12wsx', 'qazwsx', 'asdfgh', 'asdfghjkl', 'zxcvbnm', 'access', 'flower', 'loveme', 'secret', 'computer', 'internet',
  'cricket', 'guest', 'user', 'test', 'root', 'changeme', 'default', 'wifi', 'wifi123', 'pakistan', 'karachi', 'lahore', 'islamabad', 'allah', 'muhammad', 'bismillah', '786',
  // From NordPass 2025/2026 common-password lists and Pakistani favourites
  'aa123456', '12345678910', 'password1', 'qwertyuiop', 'skibidi', 'naruto', 'pokemon', 'minecraft', 'messi', 'ronaldo', 'babarazam', 'imrankhan', 'pakistan786',
  'pakistanzindabad', '786786', 'peshawar', 'quetta', 'multan', 'faisalabad', 'rawalpindi', 'jannat', 'zindagi', 'mashallah', 'subhanallah'];
const PW_FAMOUS = ['correct horse battery staple', 'correcthorsebatterystaple', 'the quick brown fox', 'let me in', 'open sesame', 'i love you', 'to be or not to be'];
const PW_ROWS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm', '1234567890', 'qazwsxedcrfv', '1q2w3e4r5t'];
const PW_LEET = { '0': 'o', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', '$': 's', '!': 'i' };
const PW_MAX = 256;

// Every check the password analyzer makes, with a made-up example that triggers it. Shown on the Learn page; tests verify each one.
const PW_CHECKS = [
  { id: 'famous', label: 'Famous example phrases', example: 'correct horse battery staple' },
  { id: 'common', label: 'Very common passwords, also with symbol swaps', example: 'P@ssw0rd' },
  { id: 'common-word', label: 'Contains a very common word', example: 'thisisaverylongpassword' },
  { id: 'keyboard', label: 'Keyboard patterns (qwer, asdf ...)', example: 'Xqwerty!9Zk' },
  { id: 'sequence', label: 'Counting or alphabet runs (1234, abcd)', example: 'Zq9987654!x' },
  { id: 'repeat', label: 'Repeated characters or chunks', example: 'aaaaaaaaaaaaaaaa' },
  { id: 'pattern', label: 'One word plus a number (and a symbol)', example: 'Summer2024!' },
  { id: 'personal', label: 'Phone number, CNIC or date of birth', example: '03001234567' },
  { id: 'digits', label: 'Only numbers', example: '7392058461' },
  { id: 'year', label: 'Years and dates', example: 'Zk-1999-Xq' },
  { id: 'short', label: 'Short length (under 12 characters)', example: 'aB3$xY' },
  { id: 'length', label: 'Could be longer (12 to 15 characters)', example: 'xK9mQ2vL7pR4' }
];

function pwVariants(p) {   // lower-case + look-alike substitutions undone (p@ssw0rd -> password), letters and digits only
  const sub = [...p.toLowerCase()].map(c => PW_LEET[c] || c).join('');
  return [sub.replace(/1/g, 'i'), sub.replace(/1/g, 'l'), p.toLowerCase()].map(s => s.replace(/[^a-z0-9]/g, ''));
}
function pwHasRun(p) {      // 4+ characters in a row going up or down by one: abcd, 1234, 4321
  const s = p.toLowerCase(); let run = 1, dir = 0;
  for (let i = 1; i < s.length; i++) {
    const d = s.charCodeAt(i) - s.charCodeAt(i - 1), alnum = /[a-z0-9]/.test(s[i]) && /[a-z0-9]/.test(s[i - 1]);
    if (alnum && (d === 1 || d === -1)) { if (d === dir) run++; else { dir = d; run = 2; } } else { dir = 0; run = 1; }
    if (run >= 4) return true;
  }
  return false;
}
function pwHasWalk(p) {     // 4+ keys in a row on the keyboard, forwards or backwards
  const s = p.toLowerCase();
  return PW_ROWS.some(row => { for (let i = 0; i + 4 <= row.length; i++) { const w = row.slice(i, i + 4); if (s.includes(w) || s.includes([...w].reverse().join(''))) return true; } return false; });
}

function analyzePassword(raw, opts = {}) {
  const p = String(raw == null ? '' : raw).slice(0, PW_MAX);
  if (!p) return { score: 0, category: '', summary: '', issues: [], positives: [], tips: [], length: 0, reuse: false };
  const len = [...p].length, issues = [], positives = [];
  const add = (id, pts, title, why, fix) => issues.push({ id, pts, title, why, fix });
  const vars = pwVariants(p), lower = p.toLowerCase();
  const kinds = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter(r => r.test(p)).length;
  const words = lower.split(/[\s\-_.]+/).filter(w => /^[a-z]{3,}$/.test(w));
  const passphrase = words.length >= 4 && len >= 16;
  let cap = 100;

  // Famous or very common: treat as already known to attackers
  const famous = PW_FAMOUS.includes(lower.trim()) || PW_FAMOUS.includes(vars[2]);
  const exact = vars.some(v => PW_COMMON.includes(v) || PW_COMMON.some(w => w.length >= 4 && v.includes(w) && v.length - w.length <= 4));
  if (famous) { add('famous', 60, 'A well-known example phrase', 'Famous phrases and example passwords are at the top of the lists attackers try first.', 'Choose your own words that are not from a famous quote or example.'); cap = Math.min(cap, 15); }
  else if (exact) { add('common', 60, 'A very common password', 'This is a common password, or one with only a few extra characters added. Attackers try these first.', 'Pick something unrelated to common passwords. A passphrase of 4+ random words works well.'); cap = Math.min(cap, 15); }
  else {
    const hit = passphrase ? null : PW_COMMON.find(w => w.length >= 5 && vars.some(v => v.includes(w)));
    if (hit) { cap = Math.min(cap, 59); add('common-word', 40, 'Contains a very common word ("' + hit + '")', 'Common words are tried first, even with numbers or symbols swapped in (p@ssw0rd).', 'Avoid common words. Use unrelated words or random characters.'); }
  }
  if (pwHasWalk(p)) add('keyboard', 20, 'Keyboard pattern', 'Patterns like qwer or asdf are very predictable.', 'Avoid runs of neighbouring keys.');
  if (pwHasRun(p)) add('sequence', 15, 'Predictable sequence', 'Runs like abcd or 1234 (up or down) are among the first things guessed.', 'Avoid counting or alphabet sequences.');
  const unique = new Set(p).size;
  if (unique * 3 <= len || /(.)\1{3,}/.test(p) || /^(.{1,4})\1{2,}$/.test(p)) { add('repeat', 25, 'Too many repeated characters', 'Repeating characters or chunks adds length without adding unpredictability.', 'Avoid repeated characters or repeated chunks such as abab.'); cap = Math.min(cap, 25); }
  if (/^[A-Za-z]{3,12}[^A-Za-z0-9]?\d{1,4}[^A-Za-z0-9]?$/.test(p) && !passphrase) { add('pattern', 15, 'Common shape: one word, a number, maybe a symbol', 'Attackers know people write "Word2024!" and try this shape early.', 'Use several unrelated words instead of one word plus digits.'); cap = Math.min(cap, 34); }
  else if (/(?:19|20)\d{2}/.test(p) && len < 16) { add('year', 8, 'Contains a year', 'Years and dates are easy to guess, especially birth years.', 'Leave out dates, birthdays and years.'); cap = Math.min(cap, 59); }
  const digitsOnly = p.replace(/[\s-]/g, '');
  const isPhone = /^(?:\+?92|0)3\d{9}$/.test(digitsOnly), isCnic = /^\d{13}$/.test(digitsOnly) || /^\d{5}-\d{7}-\d$/.test(p);
  const isDob = /^(?:0[1-9]|[12]\d|3[01])(?:0[1-9]|1[0-2])(?:19|20)\d{2}$/.test(digitsOnly) || /^(?:19|20)\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])$/.test(digitsOnly);
  if (isPhone || isCnic || isDob) { add('personal', 35, 'Looks like a ' + (isPhone ? 'phone number' : isCnic ? 'CNIC number' : 'date of birth'),
    'Phone numbers, CNIC numbers and birthdays are on your SIM, your documents and your social media, so people around you and attackers can find them.', 'Never use personal numbers or dates as a password.'); cap = Math.min(cap, 15); }
  else if (/^\d+$/.test(p) && len >= 8) { add('digits', 20, 'Only numbers', 'A password of only digits has far fewer combinations than one with letters, so it is guessed much faster.', 'Use words or a mix of letters, numbers and symbols, and make it longer.'); cap = Math.min(cap, 34); }
  if (len < 8) { add('short', 30, 'Very short (' + len + ' characters)', 'Short passwords can be guessed by trying every combination.', 'Use at least 12 characters, ideally 16 or more.'); cap = Math.min(cap, 25); }
  else if (len < 12) { add('short', 15, 'Short (' + len + ' characters)', 'Length is the biggest factor in strength.', 'Use 16+ characters or a passphrase of 4+ words.'); cap = Math.min(cap, 59); }
  else if (len < 16 && !passphrase) { add('length', 5, 'Could be longer (' + len + ' characters)', 'Longer is stronger, and a passphrase is easier to remember.', 'Aim for 16+ characters or 4+ random words.'); }

  let score = Math.min(len, 24) * 4 + kinds * 5 + (passphrase ? 10 : 0);
  score -= issues.reduce((s, i) => s + (i.id === 'short' || i.id === 'length' ? 0 : i.pts), 0);
  score = Math.round(Math.max(0, Math.min(score, cap, 100)));

  if (len >= 16) positives.push('Long (' + len + ' characters). Length matters most.'); else if (len >= 12) positives.push('Reasonable length (' + len + ' characters).');
  if (kinds >= 3) positives.push('Mixes different kinds of characters.');
  if (passphrase) positives.push('Looks like a passphrase of ' + words.length + ' words, which is long and easier to remember.');
  if (!issues.length) positives.push('No common words, sequences or patterns found.');
  const category = score < 35 ? 'Weak' : score < 60 ? 'Fair' : score < 80 ? 'Good' : 'Strong';
  const summary = { Weak: 'Easy to guess. Do not use this password.', Fair: 'Could be guessed with some effort. Make it longer.', Good: 'Decent, but longer or less predictable would be better.', Strong: 'Hard to guess with common methods.' }[category];
  const tips = [...new Set(issues.sort((a, b) => b.pts - a.pts).map(i => i.fix))];
  if (!tips.length) tips.push('Use a different password for every account and turn on multi-factor authentication.');
  return { score, category, summary, issues, positives, tips, length: len, reuse: !!opts.reused };
}
const NetSafePassword = { analyzePassword, PW_CHECKS };
if (typeof module !== 'undefined') module.exports = NetSafePassword;
