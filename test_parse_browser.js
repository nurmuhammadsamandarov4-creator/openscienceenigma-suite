const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('CONSOLE:', msg.text(), msg.location()));
  page.on('pageerror', err => console.log('PAGEERROR:', err.message));
  
  await page.goto('http://localhost:3000/');
  await page.evaluate(() => {
    localStorage.setItem('ose_admin_user', JSON.stringify({id: 1, name: "Admin", email: "oybekeshbayev@gmail.com", is_admin: 1}));
  });
  
  await page.goto('http://localhost:3000/admindashboard/', { waitUntil: 'networkidle0' });
  
  // Also list all network requests to see if any JS files failed or returned 404
  const performanceTiming = JSON.parse(await page.evaluate(() => JSON.stringify(window.performance.getEntriesByType('resource'))));
  for (const r of performanceTiming) {
    if (r.name.endsWith('.js') && r.responseStatus !== 200) {
       console.log('Failed JS:', r.name, r.responseStatus);
    }
  }

  await browser.close();
})();
