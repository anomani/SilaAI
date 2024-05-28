const puppeteer = require('puppeteer');
const dotenv = require('dotenv')
dotenv.config({path : '../../.env'})
const fs = require('fs');
const os = require('os');
const path = require('path')


const apiKey = process.env.BROWSERCLOUD_API_KEY;


const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));


async function bookAppointment(date, time, fname, lname, phone, email) {
    console.log("Booking now...")
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

        //Click on add new 
        await frame.waitForSelector('button[data-testid="toolbar-add-new-button"]', { timeout: 60000 });
        await frame.evaluate(() => {
            const addButton = document.querySelector('button[data-testid="toolbar-add-new-button"]');
            addButton.scrollIntoView();
            addButton.click();
        });
        await delay(2000);

        //Click on appointment
        await frame.waitForSelector('button[data-testid="toolbar-add-new-appointment"]', { timeout: 60000 });
        await frame.evaluate(() => {
            const addAppointmentButton = document.querySelector('button[data-testid="toolbar-add-new-appointment"]');
            addAppointmentButton.scrollIntoView();
            addAppointmentButton.click();
        });
        await delay(2000);

        //Click on custom 
        await frame.waitForSelector('button[data-testid="custom-time-button"]', { timeout: 60000 });
        await frame.evaluate(() => {
            const customTimeButton = document.querySelector('button[data-testid="custom-time-button"]');
            customTimeButton.scrollIntoView();
            customTimeButton.click();
        });
        await delay(2000);

        // Type the date
        await frame.waitForSelector('input[data-testid="date-input"]', { timeout: 60000 });
        await frame.type('input[data-testid="date-input"]', date);
        await delay(1000);

        // Type the time
        await frame.waitForSelector('input[data-testid="time-input"]', { timeout: 60000 });
        await frame.type('input[data-testid="time-input"]', time);
        await delay(1000);

        // Type the fname
        await frame.waitForSelector('input[data-testid="first-name-input"]', { timeout: 60000 });
        await frame.type('input[data-testid="first-name-input"]', fname);
        await delay(1000);

        //Type the last name
        await frame.waitForSelector('input[data-testid="last-name-input"]', { timeout: 60000 });
        await frame.type('input[data-testid="last-name-input"]', lname);
        await delay(1000);

        // Type the phone number
        await frame.waitForSelector('input[data-testid="phone-input"]', { timeout: 60000 });
        await frame.type('input[data-testid="phone-input"]', phone);
        await delay(1000);

        // Type the email
        await frame.waitForSelector('input[data-testid="email-input"]', { timeout: 60000 });
        await frame.type('input[data-testid="email-input"]', email);
        await delay(1000);

        // Click on submit appointment button
        await frame.waitForSelector('input[data-testid="submit-appointment-button"]', { timeout: 60000 });
        await frame.evaluate(() => {
            const submitButton = document.querySelector('input[data-testid="submit-appointment-button"]');
            submitButton.scrollIntoView();
            submitButton.click();
        });
        await delay(2000);

        return "Appointment booked for ${date} at ${time}"
    } catch (error) {
        return "Unable to book the appointment"
    } finally {
        await delay(2000)
        await browser.close()
    }
}

module.exports = {bookAppointment}