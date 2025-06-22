// export-cookies.js
import fs from 'fs-extra';
import { connect } from "puppeteer-real-browser";

(async () => {

  const { browser, page } = await connect({
    headless: false,

    args: [],

    customConfig: {},

    turnstile: true,

    connectOption: {},

    disableXvfb: false,
    ignoreAllFlags: false,
    // proxy:{
    //     host:'<proxy-host>',
    //     port:'<proxy-port>',
    //     username:'<proxy-username>',
    //     password:'<proxy-password>'
    // }
  });
  await page.goto("https://booksy.com/pro/en-us/login");
  await page.type('[data-testid="email"],input[type="email"]', 'yeboi1234321234@gmail.com');
  await page.type('[data-testid="password"],input[type="password"]', 'Maks.9611');
  await page.click('button#uid-44-input,button[type="submit"]');

  await page.waitForNavigation({ waitUntil: 'networkidle2' });

  await page.goto('https://booksy.com/pro/en-us/1517102/stats-and-reports/appointments/appointments-list');

  console.log('\n🔑  Log in manually.  When you reach the dashboard, hit ENTER…\n');
  await new Promise(r => process.stdin.once('data', r));

  const cookies = await page.cookies();
  await fs.writeJSON('booksy-cookies.json', cookies, { spaces: 2 });
  console.log(`🍪  Saved ${cookies.length} cookies to booksy-cookies.json`);

  await browser.close();
})();
