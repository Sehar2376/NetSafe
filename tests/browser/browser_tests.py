#!/usr/bin/env python3
"""NetSafe browser tests (Chromium via Playwright). Starts its own local web server; no other setup.

  pip install playwright && playwright install chromium
  python3 tests/browser/browser_tests.py                       # run all checks (uses serve.py)
  python3 tests/browser/browser_tests.py --only nav,overview   # run selected groups
  python3 tests/browser/browser_tests.py --screenshots docs/screenshots
  python3 tests/browser/browser_tests.py --json results.json

Exit code 1 if any check fails. Only Chromium is exercised (see docs/LIMITATIONS.md)."""
import argparse, json, pathlib, socket, subprocess, sys, time
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parents[2]
RESULTS = []

def ok(name, cond, detail=''):
    RESULTS.append({'name': name, 'passed': bool(cond), 'detail': '' if cond else str(detail)})
    print(('PASS ' if cond else 'FAIL ') + name + ('' if cond or not detail else '  -> ' + str(detail)[:300]))

def until(fn, t=10):
    end = time.time() + t
    while time.time() < end:
        try:
            if fn(): return True
        except Exception: pass
        time.sleep(0.1)
    return False

def free_port():
    s = socket.socket(); s.bind(('127.0.0.1', 0)); p = s.getsockname()[1]; s.close(); return p

# ---------------------------------------------------------------- in-page audit scripts
CONTRAST_JS = r"""() => {
  const parse = c => { const m = c.match(/rgba?\(([^)]+)\)/); if(!m) return null; const p = m[1].split(',').map(x=>parseFloat(x)); return {r:p[0],g:p[1],b:p[2],a:p.length>3?p[3]:1}; };
  const over = (f,b) => ({r:f.r*f.a+b.r*(1-f.a), g:f.g*f.a+b.g*(1-f.a), b:f.b*f.a+b.b*(1-f.a), a:1});
  const lum = c => { const f = v => { v/=255; return v<=0.03928? v/12.92 : Math.pow((v+0.055)/1.055,2.4); }; return 0.2126*f(c.r)+0.7152*f(c.g)+0.0722*f(c.b); };
  const ratio = (a,b) => { const l1=lum(a), l2=lum(b); return (Math.max(l1,l2)+0.05)/(Math.min(l1,l2)+0.05); };
  const key = c => [c.r,c.g,c.b].map(Math.round).join(','); const uniq = arr => { const m=new Map(); arr.forEach(c=>m.set(key(c),c)); return [...m.values()]; };
  const cache = new Map();
  const cands = el => { if(!el) return [{r:255,g:255,b:255,a:1}]; if(cache.has(el)) return cache.get(el);
    const cs=getComputedStyle(el), below=cands(el.parentElement); const stops=[];
    if(cs.backgroundImage!=='none') (cs.backgroundImage.match(/rgba?\([^)]*\)/g)||[]).forEach(s=>{const c=parse(s); if(c) stops.push(c);});
    const bg=parse(cs.backgroundColor); const base=(bg&&bg.a>0)?(bg.a>=0.99?[bg]:below.map(b=>over(bg,b))):below; let res=base;
    if(stops.length){ res=[]; stops.forEach(s=>{ if(s.a>=0.99) res.push(s); else if(s.a>0) base.forEach(b=>res.push(over(s,b))); else base.forEach(b=>res.push(b)); }); }
    res=uniq(res); cache.set(el,res); return res; };
  const out=[], seen=new Set(); let checked=0; const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
  while(w.nextNode()){ const el=w.currentNode.parentElement; if(!w.currentNode.textContent.trim()||!el||seen.has(el)) continue; seen.add(el);
    const cs=getComputedStyle(el); if(cs.visibility==='hidden'||cs.display==='none') continue; const r=el.getBoundingClientRect(); if(!r.width||!r.height||el.closest('[hidden],noscript,script,style')) continue;
    const size=parseFloat(cs.fontSize), bold=parseInt(cs.fontWeight)>=700, need=(size>=24||(size>=18.66&&bold))?3:4.5, fg0=parse(cs.color), op=parseFloat(cs.opacity||1); checked++;
    let worst=99; cands(el).forEach(b=>{ worst=Math.min(worst,ratio(over({...fg0,a:fg0.a*op},b),b)); });
    if(worst<need) out.push({t:el.textContent.trim().slice(0,40),ratio:+worst.toFixed(2),need}); }
  return {checked,out}; }"""
NAMES_JS = r"""() => { const bad=[]; document.querySelectorAll('button,a[href],input:not([type=hidden]),select,textarea,summary').forEach(el=>{ if(getComputedStyle(el).display==='none') return;
  const name=(el.getAttribute('aria-label')||'').trim()||(el.labels&&el.labels.length?[...el.labels].map(l=>l.textContent).join('').trim():'')||(['BUTTON','A','SUMMARY'].includes(el.tagName)?el.textContent.trim():'')||(el.getAttribute('aria-labelledby')?'x':'')||(el.getAttribute('title')||'');
  if(!name) bad.push(el.outerHTML.slice(0,80)); }); return bad; }"""
STRUCT_JS = r"""() => { const hs=[...document.querySelectorAll('h1,h2,h3,h4')].filter(h=>h.offsetParent!==null).map(h=>+h.tagName[1]); const skips=[]; for(let i=1;i<hs.length;i++) if(hs[i]-hs[i-1]>1) skips.push(hs[i-1]+'->'+hs[i]);
  const ids={}; document.querySelectorAll('[id]').forEach(e=>ids[e.id]=(ids[e.id]||0)+1);
  return {h1:hs.filter(x=>x===1).length, skips, dups:Object.keys(ids).filter(k=>ids[k]>1), main:document.querySelectorAll('main').length, lang:document.documentElement.lang,
    imgsNoAlt:[...document.querySelectorAll('img')].filter(i=>!i.hasAttribute('alt')).length, unlabelledNav:[...document.querySelectorAll('nav')].filter(n=>!n.getAttribute('aria-label')).length}; }"""
TARGET_JS = r"""() => { const small=[]; document.querySelectorAll('button,a[href],input:not([type=hidden]):not([type=checkbox]):not([type=radio]),select,textarea,summary').forEach(el=>{
  if(getComputedStyle(el).display==='none'||el.disabled) return; const r=el.getBoundingClientRect(); if(!r.width||!r.height) return;
  if(el.tagName==='A' && el.closest('p,li,small,.note') && getComputedStyle(el).display==='inline') return;
  if(r.height<44||r.width<44) small.push((el.textContent||el.value||el.id).trim().slice(0,24)+' '+Math.round(r.width)+'x'+Math.round(r.height)); }); return small; }"""

class Env:
    def __init__(self, browser, base):
        self.browser, self.base = browser, base
        self.console, self.requests, self.dialogs = [], [], []
    def page(self, view=None, w=1280, h=900, quiet=False, **kw):
        ctx = self.browser.new_context(viewport={'width': w, 'height': h}, accept_downloads=True, **kw)
        pg = ctx.new_page()
        if not quiet: self._listen(pg)
        pg.goto(self.base + '/index.html' + ('#' + view if view else '')); pg.wait_for_timeout(300)
        return pg
    def _listen(self, pg):
        pg.on('console', lambda m: self.console.append((m.type, m.text)) if m.type in ('error', 'warning') else None)
        pg.on('pageerror', lambda e: self.console.append(('pageerror', str(e))))
        pg.on('request', lambda r: self.requests.append(r.url))
        pg.on('dialog', lambda d: (self.dialogs.append(d.message), d.dismiss()))

