const puppeteer = require('puppeteer');
const dotenv = require('dotenv')
dotenv.config({path : '../../.env'})
const moment = require('moment');
const {createAppointment} = require('../model/appointment')
const {getClientByPhoneNumber, createClient} = require('../model/clients')

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function workingScraper() {
    let browser;
    const userId = 67;
    let targetFrame;
    
    try {
        console.log("🔌 Connecting to persistent browser...");
        
        // Use the working connection method from our debug
        browser = await puppeteer.connect({
            browserURL: 'http://127.0.0.1:9222',
            defaultViewport: null
        });
        
        console.log("✅ Connected successfully!");
        
        const pages = await browser.pages();
        console.log(`Found ${pages.length} pages`);
        
        // Get or create a working page (avoid devtools pages)
        let page = pages.find(p => 
            !p.url().startsWith('devtools://') && 
            !p.url().startsWith('chrome://') &&
            !p.url().startsWith('chrome-extension://')
        );
        
        if (page) {
            await page.bringToFront();
            console.log(`Using existing page: ${page.url()}`);
        } else {
            console.log('Creating new page');
            page = await browser.newPage();
        }
        
        console.log(`Current URL: ${page.url()}`);
        
        // Navigate to clients page (with proper iframe loading)
        await page.goto("https://shallot-lion-7exn.squarespace.com/config/scheduling/admin/clients", { waitUntil: 'networkidle0' });
        console.log("Navigated to clients page.");
        await delay(3000); // Wait for iframe to fully load

        // Frame handling logic (exactly like getClientsSquarespace)
        console.log("Attempting to find clients directly on the page first...");
        targetFrame = page; // Assume no iframe initially
        let clientElementsDirect = await targetFrame.$$('td.lastName'); // Using same selector as getClientsSquarespace

        if (clientElementsDirect.length === 0) {
            console.log("No clients found directly, checking for iframes...");
            const frames = await page.frames();
            console.log(`Total frames: ${frames.length}`);

            for (let frame of frames) {
                console.log(`Checking frame: ${frame.url()}`);
                try {
                    // Look specifically for the scheduling-service iframe
                    if (frame.url().includes('scheduling-service')) {
                        console.log(`Found scheduling-service iframe: ${frame.url()}`);
                        // Wait a bit for the iframe content to load
                        await delay(2000);
                        // Verify it has client elements
                        const clientElements = await frame.$$('td.lastName');
                        if (clientElements.length > 0) {
                            console.log(`✅ Confirmed clients in scheduling-service iframe: ${clientElements.length} clients`);
                            targetFrame = frame;
                            break;
                        } else {
                            console.log(`⚠️ Scheduling-service iframe found but no clients yet, waiting...`);
                            await delay(3000);
                            const clientElementsRetry = await frame.$$('td.lastName');
                            if (clientElementsRetry.length > 0) {
                                console.log(`✅ Clients loaded after retry: ${clientElementsRetry.length} clients`);
                                targetFrame = frame;
                                break;
                            }
                        }
                    }
                    
                    // Fallback: check any frame for client elements
                    const clientElements = await frame.$$('td.lastName');
                    if (clientElements.length > 0) {
                        console.log(`Found clients in frame: ${frame.url()}`);
                        targetFrame = frame;
                        break;
                    }
                } catch (error) {
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
        } else {
            console.log('Could not find client list container (neither directly nor in iframe). Aborting scrape.');
            await page.screenshot({ path: 'no_clients_debug.png', fullPage: true });
            console.log("📸 Screenshot saved: no_clients_debug.png");
            return;
        }

        // Use the exact same logic as getClientsSquarespace
        const clientSelector = 'td.lastName'; // Same selector as getClientsSquarespace
        await targetFrame.waitForSelector(clientSelector, { timeout: 30000 });

        // Scroll to load all clients (optimized for speed)
        console.log("📜 Scrolling to load all clients...");
        let previousHeight;
        let scrollAttempts = 0;
        const maxScrollAttempts = 10; // Prevent infinite scrolling
        
        while (scrollAttempts < maxScrollAttempts) {
            previousHeight = await targetFrame.evaluate('document.body.scrollHeight');
            await targetFrame.evaluate('window.scrollTo(0, document.body.scrollHeight)');
            
            // Wait for new content to load (optimized)
            await targetFrame.waitForFunction((prevHeight) => {
                return document.body.scrollHeight > prevHeight;
            }, { timeout: 3000 }, previousHeight).catch(() => {
                // If no new content loads, that's fine - we've reached the end
            });
            
            const newHeight = await targetFrame.evaluate('document.body.scrollHeight');
            scrollAttempts++;
            
            if (newHeight === previousHeight) {
                console.log("✅ Finished loading all clients");
                break;
            }
            console.log(`Scrolling... (${scrollAttempts}/${maxScrollAttempts})`);
        }

        const clientLinksCount = await targetFrame.$$eval(clientSelector, links => links.length);
        console.log(`✅ Found ${clientLinksCount} clients after scrolling.`);

        if (clientLinksCount === 0) {
            console.log("No client links found even after scrolling.");
            return;
        }
        
        // Start from index 568 (hardcoded)
        const startIndex = 568;
        let processedCount = 0;
        let appointmentsCreated = 0;
        let clientsCreated = 0;

        console.log(`🚀 Starting from client ${startIndex + 1}/${clientLinksCount}...`);
        
        // Start timing
        const startTime = Date.now();
        console.log(`⏱️  Starting timer at: ${new Date().toLocaleTimeString()}`);
        
        // Add retry click function (from getClientsSquarespace)
        async function retryClick(element, maxAttempts = 3, delayMs = 1000) {
            for (let attempt = 1; attempt <= maxAttempts; attempt++) {
                try {
                    await element.click();
                    console.log(`Click successful on attempt ${attempt}`);
                    return true;
                } catch (error) {
                    console.log(`Click attempt ${attempt} failed: ${error.message}`);
                    if (attempt < maxAttempts) {
                        console.log(`Retrying click in ${delayMs}ms...`);
                        await delay(delayMs);
                    } else {
                        console.log(`All ${maxAttempts} click attempts failed`);
                        throw error;
                    }
                }
            }
            return false;
        }

        // Process clients starting from index 568
        for (let i = startIndex; i < clientLinksCount; i++) {
            try {
                console.log(`\n--- Processing client ${i + 1}/${clientLinksCount} ---`);
                
                // Always refresh the client links to avoid DOM detachment
                await targetFrame.waitForSelector(clientSelector, { visible: true, timeout: 10000 });
                const clientLinks = await targetFrame.$$(clientSelector);
                
                if (clientLinks[i]) {
                    console.log(`Attempting to click client link ${i + 1}/${clientLinksCount}`);
                    
                    // Use evaluate to click by index to avoid detachment issues
                    await targetFrame.evaluate((index) => {
                        const links = document.querySelectorAll('td.lastName');
                        if (links[index]) {
                            links[index].click();
                            return true;
                        }
                        return false;
                    }, i);
                    
                    console.log(`Successfully clicked client link ${i + 1}/${clientLinksCount}`);
                } else {
                    console.log(`Client link at index ${i} not found, skipping.`);
                    continue;
                }

                // Wait for details to load with shorter timeout
                await targetFrame.waitForSelector(".appointment-item", { timeout: 5000 });

                const clientName = await targetFrame.$eval(".field-rendered.edit-client", el => el.innerText);
                const clientNumber = await targetFrame.$eval("a.real-link[data-testid='added-client-phone']", el => el.innerText);

                console.log(`📋 Client: ${clientName}`);
                console.log(`📞 Phone: ${clientNumber}`);

                // Get initial appointment count
                let appointments = await targetFrame.$$(".appointment-item");
                const totalAppointments = appointments.length;
                console.log(`Appointments found: ${totalAppointments}`);

                // Process ALL appointments for this client (re-query elements each time to avoid detachment)
                for (let j = 0; j < totalAppointments; j++) {
                    console.log(`  Processing appointment ${j + 1}/${totalAppointments}:`);
                    
                    try {
                        // Re-query appointments each time to avoid DOM detachment issues
                        appointments = await targetFrame.$$(".appointment-item");
                        if (j >= appointments.length) {
                            console.log(`    ⚠️  Appointment ${j + 1} no longer exists, skipping`);
                            continue;
                        }
                        const appointmentElement = appointments[j];
                        // Extract basic appointment data
                        const [startTime, endTime, dateOfAppointment, typeOfAppointment] = await Promise.all([
                            appointmentElement.$eval(".start-time", el => el.innerText),
                            appointmentElement.$eval(".end-time", el => el.innerText),
                            appointmentElement.$eval("a[data-testid='docket-appointment-detail-link']", el => el.innerText),
                            appointmentElement.$eval(".appointment-type-name", el => el.innerText)
                        ]);
                        
                        const cleanedTypeOfAppointment = typeOfAppointment.replace(/[\n\t]/g, '').trim();

                        // Date/Time Formatting
                        const startTimeMilitary = moment(startTime, ["h:mm A"]).format("HH:mm");
                        const endTimeMilitary = moment(endTime, ["h:mm A"]).format("HH:mm");
                        const dateOfAppointmentFormatted = moment(dateOfAppointment, "dddd, MMMM D, YYYY").format("YYYY-MM-DD");

                        // Extract price by clicking into appointment details (with proper close button)
                        let appointmentPrice = null;
                        try {
                            // Use evaluate to click the detail link to avoid detachment
                            const clickedDetail = await appointmentElement.evaluate((element) => {
                                const detailLink = element.querySelector("a[data-testid='docket-appointment-detail-link']");
                                if (detailLink) {
                                    detailLink.click();
                                    return true;
                                }
                                return false;
                            });
                            
                            if (clickedDetail) {
                                // Wait for price element to be available (optimized)
                                try {
                                    await targetFrame.waitForSelector("span.payment-price[data-testid='payment-price-text']", { visible: true, timeout: 2000 });
                                } catch (priceWaitError) {
                                    // If price element doesn't appear quickly, continue anyway
                                }
                                
                                // Try to get price quickly
                                try {
                                    const priceElement = await targetFrame.$("span.payment-price[data-testid='payment-price-text']");
                                    if (priceElement) {
                                        const priceText = await priceElement.evaluate(el => el.innerText);
                                        appointmentPrice = parseFloat(priceText.replace(/[^0-9.]/g, '')) || null;
                                    }
                                } catch (priceError) {
                                    // Silent fail for price extraction
                                }
                                
                                // Use the specific close button you provided
                                try {
                                    await targetFrame.waitForSelector('a.detail-nav-link.btn.btn-inverse.hidden-print[data-testid="appt-details-close-btn"]', { visible: true, timeout: 3000 });
                                    await targetFrame.click('a.detail-nav-link.btn.btn-inverse.hidden-print[data-testid="appt-details-close-btn"]');
                                    // Wait for appointment list to be ready again (optimized)
                                    await targetFrame.waitForSelector('.appointment-item', { visible: true, timeout: 3000 });
                                } catch (closeError) {
                                    // Fallback: try generic close button
                                    try {
                                        await targetFrame.click('a.detail-nav-link.btn.btn-inverse.hidden-print');
                                        // Wait for appointment list to be ready again (optimized)
                                        await targetFrame.waitForSelector('.appointment-item', { visible: true, timeout: 3000 });
                                    } catch (fallbackError) {
                                        // Last resort: Escape key
                                        await targetFrame.keyboard.press('Escape');
                                        // Wait for appointment list to be ready again (optimized)
                                        await targetFrame.waitForSelector('.appointment-item', { visible: true, timeout: 2000 });
                                    }
                                }
                            }
                        } catch (priceExtractionError) {
                            // Silent fail for price extraction
                        }

                        console.log(`    📅 ${dateOfAppointmentFormatted} ${startTimeMilitary}-${endTimeMilitary} | ${cleanedTypeOfAppointment} | $${appointmentPrice || 'N/A'}`);

                        // Get or create client (only once per client, not per appointment)
                        let client;
                        if (j === 0) { // Only check/create client on first appointment
                            client = await getClientByPhoneNumber(clientNumber, userId);
                            
                            if (client && client.id) {
                                console.log(`    ✅ Client found in database: ID ${client.id}`);
                                // Store client for reuse in other appointments (use a more persistent storage)
                                global.currentClientData = client;
                            } else {
                                console.log("    ❌ Client not found in database, creating new client...");
                                // Parse client name from the scraped data
                                const nameParts = clientName.trim().split(' ');
                                const firstName = nameParts[0] || '';
                                const lastName = nameParts.slice(1).join(' ') || '.'; // Use '.' if no last name
                                
                                try {
                                    const newClientId = await createClient(firstName, lastName, clientNumber, '', '', userId);
                                    client = { id: newClientId };
                                    global.currentClientData = client;
                                    clientsCreated++;
                                    console.log(`    ✅ New client created with ID: ${newClientId}`);
                                } catch (createError) {
                                    console.log(`    ❌ Error creating client: ${createError.message}`);
                                    break; // Skip all appointments for this client if we can't create them
                                }
                            }
                        } else {
                            // Reuse client from global storage for subsequent appointments
                            client = global.currentClientData;
                        }

                        // Create appointment if we have a valid client
                        if (client && client.id) {
                            try {
                                const appointment = await createAppointment(
                                    cleanedTypeOfAppointment, 
                                    null, 
                                    dateOfAppointmentFormatted, 
                                    startTimeMilitary, 
                                    endTimeMilitary, 
                                    client.id, 
                                    "", 
                                    appointmentPrice, 
                                    null, 
                                    null, 
                                    null, 
                                    null, 
                                    userId
                                );
                                appointmentsCreated++;
                                console.log(`    📝 ✅ Appointment created successfully in database!`);
                            } catch (appointmentError) {
                                console.log(`    ❌ Error creating appointment: ${appointmentError.message}`);
                            }
                        }

                    } catch (appointmentError) {
                        console.log(`    ❌ Error processing appointment ${j + 1}: ${appointmentError.message}`);
                        continue; // Skip this appointment and continue with the next one
                    }
                }

                // Navigate back to client list
                try {
                    console.log(`  ⬅️ Navigating back to client list...`);
                    await targetFrame.waitForSelector("a.btn.btn-inverse.btn-top.btn-detail-back.hidden-print", { visible: true, timeout: 10000 });
                    const backButton = await targetFrame.$("a.btn.btn-inverse.btn-top.btn-detail-back.hidden-print");
                    if (backButton) {
                        await retryClick(backButton, 3, 1000);
                        console.log(`  ✅ Successfully navigated back to client list`);
                    } else {
                        await targetFrame.click("a.btn.btn-inverse.btn-top.btn-detail-back.hidden-print");
                    }
                    await delay(1000); // Brief pause after navigation
                } catch (navError) {
                    console.log(`  ⚠️ Navigation error: ${navError.message}`);
                    // Try alternative navigation
                    try {
                        await targetFrame.goBack({ waitUntil: 'networkidle0' });
                    } catch (backError) {
                        console.log(`  ⚠️ Back navigation also failed: ${backError.message}`);
                    }
                }

                processedCount++;
                
                // Progress update every 10 clients
                if (processedCount % 10 === 0) {
                    console.log(`\n📊 Progress: ${processedCount} clients processed, ${appointmentsCreated} appointments created, ${clientsCreated} new clients created`);
                }

            } catch (error) {
                console.log(`❌ Error processing client at index ${i}: ${error.message}`);
                
                // Try to navigate back to client list
                try {
                    console.log("Attempting to navigate back to client list...");
                    await targetFrame.goBack({ waitUntil: 'networkidle0' });
                } catch (navError) {
                    console.log(`⚠️ Recovery failed: ${navError.message}`);
                }
                
                await delay(3000); // Longer delay after error
                continue;
            }
        }

        // Final timing results
        const endTime = Date.now();
        const totalTime = (endTime - startTime) / 1000; // Convert to seconds
        const avgTimePerClient = totalTime / processedCount;
        const remainingClients = clientLinksCount - startIndex;
        const estimatedTotalTime = (avgTimePerClient * remainingClients) / 60; // Convert to minutes

        console.log(`\n⏱️  TIMING RESULTS:`);
        console.log(`📊 Total time: ${totalTime.toFixed(2)} seconds`);
        console.log(`📊 Average per client: ${avgTimePerClient.toFixed(2)} seconds`);
        console.log(`📊 Estimated time for remaining ${remainingClients} clients: ${estimatedTotalTime.toFixed(1)} minutes`);
        console.log(`🎉 SUCCESS! Processed ${processedCount} clients with all their appointments!`);
        console.log(`📈 Created ${appointmentsCreated} appointments and ${clientsCreated} new clients`);
        console.log("Full scraping completed successfully!");

    } catch (error) {
        console.error("❌ Major error in workingScraper:", error);
    } finally {
        if (browser) {
            await browser.disconnect();
            console.log("🔌 Disconnected (browser stays open)");
        }
    }
}

// Run the scraper
workingScraper().catch(console.error);

module.exports = { workingScraper }; 