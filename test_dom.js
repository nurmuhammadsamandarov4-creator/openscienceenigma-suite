const puppeteer = require('puppeteer');

(async () => {
  try {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    
    page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
    
    await page.goto('http://localhost:3000/admindashboard/', { waitUntil: 'networkidle0', timeout: 10000 });
    
    // Wait for a little bit to ensure rendering
    await new Promise(r => setTimeout(r, 2000));
    
    const html = await page.evaluate(() => document.body.innerHTML);
    console.log('BODY HTML LENGTH:', html.length);
    console.log('BODY HTML PREVIEW:', html.substring(0, 1000));
    
    await browser.close();
  } catch (e) {
    console.error('PUPPETEER ERROR:', e);
  }
})();
