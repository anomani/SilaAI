// daily-scrape.js
import fs from 'fs-extra';
import { connect } from 'puppeteer-real-browser';

/*  1.  load the cookies you saved earlier --------------------------------- */
const cookies = JSON.parse(await fs.readFile('booksy-cookies.json', 'utf8'));

(async () => {
  /*  2.  attach to the same hosted / real-browser instance ----------------- */
  const { browser, page } = await connect({
    headless: false,              // headless OK now – we’re injecting cookies
    args: [],                    //  … keep any flags / proxy here
    customConfig: {},
    turnstile: true,
    connectOption: {},
    disableXvfb: false,
    ignoreAllFlags: false,
    // proxy: { … }               // (unchanged from your export script)
  });

  /*  3.  hit ANY Booksy origin first so setCookie knows the domain ---------- */
  await page.goto('https://booksy.com', { waitUntil: 'domcontentloaded' });

  /*  4.  restore the cookies and refresh the context ----------------------- */
//   await page.setCookie(...cookies);

  /*  5.  jump straight to the calendar (or whatever page you need) --------- */
  await page.goto('https://booksy.com/pro/en-us/1517102/calendar', {
    waitUntil: 'networkidle2',
  });


  console.log('📅  Calendar opened for:', currentDate);

  /*  7.  (optional) grab a screenshot or HTML for debugging ---------------- */
  // await page.screenshot({ path: `calendar-${Date.now()}.png` });

})();