def fill_wifi(pg, ssid='Cafe_Guest', type='public', protocol='wpa2', password='yes', sharing='shared', location='cafe', captive='yes'):
    pg.fill('input[name=ssid]', ssid); pg.select_option('select[name=type]', type); pg.select_option('select[name=protocol]', protocol)
    pg.check(f'input[name=password][value={password}]')
    if password == 'yes' and sharing: pg.select_option('select[name=sharing]', sharing)
    pg.select_option('select[name=location]', location); pg.select_option('select[name=captive]', captive); pg.click('#form button[type=submit]'); pg.wait_for_timeout(150)

def populate(pg, with_crypto=False):
    go(pg, 'link'); pg.fill('#urlIn', 'http://paypal.com.secure-login.example/verify'); pg.click('#urlForm button[type=submit]')
    go(pg, 'message'); pg.click('#msgExamples >> text="Bank SMS scam"')
    go(pg, 'password'); pg.fill('#pwin', 'Password1!'); pg.press('#pwin', 'Tab'); pg.check('#pwreuse')
    go(pg, 'wifi'); fill_wifi(pg, ssid='Net', protocol='unknown', captive='unknown')
    if with_crypto:
        go(pg, 'lab'); pg.click('#aesEnc'); until(lambda: not pg.is_disabled('#aesDec')); pg.click('#aesTamper'); pg.wait_for_timeout(1200); pg.click('#brute')
    go(pg, 'overview')
    pg.evaluate("document.querySelectorAll('details').forEach(d => d.open = true)")

VIEWS = ['home', 'message', 'link', 'password', 'wifi', 'overview', 'lab', 'learn']
H1 = {'home': 'Check it before you click', 'message': 'Is this message a scam?', 'link': 'Is this website link safe?', 'password': 'Password strength checker', 'wifi': 'Wi-Fi risk assessment', 'overview': 'Your security overview', 'lab': 'Cryptography Lab', 'learn': 'Security education'}
def visible_views(pg): return pg.evaluate("[...new Set([...document.querySelectorAll('[data-view]:not([hidden])')].map(e => e.dataset.view))]")
def go(pg, view):
    """Click the top-menu link, like a user, and wait until only that page is showing."""
    pg.click(f'header nav a[href="#{view}"]')
    until(lambda: visible_views(pg) == [view])

def card(pg, title): return pg.locator('#ovGrid .ovcard').filter(has=pg.locator('h2', has_text=title))

def pill(pg, title): return card(pg, title).locator('.pill').inner_text()

# ---------------------------------------------------------------- test groups
def t_load(env):
    pg = env.page()
    ok('LOAD title and h1 describe the whole assistant', 'Internet Safety Assistant' in pg.title() and 'click, reply or connect' in pg.inner_text('h1'))
    ok('LOAD the first page is Home, and only Home is showing', visible_views(pg) == ['home'])
    txt = pg.inner_text('main')
    ok('LOAD Home states the problem, the objective and who it is for', all(k in txt for k in ('What is NetSafe for?', 'The problem', 'Our objective', 'Who it is for', 'After using NetSafe you can')))
    ok('LOAD Home offers the four everyday situations, each linking to its own page', sorted(pg.locator('.startcard a').evaluate_all('els => els.map(e => e.getAttribute("href"))')) == ['#link', '#message', '#password', '#wifi'])
    ok('LOAD no ticker or typing banner remains', pg.locator('#ticker, .bp, .tk-track').count() == 0)
    ok('LOAD page does not use smooth scrolling', pg.evaluate("getComputedStyle(document.documentElement).scrollBehavior") == 'auto')
    go(pg, 'overview')
    ok('LOAD all four overview cards start as Not assessed', [pill(pg, t) for t in ('Website links', 'Messages', 'Password', 'Wi-Fi')] == ['Not assessed'] * 4)
    ok('LOAD empty overview does not claim safety', 'not counted as safe' in pg.inner_text('#ovHead') and pg.locator('#ovPlan *').count() == 0)
    ok('LOAD report and print buttons disabled until something is checked', pg.is_disabled('#ovReport') and pg.is_disabled('#ovPrint'))
    ok('LOAD every tool shows an empty state', all(pg.locator(x).count() == 1 for x in ('#urlResult .empty', '#msgResult .empty', '#pwResult .empty')))
    pg.context.close()

def t_link(env):
    pg = env.page('link')
    for label, exp in [('Normal site', 'Low'), ('Fake brand', 'High'), ('Numbers only', 'High'), ('Tricky @', 'High'), ('Look-alike letters', 'High'), ('Short link', 'Medium')]:
        pg.click(f'#urlExamples >> text="{label}"'); ok(f'LINK example "{label}" is {exp}', pg.inner_text('#urlResult .tag').startswith(exp), pg.inner_text('#urlResult .tag'))
    pg.click('#urlExamples >> text="Normal site"'); ok('LINK Low result says it is not proof of safety', 'does not make the site safe' in pg.inner_text('#urlResult'))
    pg.click('#urlExamples >> text="Fake brand"'); txt = pg.inner_text('#urlResult')
    ok('LINK findings use the 4-part explanation and list what was not checked', all(k in txt for k in ('What we noticed', 'Why it matters', 'What could happen', 'What to do', 'What NetSafe did not check', 'If you already opened it')))
    for pay in ['https://x.example/"><img src=x onerror=window.__x=1>', 'https://u"<b>@a.example']:
        pg.fill('#urlIn', pay); pg.click('#urlForm button[type=submit]'); pg.wait_for_timeout(120)
        ok('LINK XSS payload stays inert text', not pg.evaluate('window.__x===1') and pg.locator('#urlResult img, #urlResult script, #urlResult svg').count() == 0 and pg.locator('#urlResult a').count() == 0, pay)
    pg.fill('#urlIn', 'https://www.google.com/'); pg.click('#urlForm button[type=submit]'); txt = pg.inner_text('#urlResult')
    ok('LINK typed https://www.google.com/ and the Check link button gives a visible Low result that is not called safe', pg.inner_text('#urlResult .tag').startswith('Low') and 'google.com' in txt and 'does not make the site safe' in txt)
    pg.fill('#urlIn', 'https://googIe.com'); pg.keyboard.press('Enter'); txt = pg.inner_text('#urlResult')
    ok('LINK look-alike name (capital I for l) is flagged with the imitated brand, via the Enter key', 'imitates "Google"' in txt and not pg.inner_text('#urlResult .tag').startswith('Low'))
    pg.fill('#urlIn', 'ftp://x.y'); pg.click('#urlForm button[type=submit]'); ok('LINK invalid input shows an error', pg.is_visible('#urlErr'))
    pg.click('#urlClear'); ok('LINK clear resets field and error', pg.input_value('#urlIn') == '' and pg.is_hidden('#urlErr'))
    pg.context.close()

