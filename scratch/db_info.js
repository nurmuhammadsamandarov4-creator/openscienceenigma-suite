const Database = require('/Users/nurmuhammadsamandarov/Downloads/OpenScienceEnigmaSuite_66_SOFT_HARD_SCIENCE_BOARDS/server/node_modules/better-sqlite3');
const dbs = ['db.sqlite', 'ose_database.sqlite', 'referral.sqlite'];

dbs.forEach(dbFile => {
    const dbPath = `/Users/nurmuhammadsamandarov/Downloads/OpenScienceEnigmaSuite_66_SOFT_HARD_SCIENCE_BOARDS/server/${dbFile}`;
    try {
        const db = new Database(dbPath);
        console.log(`\n=== Database: ${dbFile} ===`);
        const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
        tables.forEach(t => {
            console.log(`Table: ${t.name}`);
            const schema = db.prepare(`PRAGMA table_info(${t.name})`).all();
            console.log(`Schema:`, schema.map(c => `${c.name} (${c.type})`).join(', '));
            const count = db.prepare(`SELECT count(*) as cnt FROM ${t.name}`).get();
            console.log(`Rows: ${count.cnt}`);
        });
        db.close();
    } catch (e) {
        console.error(`Error reading ${dbFile}:`, e);
    }
});
