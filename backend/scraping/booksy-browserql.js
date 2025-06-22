/* ------------------------------------------------------------------
   booksy-login-bql.js
   --------------------------------------------------------------- */
   import dotenv from 'dotenv';
   import { fileURLToPath } from 'url';
   import { dirname, join } from 'path';
   import fs from 'node:fs/promises';
   
   const __filename = fileURLToPath(import.meta.url);
   const __dirname = dirname(__filename);
   
   dotenv.config({ path: join(__dirname, '../.env') });
   
   /* ------------ env checks ---------------- */
   const { BOOKSY_EMAIL, BOOKSY_PASSWORD, BROWSERLESS_TOKEN } = process.env;
   if (!BOOKSY_EMAIL || !BOOKSY_PASSWORD || !BROWSERLESS_TOKEN) {
     console.error('✖  Need BOOKSY_EMAIL, BOOKSY_PASSWORD, BROWSERLESS_TOKEN in .env');
     process.exit(1);
   }
   
   /* ------------ Browserless endpoint ---------------- */
   const endpoint =
     `https://production-sfo.browserless.io/chrome/bql?token=${BROWSERLESS_TOKEN}` +
     `&proxy=residential&proxyCountry=us&stealth=ja3&timeout=60000`;
   
   /* ------------ constants ---------------- */
   const ts           = Date.now();
   const CALENDAR_URL = 'https://booksy.com/pro/en-us/1517102/calendar';
   
   /* ------------ GraphQL mutation ------------ */
const query = /* GraphQL */ `
mutation BooksyLogin($email:String!,$password:String!) {
  userAgent(userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/84.0.4147.125 Safari/537.36") {
    userAgent
    time
  }
  gotoLogin: goto(
    url: "https://booksy.com/pro/en-us/login",
    waitUntil: domContentLoaded
  ){ status }

  # viewport screenshot before typing
  before: screenshot(fullPage:false){ base64 }

  typeEmail: type(
    selector: """[data-testid="email"],input[type="email"]""",
    text: $email,
    delay: 60
  ){ time }

  typePass: type(
    selector: """[data-testid="password"],input[type="password"]""",
    text: $password,
    delay: 60
  ){ time }

  clickLogin: click(
    selector: "button#uid-44-input"
  ){ time }
  gotoLogin: goto(
    url: "https://booksy.com/pro/en-us/1517102/calendar?date=today&view=day&staffers=working",
    waitUntil: domContentLoaded
  ){ status }

  dump: html{ html }

  finalSnap: screenshot(fullPage: false) { base64 }

}
`;

/* -------- you can delete the old variables block -------- */
const variables = { email: BOOKSY_EMAIL, password: BOOKSY_PASSWORD };

/* -------- send request (same as before) -------- */
const res = await fetch(endpoint, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ query, variables })
});
const isJSON = res.headers.get('content-type')?.includes('application/json');
if (!isJSON) {
  console.error('Browserless replied with non-JSON:\n', await res.text());
  process.exit(1);
}
const { data, errors } = await res.json();
if (errors?.length) {
  console.error('GraphQL errors:\n', JSON.stringify(errors, null, 2));
  process.exit(1);
}
await fs.writeFile(
  `after-login-${ts}.html`,
  data.dump.html,
  'utf8'
);
console.log('📝  Saved after-login HTML');

// 2️⃣  Save the screenshot taken right after hitting "Log in"
await fs.writeFile(
  `login-${ts}.png`,
  Buffer.from(data.before.base64, 'base64')   // <-- ScreenshotResponse.base64
);
console.log('💾  Saved login screenshot');

// 3️⃣  (Optional) keep the final screenshot too
await fs.writeFile(
  `final-${ts}.png`,
  Buffer.from(data.finalSnap.base64, 'base64')
);

console.log('✔︎  Script finished');
