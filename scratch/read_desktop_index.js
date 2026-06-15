const fs = require('fs');

const file = '/Users/nurmuhammadsamandarov/Desktop/OpenScienceEnigmaSuite_66_SOFT_HARD_SCIENCE_BOARDS/server/public/admindashboard/index.html';
if (fs.existsSync(file)) {
    const content = fs.readFileSync(file, 'utf8');
    if (content.includes('website-editor-menu-overlay')) {
        console.log('YES! The desktop index.html contains the injected script!');
    } else {
        console.log('No, the desktop file does not contain the injected script.');
    }
} else {
    console.log('Desktop index.html file not found at:', file);
}
