# Test results

Generated from a real run on 12 November 2026. Nothing below was typed in by hand: counts come from the test runner output.

## Environment

- Node v22.23.4 (unit tests)
- Python 3.12.3, Playwright 1.63.0, **Chromium 153.0.8010.12** headless (browser tests)
- Browser tests ran on Chromium only. Firefox, WebKit/Safari and real devices were not available and were not tested.

## Unit tests: `node tests/run-all.js`

| Suite | Result | Named checks | What it covers |
|---|---|---|---|
| `audit.test.js` | ok | 12 | Static audit: banned APIs, CSP, HTML hygiene, no external resources |
| `crypto.test.js` | ok | 19 | AES-GCM round trips, wrong passphrase, tampering, bad input, SHA-256 test vectors |
| `demo.test.js` | ok | 18 | Every result claimed in the demo script |
| `message.test.js` | ok | 37 | Scam-message rules, highlighting, sender checks, privacy, speed on adversarial input |
| `overview.test.js` | ok | 40 | Statuses, ordering, plan, report, privacy leak tests |
| `password.test.js` | ok | 27 | Strength rules, privacy and no-storage guard |
| `rules.test.js` | ok | 28 | Original Wi-Fi scoring tests plus Phase 1 corrections |
| `tools.test.js` | ok | 0 | Caesar cipher and password wrapper (assertion-based, no named checks) |
| `url.test.js` | ok | 36 | Link analysis, punycode, brands, shorteners, input limits |
| `wifi.test.js` | ok | 40 | Context-aware scoring, new protocols, contradictions, findings |
| **Total** | **10 suites, 0 failed** | **257** | plus unnamed assertions inside the suites |

## Browser tests: `python3 tests/browser/browser_tests.py`

**138 of 138 checks passed** on Chromium 153.0.8010.12.

| Area | Checks | Passed |
|---|---|---|
| Page load and first impression | 7 | 7 |
| Link checker | 12 | 12 |
| Message checker | 14 | 14 |
| Password checker | 11 | 11 |
| Wi-Fi assessment | 14 | 14 |
| Cryptography Lab | 14 | 14 |
| Security Overview | 14 | 14 |
| Report | 3 | 3 |
| Storage | 1 | 1 |
| Print view | 2 | 2 |
| Demo script walkthrough | 20 | 20 |
| Security policy (CSP) | 3 | 3 |
| Accessibility | 10 | 10 |
| Layout and responsiveness | 10 | 10 |
| Network | 1 | 1 |
| Console | 1 | 1 |
| Dialogs | 1 | 1 |

### Every check

**Page load and first impression**

- PASS: title and h1 describe the whole assistant
- PASS: no ticker or typing banner remains
- PASS: page does not use smooth scrolling
- PASS: all four overview cards start as Not assessed
- PASS: empty overview does not claim safety
- PASS: report and print buttons disabled until something is checked
- PASS: every tool shows an empty state

**Link checker**

- PASS: example "Normal site" is Low
- PASS: example "Fake brand" is High
- PASS: example "Numbers only" is High
- PASS: example "Tricky @" is High
- PASS: example "Look-alike letters" is High
- PASS: example "Short link" is Medium
- PASS: Low result says it is not proof of safety
- PASS: findings use the 4-part explanation and list what was not checked
- PASS: XSS payload stays inert text
- PASS: XSS payload stays inert text
- PASS: invalid input shows an error
- PASS: clear resets field and error

**Message checker**

- PASS: example "Bank SMS scam" is High
- PASS: example "Prize scam" is High
- PASS: example "Family emergency" is High
- PASS: example "Genuine code notice" is Low
- PASS: example "Normal message" is Low
- PASS: genuine code notice: no findings, explanatory note
- PASS: phrases are highlighted with numbers matching the findings
- PASS: highlighted box preserves the original text
- PASS: result has the "if you already responded" section
- PASS: XSS payload stays inert text; links are never clickable
- PASS: XSS payload stays inert text; links are never clickable
- PASS: sender checks run when a sender is supplied
- PASS: empty input shows an error
- PASS: works with the keyboard alone (type, Tab, Enter)

