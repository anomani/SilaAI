const puppeteer = require('puppeteer');

async function testPagination() {
    let browser;
    
    try {
        console.log('Connecting to persistent browser...');
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
        
        let currentPage = 1;
        let hasNextPage = true;
        
        while (hasNextPage && currentPage <= 10) { // Limit to 10 pages for testing
            console.log(`\n=== PAGE ${currentPage} ===`);
            
            // Navigate to specific page using URL parameter
            const pageUrl = currentPage === 1 
                ? 'https://booksy.com/en-us/s/barber-shop/18229_chicago'
                : `https://booksy.com/en-us/s/barber-shop/18229_chicago?businessesPage=${currentPage}`;
            
            console.log(`Navigating to: ${pageUrl}`);
            await page.goto(pageUrl, { 
                waitUntil: 'domcontentloaded',
                timeout: 30000 
            });
            
            // Wait for page to load
            await new Promise(resolve => setTimeout(resolve, 5000));
            console.log(`Current URL: ${page.url()}`);
            
            // Scroll to load all content on current page
            await page.evaluate(async () => {
                const scrollDelay = 2000;
                const scrollStep = 800;
                let lastHeight = 0;
                let currentHeight = document.body.scrollHeight;
                let scrollAttempts = 0;
                const maxScrollAttempts = 5;
                
                while (lastHeight !== currentHeight && scrollAttempts < maxScrollAttempts) {
                    lastHeight = currentHeight;
                    scrollAttempts++;
                    
                    // Scroll down
                    for (let i = 0; i < 5; i++) {
                        window.scrollBy(0, scrollStep);
                        await new Promise(resolve => setTimeout(resolve, 300));
                    }
                    
                    await new Promise(resolve => setTimeout(resolve, scrollDelay));
                    currentHeight = document.body.scrollHeight;
                }
                
                // Scroll back to top
                window.scrollTo(0, 0);
                await new Promise(resolve => setTimeout(resolve, 1000));
            });
            
            // Count business profiles on current page
            const businessCount = await page.evaluate(() => {
                return document.querySelectorAll('[data-testid="business-name"]').length;
            });
            
            console.log(`Found ${businessCount} business profiles on page ${currentPage}`);
            
            // Check if page has content (if no businesses found, we've reached the end)
            if (businessCount === 0) {
                console.log('No businesses found on this page - reached the end');
                hasNextPage = false;
            } else {
                currentPage++;
            }
        }
        
        console.log(`\n=== PAGINATION TEST COMPLETE ===`);
        console.log(`Tested ${currentPage - 1} pages`);
        
    } catch (error) {
        console.error('Error during pagination test:', error);
    } finally {
        if (browser) {
            console.log('Disconnecting from browser...');
            await browser.disconnect();
        }
    }
}

// Run the test
testPagination(); 