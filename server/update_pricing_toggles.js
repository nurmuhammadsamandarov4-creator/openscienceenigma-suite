const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.join(__dirname, 'referral.sqlite'));

const row = db.prepare("SELECT json FROM site_content WHERE key = 'pricing'").get();
if (row) {
    const pricingData = JSON.parse(row.json);
    
    // Update toggle labels for all languages
    for (const lang of ['en', 'ru', 'uz']) {
        if (pricingData[lang]) {
            pricingData[lang].billingMonthly = "Data analysis";
            pricingData[lang].billingYearly = "Editing";
            
            // Optionally clear the discount badge since it's now service selection, not yearly discount
            pricingData[lang].discountBadge = "";
        }
    }
    
    db.prepare("UPDATE site_content SET json = ? WHERE key = 'pricing'").run(JSON.stringify(pricingData));
    console.log('Successfully updated toggle labels in database.');
} else {
    console.log('No pricing data found in database.');
}
