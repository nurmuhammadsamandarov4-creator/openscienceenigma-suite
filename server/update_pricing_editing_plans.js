const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.join(__dirname, 'referral.sqlite'));

const row = db.prepare("SELECT json FROM site_content WHERE key = 'pricing'").get();
if (row) {
    const pricingData = JSON.parse(row.json);
    
    // Add editingPlans for all languages
    for (const lang of ['en', 'ru', 'uz']) {
        if (pricingData[lang]) {
            pricingData[lang].editingPlans = [
                {
                    key: "premium-plus",
                    name: "Premium Editing Plus",
                    description: "Publication-focused editing that includes post-submission editorial support",
                    priceMonthly: "$350",
                    priceYearly: "$350",
                    ctaLabel: "Order Now",
                    ctaHref: "/public/create-task.html?service=SVC101",
                    features: [
                        "Complete language check (grammar, terminology, and journal formatting)",
                        "Extensive revisions (rephrasing and restructuring) + cover letter",
                        "Unlimited Q&A with the editor",
                        "Free unlimited rounds of editing",
                        "Journal response letter check",
                        "Crosschecking revisions with reviewer comments"
                    ]
                },
                {
                    key: "premium",
                    name: "Premium Editing",
                    description: "Publication-focused editing that makes your manuscript ready for initial submission",
                    priceMonthly: "$250",
                    priceYearly: "$250",
                    ctaLabel: "Order Now",
                    ctaHref: "/public/create-task.html?service=SVC102",
                    features: [
                        "Complete language check (grammar, terminology, and journal formatting)",
                        "Extensive revisions (rephrasing and restructuring) + cover letter",
                        "Unlimited Q&A with the editor",
                        "Free unlimited rounds of editing"
                    ]
                },
                {
                    key: "advanced",
                    name: "Advanced Editing",
                    description: "For well-organized academic and non-academic documents that require a final check and proofread",
                    priceMonthly: "$150",
                    priceYearly: "$150",
                    ctaLabel: "Order Now",
                    ctaHref: "/public/create-task.html?service=SVC103",
                    features: [
                        "Complete language check (grammar, terminology, and journal formatting)",
                        "Unlimited Q&A with the editor",
                        "60% discount on re-editing"
                    ]
                }
            ];
        }
    }
    
    db.prepare("UPDATE site_content SET json = ? WHERE key = 'pricing'").run(JSON.stringify(pricingData));
    console.log('Successfully updated editing plans in database.');
} else {
    console.log('No pricing data found in database.');
}
