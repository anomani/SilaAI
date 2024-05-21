const puppeteer = require('puppeteer');
require('dotenv').config();
const fs = require('fs');


const apiKey = "ZhbhUCATxr8MyoQO";
async function getAppointments() {
    const browserWSEndpoint = `wss://chrome-v2.browsercloud.io?token=${apiKey}`;
    let browser;
    try {
        // Connect to BrowserCloud
        browser = await puppeteer.launch({headless: false});
        const page = await browser.newPage();

        // Initial login to Squarespace
        await page.goto(
            "https://secure.acuityscheduling.com/login.php?redirect=1#/", {
            waitUntil: 'domcontentloaded'
        });
        
        await page.type("input[type='email']", "anomani@seas.upenn.edu");

        await page.click("input[name='login']");
        await page.waitForNavigation({ waitUntil: 'domcontentloaded' });
        await page.type("input[type='email']", "anomani@seas.upenn.edu");
        await page.type("input[type='password']", "Maks.9611");

        await page.click("button[data-test='login-button']");


        //Clicking on menu button
        await page.waitForSelector('div[data-test="appshell-container"]', { timeout: 60000 });

        await page.waitForSelector('iframe[data-test="scheduling"]', { timeout: 60000 });

        //Capture iframe
        const frameHandle = await page.$('iframe[data-test="scheduling"]');
        const frame = await frameHandle.contentFrame();
        
        await frame.waitForSelector('button[data-testid="mobile-nav-button"]', { timeout: 60000 });
        
        await frame.click('button[data-testid="mobile-nav-button"]');
        
        //Now, at this point we have clicked on the side menu, we need to click on clients
        await frame.waitForSelector('button[data-testid="left-nav-item"]', { timeout: 60000 });

        
        await frame.click('button[data-testid="left-nav-item"]');

        //We are on the clients page now need to click import/export
        await frame.waitForSelector('a[data-testid="left-nav-item"][href="/config/scheduling-service/clients.php?action=importexport"]', { timeout: 60000 });

        
        await frame.click('a[data-testid="left-nav-item"][href="/config/scheduling-service/clients.php?action=importexport"]');

        //Now, click on the export clients list
        await frame.waitForSelector('a.btn.btn-inverse.btn-bordered.btn-md.btn-client-export.margin-right.margin-bottom', { timeout: 60000 });

        
        await frame.click('a.btn.btn-inverse.btn-bordered.btn-md.btn-client-export.margin-right.margin-bottom');

        //Click on export clients
        await frame.waitForSelector('input[type="submit"].btn.btn-default[value="Export Clients"]', { timeout: 60000 });
        await frame.click('input[type="submit"].btn.btn-default[value="Export Clients"]');

        
    // Ensure the button is visible and scroll into view if necessary
    // await page.evaluate(() => {
    //   const button = document.querySelector('button[data-testid="mobile-nav-button"]');
    //   if (button) {
    //     button.scrollIntoView();
    //   }
    // });
    
    // Click the button
    // await page.click('button[data-testid="mobile-nav-button"]');

        
    

        // return clientsPageContent;
    } catch (error) {
        console.error("Error:", error);
    // } finally {
    //     if (browser) {
    //         await browser.close();
    //     }
    // }
    }
}

// function extractAppointmentsFromHtml(html) {
//     const dom = new JSDOM(html);
//     const document = dom.window.document;

//     const rows = document.querySelectorAll('table tbody tr');
//     return Array.from(rows).map(row => {
//         const cells = row.querySelectorAll('td');
//         return {
//             name: cells[1].innerText,
//             phone: cells[2].innerText,
//             datetime: cells[3].innerText,
//         };
//     });
// }

getAppointments()

module.exports = getAppointments;


