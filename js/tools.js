// Pure helper functions (no DOM) so they can be unit-tested. Nothing here stores or sends data.
function caesar(t, k) {
  return t.replace(/[a-z]/gi, c => { const b = c <= 'Z' ? 65 : 97; return String.fromCharCode(((c.charCodeAt(0) - b + k) % 26 + 26) % 26 + b); });
}
const COMMON = ['password', 'qwerty', '123456', 'letmein', 'admin', 'welcome', 'iloveyou', 'wifi', 'abc123'];
// Heuristic estimate only - not a cracking-time calculation.
function pwStrength(p) {
  const tips = []; if (!p) return { score: 0, category: '', tips };
  const unique = new Set(p).size;               // repeated characters add little strength
  let s = Math.min(unique, 16) * 4 + (p.length >= 20 ? 15 : 0);
  const kinds = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter(r => r.test(p)).length; s += kinds * 8;
  if (p.length < 12) tips.push('Use 12+ characters');
  if (kinds < 3 && p.length < 20) tips.push('Mix letters, numbers and symbols');
  if (unique < p.length / 3) tips.push('Too many repeated characters');
  if (/(0123|1234|2345|3456|4567|abcd|qwer|asdf)/i.test(p)) { s -= 15; tips.push('Predictable sequence'); }
  const common = COMMON.some(w => p.toLowerCase().includes(w));
  if (common) { s = Math.min(s - 30, 30); tips.push('Contains a common word'); }   // common words are always Weak
  s = Math.max(0, Math.min(100, s));
  return { score: s, category: s < 35 ? 'Weak' : s < 60 ? 'Fair' : s < 80 ? 'Good' : 'Strong', tips };
}
if (typeof module !== 'undefined') module.exports = { caesar, pwStrength };
