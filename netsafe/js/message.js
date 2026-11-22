/* NetSafe message analyzer. Transparent RULE-BASED matching on pasted text. It is NOT AI and does not
   understand meaning: it looks for wording that scam messages commonly use. Pure logic: no DOM, no network, nothing stored.
   Edit MSG_RULES / MSG_CONFIG to change behaviour. English plus a few Roman Urdu phrases. */
const MSG_U = typeof NetSafeUrl !== 'undefined' ? NetSafeUrl : typeof require === 'function' ? require('./url.js') : null;
if (!MSG_U) throw new Error('js/url.js must load before js/message.js');
const MSG_CONFIG = { thresholds: { medium: 20, high: 50 }, maxLength: 5000, maxSender: 100 };
const MSG_ORDER = ['Low', 'Medium', 'High'];

// req(): "<asking verb> ... <sensitive thing>" within a few words, e.g. "share your OTP". Asking for a thing is the signal, not just mentioning it.
const req = (verbs, nouns, gap = 4) => new RegExp('\\b(?:' + verbs + ')\\b(?:\\W+\\w+){0,' + gap + '}?\\W+(?:' + nouns + ')\\b', 'gi');
const ASK = 'send|share|give|tell|reply|forward|provide|read out|reveal|enter|submit|confirm|verify|need|require|want|bhej(?:ein|en|o)?|bata(?:ein|en|o)?';
const ASK2 = 'send|share|give|provide|enter|confirm|verify|submit|update|reply|need|require|bhej(?:ein|en|o)?|bata(?:ein|en|o)?';

