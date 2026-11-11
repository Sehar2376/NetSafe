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

// Short, evergreen security facts (no invented news or statistics). Used by the typing effect and ticker.
const HEADLINES = [
 'Open Wi-Fi sends your data without encryption.',
 'WEP encryption can be broken in minutes.',
 'A shared Wi-Fi password does not stop other users from watching.',
 'Fake hotspots copy real network names. Confirm before you connect.',
 'Check a network in under a minute with NetSafe.'
];
const TICKER = [
 'HTTPS protects page contents on untrusted Wi-Fi',
 'WPA3 is the strongest current Wi-Fi protection',
 'Use mobile data for banking on public networks',
 'Captive portal login pages are easy to imitate',
 'Long, unique passphrases beat short complex passwords',
 'NetSafe is an educational estimate, not a security audit'
];
