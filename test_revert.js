const puppeteer = require('puppeteer');
(async () => {
    const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    await page.evaluateOnNewDocument(() => {
        localStorage.setItem('admin_id', '1');
        localStorage.setItem('ose_admin_id', '1');
    });

    await page.goto('http://localhost:3000/admindashboard/website', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 2000));
    await page.screenshot({ path: 'revert_test.png' });

    await browser.close();
    console.log('Screenshot saved to revert_test.png');
})();