**Password checker**

- PASS: field is masked by default
- PASS: "Summer2024!" is Weak
- PASS: "P@ssw0rd" is Weak
- PASS: "correct horse battery staple" is Weak
- PASS: "river lantern copper maple" is Strong
- PASS: "fz8#Kp2!vQ9@mL4x" is Strong
- PASS: show/hide toggle works
- PASS: result explains weaknesses and says it is only an estimate
- PASS: reuse box shows the reuse risk
- PASS: XSS payload stays inert
- PASS: emptying the field restores the empty state

**Wi-Fi assessment**

- PASS: sharing question is hidden until a password is used
- PASS: sharing question appears for password networks
- PASS: cafe WPA2 shared password + login page is Medium
- PASS: airport open network + login page is High
- PASS: university Enterprise is Low
- PASS: home WPA3 is Low
- PASS: unknown security type at a cafe is Medium
- PASS: unknown type is held at Medium and explained
- PASS: public result carries the "not automatically dangerous" note and reasonable-use guidance
- PASS: result lists what was not checked and states nothing is scanned
- PASS: contradiction (Enhanced Open + password) is rejected, not scored
- PASS: empty form lists the missing fields
- PASS: reset clears the form and hides the sharing question
- PASS: XSS payload in the network name stays inert text

**Cryptography Lab**

- PASS: page can use Web Crypto
- PASS: SHA-256 of "NetSafe" is 64 hex characters with an avalanche line
- PASS: SHA-256("abc") matches the standard test vector
- PASS: AES-GCM encrypts, and the output hides the message
- PASS: encrypting twice gives different output (random salt and nonce)
- PASS: decrypts with the right passphrase
- PASS: wrong passphrase is refused
- PASS: tampering is detected and explained
- PASS: garbage input gives a clear error
- PASS: decrypting nothing gives a clear message
- PASS: unicode round-trips and markup is shown as text, not run
- PASS: Caesar cipher still works
- PASS: Caesar brute force lists all 25 shifts
- PASS: five concept cards are present

**Security Overview**

- PASS: link check marks only Website links as Assessed
- PASS: password is not reported while still typing
- PASS: password is reported once the field is left
- PASS: password reuse is reflected
- PASS: Wi-Fi with unknown security type shows Information unavailable
- PASS: coverage line counts the three states
- PASS: headline reports results, with no combined score
- PASS: plan order: message, link, password (all High), then Wi-Fi (Medium)
- PASS: plan items have the five-part structure
- PASS: PRIVACY nothing typed appears anywhere in the overview
- PASS: Clear all results resets every card and disables the report
- PASS: Low result headline is not a promise
- PASS: is empty again after a reload (nothing persisted)
- PASS: card button goes to its tool

**Report**

- PASS: downloads as a dated .txt file
- PASS: contains headline, statuses, plan and limits
- PASS: PRIVACY nothing typed appears in the downloaded report

**Storage**

- PASS: nothing in localStorage, sessionStorage, cookies or IndexedDB after using every tool

**Print view**

- PASS: view hides navigation and other sections, shows the overview in black on white
- PASS: view produces a PDF

**Demo script walkthrough**

- PASS: 1 overview starts with four Not assessed cards and the "not counted as safe" headline
- PASS: 2 bank SMS is High with six findings, a most-important step and an if-already-responded section
- PASS: 3 genuine code notice is Low with no findings and a note
- PASS: 4 fake-brand link is High, highlights secure-login.example, lists HTTP, brand and account words
- PASS: 4 tricky @ and look-alike are High; normal site is Low with the not-proof note
- PASS: 5 password "Summer2024!" is Weak (one word)
- PASS: 5 password "P@ssw0rd" is Weak (common password)
- PASS: 5 password "correct horse battery staple" is Weak (famous)
- PASS: 5 password "river lantern copper maple" is Strong
- PASS: 5 reuse warning shows and the password reaches the overview
- PASS: 6 Wi-Fi "Cafe_Guest" is Medium (58)
- PASS: 6 Wi-Fi "Airport_Free" is High
- PASS: 6 Wi-Fi "eduroam" is Low (20)
- PASS: 6 Wi-Fi "Home_5G" is Low (5)
- PASS: 6 Wi-Fi "Guest" is Medium
- PASS: 6 the unknown-security-type scenario is held at Medium and explained
- PASS: 7 overview: Messages, Website links and Password Assessed; Wi-Fi Information unavailable
- PASS: 7 plan order is message, then links, then password, then Wi-Fi
- PASS: 7 report downloads and has the plan
- PASS: 9 reload empties the overview

