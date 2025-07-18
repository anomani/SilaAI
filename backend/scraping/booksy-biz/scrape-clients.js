// This function will scrape clients as well as all their appointments, it will be a one time thing i will run to transfer data form booksy to my database

const puppeteer = require('puppeteer');
const path = require('path');

// Load environment variables from the correct path
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { createClient } = require('../../src/model/clients');
const dbUtils = require('../../src/model/dbUtils');

// Simple function to extract appointments from client page
async function extractAppointments(page, clientName) {
    console.log(`\n=== EXTRACTING APPOINTMENTS FOR: ${clientName} ===`);
    
    // Wait for page to load
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Try to click appointments tab first
    const appointmentTabSelectors = [
        '[data-testid="appointments-tab"]',
        'button:contains("APPOINTMENTS")',
        '[role="tab"]:contains("APPOINTMENTS")'
    ];
    
    for (const selector of appointmentTabSelectors) {
        try {
            await page.waitForSelector(selector, { visible: true, timeout: 3000 });
            await page.click(selector);
            console.log(`✅ Clicked appointments tab with selector: ${selector}`);
            await new Promise(resolve => setTimeout(resolve, 2000));
            break;
        } catch (e) {
            console.log(`❌ Appointments tab selector failed: ${selector}`);
        }
    }
    
    // Check for and click "More appointments" button to load all appointments
    let moreButtonClicked = true;
    let clickCount = 0;
    const maxClicks = 10; // Prevent infinite loop
    
    while (moreButtonClicked && clickCount < maxClicks) {
        moreButtonClicked = false;
        try {
            // Look for "More appointments" button
            const moreButton = await page.$('.list_more_J3y6g');
            if (moreButton) {
                const buttonText = await page.evaluate(el => el.textContent, moreButton);
                console.log(`🔄 Found "More appointments" button: ${buttonText}`);
                
                await moreButton.click();
                console.log(`✅ Clicked "More appointments" button (click ${clickCount + 1})`);
                
                // Wait for more appointments to load
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                moreButtonClicked = true;
                clickCount++;
            } else {
                console.log(`✅ No more "More appointments" button found. All appointments should be loaded.`);
            }
        } catch (e) {
            console.log(`❌ Error clicking "More appointments" button:`, e.message);
            break;
        }
    }
    
    if (clickCount > 0) {
        console.log(`📈 Clicked "More appointments" button ${clickCount} times to load all appointments`);
    }
    
    // Extract appointments using the specific selectors
    const appointments = await page.evaluate(() => {
        const appointments = [];
        
        // Look for appointment elements using the provided selectors
        const monthElements = document.querySelectorAll('.appointment-date_month_nFAjw');
        const dayElements = document.querySelectorAll('.appointment-date_day_zpfF4');
        const timeElements = document.querySelectorAll('.appointment-date_hour_isz2C');
        const serviceElements = document.querySelectorAll('.appointment-service_serviceHeader_qO6qz');
        const priceElements = document.querySelectorAll('.appointment_total_tXjTE');
        
        console.log(`Found ${monthElements.length} month elements`);
        console.log(`Found ${dayElements.length} day elements`);
        console.log(`Found ${timeElements.length} time elements`);
        console.log(`Found ${serviceElements.length} service elements`);
        console.log(`Found ${priceElements.length} price elements`);
        
        // Extract appointment data
        const maxElements = Math.max(monthElements.length, dayElements.length, timeElements.length, serviceElements.length, priceElements.length);
        
        for (let i = 0; i < maxElements; i++) {
            const month = monthElements[i]?.textContent?.trim();
            const day = dayElements[i]?.textContent?.trim();
            const time = timeElements[i]?.textContent?.trim();
            const service = serviceElements[i]?.textContent?.trim();
            const price = priceElements[i]?.textContent?.trim();
            
            // Only include appointments that have at least date and time
            if (month && day && time) {
                appointments.push({
                    month: month,
                    day: day,
                    time: time,
                    service: service || 'Unknown Service',
                    price: price || '$0.00',
                    date: `${month} ${day}`,
                    fullDateTime: `${month} ${day} at ${time}`,
                    fullDetails: `${month} ${day} at ${time} - ${service || 'Unknown Service'} - ${price || '$0.00'}`
                });
            }
        }
        
        return appointments;
    });
    
    console.log(`\n📅 FOUND ${appointments.length} APPOINTMENTS:`);
    appointments.forEach((appt, index) => {
        console.log(`${index + 1}. ${appt.fullDetails}`);
    });
    
    return appointments;
}