def t_message(env):
    pg = env.page('message')
    for label, exp in [('Bank SMS scam', 'High'), ('Prize scam', 'High'), ('Family emergency', 'High'), ('Genuine code notice', 'Low'), ('Normal message', 'Low')]:
        pg.click(f'#msgExamples >> text="{label}"'); ok(f'MESSAGE example "{label}" is {exp}', pg.inner_text('#msgResult .tag').startswith(exp), pg.inner_text('#msgResult .tag'))
    pg.click('#msgExamples >> text="Genuine code notice"'); ok('MESSAGE genuine code notice: no findings, explanatory note', pg.locator('#msgResult .finding').count() == 0 and 'Never share the code' in pg.inner_text('#msgResult'))
    pg.click('#msgExamples >> text="Bank SMS scam"')
    ok('MESSAGE phrases are highlighted with numbers matching the findings', pg.locator('#msgResult mark').count() >= 4 and pg.locator('#msgResult .finding').count() == 5)
    ok('MESSAGE highlighted box preserves the original text', 'Verify your CNIC and OTP' in pg.inner_text('#msgResult .msgbox') and 'http://hbl-verify.example/login' in pg.inner_text('#msgResult .msgbox'))
    ok('MESSAGE result has the "if you already responded" section', 'If you already replied or clicked' in pg.inner_text('#msgResult'))
    for pay in ['share your OTP <img src=x onerror=window.__x=1>', '<script>window.__x=1</script> send money http://a.example/"><svg onload=window.__x=1>']:
        pg.fill('#msgIn', pay); pg.click('#msgForm button[type=submit]'); pg.wait_for_timeout(120)
        ok('MESSAGE XSS payload stays inert text; links are never clickable', not pg.evaluate('window.__x===1') and pg.locator('#msgResult img, #msgResult script, #msgResult svg, #msgResult a').count() == 0, pay)
    pg.fill('#msgIn', 'Dear customer, your bank needs an update'); pg.fill('#msgSender', 'hbl.support@gmail.com'); pg.select_option('#msgChannel', 'email'); pg.click('#msgForm button[type=submit]')
    ok('MESSAGE sender checks run when a sender is supplied', 'free email' in pg.inner_text('#msgResult'))
    pg.fill('#msgSender', ''); pg.fill('#msgIn', 'your son is with us sent us moeny or we will kill him we need 1000k'); pg.click('#msgForm button[type=submit]'); txt = pg.inner_text('#msgResult')
    ok('MESSAGE typed kidnap threat (typos included) is High, highlighted, and says to contact the police', pg.inner_text('#msgResult .tag').startswith('High') and 'Threatens violence or kidnapping' in txt and 'police' in txt and pg.locator('#msgResult mark').count() >= 2, txt[:200])
    pg.click('#msgExamples >> text="Kidnap threat"'); ok('MESSAGE "Kidnap threat" example is High', pg.inner_text('#msgResult .tag').startswith('High'))
    pg.fill('#msgIn', '   '); pg.click('#msgForm button[type=submit]'); ok('MESSAGE empty input shows an error', pg.is_visible('#msgErr'))
    pg.click('#msgClear'); pg.focus('#msgIn'); pg.keyboard.type('Please share your OTP now')
    for _ in range(3): pg.keyboard.press('Tab')
    pg.keyboard.press('Enter'); ok('MESSAGE works with the keyboard alone (type, Tab, Enter)', until(lambda: pg.locator('#msgResult .tag').count() == 1 and pg.inner_text('#msgResult .tag').startswith('High')))
    pg.context.close()

def t_scenarios(env):
    """Real-world scenarios added in November 2026, driven through the real interface (typing and clicking)."""
    pg = env.page('message')
    for label, exp, rule in [('Sent by mistake', 'High', 'sent to you by mistake'), ('Easy job offer', 'High', 'Easy-money job offer')]:
        pg.click(f'#msgExamples >> text="{label}"'); txt = pg.inner_text('#msgResult')
        ok(f'SCENARIO message example "{label}" is {exp} and names the scam type', pg.inner_text('#msgResult .tag').startswith(exp) and rule in txt, txt[:160])
    for text, rule in [('Hello pervert, I recorded you through your webcam. Pay $1490 in bitcoin or I will send the video to all your contacts.', 'Threatens to leak'),
                       ('URGENT: You have a pending e-challan of Rs 2000. Pay now at https://echallan-psca.cc to avoid legal action.', 'government or official programme'),
                       ('Hi, I sent a code to your number by mistake, can you send me the 6 digit code please?', 'code sent to your phone')]:
        pg.fill('#msgIn', text); pg.click('#msgForm button[type=submit]'); txt = pg.inner_text('#msgResult')
        ok('SCENARIO typed scam is High: ' + rule, pg.inner_text('#msgResult .tag').startswith('High') and rule in txt, txt[:160])
    pg.fill('#msgIn', 'Our office is closed tomorrow. Work from home is allowed.'); pg.click('#msgForm button[type=submit]')
    ok('SCENARIO everyday message stays Low', pg.inner_text('#msgResult .tag').startswith('Low'))
    go(pg, 'link')
    for url, exp, words in [('https://hbl-verify.pages.dev', 'High', 'Free hosting'), ('https://echallan-psca-gop.cc', 'High', 'Government-looking name'), ('https://echallan.psca.gop.pk', 'Low', 'does not make the site safe')]:
        pg.fill('#urlIn', url); pg.click('#urlForm button[type=submit]'); txt = pg.inner_text('#urlResult')
        ok(f'SCENARIO link {url} is {exp}', pg.inner_text('#urlResult .tag').startswith(exp) and words in txt, txt[:160])
    go(pg, 'password')
    pg.fill('#pwin', '03001234567'); ok('SCENARIO phone-number password is Weak and explained', 'Weak' in pg.inner_text('#pwResult .tag') and 'phone number' in pg.inner_text('#pwResult'))
    go(pg, 'wifi'); fill_wifi(pg, ssid='PTCL-BB', type='private', protocol='wpa2', password='yes', sharing='private', location='home', captive='no')
    ok('SCENARIO factory router name gets router advice', 'Router still uses its factory name' in pg.inner_text('#result') and 'admin password' in pg.inner_text('#result'))
    pg.context.close()

