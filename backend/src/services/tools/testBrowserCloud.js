const puppeteer = require('puppeteer');
const dotenv = require('dotenv');
dotenv.config({ path: '../../../.env' });
const fs = require('fs');
const os = require('os');
const path = require('path');

const apiKey = process.env.BROWSERCLOUD_API_KEY;

async function test() {
    const browserWSEndpoint = `wss://chrome-v2.browsercloud.io?token=${apiKey}`;
    let browser; // Define browser here to be accessible in finally block
    try {
        console.log(apiKey + "hello");
        browser = await puppeteer.connect({
            browserWSEndpoint: browserWSEndpoint
        });
        console.log("Connected to browser");

        const page = await browser.newPage();

        // Initial login to Squarespace
        await page.goto("https://www.wikipedia.org/", {
            waitUntil: 'domcontentloaded'
        });

        console.log(await page.content());
    } catch (e) {
        console.log(e);
    } finally {
        if (browser) { // Check if browser is defined before closing it
            await browser.close();
        }
    }
}

test();
