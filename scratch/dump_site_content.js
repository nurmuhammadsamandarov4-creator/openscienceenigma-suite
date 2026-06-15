const Database = require('/Users/nurmuhammadsamandarov/Downloads/OpenScienceEnigmaSuite_66_SOFT_HARD_SCIENCE_BOARDS/server/node_modules/better-sqlite3');
const dbPath = '/Users/nurmuhammadsamandarov/Downloads/OpenScienceEnigmaSuite_66_SOFT_HARD_SCIENCE_BOARDS/server/referral.sqlite';

const db = new Database(dbPath);
const rows = db.prepare("SELECT * FROM site_content").all();
rows.forEach(row => {
    console.log(`Key: ${row.key}`);
    console.log(`JSON snippet: ${row.json.substring(0, 500)}`);
});
db.close();
