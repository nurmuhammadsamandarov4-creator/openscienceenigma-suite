const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
    page.on('pageerror', err => console.error('BROWSER ERROR:', err.toString()));

    console.log('Navigating to homepage to set language to uz initially...');
    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle2' });
    await page.evaluate(() => {
        localStorage.setItem('ose_lang', 'uz');
    });
    
    console.log('Reloading page with language set to uz...');
    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1000));

    // Get current elements in Uzbek
    let data = await page.evaluate(() => {
        const getTxt = (sel) => {
            const el = document.querySelector(sel);
            return el ? el.textContent.trim() : 'NOT FOUND';
        };
        return {
            langInStorage: localStorage.getItem('ose_lang'),
            langButton: getTxt('#langSelector button'),
            navHome: getTxt('[data-i18n="nav_home"]'),
            heroTitle: getTxt('[data-i18n="hero_title"]'),
            ctaGetStarted: getTxt('[data-i18n="cta_get_started"]')
        };
    });
    console.log('Initial Uzbek page state:', JSON.stringify(data, null, 2));

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

    // Wait for the reload and navigation
    console.log('Waiting for reload...');
    await new Promise(r => setTimeout(r, 2000));

    // Get elements after click
    data = await page.evaluate(() => {
        const getTxt = (sel) => {
            const el = document.querySelector(sel);
            return el ? el.textContent.trim() : 'NOT FOUND';
        };
        return {
            langInStorage: localStorage.getItem('ose_lang'),
            langButton: getTxt('#langSelector button'),
            navHome: getTxt('[data-i18n="nav_home"]'),
            heroTitle: getTxt('[data-i18n="hero_title"]'),
            ctaGetStarted: getTxt('[data-i18n="cta_get_started"]')
        };
    });
    console.log('Post-click English page state:', JSON.stringify(data, null, 2));

    await browser.close();
})();
