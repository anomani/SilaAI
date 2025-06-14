const puppeteer = require('puppeteer');
const fs = require('fs');

// Multi-selector helper function for robust element interaction
async function interactWithElement(page, selectors, actionType, actionValue = null, options = {}) {
    const { visible = true, timeout = 5000, postActionDelay = 1000 } = options;
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

// Function to save data to CSV
function saveToCSV(data, filename) {
    const headers = ['Name', 'Phone', 'Social Media', 'Address', 'Rating', 'URL'];
    const csvContent = [
        headers.join(','),
        ...data.map(row => [
            `"${row.name || ''}"`,
            `"${row.phone || ''}"`,
            `"${row.socialMedia || ''}"`,
            `"${row.address || ''}"`,
            `"${row.rating || ''}"`,
            `"${row.url || ''}"`
        ].join(','))
    ].join('\n');
    
    fs.writeFileSync(filename, csvContent);
    console.log(`Data saved to ${filename}`);
}

async function scrapeBooksy() {
    let browser;
    let scrapedData = [];
    
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
        
        // Step 1: Click on Barbershop category first
        console.log('Looking for Barbershop category...');
        const barbershopSelectors = [
            'a:has-text("Barbershop")',
            'button:has-text("Barbershop")',
            '[href*="barbershop"]',
            'a[href*="/barbershop"]'
        ];
        
        const foundBarbershop = await interactWithElement(page, barbershopSelectors, 'click', null, { timeout: 10000 });
        
        if (foundBarbershop) {
            console.log('Barbershop category clicked successfully');
            // Wait for page to load
            await new Promise(resolve => setTimeout(resolve, 3000));
            console.log(`After clicking Barbershop - URL: ${page.url()}`);
            
            // Now try to navigate to Chicago specifically
            console.log('Looking for location input or Chicago link...');
            
            // Try to find location input first
            const locationSelectors = [
                'input[placeholder*="location"]',
                'input[placeholder*="city"]',
                'input[placeholder*="where"]',
                'input[name*="location"]',
                'input[type="search"]'
            ];
            
            const foundLocationInput = await interactWithElement(page, locationSelectors, 'type', 'Chicago, IL', { timeout: 5000 });
            
            if (foundLocationInput) {
                console.log('Location input found and filled');
                // Look for search button or press Enter
                const searchButtonSelectors = [
                    'button[type="submit"]',
                    'button:has-text("Search")',
                    'button:has-text("Find")',
                    '[data-testid="search-button"]'
                ];
                
                const clickedSearch = await interactWithElement(page, searchButtonSelectors, 'click', null, { timeout: 3000 });
                if (!clickedSearch) {
                    console.log('Search button not found, trying Enter key');
                    await page.keyboard.press('Enter');
                }
            } else {
                // Look for direct Chicago link
                const chicagoSelectors = [
                    'a:has-text("Chicago")',
                    'a[href*="chicago"]',
                    'li:has-text("Chicago") a',
                    'button:has-text("Chicago")'
                ];
                await interactWithElement(page, chicagoSelectors, 'click', null, { timeout: 5000 });
            }
        } else {
            console.log('Barbershop category not found. Trying direct URL approach...');
            // Try navigating directly to a barbershop URL
            await page.goto('https://booksy.com/en-us/barbershop/chicago', { waitUntil: 'domcontentloaded' });
        }
        
        // Wait for page to load and check URL
        await new Promise(resolve => setTimeout(resolve, 3000));
        console.log(`After navigation - Current URL: ${page.url()}`);
        console.log(`Page title: ${await page.title()}`);
        
        // Step 2: Look for barber listings
        console.log('Looking for barber listings...');
        const listingSelectors = [
            '[data-testid="business-card"]',
            '.business-card',
            '.listing-item',
            '.provider-card',
            '[class*="business"][class*="card"]'
        ];
        
        let foundListings = false;
        for (const selector of listingSelectors) {
            try {
                await page.waitForSelector(selector, { visible: true, timeout: 5000 });
                console.log(`Found listings with selector: ${selector}`);
                foundListings = true;
                break;
            } catch (e) {
                console.log(`Selector ${selector} not found for listings`);
            }
        }
        
        if (!foundListings) {
            console.log('No listings found. Current page content preview:');
            const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 500));
            console.log(bodyText);
        }
        
        // TODO: Next iteration - extract data from listings
        console.log('Script completed first iteration. Next: extract barber data from listings.');
        
    } catch (error) {
        console.error('Error during scraping:', error);
    } finally {
        if (browser) {
            console.log('Disconnecting from browser...');
            await browser.disconnect();
        }
    }
}

// Run the scraper
scrapeBooksy();
