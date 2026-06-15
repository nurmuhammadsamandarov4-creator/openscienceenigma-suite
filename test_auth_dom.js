const puppeteer = require('puppeteer');

(async () => {
  try {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    
    page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text(), msg.location()));
    page.on('pageerror', err => console.log('BROWSER PAGEERROR:', err.message, err.stack));
    
    await page.goto('http://localhost:3000/');
    await page.evaluate(() => {
      localStorage.setItem('ose_admin_user', JSON.stringify({
        id: 1, name: "Admin", email: "oybekeshbayev@gmail.com", is_admin: 1
      }));
    });
    
    await page.goto('http://localhost:3000/admindashboard/', { waitUntil: 'networkidle0', timeout: 10000 });
    
    await browser.close();
  } catch (e) {
    console.error('PUPPETEER ERROR:', e);
  }
})();
