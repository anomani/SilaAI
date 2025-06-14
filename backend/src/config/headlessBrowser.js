const puppeteer = require('puppeteer');
const dotenv = require('dotenv')
dotenv.config({path : '../../.env'})
const fs = require('fs');
const os = require('os');
const path = require('path')
const moment = require('moment'); // Add moment library
const {createAppointment} = require('../model/appointment')
const {getClientByPhoneNumber} = require('../model/clients')
// Import the launchAndLogin function
const { launchAndLogin } = require('./squarespace'); // Added import
// Remove apiKey as it's handled within launchAndLogin now
// const apiKey = process.env.BROWSERCLOUD_API_KEY;


const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to retry clicking with multiple attempts
async function retryClick(element, maxAttempts = 3, delayMs = 1000) {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            await element.click();
            console.log(`Click successful on attempt ${attempt}`);
            return true; // Success
        } catch (error) {
            console.log(`Click attempt ${attempt} failed: ${error.message}`);
            if (attempt < maxAttempts) {
                console.log(`Retrying click in ${delayMs}ms...`);
                await delay(delayMs);
            } else {
                console.log(`All ${maxAttempts} click attempts failed`);
                throw error; // Re-throw the error after all attempts failed
            }
        }
    }
    return false;
}


async function getClients() {
    userId = 67
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
        
        const clientLinksCount = await page.$$eval("td.lastName.css-16o23tj", links => links.length);
        console.log(clientLinksCount)
        for (let i = 0; i < clientLinksCount; i++) {
            try {
                await page.waitForSelector("td.lastName.css-16o23tj", { visible: true });
                // Click on the client link by index
                await page.evaluate(index => {
                    document.querySelectorAll("td.lastName.css-16o23tj")[index].click();
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
                    // const appointment = await createAppointment(typeOfAppointment, null, dateOfAppointmentFormatted, startTimeMilitary, endTimeMilitary, client.id, "", null, null, null, null, null, userId)
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
    let userId = 67 // Keep userId for getClientByPhoneNumber
    let browser;
    let page; // Declare page variable

    try {
        // Call the imported launchAndLogin function
        const loginResult = await launchAndLogin(); // Replaced login block
        browser = loginResult.browser;
        page = loginResult.page;
        console.log("Login completed via imported function.");

        // Removed the original login sequence:
        // browser = await puppeteer.launch({ headless: false });
        // const page = await browser.newPage();
        // await page.setUserAgent(...)
        // await page.goto(...)
        // await page.waitForSelector(...)
        // await page.type(...)
        // await page.type(...)
        // await page.click(...)
        // await delay(...)
        // let currentUrl = page.url();
        // let attempts = 0;
        // const maxAttempts = 10;
        // while (...) { ... }
        // if (...) { ... } else { ... }
        // await delay(...)
        // await page.keyboard.press('Escape');
        // console.log("Escape key pressed");
        // await delay(...)

        // Navigate to the clients page after successful login
        await page.goto("https://shallot-lion-7exn.squarespace.com/config/scheduling/admin/clients"); // Updated URL to Acuity
        console.log("Navigated to Acuity clients page.");
        await delay(5000); // Wait for page to potentially load within iframe

        // --- Frame Handling Logic ---
        // NOTE: Acuity's client page structure might be different from Squarespace's.
        // The frame finding logic below might need significant adjustments
        // if Acuity doesn't use an iframe in the same way, or if element selectors differ.
        // It's possible Acuity loads clients directly on the page without an iframe.

        console.log("Attempting to find clients directly on the page first...");
        let targetFrame = page; // Assume no iframe initially
        let clientElementsDirect = await targetFrame.$$('td.lastName'); // Using Acuity's typical selector

        if (clientElementsDirect.length === 0) {
            console.log("No clients found directly, checking for iframes...");
            const frames = await page.frames();
            console.log(`Total frames: ${frames.length}`);

            for (let frame of frames) {
                console.log(`Checking frame: ${frame.url()}`); // Log URL for better identification
                try {
                    // Use Acuity's client list selector
                    const clientElements = await frame.$$('td.lastName');
                    if (clientElements.length > 0) {
                        console.log(`Found clients in frame: ${frame.url()}`);
                        targetFrame = frame;
                        break;
                    }
                } catch (error) {
                    // Frame might be inaccessible (cross-origin) or detached
                    if (!error.message.includes('Target closed') && !error.message.includes('frame was detached')) {
                       console.log(`Non-critical error accessing frame ${frame.url()}: ${error.message}`);
                    }
                }
            }
        } else {
             console.log("Found clients directly on the page.");
        }


        if (targetFrame && targetFrame !== page) {
             console.log('Working within identified iframe.');
        } else if (targetFrame === page && clientElementsDirect.length > 0) {
             console.log('Working directly on the main page.');
        }
         else {
            console.log('Could not find client list container (neither directly nor in iframe). Aborting scrape.');
            throw new Error('Client list container not found.'); // Throw error if no clients found anywhere
        }


            try {
                // Use Acuity selectors now
                const clientSelector = 'td.lastName'; // Acuity selector
                await targetFrame.waitForSelector(clientSelector, { timeout: 30000 });

                // Scroll to load all clients
                let previousHeight;
                while (true) {
                    previousHeight = await targetFrame.evaluate('document.body.scrollHeight');
                    await targetFrame.evaluate('window.scrollTo(0, document.body.scrollHeight)');
                    await delay(3000); // Increased delay for potentially slower loading
                    const newHeight = await targetFrame.evaluate('document.body.scrollHeight');
                    if (newHeight === previousHeight) break;
                    console.log("Scrolling to load more clients...");
                }

                const clientLinksCount = await targetFrame.$$eval(clientSelector, links => links.length);
                console.log(`Found ${clientLinksCount} clients after scrolling.`);

                if (clientLinksCount === 0) {
                    console.log("No client links found even after scrolling.");
                }

                
                for (let i = 0; i < clientLinksCount; i++) {
                    try {
                        await targetFrame.waitForSelector(clientSelector, { visible: true });
                        // Click on the client link by index
                        // Ensure selector is still valid after potential DOM changes
                        const clientLinks = await targetFrame.$$(clientSelector);
                        if (clientLinks[i]) {
                            // Use retry logic for clicking client links
                            console.log(`Attempting to click client link ${i + 1}/${clientLinksCount}`);
                            await retryClick(clientLinks[i], 3, 1500); // 3 attempts with 1.5s delay
                            console.log(`Successfully clicked client link ${i + 1}/${clientLinksCount}`);
                        } else {
                             console.log(`Client link at index ${i} not found, skipping.`);
                             continue;
                        }


                        // Wait for details to load - Use selectors valid on Acuity client detail page
                        await targetFrame.waitForSelector(".appointment-item", { timeout: 10000 }); // Example selector, adjust if needed

                        const clientName = await targetFrame.$eval(".field-rendered.edit-client", el => el.innerText); // Check if selector is correct for Acuity
                        const clientNumber = await targetFrame.$eval("a.real-link[data-testid='added-client-phone']", el => el.innerText); // Check if selector is correct for Acuity

                        const appointments = await targetFrame.$$(".appointment-item"); // Check selector
                        console.log(`Client: ${clientName}, Appointments found: ${appointments.length}`);

                        for (const appointmentElement of appointments) {
                             // Use selectors valid within Acuity's appointment item structure
                            const startTime = await appointmentElement.$eval(".start-time", el => el.innerText);
                            const endTime = await appointmentElement.$eval(".end-time", el => el.innerText);
                            const dateOfAppointment = await appointmentElement.$eval("a[data-testid='docket-appointment-detail-link']", el => el.innerText);
                            const typeOfAppointment = await appointmentElement.$eval(".appointment-type-name", el => el.innerText);
                            // Clean type if needed (might not have \n\t in Acuity)
                            const cleanedTypeOfAppointment = typeOfAppointment.replace(/[\n\t]/g, '').trim();

                            // Date/Time Formatting
                            const startTimeMilitary = moment(startTime, ["h:mm A"]).format("HH:mm");
                            const endTimeMilitary = moment(endTime, ["h:mm A"]).format("HH:mm");
                            const dateOfAppointmentFormatted = moment(dateOfAppointment, "dddd, MMMM D, YYYY").format("YYYY-MM-DD");

                            // --- Price Extraction ---
                            // Click into the appointment detail to get the price
                             const detailLink = await appointmentElement.$("a[data-testid='docket-appointment-detail-link']");
                             if (detailLink) {
                                console.log("Attempting to click appointment detail link");
                                await retryClick(detailLink, 3, 1000); // 3 attempts with 1s delay
                                console.log("Successfully clicked appointment detail link");
                             } else {
                                console.log("Could not find appointment detail link.");
                                continue; // Skip if cannot get price
                             }

                            let paymentPriceNumeric = null; // Default to null
                            try {
                                // Wait for the price element within the details view (Acuity selector)
                                const priceSelector = "span.payment-price[data-testid='payment-price-text']"; // Or appropriate Acuity selector
                                await targetFrame.waitForSelector(priceSelector, { visible: true, timeout: 10000 });
                                const paymentPrice = await targetFrame.$eval(priceSelector, el => el.innerText);
                                paymentPriceNumeric = paymentPrice.replace(/[^0-9.]/g, '');
                                console.log(`Found price: ${paymentPriceNumeric}`);

                                // Close the detail view (Acuity close button selector)
                                const closeButtonSelector = "a.detail-nav-link.btn.btn-inverse.hidden-print[data-testid='appt-details-close-btn']"; // Adjust if needed
                                await targetFrame.waitForSelector(closeButtonSelector, { visible: true, timeout: 5000 });
                                const closeButton = await targetFrame.$(closeButtonSelector);
                                if (closeButton) {
                                    console.log("Attempting to close appointment detail view");
                                    await retryClick(closeButton, 3, 1000);
                                    console.log("Successfully closed appointment detail view");
                                } else {
                                    console.log("Close button not found, trying direct click");
                                    await targetFrame.click(closeButtonSelector);
                                }

                            } catch (e) {
                                console.log(`Could not extract price for this appointment: ${e.message}`);
                                // Try to close the detail view even if price extraction failed
                                try {
                                    const closeButtonSelector = "a.detail-nav-link.btn.btn-inverse.hidden-print[data-testid='appt-details-close-btn']";
                                    await targetFrame.waitForSelector(closeButtonSelector, { visible: true, timeout: 5000 });
                                    const closeButton = await targetFrame.$(closeButtonSelector);
                                    if (closeButton) {
                                        console.log("Attempting to close appointment detail view after price error");
                                        await retryClick(closeButton, 3, 1000);
                                        console.log("Successfully closed appointment detail view after price error");
                                    } else {
                                        console.log("Close button not found, trying direct click");
                                        await targetFrame.click(closeButtonSelector);
                                    }
                                } catch (closeError) {
                                    console.log("Failed to close detail view after price error. Attempting back navigation.");
                                     await targetFrame.goBack({ waitUntil: 'networkidle0' }); // Fallback
                                }
                            }

                             // Wait briefly after closing details before next iteration
                            await targetFrame.waitForSelector(".appointment-item", { timeout: 10000 }); // Wait for list item again


                            // Log extracted data
                            console.log({
                                clientName,
                                clientNumber,
                                startTime: startTimeMilitary,
                                endTime: endTimeMilitary,
                                dateOfAppointment: dateOfAppointmentFormatted,
                                typeOfAppointment: cleanedTypeOfAppointment,
                                paymentPrice: paymentPriceNumeric // Will be null if not found/extracted
                            });
                            // Get client and create appointment
                            const client = await getClientByPhoneNumber(clientNumber, userId);
                            console.log("Client lookup result:", client ? `Found ID: ${client.id}` : "Not found");
                            if (client) {
                                // Use extracted price, or null if not found
                                const appointment = await createAppointment(cleanedTypeOfAppointment, null, dateOfAppointmentFormatted, startTimeMilitary, endTimeMilitary, client.id, "", paymentPriceNumeric, null, null, null, null, userId);
                                console.log("Appointment creation attempted.");
                            }
                        }
                         // Back to client list (Acuity selector)
                        await targetFrame.waitForSelector("a.btn.btn-inverse.btn-top.btn-detail-back.hidden-print", { visible: true, timeout: 10000 }); // Ensure back button is ready
                        const backButton = await targetFrame.$("a.btn.btn-inverse.btn-top.btn-detail-back.hidden-print");
                        if (backButton) {
                            console.log("Attempting to click back button to client list");
                            await retryClick(backButton, 3, 1000);
                            console.log("Successfully clicked back button to client list");
                        } else {
                            console.log("Back button not found, trying direct click");
                            await targetFrame.click("a.btn.btn-inverse.btn-top.btn-detail-back.hidden-print");
                        }
                        await delay(2000); // Wait for list page to reload

                    } catch (e) {
                        console.log(`Error processing client at index ${i}: ${e.message}`);
                         console.log("Attempting to navigate back to client list...");
                        try {
                             // Try clicking the main back button if available
                            const backButton = await targetFrame.$("a.btn.btn-inverse.btn-top.btn-detail-back.hidden-print");
                             if (backButton) {
                                console.log("Attempting to click main back button after error");
                                await retryClick(backButton, 3, 1000);
                                console.log("Successfully clicked main back button after error");
                             } else {
                                console.log("Main back button not found, trying browser back.");
                                await targetFrame.goBack({ waitUntil: 'networkidle0' });
                             }
                         } catch (navError) {
                            console.log(`Navigation error after client processing error: ${navError.message}. Trying direct navigation.`);
                         }
                        await delay(3000); // Longer delay after error
                        continue;
                    }
                }
            } catch (error) {
                console.log(`Error processing client list: ${error.message}`);
                // Add screenshot on error for debugging
                const screenshotPath = path.join(__dirname, `error_screenshot_${Date.now()}.png`);
                await page.screenshot({ path: screenshotPath, fullPage: true });
                console.log(`Screenshot saved to ${screenshotPath}`);
            }


    } catch (error) {
        console.error("Error in getClientsSquarespace:", error);
         // Add screenshot on major error
        if (page) {
            const screenshotPath = path.join(__dirname, `major_error_screenshot_${Date.now()}.png`);
            await page.screenshot({ path: screenshotPath, fullPage: true });
            console.log(`Screenshot saved to ${screenshotPath}`);
        }
    } finally {
        await delay(2000)
        if (browser) { // Check if browser exists before closing
            await browser.close()
             console.log("Browser closed.");
        }
    }
}

async function main() {
    await getClientsSquarespace()
}

main()

module.exports = {getClients, getCSV, getClientsSquarespace}; // Added getClientsSquarespace to exports if needed elsewhere
