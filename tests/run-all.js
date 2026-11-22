// Runs every unit test suite and prints a summary. Usage: node tests/run-all.js   (exit code 1 if anything fails)
const { spawnSync } = require('child_process'); const fs = require('fs'); const path = require('path');
const files = fs.readdirSync(__dirname).filter(f => f.endsWith('.test.js')).sort();
let failed = 0, total = 0; const rows = [];
for (const f of files) {
  const t0 = Date.now(), r = spawnSync(process.execPath, [path.join(__dirname, f)], { encoding: 'utf8' });
  const out = (r.stdout || '') + (r.stderr || ''), passes = (out.match(/^PASS /gm) || []).length;
  const ok = r.status === 0; if (!ok) { failed++; console.log(out.split('\n').filter(l => !/^PASS /.test(l)).join('\n')); }
  total += passes; rows.push([f, ok ? 'ok' : 'FAILED', passes, Date.now() - t0]);
}
console.log('\nSuite'.padEnd(26) + 'Result'.padEnd(9) + 'Named checks'.padEnd(14) + 'ms');
rows.forEach(r => console.log(r[0].padEnd(25) + String(r[1]).padEnd(9) + String(r[2]).padEnd(14) + r[3]));
console.log('\n' + files.length + ' suites, ' + total + ' named PASS checks (plus unnamed assertions inside suites), ' + failed + ' suite(s) failed. Node ' + process.version);
process.exit(failed ? 1 : 0);
