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
const acuity_email = process.env.ACUITY_EMAIL;
const acuity_password = process.env.ACUITY_PASSWORD;

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const SELECTOR_TIMEOUT = 5000; 

const SELECTOR_TIMEOUT_2 = 500;


// This scrapes the appointments from the calendar and creates the appointments in the database

// Default price map for appointment types if not specified
const DEFAULT_PRICES = {
    'Adult Cut': 35.00,
    'Kid Cut': 25.00,
    'Beard Trim': 15.00,
    'Fade': 40.00,
    'Haircut & Beard': 45.00
};

// Default appointment duration in minutes if not specified
const DEFAULT_DURATION = {
    'Adult Cut': 30,
    'Kid Cut': 30,
    'Beard Trim': 15,
    'Fade': 45,
    'Haircut & Beard': 45
};

/**
 * Launches Puppeteer and logs into Acuity Scheduling via Squarespace.
 * @returns {Promise<{browser: object, page: object}>}
 */
async function launchAndLogin() {
    if (!acuity_email || !acuity_password) {
        throw new Error("ACUITY_EMAIL or ACUITY_PASSWORD not set in environment variables.");
    }

    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    await page.goto("https://secure.acuityscheduling.com/login.php?redirect=1", {
        waitUntil: 'domcontentloaded'
    });

    console.log("Entering email and clicking first login step...");
    await page.waitForSelector("input[type='email']", { visible: true, timeout: SELECTOR_TIMEOUT });
    await page.type("input[type='email']", acuity_email);
    await page.click("input[name='login']"); // Initial Acuity login button

    console.log("Clicking Squarespace continue button...");
    await page.waitForSelector("button#squarespace-continue", { visible: true, timeout: SELECTOR_TIMEOUT });
    await page.click("button#squarespace-continue");

    console.log("Entering email on Squarespace login...");
    await page.waitForSelector("input[type='email']", { visible: true, timeout: SELECTOR_TIMEOUT });
    // Sometimes the email might already be filled, handle this gracefully
    try {
        await page.type("input[type='email']", acuity_email, { delay: 50 }); // Added small delay
    } catch (e) {
        console.log("Email field likely already filled, continuing...");
    }

    console.log("Entering password on Squarespace login...");
    // Use the specific password selector from the Squarespace flow
    await page.waitForSelector("input[type='password']", { visible: true, timeout: SELECTOR_TIMEOUT });
    await page.type("input[type='password']", acuity_password);
    await delay(500); // Brief pause before clicking login

    console.log("Clicking final Squarespace login button...");
    // Use the specific login button selector from the Squarespace flow
    await page.waitForSelector("button#login-button", { visible: true, timeout: SELECTOR_TIMEOUT });
    
    // Keep clicking the login button until the page changes
    let currentUrl = page.url();
    let attempts = 0;
    const maxAttempts = 10; // Safety limit
    
    while (attempts < maxAttempts) {
        await page.click("button#login-button");
        console.log(`Login button click attempt ${attempts + 1}`);
        await delay(1000); // One second delay between clicks
        
        // Check if the page URL has changed
        const newUrl = page.url();
        if (newUrl !== currentUrl) {
            console.log("Page changed after login button clicks");
            break;
        }
        
        attempts++;
    }

    console.log("Waiting after login click...");
    // Add a longer delay or wait for a specific element on the next page to ensure login completes
    await delay(5000); // Wait 5 seconds for page transition



    console.log("Handling potential post-login popup...");
    try {
        // Use a more generic selector or wait for navigation if popup is inconsistent
        await page.waitForSelector('body', { timeout: 10000 }); // Wait for body to be ready
        
        // Look for the close button and click it instead of pressing Escape
        const closeButtonSelector = 'span.css-19p0dx4 span';
        const closeButton = await page.$(closeButtonSelector);
        if (closeButton) {
            await closeButton.click();
            console.log("Close button clicked to dismiss popup.");
        } else {
            console.log("Close button not found, popup may not be present.");
        }
        
        await delay(1000);
    } catch (error) {
        console.log("No popup detected or error handling popup:", error.message);
    }

    await delay(1000); // Final small delay
    console.log("Login function finished.");
    return { browser, page };
}

/**
 * Finds the scheduling iframe and returns its content frame.
 * @param {object} page
 * @returns {Promise<object>} calendarFrame
 */
async function getCalendarFrame(page) {
    const iframeSelector = 'iframe[data-test="scheduling"]';
    await page.waitForSelector(iframeSelector, { visible: true, timeout: 30000 });
    const iframeElementHandle = await page.$(iframeSelector);
    
    if (!iframeElementHandle) {
        throw new Error("Could not find the iframe element handle using selector: " + iframeSelector);
    }

    const calendarFrame = await iframeElementHandle.contentFrame();
    if (!calendarFrame) {
        throw new Error("Could not get content frame for the iframe.");
    }
    console.log("Successfully found and accessed the iframe content frame.");
    
    await delay(1000); 

    return calendarFrame;
}

