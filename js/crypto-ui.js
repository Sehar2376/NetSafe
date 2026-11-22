// Cryptography Lab interface (Caesar cipher, AES-GCM, SHA-256 and concept cards). Uses the browser Web Crypto API via crypto.js.
// Nothing is stored or sent. All text is inserted with textContent (never innerHTML).
(() => {
  const $ = s => document.querySelector(s);
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const C = NetSafeCrypto, ok = C.available();

  // Classical Caesar cipher (works without Web Crypto)
  const shift = () => { const k = Number($('#cshift').value); return Number.isInteger(k) && k >= 1 && k <= 25 ? k : null; };
  const cout = t => { $('#cout').textContent = t; };
  $('#enc').addEventListener('click', () => { const k = shift(); cout(k ? C.caesar($('#ctext').value, k) : 'Shift must be a whole number from 1 to 25.'); });
  $('#dec').addEventListener('click', () => { const k = shift(); cout(k ? C.caesar($('#ctext').value, -k) : 'Shift must be a whole number from 1 to 25.'); });
  $('#brute').addEventListener('click', () => { const t = $('#ctext').value; cout(Array.from({ length: 25 }, (_, i) => 'Shift ' + String(i + 1).padStart(2) + ': ' + C.caesar(t, -(i + 1))).join('\n') + '\n\nOne line is readable: the attacker finds it instantly.'); });

  // Concept cards
  CONCEPTS.forEach(c => {
    const card = el('div', 'card concept'); card.append(el('h2', null, (CONCEPTS.indexOf(c) + 4) + '. ' + c.title), el('p', 'lead', c.lead));
    const dl = el('dl'); c.items.forEach(([k, v]) => dl.append(el('dt', null, k), el('dd', null, v))); card.append(dl); $('#concepts').append(card);
  });

  const status = $('#aesStatus');
  const say = (kind, text) => { status.textContent = ''; const d = el('div', kind === 'err' ? 'errors' : 'todo'); if (kind === 'err') d.setAttribute('role', 'alert'); d.append(el('b', null, kind === 'err' ? 'Result: ' : 'Result: '), document.createTextNode(text)); status.append(d); };
  const ALL = ['#aesEnc', '#aesDec', '#aesTamper'].map(x => $(x));
  const busy = (btn, label, on) => { ALL.forEach(b => { b.disabled = on; }); if (on) { btn.dataset.l = btn.textContent; btn.textContent = label; } else btn.textContent = btn.dataset.l || btn.textContent; };

  if (!ok) {
    ['aesEnc', 'aesDec', 'aesTamper'].forEach(id => { $('#' + id).disabled = true; });
    say('err', 'This page cannot use the browser\'s Web Crypto (it needs HTTPS or localhost). The AES and SHA-256 demos are switched off.');
    $('#shaOut').textContent = 'Not available on this page.';
  } else {
    const run = async (btn, label, fn) => { busy(btn, label, true); try { await fn(); } catch (e) { say('err', e && e.message ? e.message : 'Something went wrong.'); } finally { busy(btn, label, false); } };
    $('#aesEnc').addEventListener('click', e => run(e.currentTarget, 'Working...', async () => {
      const p = await C.encryptText($('#aesMsg').value, $('#aesPass').value); $('#aesPacked').value = p;
      say('ok', 'Encrypted. The readable message is not in the output. Press "Encrypt" again: the result changes each time because of the random salt and nonce.');
    }));
    $('#aesDec').addEventListener('click', e => run(e.currentTarget, 'Working...', async () => {
      if (!$('#aesPacked').value.trim()) throw new Error('Nothing to decrypt. Encrypt a message first, or paste encrypted text.');
      const t = await C.decryptText($('#aesPacked').value, $('#aesPass').value);
      say('ok', 'Decrypted successfully. The message is: ' + (t === '' ? '(empty)' : t));
    }));
    $('#aesTamper').addEventListener('click', e => run(e.currentTarget, 'Working...', async () => {
      const cur = $('#aesPacked').value.trim(); if (!cur) throw new Error('Encrypt a message first.');
      $('#aesPacked').value = C.tamperText(cur);
      try { const t = await C.decryptText($('#aesPacked').value, $('#aesPass').value); say('ok', 'Decrypted: ' + t); }
      catch (err) { if (err.code !== 'auth') throw err; say('ok', 'One character of the encrypted text was changed, and decryption was refused. This is AES-GCM integrity protection: tampering is detected instead of producing garbled output. Press "Encrypt" to make fresh encrypted text.'); }
    }));
    let seq = 0;
    const hash = async () => {
      const my = ++seq, v = $('#shaIn').value;
      try {
        const [a, b] = await Promise.all([C.sha256Hex(v), C.sha256Hex(v + '.')]); if (my !== seq) return;
        $('#shaOut').textContent = a; $('#shaOut2').textContent = b;
        const d = C.hammingBits(a, b); $('#shaDiff').textContent = d + ' of 256 bits are different (' + Math.round(d / 2.56) + '%), from adding a single character.';
      } catch (e) { $('#shaOut').textContent = 'Could not compute the hash.'; }
    };
    $('#shaIn').addEventListener('input', hash); hash();
  }
})();
