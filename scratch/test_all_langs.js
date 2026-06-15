const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
    page.on('pageerror', err => console.error('BROWSER ERROR:', err.toString()));

    async function checkPage(lang) {
        console.log(`\n--- Setting localStorage ose_lang to '${lang}' ---`);
        await page.goto('http://localhost:3000/', { waitUntil: 'networkidle2' });
        await page.evaluate((l) => {
            localStorage.setItem('ose_lang', l);
        }, lang);
        // Reload to apply
        await page.goto('http://localhost:3000/', { waitUntil: 'networkidle2' });
        await new Promise(r => setTimeout(r, 1000));

        const data = await page.evaluate(() => {
            const getTxt = (sel) => {
                const el = document.querySelector(sel);
                return el ? el.textContent.trim() : 'NOT FOUND';
            };
            return {
                langInStorage: localStorage.getItem('ose_lang'),
                langButton: getTxt('#langSelector button'),
                navHome: getTxt('[data-i18n="nav_home"]'),
                heroTitle: getTxt('[data-i18n="hero_title"]'),
                heroDesc: getTxt('#oseHeroSubtitle'),
                featuresTitle: getTxt('[data-i18n="features_title"]'),
                ctaGetStarted: getTxt('[data-i18n="cta_get_started"]')
            };
        });
        console.log(JSON.stringify(data, null, 2));
    }

    await checkPage('uz');
    await checkPage('en');
    await checkPage('ru');

    await browser.close();
})();
