const puppeteer = require('puppeteer');
const dotenv = require('dotenv')
dotenv.config({path : '../../.env'})
const fs = require('fs');
const os = require('os');
const path = require('path')

const apiKey = process.env.BROWSERCLOUD_API_KEY;

async function getClients() {
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

        await page.type("input[type='email']", "anomani@seas.upenn.edu");
        await page.click("input[name='login']");
        await page.waitForNavigation({ waitUntil: 'domcontentloaded' });

        await page.type("input[type='email']", "anomani@seas.upenn.edu");
        await page.type("input[type='password']", "Maks.9611");

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

        // Wait for and click the "import/export" link inside the iframe
        await frame.waitForSelector('a[data-testid="left-nav-item"][href="/config/scheduling-service/clients.php?action=importexport"]', { timeout: 60000 });
        await frame.evaluate(() => {
            const link = document.querySelector('a[data-testid="left-nav-item"][href="/config/scheduling-service/clients.php?action=importexport"]');
            link.scrollIntoView();
        });
        await frame.click('a[data-testid="left-nav-item"][href="/config/scheduling-service/clients.php?action=importexport"]');

        // Wait for and click the "Export Client List" button inside the iframe
        await frame.waitForSelector('a.btn.btn-inverse.btn-bordered.btn-md.btn-client-export.margin-right.margin-bottom', { timeout: 60000 });
        await frame.evaluate(() => {
            const button = document.querySelector('a.btn.btn-inverse.btn-bordered.btn-md.btn-client-export.margin-right.margin-bottom');
            button.scrollIntoView();
        });
        await frame.click('a.btn.btn-inverse.btn-bordered.btn-md.btn-client-export.margin-right.margin-bottom');

        // Wait for and click the "Export Clients" button inside the iframe
        await frame.waitForSelector('input[type="submit"].btn.btn-default[value="Export Clients"]', { timeout: 60000 });
        await frame.evaluate(() => {
            const button = document.querySelector('input[type="submit"].btn.btn-default[value="Export Clients"]');
            button.scrollIntoView();
        });
        await frame.click('input[type="submit"].btn.btn-default[value="Export Clients"]');
    } catch (error) {
        console.error("Error:", error);
    } finally {
        browser.close()
    }
}


//Gets the CSV from my downloads folder and saves it locally in the program
async function getCSV() {
    const downloadsDir = path.resolve(os.homedir(), 'Downloads');
    const targetDir = path.resolve(__dirname, '../../data');
    const filename = 'list.csv';
    const sourceFile = path.join(downloadsDir, filename);
    const destFile = path.join(targetDir, filename);

    if (fs.existsSync(sourceFile)) {
        fs.renameSync(sourceFile, destFile);
        console.log(`File moved to ${destFile}`);
    } else {
        console.log('File not found');
    }
}

module.exports = {getClients, getCSV};