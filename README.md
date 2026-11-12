# NetSafe: Personal Internet Safety Assistant

NetSafe helps ordinary people decide what to do about a suspicious link, a scam message, a weak password or an unfamiliar Wi-Fi network. It explains each warning sign in plain English: what was noticed, why it matters, what could happen, and what to do now. Built for an Information Security / Computer Networks course and SafeSpace Hacks 2026.

**Everything runs in your browser. Nothing is stored or sent anywhere, links are never opened, and networks are never scanned.** Results are transparent, rule-based estimates, not AI and not a guarantee of safety.

![NetSafe overview](docs/screenshots/08-overview-results-desktop.png)

## What it does

| Question | What NetSafe checks | What it does not do |
|---|---|---|
| **Is this message a scam?** | Requests for OTP/PIN, passwords, card or ID details; payment and fee requests; threats; fake prizes; urgency; "new number" money requests; risky links; sender clues. Highlights each phrase in your message. | Understand meaning, verify who sent it, read images, cover most languages (English and a few Roman Urdu phrases only). |
| **Is this link safe?** | HTTP vs HTTPS, IP-address links, `name@host` tricks, look-alike (punycode / mixed alphabet) names, shorteners, brand names on other domains, many subdomains, weaker signals. | Open the link, or check reputation, certificates, redirects or domain ownership. |
| **Is my password strong?** | Length, common passwords (including `p@ssw0rd`-style swaps), keyboard and counting patterns, repeats, the "Word2024!" shape, famous phrases, reuse. | Predict cracking time, or check breach lists (that would mean sending your password elsewhere). |
| **Is this Wi-Fi connection secure?** | Open, WEP, WPA, WPA2, WPA2/WPA3, WPA3, Enterprise, Enhanced Open; public or private; shared password; login (captive) page. Public Wi-Fi is not automatically rated dangerous. | Scan or test any network, or detect fake hotspots. It only uses your answers. |
| **Help me understand online security** | Cryptography Lab with real AES-256-GCM and SHA-256 (browser Web Crypto), Caesar cipher, plus short explainers on encryption vs hashing, symmetric vs asymmetric, HTTPS/TLS, the CIA triad, WPA2 vs WPA3. | Protect real secrets. It is a learning demo. |
| **Security Overview** | One place showing what you have checked: **Assessed**, **Not assessed** (never treated as safe) or **Information unavailable**. Important warnings, a prioritised "what to do next" plan (including what to do if you already clicked or replied), and a downloadable or printable report. | Give a single safety score. The checks measure different things, so none is invented. |

## Run it

No install, no build, no dependencies.

1. Download or unzip the project.
2. Open `index.html` in a browser. Or serve the folder: `python3 -m http.server 8000` and visit `http://localhost:8000`.

The AES demo needs a secure context (HTTPS or localhost; opening the file directly also worked in Chromium). If a browser reports it as unavailable, use the local server. Tested in Chromium only (see [known limitations](docs/KNOWN_LIMITATIONS.md)).

**Deploy (static site):** GitHub Pages (Settings > Pages > Deploy from branch `main` / root) or drag the folder onto Netlify Drop. Serve over HTTPS and add the response headers listed in [docs/SECURITY_AND_PRIVACY.md](docs/SECURITY_AND_PRIVACY.md).

## Tests

```
node tests/run-all.js                         # or: npm test   (Node 20+, no packages needed)
pip install playwright && playwright install chromium
python3 tests/browser/browser_tests.py        # real-browser checks (starts its own local server)
python3 tests/browser/browser_tests.py --screenshots docs/screenshots   # regenerate screenshots
```

Results of the last run, with what was and was not tested: [docs/TEST_RESULTS.md](docs/TEST_RESULTS.md).

## Project layout

```
index.html              page (with Content-Security-Policy)
css/style.css           styling (print view included)
js/url.js               link analyzer            js/url-ui.js
js/message.js           scam-message analyzer    js/message-ui.js
js/password.js          password analyzer        js/password-ui.js
js/rules.js             Wi-Fi scoring rules      js/wifi-ui.js
js/crypto.js            AES-GCM / SHA-256        js/crypto-ui.js
js/overview.js          summaries, statuses, plan, report      js/overview-ui.js
js/tools.js             Caesar cipher            js/app.js, js/content.js  education text
tests/*.test.js         unit tests (Node)        tests/browser/  Chromium tests
docs/                   security & privacy, limitations, demo script, test results, audit, screenshots
```

Analysis logic (`url.js`, `message.js`, `password.js`, `rules.js`, `crypto.js`, `overview.js`) is pure and has no DOM access, so it is unit-tested directly. The `*-ui.js` files only render, using `textContent` (never `innerHTML`).

## Changing the rules

Everything is a readable table or config object: `URL_CONFIG` (weights, thresholds) in `js/url.js`; `MSG_RULES` and `MSG_CONFIG` in `js/message.js`; `CONFIG` (Wi-Fi points, thresholds, floors, ceilings) in `js/rules.js`; `PW_COMMON` and the scoring in `js/password.js`. After a change, run `npm test`. `tests/demo.test.js` checks every result claimed in the demo script, so it tells you when the script needs updating.

Wi-Fi scoring in short: protocol (Open 60, WEP 55, WPA 45, Unknown 35, Enhanced Open 20, WPA2 15, WPA2/WPA3 12, Enterprise 8, WPA3 5) + no password 25 + public network 20 + shared password 15 (only where it applies: WEP, WPA, WPA2, mixed; WPA3 and Enterprise give each device its own keys) + captive portal 5 + location 0-3. Levels: 0-24 Low, 25-59 Medium, 60+ High. Open/WEP/WPA are always High. Unknown security type is at least Medium but held at Medium when a password exists.

## Documentation

- [Security and privacy](docs/SECURITY_AND_PRIVACY.md): data flow, controls, cryptography details, threat model, hosting headers
- [Known limitations](docs/KNOWN_LIMITATIONS.md)
- [Demo script](docs/DEMO_SCRIPT.md): realistic synthetic scenarios, each verified by tests
- [Test results](docs/TEST_RESULTS.md)
- [Audit and changes](docs/AUDIT_AND_CHANGES.md): what the original project had, what was fixed, and corrections made along the way
- [Screenshots](docs/screenshots/): desktop and mobile of every module

## Course links

Wireless networks and Wi-Fi security protocols (WEP, WPA, WPA2, WPA3, Enterprise, Enhanced Open); encryption (AES-GCM) and hashing (SHA-256, PBKDF2 in WPA2, SAE in WPA3); HTTPS and TLS; authentication; man-in-the-middle and evil-twin attacks; social engineering and phishing; classic ciphers vs modern encryption.

NetSafe is educational. It is not a penetration-testing tool, a professional security audit, or legal or financial advice.
