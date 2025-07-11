const puppeteer = require('puppeteer');
const dotenv = require('dotenv')
dotenv.config({path : '../../.env'})
const fs = require('fs');
const os = require('os');   
const path = require('path')
const moment = require('moment'); // Add moment library
const {createAppointment} = require('../../src/model/appointment')
const {getClientByPhoneNumber, createClient} = require('../../src/model/clients')
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
 * Multi-selector helper function for robust element interaction
 */
async function interactWithElement(page, selectors, actionType, actionValue = null, options = {}) {
    const { visible = true, timeout = 3000, postActionDelay = 0 } = options;
    for (const selector of selectors) {
        try {
            console.log(`Attempting to find element with selector: ${selector}`);
            await page.waitForSelector(selector, { visible, timeout });
            console.log(`Element found with selector: ${selector}. Performing action: ${actionType}`);
            if (actionType === 'click') {
                await page.click(selector);
            } else if (actionType === 'type' && actionValue !== null) {
                await page.type(selector, actionValue);
            } else if (actionType === 'waitFor') {
                // Just waiting for the element is enough
            }
            
            if (postActionDelay > 0) {
                 console.log(`Pausing ${postActionDelay}ms after action.`);
                 await new Promise(resolve => setTimeout(resolve, postActionDelay));
            }
            return true; // Action successful
        } catch (e) {
            console.log(`Selector ${selector} failed or timed out for action ${actionType}.`);
        }
    }
    console.error(`All selectors failed for action ${actionType} on selectors: ${selectors.join(', ')}`);
    return false; // All selectors failed
}

/**
 * Connects to persistent browser or launches new one, then logs into Acuity Scheduling via Squarespace.
 * @returns {Promise<{browser: object, page: object}>}
 */
