// Run: node tests/scenarios.test.js
// Real-world scam scenarios (researched November 2026 from PTA, FIA, Punjab Safe City, SBP, FTC and FBI warnings) and everyday messages
// that must NOT be flagged. Each scam must be at least Medium; the expected rule must be among the findings.
const assert = require('assert'); const { analyzeMessage } = require('../js/message.js');
const ids = r => r.findings.map(f => f.id);
const SCAM = [
 'Congratulations! You have been selected by BISP for Rs 25000. Call 0301-2345678 to claim your payment.',
 'URGENT: You have a pending e-challan of Rs 2000. Pay now at https://echallan-psca.cc to avoid legal action.',
 'Rs 85,000 has been transferred to your account by mistake. Please send it back immediately to 03001234567.',
 'Assalam o alaikum, galti se aap ke Easypaisa account mein 5000 bhej diye, please wapas bhej dein',
 'This is PTA. A complaint has been registered against your number. All your SIMs will be blocked in 2 hours. Press 9 or call 051-1234567',
 'FIA Cyber Crime: a case has been registered against you. Pay the penalty within 24 hours or you will be arrested.',
 'Hello pervert, I recorded you through your webcam. Pay $1490 in bitcoin or I will send the video to all your contacts.',
 'Your loan is overdue. Pay today or we will send your photos to all your contacts and family.',
 'Hello, I am from TikTok HR. Like videos and get paid. Earn Rs 5000 per day, part-time job from home, no experience needed.',
 'Complete 40 tasks to unlock your commission. Your account needs a recharge of 100 USDT for VIP level 2.',
 'Join our crypto trading platform. Guaranteed profit of 30% weekly. Double your money in 2 weeks!',
 'Hi, I sent a code to your number by mistake, can you send me the 6 digit code please?',
 'Your WhatsApp verification code was sent to you. Please share it with me, I am from WhatsApp support.',
 'Dear customer, to fix your account please install AnyDesk and share the 9 digit ID with our agent.',
 'Your parcel is held at customs. Pay Rs 350 customs duty at http://pakpost-delivery.top/pay',
 'Your Netflix payment failed. Update your card details at https://netflix-billing.pages.dev',
 'K-Electric: your electricity bill is unpaid, connection will be disconnected tonight. Call 0312-3456789',
 'Mubarak ho! Aap ka Jeeto Pakistan inaam nikla hai. Rs 2000 tax bhejein is number par 03451234567',
 'FBR tax refund of Rs 18,500 approved. Verify your bank account details to receive it.',
 'your son is with us sent us moeny or we will kill him we need 1000k',
];
const EXPECT = ['official-claim', 'official-claim', 'wrong-transfer', 'wrong-transfer', 'threat', 'threat', 'blackmail', 'blackmail', 'job-task', 'job-task', 'investment',
  'code-theft', 'code-theft', 'remote-access', 'official-claim', 'banking', 'threat', 'prize', 'official-claim', 'extortion'];
const OK = [
 'Hi, are we still meeting at 6? I will bring the notes.',
 'Your verification code is 482913. It expires in 10 minutes. Never share this code with anyone.',
 'Your BISP payment can be collected from the nearest campsite. No fee is charged.',
 'Mom, I will call you after class. Can you send me 500 for books?',
 'Your TCS parcel has been delivered. Thank you.',
 'Please call me when you are free, my number is 0300 1234567.',
 'Did you watch the cricket match? Pakistan won!',
 'Our office is closed tomorrow. Work from home is allowed.',
 'I made a mistake in the report, sending the corrected version now.',
 'Reminder: your electricity bill is due on the 15th. You can pay through your banking app.',
 'Please download the app from the Play Store for the class schedule.',
 'Happy birthday! Mubarak ho, have a great year.',
 'The traffic was terrible, I will be late by 20 minutes.',
];
let high = 0;
SCAM.forEach((t, i) => { const r = analyzeMessage(t); assert(r.level !== 'Low', 'scam rated Low: ' + t); assert(ids(r).includes(EXPECT[i]), 'expected ' + EXPECT[i] + ' in ' + ids(r) + ': ' + t); if (r.level === 'High') high++; console.log('PASS scam scenario ' + (i + 1) + ' is ' + r.level + ' (' + EXPECT[i] + ')'); });
assert(high >= 19, 'only ' + high + ' of 20 scams are High'); console.log('PASS ' + high + ' of ' + SCAM.length + ' scam scenarios are High');
OK.forEach(t => { const r = analyzeMessage(t); assert.strictEqual(r.level, 'Low', 'everyday message flagged: ' + t + ' ' + ids(r)); console.log('PASS everyday message stays Low: ' + t.slice(0, 50)); });
// Every new scenario rule gives what-to-do and if-already advice
for (const id of ['blackmail', 'wrong-transfer', 'job-task', 'investment', 'remote-access', 'code-theft']) {
  const t = SCAM[EXPECT.indexOf(id)]; const r = analyzeMessage(t);
  assert(r.findings.find(f => f.id === id).action.length > 20 && r.ifAlready.length > 0 && r.prevent.length > 0, id); console.log('PASS ' + id + ' gives action, if-already and prevention advice');
}
console.log('Scenario tests passed');
