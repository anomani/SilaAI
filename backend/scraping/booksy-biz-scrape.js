// booksy-login.js — full verification & error-logging edition
//--------------------------------------------------------------
const puppeteer       = require('puppeteer-extra');
const StealthPlugin   = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

require('dotenv').config({ path: __dirname + '/../.env' });

/*──── helper: interact ───────────────────────────────────────*/
async function interact(page, sels, act, val = null, timeout = 8000) {
  for (const s of sels) {
    try {
      await page.waitForSelector(s, { visible: true, timeout });
      if (act === 'click') {
        await page.click(s);
        console.log(`➡️  Clicked: ${s}`);
      } else if (act === 'type') {
        await page.type(s, val, { delay: 70 + Math.random() * 60 });
      }
      return true;
    } catch { /* try next selector */ }
  }
  return false;
}

/*──── main ───────────────────────────────────────────────────*/
async function login() {
  const { BOOKSY_EMAIL, BOOKSY_PASSWORD, BROWSERLESS_TOKEN } = process.env;
  if (!BOOKSY_EMAIL || !BOOKSY_PASSWORD) return console.error('✖  Missing creds');
  if (!BROWSERLESS_TOKEN)                return console.error('✖  Missing Browserless token');

  const useProxy     = process.env.USE_PROXY === 'true';
  const proxyCountry = process.env.PROXY_COUNTRY || 'us';
  let ws = `wss://production-sfo.browserless.io?token=${BROWSERLESS_TOKEN}&stealth=ja3`;
  if (useProxy) ws += `&proxy=residential&proxyCountry=${proxyCountry}`;

  let browser, page;
  try {
    console.log('⏳  Connecting …');
    browser = await puppeteer.connect({ browserWSEndpoint: ws });
    page = await browser.newPage();

    /* basic fingerprint */
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
      '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );
    await page.setViewport({ width: 1280, height: 820 });

    /* network logger for the login XHR */
    page.on('response', async resp => {
      const url = resp.url();
      if (/sessions|login/i.test(url)) {
        console.log(`📡  Login XHR → ${resp.status()} ${url}`);
        if (resp.status() >= 400) {
          try { console.log('     ↳ body:', await resp.text()); } catch {}
        }
      }
    });

    /* track detached frames */
    let captchaDetachedEarly = false;
    page.on('framedetached', frame => {
      if (frame.url().includes('hcaptcha')) captchaDetachedEarly = true;
    });

    /* 1. navigate */
    const loginURL = 'https://booksy.com/pro/en-us/login';
    console.log('➡️  Navigating:', loginURL);
    await page.goto(loginURL, { waitUntil: 'networkidle2', timeout: 60000 });

    /* wait for UI */
    await page.waitForFunction(() =>
      !!document.querySelector('[data-testid="email"],input[type="email"]') ||
      [...document.querySelectorAll('iframe')].some(f => /id\.booksy\./.test(f.src)),
      { timeout: 30000 });
    console.log('✔️  Login UI rendered');

    /* iframe context if needed */
    const loginFrame = page.frames().find(f => /id\.booksy\./.test(f.url()));
    const ctx = loginFrame || page;

    /* 2. fill form */
    await interact(ctx, ['[data-testid="email"]','input[type="email"]'], 'type', BOOKSY_EMAIL);
    await interact(ctx, ['[data-testid="password"]','input[type="password"]'], 'type', BOOKSY_PASSWORD);
    await interact(ctx, ['button#uid-44-input','button[type="submit"]'], 'click');

    /* 3. captcha handling */
    const cdp = await page.createCDPSession();
    try {
      const iframeHandle = await page.waitForSelector('iframe[src*="hcaptcha"]', { timeout: 5000 });
      if (iframeHandle) {
        console.log('🧩  hCaptcha iframe present – solving');
        const { solved, error } = await cdp.send('Browserless.solveCaptcha', {
          type: 'hcaptcha',
          timeout: 120000,
        });
        console.log(solved ? '✅  Captcha token injected' : `⚠️  Solver replied: ${error}`);

        /* ensure frame still exists, then click Verify */
        const frame = await iframeHandle.contentFrame();
        if (frame) {
          const verifyClicked = await interact(
            frame,
            ['button[type="submit"]', 'button:has-text("Verify")'],
            'click',
            null,
            5000
          );
          if (!verifyClicked) {
            try { await frame.evaluate(() => window.hcaptcha && window.hcaptcha.execute()); }
            catch {}
            console.log('↳ Executed hcaptcha.execute() programmatically');
          }
        } else {
          console.log('↳ Captcha frame detached before Verify click.');
        }
      } else {
        console.log('ℹ️  No hCaptcha iframe detected');
      }
    } catch (e) {
      console.log('ℹ️  Captcha block skipped:', e.message);
    }

    /* Delay if frame detached too early */
    if (captchaDetachedEarly) await new Promise(r => setTimeout(r, 1000));

    /* 4. wait for potential redirect */
    await (page.waitForTimeout ? page.waitForTimeout(6000)
                               : new Promise(r => setTimeout(r, 6000)));

    /* 5. check error messages */
    const domError = await page.$eval(
      '.error-message,[data-testid="error"],.alert-danger',
      el => el && el.textContent.trim(),
    ).catch(() => '');
    if (domError) console.log('🚫  Form error:', domError);

    /* 6. final URL check */
    const good = /\/dashboard|\/calendar|\/home|\/business\/overview/.test(page.url());
    console.log(good ? '🎉  Logged in →' : '🧐  Still on login page →', page.url());

  } catch (err) {
    console.error('❌  Fatal:', err);
  } finally {
    /* always screenshot */
    if (page) {
      const p = `final-${Date.now()}.png`;
      try { await page.screenshot({ path: p, fullPage: true }); }
      catch {}
      console.log('🖼  Final screenshot saved →', p);
    }
    if (browser) await browser.close();
  }
}

/* run */
login();
