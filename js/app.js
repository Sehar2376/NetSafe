const $ = s => document.querySelector(s);
const form = $('#form');

// Education cards
EDU.forEach(([t, d]) => { const c = document.createElement('div'); c.className = 'card'; const b = document.createElement('b'); b.textContent = t; const p = document.createElement('p'); p.textContent = d; c.append(b, p); $('#edu').append(c); });

// Caesar cipher lab (classical, educational only) - logic lives in tools.js
const shift = () => { const k = Number($('#cshift').value); return Number.isInteger(k) && k >= 1 && k <= 25 ? k : null; };
const out = t => { $('#cout').textContent = t; };
$('#enc').onclick = () => { const k = shift(); out(k ? caesar($('#ctext').value, k) : 'Shift must be a whole number from 1 to 25.'); };
$('#dec').onclick = () => { const k = shift(); out(k ? caesar($('#ctext').value, -k) : 'Shift must be a whole number from 1 to 25.'); };
$('#brute').onclick = () => { const t = $('#ctext').value; out(Array.from({ length: 25 }, (_, i) => `Shift ${String(i + 1).padStart(2)}: ${caesar(t, -(i + 1))}`).join('\n') + '\n\nOne line is readable: the attacker finds it instantly.'); };
