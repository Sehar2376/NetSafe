# NetSafe — Wi-Fi Security and Risk Assessment

NetSafe is a privacy-focused internet safety platform that helps users identify potential online threats, including phishing messages, suspicious websites, weak passwords, and insecure Wi-Fi networks. It provides practical security assessments, educational tools, and clear guidance to help people build safer digital habits.

Educational tool that turns Wi-Fi security details into a simple, explained risk estimate. Built for an Information Security course and SafeSpace Hacks 2026.

**It does not scan, test, or access networks, and never collects Wi-Fi passwords.** Results are a rule-based educational estimate.

## Run
No installation needed. Open `index.html` in a browser (or run `python3 -m http.server` and visit localhost:8000).

Tests (Node 16+):
- `node tests/rules.test.js`
- `node tests/tools.test.js`

## Structure
- `index.html` — Main page
- `css/style.css` — Styling
- `js/typing.js` — Typing effect and ticker
- `js/rules.js` — Scoring rules and engine
- `js/content.js` — Educational content
- `js/tools.js` — Caesar cipher and password-strength logic
- `js/app.js` — Application interface
- `assets/images/` — Logos and icons
- `tests/` — Automated tests

## Architecture
Static HTML, CSS, and vanilla JavaScript. No backend or database is required.

## Deploy
**GitHub Pages:** Settings → Pages → Deploy from a branch → `main` → `(root)` → Save.

**Netlify:** Drag the project folder onto https://app.netlify.com/drop.

## Limitations
The assessment relies on user-provided information. It cannot detect evil twins or verify real networks. The password checker is heuristic-based, not a cracking-time estimator. NetSafe is an educational tool, not a penetration-testing tool or a replacement for a professional security audit.