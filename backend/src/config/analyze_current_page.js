const puppeteer = require('puppeteer');

async function analyzeCurrentPage() {
    let browser;
    
    try {
        console.log("🔍 Connecting to analyze current page...");
        
        browser = await puppeteer.connect({
            browserWSEndpoint: 'ws://127.0.0.1:9222/devtools/browser/deaecea6-7d3f-4dbd-8a90-2b117f70a128',
            defaultViewport: null
        });
        
        const pages = await browser.pages();
        
        // Find the active/focused page (likely the clients page)
        let activePage = null;
        for (const page of pages) {
            try {
                if (page.url().includes('clients') || page.url().includes('squarespace.com')) {
                    activePage = page;
                    break;
                }
            } catch (e) {
                // Skip pages that can't be accessed
            }
        }
        
        if (!activePage) {
            // Just use the first non-extension page
            activePage = pages.find(p => !p.url().startsWith('chrome-extension://'));
        }
        
        if (!activePage) {
            console.log("❌ Could not find active page");
            return;
        }
        
        console.log(`📄 Analyzing page: ${activePage.url()}`);
        
        await activePage.bringToFront();
        
        // Take initial screenshot
        await activePage.screenshot({ path: 'current_page.png', fullPage: true });
        console.log("📸 Screenshot saved: current_page.png");
        
        // Try various selectors to find client elements
        console.log("\n🔍 Testing selectors...");
        
        const selectors = [
            'td.lastName.css-16o23tj',
            'td.lastName', 
            'tr td:last-child',
            'tbody tr',
            'table tr',
            '.client-row',
            '.client-name',
            '[data-testid*="client"]',
            'td[class*="lastName"]',
            'td[class*="css-"]'
        ];
        
        let workingSelector = null;
        let clientElements = [];
        
        for (const selector of selectors) {
            try {
                const elements = await activePage.$$(selector);
                console.log(`"${selector}": ${elements.length} elements`);
                
                if (elements.length > 0 && elements.length < 1000) { // Reasonable number of elements
                    // Get text from first few elements to see if they look like client names
                    const sampleTexts = [];
                    for (let i = 0; i < Math.min(3, elements.length); i++) {
                        try {
                            const text = await elements[i].textContent();
                            if (text && text.trim()) {
                                sampleTexts.push(text.trim());
                            }
                        } catch (e) {
                            // Skip elements that can't be read
                        }
                    }
                    
                    if (sampleTexts.length > 0) {
                        console.log(`  Sample texts: ${sampleTexts.join(' | ')}`);
                        
                        // If this looks like it could be client names (not too generic)
                        if (!workingSelector && sampleTexts.some(text => text.length > 2 && text.length < 100)) {
                            workingSelector = selector;
                            clientElements = elements;
                        }
                    }
                }
            } catch (e) {
                console.log(`"${selector}": Error - ${e.message}`);
            }
        }
        
        if (workingSelector) {
            console.log(`\n✅ Best selector found: "${workingSelector}" with ${clientElements.length} elements`);
            
            // Test clicking the first element
            console.log("\n🖱️ Testing click on first element...");
            try {
                await clientElements[0].click();
                console.log("✅ Click successful!");
                
                // Wait a moment for page to potentially change
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                console.log(`New URL: ${activePage.url()}`);
                
                // Take screenshot after click
                await activePage.screenshot({ path: 'after_click.png', fullPage: true });
                console.log("📸 Screenshot saved: after_click.png");
                
                // Look for client detail elements
                console.log("\n🔍 Looking for client detail elements...");
                const detailSelectors = [
                    '.field-rendered.edit-client',
                    '.start-time',
                    '.end-time',
                    '.appointment-type-name',
                    '[data-testid*="phone"]',
                    '.client-info',
                    '.appointment-info'
                ];
                
                for (const sel of detailSelectors) {
                    try {
                        const elem = await activePage.$(sel);
                        if (elem) {
                            const text = await elem.textContent();
                            console.log(`Found "${sel}": "${text}"`);
                        }
                    } catch (e) {
                        // Element not found, continue
                    }
                }
                
            } catch (e) {
                console.log(`❌ Click failed: ${e.message}`);
            }
            
        } else {
            console.log("\n❌ No suitable client selector found");
            console.log("The page might not have loaded properly or uses different selectors");
        }
        
        console.log("\n✅ Analysis complete! Check the screenshots to see the page structure.");
        
    } catch (error) {
        console.error("❌ Error:", error.message);
    } finally {
        if (browser) {
            await browser.disconnect();
        }
    }
}

analyzeCurrentPage(); 