const MSG_RULES = [
  { id: 'extortion', examples: ['we will kill him', 'we have kidnapped your daughter', 'pay the ransom', 'or we will hurt your son'], pts: 40, floor: 'High', title: 'Threatens violence or kidnapping',
    re: [/\b(?:will|gonna|going to|shall|or we|we.?ll|i.?ll|warna)\s+(?:\w+\s+){0,2}?(?:kill|hurt|harm|shoot|torture|murder|attack|stab)\s+(?:him|her|you|them|u|ur|your\s+\w+|the (?:boy|girl|child|kid))\b/gi,
         /\b(?:kidnap(?:ped|ping)?|abduct(?:ed|ion)?|hostage|ransom|held captive|jaan se mar\w*|maar (?:den|dein|dain)ge)\b/gi],
    why: 'Threats of violence and kidnapping claims are used in "virtual kidnapping" extortion scams. Fear is meant to make you pay before you check.',
    could: 'You could send money to criminals, and it is very hard to get back. If the threat is real, delay in reaching the police matters.',
    action: 'Do not pay and do not reply. Call the person named directly, and ask family or friends where they are. Contact the police now (15 in Pakistan, or your local emergency number) and keep the message as evidence.' },
  { id: 'held', examples: ['your son is with us', 'we have your daughter'], pts: 25, requires: ['extortion', 'payment'], title: 'Claims a family member is with them',
    re: [/\b(?:your|ur|tumhar[ae]|aap k[ae])\s+(?:son|daughter|child|kid|baby|wife|husband|mother|mom|mum|father|dad|brother|sister|beta|beti|bhai|behen)\s+(?:is|are)\s+(?:with us|with me|in our (?:custody|hands)|our hostage)\b/gi,
         /\bwe (?:have|got|took|are holding) (?:your|ur) (?:son|daughter|child|kid|baby|wife|husband|mother|mom|mum|father|dad|brother|sister|family)\b/gi],
    why: 'Saying a relative is "with us", together with a threat or a demand for money, is the core of a kidnapping or extortion scam.',
    could: 'Panic can make you pay before checking that your relative is actually safe.',
    action: 'Call your relative directly, and people who would know where they are, before doing anything else. Contact the police.' },
  { id: 'blackmail', examples: ['I recorded you through your webcam', 'we will send your photos to all your contacts', 'your private video will go viral'], pts: 40, floor: 'High', title: 'Threatens to leak private photos, videos or details',
    re: [/\b(?:i|we)(?: have)? (?:recorded|hacked|filmed|captured) (?:you|your (?:webcam|camera|device|phone|computer|screen))\b/gi,
         /\b(?:your|ur) (?:private|personal|intimate|nude|naked|secret) (?:videos?|photos?|pictures?|pics|images?|chats?|data)\b/gi,
         /\b(?:send|share|forward|leak|post|upload|publish|expose)\w*\s+(?:\w+\s+){0,4}?(?:to|with)\s+(?:all\s+)?(?:your|ur)\s+(?:contacts|family|friends|relatives|colleagues|boss)\b/gi,
         /\b(?:go|make it|will be|kar denge|kar dein ge)\s+viral\b/gi, /\bviral kar\w*/gi, /\bI know your password\b/gi,
         /\bwill\s+(?:call|message|contact|text|whatsapp|inform)\s+(?:all\s+)?(?:your|ur)\s+(?:contacts|family|relatives|friends|colleagues|boss)\b/gi,
         /\bwill\s+(?:post|leak|upload|publish|share|send)\s+(?:all\s+)?(?:your|ur)\s+(?:pictures?|photos?|pics|videos?|images?|chats?)\b/gi],
    why: 'Blackmail messages claim to have private videos or data and threaten to share them unless you pay. Most "I recorded you" emails are mass-sent and have nothing. Loan-app recovery agents use the same threats.',
    could: 'Paying usually leads to more demands, not deletion.',
    action: 'Do not pay and do not reply. Keep the messages as evidence and report to the FIA cybercrime helpline (1991 in Pakistan) or your local police. If the message shows a real old password, change it everywhere you used it.' },
  { id: 'wrong-transfer', examples: ['sent to your account by mistake', 'please send it back', 'galti se aap ke account mein'], pts: 50, title: 'Says money was sent to you by mistake',
    re: [/\b(?:sent|transferred|deposited|credited|bheje?|bhej diye?|aa gaye?)\b(?:\W+\w+){0,6}?\W+(?:by mistake|mistakenly|accidentally|wrongly|galti se|ghalti se)\b/gi,
         /\b(?:by mistake|mistakenly|accidentally|galti se|ghalti se)\b(?:\W+\w+){0,6}?\W+(?:sent|transferred|account|wallet|number|bhej)\w*/gi,
         /\b(?:wrong (?:transfer|transaction|number|account)|send (?:it|the money|the amount|them) back|return (?:the|my) (?:money|amount|payment)|wapas (?:bhej\w*|kar ?do|kar dein|kardein))\b/gi],
    why: 'In this scam a fake "credit" SMS is sent, then someone asks you to return money that never arrived, or to read out a code to "reverse" it.',
    could: 'You would send your own money, or a code that lets them take more.',
    action: 'Check your balance in your bank or wallet app, not in the SMS. Do not send anything back yourself. If money really arrived, tell your bank and let them reverse it.' },
  { id: 'job-task', examples: ['earn Rs 5,000 per day', 'like videos and get paid', 'recharge 100 USDT for VIP level'], pts: 40, title: 'Easy-money job offer (task scam)',
    re: [/\b(?:earn|make|income|salary|profit|kamaa?(?:o|ein|en|yen)?)\b(?:\W+\w+){0,6}?\W+(?:per|a|every|daily|rozana|roz)\W+(?:day|hour|week|din)\b/gi,
         /\b(?:like|rate|review|watch|subscribe to|follow)\s+(?:\w+\s+){0,2}?(?:videos?|products?|apps?|hotels?|posts?|pages?)\b(?:\W+\w+){0,6}?\W+(?:paid|earn|commission|reward|income|salary)\b/gi,
         /\b(?:recharge|top[- ]?up|vip (?:level|upgrade)|task reset|activation fee|registration fee|security deposit)\b/gi],
    why: 'Task scams offer high pay for simple online tasks, pay a little at first, then ask you to "recharge" or upgrade with your own money.',
    could: 'You could lose everything you deposit, and share ID documents that are misused.',
    action: 'Ignore job offers that arrive unexpectedly on WhatsApp, Telegram or SMS. Never pay to get a job or to unlock your earnings.' },
  { id: 'job-generic', examples: ['part-time job', 'work from home', 'no experience needed'], pts: 10, requires: ['job-task', 'payment', 'banking', 'link'], title: 'Unexpected job offer',
    re: [/\b(?:part[- ]time (?:job|work)|work from home|online job|home based job|data entry job|no experience (?:needed|required)|ghar baithe)\b/gi],
    why: 'Real employers rarely recruit through unexpected WhatsApp, Telegram or SMS messages.', could: 'The offer may lead to fees or requests for your ID documents.',
    action: 'Look up the company yourself and apply only through its official website.' },
  { id: 'investment', examples: ['guaranteed profit', 'double your money', '3% daily profit'], pts: 50, title: 'Promises guaranteed or very high returns',
    re: [/\b(?:guaranteed|fixed|assured|risk[- ]free|100%)\s+(?:\w+\s+){0,2}?(?:profit|returns?|income|earnings)\b/gi,
         /\b(?:double|triple|2x|3x|10x)\s+(?:your\s+)?(?:money|investment|amount|paisa|paise)\b/gi,
         /\b\d+(?:\.\d+)?\s?%\s+(?:(?:daily|weekly|monthly)\s+)?(?:profit|returns?)\b(?:\s+(?:per|a|every|daily|weekly|monthly)\b)?/gi, /\bno risk\b/gi],
    why: 'No real investment can guarantee high returns. These offers often start as a friendly "wrong number" chat.',
    could: 'The "platform" shows fake gains, then blocks withdrawals until you pay more.',
    action: 'Do not invest through anyone who contacted you unexpectedly. Check that a company is licensed with the SECP (Pakistan) or your country\'s regulator.' },
  { id: 'crypto', examples: ['crypto trading platform', 'forex signals', 'USDT investment'], pts: 15, title: 'Crypto or forex trading offer',
    re: [/\b(?:crypto|bitcoin|btc|usdt|forex|binary options?)\s+(?:\w+\s+){0,1}?(?:trading|investment|signals?|platform|mining|plan)\b/gi],
    why: 'Fake trading platforms are a common follow-up to friendly chats and job offers. They show fake profits, then block withdrawals.', could: 'You could lose everything you deposit.',
    action: 'Do not deposit money on a platform someone recommended in a message. Check it is licensed with the SECP or your regulator.' },
  { id: 'official-claim', examples: ['BISP', 'e-challan', 'your SIM will be blocked by PTA'], pts: 20, requires: ['payment', 'link', 'banking', 'otp', 'password', 'threat', 'prize', 'call-number'], title: 'Uses a government or official programme name',
    re: [/\b(?:bisp|benazir(?: income support)?|ehsaas|8171|e[- ]?challan|traffic (?:fine|challan|violation)|safe city|psca|fia|cyber ?crime|pta|dirbs|nadra|fbr|tax refund|income tax|customs(?: duty| office)?|pakistan post|courier|parcel|package|tcs|leopards|electricity bill|gas bill|k[- ]?electric|lesco|iesco|toll)\b/gi],
    why: 'Scammers copy government aid schemes, traffic fines, tax refunds, SIM blocking and delivery notices. Official bodies do not ask for payment, codes or bank details by SMS or WhatsApp.',
    could: 'A fake fine, refund or aid message can take your money or bank details.',
    action: 'Check with the organisation directly: its official website or helpline, typed in yourself. For e-challans in Punjab use the official Safe City website or e-Pay Punjab app, not a link in a message.' },
  { id: 'remote-access', examples: ['install AnyDesk', 'download this app', 'share your screen', 'bank.apk'], pts: 35, floor: 'High', title: 'Asks you to install an app or share your screen',
    re: [/\b(?:anydesk|teamviewer|quick ?support|rustdesk|airdroid|screen ?share|share (?:your )?screen)\b/gi,
         /\b(?:install|download)\w*\s+(?:this|our|the|an?|following|given)\s+(?:\w+\s+)?(?:apk|app|application|software)\b(?!(?:\W+\w+){0,4}\W+(?:play store|app store|google play))/gi, /\b\w+\.apk\b/gi, /\bapk (?:file|link)\b/gi],
    why: 'Remote-control apps and unofficial APK files let someone see your screen, read your codes and use your banking apps.',
    could: 'Your bank or wallet could be emptied while you watch.',
    action: 'Do not install anything a stranger asks for. Banks never need remote access. Get apps only from the official app store.' },
  { id: 'call-number', examples: ['call this number 0300-1234567', 'contact us on WhatsApp +92 300 1234567'], pts: 10, title: 'Tells you to call or message a number in the text',
    re: [/\b(?:call|contact|whatsapp|message|text|dial|rabta)\w*\b(?:\W+\w+){0,4}?\W+(?:\+?\d[\d\s-]{8,}\d)/gi],
    why: 'Scam messages give their own number so you reach the scammer instead of the real organisation.', could: 'The person who answers may pretend to be your bank or an official.',
    action: 'Use the number on your card, bill or the official website instead.' },
  { id: 'code-theft', examples: ['I sent a code to your number by mistake', 'send me the 6 digit code', 'tell me the code you just received'], pts: 35, floor: 'High', title: 'Asks for a code sent to your phone',
    re: [/\b(?:sent|send|share|forward|tell|give)\w*\b(?:\W+\w+){0,4}?\W+(?:\d|six|4|5|6)[- ]?digit(?:s)? (?:code|number|pin)\b/gi,
         /\b(?:whatsapp|telegram|facebook|instagram|gmail|google) (?:verification )?code\b/gi,
         /\bcode\b(?:\W+\w+){0,5}?\W+by mistake\b/gi,
         /\b(?:tell|send|share|give|forward|read)\w*\s+(?:me|us)\s+(?:the|that|this)\s+code\b/gi, /\bcode (?:you|that you) (?:just )?(?:received|got)\b/gi],
    why: 'The code that arrives by SMS is the key to your WhatsApp or other account. Whoever has it can move your account to their phone.',
    could: 'Your WhatsApp could be taken over and used to ask your contacts for money.',
    action: 'Never share a code you receive, even with a friend. Turn on two-step verification in WhatsApp (Settings, Account, Two-step verification).' },
  { id: 'otp', examples: ['share your OTP', 'verify your OTP', 'OTP bhej dein'], pts: 35, floor: 'High', title: 'Asks for a one-time code (OTP) or PIN',
    re: [req(ASK, 'otp|one[- ]time (?:pass(?:word|code)|code|pin)|verification code|security code|pin(?: code)?|cvv|cvc'), /\b(?:otp|pin|code)\W+(?:\w+\W+){0,2}?(?:bhej|bata)\w*/gi],
    why: 'An OTP or PIN approves logins and payments. Whoever has it can act as you.', could: 'Someone could take over your account or move money out of it.',
    action: 'Never share an OTP or PIN with anyone, even someone who says they are from your bank. Contact the bank through the number on your card or its official website.' },
  { id: 'password', examples: ['send your password', 'confirm your login details'], pts: 30, floor: 'High', title: 'Asks for a password or login details',
    re: [req(ASK2, 'password|passcode|login details|login credentials|credentials|secret code')],
    why: 'Real companies do not ask you to send your password in a message.', could: 'Someone could log in as you and lock you out.',
    action: 'Do not send your password. If you are worried about the account, open the official app or website yourself and change the password there.' },
  { id: 'banking', examples: ['send your card number', 'verify your CNIC', 'share your bank details'], pts: 30, floor: 'High', title: 'Asks for card, bank or ID details',
    re: [req(ASK2, 'card number|card details|account number|iban|cnic|cvv|expiry date|bank details|bank account details|atm pin|debit card|credit card|ssn|social security(?: number)?|national id|id card'), /\b(?:biometric(?:s)?(?: verification)?|thumb ?impressions?|fingerprints?)\b(?:\W+\w+){0,4}?\W+(?:calling|call|visit|send|share|give|link|agent)\b/gi],
    why: 'Card, account and ID numbers can be used to take money or pretend to be you.', could: 'Money could be taken, or your identity used to open accounts.',
    action: 'Do not send these details. Call your bank on the number printed on your card or shown on its official website.' },
  { id: 'payment', notAfter: /\b(?:i|we)\s*(?:will|'ll|’ll|am going to|can|shall)\s+$/i, examples: ['transfer money to this account', 'send Rs. 5,000 processing fee', 'buy gift cards', 'sent us moeny', 'send 1000k', 'Rs 2000 tax bhejein'], pts: 30, title: 'Asks you to send money or pay a fee',
    re: [req('send|sent|transfer|transferred|pay|paid|deposit|wire|remit|bhej(?:ein|en|o|do|dein)?|de do|dedo', 'money|mon(?:ey|y|ney|ie)|moeny|monye|paisa|paise|pese|raqam|amount|fees?|fines?|penalty|challan|loan|payment|charges?|funds|cash|ransom|rs\\.?\\s?\\d[\\d,]*|pkr\\s?\\d[\\d,]*|\\$\\s?\\d[\\d,]*|\\d[\\d,.]*\\s?(?:k|lakh|lac|crore|million|rs|rupees|pkr|usd|dollars)', 5),
         /(?:\brs\.?\s?\d[\d,]*|\b\d[\d,]*\s?(?:rs|rupees|pkr)\b|\b\d{3,}[\d,]*\b|\bpaise\b|\braqam\b|\bfee\b|\btax\b)\W+(?:\w+\W+){0,3}?(?:bhej|jama|ada)\w*/gi,
         /\b(?:need|want|urgently need)\s+(?:rs\.?\s?|pkr\s?|\$\s?)?\d{1,3}(?:,\d{3})+\b|\b(?:need|want)\s+(?:rs\.?\s?|pkr\s?|\$\s?)?\d+\s?(?:k|lakh|lac|crore|thousand)\b/gi,
         /\b(?:gift cards?|bitcoin|crypto(?:currency)?|usdt|western union|moneygram|processing fee|advance fee|registration fee|clearance fee|delivery (?:fee|charges)|customs (?:fee|duty)|tax to release)\b/gi],
    why: 'Scams often ask for an upfront fee, a transfer or untraceable payment such as gift cards or crypto.', could: 'Money sent this way is very hard to get back.',
    action: 'Do not send money. Check the request by phone or in person with the real person or organisation, using contact details you already trust.' },
  { id: 'threat', examples: ['your account will be blocked', 'legal action', 'suspicious login', 'a case is registered against you', 'all your SIMs will be blocked', 'connection will be disconnected'], pts: 25, title: 'Threatens account closure or trouble',
    re: [/\b(?:accounts?|cards?|sims?|wallets?|numbers?|connections?|services?|electricity|gas|line|id)\b[^.!?\n]{0,40}?\b(?:blocked|suspended|closed|locked|deactivated|disabled|frozen|terminated|restricted|disconnected|cut off|deleted|banned|removed)\b/gi,
         /\b(?:legal action|arrest(?:ed)?|warrant|penalty|prosecut\w+)\b/gi, /\b(?:police|court|fia|fir|case|complaint)\b(?:\W+\w+){0,4}?\W+(?:against you|on you|your name|your number)\b/gi, /\b(?:band|block) ho (?:jaye|jayega|jaega)\b/gi,
         /\b(?:unauthori[sz]ed|suspicious|unusual) (?:login|sign-?in|transaction|access|activity)\b/gi],
    why: 'Fear makes people act before they think. Scammers use threats to rush you.', could: 'You might share information or pay without checking whether the threat is real.',
    action: 'Stay calm. Contact the organisation yourself through its official website or a phone number you already trust, not through this message.' },
  { id: 'prize', examples: ['you have won', 'claim your prize', 'lucky draw'], pts: 25, title: 'Promises a prize, reward or refund',
    re: [/\byou(?:.?ve| have)? (?:won|been selected)\b/gi, /\b(?:lottery|lucky draw|jackpot|free gift|reward points|inaam|inam)\b/gi, /\bclaim (?:your )?(?:prize|reward|gift|cash|refund|bonus|payment)\b/gi],
    why: 'You cannot win a contest you did not enter. Fake prizes are used to get your details or a "fee".', could: 'You could lose money or hand over personal information.',
    action: 'Ignore the offer. If you think it might be real, find the organisation yourself and ask them directly.' },
  { id: 'urgency', examples: ['urgent', 'within 24 hours', 'act now'], pts: 15, title: 'Pushes you to act quickly',
    re: [/\b(?:urgent(?:ly)?|immediately|right now|act now|asap|hurry|last chance|final (?:notice|warning|reminder)|expires? (?:today|tonight|soon)|today only|limited time|limited (?:slots|seats|offer)|foran|jaldi)\b/gi, /\bwithin (?:\d+|one|two|a few) (?:hours?|hrs?|minutes?|mins?|days?)\b/gi],
    why: 'Pressure stops you from checking. Genuine organisations usually give you time.', could: 'A rushed decision is easier to get wrong.',
    action: 'Pause. Urgency alone is not proof of a scam, but verify the message through an official channel before doing anything.' },
  { id: 'impersonation', examples: ['dear customer', 'customer care', 'this is the bank'], pts: 15, title: 'Sounds like an official message but is generic',
    re: [/\b(?:dear (?:customer|user|client|account holder|member)|valued customer|customer (?:care|service|support)|security (?:team|department|desk)|technical support|official (?:notice|notification|alert))\b/gi,
         /\b(?:this is|i am|we are|calling) (?:from )?(?:the |your )?(?:bank|support|helpdesk|customs|nadra|fia|police|courier|telecom)\b/gi],
    why: 'Scammers copy the tone of banks and authorities. Real ones usually use your name and give a way to verify them.', could: 'You may trust a message that did not come from who it claims.',
    action: 'Do not rely on the sender name or the wording. Contact the organisation through its official website or phone number.' },
  { id: 'secrecy', examples: ['do not tell anyone', 'keep this secret'], pts: 15, title: 'Asks you to keep it secret',
    re: [/\b(?:do not|don.?t|dont|never) (?:tell|inform|discuss with|call|contact) (?:anyone|any one|the bank|your bank|family|others|the police|dad|mum|mom|mother|father|parents|your (?:wife|husband|brother|sister))\b/gi, /\b(?:keep (?:this|it) (?:secret|confidential|private)|between (?:us|you and me))\b/gi],
    why: 'Secrecy stops other people from warning you.', could: 'Nobody can step in before you lose money or data.',
    action: 'Tell someone you trust about the message. A genuine request survives being checked.' },
  { id: 'new-number', examples: ['this is my new number', 'hi mum'], pts: 15, requires: ['payment', 'banking'], title: 'Claims to be someone you know on a new number',
    re: [/\b(?:new number|changed my number|lost my phone|hi (?:mum|mom|dad)|naya number|phone kho gaya|number badal gaya)\b/gi],
    why: 'A common scam pretends to be a relative or friend with a new number, then asks for money.', could: 'You might send money to a stranger.',
    action: 'Call the person on their old number, or ask a question only they could answer, before sending anything.' }
];
const MSG_LIMITATIONS = [
  'This is simple pattern matching, not artificial intelligence. It does not understand what the message means.',
  'It cannot confirm who really sent the message. Sender names, numbers and email addresses can be faked.',
  'A real organisation can use urgent wording, and a scam can use calm wording, so a Low result does not prove a message is genuine.',
  'It looks for English wording and a few Roman Urdu phrases only. Urdu script and other languages are not covered.',
  'Links are judged by their text only. NetSafe never opens them.'
];
const MSG_NOT_CHECKED = ['Who actually sent the message', 'Whether the website in a link is genuine', 'Other languages', 'Pictures or attachments'];

const FREE_MAIL = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'live.com', 'icloud.com', 'proton.me', 'protonmail.com'];
const LINK_RE = /\b(?:https?:\/\/|www\.)[^\s<>"']+|\b(?:bit\.ly|tinyurl\.com|t\.co|goo\.gl|ow\.ly|is\.gd|cutt\.ly|rb\.gy)\/[^\s<>"']+/gi;
const q = s => '\u201c' + (s.length > 60 ? s.slice(0, 57) + '...' : s) + '\u201d';
const MSG_BRAND_NAMES = Object.keys(MSG_U.BRANDS);

function analyzeMessage(raw, opts = {}) {
  const text = String(raw == null ? '' : raw).replace(/\r\n?/g, '\n');
  if (!text.trim()) return { ok: false, errors: ['Paste a message to check.'] };
  if (text.length > MSG_CONFIG.maxLength) return { ok: false, errors: ['That message is too long to check (over ' + MSG_CONFIG.maxLength + ' characters). Paste the key part.'] };
  const sender = String(opts.sender || '').trim().slice(0, MSG_CONFIG.maxSender);
  const channel = ['sms', 'whatsapp', 'email', 'other'].includes(opts.channel) ? opts.channel : '';
  const found = [], ranges = [];
  const mark = (s, e, id) => ranges.push({ s, e, ids: [id] });

  // notAfter: skip a match right after words like "I will", because an offer ("I will send the money") is not a request.
  for (const r of MSG_RULES) {
    const phrases = [], seen = new Set();
    for (const re of r.re) for (const m of text.matchAll(re)) { if (!m[0]) continue; if (r.notAfter && r.notAfter.test(text.slice(Math.max(0, m.index - 30), m.index))) continue; mark(m.index, m.index + m[0].length, r.id); if (!seen.has(m[0].toLowerCase())) { seen.add(m[0].toLowerCase()); phrases.push(m[0]); } }
    if (phrases.length) found.push({ id: r.id, pts: r.pts, floor: r.floor, requires: r.requires, title: r.title, phrases, found: 'Found: ' + phrases.slice(0, 4).map(q).join(', ') + '.', why: r.why, could: r.could, action: r.action });
  }
  // Links: analysed with the URL analyzer (text only)
  const links = [];
  for (const m of text.matchAll(LINK_RE)) {
    const url = m[0].replace(/[.,;:!?)\]]+$/, '');
    const a = MSG_U.analyzeUrl(url);
    mark(m.index, m.index + url.length, 'link');
    links.push({ url, level: a.ok ? a.level : 'Low', titles: a.ok ? a.findings.map(f => f.title) : [], ok: a.ok });
  }
  // Links copied from an email or web page whose shown text names a different website than the real link
  const hidden = [];
  for (const a of (Array.isArray(opts.hiddenLinks) ? opts.hiddenLinks : []).slice(0, 50)) {
    const shown = String(a && a.text || '').trim(), href = String(a && a.href || '').trim();
    if (!shown || !text.includes(shown)) continue;      // only links still present in the pasted text
    const m = MSG_U.compareLinkText(shown, href);
    if (!m || hidden.some(x => x.href === href)) continue;
    hidden.push({ shown, href, m });
    const i = text.indexOf(shown); mark(i, i + shown.length, 'hidden-link');
    if (m.realHost) { const a2 = MSG_U.analyzeUrl(href, { shownAs: shown }); links.push({ url: href, level: a2.ok ? a2.level : 'Low', titles: a2.ok ? a2.findings.map(f => f.title) : [], ok: a2.ok }); }
  }
  if (hidden.length) {
    const h = hidden[0];
    found.push({ id: 'hidden-link', pts: 40, title: 'A link shows one website but goes to another', phrases: hidden.map(x => x.shown),
      found: 'The message shows "' + h.shown + '", but the real link goes to ' + h.m.realDomain + '.' + (hidden.length > 1 ? ' ' + (hidden.length - 1) + ' more link(s) do the same.' : ''),
      why: 'Emails can show any text for a link. Scammers show a trusted address while the real link goes to their own site. Some newsletters also send links through a tracking site, so check who sent it.',
      could: 'You could think you are opening ' + h.m.shownDomain + ' and land on a fake page that collects your login, card or OTP.',
      action: 'Do not click it. Type ' + h.m.shownDomain + ' into your browser yourself, or open the official app.' });
  }
  if (links.length) {
    const worst = [...links].sort((a, b) => MSG_ORDER.indexOf(b.level) - MSG_ORDER.indexOf(a.level))[0];
    const pts = { Low: 5, Medium: 20, High: 40 }[worst.level];
    const disp = worst.url.length > 80 ? worst.url.slice(0, 77) + '...' : worst.url;
    found.push({ id: 'link', pts, title: worst.level === 'Low' ? 'Message contains a link' : 'Link in the message has warning signs', phrases: links.map(l => l.url),
      found: worst.level === 'Low' ? 'The message contains ' + (links.length > 1 ? links.length + ' links' : 'a link') + ' (' + disp + '). Its text shows no strong warning signs, but the site itself was not checked.'
        : disp + ' has a ' + worst.level.toLowerCase() + ' warning level: ' + worst.titles.slice(0, 3).join('; ') + '. Use the "Check a link" tool above for the full explanation.',
      why: 'Links in unexpected messages are the usual way scammers send you to fake pages.', could: 'A fake page could collect your login, card or OTP.',
      action: 'Do not tap the link. Open the official app or type the organisation\'s address yourself.' });
  }
  // Sender (only when supplied)
  const lower = text.toLowerCase();
  const claimsOrg = MSG_BRAND_NAMES.some(b => new RegExp('\\b' + b + '\\b').test(lower)) || /\b(?:bank|customer (?:care|service)|support|security team|courier|customs)\b/.test(lower);
  if (sender) {
    const at = sender.lastIndexOf('@');
    if (at > 0) {
      const dom = sender.slice(at + 1).toLowerCase();
      if (claimsOrg && FREE_MAIL.includes(dom)) found.push({ id: 'sender-free-email', pts: 15, title: 'Organisation message from a free email address', phrases: [], found: 'The sender uses ' + dom + ', but the message sounds like it comes from an organisation.',
        why: 'Banks and companies normally write from their own domain, not a free mail service.', could: 'The sender may not be who they claim.', action: 'Look up the organisation\'s official contact details and ask them directly.' });
      const ua = MSG_U.analyzeUrl('https://' + dom);
      if (ua.ok && ua.findings.some(f => ['brand', 'lookalike', 'punycode', 'mixed-script'].includes(f.id))) found.push({ id: 'sender-lookalike', pts: 25, title: 'Sender address looks like a copy of a known name', phrases: [], found: 'The sender domain ' + dom + ' has link-style warning signs: ' + ua.findings.filter(f => ['brand', 'lookalike', 'punycode', 'mixed-script'].includes(f.id)).map(f => f.title).join('; ') + '.',
        why: 'Scammers register look-alike addresses so the sender seems genuine.', could: 'You may trust a message from an imitation address.', action: 'Do not reply or click. Contact the organisation through its official website.' });
    } else if ((sender.match(/\d/g) || []).length >= 10 && ['sms', 'whatsapp'].includes(channel) && claimsOrg) {
      found.push({ id: 'sender-number', pts: 10, title: 'Organisation message from an ordinary mobile number', phrases: [], found: 'The message sounds like an organisation but comes from a long mobile-style number.',
        why: 'Banks and companies often use named senders or short codes. This is only a weak signal, as some businesses do use normal numbers.', could: 'The sender may be an individual pretending to be an organisation.', action: 'Do not reply. Check with the organisation using its official contact details.' });
    }
  }
  // Combination-only rules
  const have = id => found.some(f => f.id === id);
  // Rules that always make a message High (codes, passwords, bank details, threats) lead, so the most important step is about them.
  const findings = found.filter(f => !f.requires || f.requires.some(have)).sort((a, b) => (b.floor ? 1 : 0) - (a.floor ? 1 : 0) || b.pts - a.pts);
  const keep = new Set(findings.map(f => f.id));
  const nOf = Object.fromEntries(findings.map((f, i) => [f.id, i + 1]));

  // Merge highlight ranges into numbered segments
  const rs = ranges.filter(r => keep.has(r.ids[0])).sort((a, b) => a.s - b.s || b.e - a.e), merged = [];
  for (const r of rs) { const last = merged[merged.length - 1]; if (last && r.s < last.e) { last.e = Math.max(last.e, r.e); if (!last.ids.includes(r.ids[0])) last.ids.push(r.ids[0]); } else merged.push({ s: r.s, e: r.e, ids: [r.ids[0]] }); }
  const segments = []; let pos = 0;
  for (const m of merged) { if (m.s > pos) segments.push({ text: text.slice(pos, m.s), n: [] }); segments.push({ text: text.slice(m.s, m.e), n: m.ids.map(i => nOf[i]).sort((a, b) => a - b) }); pos = m.e; }
  if (pos < text.length) segments.push({ text: text.slice(pos), n: [] });

  const score = Math.min(100, findings.reduce((s, f) => s + f.pts, 0));
  const T = MSG_CONFIG.thresholds;
  let level = score >= T.high ? 'High' : score >= T.medium ? 'Medium' : 'Low', floorNote = '';
  for (const f of findings) if (f.floor && MSG_ORDER.indexOf(level) < MSG_ORDER.indexOf(f.floor)) { level = f.floor; floorNote = 'Level set to High because the message asks for a code, password or private details, which a genuine organisation does not ask for in a message.'; }
  if (have('extortion')) floorNote = 'This message threatens violence or kidnapping, so it is always High. Treat it as serious: check that the person named is safe, and contact the police.';
  const summary = {
    High: 'Several common scam signs. Do not reply, click, pay or share anything. Verify through an official channel.',
    Medium: 'Some scam signs. Do not act on this message until you have checked it through an official channel.',
    Low: 'No common scam patterns found. That does not prove the message is genuine, because NetSafe only checks for known wording.'
  }[level];
  const notes = [];
  if (!have('otp') && /\b(?:otp|verification code|one[- ]time)\b/i.test(text) && /\b(?:never|do not|don.?t) share\b/i.test(text))
    notes.push('This reads like a standard code notice. Never share the code with anyone. If you did not just request it, someone may be trying to get into your account: change your password and turn on two-step verification.');
  if (!findings.length) notes.push('If the message asks you to pay, share information or click something you were not expecting, verify it first through an official channel.');
  const ids = findings.map(f => f.id), prevent = [];
  if (ids.some(i => ['otp', 'password', 'banking'].includes(i))) prevent.push('Banks and services never need your OTP, PIN or password in a message or call. Treat any such request as a scam.');
  if (ids.some(i => ['prize', 'payment'].includes(i))) prevent.push('Real prizes do not require you to pay first. Fees for "releasing" money are a classic scam.');
  if (ids.includes('hidden-link')) prevent.push('Before clicking a link in an email, hover over it (computer) or long-press it (phone) to see the real address.');
  if (ids.includes('link')) prevent.push('Save your bank\'s and delivery companies\' official apps and use them instead of tapping links in messages.');
  if (ids.includes('extortion')) prevent.push('Agree a family code word, and keep family members\' numbers saved, so you can check quickly that everyone is safe.');
  if (ids.includes('blackmail')) prevent.push('Cover or switch off your camera when not in use, keep private photos off cloud folders shared with apps, and only install loan apps listed by the SECP.');
  if (ids.includes('wrong-transfer')) prevent.push('Always check your balance in the official app. A text message can say anything.');
  if (ids.includes('job-task') || ids.includes('investment')) prevent.push('Real jobs and real investments never ask you to pay first. Check companies with the SECP or the regulator in your country.');
  if (ids.includes('code-theft')) prevent.push('Turn on two-step verification in WhatsApp so a stolen code is not enough.');
  if (ids.includes('remote-access')) prevent.push('Install apps only from Google Play or the App Store, never from a link or APK file sent in a message.');
  if (ids.includes('new-number')) prevent.push('Agree a family check-question for "new number" emergencies.');
  if (ids.includes('urgency') || ids.includes('threat')) prevent.push('When a message rushes or threatens you, stop and verify before acting. Pressure is the scammer\'s main tool.');
  const AFTER = { blackmail: 'If you already paid or sent anything: stop all contact, do not pay again, keep the evidence and report it (FIA cybercrime 1991 in Pakistan, or your local police).',
    'wrong-transfer': 'If you already sent money back or shared a code: call your bank or wallet helpline now using the number in the official app.',
    'job-task': 'If you already paid a fee or deposit: stop paying, report the account to your bank or wallet, and keep the chat as evidence.',
    investment: 'If you already invested: do not pay any "withdrawal fee" or "tax". Report it to your bank and the SECP or your regulator.',
    'remote-access': 'If you installed an app: turn off mobile data and Wi-Fi, uninstall it, and call your bank from another phone. Change your banking and email passwords.',
    'code-theft': 'If you shared a code: open WhatsApp and register your number again to log the other person out, then turn on two-step verification and warn your contacts.',
    extortion: 'If you already paid or replied: contact the police and your bank or payment provider immediately, keep every message and payment receipt, and do not send more money.',
    otp: 'If you shared a code (OTP or PIN): call your bank or the service now, using the number on your card or its official website, and change that account\'s password.',
    password: 'If you shared a password: change it right away on the official site or app, on every account that uses it, and turn on multi-factor authentication.',
    banking: 'If you shared card or bank details: contact your bank immediately to block the card and check recent transactions.',
    payment: 'If you already sent money: contact your bank or payment provider immediately and ask whether the payment can be stopped. Then report it to the relevant authority in your country.',
    'hidden-link': 'If you clicked it and typed anything: treat that information as exposed. Change the password on the real site, and call your bank if you entered card details.',
    link: 'If you opened the link and typed anything: treat that information as exposed. Change passwords, and call your bank if you entered card details.' };
  const ifAlready = Object.keys(AFTER).filter(k => ids.includes(k)).map(k => AFTER[k]);
  return { ok: true, score, level, summary, floorNote, findings, segments, links, notes, prevent, ifAlready, topAction: findings.length ? findings[0].action : '', limitations: MSG_LIMITATIONS, notChecked: MSG_NOT_CHECKED, text, sender, channel };
}

const NetSafeMessage = { MSG_CONFIG, MSG_RULES, analyzeMessage };
if (typeof module !== 'undefined') module.exports = NetSafeMessage;
