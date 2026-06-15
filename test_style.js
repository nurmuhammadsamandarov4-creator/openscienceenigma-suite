const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:3000/admindashboard/', { waitUntil: 'networkidle0' });
  
  const styles = await page.evaluate(() => {
    const app = document.getElementById('app');
    const login = document.querySelector('.ose-login');
    const body = document.body;
    return {
      body: { display: getComputedStyle(body).display, visibility: getComputedStyle(body).visibility, height: getComputedStyle(body).height, bg: getComputedStyle(body).backgroundColor },
      app: app ? { display: getComputedStyle(app).display, visibility: getComputedStyle(app).visibility, height: getComputedStyle(app).height, bg: getComputedStyle(app).backgroundColor } : null,
      login: login ? { display: getComputedStyle(login).display, visibility: getComputedStyle(login).visibility, height: getComputedStyle(login).height, bg: getComputedStyle(login).backgroundColor } : null
    };
  });
  
  console.log('COMPUTED STYLES:', JSON.stringify(styles, null, 2));
  await browser.close();
})();
