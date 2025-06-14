const puppeteer = require('puppeteer');
const fs = require('fs');

// Multi-selector helper function for robust element interaction
async function interactWithElement(page, selectors, actionType, actionValue = null, options = {}) {
    const { visible = true, timeout = 3000, postActionDelay = 500 } = options;
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
    console.log(`Data saved to ${filename}`);
}

// Function to scrape a single business by clicking on it in a new tab
async function scrapeBusinessInParallelTab(browser, business, listingPageUrl, tabIndex) {
    let businessTab = null;
    try {
        console.log(`   Tab ${tabIndex}: Opening new tab for ${business.name} (index ${business.index})`);
        businessTab = await browser.newPage();
        
        // Navigate to the listing page first
        console.log(`   Tab ${tabIndex}: Navigating to listing page...`);
        await businessTab.goto(listingPageUrl, { 
            waitUntil: 'domcontentloaded',
            timeout: 15000 
        });
        
        // Wait for page to load
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Find and click on the specific business using its index
        console.log(`   Tab ${tabIndex}: Looking for business at index ${business.index}: ${business.name}`);
        const clickedSuccessfully = await businessTab.evaluate((businessIndex, businessName) => {
            // Get all business name elements
            const businessNameElements = document.querySelectorAll('[data-testid="business-name"]');
            
            // Check if the index is valid
            if (businessIndex >= 0 && businessIndex < businessNameElements.length) {
                const targetElement = businessNameElements[businessIndex];
                
                // Verify this is the business we expect (optional safety check)
                const actualName = targetElement.textContent.trim();
                console.log(`Found business at index ${businessIndex}: "${actualName}" (expected: "${businessName}")`);
                
                // Find the clickable parent
                let clickableParent = targetElement;
                let currentElement = targetElement;
                
                // Traverse up the DOM to find a clickable parent
                while (currentElement && currentElement !== document.body) {
                    if (currentElement.tagName === 'A' || 
                        currentElement.onclick || 
                        currentElement.getAttribute('role') === 'button' ||
                        currentElement.style.cursor === 'pointer') {
                        clickableParent = currentElement;
                        break;
                    }
                    currentElement = currentElement.parentElement;
                }
                
                // Click the element
                clickableParent.click();
                return true;
            } else {
                console.log(`Invalid business index: ${businessIndex} (total elements: ${businessNameElements.length})`);
                return false;
            }
        }, business.index, business.name);
        
        if (!clickedSuccessfully) {
            console.log(`   Tab ${tabIndex}: ⚠️  Could not click on business at index ${business.index}: ${business.name}`);
            return {
                name: business.name,
                phone: '',
                socialMedia: ''
            };
        }
        
        console.log(`   Tab ${tabIndex}: ✅ Clicked on ${business.name} (index ${business.index}), waiting for page to load...`);
        
        // Wait for business page to load
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Extract detailed info from business page
        const businessDetails = await businessTab.evaluate(() => {
            // Get both text content and HTML for comprehensive search
            const pageText = document.body.innerText;
            const pageHTML = document.body.innerHTML;
            
            // Extract phone number with various patterns from both text and HTML
            let phone = '';
            const phonePatterns = [
                /(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/g,  // Standard US format
                /(\d{3}[-.\s]?\d{3}[-.\s]?\d{4})/g,       // Without parentheses
                /(\+1[-.\s]?\d{3}[-.\s]?\d{3}[-.\s]?\d{4})/g, // With country code
                /tel:(\+?\d{1,3}[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/g // Tel links
            ];
            
            // Search in both text and HTML
            const searchTexts = [pageText, pageHTML];
            
            for (const text of searchTexts) {
                for (const pattern of phonePatterns) {
                    const matches = text.match(pattern);
                    if (matches) {
                        // Filter out obviously wrong numbers (like years, IDs, etc.)
                        for (const match of matches) {
                            const cleanMatch = match.replace(/tel:/, '').replace(/[^\d\(\)\-\.\s\+]/g, '');
                            if (cleanMatch.length >= 10 && cleanMatch.length <= 15) {
                                phone = cleanMatch;
                                break;
                            }
                        }
                        if (phone) break;
                    }
                }
                if (phone) break;
            }
            
            // Extract social media links from HTML and href attributes
            const socialLinks = [];
            const socialPatterns = [
                /https?:\/\/(?:www\.)?facebook\.com\/[^\s"'<>]+/gi,
                /https?:\/\/(?:www\.)?instagram\.com\/[^\s"'<>]+/gi,
                /https?:\/\/(?:www\.)?twitter\.com\/[^\s"'<>]+/gi,
                /https?:\/\/(?:www\.)?tiktok\.com\/[^\s"'<>]+/gi,
                /https?:\/\/(?:www\.)?linkedin\.com\/[^\s"'<>]+/gi,
                /https?:\/\/(?:www\.)?youtube\.com\/[^\s"'<>]+/gi,
                /@[a-zA-Z0-9_]+/g // Handle @username patterns
            ];
            
            // Search in HTML for social media patterns
            for (const pattern of socialPatterns) {
                const matches = pageHTML.match(pattern);
                if (matches) {
                    matches.forEach(match => {
                        const cleanMatch = match.replace(/["'<>]/g, '');
                        if (!socialLinks.includes(cleanMatch) && cleanMatch.length > 5) {
                            socialLinks.push(cleanMatch);
                        }
                    });
                }
            }
            
            // Also check for social media links in anchor tags
            const socialSelectors = [
                'a[href*="facebook.com"]',
                'a[href*="instagram.com"]',
                'a[href*="twitter.com"]',
                'a[href*="tiktok.com"]',
                'a[href*="linkedin.com"]',
                'a[href*="youtube.com"]'
            ];
            
            socialSelectors.forEach(selector => {
                const links = document.querySelectorAll(selector);
                links.forEach(link => {
                    if (link.href && !socialLinks.includes(link.href)) {
                        socialLinks.push(link.href);
                    }
                });
            });
            
            // Try to get business name from various sources
            let cleanName = '';
            
            // Try data-testid business-name first
            const businessNameElement = document.querySelector('[data-testid="business-name"]');
            if (businessNameElement) {
                cleanName = businessNameElement.textContent.trim();
            }
            
            // Fallback to h1
            if (!cleanName) {
                const titleElement = document.querySelector('h1');
                if (titleElement) {
                    cleanName = titleElement.innerText.trim();
                }
            }
            
            // Fallback to page title
            if (!cleanName) {
                const pageTitle = document.title;
                if (pageTitle && !pageTitle.includes('Booksy')) {
                    cleanName = pageTitle.split(' - ')[0].split(' | ')[0];
                }
            }
            
            return {
                name: cleanName,
                phone: phone,
                socialMedia: socialLinks.join('; '),
                url: window.location.href
            };
        });
        
        // Use the original name if we couldn't get a better one
        const finalName = businessDetails.name || business.name;
        
        console.log(`   Tab ${tabIndex}: 📝 Name: ${finalName}`);
        console.log(`   Tab ${tabIndex}: 📞 Phone: ${businessDetails.phone || 'Not found'}`);
        console.log(`   Tab ${tabIndex}: 📱 Social: ${businessDetails.socialMedia || 'Not found'}`);
        
        return {
            name: finalName,
            phone: businessDetails.phone,
            socialMedia: businessDetails.socialMedia
        };
        
    } catch (error) {
        console.log(`   Tab ${tabIndex}: ❌ Error scraping business ${business.name}: ${error.message}`);
        return {
            name: business.name,
            phone: '',
            socialMedia: ''
        };
    } finally {
        if (businessTab) {
            await businessTab.close();
        }
    }
}

// Function to process businesses in parallel batches using multiple tabs
async function processBatchInParallel(browser, businesses, listingPageUrl, batchSize = 5) {
    const results = [];
    
    for (let i = 0; i < businesses.length; i += batchSize) {
        const batch = businesses.slice(i, i + batchSize);
        console.log(`   🚀 Processing batch ${Math.floor(i/batchSize) + 1}: businesses ${i + 1}-${Math.min(i + batchSize, businesses.length)} in parallel`);
        
        // Process batch in parallel - each business gets its own tab
        const batchPromises = batch.map((business, index) => 
            scrapeBusinessInParallelTab(browser, business, listingPageUrl, i + index + 1)
        );
        
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
        
        console.log(`   ✅ Batch ${Math.floor(i/batchSize) + 1} complete! Processed ${batch.length} businesses.`);
        
        // Small delay between batches to be respectful
        if (i + batchSize < businesses.length) {
            console.log(`   ⏳ Waiting 2 seconds before next batch...`);
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
    
    return results;
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
        
        // Step 1: Iterate through multiple pages (20 pages = ~600 barbershops)
        const totalPagesToScrape = 20;
        const allBarberData = [];
        
        console.log(`Starting to scrape ${totalPagesToScrape} pages of Chicago barbershops...`);
        
        for (let currentPage = 1; currentPage <= totalPagesToScrape; currentPage++) {
            // Add error handling and retry logic for each page
            let pageRetries = 0;
            const maxPageRetries = 3;
            let pageSuccess = false;
            
            while (!pageSuccess && pageRetries < maxPageRetries) {
                try {
                    console.log(`\n🔄 ===== SCRAPING PAGE ${currentPage}/${totalPagesToScrape} =====`);
                    
                    // Navigate to specific page using URL parameter
                    const pageUrl = currentPage === 1 
                        ? 'https://booksy.com/en-us/s/barber-shop/18229_chicago'
                        : `https://booksy.com/en-us/s/barber-shop/18229_chicago?businessesPage=${currentPage}`;
                    
                    console.log(`Navigating to: ${pageUrl}`);
                    await page.goto(pageUrl, { 
                        waitUntil: 'domcontentloaded',
                        timeout: 15000 
                    });
                    
                    // Reduced wait time for page to load
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    console.log(`Current URL: ${page.url()}`);
                    
                    // REMOVED SCROLLING - Extract business information directly from DOM elements
                    const businessCards = await page.evaluate(() => {
                        const businesses = [];
                        const businessNameElements = document.querySelectorAll('[data-testid="business-name"]');
                        
                        businessNameElements.forEach((nameElement, index) => {
                            try {
                                const name = nameElement.textContent.trim();
                                
                                // Find the business card container
                                let businessCard = nameElement;
                                let attempts = 0;
                                
                                while (businessCard && attempts < 10) {
                                    businessCard = businessCard.parentElement;
                                    attempts++;
                                    
                                    // Look for rating and reviews in this container
                                    if (businessCard) {
                                        const cardText = businessCard.innerText || '';
                                        
                                        // Extract rating
                                        let rating = '';
                                        const ratingMatch = cardText.match(/(\d+\.\d+)/);
                                        if (ratingMatch) {
                                            rating = ratingMatch[1];
                                        }
                                        
                                        // Extract reviews
                                        let reviews = '';
                                        const reviewMatch = cardText.match(/(\d+)\s+reviews?/i);
                                        if (reviewMatch) {
                                            reviews = reviewMatch[0];
                                        }
                                        
                                        // If we found rating and reviews, this is likely the right container
                                        if (rating && reviews && name) {
                                            businesses.push({
                                                name: name,
                                                rating: rating,
                                                reviews: reviews,
                                                index: index  // Add index to ensure unique clicking
                                            });
                                            break;
                                        }
                                    }
                                }
                            } catch (e) {
                                console.log(`Error processing business ${index}:`, e.message);
                            }
                        });
                        
                        return businesses;
                    });
                    
                    console.log(`Found ${businessCards.length} business cards on page ${currentPage}`);
                    
                    if (businessCards.length === 0) {
                        console.log(`No business cards found on page ${currentPage}. Reached the end or page error.`);
                        break;
                    }
                    
                    // Process businesses in parallel batches using multiple tabs
                    console.log(`\n🚀 Processing ${businessCards.length} businesses on page ${currentPage} in parallel batches...\n`);
                    
                    const pageBarberData = await processBatchInParallel(browser, businessCards, pageUrl, 5);
                    
                    // Add this page's data to the overall collection
                    allBarberData.push(...pageBarberData);
                    console.log(`✅ Page ${currentPage} complete! Extracted ${pageBarberData.length} businesses. Total so far: ${allBarberData.length}`);
                    
                    // Save progress after each page
                    if (allBarberData.length > 0) {
                        const progressFilename = `chicago-barbers-progress-${currentPage}pages.csv`;
                        const csvContent = [
                            ['Name', 'Phone', 'Social Media'].join(','),
                            ...allBarberData.map(row => [
                                `"${(row.name || '').replace(/"/g, '""')}"`,
                                `"${(row.phone || '').replace(/"/g, '""')}"`,
                                `"${(row.socialMedia || '').replace(/"/g, '""')}"`
                            ].join(','))
                        ].join('\n');
                        
                        fs.writeFileSync(progressFilename, csvContent);
                        console.log(`💾 Progress saved to ${progressFilename}`);
                    }
                    
                    pageSuccess = true;
                    
                } catch (pageError) {
                    pageRetries++;
                    console.log(`❌ Error on page ${currentPage}, attempt ${pageRetries}/${maxPageRetries}: ${pageError.message}`);
                    
                    if (pageRetries < maxPageRetries) {
                        console.log(`🔄 Retrying page ${currentPage} in 3 seconds...`);
                        await new Promise(resolve => setTimeout(resolve, 3000));
                        
                        // Try to reconnect to browser if frame is detached
                        try {
                            await page.goto('https://booksy.com/en-us/', { waitUntil: 'domcontentloaded', timeout: 10000 });
                            await new Promise(resolve => setTimeout(resolve, 1000));
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
        console.log(`Successfully scraped ${totalPagesToScrape} pages and found details for ${allBarberData.length} barbershops.`);
        
        // Save to simplified CSV with only the requested fields
        if (allBarberData.length > 0) {
            const simplifiedHeaders = ['Name', 'Phone', 'Social Media'];
            const csvContent = [
                simplifiedHeaders.join(','),
                ...allBarberData.map(row => [
                    `"${(row.name || '').replace(/"/g, '""')}"`,
                    `"${(row.phone || '').replace(/"/g, '""')}"`,
                    `"${(row.socialMedia || '').replace(/"/g, '""')}"`
                ].join(','))
            ].join('\n');
            
            const filename = `chicago-barbers-${totalPagesToScrape}pages-parallel.csv`;
            fs.writeFileSync(filename, csvContent);
            console.log(`\n📁 Data saved to ${filename}`);
            
            scrapedData = allBarberData;
        }
        
        console.log(`Script completed. Found ${scrapedData.length} barber listings across ${totalPagesToScrape} pages.`);
        
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
