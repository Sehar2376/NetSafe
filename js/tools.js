// Pure helper functions (no DOM) so they can be unit-tested. Nothing here stores or sends data.
function caesar(t, k) {
  return t.replace(/[a-z]/gi, c => { const b = c <= 'Z' ? 65 : 97; return String.fromCharCode(((c.charCodeAt(0) - b + k) % 26 + 26) % 26 + b); });
}
// Kept for backward compatibility: the password logic now lives in password.js (analyzePassword).
function pwStrength(p) {
  const a = (typeof analyzePassword !== 'undefined' ? analyzePassword : require('./password.js').analyzePassword)(p);
  return { score: a.score, category: a.category, tips: a.tips };
}
if (typeof module !== 'undefined') module.exports = { caesar, pwStrength };
