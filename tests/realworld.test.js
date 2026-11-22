// Run: node tests/realworld.test.js
// Real-world scenario sweep (November 2026): 270+ messages, links, passwords and Wi-Fi setups with the answer a careful
// person would expect. Set 1 was used to tune the rules; set 2 was written afterwards as a fresh check; set 3 is everyday
// messages that must never be flagged. Expected values allow a range where either answer is reasonable.
const M = require('../js/message.js'), U = require('../js/url.js'), P = require('../js/password.js'), W = require('../js/rules.js');
let fails = [], n = 0;
const chk = (tab, input, got, want, extra) => { n++; const ok = Array.isArray(want) ? want.includes(got) : got === want;
  if (ok) console.log('PASS ' + tab + ' ' + got + ': ' + String(input).slice(0, 70)); else fails.push(tab + ' | want ' + want + ' got ' + got + ' | ' + (extra || '') + ' | ' + String(input).slice(0, 110)); };
const MSG1 = [
 // bank / OTP / account
 ['Dear customer, your HBL account has been suspended. Click http://hbl-secure.top to verify your details.', 'High'],
 ['Your ATM card has been blocked. Call 0311-2233445 immediately to unblock.', 'High'],
 ['Meezan Bank: please share the OTP sent to your number to complete verification.', 'High'],
 ['Apna PIN code bata dein taake account active ho jaye', 'High'],
 ['Your account will be closed today unless you update your CNIC at http://nadra-update.xyz', 'High'],
 ['JazzCash: aap ka account band ho jayega, foran 4 digit PIN bhejein', 'High'],
 ['Suspicious login detected on your Gmail. Confirm your password here: https://gmail-security.pages.dev', 'High'],
 ['This is Easypaisa helpline. Your wallet is restricted. Tell me the code you just received.', 'High'],
 // payment / prize / lottery
 ['You have won an iPhone 15 in our lucky draw! Pay Rs 1500 delivery charges to claim.', 'High'],
 ['Congratulations! Your number won Rs 10 lakh in Jeeto Pakistan. Send Rs 3000 registration fee to 03451234567', 'High'],
 ['Aap ka 25,000 ka inaam nikla hai. Tax ke 2000 rupay bhejein.', 'High'],
 ['Final notice: unpaid toll of $6.99. Pay now at https://ezpass-toll.top to avoid penalty.', 'High'],
 ['USPS: your package could not be delivered. Update your address and pay $1.99 redelivery fee: https://usps-redeliver.click', 'High'],
 ['Your parcel is held at customs. Pay customs duty of Rs 4,500 to release it.', 'High'],
 // family / new number / extortion
 ['Hi Mum, I lost my phone, this is my new number. Can you send money for a new one? Dont tell dad', 'High'],
 ['Ammi mera phone kho gaya hai, ye naya number hai, jaldi 20000 bhej do', ['Medium','High']],
 ['We have kidnapped your son. Pay 50 lakh ransom or you will never see him again.', 'High'],
 ['Your daughter is with us. Send money now or we will hurt her. Do not call the police.', 'High'],
 ['I recorded you through your webcam watching adult sites. Pay $1500 in bitcoin or I will send the video to all your contacts.', 'High'],
 ['Your loan is overdue. Pay today or we will send your photos to all your contacts.', 'High'],
 ['Tumhari private pictures viral kar denge agar 50000 nahi bheje', 'High'],
 // job / investment / crypto
 ['Part-time job: earn $300 per day by liking YouTube videos. Contact us on WhatsApp.', 'High'],
 ['Hello, I am a recruiter from Amazon. Work from home, earn Rs 5000 daily. Registration fee Rs 1000 only.', 'High'],
 ['Invest 10,000 and get guaranteed profit of 50% weekly. Limited slots!', 'High'],
 ['Join our USDT trading platform, double your money in 7 days.', 'High'],
 ['Sorry wrong number. By the way I made 40% returns on crypto trading last month, want to learn?', ['Medium','High']],
 // gov / official
 ['BISP: aap ko 25000 ki raqam mili hai. Wasool karne ke liye is link par CNIC darj karein http://bisp-gov.online', 'High'],
 ['Punjab Safe City: you have an unpaid e-challan of Rs 3000. Pay within 24 hours: https://echallan-psca-gop.cc', 'High'],
 ['PTA: your SIM will be blocked within 2 hours due to complaint. Press 9 or call 051-1234567', 'High'],
 ['FBR: you are eligible for a tax refund of Rs 18,000. Submit your bank account details.', 'High'],
 ['FIA Cyber Crime Wing: a case is registered against you. Pay the fine or face arrest.', 'High'],
 ['K-Electric: your electricity will be disconnected tonight due to unpaid bill. Call 0312-0000000', 'High'],
 // account takeover / remote
 ['Hi, I accidentally sent my WhatsApp code to your number, please forward it to me', 'High'],
 ['To secure your account install AnyDesk and share the access code with our technician.', 'High'],
 ['Download this APK to get the new Easypaisa bonus: http://bonus.example/ep.apk', 'High'],
 // wrong transfer
 ['Rs 25,000 transferred to your account by mistake, kindly return it to 03001112233', 'High'],
 // email phishing style
 ['Your Microsoft 365 password expires today. Keep the same password: https://microsoft-365-login.web.app', 'High'],
 ['Netflix: your payment was declined. Update your card details within 24 hours to avoid suspension.', 'High'],
 ['Your Apple ID has been locked for security reasons. Verify at http://appleid-verify.support', 'High'],
 // ---- BENIGN (must be Low)
 ['Hi, are we still meeting at 6? I will bring the notes.', 'Low'],
 ['Your OTP is 482913. Do not share this code with anyone. HBL will never ask for it.', 'Low'],
 ['Rs 5,000 received from Ali Khan in your JazzCash account. Balance Rs 12,340.', 'Low'],
 ['Your Daraz order #12345 has been shipped and will arrive on Friday.', 'Low'],
 ['Ammi, I will be late today, class is extended.', 'Low'],
 ['Meeting moved to 3 pm, please inform the team.', 'Low'],
 ['Congratulations on your graduation! So proud of you.', 'Low'],
 ['Can you send me the notes for chapter 5?', 'Low'],
 ['Happy Eid! Eid Mubarak to you and your family.', 'Low'],
 ['Your electricity bill for November is Rs 4,320, due on 15 Dec. Pay via your banking app.', 'Low'],
 ['Reminder: your dentist appointment is tomorrow at 11 am.', 'Low'],
 ['I am going to kill this exam tomorrow inshallah', 'Low'],
 ['Bhai mujhe 500 bhej do kal wapas kar dunga', ['Low','Medium']],
 ['Your TCS shipment has been delivered. Thank you for choosing TCS.', 'Low'],
 ['Please download the official app from the Play Store to view your results.', 'Low'],
 ['Thanks for the payment, I received it.', 'Low'],
 ['Can you call me on 0300-1234567 when you are free?', 'Low'],
 ['Our office is closed tomorrow. Work from home is allowed.', 'Low'],
 ['The new Netflix series is amazing, you should watch it.', 'Low'],
 ['Your package from Amazon was delivered to the front door.', 'Low'],
];
const LINKS1 = [
 ['https://www.google.com/', 'Low'], ['https://www.hbl.com/personal', 'Low'], ['https://www.meezanbank.com', 'Low'], ['https://www.daraz.pk/products/x', 'Low'],
 ['https://echallan.psca.gop.pk', 'Low'], ['https://www.fbr.gov.pk', 'Low'], ['https://bisp.gov.pk', 'Low'], ['https://github.com/user/repo', 'Low'], ['https://en.wikipedia.org/wiki/Phishing', 'Low'],
 ['https://www.youtube.com/watch?v=abc', 'Low'], ['https://docs.google.com/document/d/1', 'Low'], ['https://outlook.office.com/mail', 'Low'], ['https://www.amazon.co.uk/dp/123', 'Low'],
 ['https://web.whatsapp.com', 'Low'], ['https://jazzcash.com.pk', 'Low'], ['example.com', 'Low'], ['https://drive.google.com/file/d/abc/view', 'Low'], ['https://www.dawn.com/news/123', 'Low'],
 ['http://example.com', 'Medium'], ['https://bit.ly/3xyz', 'Medium'], ['https://tinyurl.com/abc', 'Medium'],
 ['http://hbl-verify.top/login', 'High'], ['https://paypal.com.secure-login.example', 'High'], ['http://192.168.1.10/bank', 'High'], ['https://paypal.com@evil.example', 'High'],
 ['https://xn--pypal-4ve.example', 'High'], ['https://googIe.com', ['Medium','High']], ['https://amazom.com/signin', ['Medium','High']], ['https://rnicrosoft-login.com', 'High'],
 ['https://hbl-verify.pages.dev', 'High'], ['https://netflix-billing.vercel.app', 'High'], ['https://echallan-psca-gop.cc', 'High'], ['https://bisp-gov-pk.com/apply', 'High'],
 ['https://jazzcash-bonus.xyz', 'High'], ['https://easypaisa-reward.online', 'High'], ['https://appleid-verify.support', ['Medium','High']], ['https://secure-login-update-account.example', ['Medium','High']],
 ['javascript:alert(1)', 'High'], ['https://whatsapp-gold.download', ['Medium','High']], ['https://meezan-bank-verify.info', 'High'], ['https://usps-redeliver.click', 'High'],
 ['https://faceb00k-login.com', 'High'], ['https://instagram-verify-badge.web.app', 'High'], ['https://nadra-update.xyz', 'High'], ['http://203.0.113.5:8080/login', 'High'],
];
const PWS1 = [
 ['123456', 'Weak'], ['password', 'Weak'], ['P@ssw0rd', 'Weak'], ['pakistan123', 'Weak'], ['Pakistan@786', 'Weak'], ['iloveyou', 'Weak'], ['qwerty123', 'Weak'], ['Ali12345', 'Weak'],
 ['Sehar2004', 'Weak'], ['03001234567', 'Weak'], ['14081947', 'Weak'], ['aaaaaaaa', 'Weak'], ['abcd1234', 'Weak'], ['Summer2024!', 'Weak'], ['admin', 'Weak'], ['Ahmed@123', 'Weak'],
 ['babarazam56', 'Weak'], ['naruto123', 'Weak'], ['Karachi2023', 'Weak'],
 ['correct horse battery staple', 'Weak'],
 ['Tr0ub4dor&3', ['Fair','Good']], ['MyDog2019Rex!', ['Weak','Fair']],
 ['tiger-lamp-orbit-cactus-91', 'Strong'], ['purple monkey dishwasher river', 'Strong'], ['fz8#Kp2!vQ9@mL4x', 'Strong'], ['Xq7$wL2#nR9!pT4z', 'Strong'], ['blue-guitar-ocean-pencil', 'Strong'],
];
const base = { ssid: 'Net', type: 'public', password: 'yes', sharing: 'shared', protocol: 'wpa2', location: 'cafe', captive: 'no' };
const WIFI = [
 [{ protocol: 'open', password: 'no', sharing: '', captive: 'yes', ssid: 'Free_Airport_WiFi', location: 'airport' }, 'High'],
 [{ protocol: 'wep', sharing: 'private', type: 'private', location: 'home' }, 'High'],
 [{ protocol: 'wpa', type: 'private', sharing: 'private', location: 'home' }, 'High'],
 [{ protocol: 'wpa2' }, 'Medium'], [{ protocol: 'wpa3' }, ['Low','Medium']],
 [{ protocol: 'wpa2', type: 'private', sharing: 'private', location: 'home' }, 'Low'],
 [{ protocol: 'wpa3', type: 'private', sharing: 'private', location: 'home' }, 'Low'],
 [{ protocol: 'enterprise', sharing: 'individual', location: 'university' }, 'Low'],
 [{ protocol: 'owe', password: 'no', sharing: '', location: 'cafe' }, 'Medium'],
 [{ protocol: 'unknown', sharing: 'shared' }, 'Medium'],
 [{ protocol: 'unknown', password: 'no', sharing: '' }, ['Medium','High']],
 [{ protocol: 'wpa2', captive: 'yes', location: 'hotel' }, ['Medium','High']],
 [{ protocol: 'wpa2wpa3', type: 'private', sharing: 'private', location: 'home' }, 'Low'],
 [{ protocol: 'wpa2', type: 'private', sharing: 'private', location: 'office' }, 'Low'],
];
const MSG2 = [
 ['Dear valued customer, your UBL debit card will be deactivated. Reply with your card number and expiry date.', 'High'],
 ['Allied Bank: unusual activity detected. Verify your identity at https://abl-secure-verify.com', 'High'],
 ['Your Telenor SIM will be suspended in 24 hours. Complete biometric verification by calling 0345-1122334.', 'High'],
 ['Assalam o alaikum, main bank se bol raha hoon, aap ka account block ho gaya hai, OTP bata dein', 'High'],
 ['You have been selected for Ehsaas program Rs 12000. Send your CNIC number and a Rs 500 processing fee.', 'High'],
 ['DHL: your shipment is on hold. Pay customs fee of $2.50 at https://dhl-parcel-fee.top', 'High'],
 ['Dad its me, new number. Phone fell in water. Need 30,000 urgently for rent, will explain later', 'High'],
 ['Hello dear, I am a US army doctor in Syria. I need your help to transfer $5 million, you will get 30%.', ['Medium','High']],
 ['Earn 2000 daily from home! Just rate hotels on our app. VIP upgrade 50 USDT gives bigger commission.', 'High'],
 ['Get 3% daily profit with our forex trading signals. Guaranteed returns, no risk.', 'High'],
 ['Your Instagram account will be deleted for copyright violation. Appeal here: https://instagram-appeal.web.app', 'High'],
 ['I have hacked your phone and I know your password. Pay 0.05 BTC or I will leak your chats to your family.', 'High'],
 ['Last warning: if you do not pay the loan today we will call all your contacts and post your picture.', 'High'],
 ['Please install TeamViewer so I can fix the problem with your bank app.', 'High'],
 ['Mistakenly I sent 3000 to your Easypaisa, please send back on this number', 'High'],
 ['WhatsApp support: someone is trying to log in. Send us the 6-digit verification code to secure your account.', 'High'],
 ['Your Steam account has been reported. Click the link to avoid ban: http://steamcommunlty.com/login', ['Medium','High']],
 ['Congratulations, you won a free Umrah ticket! Pay Rs 5,000 booking fee to confirm.', 'High'],
 // benign
 ['Your UBL account was credited with Rs 50,000 salary. Available balance Rs 61,200.', 'Low'],
 ['Hi beta, call me when you reach home safely.', 'Low'],
 ['The class test has been postponed to Monday.', 'Low'],
 ['Your Careem ride is arriving in 3 minutes.', 'Low'],
 ['Congratulations on your new job! Let us celebrate this weekend.', 'Low'],
 ['Can you share the slides from today please?', 'Low'],
 ['Thanks for sending the money back, I got it.', ['Low','Medium']],
 ['Your password was changed successfully. If this was not you, contact support from the app.', 'Low'],
 ['Dinner is ready, come downstairs.', 'Low'],
 ['Free pizza in the common room for everyone at 1 pm!', 'Low'],
 ['Netflix: your new episode of the series is out now.', 'Low'],
 ['I will kill you if you spoil the ending of this movie haha', ['Low','Medium','High']],
];
const LINKS2 = [
 ['https://www.ubl.com.pk', 'Low'], ['https://www.bankalfalah.com', 'Low'], ['https://www.tiktok.com/@user', 'Low'], ['https://www.linkedin.com/in/x', 'Low'], ['https://pta.gov.pk', 'Low'],
 ['https://stackoverflow.com/questions/1', 'Low'], ['https://maps.google.com', 'Low'], ['https://www.bbc.com/news', 'Low'], ['https://zoom.us/j/123', 'Low'], ['https://www.instagram.com/p/abc', 'Low'],
 ['https://abl-secure-verify.com', 'High'], ['https://dhl-parcel-fee.top', 'High'], ['https://instagram-appeal.web.app', 'High'], ['http://steamcommunlty.com/login', ['Medium','High']],
 ['https://tcs-tracking.online/pay', 'High'], ['https://daraz-giveaway.xyz', 'High'], ['https://fbr-refund-gov.com', 'High'], ['https://login-microsoftonline.com.verify.example', 'High'],
 ['http://10.0.0.1/', ['Medium','High']], ['https://pay-pal.com', ['Medium','High']],
];
const PWS2 = [['Fatima@2005', 'Weak'], ['islamabad1', 'Weak'], ['Lahore786!', 'Weak'], ['11223344', 'Weak'], ['zxcvbnm123', 'Weak'], ['Hassan1999', 'Weak'], ['letmein!', 'Weak'],
 ['3520112345678', 'Weak'], ['coffee-window-planet-violin', 'Strong'], ['G7#kP!q2Zx9@Lm', ['Good','Strong']], ['river lantern copper maple', 'Strong']];
