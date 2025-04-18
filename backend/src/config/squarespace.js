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
const acuity_email = "abfades.info@gmail.com"
const acuity_password = "skinfade"


const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const SELECTOR_TIMEOUT = 5000; 

const SELECTOR_TIMEOUT_2 = 500;

async function login() {
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

        await page.type("input[type='email']", acuity_email);
        await page.click("input[name='login']");
        await page.waitForSelector("button#squarespace-continue", { visible: true, timeout: SELECTOR_TIMEOUT });
        await page.click("button#squarespace-continue");
        // Wait for the email input field
        await page.waitForSelector("input[type='email']", { visible: true, timeout: SELECTOR_TIMEOUT });
        
        // Type the email into the input field
        await page.type("input[type='email']", acuity_email);
        // Wait for password input and type password
        await page.waitForSelector("input[type='password']", { visible: true, timeout: SELECTOR_TIMEOUT });
        await page.type("input[type='password']", acuity_password);
        // // Click the login button
        // Click the login button
        await delay(1000);
        await page.waitForSelector("button#login-button", { visible: true, timeout: SELECTOR_TIMEOUT });
        
        // Get the current URL to check for page changes
        const initialUrl = page.url();
        let currentUrl = initialUrl;
        let attempts = 0;
        const maxAttempts = 5;
        
        // Keep clicking the login button until the page changes or max attempts reached
        while (currentUrl === initialUrl && attempts < maxAttempts) {
            await page.click("button#login-button");
            console.log(`Login attempt ${attempts + 1}`);
            await delay(1000); // Small delay between clicks
            
            // Check if URL has changed
            currentUrl = page.url();
            attempts++;
        }
        
        if (currentUrl !== initialUrl) {
            console.log("Page changed after login button clicks");
        } else {
            console.log(`Reached maximum login attempts (${maxAttempts})`);
        }

        console.log("Login button clicked");

        // // Press the escape key to close any open modal or dialog
        // Wait for and handle the updated client scheduling page popup
        try {
            await page.waitForSelector('.css-1q1n1n3', { visible: true, timeout: 15000 });
            await delay(1000); // Brief delay to ensure popup is fully loaded
        } catch (error) {
            console.log("Popup not found, continuing...");
        }
        await page.keyboard.press('Escape');
        console.log("Escape key pressed");
        await delay(2000)
        // LOGIN SEQUENCE COMPLETE 

        // --- Start: Modified code to find iframe and click appointments ---
        console.log(`Current page URL: ${page.url()}`);
        console.log("Attempting to find the scheduling iframe...");

        const iframeSelector = 'iframe[data-test="scheduling"]'; // Use data-test attribute for iframe selector
        let calendarFrame;

        try {
            // Wait for the iframe element to be present and visible
            await page.waitForSelector(iframeSelector, { visible: true, timeout: 30000 });
            const iframeElementHandle = await page.$(iframeSelector);
            
            if (!iframeElementHandle) {
                throw new Error("Could not find the iframe element handle using selector: " + iframeSelector);
            }

            // Get the content frame of the iframe
            calendarFrame = await iframeElementHandle.contentFrame();
            if (!calendarFrame) {
                throw new Error("Could not get content frame for the iframe.");
            }
            console.log("Successfully found and accessed the iframe content frame.");
            
            // Allow a brief moment for frame content to potentially finish loading after access
            await delay(1000); 

            console.log("Attempting to find and click appointment elements within the iframe...");
            const appointmentSelector = 'div.timeslot.appointment'; // Selector for appointments inside the iframe
            
            // IMPORTANT: Use calendarFrame for interactions inside the iframe
            await calendarFrame.waitForSelector(appointmentSelector, { visible: true, timeout: 30000 }); 
            const appointmentElements = await calendarFrame.$$(appointmentSelector);
            console.log(`Found ${appointmentElements.length} appointment elements inside the iframe.`);
            console.log(appointmentElements)
            if (appointmentElements.length === 0) {
                console.log("No appointment elements found within the iframe using selector: " + appointmentSelector);
            }

            for (const elementHandle of appointmentElements) {
                console.log("Clicking an appointment element inside the iframe...");
                // Click the element within the iframe's context
                await elementHandle.click(); 
                
                // --- Start: Added logic to get phone and close details ---
                try {
                    // Wait for the appointment details section/modal to appear (using phone label as indicator)
                    const phoneSelector = 'a[data-testid="phone-label"]';
                    await calendarFrame.waitForSelector(phoneSelector, { visible: true, timeout: 10000 });
                    
                    // Get the phone number element
                    const phoneElement = await calendarFrame.$(phoneSelector);
                    if (phoneElement) {
                        const phoneNumber = await phoneElement.evaluate(el => el.textContent);
                        console.log(`Phone Number: ${phoneNumber.trim()}`);
                    } else {
                        console.log("Phone number element not found in details.");
                    }

                    // Find and click the close button
                    const closeButtonSelector = 'a[data-testid="close-appointment-detail"]';
                    const closeButton = await calendarFrame.$(closeButtonSelector);
                    if (closeButton) {
                        console.log("Clicking the close button...");
                        await closeButton.click();
                        // Wait a moment for the modal/details to close before next iteration
                        await delay(1500); 
                    } else {
                        console.log("Close button not found.");
                        // Optional: Press Escape as a fallback if the button isn't found
                        // await calendarFrame.keyboard.press('Escape');
                        // await delay(500);
                    }
                } catch (detailError) {
                    console.error("Error processing appointment details or closing:", detailError);
                    // Attempt to recover by pressing Escape if details interaction failed
                    try {
                         await page.keyboard.press('Escape'); // Try main page context first
                         await delay(500);
                    } catch (escapeError) {
                         console.log("Failed to press Escape after detail error.");
                    }
                }
                // --- End: Added logic ---

                // await delay(1000); // Original delay after click is now handled after closing modal
            }
            console.log("Finished clicking appointment elements inside the iframe.");

        } catch (error) {
            console.error("Error finding/interacting with iframe or its contents:", error); // More specific error logging
        }
        // --- End: Modified code ---

    } catch (error) {
        console.error("Error during login or appointment interaction:", error); // Updated error message
    } finally {
        await delay(2000)
        // await browser.close()
    }
}

async function scrapeAppointments(page) {

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
    await login()
}

main()
module.exports = {login, getCSV};