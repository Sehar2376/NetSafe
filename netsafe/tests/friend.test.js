// "Friend or family in need" scams sent from hacked or copied accounts (WhatsApp, Facebook, Instagram, SMS).
// Patterns collected from public warnings: FIA / PTA / PK CERT, Tribune, Dawn, Which?, Action Fraud,
// Bitdefender, Malwarebytes, Kaspersky, Swiss NCSC, US FTC and university security offices (2020-2026).
// Wording is our own, written to match the reported patterns. Ordinary messages between friends are tested too,
// so that new rules do not raise false alarms.
const assert = require('assert');
const { analyzeMessage } = require('../js/message.js');
const ORDER = ['Low', 'Medium', 'High'];
let pass = 0, fail = 0;
function t(name, text, min, max = 'High') {
  const r = analyzeMessage(text);
  const ok = ORDER.indexOf(r.level) >= ORDER.indexOf(min) && ORDER.indexOf(r.level) <= ORDER.indexOf(max);
  if (ok) { pass++; console.log('PASS ' + name + ' -> ' + r.level); }
  else { fail++; console.log('FAIL ' + name + ' -> ' + r.level + ' (expected ' + (min === max ? min : min + '-' + max) + ') [' + r.findings.map(f => f.id).join(', ') + ']'); }
}
const scam = (n, s, min = 'High') => t('scam: ' + n, s, min);
const ok = (n, s, max = 'Low') => t('normal: ' + n, s, 'Low', max);

// 1. Emergency money from a hacked contact
scam('urgent loan, pay back', 'Hey, I am in trouble. Can you send me 20,000 urgently? I will return it tomorrow. Please dont tell anyone.');
scam('hospital, Roman Urdu', 'Bhai urgent hai, ammi hospital mein hain. 15000 easypaisa kar do is number pe 03001234567, kal wapas kar dunga');
scam('card blocked, transfer', 'Hi, my card is blocked and I need to pay a bill. Can you transfer 5000 to this account? I will pay you back tonight.');
scam('pay to a friend\'s wallet', 'Can you send 10k to my friend Ali? JazzCash 03451234567. My app is not working, I will return it today');
scam('bill more than expected', 'Hi, the bill was more than expected. Can you send 5000 more to the same account? I will sort it out tomorrow');
scam('cannot talk, send money', 'I can\'t talk right now, in a meeting. Please transfer 25,000 to the account below, I\'ll pay you back this evening');
scam('stuck abroad', 'I am stuck at the airport, my wallet was stolen. Please send me $300 so I can get home, will repay as soon as I am back');
scam('Roman Urdu short ask', 'yaar thore paise chahiye abhi, 5000 bhej do please, kal lauta dunga', 'Medium');
scam('Roman Urdu cannot call', 'Abhi call nahi kar sakta, meeting mein hoon. 20000 jazzcash kar do jaldi, sham ko wapas kar dunga');
scam('bank app not working', 'My bank app is not working and I have to pay the fee today. Can you send 12,000? I will give it back tomorrow');
scam('accident', 'I had an accident and I need money for the hospital right now. Please send 30000 to this number 03211234567');
scam('mobile wallet, family', 'Beta, I am at the hospital with your uncle. Send 10000 on easypaisa to 03001112223 quickly, don\'t call, I can\'t talk');

// 2. "Hi mum, new number" (first message often asks nothing yet)
scam('hi mum, phone in water', 'Hi mum, this is my new number. My phone fell in water. Save this one and message me on WhatsApp', 'Medium');
scam('work phone', 'Hi mom, text me here on my work phone. Dropped my actual phone in the sink and it is not working', 'Medium');
scam('delete old number', 'Hi dad, my phone broke, you can delete my old number and save this one', 'Medium');
scam('friend\'s phone', 'Hi mum I am texting from a friend\'s phone, mine is broken. Can you message me here?', 'Medium');
scam('new number then money', 'Hi mum it\'s me, new number. I need to pay a bill today but my banking app is locked on the new phone. Can you pay it for me? I will pay you back');
scam('naya number', 'Assalam o alaikum ammi, ye mera naya number hai, purana phone kharab ho gaya. Ye save kar lein', 'Medium');
scam('naya number + paise', 'Ammi ye mera naya number hai. Mujhe urgent 8000 chahiye, easypaisa kar dein is number pe');

