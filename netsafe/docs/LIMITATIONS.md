# Limitations

NetSafe is an educational, rule-based tool. It helps people pause and check; it does not replace judgement, a bank, or a professional.

## General

- **Not AI.** Every result comes from readable rules and cannot understand context. The rules are listed on the Learn page.
- **Low is not a promise.** Scams can look calm and genuine messages can look alarming. Each tool says so.
- **English interface.** Message rules cover English and a few Roman Urdu phrases only.
- **No network lookups, by design.** Reputation, certificates, redirects and breach lists are not checked; adding them means sending data out and needs a backend and user consent.
- **Scores are judgement.** Weights and thresholds are explained and editable, not scientifically calibrated.

## Link checker

- Reads text only. Not checked: reputation, blocklists, certificate, redirects, domain age or ownership, page content.
- "Registered domain" uses 17 built-in two-part suffixes (such as `co.uk`, `com.pk`), not the full Public Suffix List.
- Brand impersonation uses 36 brands, including Pakistani banks, wallets, couriers and government offices; others are missed and regional sites of listed brands may be flagged. Mixed-alphabet detection covers Latin, Cyrillic and Greek.
- 22 shorteners and 28 unusual endings are listed. About 27 free hosting platforms (pages.dev, vercel.app, github.io ...) are a weak signal alone, because many honest personal sites use them. A government word (gov, gop) outside an official government ending is flagged; legitimate ones are still flagged (as weak signals).
- A link typed without `http://` or `https://` is analysed but encryption cannot be judged (shown as Information unavailable). Maximum 2,048 characters.
- Look-alike detection compares the site name with the 36 built-in brands only: one-letter changes, I/l and rn/m swaps, digit swaps and a short table of Cyrillic and Greek letters. Imitations of other names, and more distant spellings, are not recognised. A similar but genuine name (for example goggle.com) can be flagged.

## Message checker

- Misses scams phrased differently from the rules; cannot read images, attachments or voice notes.
- Genuine bank alerts about "suspicious activity" can score Medium. A genuine code notice is recognised only if it says "never/do not share".
- Cannot confirm who sent a message; sender names, numbers and emails can be faked, so sender checks are weak signals and run only when a sender is supplied. Maximum 5,000 characters.
- Threat detection looks for a violent verb aimed at a person ("kill him", "hurt your son"), kidnapping or ransom words, and "your son is with us" only alongside a threat or money demand. Joking messages such as "I will kill you" are still rated High. Threats written another way, in other languages or with heavy misspellings can be missed. NetSafe cannot tell whether a threat is real: always check on the person and contact the police.
- Money misspellings recognised are a short list (moeny, mony, monney, paisa and a few more).
- Scenario rules (blackmail, money sent by mistake, task jobs, investment, code theft, remote-access apps, official-programme names, numbers to call) were built from PTA, FIA, Punjab Safe City, SBP, SECP, FTC and FBI warnings published 2024-2026. Wording outside those patterns is missed. Tested on 20 real-style scam messages (19 High, 1 Medium) and 13 everyday messages (all Low); other everyday wording can still trigger a rule.
- A real-world sweep of 246 scenarios passes (`tests/realworld.test.js`): a tuning set, a fresh set written after tuning (54 of 61 right before its fixes, 89%), and 40 everyday messages that stay Low. New wording outside these patterns can still be missed or, rarely, flagged.
- Official-programme names (BISP, e-challan, PTA, FBR, courier ...) only count when the message also asks for money, codes or details, gives a link or a number to call, or threatens. A genuine notice that only informs stays Low.

## Password checker

- An estimate, not a cracking time. It has 91 common passwords and words (including the NordPass 2025/2026 top lists and Pakistani favourites) plus 7 famous phrases, no dictionary and no breach database.
- Long strings of ordinary words without separators are not split into words.
- It recognises Pakistani mobile numbers, 13-digit CNIC numbers and dates of birth (DDMMYYYY or YYYYMMDD) only when they are the whole password. Names, addresses and other personal details are not known.
- It cannot know personal details or whether the password leaked; "reuse" depends on the box you tick. Only the first 256 characters are analysed.

## Wi-Fi assessment

- Uses only your answers: it cannot scan, detect fake hotspots (evil twins) or check that the security type you chose is correct.
- Network-name checks are simple patterns: a "free" name on a public network, and about 20 factory router names on a private network. A fake hotspot can use any name.
- Ignores router firmware, guest isolation, WPS and other devices on the network. Mixed WPA2/WPA3 and Enterprise are simplified.

## Crypto Lab

- A learning demo, not an audited tool; do not use it for real secrets.
- Needs a secure context (HTTPS, localhost, or a local file in Chromium). Messages are limited to 2,000 characters. Caesar handles Latin letters only. No public-key demo (explained, not run).

## Overview and report

- The pages are views of one HTML file. Results live in memory, so they survive moving between pages but not a reload.
- Keeps up to 8 link results and 8 message results; password and Wi-Fi keep the latest only. The plan order (message, link, Wi-Fi, password at equal severity) is a judgement about urgency.
- "Information unavailable" is raised for an unknown Wi-Fi security type and a link without http/https. The report is plain text; use the browser's print dialog for PDF.

## Testing and compatibility

- Browser tests run on Chromium only. Firefox, Safari, Edge and real phones were not tested. The code uses modern features (Unicode property escapes in regular expressions, `matchAll`, Web Crypto, `<details>`, `:focus-visible`). If the page opens with the "tools are not running" banner, use `python serve.py`.
- Accessibility was checked automatically (text contrast including gradients, accessible names, headings, landmarks, 44 px targets, keyboard focus, reduced motion) on all pages. Not tested with screen readers, at 200%/400% zoom, or by real users.
- No independent security review (see [SECURITY_AND_PRIVACY.md](SECURITY_AND_PRIVACY.md)). The CI workflow in `.github/workflows` has not been run on GitHub.

## Links that look exactly like a real address

- Look-alike names (Cyrillic letters, `goog1e`, `rnicrosoft`, brand used as a prefix) are detected and rated High.
- A link whose visible text differs from its real address is detected only when the copy carries the real address: copying from an email or web page in a computer browser does; SMS and chat apps on phones copy plain text only. Users should use "Copy link address".
- A genuine address that serves a fake page (a hacked site, or a fake Wi-Fi network redirecting traffic) cannot be detected from the link text. That needs online reputation checks, which NetSafe does not use because they would send the link to a third party.

## Messages from a friend's hacked account

- NetSafe cannot tell that an account was hacked: the message comes from the real number, name and photo. It only recognises the wording patterns these scams use (money with a repay promise, a sudden emergency, "can't talk", payment to someone else's wallet, gift card codes, new-number stories, vote requests, code requests).
- An opening message such as "Hi, are you free?" has nothing to detect yet. A scammer who writes calmly and copies the person's style can still get a Low or Medium result.
- A real friend asking for money with the same words gets the same warning. The advice (call them on their usual number first) is right either way.
