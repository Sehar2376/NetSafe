// Start-up diagnostics. Loaded first. If any NetSafe tool fails to start, the "tools are not running" banner lists exactly
// which file failed and why (not found, blocked by the security policy, or a script error), so a broken deploy can be fixed.
// It never hides the banner: nav.js hides it only when every part of NetSafe has loaded. Nothing is stored or sent.
(() => {
  document.documentElement.classList.add('js');   // JavaScript works: hide the banner from the first paint (see style.css)
  const problems = [];
  const note = text => { if (problems.indexOf(text) < 0) problems.push(text); };
  const short = url => { try { const u = new URL(url, location.href); return u.origin === location.origin ? u.pathname.replace(/^\//, '') : u.href; } catch (e) { return String(url); } };

  // A <script> or stylesheet that could not be downloaded (404, wrong folder, wrong letter case, network error)
  window.addEventListener('error', e => {
    const t = e.target;
    if (t && t !== window && (t.tagName === 'SCRIPT' || t.tagName === 'LINK')) note(short(t.src || t.href) + ': could not be loaded (file missing, wrong folder or letter case, or blocked).');
    else if (e.filename) note(short(e.filename) + ' line ' + e.lineno + ': ' + (e.message || 'script error') + '.');
  }, true);
  // A file that exists but was refused by the Content-Security-Policy (for example a host rewrote it to another domain)
  document.addEventListener('securitypolicyviolation', e => {
    note(short(e.blockedURI || 'a file') + ': blocked by the security policy (' + e.violatedDirective + '). Scripts must come from this website itself.');
  });

  // Each engine file defines one global name. If it is missing after loading, that file did not run.
  // typeof on a name that was never declared is safe; a file that crashed half-way can leave its name unusable, so each check is guarded.
  const has = fn => { try { return fn() !== 'undefined'; } catch (e) { return false; } };
  const PARTS = [[() => typeof NetSafeRules, 'js/rules.js'], [() => typeof NetSafeUrl, 'js/url.js'], [() => typeof NetSafeMessage, 'js/message.js'], [() => typeof EDU, 'js/content.js'],
    [() => typeof NetSafePassword, 'js/password.js'], [() => typeof NetSafeCrypto, 'js/crypto.js'], [() => typeof NetSafeOverview, 'js/overview.js']];

  window.addEventListener('load', () => {
    const boot = document.getElementById('boot');
    if (!boot) return;
    if (boot.hidden && PARTS.every(([check]) => has(check))) return;   // every part started (other pages' or extensions' errors are ignored)
    boot.hidden = false; boot.classList.add('show');
    PARTS.forEach(([check, file]) => { if (!has(check)) note(file + ': did not run.'); });
    if (!problems.length) note('A NetSafe script did not finish starting. Open the browser console (F12) for details.');
    const box = document.createElement('div'); box.className = 'bootdetails';
    const h = document.createElement('p'); h.textContent = 'What went wrong on this page:'; box.append(h);
    const ul = document.createElement('ul'); problems.slice(0, 12).forEach(p => { const li = document.createElement('li'); li.textContent = p; ul.append(li); }); box.append(ul);
    boot.append(box);
  });
})();
