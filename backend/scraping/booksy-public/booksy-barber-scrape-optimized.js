const puppeteer = require('puppeteer');
const fs = require('fs');

// Global variable to store scraped data for emergency saves
let globalScrapedData = [];

// Function to save data to CSV with error handling
function saveToCSV(data, filename) {
    try {
        const headers = ['Name', 'Phone', 'Social Media'];
        const csvContent = [
            headers.join(','),
            ...data.map(row => [
                `"${(row.name || '').replace(/"/g, '""')}"`,
                `"${(row.phone || '').replace(/"/g, '""')}"`,
                `"${(row.socialMedia || '').replace(/"/g, '""')}"`
            ].join(','))
        ].join('\n');
        
        fs.writeFileSync(filename, csvContent);
        console.log(`✅ Data saved to ${filename} (${data.length} entries)`);
        return true;
    } catch (error) {
        console.error(`❌ Error saving CSV: ${error.message}`);
        return false;
    }
}

// Emergency save function
function emergencySave(reason = 'unknown') {
    console.log(`\n🚨 Emergency save triggered due to: ${reason}`);
    if (globalScrapedData.length > 0) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const emergencyFilename = `barbershop-data-emergency-${timestamp}.csv`;
        const success = saveToCSV(globalScrapedData, emergencyFilename);
        if (success) {
            console.log(`💾 Emergency save completed: ${emergencyFilename}`);
        }
    } else {
        console.log('No data to save in emergency.');
    }
}

// Set up signal handlers for graceful shutdown
process.on('SIGINT', () => {
    console.log('\n👋 Received Ctrl+C (SIGINT). Saving data and exiting gracefully...');
    emergencySave('SIGINT (Ctrl+C)');
    process.exit(0);
});

// Remove emergency saves from other error handlers - just log and exit
process.on('SIGTERM', () => {
    console.log('\n👋 Received SIGTERM. Exiting...');
    process.exit(0);
});

process.on('uncaughtException', (error) => {
    console.log('\n💥 Uncaught exception occurred:', error.message);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.log('\n💥 Unhandled promise rejection:', reason);
    process.exit(1);
});

// OPTIMIZED: Multi-selector helper function with reduced timeouts
async function interactWithElement(page, selectors, actionType, actionValue = null, options = {}) {
    const { visible = true, timeout = 2000, postActionDelay = 200 } = options; // OPTIMIZED: reduced timeouts
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
                // Just waiting for element to exist
                return true;
            }
            
            if (postActionDelay > 0) {
                console.log(`Pausing ${postActionDelay}ms after action.`);
                await new Promise(resolve => setTimeout(resolve, postActionDelay));
            }
            return true; // Action successful
        } catch (e) {
            console.log(`Selector ${selector} failed or timed out for action ${actionType}: ${e.message}`);
        }
    }
    console.error(`All selectors failed for action ${actionType} on selectors: ${selectors.join(', ')}`);
    return false; // All selectors failed
}

