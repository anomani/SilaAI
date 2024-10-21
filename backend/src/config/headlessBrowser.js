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


async function getClients() {
    userId = 67
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
        await page.waitForSelector("input[data-testid='password-input']", { visible: true });
        await page.type("input[data-testid='password-input']", process.env.ACUITY_PASSWORD);

        // Click the login button
        await page.click("input[data-testid='next-button']");
        console.log("Login button clicked");

        // Press the escape key to close any open modal or dialog
        await delay(2000)
        await page.keyboard.press('Escape');
        console.log("Escape key pressed");

        await page.waitForSelector("button[data-testid='mobile-nav-button']", { visible: true });
        await page.click("button[data-testid='mobile-nav-button']");
        console.log("Mobile nav button clicked");

        await page.goto("https://secure.acuityscheduling.com/admin/clients", {
            waitUntil: 'domcontentloaded'
        });
        await delay(2000)
        const htmlContent = await page.content();

        // Create a new file called squarespace.html in the same folder as this file
        const squarespaceFilePath = path.join(__dirname, 'acuity.html');
        fs.writeFileSync(squarespaceFilePath, htmlContent);
        console.log(`HTML content saved to ${squarespaceFilePath}`);
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
        for (let i = 0; i < clientLinksCount; i++) {
            try {
                await page.waitForSelector("td.lastName.css-1b3r7q", { visible: true });
                // Click on the client link by index
                await page.evaluate(index => {
                    document.querySelectorAll("td.lastName.css-1b3r7q")[index].click();
                }, i);

                await page.waitForSelector(".start-time");

                const clientName = await page.$eval(".field-rendered.edit-client", el => el.innerText);
                const clientNumber = await page.$eval("a.real-link[data-testid='added-client-phone']", el => el.innerText);

                
                const startTime = await page.$eval(".start-time", el => el.innerText);
                const endTime = await page.$eval(".end-time", el => el.innerText);
                const dateOfAppointment = await page.$eval("a[data-testid='docket-appointment-detail-link']", el => el.innerText);
                const typeOfAppointment = await page.$eval(".appointment-type-name", el => el.innerText);
                const paymentPrice = await page.$eval("span.payment-price[data-testid='payment-price-text']", el => el.innerText);
                const paymentPriceNumeric = paymentPrice.replace(/[^0-9.]/g, '');
                console.log(paymentPriceNumeric)
                // Convert times to HH:MM in military time
                const startTimeMilitary = moment(startTime, ["h:mm A"]).format("HH:mm");
                const endTimeMilitary = moment(endTime, ["h:mm A"]).format("HH:mm");
                // Convert date to YYYY-MM-DD
                const dateOfAppointmentFormatted = moment(dateOfAppointment, "dddd, MMMM D, YYYY").format("YYYY-MM-DD");
                console.log({
                    clientName,
                    clientNumber,
                    startTime: startTimeMilitary,
                    endTime: endTimeMilitary,
                    dateOfAppointment: dateOfAppointmentFormatted,
                    typeOfAppointment
                });
                const client = await getClientByPhoneNumber(clientNumber, userId)
                // //async function createAppointment(appointmentType, date, startTime, endTime, clientId, details)
                // //17|1950|2024-06-24|09:15|09:45|Haircut and Beard|
                if(client) {
                    const appointment = await createAppointment(typeOfAppointment, null, dateOfAppointmentFormatted, startTimeMilitary, endTimeMilitary, client.id, "", null, null, null, null, null, userId)
                }


                await page.click("a.btn.btn-inverse.btn-top.btn-detail-back.hidden-print");
                console.log("Back button clicked");
                
            } catch (e) {
                console.log(`Error processing client at index ${i}: ${e.message}`);
                await page.click("a.btn.btn-inverse.btn-top.btn-detail-back.hidden-print");
                console.log("Back button clicked");
                await delay(2000);
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

async function getClientsSquarespace() {
    userId = 67
    let browser;
    try {
        // Connect to BrowserCloud
        browser = await puppeteer.launch({ headless: false });
        const page = await browser.newPage();

        // Set a realistic user agent
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

        // Initial login to Squarespace
        await page.goto("https://shallot-lion-7exn.squarespace.com/config/scheduling/appointments.php", {
            waitUntil: 'domcontentloaded'
        });
        await page.waitForSelector("input[type='email']", { visible: true });
        await page.type("input[type='email']", 'abfades.info@gmail.com');
        await page.type("input[type='password']", 'skinfade');
        await page.click("button[type='submit']");

        // Press the escape key to close any open modal or dialog
        await delay(3000)
        await page.keyboard.press('Escape');
        console.log("Escape key pressed");

        await delay(5000)
        await page.goto("https://shallot-lion-7exn.squarespace.com/config/scheduling/admin/clients", {
            waitUntil: 'networkidle0'
        });
        await delay(2000); // Wait for 10 seconds to ensure everything is loaded

        const frames = await page.frames();
        console.log(`Total frames: ${frames.length}`);

        let targetFrame;
        for (let frame of frames) {
            console.log(`Checking frame: ${frame.name() || 'Unnamed'}`);
            try {
                const clientElements = await frame.$$('td.lastName');
                if (clientElements.length > 0) {
                    targetFrame = frame;
                    break;
                }
            } catch (error) {
                console.log(`Error accessing frame: ${error.message}`);
            }
        }

        if (targetFrame) {
            console.log('Found target frame, attempting to extract content');
            try {
                await targetFrame.waitForSelector('td.lastName', { timeout: 30000 });
                
                // Scroll to load all clients
                let previousHeight;
                while (true) {
                    previousHeight = await targetFrame.evaluate('document.body.scrollHeight');
                    await targetFrame.evaluate('window.scrollTo(0, document.body.scrollHeight)');
                    await delay(2000); // Wait for new clients to load
                    const newHeight = await targetFrame.evaluate('document.body.scrollHeight');
                    if (newHeight === previousHeight) break;
                }
                
                const clientLinksCount = await targetFrame.$$eval("td.lastName", links => links.length);
                console.log(`Found ${clientLinksCount} clients`);

                for (let i = 837; i < clientLinksCount; i++) {
                    try {
                        await targetFrame.waitForSelector("td.lastName", { visible: true });
                        // Click on the client link by index
                        await targetFrame.evaluate(index => {
                            document.querySelectorAll("td.lastName")[index].click();
                        }, i);

                        await targetFrame.waitForSelector(".start-time");
                        const clientName = await targetFrame.$eval(".field-rendered.edit-client", el => el.innerText);
                        const clientNumber = await targetFrame.$eval("a.real-link[data-testid='added-client-phone']", el => el.innerText);

                        await targetFrame.waitForSelector(".appointment-item", { timeout: 10000 });
                        const appointments = await targetFrame.$$(".appointment-item");
                        console.log("Number of appointments: ", appointments.length)
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
                            await targetFrame.click("a[data-testid='docket-appointment-detail-link']");
                            console.log("Appointment detail link clicked")
                            let paymentPriceNumeric;
                            try {   
                                await targetFrame.waitForSelector("span.payment-price[data-testid='payment-price-text']", { visible: true, timeout: 10000 });
                                const paymentPrice = await targetFrame.$eval("span.payment-price[data-testid='payment-price-text']", el => el.innerText);
                                paymentPriceNumeric = paymentPrice.replace(/[^0-9.]/g, '');
                                await targetFrame.click("a.detail-nav-link.btn.btn-inverse.hidden-print.detail-nav-link[data-testid='appt-details-close-btn']");
                                console.log("Payment price close button clicked")
                            }
                            catch(e) {
                                await targetFrame.click("a.detail-nav-link.btn.btn-inverse.hidden-print.detail-nav-link[data-testid='appt-details-close-btn']");
                                console.log("Payment price close button clicked")
                            }   

                            await targetFrame.waitForSelector(".start-time", { timeout: 10000 });
                            console.log({
                                clientName,
                                clientNumber,
                                startTime: startTimeMilitary,
                                endTime: endTimeMilitary,
                                dateOfAppointment: dateOfAppointmentFormatted,
                                typeOfAppointment: cleanedTypeOfAppointment,
                                paymentPrice: paymentPriceNumeric
                            });
                            const client = await getClientByPhoneNumber(clientNumber, userId);
                            console.log(client)
                            if (client) {
                                const appointment = await createAppointment(cleanedTypeOfAppointment, null, dateOfAppointmentFormatted, startTimeMilitary, endTimeMilitary, client.id, "", paymentPriceNumeric, null, null, null, null, userId);
                            }
                        }
                        await targetFrame.click("a.btn.btn-inverse.btn-top.btn-detail-back.hidden-print");
                        console.log("Back button clicked");
                        
                    } catch (e) {
                        console.log(`Error processing client at index ${i}: ${e.message}`);
                        await targetFrame.click("a.btn.btn-inverse.btn-top.btn-detail-back.hidden-print");
                        console.log("Back button clicked");
                        await delay(2000);
                        continue;
                    }
                }
            } catch (error) {
                console.log(`Error accessing target frame: ${error.message}`);
            }
        } else {
            console.log('Target frame not found');
        }

    } catch (error) {
        console.error("Error:", error);
    } finally {
        await delay(2000)
        await browser.close()
    }
}

async function main() {
    await getClientsSquarespace()
}

main()
module.exports = {getClients, getCSV};
