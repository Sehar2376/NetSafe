// Static audit of the shipped code. Fails if any banned API or unsafe pattern appears. Run: node tests/audit.test.js
const assert = require('assert'); const fs = require('fs'); const path = require('path');
const root = path.join(__dirname, '..'), jsDir = path.join(root, 'js');
const strip = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`\\])\/\/.*$/gm, '$1');   // comments removed so only real code is checked
const BANNED = [['localStorage', /localStorage/], ['sessionStorage', /sessionStorage/], ['IndexedDB', /indexedDB/], ['cookies', /document\.cookie/], ['fetch', /\bfetch\s*\(/], ['XMLHttpRequest', /XMLHttpRequest/], ['sendBeacon', /sendBeacon/], ['WebSocket', /WebSocket/],
  ['console logging', /\bconsole\./], ['eval', /\beval\s*\(/], ['new Function', /new\s+Function/], ['string timers', /set(Timeout|Interval)\s*\(\s*['"`]/], ['innerHTML', /\binnerHTML\b/], ['outerHTML', /\bouterHTML\b/], ['insertAdjacentHTML', /insertAdjacentHTML/], ['document.write', /document\.write/], ['clipboard', /navigator\.clipboard/], ['postMessage', /postMessage/], ['service workers', /serviceWorker/], ['dynamic import', /\bimport\s*\(/]];
const files = fs.readdirSync(jsDir).filter(f => f.endsWith('.js'));
files.forEach(f => { const code = strip(fs.readFileSync(path.join(jsDir, f), 'utf8')); BANNED.forEach(([n, re]) => assert(!re.test(code), f + ' uses ' + n)); });
console.log('PASS ' + files.length + ' script files use none of the ' + BANNED.length + ' banned APIs (storage, network, logging, eval, innerHTML, clipboard, ...)');
// textContent is the only way UI code writes text
const ui = files.filter(f => /-ui\.js$|^app\.js$/.test(f)); ui.forEach(f => assert(/textContent/.test(fs.readFileSync(path.join(jsDir, f), 'utf8')), f + ' should render with textContent'));
console.log('PASS ' + ui.length + ' interface files render text with textContent');
// index.html hygiene
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const csp = (html.match(/Content-Security-Policy"\s+content="([^"]+)"/) || [])[1] || '';
assert(/default-src 'none'/.test(csp) && /script-src 'self'( file:)?;/.test(csp) && !/unsafe-inline|unsafe-eval/.test(csp) && !/(https?:|\*)/.test(csp.replace(/file:/g, '')) && /form-action 'none'/.test(csp) && /base-uri 'none'/.test(csp)); console.log("PASS CSP: default-src none, scripts from self (and local files when opened from disk) only, no unsafe-inline/unsafe-eval, no remote sources, no form-action, no base-uri");
assert(!/connect-src/.test(csp), 'connect-src not set, so default-src none blocks all network requests'); console.log('PASS CSP leaves connect-src unset, so default-src none blocks all outbound requests');
assert(!/<script(?![^>]*\bsrc=)[^>]*>/i.test(html), 'inline script found'); console.log('PASS no inline <script> blocks');
assert(!/\son[a-z]+\s*=\s*["']/i.test(html), 'inline event handler'); console.log('PASS no inline on*= event handler attributes');
assert(!/\sstyle\s*=\s*["']/i.test(html), 'inline style attribute'); console.log('PASS no inline style attributes');
const ext = (html.match(/(?:src|href)\s*=\s*"(https?:)?\/\/[^"]+"/gi) || []); assert(!ext.length, 'external resource: ' + ext); console.log('PASS no external scripts, styles, images or links in index.html');
const scripts = [...html.matchAll(/<script src="([^"]+)"/g)].map(m => m[1]); scripts.forEach(s => assert(fs.existsSync(path.join(root, s)), 'missing ' + s));
files.forEach(f => assert(scripts.includes('js/' + f), f + ' is not loaded by index.html (dead file)')); console.log('PASS every script file is loaded by index.html and every loaded script exists');
assert(/id="boot"/.test(html) && /python serve\.py/.test(html)); console.log('PASS a visible banner explains what to do if the scripts do not run (hidden by nav.js once everything loaded)');
const css = fs.readFileSync(path.join(root, 'css', 'style.css'), 'utf8'); assert(!/url\(\s*['"]?(https?:)?\/\//i.test(css) && !/@import/i.test(css) && [...css.matchAll(/url\(\s*['"]?([^'")]+)/g)].every(m => /^\.\.\/assets\/fonts\/[\w.-]+\.woff2$/.test(m[1]) && fs.existsSync(path.join(root, 'css', m[1])))); console.log('PASS CSS loads nothing external: no @import, no remote url(), fonts only from assets/fonts and present');
console.log('Audit tests passed');
// Deploy checks (Netlify and other Linux hosts are case-sensitive; a wrong letter case gives a 404 and every tool stops)
{ const srcs = [...html.matchAll(/<script\s+src="([^"]+)"/g)].map(m => m[1]);
  assert(srcs.length >= 16 && srcs[0] === 'js/boot.js', 'boot.js must be the first script');
  for (const src of srcs) { const dir = path.join(root, path.dirname(src)); assert(fs.readdirSync(dir).includes(path.basename(src)), 'script not found with exact letter case: ' + src); assert(!/^(\/|https?:)/.test(src), 'script path must be relative: ' + src); }
  assert(!/type="module"/.test(html), 'no ES modules: plain scripts work from file:// and every host');
  console.log('PASS all ' + srcs.length + ' script tags point to existing files with exact letter case, relative paths, boot.js first'); }
{ const toml = fs.readFileSync(path.join(root, 'netlify.toml'), 'utf8');
  assert(/publish\s*=\s*"\."/.test(toml) && /skip_processing\s*=\s*true/.test(toml) && /script-src 'self'/.test(toml), 'netlify.toml');
  console.log('PASS netlify.toml publishes this folder, turns off asset processing and sends the security policy'); }
