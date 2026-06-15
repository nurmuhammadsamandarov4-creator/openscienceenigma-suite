const puppeteer = require('puppeteer');
(async () => {
    const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    // Set local storage variables on new document to persist after load
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

    // Get the outer HTML of the sidebar or body
    const sidebarHTML = await page.evaluate(() => {
        const aside = document.querySelector('aside');
        return aside ? aside.outerHTML : 'Aside element not found';
    });

    console.log('--- SIDEBAR HTML ---');
    console.log(sidebarHTML);

    await browser.close();
})();
