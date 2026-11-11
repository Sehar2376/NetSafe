// Run: node tests/tools.test.js
const assert = require('assert'); const { caesar, pwStrength } = require('../js/tools.js');
assert.strictEqual(caesar('ABC xyz!', 3), 'DEF abc!');
assert.strictEqual(caesar(caesar('Meet at the Cafe, 9pm', 7), -7), 'Meet at the Cafe, 9pm');
assert.strictEqual(caesar('A', -25), 'B');
for (let k = 1; k <= 25; k++) assert.strictEqual(caesar(caesar('Hello', k), -k), 'Hello');
const cat = p => pwStrength(p).category;
assert.strictEqual(cat('Password1!'), 'Weak'); assert.strictEqual(cat('aaaaaaaaaaaaaaaa'), 'Weak');
assert.strictEqual(cat('12345678'), 'Weak'); assert.strictEqual(cat('abc'), 'Weak');
assert.strictEqual(cat('Tr4in-Lamp!Orbit#92x'), 'Strong'); assert.strictEqual(cat('correct horse battery staple'), 'Strong');
assert.strictEqual(pwStrength('').category, '');
assert(!pwStrength('correct horse battery staple').tips.some(t => /repeated/.test(t)));   // regression: no false tip on a strong passphrase
assert(pwStrength('abababababababab').tips.some(t => /repeated/.test(t)));
console.log('Tools tests passed');