def t_password(env):
    pg = env.page('password')
    ok('PASSWORD field is masked by default', pg.get_attribute('#pwin', 'type') == 'password')
    for pw, exp in [('Summer2024!', 'Weak'), ('P@ssw0rd', 'Weak'), ('correct horse battery staple', 'Weak'), ('river lantern copper maple', 'Strong'), ('fz8#Kp2!vQ9@mL4x', 'Strong')]:
        pg.fill('#pwin', pw); ok(f'PASSWORD "{pw}" is {exp}', pg.inner_text('#pwResult .tag').startswith(exp), pg.inner_text('#pwResult .tag'))
    pg.click('#pwshow'); ok('PASSWORD show/hide toggle works', pg.get_attribute('#pwin', 'type') == 'text' and pg.get_attribute('#pwshow', 'aria-pressed') == 'true'); pg.click('#pwshow')
    pg.fill('#pwin', 'Summer2024!'); ok('PASSWORD result explains weaknesses and says it is only an estimate', 'What is weakening it' in pg.inner_text('#pwResult') and 'not a prediction' in pg.inner_text('#pwResult'))
    pg.check('#pwreuse'); ok('PASSWORD reuse box shows the reuse risk', 'Reuse risk' in pg.inner_text('#pwResult'))
    pg.fill('#pwin', '<img src=x onerror=window.__x=1>'); pg.wait_for_timeout(100); ok('PASSWORD XSS payload stays inert', not pg.evaluate('window.__x===1') and pg.locator('#pwResult img').count() == 0)
    pg.fill('#pwin', ''); ok('PASSWORD emptying the field restores the empty state', 'Type a password' in pg.inner_text('#pwResult'))
    pg.context.close()

def t_wifi(env):
    pg = env.page('wifi')
    ok('WIFI sharing question is hidden until a password is used', pg.is_hidden('#sharingBox')); pg.check('input[name=password][value=yes]'); ok('WIFI sharing question appears for password networks', pg.is_visible('#sharingBox'))
    for pg_ in [pg]: pg_.reload()
    for name, kw, exp, score in [
        ('cafe WPA2 shared password + login page', {}, 'Medium', '58'),
        ('airport open network + login page', dict(protocol='open', password='no', sharing='', location='airport'), 'High', None),
        ('university Enterprise', dict(type='public', protocol='enterprise', sharing='individual', location='university', captive='no'), 'Low', '20'),
        ('home WPA3', dict(type='private', protocol='wpa3', sharing='private', location='home', captive='no'), 'Low', '5'),
        ('unknown security type at a cafe', dict(protocol='unknown', captive='unknown'), 'Medium', None)]:
        pg.reload(); fill_wifi(pg, **kw); tag = pg.inner_text('#result .tag')
        ok(f'WIFI {name} is {exp}', tag.startswith(exp) and (score is None or pg.inner_text('#result .badge') == score), tag + ' ' + pg.inner_text('#result .badge'))
    ok('WIFI unknown type is held at Medium and explained', 'held at Medium' in pg.inner_text('#result'))
    pg.reload(); fill_wifi(pg); ok('WIFI public result carries the "not automatically dangerous" note and reasonable-use guidance', 'not automatically' in pg.inner_text('#result') and 'What is reasonable here' in pg.inner_text('#result'))
    ok('WIFI result lists what was not checked and states nothing is scanned', 'What NetSafe did not check' in pg.inner_text('#result') and 'does not scan' in pg.inner_text('#result'))
    pg.reload(); fill_wifi(pg, protocol='owe', password='yes'); ok('WIFI contradiction (Enhanced Open + password) is rejected, not scored', pg.is_visible('#errors') and pg.inner_text('#result') == '')
    pg.reload(); pg.click('#form button[type=submit]'); ok('WIFI empty form lists the missing fields', pg.locator('#errors li').count() >= 3)
    pg.reload(); pg.check('input[name=password][value=yes]'); pg.fill('input[name=ssid]', 'abc'); pg.click('#reset'); pg.wait_for_timeout(100); ok('WIFI reset clears the form and hides the sharing question', pg.input_value('input[name=ssid]') == '' and pg.is_hidden('#sharingBox'))
    pg.reload(); fill_wifi(pg, ssid='<img src=x onerror=window.__x=1>'); ok('WIFI XSS payload in the network name stays inert text', not pg.evaluate('window.__x===1') and pg.locator('#result img').count() == 0 and '<img' in pg.inner_text('#result'))
    pg.context.close()

