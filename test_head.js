const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:3000/admindashboard/', { waitUntil: 'networkidle0' });
  
  const headHtml = await page.evaluate(() => document.head.innerHTML);
  console.log('HEAD HTML:', headHtml);
  
  await browser.close();
})();