/**
 * Scrapes all appointment elements and processes them.
 * @param {object} calendarFrame
 * @param {number} userId
 */
async function scrapeAndProcessAppointments(calendarFrame, userId) {
    const appointmentSelector = 'div.timeslot.appointment';
    await calendarFrame.waitForSelector(appointmentSelector, { visible: true, timeout: 30000 });
    const appointmentElements = await calendarFrame.$$(appointmentSelector);
    console.log(`Found ${appointmentElements.length} appointment elements inside the iframe.`);
    
    if (appointmentElements.length === 0) {
        console.log("No appointment elements found within the iframe using selector: " + appointmentSelector);
    }

    for (const elementHandle of appointmentElements) {
        await processSingleAppointment(elementHandle, calendarFrame, userId);
    }
}

/**
 * Processes a single appointment element: clicks, extracts, and creates DB record.
 * @param {object} elementHandle
 * @param {object} calendarFrame
 * @param {number} userId
 */
async function processSingleAppointment(elementHandle, calendarFrame, userId) {
    try {
        await elementHandle.click();
        await delay(1000);
        for (let attempt = 0; attempt < 2; attempt++) {
            const isEntered = await calendarFrame.$('a[data-testid="phone-label"]');
            if (isEntered) {
                console.log("Successfully entered appointment details");
                break;
            }
            
            console.log(`Additional click attempt ${attempt + 1}...`);
            await elementHandle.click();
            await delay(1500);
        }
        await extractAndCreateAppointment(calendarFrame, userId);
    } catch (error) {
        console.error("Error processing single appointment:", error);
    }
}

/**
 * Extracts appointment details from the open details modal and creates the appointment in DB.
 * @param {object} calendarFrame
 * @param {number} userId
 */
async function extractAndCreateAppointment(calendarFrame, userId) {
    try {
        const phoneSelector = 'a[data-testid="phone-label"]';
        await calendarFrame.waitForSelector(phoneSelector, { visible: true, timeout: 10000 });
        
        const phoneElement = await calendarFrame.$(phoneSelector);
        let phoneNumber = '';
        if (phoneElement) {
            phoneNumber = await phoneElement.evaluate(el => el.textContent.trim());
            console.log(`Phone Number: ${phoneNumber}`);
        } else {
            console.log("Phone number element not found in details.");
            return;
        }
        
        const { appointmentDate, appointmentStartTime, appointmentEndTime } = await extractDateTime(calendarFrame);
        
        const { appointmentType, barber } = await extractTypeAndBarber(calendarFrame);
        
        console.log("Looking up client by phone number:", phoneNumber);
        const client = await getClientByPhoneNumber(phoneNumber, userId);
        console.log("Client lookup result:", client);
        
        if (client && client.id) {
            const clientId = client.id;
            console.log(`Found client with ID: ${clientId}`);
            
            const price = DEFAULT_PRICES[appointmentType] || 35.00;
            
            console.log("Creating appointment with the following details:");
            console.log({
                appointmentType,
                acuityId: 0,
                date: appointmentDate,
                startTime: appointmentStartTime,
                endTime: appointmentEndTime,
                clientId,
                details: `${appointmentType} with ${barber}`,
                price,
                paid: false,
                tipAmount: 0,
                paymentMethod: null,
                addOns: null,
                userId
            });
            
            await createAppointment(
                appointmentType,
                0,
                appointmentDate,
                appointmentStartTime,
                appointmentEndTime,
                clientId,
                `${appointmentType} with ${barber}`,
                price,
                false,
                0,
                null,
                null,
                userId
            );
            console.log(`Successfully created appointment with ID: ${clientId}`);
        } else {
            console.log(`No client found with phone number: ${phoneNumber}`);
        }
        await closeAppointmentDetails(calendarFrame);
    } catch (error) {
        console.error("Error extracting/creating appointment:", error);
        await closeAppointmentDetails(calendarFrame);
    }
}

/**
 * Extracts date, start time, and end time from the appointment details modal.
 * @param {object} calendarFrame
 * @returns {Promise<{appointmentDate: string, appointmentStartTime: string, appointmentEndTime: string}>}
 */
