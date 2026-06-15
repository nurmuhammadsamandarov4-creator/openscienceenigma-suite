const path = require('path');
const fs = require('fs');
const Database = require('/Users/nurmuhammadsamandarov/Downloads/OpenScienceEnigmaSuite_66_SOFT_HARD_SCIENCE_BOARDS/server/node_modules/better-sqlite3');

const dbs = ['db.sqlite', 'ose_database.sqlite', 'referral.sqlite'];
const searchStr = 'website-editor';

async function searchDb(dbFile) {
    const dbPath = path.join('/Users/nurmuhammadsamandarov/Downloads/OpenScienceEnigmaSuite_66_SOFT_HARD_SCIENCE_BOARDS/server', dbFile);
    if (!fs.existsSync(dbPath)) {
        console.log(`File not found: ${dbPath}`);
        return;
    }
    
    let db;
    try {
        db = new Database(dbPath);
    } catch (e) {
        console.error(`Failed to open DB ${dbFile}:`, e);
        return;
    }
    
    try {
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
                        if (val.includes(searchStr)) {
                            console.log(`Found in db ${dbFile}, table ${tableName}, col ${col}: ${val.substring(0, 150)}...`);
                        }
                    }
                }
            } catch (e) {
                // ignore row read error
            }
        }
    } catch (e) {
        console.error(`Error searching db ${dbFile}:`, e);
    } finally {
        db.close();
    }
}

async function run() {
    for (const db of dbs) {
        await searchDb(db);
    }
    console.log('DB Search completed.');
}

run();
