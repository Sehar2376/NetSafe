// Educational content (kept separate from logic so it is easy to edit).
const EDU = [
 ['Open Wi-Fi','No password and no encryption. Anyone nearby can capture unprotected traffic.'],
 ['WEP','Oldest protocol (RC4 stream cipher). Broken: keys can be recovered in minutes.'],
 ['WPA','Interim fix using TKIP. Outdated, with known weaknesses.'],
 ['WPA2','Uses AES-CCMP. Strong with a private, long password; weak if the password is widely shared.'],
 ['WPA3','Uses SAE, a stronger handshake that resists offline password guessing, plus stronger encryption.'],
 ['Encryption','Scrambling data with a key so only the right party can read it.'],
 ['Authentication','Proving who you are (a password) before being allowed on the network.'],
 ['HTTPS','Web traffic protected by TLS. Protects page contents on untrusted Wi-Fi, though not which sites you visit.'],
 ['TLS','Protocol that agrees a key using public-key crypto, then encrypts data with a fast symmetric cipher such as AES. Certificates show the site controls its domain name, not that it is trustworthy.'],
 ['Hashing','One-way fingerprint of data (SHA-256). Used to check integrity. Password storage needs salted, deliberately slow hashes, not plain SHA-256. WPA2 uses PBKDF2 to turn a password into a key.'],
 ['Eavesdropping','Silently capturing traffic on a shared network. Encryption and HTTPS protect the contents of that traffic.'],
 ['Man-in-the-middle','Attacker sits between you and a site, reading or altering traffic. Certificates help detect it.'],
 ['Evil twin','Fake hotspot copying a real network name to lure users. Confirm the exact name and prefer HTTPS/VPN.']
];


// Concept cards for the Cryptography Lab. Plain text only (rendered with textContent).
const CONCEPTS = [
 { title: 'Encryption vs hashing', lead: 'Both scramble data, but for different jobs.', items: [
  ['Encryption', 'Two-way. Needs a key. Readable data becomes scrambled data, and the right key turns it back. Protects confidentiality: HTTPS, Wi-Fi, locked files.'],
  ['Hashing', 'One-way. Gives a fixed-size fingerprint that cannot be turned back. Used to check data was not changed, and (with salt and a slow method) to store passwords.'],
  ['Remember', 'You cannot "decrypt" a hash, but a short or guessable input can still be found by trying many guesses.'] ] },
 { title: 'Symmetric vs asymmetric encryption', lead: 'The difference is how many keys are used.', items: [
  ['Symmetric (e.g. AES)', 'One shared key locks and unlocks. Fast, so used for the bulk of data. Problem: both sides must get the key safely.'],
  ['Asymmetric (e.g. RSA, elliptic curves)', 'A key pair: a public key anyone can have and a private key kept secret. Slower. Used to agree on keys and to prove identity with signatures.'],
  ['In practice', 'Systems combine them: asymmetric methods agree on a key, then symmetric encryption protects the data. HTTPS works this way.'] ] },
 { title: 'How HTTPS and TLS protect a page', lead: 'A simplified view of what happens when you open an https:// site.', items: [
  ['1. Hello', 'Your browser and the server say hello and agree which algorithms to use.'],
  ['2. Certificate', 'The server shows a certificate, a signed statement that it controls that domain name.'],
  ['3. Check', 'Your browser checks the certificate is valid, matches the site name and was issued by a trusted authority.'],
  ['4. Key agreement', 'Both sides agree on a shared secret key without sending it across the network.'],
  ['5. Encrypted session', 'The rest of the session uses fast symmetric encryption (such as AES-GCM), which also detects tampering.'],
  ['Limit', 'The padlock means the connection to that domain is encrypted. It does not mean the site is honest. Scam sites can use HTTPS too.'] ] },
 { title: 'Confidentiality, integrity and availability', lead: 'The three goals of security, often called the CIA triad.', items: [
  ['Confidentiality', 'Only the right people can read the data. Example: encryption stops others on Wi-Fi reading your traffic.'],
  ['Integrity', 'Data is not changed without being noticed. Example: hashes and the AES-GCM tag reveal tampering.'],
  ['Availability', 'Systems and data work when needed. Example: backups, updates and protection against overload attacks.'] ] },
 { title: 'WPA2 and WPA3 in simple terms', lead: 'How modern Wi-Fi protection works.', items: [
  ['WPA2-Personal', 'Your password is turned into a key with PBKDF2 hashing. Traffic is encrypted with AES. Weakness: someone who captures the connection handshake can try password guesses offline, so a weak password is risky.'],
  ['WPA3-Personal', 'Uses SAE, a password-based key exchange. Each guess needs a live exchange with the network, so offline guessing is resisted. Each session gets its own keys, so a later password leak does not expose old traffic.'],
  ['Enhanced Open (OWE)', 'Where both the device and router support it, encrypts traffic on open networks without a password.'],
  ['Limit', 'None of these stop you joining a fake hotspot with a copied name. Check the exact network name and use HTTPS.'] ] }
];
