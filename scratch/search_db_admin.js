const Database = require('/Users/nurmuhammadsamandarov/Downloads/OpenScienceEnigmaSuite_66_SOFT_HARD_SCIENCE_BOARDS/server/node_modules/better-sqlite3');
const dbPath = '/Users/nurmuhammadsamandarov/Downloads/OpenScienceEnigmaSuite_66_SOFT_HARD_SCIENCE_BOARDS/server/referral.sqlite';

const db = new Database(dbPath);
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
for (const table of tables) {
    const tableName = table.name;
    const cols = db.prepare(`PRAGMA table_info(${tableName})`).all();
    const textCols = cols.filter(c => ['TEXT', 'VARCHAR', 'BLOB', ''].includes(c.type.toUpperCase())).map(c => c.name);
    
    if (textCols.length === 0) continue;
    
    try {
        const rows = db.prepare(`SELECT * FROM ${tableName}`).all();
        for (const row of rows) {
            for (const col of textCols) {
                const val = String(row[col] || '');
                if (val.includes('/admin/')) {
                    console.log(`Found "/admin/" in db table ${tableName}, col ${col}: ${val.substring(0, 150)}...`);
                }
            }
        }
    } catch (e) {}
}
db.close();
console.log('Search completed.');