async function extractDateTime(calendarFrame) {
    const timeElements = await calendarFrame.$$('div.appointment-details-date-time');
    console.log(`Found ${timeElements.length} time-related elements`);
    
    let appointmentDate = '';
    let appointmentStartTime = '';
    let appointmentEndTime = '';
    let appointmentDuration = '';
    
    for (let i = 0; i < timeElements.length; i++) {
        const elementText = await timeElements[i].evaluate(el => el.textContent.trim());
        console.log(`Time Element ${i + 1}: ${elementText}`);
        
        if (i === 0 && elementText.includes(',')) {
            appointmentDate = moment(elementText, "dddd, MMMM D, YYYY").format("YYYY-MM-DD");
            console.log(`Found Date: ${appointmentDate}`);
        }
        else if (elementText.includes('-') && elementText.includes('am') || elementText.includes('pm')) {
            const timeRangeRegex = /(\d+:\d+[ap]m)\s*-\s*(\d+:\d+[ap]m)/;
            const match = elementText.match(timeRangeRegex);
            
            if (match) {
                appointmentStartTime = moment(match[1], "h:mma").format("HH:mm");
                appointmentEndTime = moment(match[2], "h:mma").format("HH:mm");
                console.log(`Found Time Range: ${appointmentStartTime} - ${appointmentEndTime}`);
            }
        }
        else if (elementText.includes('min')) {
            appointmentDuration = elementText;
            console.log(`Found Duration: ${appointmentDuration}`);
            
            if (appointmentStartTime && !appointmentEndTime) {
                const durationMinutes = parseInt(appointmentDuration.replace('min', '').trim());
                if (!isNaN(durationMinutes) && durationMinutes > 0) {
                    appointmentEndTime = moment(appointmentStartTime, "HH:mm")
                        .add(durationMinutes, 'minutes')
                        .format("HH:mm");
                    console.log(`Calculated End Time from Duration: ${appointmentEndTime}`);
                }
            }
        }
    }
    
    if (!appointmentDate) {
        const today = new Date();
        appointmentDate = moment(today).format("YYYY-MM-DD");
        console.log(`Using default date: ${appointmentDate}`);
    }
    
    if (!appointmentStartTime) {
        appointmentStartTime = "10:00";
        console.log(`Using default start time: ${appointmentStartTime}`);
    }
    
    if (!appointmentEndTime) {
        appointmentEndTime = "10:30";
        console.log(`Using default end time: ${appointmentEndTime}`);
    }
    
    return { appointmentDate, appointmentStartTime, appointmentEndTime };
}

/**
 * Extracts appointment type and barber from the details modal.
 * @param {object} calendarFrame
 * @returns {Promise<{appointmentType: string, barber: string}>}
 */
async function extractTypeAndBarber(calendarFrame) {
    const typeSelector = 'div.appointment-details-name span.edit-hidden.edit-appointment';
    const typeElement = await calendarFrame.$(typeSelector);
    let appointmentType = '';
    let barber = '';
    
    if (typeElement) {
        const fullText = await typeElement.evaluate(el => el.textContent.trim());
        const parts = fullText.split('with');
        if (parts.length >= 2) {
            appointmentType = parts[0].trim();
            barber = parts[1].trim();
            console.log(`Appointment Type: ${appointmentType}`);
            console.log(`Barber: ${barber}`);
        } else {
            console.log(`Appointment Details: ${fullText}`);
            appointmentType = fullText.trim();
        }
    } else {
        console.log("Appointment type element not found in details.");
        appointmentType = "Adult Cut";
    }
    
    return { appointmentType, barber };
}

/**
 * Closes the appointment details modal.
 * @param {object} calendarFrame
 */
async function closeAppointmentDetails(calendarFrame) {
    try {
        const closeButtonSelector = 'a[data-testid="close-appointment-detail"]';
        await calendarFrame.waitForSelector(closeButtonSelector, { visible: true, timeout: 5000 });
        await calendarFrame.click(closeButtonSelector);
        await delay(1000);
    } catch (error) {
        console.log("Failed to close appointment details with Close button, trying Escape key as fallback");
        try {
            await calendarFrame.page().keyboard.press('Escape');
            await delay(1000);
        } catch (escapeError) {
            console.log("Failed to close appointment details with Escape key");
        }
    }
}

async function main(userId) {
    const { browser, page } = await launchAndLogin();
    try {
        const calendarFrame = await getCalendarFrame(page);
        await scrapeAndProcessAppointments(calendarFrame,userId);
    } catch (error) {
        console.error("Error in main flow:", error);
    } finally {
        await delay(2000);
        await browser.close();
        console.log("Browser closed");
    }
}

if (require.main === module) {
    main(67);
}

module.exports = {
    launchAndLogin,
    getCalendarFrame,
    scrapeAndProcessAppointments,
    processSingleAppointment,
    extractAndCreateAppointment,
    extractDateTime,
    extractTypeAndBarber,
    closeAppointmentDetails
};