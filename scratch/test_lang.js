const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    // Catch page errors and console messages
    page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
    page.on('pageerror', err => console.error('BROWSER ERROR:', err.toString()));

    console.log('Navigating to root...');
    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1000));

    // Get current language from localstorage
    let currentLang = await page.evaluate(() => localStorage.getItem('ose_lang'));
    console.log('Initial language in localStorage:', currentLang);

    // Get the language selector button text
    let buttonText = await page.evaluate(() => {
        const btn = document.querySelector('#langSelector button');
        return btn ? btn.textContent.trim() : 'Button not found';
    });
    console.log('Language button text:', buttonText);

    // Click the language selector button to open the menu
    console.log('Opening language menu...');
    await page.click('#langSelector button');
    await new Promise(r => setTimeout(r, 500));

    // Find the English button and click it
    console.log('Clicking English option...');
    const clicked = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('#langSelector div button'));
        const enBtn = buttons.find(b => b.textContent.trim() === 'English');
        if (enBtn) {
            enBtn.click();
            return true;
        }
        return false;
    });
    console.log('Clicked English option:', clicked);

    if (!clicked) {
        // Let's dump all button texts
        const texts = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('#langSelector div button')).map(b => b.textContent.trim());
        });
        console.log('Available buttons in menu:', texts);
    }

    // Wait for page to reload
    await new Promise(r => setTimeout(r, 2000));

    currentLang = await page.evaluate(() => localStorage.getItem('ose_lang'));
    console.log('New language in localStorage:', currentLang);

    buttonText = await page.evaluate(() => {
        const btn = document.querySelector('#langSelector button');
        return btn ? btn.textContent.trim() : 'Button not found';
    });
    console.log('New language button text:', buttonText);

    // Get hero title text
    const heroTitle = await page.evaluate(() => {
        const titleEl = document.querySelector('h1[data-i18n="hero_title"]');
        return titleEl ? titleEl.textContent.trim() : 'Hero title not found';
    });
    console.log('Hero title text:', heroTitle);

    await browser.close();
})();