async function launchAndLogin() {
    if (!acuity_email || !acuity_password) {
        throw new Error("ACUITY_EMAIL or ACUITY_PASSWORD not set in environment variables.");
    }

    let browser;
    let page;

    // Try to connect to persistent browser first
    try {
        console.log("Attempting to connect to persistent browser...");
        browser = await puppeteer.connect({ 
            browserURL: 'http://127.0.0.1:9222', 
            defaultViewport: null 
        });
        
        const pages = await browser.pages();
        // Find existing page or create new one
        page = pages.find(p => p.url().includes('acuityscheduling.com'));
        if (!page) {
            page = pages.find(p => p.url() !== 'about:blank' && !p.url().startsWith('chrome-extension://'));
            if (!page) {
                console.log('No suitable existing page. Opening new page.');
                page = await browser.newPage();
            }
        }
        await page.bringToFront();
        console.log("Successfully connected to persistent browser");
    } catch (error) {
        console.log("Could not connect to persistent browser, launching new instance:", error.message);
        browser = await puppeteer.launch({ headless: false });
        page = await browser.newPage();
    }

    // Check if already logged in
    console.log("Checking current login state...");
    console.log("Current URL:", page.url());
    
    // Check for logged-in indicators
    const loggedInSelectors = [
        'iframe[data-test="scheduling"]', // Main calendar iframe
        'a[href*="logout"]', // Logout link
        '.user-menu', // User menu
        '[data-testid="user-menu"]' // Alternative user menu
    ];
    
    let isLoggedIn = false;
    try {
        const loginCheckResult = await interactWithElement(page, loggedInSelectors, 'waitFor', null, { timeout: 3000 });
        if (loginCheckResult) {
            isLoggedIn = true;
            console.log("Already logged in!");
        }
    } catch (e) {
        console.log("Not logged in, proceeding with login flow");
    }

    if (!isLoggedIn) {
        console.log("Starting login process...");
        
        // Navigate to login page if not already there
        if (!page.url().includes('acuityscheduling.com/login')) {
            await page.goto("https://secure.acuityscheduling.com/login.php?redirect=1", {
                waitUntil: 'domcontentloaded'
            });
        }

        console.log("Entering email and clicking first login step...");
        const emailSelectors = ["input[type='email']", "input[name='email']"];
        await interactWithElement(page, emailSelectors, 'type', acuity_email);
        
        const loginButtonSelectors = ["input[name='login']", "button[type='submit']"];
        await interactWithElement(page, loginButtonSelectors, 'click', null, { postActionDelay: 1000 });

        console.log("Clicking Squarespace continue button...");
        const squarespaceButtonSelectors = ["button#squarespace-continue", "button[id*='squarespace']"];
        await interactWithElement(page, squarespaceButtonSelectors, 'click', null, { postActionDelay: 1000 });

        console.log("Entering email on Squarespace login...");
        const squarespaceEmailSelectors = ["input[type='email']", "input[name='email']"];
        try {
            await interactWithElement(page, squarespaceEmailSelectors, 'type', acuity_email);
        } catch (e) {
            console.log("Email field likely already filled, continuing...");
        }

        console.log("Entering password on Squarespace login...");
        const passwordSelectors = ["input[type='password']", "input[name='password']"];
        await interactWithElement(page, passwordSelectors, 'type', acuity_password);
        await delay(500);

        console.log("Clicking final Squarespace login button...");
        const finalLoginSelectors = ["button#login-button", "button[type='submit']", "input[type='submit']"];
        
        // Keep clicking the login button until the page changes
        let currentUrl = page.url();
        let attempts = 0;
        const maxAttempts = 10;
        
        while (attempts < maxAttempts) {
            await interactWithElement(page, finalLoginSelectors, 'click');
            console.log(`Login button click attempt ${attempts + 1}`);
            await delay(2000);
            
            const newUrl = page.url();
            if (newUrl !== currentUrl) {
                console.log("Page changed after login button clicks");
                break;
            }
            attempts++;
        }

        console.log("Waiting after login click...");
        await delay(5000);
    }

    // Navigate to appointments page
    console.log("Navigating to appointments page...");
    if (!page.url().includes('appointments.php')) {
        await page.goto("https://secure.acuityscheduling.com/appointments.php", {
            waitUntil: 'domcontentloaded'
        });
    }

    // Handle potential popup
    console.log("Handling potential post-login popup...");
    try {
        await page.waitForSelector('body', { timeout: 10000 });
        
        const closeButtonSelectors = [
            'span.css-19p0dx4 span',
            '[data-testid="close-button"]',
            '.close-button',
            'button[aria-label="Close"]'
        ];
        
        const closeResult = await interactWithElement(page, closeButtonSelectors, 'click', null, { timeout: 2000 });
        if (closeResult) {
            console.log("Close button clicked to dismiss popup.");
        } else {
            console.log("No popup detected or close button not found.");
        }
        
        await delay(1000);
    } catch (error) {
        console.log("No popup detected or error handling popup:", error.message);
    }

    // Debug: Log page content and available elements
    console.log("=== DEBUG INFO ===");
    console.log("Current URL:", page.url());
    console.log("Page Title:", await page.title());
    
    // Check what iframes are available
    const iframes = await page.$$eval('iframe', frames => 
        frames.map(frame => ({
            src: frame.src,
            id: frame.id,
            className: frame.className,
            dataTest: frame.getAttribute('data-test'),
            name: frame.name
        }))
    );
    console.log("Available iframes:", JSON.stringify(iframes, null, 2));
    
            // Check for common calendar-related elements
        const calendarElements = await page.$$eval('*', elements => {
            const relevant = [];
            elements.forEach(el => {
                const text = el.textContent?.toLowerCase() || '';
                const classes = (el.className || '').toString().toLowerCase();
                const id = (el.id || '').toString().toLowerCase();
                
                if (text.includes('calendar') || text.includes('appointment') || 
                    classes.includes('calendar') || classes.includes('appointment') ||
                    id.includes('calendar') || id.includes('appointment')) {
                    relevant.push({
                        tagName: el.tagName,
                        id: el.id,
                        className: el.className,
                        textContent: el.textContent?.substring(0, 100)
                    });
                }
            });
            return relevant.slice(0, 10); // Limit output
        });
    console.log("Calendar-related elements:", JSON.stringify(calendarElements, null, 2));
    
    console.log("=== END DEBUG INFO ===");

    await delay(1000);
    console.log("Login function finished.");
    return { browser, page };
}

