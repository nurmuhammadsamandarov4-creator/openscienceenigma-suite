const Database = require('/Users/nurmuhammadsamandarov/Downloads/OpenScienceEnigmaSuite_66_SOFT_HARD_SCIENCE_BOARDS/server/node_modules/better-sqlite3');
const dbPath = '/Users/nurmuhammadsamandarov/Downloads/OpenScienceEnigmaSuite_66_SOFT_HARD_SCIENCE_BOARDS/server/referral.sqlite';

const db = new Database(dbPath);
const heroRow = db.prepare("SELECT * FROM site_content WHERE key = 'hero'").get();
const i18nRow = db.prepare("SELECT * FROM site_content WHERE key = 'i18n_overrides'").get();

console.log('--- HERO ---');
console.log(JSON.stringify(JSON.parse(heroRow.json), null, 2));

console.log('--- I18N ---');
console.log(JSON.stringify(JSON.parse(i18nRow.json), null, 2));

db.close();
