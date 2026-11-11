// Newsroom-style typing + ticker. Decorative only: full text is always present for screen readers,
// results are never delayed, and everything is static when the user prefers reduced motion.
const NSType = (() => {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  // Types `text` into `el`. A transparent copy holds the real text (accessible, reserves space, no layout shift);
  // an aria-hidden overlay shows the letters as they appear.
  function type(el, text, speed = 26) {
    const token = el._tw = {};
    el.textContent = '';
    const ghost = document.createElement('span'); ghost.className = 'tw-ghost'; ghost.textContent = text;
    const live = document.createElement('span'); live.className = 'tw-live'; live.setAttribute('aria-hidden', 'true');
    el.append(ghost, live);
    if (reduce) { live.textContent = text; return Promise.resolve(); }
    const caret = document.createElement('i'); caret.className = 'caret';
    return new Promise(done => {
      const t0 = performance.now();
      const tick = now => {
        if (el._tw !== token) return done();                    // superseded by a newer call
        const n = Math.min(text.length, Math.floor((now - t0) / speed));
        live.textContent = text.slice(0, n);
        if (n < text.length) { live.append(caret); requestAnimationFrame(tick); } else { caret.remove(); done(); }
      };
      requestAnimationFrame(tick);
    });
  }
  async function hero() {
    if (reduce) return;                                   // reduced motion: keep the static line, no rotation
    const el = document.getElementById('heroLine');
    for (let i = 0; i < HEADLINES.length; i++) { await type(el, HEADLINES[i]); if (i < HEADLINES.length - 1) await sleep(2200); }
  }
  function kickers() {
    const els = document.querySelectorAll('[data-type]');
    if (reduce || !('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { io.unobserve(e.target); type(e.target, e.target.textContent.trim(), 18); } }), { threshold: 0.6 });
    els.forEach(el => io.observe(el));
  }
  function ticker() {   // duplicated list gives a seamless loop; copy is hidden from assistive tech
    const track = document.getElementById('tkTrack');
    const list = () => { const u = document.createElement('ul'); TICKER.forEach(t => { const l = document.createElement('li'); l.textContent = t; u.append(l); }); return u; };
    const a = list(), b = list(); b.setAttribute('aria-hidden', 'true');
    track.append(a, b);
    if (!reduce) document.getElementById('ticker').classList.add('run');
  }
  ticker(); kickers(); hero();
  return { type };
})();
