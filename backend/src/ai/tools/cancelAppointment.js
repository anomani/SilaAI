const puppeteer = require('puppeteer');
const dotenv = require('dotenv')
dotenv.config({path : '../../../.env'})
const fs = require('fs');
const os = require('os');
const path = require('path')


const apiKey = process.env.BROWSERCLOUD_API_KEY;


const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));


async function cancelAppointment(name) {
    console.log("Cancelling now...")
    const browserWSEndpoint = `wss://chrome-v2.browsercloud.io?token=${apiKey}`;
    let browser;
    try {
        // Connect to BrowserCloud
        browser = await puppeteer.launch({ headless: false });
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

        // Wait for and click the "menu" button inside the iframe
        await frame.waitForSelector('button[data-testid="mobile-nav-button"]', { timeout: 60000 });
        await frame.evaluate(() => {
            const button = document.querySelector('button[data-testid="mobile-nav-button"]');
            button.scrollIntoView();
        });
        await frame.click('button[data-testid="mobile-nav-button"]');

        // Wait for and click the "clients" button inside the iframe
        await frame.waitForSelector('button[data-testid="left-nav-item"]', { timeout: 60000 });
        await frame.evaluate(() => {
            const button = document.querySelector('button[data-testid="left-nav-item"]');
            button.scrollIntoView();
        });
        await frame.click('button[data-testid="left-nav-item"]');


        //Click on client list
        await frame.waitForSelector('span.themed-nav-text[data-testid="render-nav-text"]', { timeout: 60000 });
        await frame.evaluate((name) => {
            const buttons = Array.from(document.querySelectorAll('span.themed-nav-text[data-testid="render-nav-text"]'));
            const button = buttons.find(btn => btn.textContent.includes(name));
            if (button) {
                button.scrollIntoView();
                button.click();
            }
        }, "Client List");

        await delay(2000)
        //Type in the name in the search bar
        await frame.waitForSelector('input.css-17cryzc', { timeout: 60000 });
        await frame.type('input.css-17cryzc', name, { delay: 100 });
        await delay(2000)

        // Wait for and click the button with aria-haspopup and data-testid
        await frame.waitForSelector('button[data-testid="action-list-desktop"][aria-haspopup="true"]', { timeout: 60000 });
        await frame.click('button[data-testid="action-list-desktop"][aria-haspopup="true"]');

        // Wait for and click the "Edit" span element
        await frame.waitForSelector('span[data-testid="edit-view-action-desktop"]', { timeout: 60000 });
        await frame.evaluate(() => {
            const editButton = document.querySelector('span[data-testid="edit-view-action-desktop"]');
            editButton.scrollIntoView();
            editButton.click();
        });

        await delay(1000)

        // Wait for and click the checkbox input element with the specified value
        await frame.waitForSelector('input.appt-checkbox', { timeout: 60000 });
        await frame.click('input.appt-checkbox');

        await delay(1000)

        // Wait for and click the "Cancel Selected" link
        await frame.waitForSelector('a#cancel-appts-btn', { timeout: 60000 });
        await frame.evaluate(() => {
            const cancelButton = document.querySelector('a#cancel-appts-btn');
            cancelButton.scrollIntoView();
            cancelButton.click();
        });


        // Wait for and click the "Yes, cancel appointments" input element
        await frame.waitForSelector('input.btn.btn-primary.btn-block[value="Yes, cancel appointments"]', { timeout: 60000 });
        await frame.click('input.btn.btn-primary.btn-block[value="Yes, cancel appointments"]');

        return "Succefully cancelled the appointment"
    } catch (error) {
        return "Unable to cancel the appointment"
    } finally {
        await delay(2000)
        await browser.close()
    }
}


module.exports = {cancelAppointment}