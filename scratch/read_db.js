const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = '/Users/nurmuhammadsamandarov/Desktop/OpenScienceEnigmaSuite_66_SOFT_HARD_SCIENCE_BOARDS/server/referral.sqlite';
const db = new Database(DB_PATH);

try {
  const row = db.prepare("SELECT json FROM site_content WHERE key = ?").get('i18n_overrides');
  if (row) {
    console.log("i18n_overrides raw JSON:");
    console.log(row.json);
  } else {
    console.log("No overrides found for 'i18n_overrides' in site_content table.");
  }
} catch (e) {
  console.error("Error reading database:", e);
}
db.close();
