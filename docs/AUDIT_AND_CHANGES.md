# Audit and changes

## The project NetSafe started from

"NetSafe: Wi-Fi Security and Risk Assessment": static HTML, CSS and vanilla JavaScript. It had a Wi-Fi risk form with rule-based scoring (`js/rules.js`), a Caesar cipher lab, a password strength checker, security education cards, and a decorative typing banner and news ticker. It came with 19 Wi-Fi scoring tests plus cipher and password tests, which all passed when audited. It kept the identity (name, logo, look) and the architecture (no backend, no framework), which were preserved.

## What the audit found (Phase 1)

| Finding | Action |
|---|---|
| Wi-Fi result said "Captive portal detected", but the tool detects nothing (the user reports it); also claimed login pages are "often unencrypted" | Reworded to "You reported a captive portal" |
| "Busy public places attract more attackers": no basis | Replaced with a neutral statement |
| SSID limit checked in characters; the standard limit is 32 bytes. HTML allowed 40 | Checked in bytes; HTML limit aligned |
| The same recommendations were shown for every result, even a private home network | Recommendations depend on the actual findings |
| Education text errors: plain SHA-256 described as suitable for password storage; certificates described as proving a site is genuine; encryption said to "defeat" eavesdropping; loose wording on classic ciphers | Corrected |
| The famous example passphrase "correct horse battery staple" scored Strong; `P@ssw0rd` and `Summer2024!` scored Good | Fixed when the password checker was rebuilt (Phase 4) |
| Smooth scrolling and a typing banner and ticker (decorative, Wi-Fi-only wording, slow on long jumps) | Removed in Phase 7 |
| Results rendered with `innerHTML` plus manual escaping | Replaced by `textContent` everywhere; `innerHTML` is now banned by a test |
| A 1.7 MB unused logo file | Left out of the final ZIP |

## What each phase added

1. **Audit and corrections** (above).
2. **Link checker**: text-only analysis with explanations, link breakdown, limits.
3. **Message checker**: rule table, phrase highlighting, sender checks, Roman Urdu phrases, "if you already responded" advice.
4. **Password checker and Crypto Lab**: new password heuristics; real AES-256-GCM and SHA-256 via Web Crypto; five concept explainers.
5. **Wi-Fi assessment**: new protocol types (WPA2/WPA3, Enterprise, Enhanced Open), context-aware scoring (public is not automatically High; the shared-password penalty applies only where it is technically true), structured findings, help for finding the security type.
6. **Security Overview**: Assessed / Not assessed / Information unavailable, prioritised plan, privacy-safe summaries, no combined score.
7. **Reports, tests, documentation and polish**: text report and print view; removal of decorative motion; accessibility audit and fixes; one-command test runner; browser test suite; static code audit; documentation; demo script verified by tests.

## Changes to existing behaviour (so nothing is a surprise)

- **Wi-Fi scoring changed.** Public network 25 became 20; captive portal 10 became 5; the shared-password penalty no longer applies to WPA3 or Enterprise; unknown security type is capped at Medium when a password exists; Enhanced Open and Enterprise have their own weights. All 19 original scoring tests still pass; one was reworded in Phase 1 for the captive-portal wording.
- **Password checker replaced.** `tools.js` keeps a thin `pwStrength` wrapper so old callers work. One existing assertion changed: the famous passphrase is no longer expected to be Strong (it is Weak); a different four-word passphrase takes its place, and a new test covers the famous one.
- The navigation label "Cipher Lab" became "Crypto Lab"; the hero and "How it works" now describe the whole assistant; the page title changed.

## Mistakes caught during the work

These were found by testing, then fixed. They are listed because tests that pass are only as good as the checks behind them.

- The unit test for an unknown Wi-Fi security type passed (Medium), but a browser run with "captive portal: unknown" scored 61 and showed High, a three-point difference from an unrelated answer. Fixed with a cap, and a test now checks all three portal answers.
- A race in the Crypto Lab: Decrypt could be pressed while Encrypt was still running and use stale text. All three buttons are now disabled while any operation runs.
- The result label could be hidden under the sticky header after auto-scroll (desktop and phone). Fixed with scroll offsets.
- The overview cards printed the level twice and used an oversized label style.
- Several of my own test and audit scripts were wrong (a selector that matched the app's own bold label, a contrast checker that mishandled gradient backgrounds, an eval check that cannot work through the test tool, a check that was always true, and a precedence bug in an assertion). Each was corrected or replaced rather than ignored; the always-true check was deleted.
- Quoted counts were corrected after counting them (brands, listed passwords, script files).
- The first accessibility audit found real problems: tap targets under 44 px, no visible keyboard focus ring on `<summary>`, and unlabelled duplicate navigation landmarks. All fixed.
