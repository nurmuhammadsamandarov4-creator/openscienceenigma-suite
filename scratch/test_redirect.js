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

    console.log('Navigating to admindashboard...');
    await page.goto('http://localhost:3000/admindashboard/', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 2000));

    // 1. Verify that the duplicate elements are gone
    const duplicateCheck = await page.evaluate(() => {
        const hasOverlay = !!document.getElementById('website-editor-menu-overlay');
        const hasNavBtn = !!document.getElementById('website-editor-nav-btn');
        const hasGradientLink = Array.from(document.querySelectorAll('a')).some(a => a.href.includes('website-editor'));
        return { hasOverlay, hasNavBtn, hasGradientLink };
    });
    
    console.log('Duplicate elements check:', duplicateCheck);

    // 2. Click the Website menu item
    console.log('Clicking "Website" menu link...');
    const clicked = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a'));
        const websiteLink = links.find(a => a.textContent.trim() === 'Website');
        if (websiteLink) {
            websiteLink.click();
            return true;
        }
        return false;
    });

    if (!clicked) {
        console.error('Error: "Website" link not found!');
        await browser.close();
        return;
    }

    // Wait a moment for navigation
    await new Promise(r => setTimeout(r, 2000));
    
    const finalUrl = page.url();
    console.log('Final URL after clicking "Website":', finalUrl);
    
    if (finalUrl.includes('editMode=1')) {
        console.log('SUCCESS: Browser correctly redirected to root with editMode=1!');
    } else {
        console.error('FAILURE: Browser did not redirect correctly. Final URL:', finalUrl);
    }

    await browser.close();
})();
