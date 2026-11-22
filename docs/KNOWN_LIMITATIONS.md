# Known limitations

NetSafe is an educational, rule-based tool. It is meant to help people pause and check, not to replace judgement, a bank, or a professional.

## General

- **Not AI.** Every result comes from readable rules. It cannot understand context or meaning.
- **A Low result is not a promise.** Each tool says so on the page. Scams can look calm and normal, and genuine messages can look alarming.
- **English only.** The interface is English. Message wording rules cover English and a few Roman Urdu phrases.
- **No network access by design.** Nothing is looked up, so anything that needs the internet (reputation, certificates, breach lists) is not checked. Adding it would mean sending data out and needs a backend and user consent, which the project deliberately avoids.
- **Scores are judgement calls.** Weights and thresholds are explained and editable, but they are not scientifically calibrated.

## Link checker

- Reads the text of the link only. Not checked: reputation or blocklists, the certificate, redirects, domain age or ownership, page content.
- The "registered domain" uses a small built-in list of 17 two-part suffixes (such as `co.uk`, `com.pk`), not the full Public Suffix List, so it can be wrong for unusual endings.
- Brand impersonation uses a list of 18 well-known brands. Others are missed. Brands with many regional domains (such as Amazon) may cause false alarms for regional sites not in the list. Typo tricks such as `rn` for `m` are not caught.
- Mixed-alphabet detection covers Latin, Cyrillic and Greek only.
- Only 12 shorteners and 16 unusual endings are listed. Legitimate shorteners and legitimate sites with many subdomains are still flagged (as weak signals).
- A link typed without `http://` or `https://` is analysed, but encryption cannot be judged (shown as Information unavailable).
- Maximum 2,048 characters.

## Message checker

- Misses scams that are phrased differently from the rules, and cannot read images, attachments or voice notes.
- Genuine bank alerts about "suspicious activity" or a blocked card can score Medium. A genuine code notice is recognised only when it contains "never/do not share".
- Cannot confirm who sent a message. Sender names, numbers and emails can be faked, so the sender checks are weak signals that run only when a sender is supplied.
- Maximum 5,000 characters.

## Password checker

- A heuristic estimate, not a cracking-time calculation. It has a short list of 67 common passwords and words plus 7 famous phrases, no full dictionary, and no breach database.
- Long strings of ordinary words without separators are not split into words, so a long, predictable string without any listed word can score well.
- It cannot know your personal details (name, birthday) or whether the password was leaked. "Reuse" depends on the box you tick.
- Only the first 256 characters are analysed.

## Wi-Fi assessment

- Works only from the answers you give. It cannot scan, cannot detect fake hotspots (evil twins), and cannot check that the security type you chose is correct.
- Does not consider router firmware, guest isolation, WPS, or what other devices are on the network.
- Mixed WPA2/WPA3 and Enterprise are simplified. Enterprise is assumed to give each person their own credentials.

## Cryptography Lab

- A learning demo, not an audited tool. Do not use it for real secrets.
- Needs a secure context (HTTPS, localhost, or a local file in Chromium). Messages are limited to 2,000 characters. Each encryption takes a fraction of a second because of the 600,000 key-derivation rounds.
- No asymmetric (public-key) demo. Those topics are explained but not run. Caesar works on Latin letters only.

## Overview and report

- Held in memory for the current tab only. It keeps up to 8 link results and 8 message results; password and Wi-Fi keep the latest only.
- The order of the action plan (message, then link, then Wi-Fi, then password at equal severity) is a judgement about urgency.
- "Information unavailable" is currently raised for an unknown Wi-Fi security type and for a link without http/https.
- The report is plain text. A PDF is available only through the browser's print dialog ("Print overview", then "Save as PDF").

## Testing and compatibility

- **Browsers:** all browser tests ran on Chromium 153 (headless, Playwright). Firefox, Safari, Edge and real phones were not tested. The code uses modern features (Unicode property escapes in regular expressions, `matchAll`, Web Crypto, `<details>`, `:focus-visible`), so older browsers may not work.
- **Accessibility:** checked automatically (text contrast on all text including gradient backgrounds, accessible names, heading order, landmarks, 44 px targets, keyboard focus rings, reduced motion). Not tested with a screen reader (NVDA, VoiceOver, TalkBack), at 200%/400% zoom, or by real users. Colour is never the only signal (labels and shapes are used too), but that was a design rule, not a user test.
- **Viewports:** layout checked at 320, 375, 768 and 1280 px wide.
- **Security:** no independent review (see [security and privacy](SECURITY_AND_PRIVACY.md)).

## Ideas that are not implemented

Full Public Suffix List and larger brand list; more languages (Urdu script); optional, consent-based breach check; optional link expansion through a service the user chooses; a public-key (RSA / key exchange) demo; light theme.
