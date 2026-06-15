const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.join(__dirname, 'referral.sqlite'));

const row = db.prepare("SELECT json FROM site_content WHERE key = 'team'").get();
if (row) {
    const team = JSON.parse(row.json);
    
    const vacantImageUrl = '/public/images/vacant.jpg';
    
    if (team.members) {
        team.members = team.members.map(m => ({ ...m, name: 'Vacant', imageUrl: vacantImageUrl }));
    }
    if (team.softScienceBoard) {
        team.softScienceBoard = team.softScienceBoard.map(m => ({ ...m, name: 'Vacant', imageUrl: vacantImageUrl }));
    }
    if (team.hardScienceBoard) {
        team.hardScienceBoard = team.hardScienceBoard.map(m => ({ ...m, name: 'Vacant', imageUrl: vacantImageUrl }));
    }
    
    db.prepare("UPDATE site_content SET json = ? WHERE key = 'team'").run(JSON.stringify(team));
    console.log('Successfully updated all team members, soft, and hard science boards to Vacant.');
} else {
    console.log('No team data found in site_content.');
}