**Security policy (CSP)**

- PASS: CSP meta tag forbids everything except same-origin scripts, styles and images
- PASS: CSP blocks an injected inline script
- PASS: CSP blocks outbound network requests

**Accessibility**

- PASS: desktop: WCAG text contrast passes on all 547 text elements (worst case over gradients, all results showing)
- PASS: desktop: every control has an accessible name
- PASS: desktop: one h1, no skipped heading levels, one main, lang set, no duplicate ids, images have alt, navs labelled
- PASS: desktop: all buttons, links and fields are at least 44x44 px
- PASS: mobile: WCAG text contrast passes on all 547 text elements (worst case over gradients, all results showing)
- PASS: mobile: every control has an accessible name
- PASS: mobile: one h1, no skipped heading levels, one main, lang set, no duplicate ids, images have alt, navs labelled
- PASS: mobile: all buttons, links and fields are at least 44x44 px
- PASS: keyboard: all 109 focus stops show a visible focus ring
- PASS: reduced-motion preference disables transitions

**Layout and responsiveness**

- PASS: no horizontal overflow at 320px (empty and fully populated)
- PASS: no horizontal overflow at 375px (empty and fully populated)
- PASS: no horizontal overflow at 768px (empty and fully populated)
- PASS: no horizontal overflow at 1280px (empty and fully populated)
- PASS: desktop: message result is not hidden under the sticky header
- PASS: desktop: link result is not hidden under the sticky header
- PASS: desktop: Wi-Fi result is not hidden under the sticky header
- PASS: mobile: message result is not hidden under the sticky header
- PASS: mobile: link result is not hidden under the sticky header
- PASS: mobile: Wi-Fi result is not hidden under the sticky header

**Network**

- PASS: every request in the whole run went to the local server (no third parties, no uploads)

**Console**

- PASS: no errors, warnings or CSP violations during the whole run

**Dialogs**

- PASS: no alert/confirm/prompt fired (no injected script ran)

## Other verification done during development (not part of the repeatable suite)

- **Privacy tests were checked for real:** three leaks were introduced on purpose (message text kept in the overview, the network name added to a label, quoted words not stripped from titles). Each made `overview.test.js` fail. The original code passes.
- **Opened from disk:** `index.html` loaded as a `file://` page in Chromium with a secure context, working AES and no console errors.
- **Slow anchor jumps:** a screenshot came out blank because smooth scrolling on an 18,000 px page took about 3 seconds. This led to removing smooth scrolling.
- **Earlier phase checks:** XSS payloads, no external requests and empty storage were checked at each phase; the final suite repeats them.

## Not tested

- Firefox, Safari, Edge, and real phones or tablets.
- Screen readers (NVDA, VoiceOver, TalkBack), 200%/400% browser zoom, high-contrast modes, and real users.
- Browser extensions that read page content.
- An independent security review or penetration test.
- Non-English input beyond the few Roman Urdu phrases in the rules, and very large inputs beyond the stated limits.

## Screenshots

`docs/screenshots/` holds desktop (1280 px) and mobile (375 px) captures of the home page, empty overview, scam message result, link warning, password check, Wi-Fi result, Crypto Lab, populated overview and action plan. Regenerate them with `python3 tests/browser/browser_tests.py --screenshots docs/screenshots`.
