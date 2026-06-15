const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    console.log('Navigating to homepage...');
    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1000));

    // Open language menu
    console.log('Opening language menu...');
    await page.click('#langSelector button');
    await new Promise(r => setTimeout(r, 500));

    // Analyze coordinates of elements in dropdown
    const coordinates = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('#langSelector div button'));
        return buttons.map(b => {
            const rect = b.getBoundingClientRect();
            return {
                text: b.textContent.trim(),
                top: rect.top,
                bottom: rect.bottom,
                left: rect.left,
                right: rect.right,
                width: rect.width,
                height: rect.height
            };
        });
    });
    console.log('Dropdown item coordinates:', JSON.stringify(coordinates, null, 2));

    // Perform hit testing at coordinates of each button
    const hitTests = await page.evaluate((coords) => {
        return coords.map(c => {
            const x = (c.left + c.right) / 2;
            const y = (c.top + c.bottom) / 2;
            const element = document.elementFromPoint(x, y);
            return {
                text: c.text,
                point: { x, y },
                hitTagName: element ? element.tagName : 'NONE',
                hitId: element ? element.id : 'NONE',
                hitClass: element ? element.className : 'NONE',
                outerHTML: element ? element.outerHTML.substring(0, 150) : 'NONE'
            };
        });
    }, coordinates);

    console.log('Hit test results:', JSON.stringify(hitTests, null, 2));

    await browser.close();
})();
