const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.join(__dirname, 'referral.sqlite'));

const row = db.prepare("SELECT json FROM site_content WHERE key = 'pricing'").get();
if (row) {
    console.log(JSON.stringify(JSON.parse(row.json), null, 2));
} else {
    console.log("No pricing data found.");
}
