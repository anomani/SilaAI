const puppeteer = require('puppeteer');
const dotenv = require('dotenv')
dotenv.config({path : '../../.env'})
const fs = require('fs');
const os = require('os');
const path = require('path')
const moment = require('moment'); // Add moment library
const {createAppointment} = require('../model/appointment')
const {getClientByPhoneNumber} = require('../model/clients')
const apiKey = process.env.BROWSERCLOUD_API_KEY;

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const SELECTOR_TIMEOUT = 30000; 


async function getAvailability() {
    const browserWSEndpoint = `wss://chrome-v2.browsercloud.io?token=${apiKey}`;
    let browser;
    try {
        // Connect to BrowserCloud
        browser = await puppeteer.launch({ headless: false });
        const page = await browser.newPage();

        // Initial login to Squarespace
        await page.goto("https://secure.acuityscheduling.com/login.php?redirect=1", {
            waitUntil: 'domcontentloaded'
        });

        await page.type("input[type='email']", process.env.ACUITY_EMAIL);
        await page.click("input[name='login']");

        // Wait for the password input field to load
        await page.waitForSelector("input[data-testid='password-input']", { visible: true, timeout: SELECTOR_TIMEOUT });
        await page.type("input[data-testid='password-input']", process.env.ACUITY_PASSWORD);
        
        // Click the login button
        await page.click("input[data-testid='next-button']");
        console.log("Login button clicked");

        // Press the escape key to close any open modal or dialog
        await delay(2000)
        await page.keyboard.press('Escape');
        console.log("Escape key pressed");

        await page.waitForSelector(".timeslot-column-0.timeslot.appointment.cal_1057492", { visible: true, timeout: SELECTOR_TIMEOUT });
        await page.click(".timeslot-column-0.timeslot.appointment.cal_1057492");
        console.log("Appointment clicked");
        
        // Ensure the login was successful and wait for the iframe to be present
        // await page.waitForSelector('iframe[data-test="scheduling"]', { timeout: 60000 });

        // // Access the iframe
        // const frameHandle = await page.$('iframe[data-test="scheduling"]');
        // const frame = await frameHandle.contentFrame();

        // await frame.waitForSelector('.appointment-inner.tall-appointment, .timeslot-column-0.cal_10192608.timeslot.unavailable', { timeout: 60000 });
        // // fs.writeFileSync('frameContent.txt', await frame.content());
        
        // // Extract details of the specified elements
        // const calendar = await frame.evaluate(() => {
        //     const appointments = Array.from(document.querySelectorAll('.appointment-inner, .appointmentListing-container .listingTitle')).map(box => {
        //         const dayElement = box.closest('.appointmentListing-container').querySelector('.listingTitle');
        //         const day = dayElement ? dayElement.innerText : 'Unknown Day';
        //         const appointmentText = box.innerText;
        //         return { day, appointmentText };
        //     });
        //     const blockedTimes = Array.from(document.querySelectorAll('[class*="timeslot"][class*="unavailable"]')).map(blocked => {
        //         const blockedTimeHTML = blocked.innerHTML;
        //         return blockedTimeHTML;
        //     });
        //     return { appointments, blockedTimes };
        // });

        // const resultString = `Appointments:\n${calendar.appointments.map(a => `${a.day}: ${a.appointmentText}`).join('\n')}\nBlocked Times:\n${calendar.blockedTimes.join('\n')}`;
        // console.log(resultString);
        // return resultString;
    } catch (error) {
        console.error("Error:", error);
    } finally {
        // await delay(2000)
        // await browser.close()
    }
}

function getCurrentDate() {
    const date = new Date()
    return date.toDateString()
}

async function main() {
    await getAvailability()
}

main()

module.exports = {getAvailability, getCurrentDate}