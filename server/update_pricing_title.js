const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.join(__dirname, 'referral.sqlite'));

const row = db.prepare("SELECT json FROM site_content WHERE key = 'pricing'").get();
if (row) {
    const pricingData = JSON.parse(row.json);
    
    // Update the titles
    if (pricingData.en) pricingData.en.title = "Statistical and Data Analysis Services";
    if (pricingData.ru) pricingData.ru.title = "Услуги статистического анализа и анализа данных";
    if (pricingData.uz) pricingData.uz.title = "Statistik va ma'lumotlar tahlili xizmatlari";
    
    db.prepare("UPDATE site_content SET json = ? WHERE key = 'pricing'").run(JSON.stringify(pricingData));
    console.log('Successfully updated pricing section title in database.');
} else {
    console.log('No pricing data found in database.');
}