def t_crypto(env):
    pg = env.page('lab')
    ok('CRYPTO page can use Web Crypto', pg.evaluate('!!(crypto&&crypto.subtle)') and pg.is_enabled('#aesEnc'))
    until(lambda: len(pg.inner_text('#shaOut')) == 64); ok('CRYPTO SHA-256 of "NetSafe" is 64 hex characters with an avalanche line', len(pg.inner_text('#shaOut')) == 64 and 'bits are different' in pg.inner_text('#shaDiff'))
    pg.fill('#shaIn', 'abc'); ok('CRYPTO SHA-256("abc") matches the standard test vector', until(lambda: pg.inner_text('#shaOut') == 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'))
    def enc():
        pg.click('#aesEnc'); until(lambda: pg.is_disabled('#aesDec')); return until(lambda: not pg.is_disabled('#aesDec') and pg.input_value('#aesPacked').startswith('ns1.'))
    ok('CRYPTO AES-GCM encrypts, and the output hides the message', enc() and 'Meet at the cafe' not in pg.input_value('#aesPacked'))
    first = pg.input_value('#aesPacked'); enc(); ok('CRYPTO encrypting twice gives different output (random salt and nonce)', pg.input_value('#aesPacked') != first)
    pg.click('#aesDec'); ok('CRYPTO decrypts with the right passphrase', until(lambda: 'Decrypted successfully' in pg.inner_text('#aesStatus')))
    good = pg.input_value('#aesPass'); pg.fill('#aesPass', 'wrong one'); pg.click('#aesDec'); ok('CRYPTO wrong passphrase is refused', until(lambda: pg.locator('#aesStatus .errors').count() == 1))
    pg.fill('#aesPass', good); pg.click('#aesTamper'); ok('CRYPTO tampering is detected and explained', until(lambda: 'refused' in pg.inner_text('#aesStatus')))
    pg.fill('#aesPacked', 'garbage'); pg.click('#aesDec'); ok('CRYPTO garbage input gives a clear error', until(lambda: 'not text produced by this demo' in pg.inner_text('#aesStatus')))
    pg.fill('#aesPacked', ''); pg.click('#aesDec'); ok('CRYPTO decrypting nothing gives a clear message', until(lambda: 'Nothing to decrypt' in pg.inner_text('#aesStatus')))
    pg.fill('#aesMsg', 'h\u00e9llo \u2713 \u0627\u0631\u062f\u0648 <img src=x onerror=window.__x=1>'); enc(); pg.click('#aesDec'); until(lambda: 'Decrypted successfully' in pg.inner_text('#aesStatus'))
    ok('CRYPTO unicode round-trips and markup is shown as text, not run', '\u0627\u0631\u062f\u0648' in pg.inner_text('#aesStatus') and not pg.evaluate('window.__x===1') and pg.locator('#aesStatus img').count() == 0)
    pg.click('#enc'); ok('CRYPTO Caesar cipher still works', pg.inner_text('#cout') == 'PHHW DW WKH FDIH')
    pg.click('#brute'); ok('CRYPTO Caesar brute force lists all 25 shifts', pg.inner_text('#cout').count('\n') >= 24)
    ok('CRYPTO five concept cards are present', pg.locator('#concepts .concept').count() == 5)
    pg.context.close()

def t_overview(env):
    pg = env.page('link')
    status = lambda m: pg.evaluate("id => NetSafeOverview.build().modules.find(m => m.id === id).status", m)
    pg.fill('#urlIn', 'http://paypal.com.secure-login.example/verify?token=SECRETTOKEN'); pg.click('#urlForm button[type=submit]')
    go(pg, 'overview')
    ok('OVERVIEW link check marks only Website links as Assessed', pill(pg, 'Website links') == 'Assessed' and [pill(pg, t) for t in ('Messages', 'Password', 'Wi-Fi')] == ['Not assessed'] * 3)
    go(pg, 'message'); pg.fill('#msgIn', 'Dear customer, share your OTP 482913 now at http://secret-bank.example/abc'); pg.select_option('#msgChannel', 'sms'); pg.fill('#msgSender', 'agent.john@example.org'); pg.click('#msgForm button[type=submit]')
    go(pg, 'password'); pg.fill('#pwin', 'Summer2024!')
    ok('OVERVIEW password is not reported while still typing', status('password') == 'not-assessed')
    pg.press('#pwin', 'Tab'); ok('OVERVIEW password is reported once the field is left', status('password') == 'assessed')
    pg.check('#pwreuse')
    go(pg, 'wifi'); fill_wifi(pg, ssid='Smith_Family_Home', protocol='unknown', captive='unknown')
    go(pg, 'overview')
    ok('OVERVIEW password reuse is reflected', 'reused' in card(pg, 'Password').inner_text())
    ok('OVERVIEW Wi-Fi with unknown security type shows Information unavailable', pill(pg, 'Wi-Fi') == 'Information unavailable' and 'security type was unknown' in card(pg, 'Wi-Fi').inner_text())
    ok('OVERVIEW coverage line counts the three states', 'Assessed: 3 of 4' in pg.inner_text('#ovHead') and 'Information unavailable: 1' in pg.inner_text('#ovHead'))
    ok('OVERVIEW headline reports results, with no combined score', 'Attention needed' in pg.inner_text('#ovHead') and 'score' not in pg.inner_text('#ovHead').lower())
    plan = pg.locator('#ovPlan details.plan summary').all_inner_texts()
    ok('OVERVIEW plan order: message, link, password (all High), then Wi-Fi (Medium)', len(plan) == 4 and plan[0].startswith('Message (SMS)') and plan[1].startswith('Link to') and plan[2].startswith('The password') and plan[3].startswith('Public network'), plan)
    ok('OVERVIEW plan items have the five-part structure', all(k in pg.locator('#ovPlan details.plan').first.inner_text() for k in ('What was detected', 'Why it matters', 'What could happen', 'Do this now', 'If you already responded', 'Avoid it next time')))
    ov = pg.inner_text('#overview'); leaks = [x for x in ('SECRETTOKEN', '482913', 'secret-bank', 'agent.john', 'Summer2024', 'Smith_Family', 'share your OTP') if x.lower() in ov.lower()]
    ok('OVERVIEW PRIVACY nothing typed appears anywhere in the overview', not leaks, leaks)
    with pg.expect_download() as d: pg.click('#ovReport')
    dl = d.value; text = pathlib.Path(dl.path()).read_text(encoding='utf-8')
    ok('REPORT downloads as a dated .txt file', dl.suggested_filename.startswith('netsafe-report-') and dl.suggested_filename.endswith('.txt'), dl.suggested_filename)
    ok('REPORT contains headline, statuses, plan and limits', all(k in text for k in ('NETSAFE SECURITY OVERVIEW', 'Information unavailable', 'WHAT TO DO NEXT', 'NOTES AND LIMITS', 'no overall score')))
    rl = [x for x in ('SECRETTOKEN', '482913', 'secret-bank', 'agent.john', 'Summer2024', 'Smith_Family', 'share your otp') if x.lower() in text.lower()]
    ok('REPORT PRIVACY nothing typed appears in the downloaded report', not rl, rl)
    ok('STORAGE nothing in localStorage, sessionStorage, cookies or IndexedDB after using every tool and every page', pg.evaluate('localStorage.length')==0 and pg.evaluate('sessionStorage.length')==0 and pg.evaluate('document.cookie')=='' and pg.evaluate("indexedDB.databases ? indexedDB.databases().then(d=>d.length) : 0")==0)
    pg.emulate_media(media='print')
    ok('PRINT view shows only the overview, in black on white, without navigation', visible_views(pg) == ['overview'] and pg.evaluate("getComputedStyle(document.querySelector('.nav')).display")=='none' and pg.evaluate("getComputedStyle(document.body).backgroundColor")=='rgb(255, 255, 255)')
    ok('PRINT view produces a PDF', len(pg.pdf()) > 5000); pg.emulate_media(media='screen')
    pg.click('#ovClear'); ok('OVERVIEW Clear all results resets every card and disables the report', [pill(pg, t) for t in ('Website links', 'Messages', 'Password', 'Wi-Fi')] == ['Not assessed'] * 4 and pg.is_disabled('#ovReport'))
    go(pg, 'link'); pg.fill('#urlIn', 'https://example.com'); pg.click('#urlForm button[type=submit]'); go(pg, 'overview'); ok('OVERVIEW Low result headline is not a promise', 'not a guarantee' in pg.inner_text('#ovHead'))
    pg.reload(); pg.wait_for_timeout(300); ok('OVERVIEW is empty again after a reload (nothing persisted)', [pill(pg, t) for t in ('Website links', 'Messages', 'Password', 'Wi-Fi')] == ['Not assessed'] * 4)
    pg.click('#ovGrid .ovcard:has(h2:text("Messages")) a'); until(lambda: visible_views(pg) == ['message']); ok('OVERVIEW card button opens its tool page', pg.evaluate('location.hash') == '#message')
    pg.context.close()

def t_demo(env):
    """Follows docs/DEMO.md literally: same inputs, same option labels, same order, using the top menu."""
    pg = env.page()
    go(pg, 'overview'); ok('DEMO 1 overview starts with four Not assessed cards and the "not counted as safe" headline', [pill(pg, t) for t in ('Website links', 'Messages', 'Password', 'Wi-Fi')] == ['Not assessed'] * 4 and 'not counted as safe' in pg.inner_text('#ovHead'))
    go(pg, 'message'); pg.fill('#msgIn', 'HBL Alert: Your account will be blocked within 24 hours. Verify your CNIC and OTP now at http://hbl-verify.example/login'); pg.fill('#msgSender', '+92 300 0000000'); pg.select_option('#msgChannel', label='SMS'); pg.click('#msgForm button[type=submit]')
    ok('DEMO 2 bank SMS is High with six findings, a most-important step and an if-already-responded section', pg.inner_text('#msgResult .tag').startswith('High') and pg.locator('#msgResult .finding').count() == 6 and 'Never share an OTP' in pg.inner_text('#msgResult .todo') and 'If you already replied or clicked' in pg.inner_text('#msgResult'))
    pg.click('#msgExamples >> text="Genuine code notice"'); ok('DEMO 3 genuine code notice is Low with no findings and a note', pg.inner_text('#msgResult .tag').startswith('Low') and pg.locator('#msgResult .finding').count() == 0 and 'change your password' in pg.inner_text('#msgResult'))
    go(pg, 'link'); pg.click('#urlExamples >> text="Fake brand"'); t = pg.inner_text('#urlResult')
    ok('DEMO 4 fake-brand link is High, highlights secure-login.example, lists HTTP, brand and account words', pg.inner_text('#urlResult .tag').startswith('High') and pg.inner_text('#urlResult .p-dom') == 'secure-login.example' and all(k in t for k in ('Not encrypted (HTTP)', 'Uses the name "Paypal"', 'Account words')))
    pg.click('#urlExamples >> text="Tricky @"'); a = pg.inner_text('#urlResult .tag'); pg.click('#urlExamples >> text="Look-alike letters"'); b = pg.inner_text('#urlResult .tag'); pg.click('#urlExamples >> text="Normal site"')
    ok('DEMO 4 tricky @ and look-alike are High; normal site is Low with the not-proof note', a.startswith('High') and b.startswith('High') and pg.inner_text('#urlResult .tag').startswith('Low') and 'does not make the site safe' in pg.inner_text('#urlResult'))
    go(pg, 'password'); pg.click('#pwshow')
    for pw, exp, why in (('Summer2024!', 'Weak', 'one word'), ('P@ssw0rd', 'Weak', 'common password'), ('correct horse battery staple', 'Weak', 'famous'), ('river lantern copper maple', 'Strong', None)):
        pg.fill('#pwin', pw); r = pg.inner_text('#pwResult'); ok(f'DEMO 5 password "{pw}" is {exp}' + (f' ({why})' if why else ''), pg.inner_text('#pwResult .tag').startswith(exp) and (why is None or why in r.lower()), r[:90])
    pg.fill('#pwin', 'Summer2024!'); pg.check('#pwreuse'); pg.press('#pwin', 'Tab'); ok('DEMO 5 reuse warning shows and the password is recorded for the overview', 'Reuse risk' in pg.inner_text('#pwResult') and pg.evaluate("NetSafeOverview.build().modules.find(m => m.id === 'password').status") == 'assessed')
    rows = [('Cafe_Guest', 'Public (open to guests)', 'WPA2', 'yes', 'Shared publicly (sign, receipt)', 'Cafe / restaurant', 'Yes', 'Medium', '58'),
            ('Airport_Free', 'Public (open to guests)', 'Open (no security)', 'no', None, 'Airport / station', 'Yes', 'High', None),
            ('eduroam', 'Public (open to guests)', 'Enterprise (your own username and password)', 'yes', 'Each person has their own login (university, office)', 'University', 'No', 'Low', '20'),
            ('Home_5G', 'Private (home or personal)', 'WPA3', 'yes', 'Me or a few trusted people', 'Home', 'No', 'Low', '5'),
            ('Guest', 'Public (open to guests)', "I don't know", 'yes', 'Shared publicly (sign, receipt)', 'Cafe / restaurant', 'Unknown', 'Medium', None)]
    go(pg, 'wifi')
    for name, typ, sec, pw, who, loc, cap, exp, score in rows:
        pg.click('#reset'); pg.fill('input[name=ssid]', name); pg.select_option('select[name=type]', label=typ); pg.select_option('select[name=protocol]', label=sec); pg.check(f'input[name=password][value={pw}]')
        if who: pg.select_option('select[name=sharing]', label=who)
        pg.select_option('select[name=location]', label=loc); pg.select_option('select[name=captive]', label=cap); pg.click('#form button[type=submit]'); pg.wait_for_timeout(150)
        ok(f'DEMO 6 Wi-Fi "{name}" is {exp}' + (f' ({score})' if score else ''), pg.inner_text('#result .tag').startswith(exp) and (score is None or pg.inner_text('#result .badge') == score), pg.inner_text('#result .tag') + ' ' + pg.inner_text('#result .badge'))
    ok('DEMO 6 the unknown-security-type scenario is held at Medium and explained', 'held at Medium' in pg.inner_text('#result'))
    go(pg, 'overview')
    ok('DEMO 7 overview: Messages, Website links and Password Assessed; Wi-Fi Information unavailable', [pill(pg, t) for t in ('Messages', 'Website links', 'Password', 'Wi-Fi')] == ['Assessed', 'Assessed', 'Assessed', 'Information unavailable'])
    plan = pg.locator('#ovPlan details.plan summary').all_inner_texts(); kinds = ['M' if x.startswith('Message') else 'L' if x.startswith('Link') else 'P' if x.startswith('The password') else 'W' for x in plan]
    ok('DEMO 7 plan order is message, then links, then password, then Wi-Fi', ''.join(kinds) == 'M' + 'L' * kinds.count('L') + 'PW' and kinds.count('L') == 3, ''.join(kinds))
    with pg.expect_download() as d: pg.click('#ovReport')
    ok('DEMO 7 report downloads and has the plan', 'WHAT TO DO NEXT' in pathlib.Path(d.value.path()).read_text(encoding='utf-8'))
    pg.reload(); pg.wait_for_timeout(300); ok('DEMO 9 reload empties the overview', [pill(pg, t) for t in ('Website links', 'Messages', 'Password', 'Wi-Fi')] == ['Not assessed'] * 4)
    pg.context.close()


def t_nav(env):
    pg = env.page()
    for v in VIEWS:
        go(pg, v); cur = pg.locator('header nav a[aria-current=page]')
        ok(f'NAV "{v}" opens only its own page, with its own url, title and h1', visible_views(pg) == [v] and pg.evaluate('location.hash') == '#' + v and pg.inner_text(f'[data-view="{v}"] h1').startswith(H1[v]) and (v == 'home' or pg.title().endswith('- NetSafe')) and pg.title().split(' - ')[0] != '' , (visible_views(pg), pg.title()))
        ok(f'NAV "{v}" marks exactly its own menu link as the current page', cur.count() == 1 and cur.get_attribute('href') == '#' + v)
    go(pg, 'learn'); pg.evaluate('window.scrollTo(0, 900)'); go(pg, 'home'); ok('NAV opening a page starts at the top of it', pg.evaluate('window.scrollY') == 0)
    ok('NAV keyboard and screen-reader focus moves to the new page title', pg.evaluate('document.activeElement.tagName') == 'H1')
    go(pg, 'message'); go(pg, 'link'); pg.go_back(); until(lambda: visible_views(pg) == ['message']); ok('NAV the Back button returns to the previous page', visible_views(pg) == ['message'])
    pg.go_forward(); until(lambda: visible_views(pg) == ['link']); ok('NAV the Forward button works too', visible_views(pg) == ['link'])
    for h, exp in (('wifi', 'wifi'), ('assess', 'wifi'), ('pw', 'password'), ('how', 'home'), ('bogus', 'home')):
        pg.goto(env.base + '/index.html#' + h); until(lambda: visible_views(pg) == [exp]); ok(f'NAV link #{h} opens the {exp} page', visible_views(pg) == [exp])
    pg.goto(env.base + '/index.html'); until(lambda: visible_views(pg) == ['home']); pg.click('.startcard:has-text("suspicious message") a'); until(lambda: visible_views(pg) == ['message']); ok('NAV a Home card opens the matching page', visible_views(pg) == ['message'])
    pg.click('footer nav a[href="#link"]'); until(lambda: visible_views(pg) == ['link']); ok('NAV footer links open pages too', visible_views(pg) == ['link'])
    pg.click('a.brand'); until(lambda: visible_views(pg) == ['home']); ok('NAV the logo returns to Home', visible_views(pg) == ['home'])
    go(pg, 'link'); pg.fill('#urlIn', 'http://203.0.113.10/login'); pg.click('#urlForm button[type=submit]'); go(pg, 'lab'); go(pg, 'overview')
    ok('NAV results survive moving between pages (nothing is lost, nothing is stored)', pill(pg, 'Website links') == 'Assessed')
    pg.keyboard.press('Tab'); pg.context.close()
    nojs = env.page(java_script_enabled=False, quiet=True)
    total = nojs.locator('[data-view]').count(); shown = nojs.locator('[data-view]:visible').count()
    ok('NAV without JavaScript every page stays visible and the "tools are not running" banner explains what to do', total == 11 and shown == total and nojs.locator('#boot').is_visible() and 'python serve.py' in nojs.inner_text('#boot'), (total, shown)); nojs.context.close()


def t_boot(env):
    pg = env.page()
    ok('BOOT the "tools are not running" banner is hidden when everything loads', pg.locator('#boot').is_hidden())
    pg.context.close()
    ctx = env.browser.new_context(); pg = ctx.new_page(); pg.route('**/js/crypto.js', lambda r: r.abort()); pg.goto(env.base + '/index.html'); pg.wait_for_timeout(500)
    ok('BOOT one missing script file keeps the banner visible, with the fix, instead of failing silently', pg.locator('#boot').is_visible() and 'python serve.py' in pg.inner_text('#boot') and 'js' in pg.inner_text('#boot'))
    ok('BOOT the banner names the exact file that failed and why', 'js/crypto.js: could not be loaded' in pg.inner_text('#boot') and 'js/crypto.js: did not run' in pg.inner_text('#boot'), pg.inner_text('#boot')[-300:]); ctx.close()
    ctx = env.browser.new_context(); pg = ctx.new_page(); pg.route('**/js/password.js', lambda r: r.fulfill(status=200, content_type='text/javascript', body='const broken = ;')); pg.goto(env.base + '/index.html'); pg.wait_for_timeout(500)
    ok('BOOT a script error is reported with file and line', pg.locator('#boot').is_visible() and 'js/password.js line 1' in pg.inner_text('#boot')); ctx.close()
    ctx = env.browser.new_context(); pg = ctx.new_page(); pg.route('**/js/*.js', lambda r: r.abort()); pg.goto(env.base + '/index.html'); pg.wait_for_timeout(500)
    ok('BOOT all scripts blocked: the page still shows readable content and the banner', pg.locator('#boot').is_visible() and 'Check it before you click' in pg.inner_text('body')); ctx.close()

def t_rules(env):
    pg = env.page('learn')
    ok('RULES the Learn page has the glossary and "How NetSafe decides" with four rule sets', pg.locator('#edu .card').count() == 13 and pg.locator('#rules details').count() == 4 and 'none of it is AI' in pg.inner_text('[data-view="learn"]'))
    counts = pg.evaluate("() => ({msg: NetSafeMessage.MSG_RULES.length, url: NetSafeUrl.URL_SIGNALS.length, pw: NetSafePassword.PW_CHECKS.length})")
    rows = [pg.locator('#rules details').nth(i).locator('tbody tr').count() for i in range(4)]
    ok('RULES the tables list every rule the engines have (generated from the same data)', rows[0] == counts['msg'] and rows[1] == counts['url'] and rows[2] == counts['pw'] and rows[3] >= 14, (rows, counts))
    pg.evaluate("document.querySelectorAll('#rules details').forEach(d => d.open = true)"); txt = pg.locator('#rules details').nth(0).inner_text()
    ok('RULES the message table shows points and example wording, and says OTP/password requests are always High', 'always High' in txt and 'share your OTP' in txt and 'Points' in txt)
    ok('RULES tables have captions and column headers for screen readers', pg.locator('#rules table caption').count() == 4 and pg.locator('#rules th[scope=col]').count() >= 9)
    ok('RULES the Wi-Fi table matches the scoring (WPA3 5, Open 60, thresholds explained)', 'WPA3 security' in pg.locator('#rules details').nth(3).inner_text() and 'Below 25 is Low' in pg.locator('#rules details').nth(3).inner_text() and pg.evaluate("NetSafeRules.CONFIG.protocol.wpa3") == 5)
    pg.context.close()

def t_security(env):
    pg = env.page(quiet=True)   # these checks deliberately provoke CSP violations, so keep them out of the console check
    ok('SECURITY CSP meta tag forbids everything except same-origin scripts, styles and images', "default-src 'none'" in pg.get_attribute('meta[http-equiv=Content-Security-Policy]', 'content') and "script-src 'self'" in pg.get_attribute('meta[http-equiv=Content-Security-Policy]', 'content'))
    ok('SECURITY CSP blocks an injected inline script', pg.evaluate("() => { const s=document.createElement('script'); s.textContent='window.__csp=1'; document.head.append(s); return window.__csp===1; }") is False)
    h = pg.context.request.get(env.base + '/').headers
    ok('SECURITY server sends CSP (with frame-ancestors none), nosniff, no-referrer and cross-origin headers', "frame-ancestors 'none'" in h['content-security-policy'] and 'file:' not in h['content-security-policy'] and h['x-content-type-options'] == 'nosniff' and h['referrer-policy'] == 'no-referrer' and h['cross-origin-resource-policy'] == 'same-origin', h)
    ok('SECURITY server serves only the app: source, tests and docs are not reachable', all(pg.context.request.get(env.base + x).status == 404 for x in ('/serve.py', '/tests/test_serve.py', '/README.md', '/js/', '/../serve.py')))
    ok('SECURITY CSP blocks outbound network requests', pg.evaluate("() => fetch('https://example.org/').then(()=> 'allowed').catch(()=> 'blocked')") == 'blocked')
    pg.context.close()

def t_a11y(env):
    for name, w, h in (('desktop', 1280, 900), ('mobile', 375, 812)):
        pg = env.page(None, w, h); populate(pg, with_crypto=True); pg.wait_for_timeout(200)
        checked, contrast, names, structs, small = 0, [], [], [], []
        for v in VIEWS:
            go(pg, v); pg.evaluate("document.querySelectorAll('details').forEach(d => d.open = true)")
            c = pg.evaluate(CONTRAST_JS); checked += c['checked']; contrast += [v + ': ' + str(x) for x in c['out']]
            names += [v + ': ' + x for x in pg.evaluate(NAMES_JS)]
            st = pg.evaluate(STRUCT_JS)
            if not (st['h1'] == 1 and not st['skips'] and st['main'] == 1 and st['lang'] == 'en' and not st['dups'] and st['imgsNoAlt'] == 0 and st['unlabelledNav'] == 0): structs.append((v, st))
            small += [v + ': ' + x for x in pg.evaluate(TARGET_JS)]
        ok(f'A11Y {name}: WCAG text contrast passes on all {checked} text elements across all 8 pages (worst case over gradients, results showing)', not contrast, contrast[:3])
        ok(f'A11Y {name}: every control on every page has an accessible name', not names, names[:3])
        ok(f'A11Y {name}: every page has one h1, no skipped heading levels, one main, lang set, no duplicate ids, images have alt, navs labelled', not structs, structs[:2])
        ok(f'A11Y {name}: all buttons, links and fields on every page are at least 44x44 px', not small, small[:5])
        pg.context.close()
    bad, stops = [], 0
    for v in VIEWS:
        pg = env.page(v)
        for _ in range(90):
            pg.keyboard.press('Tab'); i = pg.evaluate("() => { const e=document.activeElement; if(!e||e===document.body) return null; const cs=getComputedStyle(e), r=e.getBoundingClientRect(); return {t:e.tagName+' '+(e.textContent||e.value||e.id||'').trim().slice(0,20), os:cs.outlineStyle, ow:parseFloat(cs.outlineWidth), bs:cs.boxShadow, vis:r.width>0&&r.height>0}; }")
            if i and i['vis']:
                stops += 1
                if i['os'] == 'none' or (i['ow'] < 2 and i['bs'] == 'none'): bad.append(v + ': ' + i['t'])
        pg.context.close()
    ok(f'A11Y keyboard: all {stops} focus stops across the 8 pages show a visible focus ring', stops > 200 and not bad, bad[:5])
    pg = env.page(reduced_motion='reduce'); ok('A11Y reduced-motion preference disables transitions', pg.evaluate("getComputedStyle(document.querySelector('.btn')).transitionDuration") in ('0s', '0.0s')); pg.context.close()

def t_layout(env):
    for w, h in ((320, 640), (375, 812), (768, 900), (1280, 900)):
        pg = env.page(None, w, h); bad = []
        for v in VIEWS:
            go(pg, v)
            if not pg.evaluate('document.documentElement.scrollWidth <= window.innerWidth'): bad.append('empty ' + v)
        populate(pg, with_crypto=True)
        for v in VIEWS:
            go(pg, v); pg.evaluate("document.querySelectorAll('details').forEach(d => d.open = true)")
            if not pg.evaluate('document.documentElement.scrollWidth <= window.innerWidth'): bad.append('populated ' + v)
        ok(f'LAYOUT no horizontal overflow at {w}px on any of the 8 pages (empty and fully populated)', not bad, bad); pg.context.close()
    for name, w, h in (('desktop', 1280, 900), ('mobile', 375, 812)):
        pg = env.page(None, w, h); nav = lambda: pg.evaluate("document.querySelector('.nav').getBoundingClientRect().bottom")
        go(pg, 'message'); pg.click('#msgExamples >> text="Bank SMS scam"'); until(lambda: False, 1.3); ok(f'LAYOUT {name}: message result is not hidden under the sticky header', pg.evaluate("document.querySelector('#msgResult .tag').getBoundingClientRect().top") >= nav() - 1)
        go(pg, 'link'); pg.click('#urlExamples >> text="Fake brand"'); until(lambda: False, 1.3); ok(f'LAYOUT {name}: link result is not hidden under the sticky header', pg.evaluate("document.querySelector('#urlResult .tag').getBoundingClientRect().top") >= nav() - 1)
        go(pg, 'wifi'); fill_wifi(pg); until(lambda: False, 1.3); ok(f'LAYOUT {name}: Wi-Fi result is not hidden under the sticky header', pg.evaluate("document.querySelector('#result .badge').getBoundingClientRect().top") >= nav() - 1)
        pg.context.close()

def t_network(env):
    ext = sorted({u for u in env.requests if not u.startswith(env.base)})
    ok('NETWORK every request in the whole run went to the local server (no third parties, no uploads)', not ext, ext[:5])
    ok('CONSOLE no errors, warnings or CSP violations during the whole run', not env.console, env.console[:5])
    ok('DIALOGS no alert/confirm/prompt fired (no injected script ran)', not env.dialogs, env.dialogs)

def shots(env, outdir):
    out = pathlib.Path(outdir); out.mkdir(parents=True, exist_ok=True)
    for name, w, h in (('desktop', 1280, 900), ('mobile', 375, 812)):
        pg = env.page(None, w, h)
        def snap(n, sel=None, dy=-70):
            pg.wait_for_timeout(250)
            if sel: pg.evaluate(f"document.querySelector('{sel}').scrollIntoView()"); pg.evaluate(f"window.scrollBy(0,{dy})")
            pg.wait_for_timeout(250); pg.screenshot(path=str(out / f'{n}-{name}.png'))
        snap('01-home'); snap('02-home-start', '#start', -80)
        go(pg, 'message'); pg.click('#msgExamples >> text="Bank SMS scam"'); snap('03-message-scam', '#msgResult', -110)
        go(pg, 'link'); pg.click('#urlExamples >> text="Fake brand"'); snap('04-link-warning', '#urlResult', -110)
        go(pg, 'password'); pg.fill('#pwin', 'Summer2024!'); pg.press('#pwin', 'Tab'); snap('05-password', '#pwin', -150)
        go(pg, 'wifi'); fill_wifi(pg); snap('06-wifi-result', '#result', -110)
        go(pg, 'lab'); pg.click('#aesEnc'); until(lambda: not pg.is_disabled('#aesDec')); pg.click('#aesTamper'); pg.wait_for_timeout(1200); snap('07-crypto-lab', '#aesCard', -90)
        go(pg, 'wifi'); fill_wifi(pg, ssid='Net', protocol='unknown', captive='unknown')
        go(pg, 'overview'); snap('08-overview-results', '#ovHead', -90); snap('09-overview-plan', '#ovPlan', -90)
        go(pg, 'learn'); snap('10-learn')
        pg.context.close()
    print('screenshots written to', out)

def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--screenshots'); ap.add_argument('--json'); ap.add_argument('--only', help='comma-separated groups, e.g. nav,overview'); a = ap.parse_args()
    port = free_port(); srv = subprocess.Popen([sys.executable, str(ROOT / 'serve.py'), '--port', str(port), '--no-browser'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        for _ in range(50):
            try: socket.create_connection(('127.0.0.1', port), 0.2).close(); break
            except OSError: time.sleep(0.1)
        with sync_playwright() as p:
            browser = p.chromium.launch(); env = Env(browser, f'http://127.0.0.1:{port}')
            print('Chromium', browser.version, '| serve.py on port', port, '\n')
            if a.screenshots: shots(env, a.screenshots)
            else:
                groups = (t_load, t_link, t_message, t_scenarios, t_password, t_wifi, t_crypto, t_nav, t_boot, t_rules, t_overview, t_demo, t_security, t_a11y, t_layout, t_network)
                only = set(a.only.split(',')) if a.only else None
                for fn in groups:
                    if only is None or fn.__name__[2:] in only: fn(env)
            version = browser.version; browser.close()
    finally: srv.terminate()
    if a.screenshots: return 0
    failed = [r for r in RESULTS if not r['passed']]
    print(f'\n{len(RESULTS) - len(failed)} of {len(RESULTS)} browser checks passed on Chromium {version}')
    if a.json: pathlib.Path(a.json).write_text(json.dumps({'browser': 'chromium ' + version, 'results': RESULTS}, indent=1))
    return 1 if failed else 0

if __name__ == '__main__': sys.exit(main())
