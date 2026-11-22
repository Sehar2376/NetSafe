// Page navigation. Each top-menu link opens its own page (view); only one page is visible at a time.
// Uses the URL hash (#message, #wifi ...), so the Back button and shared links work. Nothing is stored.
// Without JavaScript every page stays visible, one below the other.
(() => {
  const VIEWS = ['home', 'message', 'link', 'password', 'wifi', 'overview', 'lab', 'learn'];
  const ALIAS = { '': 'home', top: 'home', how: 'home', why: 'home', start: 'home', assess: 'wifi', pw: 'password' };
  const TITLES = { home: 'Home', message: 'Check a message', link: 'Check a link', password: 'Check a password', wifi: 'Wi-Fi assessment', overview: 'Your security overview', lab: 'Cryptography Lab', learn: 'Learn' };
  const blocks = Array.from(document.querySelectorAll('[data-view]'));
  const links = Array.from(document.querySelectorAll('header nav a, footer nav a'));
  const current = () => { let h = ''; try { h = decodeURIComponent(location.hash.slice(1)); } catch (e) { h = ''; } const v = ALIAS[h] || h; return VIEWS.indexOf(v) >= 0 ? v : 'home'; };
  function show(first) {
    const v = current();
    blocks.forEach(b => { b.hidden = b.dataset.view !== v; });
    links.forEach(a => { if (a.getAttribute('href') === '#' + v) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    document.title = (v === 'home' ? 'NetSafe - Personal Internet Safety Assistant' : TITLES[v] + ' - NetSafe');
    if (first) return;
    window.scrollTo(0, 0);
    const h = document.querySelector('[data-view="' + v + '"] h1');   // move keyboard and screen-reader focus to the new page title
    if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
  }
  window.addEventListener('hashchange', () => show(false));
  show(true);
  // The "tools are not running" banner stays visible unless every part of NetSafe loaded.
  window.addEventListener('DOMContentLoaded', () => {
    const ok = typeof NetSafeUrl !== 'undefined' && typeof NetSafeMessage !== 'undefined' && typeof NetSafeRules !== 'undefined' &&
      typeof NetSafeCrypto !== 'undefined' && typeof NetSafeOverview !== 'undefined' && typeof NetSafePassword !== 'undefined';
    const boot = document.getElementById('boot'); if (boot && ok) boot.hidden = true;
  });
})();
