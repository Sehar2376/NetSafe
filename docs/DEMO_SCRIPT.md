# Demo script (about 12 minutes)

Every input below is synthetic: made-up domains (`.example`), the documentation IP range, and a made-up phone number. Every expected result is checked automatically by `tests/demo.test.js` (and the interface behaviour by `tests/browser/browser_tests.py`), so if a rule changes and this script becomes wrong, a test fails.

**Setup (before you start):** open `index.html` in Chromium (or run `python3 -m http.server 8000`). Start from a fresh page load so the Overview is empty. Keep DevTools closed until step 8.

---

## 1. The idea (1 min)

**Say:** "People rarely ask 'is this WPA3?'. They ask 'should I tap this link?' or 'is this text from my bank?'. NetSafe answers those questions in plain English, and everything runs in the browser."

**Do:** scroll to **Your security overview**.
**Expect:** all four cards say **Not assessed**; the headline says "Areas you have not checked are not counted as safe". Point at the three labels: *Assessed*, *Not assessed*, *Information unavailable*.
**Say:** "Not checked never means safe. And there is no single safety score, because a link, a password and a network are different things."

## 2. A scam SMS (2 min)

**Do:** go to **Is this message a scam?** Paste:

> HBL Alert: Your account will be blocked within 24 hours. Verify your CNIC and OTP now at http://hbl-verify.example/login

Set *Sender* to `+92 300 0000000` and *Received by* to `SMS`. Press **Check message**.

**Expect:** **High scam warning level.** Phrases are highlighted and numbered in the original message. Six findings: asks for an OTP, asks for ID details (CNIC), threatens account closure, pushes you to act quickly, a risky link, and a bank message from an ordinary mobile number. The "Most important step" says never to share an OTP. A section **If you already replied or clicked** tells the user to call their bank.
**Say:** "Each finding says what we noticed, why it matters, what could happen and what to do. It also says what to do if you already tapped, which is when people actually need help."

## 3. No false alarm (30 s)

**Do:** press the example **Genuine code notice** ("Your verification code is 482913 ... Never share this code with anyone.").
**Expect:** **Low**, no findings, and a note: never share the code, and change your password if you did not request it.
**Say:** "It does not cry wolf on a normal code message."

## 4. The link inside (2 min)

**Do:** go to **Is this website link safe?** and press the example **Fake brand** (`http://paypal.com.secure-login.example/verify`).
**Expect:** **High warning level.** The link is split into parts and the real site, `secure-login.example`, is highlighted. Findings: not encrypted (HTTP), uses the name "Paypal" on a different website, account words in the name.
**Do:** press **Tricky @** (`https://paypal.com@account-check.example/`): High, "text before the @ is ignored". Press **Look-alike letters** (`https://xn--pypal-4ve.example`): High, mixed alphabets. Press **Normal site**: Low, with "does not make the site safe".
**Say:** "It never opens the link, and the page lists what it did not check: reputation, certificate, redirects."

## 5. Passwords (2 min)

**Do:** go to **Password strength checker**, press **Show**, and type each, reading the result:

| Type | Expect |
|---|---|
| `Summer2024!` | **Weak**: the "one word + number + symbol" shape, and short |
| `P@ssw0rd` | **Weak**: a common password with symbol swaps |
| `correct horse battery staple` | **Weak**: a famous example phrase |
| `river lantern copper maple` | **Strong**: long, easy to remember |

**Do:** type `Summer2024!` again, tick **I use this password on other accounts**, then press Tab to leave the field.
**Expect:** a reuse warning; the Overview now lists the password.
**Say:** "It is an estimate, not a crack-time promise, and the page says so. The password is never stored or sent."

## 6. Wi-Fi: public is not automatically dangerous (2 min)

Go to **Wi-Fi risk assessment**. Enter each scenario and press **Assess**.

| Network name | Network type | Security protocol | Password protection | Who knows the password? | Location | Captive portal | Expect |
|---|---|---|---|---|---|---|---|
| `Cafe_Guest` | Public (open to guests) | WPA2 | Yes | Shared publicly (sign, receipt) | Cafe / restaurant | Yes | **Medium (58)**, not High. Note: "Public does not automatically mean dangerous." |
| `Airport_Free` | Public (open to guests) | Open (no security) | No | (not asked) | Airport / station | Yes | **High** |
| `eduroam` | Public (open to guests) | Enterprise (your own username and password) | Yes | Each person has their own login (university, office) | University | No | **Low (20)** |
| `Home_5G` | Private (home or personal) | WPA3 | Yes | Me or a few trusted people | Home | No | **Low (5)**, nothing to fix |
| `Guest` | Public (open to guests) | I don't know | Yes | Shared publicly (sign, receipt) | Cafe / restaurant | Unknown | **Medium**, "held at Medium because the security type is unknown" |

**Say:** "A cafe with a WPA2 password is not 'dangerous'. The tool explains what is reasonable to do there. And when the user does not know the security type, it says so instead of guessing."

## 7. The Overview and report (1.5 min)

**Do:** scroll to **Your security overview**.
**Expect:** Messages, Website links and Password are **Assessed**; Wi-Fi shows **Information unavailable** (the last scenario). The headline counts high-level results. **What to do next** is ordered by urgency (scam message, then link, then password, then Wi-Fi), each with: what was detected, why it matters, what could happen, do this now, if you already responded, avoid it next time.
**Do:** press **Download report (.txt)** and open it. Press **Print overview** to show the clean print layout.
**Say:** "The report holds only generic advice. Nothing you typed is in it."

## 8. Crypto Lab (2 min)

**Do:** go to **Cryptography Lab**, **Real encryption: AES-GCM**.
1. Press **Encrypt**: unreadable output. Press it again: different output (random salt and nonce).
2. Press **Decrypt**: the message returns.
3. Change the passphrase and press **Decrypt**: refused.
4. Restore the passphrase and press **Change one character, then decrypt**: refused, with the explanation that this is integrity protection.
5. In **Hashing: SHA-256**, type `abc`: the hash starts `ba7816bf`. The line below shows that adding one full stop changes about half of the 256 bits.

**Say:** "This is the same kind of encryption HTTPS and WPA3 use, running here with the browser's own cryptography. Scroll down for HTTPS, symmetric vs asymmetric, and WPA2 vs WPA3 in simple terms."

## 9. Privacy proof (1 min)

**Do:** open DevTools. **Network** tab: reload and show that after the page's own files there are no requests, even after using the tools. **Application** tab: Local storage, Session storage, Cookies and IndexedDB are empty. Press **Reload**: the Overview is empty again.
**Say:** "It cannot send your data anywhere: the page's security policy blocks all outbound requests, and a test checks this."

## If something goes wrong

- *The AES buttons are disabled:* the browser reports no Web Crypto. Serve the folder with `python3 -m http.server 8000` and open `http://localhost:8000`.
- *The page looks different:* use a current Chromium-based browser. Other browsers were not tested.
- *To reset between runs:* reload the page (this clears everything by design).

## Closing line

"NetSafe gives clear next steps for everyday situations, tells you honestly what it could not check, and keeps everything on your device. It is an educational aid, not a guarantee of safety."
