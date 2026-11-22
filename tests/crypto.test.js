// Run: node tests/crypto.test.js (needs Node 20+ for global Web Crypto)
const assert = require('assert'); const C = require('../js/crypto.js');
const FAST = 2000;   // low PBKDF2 iterations so tests are quick; one test uses the real default
const run = async () => {
  const t = async (name, fn) => { await fn(); console.log('PASS', name); };
  await t('Caesar: shifts letters, keeps case and punctuation', async () => { assert.strictEqual(C.caesar('ABC xyz!', 3), 'DEF abc!'); assert.strictEqual(C.caesar('A', -25), 'B'); });
  await t('Caesar: decrypting undoes encrypting for every shift', async () => { for (let k = 1; k <= 25; k++) assert.strictEqual(C.caesar(C.caesar('Meet at the Cafe, 9pm', k), -k), 'Meet at the Cafe, 9pm'); });
  await t('Web Crypto is available', async () => assert(C.available()));
  await t('SHA-256 of "abc" matches the standard test vector', async () => assert.strictEqual(await C.sha256Hex('abc'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'));
  await t('SHA-256 of empty string matches the standard test vector', async () => assert.strictEqual(await C.sha256Hex(''), 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'));
  await t('SHA-256 handles unicode', async () => assert.strictEqual((await C.sha256Hex('\u00fc\u2713')).length, 64));
  await t('avalanche: one extra character changes about half the bits', async () => { const d = C.hammingBits(await C.sha256Hex('abc'), await C.sha256Hex('abc.')); assert(d > 90 && d < 166, 'bits ' + d); });
  await t('hammingBits basics', async () => { assert.strictEqual(C.hammingBits('00', '00'), 0); assert.strictEqual(C.hammingBits('0f', 'f0'), 8); });
  await t('encrypt then decrypt round trip (unicode)', async () => { const p = await C.encryptText('h\u00e9llo \u2713 \u{1F512}', 'demo passphrase', FAST); assert.strictEqual(await C.decryptText(p, 'demo passphrase'), 'h\u00e9llo \u2713 \u{1F512}'); });
  await t('round trip with the real default iteration count', async () => { const p = await C.encryptText('hello', 'pw'); assert(p.startsWith('ns1.' + C.CR_ITER + '.')); assert.strictEqual(await C.decryptText(p, 'pw'), 'hello'); });
  await t('empty message round trip', async () => assert.strictEqual(await C.decryptText(await C.encryptText('', 'pw', FAST), 'pw'), ''));
  await t('same message encrypts differently each time (random salt and nonce)', async () => assert.notStrictEqual(await C.encryptText('same', 'pw', FAST), await C.encryptText('same', 'pw', FAST)));
  await t('plaintext does not appear in the output', async () => assert(!(await C.encryptText('SecretMessage', 'pw', FAST)).includes('SecretMessage')));
  await t('wrong passphrase is rejected, code auth', async () => { const p = await C.encryptText('hi', 'right', FAST); await assert.rejects(C.decryptText(p, 'wrong'), e => e.code === 'auth'); });
  await t('tampered ciphertext is rejected, code auth', async () => { const p = await C.encryptText('hi', 'pw', FAST); assert.notStrictEqual(C.tamperText(p), p); await assert.rejects(C.decryptText(C.tamperText(p), 'pw'), e => e.code === 'auth'); });
  await t('tampering with the salt or nonce is also rejected', async () => { const p = (await C.encryptText('hi', 'pw', FAST)).split('.'); p[3] = (p[3][0] === 'A' ? 'B' : 'A') + p[3].slice(1); await assert.rejects(C.decryptText(p.join('.'), 'pw'), e => e.code === 'auth'); });
  await t('garbage input gives a format error, not a crash', async () => { for (const g of ['', 'hello', 'ns1.a.b', 'ns2.2000.a.b.c', 'ns1.2000.!!.!!.!!', null, undefined]) await assert.rejects(C.decryptText(g, 'pw'), e => e.code === 'format'); });
  await t('absurd iteration counts are refused (no denial of service)', async () => { for (const n of ['1', '999999999', '-5', 'abc']) await assert.rejects(C.decryptText('ns1.' + n + '.AAAAAAAAAAAAAAAAAAAAAA==.AAAAAAAAAAAAAAAA.AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==', 'pw'), e => e.code === 'format'); });
  await t('empty passphrase refused', async () => { await assert.rejects(C.encryptText('x', '', FAST), e => e.code === 'nopass'); await assert.rejects(C.decryptText('x', ''), e => e.code === 'nopass'); });
  await t('over-long message refused', async () => assert.rejects(C.encryptText('a'.repeat(2001), 'pw', FAST), e => e.code === 'toolong'));
  await t('tamperText leaves malformed input alone', async () => assert.strictEqual(C.tamperText('abc'), 'abc'));
  console.log('Crypto tests passed');
};
run().catch(e => { console.error('FAIL', e); process.exit(1); });
