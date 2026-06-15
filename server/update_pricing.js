const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.join(__dirname, 'referral.sqlite'));

const row = db.prepare("SELECT json FROM site_content WHERE key = 'pricing'").get();
if (row) {
    const pricingData = JSON.parse(row.json);
    
    // We update the english translation. Or all translations.
    for (const lang of ['en', 'ru', 'uz']) {
        if (!pricingData[lang]) pricingData[lang] = {};
        pricingData[lang].plans = [
            {
                key: "rapid",
                name: "Rapid Statistical Review",
                description: "",
                priceMonthly: "$200",
                priceYearly: "$200",
                ctaLabel: "Order Now | $200",
                ctaHref: "/public/create-task.html?service=SVC100",
                features: [
                    "Statistical Review of methods and tests for appropriateness",
                    "Expert feedback on methods, results, and statistical analysis in research with actionable recommendations for improvement",
                    "Statistical Review certificate confirming adherence to statistical reporting best practices that can be shared with journal as an independent assessment"
                ]
            },
            {
                key: "inferential",
                name: "Inferential Statistical Analysis",
                description: "",
                priceMonthly: "$1200",
                priceYearly: "$1200",
                ctaLabel: "Order Now | $1200",
                ctaHref: "/public/create-task.html?service=SVC200",
                features: [
                    "Complex quantitative data analysis (multivariate analysis, ANOVA, ANACOVA) using SPSS, R, STATA, and other tools",
                    "Identification of key results to establish significance",
                    "Drawing of inferences and presenting relevant results in tables/graphs"
                ]
            },
            {
                key: "custom",
                name: "Custom Statistical Support",
                description: "",
                priceMonthly: "Custom",
                priceYearly: "Custom",
                ctaLabel: "Order Now",
                ctaHref: "/public/create-task.html?service=SVC300",
                features: [
                    "Research Design and Methods",
                    "Systematic Review and Data Collection",
                    "Data Analysis",
                    "Manuscript Finalisation",
                    "Research Publication"
                ]
            }
        ];
    }
    
    db.prepare("UPDATE site_content SET json = ? WHERE key = 'pricing'").run(JSON.stringify(pricingData));
    console.log('Successfully updated pricing plans in database.');
} else {
    console.log('No pricing data found in site_content.');
}
