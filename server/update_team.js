const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.join(__dirname, 'referral.sqlite'));

const row = db.prepare("SELECT json FROM site_content WHERE key = 'team'").get();
if (row) {
    const team = JSON.parse(row.json);
    team.softScienceBoard = team.softScienceBoard || [];
    
    const exists = team.softScienceBoard.find(m => m.name === 'Dilfuza Shakirova');
    if (!exists) {
        team.softScienceBoard.unshift({
            name: 'Dilfuza Shakirova',
            role: 'Scholar in Marketing',
            description: 'Dilfuza Shakirova, PhD and experienced scholar in marketing (branding of higher education), and English language education. She has obtained MBA at Webster University and a PhD in economics (marketing). Her research interests include branding of higher education, quality of education service, ESP (English for Specific Purposes), language assessment, and innovative methodologies in higher education. She has published over 50 peer-reviewed articles in national and international journals and is the author of several English course books and academic manuals. She actively contributes to academic research, supervises student research projects, and participates in international scholarly collaboration.',
            imageUrl: '/public/images/dilfuza_shakirova.jpg'
        });
        db.prepare("UPDATE site_content SET json = ? WHERE key = 'team'").run(JSON.stringify(team));
        console.log('Updated team successfully.');
    } else {
        console.log('Already exists');
    }
}
