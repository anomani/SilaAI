const puppeteer = require('puppeteer');

async function debugPhoneExtraction() {
    let browser;
    
    try {
        console.log('🔧 DEBUG MODE: Connecting to persistent browser...');
        console.log('Make sure you have Chrome running with: --remote-debugging-port=9222');
        console.log('Example: /Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome --remote-debugging-port=9222 --user-data-dir=~/chrome-dev-profile');
        
        // Connect to persistent browser
        browser = await puppeteer.connect({ 
            browserURL: 'http://127.0.0.1:9222', 
            defaultViewport: null 
        });
        
        const pages = await browser.pages();
        let page = pages[0] || await browser.newPage();
        
        // Navigate to a business page to debug
        const testUrl = 'https://booksy.com/en-us/s/male-haircut/134623_newark?locationHash=here%253Acm%253Anamedplace%253A21017964';
        console.log(`Navigating to: ${testUrl}`);
        
        await page.goto(testUrl, { waitUntil: 'domcontentloaded' });
        await page.waitForSelector('[data-testid="business-name"]', { visible: true, timeout: 10000 });
        
        // Click on first business to debug
        console.log('Clicking on first business...');
        await page.evaluate(() => {
            const firstBusiness = document.querySelector('[data-testid="business-name"]');
            if (firstBusiness) {
                let clickableParent = firstBusiness;
                let currentElement = firstBusiness;
                
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
                
                clickableParent.click();
            }
        });
        
        // Wait for business page to load
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        console.log('\n🔍 DEBUGGING PHONE EXTRACTION...');
        console.log(`Current URL: ${page.url()}`);
        
        // Set up console listener to capture browser console logs
        page.on('console', msg => {
            console.log(`🌐 BROWSER: ${msg.text()}`);
        });
        
        // Debug phone extraction with proper logging
        const debugResult = await page.evaluate(() => {
            const results = {
                url: window.location.href,
                title: document.title,
                pageTextSample: document.body.innerText.substring(0, 300),
                phoneExtractionResults: {}
            };
            
            console.log('=== PHONE EXTRACTION DEBUG ===');
            console.log(`URL: ${results.url}`);
            console.log(`Title: ${results.title}`);
            
            let phone = '';
            
            // Method 1: SVG Debug
            console.log('Method 1: SVG Icon Search');
            const svgs = document.querySelectorAll('svg');
            console.log(`Found ${svgs.length} SVG elements`);
            
            results.phoneExtractionResults.method1 = {
                svgCount: svgs.length,
                svgDetails: []
            };
            
            svgs.forEach((svg, index) => {
                const viewBox = svg.getAttribute('viewBox');
                const paths = svg.querySelectorAll('path');
                
                console.log(`SVG ${index}: viewBox="${viewBox}", paths=${paths.length}`);
                
                const svgInfo = {
                    index,
                    viewBox,
                    pathCount: paths.length,
                    parentText: '',
                    phoneFound: ''
                };
                
                if (viewBox === '0 0 24 24' && paths.length > 0) {
                    console.log(`SVG ${index} looks like phone icon`);
                    
                    // Check parent elements
                    let currentElement = svg.parentElement;
                    let levels = 0;
                    
                    while (currentElement && levels < 5) {
                        const elementText = currentElement.textContent;
                        const phoneMatch = elementText.match(/\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
                        
                        console.log(`Level ${levels}: "${elementText.trim().substring(0, 100)}"`);
                        
                        if (phoneMatch) {
                            console.log(`PHONE FOUND: ${phoneMatch[0]}`);
                            svgInfo.phoneFound = phoneMatch[0];
                            svgInfo.parentText = elementText.trim();
                            
                            if (!phone) {
                                phone = phoneMatch[0].trim();
                            }
                            break;
                        }
                        
                        currentElement = currentElement.parentElement;
                        levels++;
                    }
                }
                
                results.phoneExtractionResults.method1.svgDetails.push(svgInfo);
            });
            
            // Method 2: Tel Links Debug
            console.log('Method 2: Tel Links Search');
            const telLinks = document.querySelectorAll('a[href^="tel:"]');
            console.log(`Found ${telLinks.length} tel links`);
            
            results.phoneExtractionResults.method2 = {
                telLinkCount: telLinks.length,
                telLinks: []
            };
            
            telLinks.forEach((link, index) => {
                const href = link.getAttribute('href');
                console.log(`Tel link ${index}: ${href}`);
                results.phoneExtractionResults.method2.telLinks.push(href);
                
                if (!phone && href) {
                    phone = href.replace('tel:', '').trim();
                }
            });
            
            // Method 3: Text Search Debug
            console.log('Method 3: Text Pattern Search');
            const phonePattern = /\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
            const textMatches = document.body.innerText.match(phonePattern);
            
            console.log(`Found ${textMatches ? textMatches.length : 0} phone patterns in text`);
            if (textMatches) {
                console.log(`Matches: ${textMatches.join(', ')}`);
            }
            
            results.phoneExtractionResults.method3 = {
                patternMatches: textMatches || [],
                selectedPhone: phone || (textMatches ? textMatches[0] : '')
            };
            
            results.finalPhone = phone || (textMatches ? textMatches[0] : '');
            console.log(`FINAL PHONE RESULT: ${results.finalPhone}`);
            
            return results;
        });
        
        console.log('\n📊 DEBUG RESULTS:');
        console.log('=================');
        console.log(`URL: ${debugResult.url}`);
        console.log(`Title: ${debugResult.title}`);
        console.log(`Final Phone: ${debugResult.finalPhone}`);
        console.log(`\nSVG Method Results:`);
        console.log(`- Found ${debugResult.phoneExtractionResults.method1.svgCount} SVGs`);
        console.log(`- Phone icon candidates: ${debugResult.phoneExtractionResults.method1.svgDetails.filter(s => s.viewBox === '0 0 24 24').length}`);
        
        debugResult.phoneExtractionResults.method1.svgDetails.forEach(svg => {
            if (svg.phoneFound) {
                console.log(`  ✅ SVG ${svg.index}: Found phone "${svg.phoneFound}" in parent text: "${svg.parentText.substring(0, 100)}"`);
            }
        });
        
        console.log(`\nTel Links Method Results:`);
        console.log(`- Found ${debugResult.phoneExtractionResults.method2.telLinkCount} tel links`);
        debugResult.phoneExtractionResults.method2.telLinks.forEach((link, i) => {
            console.log(`  - Link ${i}: ${link}`);
        });
        
        console.log(`\nText Pattern Method Results:`);
        console.log(`- Found ${debugResult.phoneExtractionResults.method3.patternMatches.length} phone patterns`);
        debugResult.phoneExtractionResults.method3.patternMatches.forEach((match, i) => {
            console.log(`  - Pattern ${i}: ${match}`);
        });
        
        console.log(`\nPage Text Sample:`);
        console.log(`"${debugResult.pageTextSample}"`);
        
        console.log('\n🔧 Open browser dev tools and check the Console tab for more detailed logs!');
        console.log('Press any key to continue or Ctrl+C to exit...');
        
        // Wait for user input
        process.stdin.setRawMode(true);
        process.stdin.resume();
        process.stdin.on('data', () => {
            process.exit(0);
        });
        
    } catch (error) {
        console.error('❌ Debug error:', error);
    }
}

// Run the debug
debugPhoneExtraction(); 