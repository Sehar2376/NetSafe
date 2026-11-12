# NetSafe - Wi-Fi Security and Risk Assessment

Educational tool that turns Wi-Fi security details into a simple, explained risk estimate. Built for an Information Security course and SafeSpace Hacks 2026.

**It does not scan, test or access networks, and never collects Wi-Fi passwords.** Results are a rule-based educational estimate.

## Run
No install needed. Open `index.html` in a browser (or `python3 -m http.server` and visit localhost:8000).
Tests (Node 16+): `node tests/rules.test.js`, `tools.test.js`, `url.test.js`, `message.test.js`, `password.test.js` and `crypto.test.js` (same folder; Node 20+ for the crypto tests)

## Structure
- `index.html` page, `css/style.css` styling
- `js/typing.js` newsroom typing effect + ticker (respects reduced motion)
- `js/password.js` password analyzer + `js/password-ui.js`; `js/crypto.js` AES-GCM / SHA-256 demos (Web Crypto) + `js/crypto-ui.js`; `js/tools.js` now holds the Caesar cipher (and a small wrapper `pwStrength`)
- `js/message.js` scam-message analyzer (rule table `MSG_RULES`), `js/message-ui.js` its interface
- `js/url.js` link analyzer (pure logic, weights in `URL_CONFIG`), `js/url-ui.js` its interface (uses `textContent` only, never `innerHTML`)
- `js/rules.js` scoring rules (`CONFIG`) and engine, `js/content.js` education text, `js/tools.js` Caesar + password-strength logic, `js/app.js` UI
- `assets/images/` logo files: `netsafe-logo.png` (footer), `netsafe-symbol.png` (header), favicons, and `netsafe-logo-original.png` (full-size artwork, e.g. for Devpost; not used by the page and safe to delete). `favicon.ico` sits at the project root.
- `tests/rules.test.js` scoring and edge-case tests; `tests/tools.test.js` Caesar cipher and password-checker tests

Architecture choice: static HTML/CSS/vanilla JS. No backend or database is needed because nothing is stored, which also keeps the demo reliable and private.

## Deploy (static site, no build step)
- **GitHub Pages:** push the files so `index.html` is at the repo root, then Settings > Pages > Deploy from a branch > `main` / `(root)` > Save. Site: `https://<username>.github.io/<repo>/`
- **Netlify:** unzip, then drag the `netsafe` folder onto https://app.netlify.com/drop (or connect the repo with no build command and publish directory `.`).

## Password checker and Cryptography Lab (Phase 4)
**Password checker:** a heuristic estimate that rewards length and penalises common passwords (including look-alike swaps such as `p@ssw0rd`), keyboard and counting patterns, repeats, the "Word2024!" shape and famous example phrases. It explains each weakness and how to fix it. It never stores, logs or sends the password, and it does **not** predict cracking time or check breach lists (that would require sending the password elsewhere). An optional "I reuse this password" box shows the reuse risk.
**Cryptography Lab:** Caesar cipher (kept); real AES-256-GCM encryption/decryption with a PBKDF2-SHA-256 key derived from a passphrase (random salt and nonce per message, tamper and wrong-passphrase detection); live SHA-256 hashing with an avalanche demo; and short explainers on encryption vs hashing, symmetric vs asymmetric, HTTPS/TLS, the CIA triad and WPA2 vs WPA3. These use the browser's Web Crypto API, which needs HTTPS or `localhost` (the page shows a clear message otherwise). It is a learning demo, not an audited tool for real secrets.

## Message checker (Phase 3)
Paste an SMS, WhatsApp message or email (optionally with the sender). NetSafe uses a transparent rule table to find wording scammers commonly use: requests for OTP/PIN, passwords or card/ID details, payment or fee requests, threats and account-closure warnings, fake prizes, urgency, generic official-sounding wording, secrecy, "new number" money requests, and risky links (judged with the link checker). Matching phrases are highlighted and numbered, and each finding explains what was noticed, why it matters, what could happen and what to do. **It is pattern matching, not AI**, covers English plus a few Roman Urdu phrases, cannot verify who sent a message, and a Low result does not prove a message is genuine. A genuine code notice ("never share this code") is not flagged.

## Link checker (Phase 2)
Paste a link and NetSafe reads its text only: HTTP vs HTTPS, IP-address links, `user@host` tricks, look-alike (punycode / mixed-alphabet) names, link shorteners, brand names on other domains, many subdomains and a few weaker signals. Each finding explains what was noticed, why it matters, what could happen and what to do. **It never opens links and does not check reputation, certificates, redirects or domain ownership.** A Low result is not a safety guarantee.

## Wi-Fi scoring (edit `CONFIG` in `js/rules.js`)
Points: protocol (Open 60, WEP 55, WPA 45, Unknown 35, WPA2 15, WPA3 5) + no password 25 + public network 25 + shared password 15 + captive portal (yes 10 / unknown 5) + location 0-3. Capped at 100.
Levels: 0-24 Low, 25-59 Medium, 60+ High. Minimum levels: Open/WEP/WPA are always High, Unknown at least Medium. Contradictions (e.g. Open + password, WPA3 + no password) and missing fields are rejected, never scored.
Low means lower risk, never "completely secure".

## Course links
Classic ciphers (Caesar, brute force) vs AES/TLS; hashing (PBKDF2 in WPA2, SAE key exchange in WPA3); authentication; MITM and evil twin attacks.

## Limitations
Relies on user input; cannot detect evil twins or verify real networks; password checker is a heuristic, not a cracking-time estimate. Not a penetration-testing tool or audit replacement.
