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
  `&proxy=residential&blockConsentModals=true`;
   
   /* ------------ constants ---------------- */
   const ts           = Date.now();
   const CALENDAR_URL = 'https://booksy.com/pro/en-us/1517102/calendar';
   
   /* ------------ GraphQL mutation ------------ */
const query = /* GraphQL */ `
mutation LoginBooksy {
 goto(
 url: "https://booksy.com/pro/en-us/login"
 waitUntil: firstContentfulPaint
 ) {
 status
 }

 typeEmail: type(
 selector: "input[data-testid='email']"
 text: "${BOOKSY_EMAIL}"
 ) {
 time
 }

 typePassword: type(
 selector: "input[data-testid='password']"
 text: "${BOOKSY_PASSWORD}"
 ) {
 time
 }

 clickLogin: click(
 selector: "#uid-44-input"
 visible: true
 ) {
 time
 }
 waitForNavigation(waitUntil:load){
 time
 }
 text{
 text
 }
}
`;

/* -------- variables (empty since email/password are now hardcoded in query) -------- */
const variables = {};

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
// Save the page text content
await fs.writeFile(
  `login-result-${ts}.txt`,
  data.text.text,
  'utf8'
);
console.log('📝  Saved login result text');

console.log('✔︎  Script finished');
