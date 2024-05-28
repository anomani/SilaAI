const puppeteer = require('puppeteer');
const dotenv = require('dotenv')
dotenv.config({path : '../../.env'})
const fs = require('fs');
const os = require('os');
const path = require('path')


const apiKey = process.env.BROWSERCLOUD_API_KEY;


const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));


async function getAvailability(day) {
    console.log("One moment please...")
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

        await frame.waitForSelector('.appointment-inner.tall-appointment, .timeslot-column-0.cal_10192608.timeslot.unavailable', { timeout: 60000 });
        // fs.writeFileSync('frameContent.txt', await frame.content());
        
        // Extract details of the specified elements
        const calendar = await frame.evaluate(() => {
            const appointments = Array.from(document.querySelectorAll('.appointment-inner, .appointmentListing-container .listingTitle')).map(box => {
                const dayElement = box.closest('.appointmentListing-container').querySelector('.listingTitle');
                const day = dayElement ? dayElement.innerText : 'Unknown Day';
                const appointmentText = box.innerText;
                return { day, appointmentText };
            });
            const blockedTimes = Array.from(document.querySelectorAll('[class*="timeslot"][class*="unavailable"]')).map(blocked => {
                const blockedTimeHTML = blocked.innerHTML;
                return blockedTimeHTML;
            });
            return { appointments, blockedTimes };
        });

        const resultString = `Appointments:\n${calendar.appointments.map(a => `${a.day}: ${a.appointmentText}`).join('\n')}\nBlocked Times:\n${calendar.blockedTimes.join('\n')}`;
        console.log(resultString)
        return resultString;
    } catch (error) {
        console.error("Error:", error);
    } finally {
        await delay(2000)
        await browser.close()
    }
}

module.exports = {getAvailability}