async function scrapeClients() {
    let browser;
    
    try {
        // Initialize database connection first
        console.log('Initializing database connection...');
        dbUtils.connect();
        
        // Wait a moment for the connection to establish
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        console.log('Connecting to persistent Chrome browser...');
        
        // Connect to the existing browser session
        browser = await puppeteer.connect({ 
            browserURL: 'http://127.0.0.1:9222', 
            defaultViewport: null 
        });
        
        console.log('Connected to browser successfully');
        
        // Find a suitable page or create a new one
        const pages = await browser.pages();
        console.log(`Found ${pages.length} existing pages`);
        
        let page = pages.find(p => p.url().includes('booksy.com'));
        if (!page) {
            // Look for a non-extension, non-blank page
            page = pages.find(p => p.url() !== 'about:blank' && !p.url().startsWith('chrome-extension://'));
            if (page) {
                console.log(`Found existing page: ${page.url()}. Navigating to Booksy customers.`);
            } else {
                console.log('No suitable existing page. Opening new page.');
                page = await browser.newPage();
            }
        } else {
            console.log(`Found existing Booksy page: ${page.url()}`);
        }
        
        await page.bringToFront();
        
        // Navigate to Booksy customers page
        console.log('Navigating to Booksy customers page...');
        await page.goto('https://booksy.com/pro/en-us/1517102/customers', { 
            waitUntil: 'domcontentloaded' 
        });
        
        console.log('Navigation completed');
        console.log('Current URL:', await page.url());
        console.log('Page title:', await page.title());
        
        
        // Log current state after potential login
        console.log('Final URL:', await page.url());
        console.log('Final page title:', await page.title());
        
        // Wait a moment for the page to fully load
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Find all client elements on the page
        console.log('Looking for client elements on the page...');
        
        // More specific selectors for Booksy client list items
        const clientSelectors = [
            '[data-testid="customer-el-list-item"]',
            '.customer-el-list_searchItem_mnR8f',
            '[data-index]',
            '.customer-el-list_active_ffoQG'
        ];
        
        let clientElements = [];
        
        for (const selector of clientSelectors) {
            try {
                console.log(`Trying selector: ${selector}`);
                const elements = await page.$$(selector);
                if (elements.length > 0) {
                    console.log(`✅ Found ${elements.length} elements with selector: ${selector}`);
                    clientElements = elements;
                    break;
                }
            } catch (e) {
                console.log(`❌ Selector ${selector} failed`);
            }
        }
        
        if (clientElements.length === 0) {
            console.log('No client elements found with specific selectors. Trying broader search...');
            
            // Try to find client list container and get all its children
            const containerSelectors = [
                '.customer-el-list_list_BF6oE',
                '.customer-list',
                '[class*="customer-list"]'
            ];
            
            for (const containerSelector of containerSelectors) {
                try {
                    console.log(`Trying container selector: ${containerSelector}`);
                    const container = await page.$(containerSelector);
                    if (container) {
                        clientElements = await container.$$('> *'); // Direct children
                        console.log(`✅ Found ${clientElements.length} child elements in container`);
                        break;
                    }
                } catch (e) {
                    console.log(`❌ Container selector ${containerSelector} failed`);
                }
            }
        }
        
        if (clientElements.length === 0) {
            console.log('Still no client elements found. Let me check the page structure...');
            
            // Get the main content area
            const bodyText = await page.evaluate(() => {
                // Look for text patterns that might indicate client names
                const allText = document.body.textContent;
                const lines = allText.split('\n').filter(line => line.trim().length > 0);
                return lines.slice(0, 50); // First 50 non-empty lines
            });
            
            console.log('Page content lines:', bodyText);
            return;
        }
        
        console.log(`Found ${clientElements.length} potential client elements`);
        
        // Extract client data from each element
        const clients = [];
        
        // TESTING: Only process the first client for now
        const elementsToProcess = Math.min(clientElements.length, 1);
        console.log(`\n=== TESTING MODE: Processing only the first client ===`);
        
        for (let i = 0; i < elementsToProcess; i++) {
            const element = clientElements[i];
            
            try {
                // Extract client information with more specific patterns
                const clientData = await page.evaluate(el => {
                    const text = el.textContent || '';
                    
                    // Look for name in the element's structure
                    let firstName = null, lastName = null, phoneNumber = null;
                    
                    // Try to find name from title attribute or specific elements
                    const avatarEl = el.querySelector('[title]');
                    if (avatarEl) {
                        const titleText = avatarEl.getAttribute('title');
                        const nameMatch = titleText.match(/^([A-Za-z]+)\s+([A-Za-z]+)$/);
                        if (nameMatch) {
                            firstName = nameMatch[1];
                            lastName = nameMatch[2];
                        }
                    }
                    
                    // If no name from title, try from text content
                    if (!firstName) {
                        // Look for name pattern in clean text
                        const cleanText = text.replace(/\s+/g, ' ').trim();
                        const nameMatch = cleanText.match(/^([A-Za-z]+)\s+([A-Za-z]+)/);
                        if (nameMatch) {
                            firstName = nameMatch[1];
                            lastName = nameMatch[2];
                        }
                    }
                    
                    // Look for phone number patterns
                    const phoneMatch = text.match(/(\+?1?\s*\(?[2-9][0-9]{2}\)?[-.\s]*[0-9]{3}[-.\s]*[0-9]{4})/);
                    if (phoneMatch) {
                        phoneNumber = phoneMatch[1];
                    }
                    
                    return {
                        fullText: text.replace(/\s+/g, ' ').trim(),
                        firstName: firstName,
                        lastName: lastName,
                        phoneNumber: phoneNumber,
                        rawHTML: el.outerHTML.substring(0, 300)
                    };
                }, element);
                
                console.log(`\n--- Client Element ${i + 1} ---`);
                console.log('Extracted data:', clientData);
                
                if (clientData.firstName && clientData.lastName) {
                    clients.push(clientData);
                }
                
            } catch (e) {
                console.error(`Error processing element ${i + 1}:`, e.message);
            }
        }
        
        console.log(`\n=== SUMMARY ===`);
        console.log(`Found ${clients.length} clients with extractable data:`);
        clients.forEach((client, index) => {
            console.log(`${index + 1}. ${client.firstName} ${client.lastName} - ${client.phoneNumber || 'No phone'}`);
        });
        
        // Now click on each client to get their detailed information including phone numbers
        console.log('\n=== EXTRACTING DETAILED CLIENT INFORMATION ===');
        
        const detailedClients = [];
        
        // Get all client elements fresh each time (to avoid stale references)
        // TESTING: Only process the first client for detailed extraction
        const clientsToProcess = Math.min(clientElements.length, 1);
        console.log(`\n=== TESTING MODE: Processing only the first ${clientsToProcess} client(s) for detailed extraction ===`);
        
        for (let i = 0; i < clientsToProcess; i++) {
            console.log(`\nProcessing client element ${i + 1} of ${clientsToProcess}...`);
            
            try {
                // Get fresh elements each time to avoid stale references
                const freshClientElements = await page.$$('[data-testid="customer-el-list-item"]');
                
                if (i >= freshClientElements.length) {
                    console.log(`No more client elements available at index ${i}`);
                    break;
                }
                
                const currentElement = freshClientElements[i];
                
                // Get the client name from the current element
                const basicClientInfo = await page.evaluate(el => {
                    const titleEl = el.querySelector('[title]');
                    if (titleEl) {
                        const titleText = titleEl.getAttribute('title');
                        const nameMatch = titleText.match(/^([A-Za-z]+)\s+([A-Za-z]+)$/);
                        if (nameMatch) {
                            return {
                                firstName: nameMatch[1],
                                lastName: nameMatch[2],
                                fullName: titleText
                            };
                        }
                    }
                    return null;
                }, currentElement);
                
                if (!basicClientInfo) {
                    console.log(`Could not extract name from element ${i + 1}, skipping...`);
                    continue;
                }
                
                console.log(`Found client: ${basicClientInfo.fullName}`);
                console.log(`Clicking on ${basicClientInfo.fullName}...`);
                
                // Click on the client element
                await currentElement.click();
                
                // Wait for the client details page to load
                console.log('Waiting for client details to load...');
                await new Promise(resolve => setTimeout(resolve, 3000));
                
                // Extract detailed information from the client details page
                const detailedInfo = await page.evaluate(() => {
                    const bodyText = document.body.textContent;
                    
                    // Look for phone number patterns in the page
                    const phoneMatches = bodyText.match(/(\+?1?\s*\(?[2-9][0-9]{2}\)?[-.\s]*[0-9]{3}[-.\s]*[0-9]{4})/g);
                    let phoneNumber = null;
                    
                    if (phoneMatches && phoneMatches.length > 0) {
                        // Filter out obvious non-phone numbers and take the first valid one
                        phoneNumber = phoneMatches.find(phone => {
                            const cleanPhone = phone.replace(/\D/g, '');
                            return cleanPhone.length >= 10 && cleanPhone.length <= 11;
                        });
                    }
                    
                    // Also look for email patterns
                    const emailMatch = bodyText.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
                    const email = emailMatch ? emailMatch[1] : '';
                    
                    return {
                        phoneNumber: phoneNumber || '',
                        email: email,
                        pageTitle: document.title,
                        currentUrl: window.location.href
                    };
                });
                
                console.log(`Extracted details for ${basicClientInfo.fullName}:`);
                console.log(`- Phone: ${detailedInfo.phoneNumber || 'Not found'}`);
                console.log(`- Email: ${detailedInfo.email || 'Not found'}`);
                
                // Extract appointments for this client
                await extractAppointments(page, basicClientInfo.fullName);
                
                detailedClients.push({
                    firstName: basicClientInfo.firstName,
                    lastName: basicClientInfo.lastName,
                    phoneNumber: detailedInfo.phoneNumber,
                    email: detailedInfo.email,
                    notes: 'Imported from Booksy'
                });
                
                // Navigate back to the client list for the next iteration
                console.log('Navigating back to client list...');
                await page.goto('https://booksy.com/pro/en-us/1517102/customers', { 
                    waitUntil: 'domcontentloaded' 
                });
                
                // Wait for the page to reload
                await new Promise(resolve => setTimeout(resolve, 3000));
                
            } catch (error) {
                console.error(`Error processing client at index ${i}:`, error.message);
                
                // Try to navigate back to the client list in case of error
                try {
                    await page.goto('https://booksy.com/pro/en-us/1517102/customers', { 
                        waitUntil: 'domcontentloaded' 
                    });
                    await new Promise(resolve => setTimeout(resolve, 2000));
                } catch (navError) {
                    console.error('Failed to navigate back to client list:', navError.message);
                }
            }
        }
        
        // Now create all clients in the database
        console.log('\n=== CREATING CLIENTS IN DATABASE ===');
        const user_id = 133;
        const createdClients = [];
        
        for (const client of detailedClients) {
            try {
                console.log(`Creating client: ${client.firstName} ${client.lastName}`);
                
                const clientId = await createClient(
                    client.firstName,
                    client.lastName,
                    client.phoneNumber,
                    client.email,
                    client.notes,
                    user_id
                );
                
                createdClients.push({
                    id: clientId,
                    ...client
                });
                
                console.log(`✅ Successfully created client ID: ${clientId}`);
                
            } catch (error) {
                console.error(`❌ Error creating client ${client.firstName} ${client.lastName}:`, error.message);
            }
        }
        
        console.log('\n=== FINAL RESULTS ===');
        console.log(`Successfully extracted ${detailedClients.length} clients from Booksy:`);
        detailedClients.forEach((client, index) => {
            console.log(`${index + 1}. ${client.firstName} ${client.lastName} - ${client.phoneNumber || 'No phone'} - ${client.email || 'No email'}`);
        });
        
        console.log(`\nSuccessfully created ${createdClients.length} clients in database:`);
        createdClients.forEach((client, index) => {
            console.log(`${index + 1}. ID: ${client.id} - ${client.firstName} ${client.lastName} - ${client.phoneNumber || 'No phone'}`);
        });
        
        
    } catch (error) {
        console.error('Error in scrapeClients:', error);
    } finally {
        if (browser) {
            console.log('Disconnecting from browser (keeping it open)...');
            await browser.disconnect();
        }
        
        // Close database connection
        dbUtils.closeDB();
    }
}

// Run the script
scrapeClients().catch(console.error);

