# Security and privacy

## Summary

NetSafe is a static web app: no server-side code, database, accounts, analytics or third-party code. Everything you type is analysed by JavaScript in your own browser tab and is not stored, logged or sent anywhere. Links are never opened and networks are never scanned. These claims are enforced by tests (last section).

## Where your data goes

| Input | Processed | Kept? | Sent? |
|---|---|---|---|
| Link | In the page, as text only (never opened) | Only the site name, in tab memory, for the Overview | No |
| Message and sender | In the page | No. The Overview keeps rule-written advice only | No |
| Password | In the page, in memory. Field is masked by default, `autocomplete="new-password"` | No. The Overview gets generic advice only (no length, no quoted words) and only after you leave the field | No |
| Wi-Fi answers | In the page | Network name never kept; label such as "Public network, WPA2" | No |
| Crypto Lab text and passphrase | By the browser's Web Crypto API | No | No |
| Overview and report | A JavaScript variable in the current tab; cleared by reload or "Clear all results" | The report file exists only if you press Download | No |

The page address holds only the page name (for example `#wifi`), never anything you typed. NetSafe uses no `localStorage`, `sessionStorage`, IndexedDB, cookies or service workers, and makes no network requests after its own files load.

## Controls

- **Content-Security-Policy:** `default-src 'none'`, scripts, styles and images only from the app itself, no inline scripts, no `eval`, no `form-action`, no `base-uri`. Because `connect-src` is not allowed, the page cannot send data out. The policy is in `index.html`; `serve.py` re-sends it as an HTTP header with `frame-ancestors 'none'`. The meta tag also allows `file:` sources so the page works when opened straight from disk; the header version does not.
- **No injection path:** all dynamic text uses `textContent`; `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write`, `eval`, `new Function` and string timers appear nowhere. Pasted markup is shown as text; pasted links are never clickable.
- **No third-party code:** no libraries, fonts, CDNs or trackers; CSS loads nothing external.
- **Bounded input:** link 2,048 characters; message 5,000; password analysis 256; crypto message 2,000. Pattern matching is tested on adversarial input. Pasted encrypted text has its PBKDF2 iteration count bounds-checked (1,000 to 2,000,000) so it cannot freeze the page.
- **Server (`serve.py`):** listens on `127.0.0.1` only; serves only `index.html`, `favicon.ico`, `css/`, `js/`, `assets/` (source, tests and docs return 404); GET and HEAD only; rejects path traversal; sends `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, `Permissions-Policy`, `Cross-Origin-Opener-Policy`, `Cross-Origin-Resource-Policy`; hides the Python version.
- **Synthetic examples:** reserved example domains (`.example`, `example.com`) and the documentation IP range `203.0.113.x`; nothing is ever fetched to verify them.

## Cryptography in the Lab

Browser Web Crypto only, no custom cryptography. Keys come from PBKDF2-HMAC-SHA-256 (600,000 iterations, random 16-byte salt). Encryption is AES-256-GCM with a random 12-byte nonce and a 128-bit tag, so a wrong passphrase or any changed character makes decryption fail instead of returning output. Format: `ns1.<iterations>.<salt>.<nonce>.<ciphertext+tag>`. SHA-256 is checked against the standard test values. The Caesar cipher is deliberately insecure. This is a learning demo, not an audited tool.

## Threat model

**Protects against:** NetSafe itself leaking what you type; script injection through pasted content; third-party tracking; accidentally opening a dangerous link; the Overview or report revealing private details.

**Out of scope:** a compromised device or browser; browser extensions (they can read any page); someone watching your screen; a modified copy of NetSafe hosted by someone else (use a copy you trust); files you choose to save.

## Hosting

`serve.py` sends the security headers itself. On static hosting add the same headers if the host allows it (Netlify: a `_headers` file; GitHub Pages cannot set headers, so the meta policy applies but `frame-ancestors` does not, which allows framing; the impact is low because nothing sensitive is stored):

```
Content-Security-Policy: default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'
X-Content-Type-Options: nosniff
Referrer-Policy: no-referrer
```

## How this is verified

- `tests/audit.test.js` scans every script for 20 banned APIs, checks the policy, and checks the HTML for inline scripts, handlers, styles and external resources.
- The overview, password, message and link tests check that nothing typed (password, message text, phrases, sender, link path or token, network name) appears in the Overview or report. These tests were checked by deliberately introducing leaks, which made them fail.
- `tests/test_serve.py` checks the server's headers, file allowlist, traversal rejection and methods.
- `tests/browser/browser_tests.py` checks, in Chromium: no request leaves the local server; local storage, session storage, cookies and IndexedDB stay empty after using every tool and page; no console or policy errors; the policy blocks an injected script and an outbound request; payloads typed into every input stay inert text.

Not verified: no independent security review; Chromium only; no testing with browser extensions or on real phones.
