const puppeteer = require('puppeteer');
const dotenv = require('dotenv')
dotenv.config({path : '../../.env'})
const fs = require('fs');
const os = require('os');
const path = require('path')


const apiKey = process.env.BROWSERCLOUD_API_KEY;


const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));


async function cancelAppointment(date, time, name) {
    console.log("Cancelling now...")
    const browserWSEndpoint = `wss://chrome-v2.browsercloud.io?token=${apiKey}`;
    let browser;
    try {
        browser = await puppeteer.launch({ headless: true });
        const page = await browser.newPage();

        // Initial login to Squarespace
        await page.goto("https://secure.acuityscheduling.com/login.php?redirect=1#/", {
            waitUntil: 'domcontentloaded'
        });

        await page.type("input[type='email']", process.env.ACUITY_EMAIL);
        await page.click("input[name='login']");
        await page.waitForNavigation({ waitUntil: 'domcontentloaded' });

        await page.type("input[type='email']", process.env.ACUITY_EMAIL);
        await page.type("input[type='password']", process.env.ACUITY_PASSWORD);

        await Promise.all([
            page.click("button[data-test='login-button']"),
            page.waitForNavigation({ waitUntil: 'networkidle0' })
        ]);

        // Ensure the login was successful and wait for the iframe to be present
        await page.waitForSelector('iframe[data-test="scheduling"]', { timeout: 60000 });

        // Access the iframe
        const frameHandle = await page.$('iframe[data-test="scheduling"]');
        const frame = await frameHandle.contentFrame();

        // Wait for and click the calendar button
        await frame.waitForSelector('a.css-cgffdh[aria-label="View Calendar"]', { timeout: 60000 });
        await frame.evaluate(() => {
            const button = document.querySelector('a.css-cgffdh[aria-label="View Calendar"]');
            button.scrollIntoView();
            button.click();
        });
        await delay(2000)

    } catch (error) {
        return "Unable to book the appointment"
    } finally {
        await delay(2000)
        await browser.close()
    }
}
cancelAppointment("05/31/2024", "09:00", "Lebron James")
module.exports = {cancelAppointment}