/**
 * Finds the scheduling iframe and returns its content frame.
 * @param {object} page
 * @returns {Promise<object>} calendarFrame
 */
async function getCalendarFrame(page) {
    // Try multiple iframe selectors
    const iframeSelectors = [
        'iframe[data-test="scheduling"]',
        'iframe[src*="calendar"]',
        'iframe[src*="scheduling"]',
        'iframe[name*="calendar"]',
        'iframe[name*="scheduling"]',
        'iframe[id*="calendar"]',
        'iframe[id*="scheduling"]',
        'iframe' // Fallback to any iframe
    ];
    
    console.log("Searching for calendar iframe...");
    let iframeElementHandle = null;
    
    for (const selector of iframeSelectors) {
        try {
            console.log(`Trying iframe selector: ${selector}`);
            await page.waitForSelector(selector, { visible: true, timeout: 5000 });
            iframeElementHandle = await page.$(selector);
            if (iframeElementHandle) {
                console.log(`Found iframe with selector: ${selector}`);
                break;
            }
        } catch (e) {
            console.log(`Iframe selector ${selector} not found or timed out`);
        }
    }
    
    if (!iframeElementHandle) {
        throw new Error("Could not find any iframe element. Available iframes logged above.");
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
        
        const { firstName, lastName } = await extractClientName(calendarFrame);
        
        console.log("Looking up client by phone number:", phoneNumber);
        let client = await getClientByPhoneNumber(phoneNumber, userId);
        console.log("Client lookup result:", client);
        
        let clientId;
        
        if (client && client.id) {
            clientId = client.id;
            console.log(`Found existing client with ID: ${clientId}`);
        } else {
            console.log(`No client found with phone number: ${phoneNumber}. Creating new client...`);
            console.log(`Client Name: ${firstName} ${lastName}`);
            
            // Create new client
            const newClient = await createClient(firstName, lastName, phoneNumber, '', '', userId);
            console.log("New client creation result:", newClient);
            
            if (newClient && (newClient.id || newClient.insertId || typeof newClient === 'number')) {
                clientId = newClient.id || newClient.insertId || newClient;
                console.log(`Successfully created new client with ID: ${clientId}`);
            } else {
                console.log("Failed to create new client. Skipping appointment.");
                await closeAppointmentDetails(calendarFrame);
                return;
            }
        }
        
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
        console.log(`Successfully created appointment with client ID: ${clientId}`);
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
 * Extracts client first and last name from the appointment details modal in iframe.
 * @param {object} calendarFrame
 * @returns {Promise<{firstName: string, lastName: string}>}
 */
async function extractClientName(calendarFrame) {
    let fullName = '';
    
    // First try the specific client name selector
    try {
        const clientNameSelector = 'span[data-testid="appt-details-client-name"]';
        console.log(`Trying specific client name selector: ${clientNameSelector}`);
        
        const nameElement = await calendarFrame.$(clientNameSelector);
        if (nameElement) {
            fullName = await nameElement.evaluate(el => el.textContent.trim());
            console.log(`Found client name with specific selector: ${fullName}`);
        } else {
            console.log("Specific client name selector not found");
        }
    } catch (e) {
        console.log("Error with specific client name selector:", e.message);
    }
    
    // If no name found with specific selector, try backup selectors
    if (!fullName) {
        const backupSelectors = [
            '[data-testid="client-name"]',
            '.client-name',
            'span.edit-hidden.edit-appointment:not(:contains("with")):not(:contains("Cut"))',
            'div.appointment-details-client-name'
        ];
        
        for (const selector of backupSelectors) {
            try {
                console.log(`Trying backup selector: ${selector}`);
                const nameElement = await calendarFrame.$(selector);
                if (nameElement) {
                    const nameText = await nameElement.evaluate(el => el.textContent.trim());
                    if (nameText && 
                        !nameText.toLowerCase().includes('payment') && 
                        !nameText.toLowerCase().includes('with') &&
                        !nameText.toLowerCase().includes('cut') &&
                        !nameText.toLowerCase().includes('grooming') &&
                        nameText.length > 2) {
                        fullName = nameText;
                        console.log(`Found client name with backup selector ${selector}: ${fullName}`);
                        break;
                    }
                }
            } catch (e) {
                console.log(`Backup selector ${selector} failed:`, e.message);
            }
        }
    }
    
    // If no name found, use generic name
    if (!fullName) {
        console.log("Could not extract client name from appointment details. Using generic name.");
        fullName = "New Client";
    }
    
    // Parse the full name into first and last name
    let firstName = '';
    let lastName = '';
    
    if (fullName) {
        const nameParts = fullName.trim().split(' ');
        if (nameParts.length >= 2) {
            firstName = nameParts[0];
            lastName = nameParts.slice(1).join(' '); // Join remaining parts as last name
        } else if (nameParts.length === 1) {
            firstName = nameParts[0];
            lastName = ''; // No last name provided
        } else {
            firstName = 'New';
            lastName = 'Client';
        }
    } else {
        firstName = 'New';
        lastName = 'Client';
    }
    
    console.log(`Extracted client name: ${firstName} ${lastName}`);
    return { firstName, lastName };
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

/**
 * Scrapes all appointment elements directly from the main page and processes them.
 * @param {object} page
 * @param {Array} appointmentElements
 * @param {number} userId
 */
async function scrapeAndProcessAppointmentsDirectly(page, appointmentElements, userId) {
    console.log(`Found ${appointmentElements.length} appointment elements on main page.`);
    
    for (const elementHandle of appointmentElements) {
        await processSingleAppointmentDirectly(elementHandle, page, userId);
    }
}

/**
 * Processes a single appointment element directly from main page: clicks, extracts, and creates DB record.
 * @param {object} elementHandle
 * @param {object} page
 * @param {number} userId
 */
async function processSingleAppointmentDirectly(elementHandle, page, userId) {
    try {
        await elementHandle.click();
        await delay(1000);
        for (let attempt = 0; attempt < 2; attempt++) {
            const isEntered = await page.$('a[data-testid="phone-label"]');
            if (isEntered) {
                console.log("Successfully entered appointment details");
                break;
            }
            
            console.log(`Additional click attempt ${attempt + 1}...`);
            await elementHandle.click();
            await delay(1500);
        }
        await extractAndCreateAppointmentDirectly(page, userId);
    } catch (error) {
        console.error("Error processing single appointment:", error);
    }
}

/**
 * Extracts appointment details from the open details modal on main page and creates the appointment in DB.
 * @param {object} page
 * @param {number} userId
 */
async function extractAndCreateAppointmentDirectly(page, userId) {
    try {
        const phoneSelector = 'a[data-testid="phone-label"]';
        await page.waitForSelector(phoneSelector, { visible: true, timeout: 10000 });
        
        const phoneElement = await page.$(phoneSelector);
        let phoneNumber = '';
        if (phoneElement) {
            phoneNumber = await phoneElement.evaluate(el => el.textContent.trim());
            console.log(`Phone Number: ${phoneNumber}`);
        } else {
            console.log("Phone number element not found in details.");
            return;
        }
        
        const { appointmentDate, appointmentStartTime, appointmentEndTime } = await extractDateTimeDirectly(page);
        
        const { appointmentType, barber } = await extractTypeAndBarberDirectly(page);
        
        const { firstName, lastName } = await extractClientNameDirectly(page);
        
        console.log("Looking up client by phone number:", phoneNumber);
        let client = await getClientByPhoneNumber(phoneNumber, userId);
        console.log("Client lookup result:", client);
        
        let clientId;
        
        if (client && client.id) {
            clientId = client.id;
            console.log(`Found existing client with ID: ${clientId}`);
        } else {
            console.log(`No client found with phone number: ${phoneNumber}. Creating new client...`);
            console.log(`Client Name: ${firstName} ${lastName}`);
            
            // Create new client
            const newClient = await createClient(firstName, lastName, phoneNumber, '', '', userId);
            console.log("New client creation result:", newClient);
            
            if (newClient && (newClient.id || newClient.insertId || typeof newClient === 'number')) {
                clientId = newClient.id || newClient.insertId || newClient;
                console.log(`Successfully created new client with ID: ${clientId}`);
            } else {
                console.log("Failed to create new client. Skipping appointment.");
                await closeAppointmentDetailsDirectly(page);
                return;
            }
        }
        
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
        console.log(`Successfully created appointment with client ID: ${clientId}`);
        await closeAppointmentDetailsDirectly(page);
    } catch (error) {
        console.error("Error extracting/creating appointment:", error);
        await closeAppointmentDetailsDirectly(page);
    }
}

/**
 * Extracts date, start time, and end time from the appointment details modal on main page.
 * @param {object} page
 * @returns {Promise<{appointmentDate: string, appointmentStartTime: string, appointmentEndTime: string}>}
 */
async function extractDateTimeDirectly(page) {
    const timeElements = await page.$$('div.appointment-details-date-time');
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
 * Extracts appointment type and barber from the details modal on main page.
 * @param {object} page
 * @returns {Promise<{appointmentType: string, barber: string}>}
 */
async function extractTypeAndBarberDirectly(page) {
    const typeSelector = 'div.appointment-details-name span.edit-hidden.edit-appointment';
    const typeElement = await page.$(typeSelector);
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
 * Extracts client first and last name from the appointment details modal on main page.
 * @param {object} page
 * @returns {Promise<{firstName: string, lastName: string}>}
 */
async function extractClientNameDirectly(page) {
    let fullName = '';
    
    // First try the specific client name selector
    try {
        const clientNameSelector = 'span[data-testid="appt-details-client-name"]';
        console.log(`Trying specific client name selector: ${clientNameSelector}`);
        
        const nameElement = await page.$(clientNameSelector);
        if (nameElement) {
            fullName = await nameElement.evaluate(el => el.textContent.trim());
            console.log(`Found client name with specific selector: ${fullName}`);
        } else {
            console.log("Specific client name selector not found");
        }
    } catch (e) {
        console.log("Error with specific client name selector:", e.message);
    }
    
    // If no name found with specific selector, try backup selectors
    if (!fullName) {
        const backupSelectors = [
            '[data-testid="client-name"]',
            '.client-name',
            'span.edit-hidden.edit-appointment:not(:contains("with")):not(:contains("Cut"))',
            'div.appointment-details-client-name'
        ];
        
        for (const selector of backupSelectors) {
            try {
                console.log(`Trying backup selector: ${selector}`);
                const nameElement = await page.$(selector);
                if (nameElement) {
                    const nameText = await nameElement.evaluate(el => el.textContent.trim());
                    if (nameText && 
                        !nameText.toLowerCase().includes('payment') && 
                        !nameText.toLowerCase().includes('with') &&
                        !nameText.toLowerCase().includes('cut') &&
                        !nameText.toLowerCase().includes('grooming') &&
                        nameText.length > 2) {
                        fullName = nameText;
                        console.log(`Found client name with backup selector ${selector}: ${fullName}`);
                        break;
                    }
                }
            } catch (e) {
                console.log(`Backup selector ${selector} failed:`, e.message);
            }
        }
    }
    
    // If no name found, try to extract from page content
    if (!fullName) {
        try {
            // Look for any text that might be a name near the phone number
            const pageContent = await page.content();
            const phoneRegex = /\+?\d{1,4}[\s\-\(\)]?\d{3,4}[\s\-\(\)]?\d{3,4}[\s\-\(\)]?\d{3,4}/;
            const phoneMatch = pageContent.match(phoneRegex);
            
            if (phoneMatch) {
                // This is a fallback - we'll use generic names if we can't extract the real name
                console.log("Could not extract client name from appointment details. Using generic name.");
                fullName = "New Client";
            }
        } catch (e) {
            console.log("Error extracting client name:", e.message);
            fullName = "New Client";
        }
    }
    
    // Parse the full name into first and last name
    let firstName = '';
    let lastName = '';
    
    if (fullName) {
        const nameParts = fullName.trim().split(' ');
        if (nameParts.length >= 2) {
            firstName = nameParts[0];
            lastName = nameParts.slice(1).join(' '); // Join remaining parts as last name
        } else if (nameParts.length === 1) {
            firstName = nameParts[0];
            lastName = ''; // No last name provided
        } else {
            firstName = 'New';
            lastName = 'Client';
        }
    } else {
        firstName = 'New';
        lastName = 'Client';
    }
    
    console.log(`Extracted client name: ${firstName} ${lastName}`);
    return { firstName, lastName };
}

/**
 * Closes the appointment details modal on main page.
 * @param {object} page
 */
async function closeAppointmentDetailsDirectly(page) {
    try {
        const closeButtonSelector = 'a[data-testid="close-appointment-detail"]';
        await page.waitForSelector(closeButtonSelector, { visible: true, timeout: 5000 });
        await page.click(closeButtonSelector);
        await delay(1000);
    } catch (error) {
        console.log("Failed to close appointment details with Close button, trying Escape key as fallback");
        try {
            await page.keyboard.press('Escape');
            await delay(1000);
        } catch (escapeError) {
            console.log("Failed to close appointment details with Escape key");
        }
    }
}

async function main(userId) {
    let browser;
    try {
        // Connect to persistent browser (skip login)
        console.log("Connecting to persistent browser...");
        browser = await puppeteer.connect({ 
            browserURL: 'http://127.0.0.1:9222', 
            defaultViewport: null 
        });
        
        const pages = await browser.pages();
        // Find existing page or create new one
        let page = pages.find(p => p.url().includes('acuityscheduling.com'));
        if (!page) {
            page = pages.find(p => p.url() !== 'about:blank' && !p.url().startsWith('chrome-extension://'));
            if (!page) {
                console.log('No suitable existing page. Opening new page.');
                page = await browser.newPage();
            }
        }
        await page.bringToFront();
        console.log("Successfully connected to persistent browser");
        
        // Navigate to appointments page if not already there
        console.log("Current URL:", page.url());
        if (!page.url().includes('appointments.php')) {
            console.log("Navigating to appointments page...");
            await page.goto("https://secure.acuityscheduling.com/appointments.php", {
                waitUntil: 'domcontentloaded'
            });
            await delay(3000); // Wait for page to load
        }
        
        // Debug: Log page content and available elements
        console.log("=== DEBUG INFO ===");
        console.log("Current URL:", page.url());
        console.log("Page Title:", await page.title());
        
        // Check what iframes are available
        const iframes = await page.$$eval('iframe', frames => 
            frames.map(frame => ({
                src: frame.src,
                id: frame.id,
                className: frame.className,
                dataTest: frame.getAttribute('data-test'),
                name: frame.name
            }))
        );
        console.log("Available iframes:", JSON.stringify(iframes, null, 2));
        
        // Skip calendar elements check for now to avoid errors
        
        // Check for navigation elements or calendar view options
        const navigationElements = await page.$$eval('a, button, [role="button"]', elements => {
            const relevant = [];
            elements.forEach(el => {
                const text = el.textContent?.toLowerCase() || '';
                const href = el.href || '';
                
                if (text.includes('calendar') || text.includes('schedule') || text.includes('appointment') ||
                    href.includes('calendar') || href.includes('schedule')) {
                    relevant.push({
                        tagName: el.tagName,
                        text: el.textContent?.substring(0, 50),
                        href: el.href,
                        className: el.className
                    });
                }
            });
            return relevant.slice(0, 15); // Show more navigation options
        });
        console.log("Navigation/Calendar links:", JSON.stringify(navigationElements, null, 2));
        
        // Check page source for any hidden scheduling elements
        const pageContent = await page.content();
        const hasSchedulingKeywords = [
            'data-test="scheduling"',
            'scheduling',
            'calendar-view',
            'appointment-calendar'
        ].some(keyword => pageContent.includes(keyword));
        console.log("Page contains scheduling keywords:", hasSchedulingKeywords);
        
        console.log("=== END DEBUG INFO ===");
        
        // Wait a bit more for any dynamic content to load
        console.log("Waiting for dynamic content to load...");
        await delay(5000);
        
        // Check for iframes again after waiting
        const iframesAfterWait = await page.$$eval('iframe', frames => 
            frames.map(frame => ({
                src: frame.src,
                id: frame.id,
                className: frame.className,
                dataTest: frame.getAttribute('data-test'),
                name: frame.name
            })).filter(frame => 
                frame.dataTest === 'scheduling' || 
                frame.src.includes('calendar') || 
                frame.src.includes('scheduling')
            )
        );
        console.log("Scheduling-related iframes after wait:", JSON.stringify(iframesAfterWait, null, 2));
        
        // Try to find appointments directly on the main page (not in iframe)
        console.log("Looking for appointments directly on main page...");
        
        // Check for appointment elements directly on the page
        const appointmentSelectors = [
            'div.timeslot.appointment',
            '.appointment',
            '[data-testid*="appointment"]',
            '.calendar-appointment',
            '.appointment-slot',
            '[class*="appointment"]',
            '[class*="timeslot"]'
        ];
        
        let appointmentElements = [];
        let foundSelector = null;
        
        for (const selector of appointmentSelectors) {
            try {
                console.log(`Trying appointment selector: ${selector}`);
                await page.waitForSelector(selector, { visible: true, timeout: 3000 });
                appointmentElements = await page.$$(selector);
                if (appointmentElements.length > 0) {
                    foundSelector = selector;
                    console.log(`Found ${appointmentElements.length} appointments with selector: ${selector}`);
                    break;
                }
            } catch (e) {
                console.log(`Selector ${selector} not found or timed out`);
            }
        }
        
        if (appointmentElements.length > 0) {
            console.log(`\n=== APPOINTMENT SUMMARY ===`);
            console.log(`📅 TOTAL APPOINTMENTS FOUND ON CALENDAR: ${appointmentElements.length}`);
            console.log(`🔄 Starting to process appointments...`);
            console.log(`===============================\n`);
            await scrapeAndProcessAppointmentsDirectly(page, appointmentElements, userId);
            console.log(`\n=== PROCESSING COMPLETE ===`);
            console.log(`✅ Finished processing ${appointmentElements.length} appointments`);
            console.log(`===============================\n`);
        } else {
            console.log("No appointments found on main page either. Let's try the iframe approach as fallback.");
            const calendarFrame = await getCalendarFrame(page);
            await scrapeAndProcessAppointments(calendarFrame, userId);
        }
    } catch (error) {
        console.error("Error in main flow:", error);
    } finally {
        if (browser) {
            await delay(2000);
            // Use disconnect for persistent browser
            try {
                await browser.disconnect();
                console.log("Browser disconnected");
            } catch (e) {
                console.log("Error disconnecting browser:", e.message);
            }
        }
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
    extractClientName,
    closeAppointmentDetails,
    scrapeAndProcessAppointmentsDirectly,
    processSingleAppointmentDirectly,
    extractAndCreateAppointmentDirectly,
    extractDateTimeDirectly,
    extractTypeAndBarberDirectly,
    extractClientNameDirectly,
    closeAppointmentDetailsDirectly
};