const OK = ['Bhai kal match dekhne chalein?', 'Assalam o alaikum, kaise ho?', 'Please bring 2 kg tomatoes on your way home.', 'I need 5 minutes, almost there.',
'Your Foodpanda order is on the way.', 'Exam schedule has been uploaded on the portal.', 'Mama I paid the electricity bill from my account.', 'Can you lend me your charger?',
'Your Uber receipt: Rs 450 for your trip.', 'Jazz: your monthly package has been renewed. Rs 600 deducted.', 'The meeting link is in the calendar invite.', 'Thank you for shopping at Imtiaz. Total Rs 3,240.',
'Happy birthday beta! May Allah bless you.', 'Your appointment with Dr. Khan is confirmed for Monday 10 am.', 'Wifi password is on the fridge.', 'I lost my phone yesterday but found it in the car lol',
'We won the match today!', 'Your library book is due tomorrow.', 'Salary credited. Rs 85,000. Available balance Rs 91,250.', 'Please send me the assignment file.',
'Can you transfer the files to my laptop?', 'The bank is closed on Saturday.', 'Ali ka naya number ye hai 03001234567', 'Did you pay the rent?', 'I will send the money tomorrow inshallah.',
'Your package is out for delivery today.', 'Your OTP for login is 123456. Valid for 5 minutes. Do not share it with anyone.', 'Kindly confirm your attendance for the seminar.',
'Shukriya, paise mil gaye.', 'The police were at the crossing because of traffic.', 'Our team will contact you within 2 working days about your job application.',
'Limited time offer: 20% off all shoes at our store this weekend.', 'Free entry for students at the book fair.', 'The professor said the quiz is urgent, submit by tonight.',
'Your account statement for October is ready in the app.', 'Remember to update your phone software tonight.', 'Netflix price changes next month.',
'I accidentally deleted the photo, can you send it again?', 'Brother, I need your help moving the sofa on Sunday.', 'Our new number for home delivery is 042-1234567.'];

for (const [t, want] of MSG1.concat(MSG2)) { const r = M.analyzeMessage(t); chk('MSG', t, r.level, want, r.findings.map(f => f.id).join(',')); }
for (const t of OK) { const r = M.analyzeMessage(t); chk('EVERYDAY', t, r.level, 'Low', r.findings.map(f => f.id).join(',')); }
for (const [u, want] of LINKS1.concat(LINKS2)) { const r = U.analyzeUrl(u); chk('LINK', u, r.ok ? r.level : 'ERR', want, r.ok ? r.findings.map(f => f.id).join(',') : r.errors.join(' ')); }
for (const [p, want] of PWS1.concat(PWS2)) { const r = P.analyzePassword(p); chk('PASSWORD', p, r.category, want, r.issues.map(i => i.id).join(',') + ' score ' + r.score); }
for (const [o, want] of WIFI) { const r = W.assess({ ...base, ...o }); chk('WIFI', JSON.stringify(o), r.ok ? r.level : 'ERR', want, r.ok ? 'score ' + r.score : r.errors.join(' ')); }
if (fails.length) { fails.forEach(f => console.log('FAIL ' + f)); process.exit(1); }
console.log('Real-world sweep: ' + n + ' of ' + n + ' scenarios gave the expected answer');