// Function to scrape a single business by clicking on it on the same page
async function scrapeBusinessSequentially(page, business, listingPageUrl) {
    try {
        console.log(`   📋 Processing: ${business.name}`);
        
        // Always navigate back to listing page to ensure fresh state
        const currentUrl = page.url();
        if (!currentUrl.includes('22412_boston') || currentUrl.includes('#ba_s=')) {
            console.log(`   🔄 Navigating back to listing page...`);
            await page.goto(listingPageUrl, { 
                waitUntil: 'domcontentloaded', // OPTIMIZED: domcontentloaded instead of networkidle2
                timeout: 10000 // OPTIMIZED: reduced from 15000ms
            });
            
            // OPTIMIZED: Wait for business cards with reduced timeout
            await page.waitForSelector('[data-testid="business-name"]', { 
                visible: true, 
                timeout: 8000 // OPTIMIZED: reduced from 15000ms
            });
            
            // OPTIMIZED: Minimal wait instead of 3000ms
            await new Promise(resolve => setTimeout(resolve, 500)); // OPTIMIZED: 500ms instead of 3000ms
            
            // Verify we have the expected number of business cards and they're clickable
            const pageInfo = await page.evaluate(() => {
                const businessCards = document.querySelectorAll('[data-testid="business-name"]');
                let clickableCount = 0;
                
                businessCards.forEach(card => {
                    let currentElement = card;
                    while (currentElement && currentElement !== document.body) {
                        const computedStyle = getComputedStyle(currentElement);
                        if (computedStyle.cursor === 'pointer' || 
                            currentElement.tagName === 'A' ||
                            currentElement.onclick) {
                            clickableCount++;
                            break;
                        }
                        currentElement = currentElement.parentElement;
                    }
                });
                
                return {
                    totalCards: businessCards.length,
                    clickableCards: clickableCount,
                    pageUrl: window.location.href
                };
            });
            
            console.log(`   📋 Found ${pageInfo.totalCards} business cards (${pageInfo.clickableCards} clickable)`);
            console.log(`   🌐 Current URL: ${pageInfo.pageUrl}`);
        }
        
        // Find and click on the specific business using its index
        console.log(`   🎯 Looking for business: ${business.name}`);
        
        // OPTIMIZED: Minimal stability wait
        await new Promise(resolve => setTimeout(resolve, 200)); // OPTIMIZED: 200ms instead of 500ms
        
        const clickedSuccessfully = await page.evaluate((businessName) => {
            try {
                console.log(`Looking for business by name: "${businessName}"`);
                
                // Method 1: Look for anchor tags containing the business name (MOST RELIABLE)
                const anchors = document.querySelectorAll('a');
                
                for (const anchor of anchors) {
                    const nameElement = anchor.querySelector('[data-testid="business-name"]');
                    if (nameElement && nameElement.textContent.trim() === businessName) {
                        console.log(`Found anchor containing business name: ${anchor.href}`);
                        
                        // OPTIMIZED: Instant scroll instead of smooth
                        anchor.scrollIntoView({ behavior: 'instant', block: 'center' });
                        
                        // Click the anchor directly
                        anchor.click();
                        
                        return { success: true, actualName: businessName, method: 'anchor' };
                    }
                }
                
                // Method 2: Fallback - click directly on business name element
                const businessNameElements = document.querySelectorAll('[data-testid="business-name"]');
                
                for (const nameElement of businessNameElements) {
                    if (nameElement.textContent.trim() === businessName) {
                        console.log(`Fallback: clicking directly on business name element`);
                        
                        // OPTIMIZED: Instant scroll
                        nameElement.scrollIntoView({ behavior: 'instant', block: 'center' });
                        
                        // Click the name element directly
                        nameElement.click();
                        
                        return { success: true, actualName: businessName, method: 'name-element' };
                    }
                }
                
                console.log(`Could not find business: "${businessName}"`);
                return { success: false, error: `Business "${businessName}" not found` };
                
            } catch (error) {
                console.log(`Error clicking business: ${error.message}`);
                return { success: false, error: error.message };
            }
        }, business.name);
        
        if (!clickedSuccessfully.success) {
            console.log(`   ⚠️  Could not click on business: ${business.name} - ${clickedSuccessfully.error || 'Unknown error'}`);
            return {
                name: business.name,
                phone: '',
                socialMedia: ''
            };
        }
        
        console.log(`   ✅ Clicked on ${business.name}, waiting for page to load...`);
        
        // OPTIMIZED: Wait for URL change with reduced timeout and fallback
        try {
            await page.waitForFunction(
                (originalUrl) => window.location.href !== originalUrl,
                { timeout: 5000 }, // OPTIMIZED: reduced from 10000ms
                listingPageUrl
            );
            
            // OPTIMIZED: Minimal wait for content to load
            await new Promise(resolve => setTimeout(resolve, 800)); // OPTIMIZED: 800ms instead of 3000ms
            
        } catch (e) {
            console.log(`   ⚠️  Page might not have changed URL, waiting anyway...`);
            await new Promise(resolve => setTimeout(resolve, 1200)); // OPTIMIZED: 1200ms instead of 3000ms
        }
        
        // Extract detailed info from business page
        const businessDetails = await page.evaluate(() => {
            // Use the EXACT working logic from test script
            const pageText = document.body.innerText;
            
            // Method 1: Tel links (most reliable)
            const telLinks = document.querySelectorAll('a[href^="tel:"]');
            let phone = '';
            
            if (telLinks.length > 0) {
                phone = telLinks[0].getAttribute('href').replace('tel:', '').trim();
                
                // Validate phone length
                const digitsOnly = phone.replace(/[^\d]/g, '');
                if (digitsOnly.length < 10 || ['1234567890', '1234567891', '0123456789'].includes(digitsOnly)) {
                    phone = '';
                }
            }
            
            // Method 2: SVG search (fallback)
            if (!phone) {
                const svgs = document.querySelectorAll('svg[viewBox="0 0 24 24"]');
                const candidates = [];
                
                svgs.forEach((svg, index) => {
                    let currentElement = svg.parentElement;
                    let levels = 0;
                    
                    while (currentElement && levels < 5) {
                        const elementText = currentElement.textContent;
                        const phoneMatch = elementText.match(/\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
                        
                        if (phoneMatch) {
                            const candidate = phoneMatch[0].trim();
                            const digitsOnly = candidate.replace(/[^\d]/g, '');
                            
                            const isValid = digitsOnly.length >= 10 && 
                                          !['1234567890', '1234567891', '0123456789'].includes(digitsOnly) &&
                                          !/^0123456789|1234567890/.test(digitsOnly) &&
                                          !/^(\d)\1{9,}$/.test(digitsOnly);
                            
                            if (isValid) {
                                candidates.push({
                                    phone: candidate,
                                    priority: elementText.includes('Call') || elementText.includes('Contact') ? 1 : 0
                                });
                            }
                            break;
                        }
                        
                        currentElement = currentElement.parentElement;
                        levels++;
                    }
                });
                
                if (candidates.length > 0) {
                    candidates.sort((a, b) => b.priority - a.priority);
                    phone = candidates[0].phone;
                }
            }
            
            // Method 3: Text search (last resort)
            if (!phone) {
                const pageText = document.body.innerText;
                const phonePattern = /\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
                const textMatches = pageText.match(phonePattern);
                
                if (textMatches) {
                    for (const match of textMatches) {
                        const candidate = match.trim();
                        const digitsOnly = candidate.replace(/[^\d]/g, '');
                        
                        const isValid = digitsOnly.length >= 10 && 
                                      !['1234567890', '1234567891', '0123456789', '0154220315'].includes(digitsOnly) &&
                                      !/^0123456789|1234567890/.test(digitsOnly) &&
                                      !/^(\d)\1{9,}$/.test(digitsOnly);
                        
                        if (isValid) {
                            phone = candidate;
                            break;
                        }
                    }
                }
            }
            
            // Extract social media links
            const socialLinks = [];
            
            // Method 1: Look for actual social media anchor tags
            const socialSelectors = [
                'a[href*="facebook.com/"]:not([href*="booksypolska"])',
                'a[href*="instagram.com/"]:not([href*="booksybiz"])',
                'a[href*="twitter.com/"]:not([href*="BooksyApp"])',
                'a[href*="tiktok.com/"]',
                'a[href*="linkedin.com/"]',
                'a[href*="youtube.com/"]'
            ];
            
            socialSelectors.forEach(selector => {
                const links = document.querySelectorAll(selector);
                
                links.forEach(link => {
                    if (link.href && link.href.length > 20) {
                        const cleanHref = link.href.split('?')[0];
                        if (!socialLinks.includes(cleanHref)) {
                            socialLinks.push(cleanHref);
                        }
                    }
                });
            });
            
            // Method 2: Look for social media patterns in text
            const socialPatterns = [
                /https?:\/\/(?:www\.)?facebook\.com\/[a-zA-Z0-9._-]+(?:\/[a-zA-Z0-9._-]*)?/gi,
                /https?:\/\/(?:www\.)?instagram\.com\/[a-zA-Z0-9._-]+(?:\/[a-zA-Z0-9._-]*)?/gi,
                /https?:\/\/(?:www\.)?twitter\.com\/[a-zA-Z0-9._-]+/gi,
                /https?:\/\/(?:www\.)?tiktok\.com\/@[a-zA-Z0-9._-]+/gi,
                /https?:\/\/(?:www\.)?linkedin\.com\/in\/[a-zA-Z0-9._-]+/gi,
                /https?:\/\/(?:www\.)?youtube\.com\/[a-zA-Z0-9._-]+/gi
            ];
            
            for (const pattern of socialPatterns) {
                const matches = pageText.match(pattern);
                if (matches) {
                    matches.forEach(match => {
                        const cleanMatch = match.trim();
                        const excludePatterns = [
                            'booksypolska',
                            'booksybiz', 
                            'BooksyApp',
                            'facebook.com/sharer',
                            'twitter.com/share'
                        ];
                        
                        const shouldExclude = excludePatterns.some(exclude => 
                            cleanMatch.toLowerCase().includes(exclude.toLowerCase())
                        );
                        
                        if (!shouldExclude && !socialLinks.includes(cleanMatch) && cleanMatch.length > 20) {
                            socialLinks.push(cleanMatch);
                        }
                    });
                }
            }
            
            // Try to get business name from various sources
            let cleanName = '';
            
            const businessNameElement = document.querySelector('[data-testid="business-name"]');
            if (businessNameElement) {
                cleanName = businessNameElement.textContent.trim();
            }
            
            if (!cleanName) {
                const titleElement = document.querySelector('h1');
                if (titleElement) {
                    cleanName = titleElement.innerText.trim();
                }
            }
            
            if (!cleanName) {
                const pageTitle = document.title;
                if (pageTitle && !pageTitle.includes('Booksy')) {
                    cleanName = pageTitle.split(' - ')[0].split(' | ')[0];
                }
            }
            
            return {
                name: cleanName,
                phone: phone || '',
                socialMedia: socialLinks.length > 0 ? socialLinks.join('; ') : '',
                url: window.location.href
            };
        });
        
        // Use the original name if we couldn't get a better one
        const finalName = businessDetails.name || business.name;
        
        console.log(`   📝 Name: ${finalName}`);
        console.log(`   📞 Phone: ${businessDetails.phone || 'Not found'}`);
        console.log(`   📱 Social: ${businessDetails.socialMedia || 'Not found'}`);
        
        return {
            name: finalName,
            phone: businessDetails.phone,
            socialMedia: businessDetails.socialMedia
        };
        
    } catch (error) {
        console.log(`   ❌ Error scraping business ${business.name}: ${error.message}`);
        return {
            name: business.name,
            phone: '',
            socialMedia: ''
        };
    }
}

// Function to process businesses sequentially on the same tab
async function processBusinessesSequentially(page, businesses, listingPageUrl) {
    const results = [];
    
    console.log(`   🔄 Processing ${businesses.length} businesses sequentially...`);
    
    for (let i = 0; i < businesses.length; i++) {
        const business = businesses[i];
        console.log(`   📍 Processing ${i + 1}/${businesses.length}: ${business.name}`);
        
        const businessData = await scrapeBusinessSequentially(page, business, listingPageUrl);
        results.push(businessData);
        
        // Update global data after each business for emergency saves
        globalScrapedData = [...globalScrapedData.slice(0, -businesses.length + i), ...results, ...globalScrapedData.slice(-businesses.length + i + 1)];
        
        console.log(`   ✅ Completed ${i + 1}/${businesses.length}: ${business.name}`);
        
        // OPTIMIZED: No delay between businesses - run at maximum speed
    }
    
    return results;
}

async function scrapeBooksy() {
    let browser;
    let scrapedData = [];
    let finalSaveCompleted = false; // Flag to prevent double saving
    
    try {
        console.log('Connecting to persistent browser...');
        // Connect to persistent browser (make sure to launch Chrome with --remote-debugging-port=9222)
        browser = await puppeteer.connect({ 
            browserURL: 'http://127.0.0.1:9222', 
            defaultViewport: null 
        });
        
        const pages = await browser.pages();
        let page = pages.find(p => p.url().startsWith('https://booksy.com'));
        
        if (!page) {
            page = pages.find(p => p.url() !== 'about:blank' && !p.url().startsWith('chrome-extension://'));
            if (page) {
                console.log(`Found existing page: ${page.url()}. Navigating to Booksy.`);
                await page.goto('https://booksy.com/en-us/', { waitUntil: 'domcontentloaded' });
            } else {
                console.log('No suitable existing page. Opening new page for Booksy.');
                page = await browser.newPage();
                await page.goto('https://booksy.com/en-us/', { waitUntil: 'domcontentloaded' });
            }
        }
        
        await page.bringToFront();
        console.log(`Current page URL: ${page.url()}`);
        console.log(`Current page title: ${await page.title()}`);
        
        // Step 1: Iterate through multiple pages (20 pages = ~600 barbershops)
        const startPage = 8; // CONFIGURABLE: Change this to start from different page
        const totalPagesToScrape = 30;
        const allBarberData = [];
        
        console.log(`Starting to scrape pages ${startPage}-${totalPagesToScrape} of top-rated Boston barbershops...`);
        
        for (let currentPage = startPage; currentPage <= totalPagesToScrape; currentPage++) {
            // Add error handling and retry logic for each page
            let pageRetries = 0;
            const maxPageRetries = 3;
            let pageSuccess = false;
            
            while (!pageSuccess && pageRetries < maxPageRetries) {
                try {
                    console.log(`\n🔄 ===== SCRAPING PAGE ${currentPage}/${totalPagesToScrape} (Page ${currentPage - startPage + 1} of ${totalPagesToScrape - startPage + 1}) =====`);
                    
                    // Navigate to specific page using the Boston URL (top-rated)
                    const baseUrl = 'https://booksy.com/en-us/s/28561_jersey-city?locationHash=here%253Acm%253Anamedplace%253A21017995';
                    const pageUrl = currentPage === 1 
                        ? baseUrl
                        : `${baseUrl}&businessesPage=${currentPage}`;
                    
                    console.log(`Navigating to: ${pageUrl}`);
                    await page.goto(pageUrl, { 
                        waitUntil: 'domcontentloaded', // OPTIMIZED: already optimized
                        timeout: 10000 // OPTIMIZED: reduced from 15000ms
                    });
                    
                    // OPTIMIZED: Wait for business cards with reduced timeout
                    await page.waitForSelector('[data-testid="business-name"]', { 
                        visible: true, 
                        timeout: 8000 // OPTIMIZED: reduced from 10000ms
                    });
                    
                    console.log(`Current URL: ${page.url()}`);
                    
                    // Extract business information using parent traversal approach (FIXED APPROACH)
                    const businessCards = await page.evaluate(() => {
                        const businesses = [];
                        const processedNames = new Set(); // Track processed names to avoid duplicates
                        
                        // Get all business name elements
                        const businessNameElements = document.querySelectorAll('[data-testid="business-name"]');
                        
                        businessNameElements.forEach((nameElement) => {
                            try {
                                const name = nameElement.textContent.trim();
                                
                                // Skip if we've already processed this business name
                                if (processedNames.has(name)) {
                                    return;
                                }
                                
                                // Look for rating and reviews in the surrounding elements
                                let currentElement = nameElement;
                                let rating = '';
                                let reviews = '';
                                let attempts = 0;
                                
                                // Traverse up the DOM tree to find the business card container
                                while (currentElement && attempts < 8) {
                                    const elementText = currentElement.innerText || currentElement.textContent || '';
                                    
                                    // Look for rating (more precise pattern to avoid distances)
                                    if (!rating) {
                                        // Look for rating patterns like "4.9" or "5.0" that are likely ratings (1.0-5.0 range)
                                        const ratingMatches = elementText.match(/\b([1-5]\.\d+)\b/g);
                                        if (ratingMatches) {
                                            // Take the first valid rating in the 1.0-5.0 range
                                            for (const match of ratingMatches) {
                                                const ratingValue = parseFloat(match);
                                                if (ratingValue >= 1.0 && ratingValue <= 5.0) {
                                                    rating = match;
                                                    break;
                                                }
                                            }
                                        }
                                    }
                                    
                                    // Look for reviews
                                    if (!reviews) {
                                        const reviewMatch = elementText.match(/(\d+)\s+reviews?/i);
                                        if (reviewMatch) {
                                            reviews = reviewMatch[0];
                                        }
                                    }
                                    
                                    // If we found both, we can stop
                                    if (rating && reviews) {
                                        break;
                                    }
                                    
                                    currentElement = currentElement.parentElement;
                                    attempts++;
                                }
                                
                                // Only include businesses that have both rating and reviews (complete business cards)
                                if (rating && reviews && name) {
                                    businesses.push({
                                        name: name,
                                        rating: rating,
                                        reviews: reviews
                                    });
                                    processedNames.add(name); // Mark as processed
                                }
                            } catch (e) {
                                console.log(`Error processing business:`, e.message);
                            }
                        });
                        
                        return businesses;
                    });
                    
                    console.log(`Found ${businessCards.length} business cards on page ${currentPage}`);
                    
                    if (businessCards.length === 0) {
                        console.log(`No business cards found on page ${currentPage}. Reached the end or page error.`);
                        break;
                    }
                    
                    // Process businesses sequentially on the same tab
                    console.log(`\n🚀 Processing ${businessCards.length} businesses on page ${currentPage} sequentially...\n`);
                    
                    const pageBarberData = await processBusinessesSequentially(page, businessCards, pageUrl);
                    
                    // Add this page's data to the overall collection
                    allBarberData.push(...pageBarberData);
                    globalScrapedData = allBarberData; // Update global data for emergency saves
                    console.log(`✅ Page ${currentPage} complete! Extracted ${pageBarberData.length} businesses. Total so far: ${allBarberData.length}`);
                    
                    pageSuccess = true;
                    
                } catch (pageError) {
                    pageRetries++;
                    console.log(`❌ Error on page ${currentPage}, attempt ${pageRetries}/${maxPageRetries}: ${pageError.message}`);
                    
                    if (pageRetries < maxPageRetries) {
                        console.log(`🔄 Retrying page ${currentPage} in 2 seconds...`); // OPTIMIZED: reduced from 3s
                        await new Promise(resolve => setTimeout(resolve, 2000)); // OPTIMIZED: 2s instead of 3s
                        
                        // Try to reconnect to browser if frame is detached
                        try {
                            await page.goto('https://booksy.com/en-us/', { 
                                waitUntil: 'domcontentloaded', // OPTIMIZED
                                timeout: 8000 // OPTIMIZED: reduced timeout
                            });
                            await new Promise(resolve => setTimeout(resolve, 500)); // OPTIMIZED: reduced wait
                        } catch (reconnectError) {
                            console.log(`Failed to reconnect: ${reconnectError.message}`);
                        }
                    } else {
                        console.log(`❌ Failed to scrape page ${currentPage} after ${maxPageRetries} attempts. Skipping...`);
                    }
                }
            }
        }
        
        console.log(`\n🎉 ===== SCRAPING COMPLETE! =====`);
        console.log(`Successfully scraped ${totalPagesToScrape - startPage + 1} pages (${startPage}-${totalPagesToScrape}) and found details for ${allBarberData.length} barbershops.`);
        
        // Save final CSV with generic name (ONLY ONCE)
        if (allBarberData.length > 0 && !finalSaveCompleted) {
            const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
            const filename = `barbershop-data-optimized-${timestamp}.csv`;
            const success = saveToCSV(allBarberData, filename);
            
            if (success) {
                scrapedData = allBarberData;
                finalSaveCompleted = true; // Mark as completed to prevent double save
            }
        }
        
        console.log(`Script completed. Found ${scrapedData.length} barbershop listings across ${totalPagesToScrape - startPage + 1} pages (${startPage}-${totalPagesToScrape}).`);
        
    } catch (error) {
        console.error('❌ Critical error during scraping:', error);
    } finally {
        if (browser) {
            console.log('Disconnecting from browser...');
            try {
                await browser.disconnect();
            } catch (disconnectError) {
                console.log('Error disconnecting from browser:', disconnectError.message);
            }
        }
        
        // Final save attempt ONLY if no previous final save was completed
        if (globalScrapedData.length > 0 && !finalSaveCompleted) {
            console.log('Performing final save check...');
            const timestamp = new Date().toISOString().split('T')[0];
            const finalFilename = `barbershop-data-final-optimized-${timestamp}.csv`;
            saveToCSV(globalScrapedData, finalFilename);
        }
    }
}

// Run the scraper
scrapeBooksy();