// 3. Gift cards
scam('boss gift cards', 'Are you available? I need a quick favour. Buy 2 Google Play cards of 5000 each and send me the codes. Busy in meeting, can\'t talk');
scam('scratch and send', 'Please get four Apple gift cards, scratch the back and send me pictures of the codes. I will reimburse you later');
scam('steam cards', 'Can you pick up some Steam cards for me and text me the numbers on the back? I will pay you back');
scam('amazon cards', 'I need you to purchase 3 Amazon gift cards for a client today. Send the codes here once you have them');

// 4. Account takeover (codes, linked devices)
scam('code by mistake', 'Hi, I sent you a 6 digit code by mistake, can you send it to me please?');
scam('receive a code for me', 'Can I use your number? You will receive a code by SMS, just send it to me');
scam('locked out, recovery code', 'I am locked out of my account. Facebook will send you a recovery code, please forward it to me');
scam('linked devices', 'To vote, open WhatsApp, go to Linked Devices and enter this code: 4F7K-22LP');
scam('scan QR', 'Please scan this QR code from your WhatsApp so I can add you to the family group');
scam('code aya hoga', 'Aap ke number pe ek code aya hoga, wo mujhe bhej do please');

// 5. Vote for my child / photo bait
scam('vote, scholarship, link', 'Hi! Please vote for Alina in this contest, she is my friend\'s daughter. The prize is a scholarship. https://kids-vote-2026.top/alina', 'High');
scam('vote no link', 'Hi, could you vote for my niece in a dance competition? Voting ends soon, it takes one minute', 'Medium');
scam('is this you video', 'Is this you in this video?? http://bit.ly/3xVid0', 'Medium');
scam('cant believe gone', 'I can\'t believe he\'s gone, look at this http://news-clip.top/v', 'Medium');

// 6. Investment from a "friend"
scam('doubled money', 'Bro I made 3 lakh in 2 days with this trading app, invest 20k and I will double it for you');
scam('bitcoin mining', 'I invested $500 and got $5000 back in 48 hours with bitcoin mining. My account manager can help you too, it is 100% legit');
scam('Roman Urdu invest', 'Maine 2 din mein 50000 kamaye, aap bhi 10000 lagao, double ho jayenge guaranteed');

// Ordinary messages that must stay Low (or at most Medium where the advice still helps)
ok('dinner share', 'Bro can you pay my share of the dinner, I will send it back tomorrow', 'Medium');
ok('plans', 'Are we still meeting at 6 today?');
ok('return book', 'I will return your book tomorrow, thanks for lending it');
ok('pay back done', 'I paid you back for the tickets, check your account');
ok('hospital visit', 'Ammi hospital mein hain checkup ke liye, shaam ko ghar aa jayengi');
ok('new phone, same number', 'Got a new phone finally! Same number, just setting up WhatsApp again');
ok('can\'t talk', 'Can\'t talk right now, in a meeting. Will call you after 5');
ok('gift card present', 'I bought you an Amazon gift card for your birthday, check your email');
ok('vote reminder', 'Don\'t forget to vote in the society election on Sunday');
ok('favour', 'Can you do me a favour and pick up the kids from school today?');
ok('available', 'Are you available for a call this afternoon about the project?');
ok('lent money', 'Thanks for lending me the money last week, I sent it back to your JazzCash', 'Medium');
ok('phone broke, call landline', 'My phone screen broke, call me on the home landline if you need me');
ok('bill split', 'The electricity bill is 6000 this month, your share is 2000');
ok('wapas', 'Main kal wapas aa jaunga, phir milte hain');
ok('code for wifi', 'The wifi password is on the fridge');
ok('salary', 'Salary aa gayi, kal shopping chalte hain');
ok('qr menu', 'Scan the QR code on the table to see the menu');
ok('invest talk', 'I started investing in a mutual fund last year, slow but steady');
ok('meeting', 'Busy in a meeting till 4, then free');
ok('urgent work', 'Need the report urgently please, client is waiting');
ok('mum hi', 'Hi mum, reached home safely. Love you');
ok('dad pay fees', 'Dad, the university fee is due next week, can we talk tonight?', 'Medium');
ok('return money promise', 'Don\'t worry, I will pay you back on Friday when I get paid', 'Medium');

console.log('\n' + pass + ' passed, ' + fail + ' failed');
if (fail) process.exit(1);
console.log('PASS friend-in-need scams detected without new false alarms');
