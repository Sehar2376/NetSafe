/* NetSafe crypto demos using the browser's real Web Crypto API (crypto.subtle). Educational demo, not an audited tool.
   Everything runs locally. Keys are derived from a passphrase with PBKDF2-SHA-256 and used with AES-256-GCM.
   Packed format: ns1.<pbkdf2 iterations>.<salt>.<iv>.<ciphertext+tag> (base64 parts). Nothing is stored or sent. */
const CR_ITER = 600000, CR_MIN_ITER = 1000, CR_MAX_ITER = 2000000, CR_MAX_TEXT = 2000;
const CR_enc = new TextEncoder(), CR_dec = new TextDecoder('utf-8', { fatal: true });
const crSubtle = () => (typeof globalThis !== 'undefined' && globalThis.crypto && globalThis.crypto.subtle) || null;
const crAvailable = () => !!crSubtle();
const crB64 = u8 => { let s = ''; u8.forEach(b => { s += String.fromCharCode(b); }); return btoa(s); };
const crUnB64 = s => { const b = atob(s); const u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; };
const crErr = (code, msg) => { const e = new Error(msg); e.code = code; return e; };

async function crDeriveKey(pass, salt, iter) {
  const base = await crSubtle().importKey('raw', CR_enc.encode(pass), 'PBKDF2', false, ['deriveKey']);
  return crSubtle().deriveKey({ name: 'PBKDF2', salt, iterations: iter, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}
async function encryptText(text, pass, iter = CR_ITER) {
  if (!crAvailable()) throw crErr('unsupported', 'This page cannot use Web Crypto (it needs HTTPS or localhost).');
  if (!pass) throw crErr('nopass', 'Enter a passphrase first.');
  if (text.length > CR_MAX_TEXT) throw crErr('toolong', 'Message is too long for this demo (max ' + CR_MAX_TEXT + ' characters).');
  const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await crDeriveKey(pass, salt, iter);
  const ct = new Uint8Array(await crSubtle().encrypt({ name: 'AES-GCM', iv }, key, CR_enc.encode(text)));
  return ['ns1', iter, crB64(salt), crB64(iv), crB64(ct)].join('.');
}
async function decryptText(packed, pass) {
  if (!crAvailable()) throw crErr('unsupported', 'This page cannot use Web Crypto (it needs HTTPS or localhost).');
  if (!pass) throw crErr('nopass', 'Enter the passphrase first.');
  const parts = String(packed || '').trim().split('.');
  if (parts.length !== 5 || parts[0] !== 'ns1') throw crErr('format', 'This is not text produced by this demo.');
  const iter = Number(parts[1]);
  if (!Number.isInteger(iter) || iter < CR_MIN_ITER || iter > CR_MAX_ITER) throw crErr('format', 'Unsupported settings in the encrypted text.');
  let salt, iv, ct;
  try { salt = crUnB64(parts[2]); iv = crUnB64(parts[3]); ct = crUnB64(parts[4]); } catch (e) { throw crErr('format', 'The encrypted text is damaged (not valid base64).'); }
  if (salt.length !== 16 || iv.length !== 12 || ct.length < 16) throw crErr('format', 'The encrypted text is incomplete or damaged.');
  const key = await crDeriveKey(pass, salt, iter);
  let plain;
  try { plain = await crSubtle().decrypt({ name: 'AES-GCM', iv }, key, ct); } catch (e) { throw crErr('auth', 'Decryption failed. Either the passphrase is wrong or the data was changed. AES-GCM cannot tell which, and refuses to output anything.'); }
  try { return CR_dec.decode(plain); } catch (e) { throw crErr('auth', 'Decryption produced unreadable data.'); }
}
// Classical Caesar cipher: educational only, trivially breakable (only 25 keys).
function caesar(text, k) {
  return text.replace(/[a-z]/gi, c => { const b = c <= 'Z' ? 65 : 97; return String.fromCharCode(((c.charCodeAt(0) - b + k) % 26 + 26) % 26 + b); });
}
function tamperText(packed) {   // flips the first character of the ciphertext part, to demonstrate integrity protection
  const parts = String(packed || '').trim().split('.');
  if (parts.length !== 5) return packed;
  parts[4] = (parts[4][0] === 'A' ? 'B' : 'A') + parts[4].slice(1);
  return parts.join('.');
}
async function sha256Hex(text) {
  if (!crAvailable()) throw crErr('unsupported', 'This page cannot use Web Crypto (it needs HTTPS or localhost).');
  const d = new Uint8Array(await crSubtle().digest('SHA-256', CR_enc.encode(text)));
  return Array.from(d, b => b.toString(16).padStart(2, '0')).join('');
}
function hammingBits(hexA, hexB) {   // number of differing bits between two equal-length hex strings
  let n = 0;
  for (let i = 0; i < hexA.length; i++) { let x = parseInt(hexA[i], 16) ^ parseInt(hexB[i], 16); while (x) { n += x & 1; x >>= 1; } }
  return n;
}
const NetSafeCrypto = { CR_ITER, caesar, available: crAvailable, encryptText, decryptText, tamperText, sha256Hex, hammingBits };
if (typeof module !== 'undefined') module.exports = NetSafeCrypto;
