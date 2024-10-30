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


const SELECTOR_TIMEOUT = 5000; 

async function getClients() {
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

        await page.waitForSelector("button[data-testid='mobile-nav-button']", { visible: true, timeout: SELECTOR_TIMEOUT });
        await page.click("button[data-testid='mobile-nav-button']");
        console.log("Mobile nav button clicked");

        await page.goto("https://secure.acuityscheduling.com/admin/clients", {
            waitUntil: 'domcontentloaded'
        });
        await delay(2000)

        
        let previousHeight;
        while (true) {
            previousHeight = await page.evaluate('document.body.scrollHeight');
            await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
            await delay(2000); // Wait for new clients to load
            const newHeight = await page.evaluate('document.body.scrollHeight');
            if (newHeight === previousHeight) break;
        }
        
        const clientLinksCount = await page.$$eval("td.lastName.css-1b3r7q", links => links.length);
        console.log(clientLinksCount)
        for (let i = 1214; i < clientLinksCount; i++) {
            console.log("Index: ", i)
            try {
                
                await page.waitForSelector("td.lastName.css-1b3r7q", { visible: true, timeout: SELECTOR_TIMEOUT });
                // Click on the client link by index
                await page.evaluate(index => {
                    document.querySelectorAll("td.lastName.css-1b3r7q")[index].click();
                }, i);

                await page.waitForSelector(".start-time", { timeout: SELECTOR_TIMEOUT });

                const clientName = await page.$eval(".field-rendered.edit-client", el => el.innerText);
                const clientNumber = await page.$eval("a.real-link[data-testid='added-client-phone']", el => el.innerText);

                await page.waitForSelector(".appointment-item", { timeout: SELECTOR_TIMEOUT });
                const appointments = await page.$$(".appointment-item");

                for (const appointmentElement of appointments) {
                    const startTime = await appointmentElement.$eval(".start-time", el => el.innerText);
                    const endTime = await appointmentElement.$eval(".end-time", el => el.innerText);
                    const dateOfAppointment = await appointmentElement.$eval("a[data-testid='docket-appointment-detail-link']", el => el.innerText);
                    const typeOfAppointment = await appointmentElement.$eval(".appointment-type-name", el => el.innerText);
                    const cleanedTypeOfAppointment = typeOfAppointment.replace(/\\n\\t/g, '');
                    // Convert times to HH:MM in military time
                    const startTimeMilitary = moment(startTime, ["h:mm A"]).format("HH:mm");
                    const endTimeMilitary = moment(endTime, ["h:mm A"]).format("HH:mm");
                    // Convert date to YYYY-MM-DD
                    const dateOfAppointmentFormatted = moment(dateOfAppointment, "dddd, MMMM D, YYYY").format("YYYY-MM-DD");
                    await page.click("a[data-testid='docket-appointment-detail-link']");

                    let paymentPriceNumeric;
                    try {
                        await page.waitForSelector("span.payment-price[data-testid='payment-price-text']", { visible: true, timeout: SELECTOR_TIMEOUT });
                        const paymentPrice = await page.$eval("span.payment-price[data-testid='payment-price-text']", el => el.innerText);
                        paymentPriceNumeric = paymentPrice.replace(/[^0-9.]/g, '');
                        await page.click("a.detail-nav-link.btn.btn-inverse.hidden-print.detail-nav-link[data-testid='appt-details-close-btn']");
                    }
                    catch(e) {
                        await page.click("a.detail-nav-link.btn.btn-inverse.hidden-print.detail-nav-link[data-testid='appt-details-close-btn']");
                    }                    

                    await page.waitForSelector(".start-time", { timeout: SELECTOR_TIMEOUT });
                    console.log({
                        clientName,
                        clientNumber,
                        startTime: startTimeMilitary,
                        endTime: endTimeMilitary,
                        dateOfAppointment: dateOfAppointmentFormatted,
                        typeOfAppointment: cleanedTypeOfAppointment,
                        paymentPrice: paymentPriceNumeric
                    });
                    
                    const client = await getClientByPhoneNumber(clientNumber);

                    if (client) {
                        const appointment = await createAppointment(cleanedTypeOfAppointment, dateOfAppointmentFormatted, startTimeMilitary, endTimeMilitary, client.id, "", paymentPriceNumeric);
                        console.log(`Appointment created: ${appointment.id}`);
                    }
                }

                await page.click("a.btn.btn-inverse.btn-top.btn-detail-back.hidden-print");
                console.log("Back button clicked");
                
            } catch (e) {
                console.log(`Error processing client at index ${i}: ${e.message}`);
                await page.click("a.btn.btn-inverse.btn-top.btn-detail-back.hidden-print");
                console.log("Back button clicked");
                continue;
            }
        }

    } catch (error) {
        console.error("Error:", error);
    } finally {
        await delay(2000)
        // await browser.close()
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


async function main() {
    await getClients()
}

main()
module.exports = {getClients, getCSV};