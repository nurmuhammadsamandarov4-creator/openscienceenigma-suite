const puppeteer = require('puppeteer');
(async () => {
    const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    await page.evaluateOnNewDocument(() => {
        localStorage.setItem('ose_admin_user', JSON.stringify({
            id: 3,
            email: 'nurik@gmail.com',
            name: 'Nurmuhammad',
            is_admin: 1
        }));
        localStorage.setItem('user_id', '3');
    });

    await page.goto('http://localhost:3000/admindashboard/', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 2000));

    const scripts = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('script')).map(s => ({
            src: s.src,
            textContent: s.textContent.substring(0, 200)
        }));
    });

    console.log('--- SCRIPTS ON PAGE ---');
    console.log(scripts);

    await browser.close();
})();
