const fs = require('fs');

const file = '/Users/nurmuhammadsamandarov/Desktop/OpenScienceEnigmaSuite_66_SOFT_HARD_SCIENCE_BOARDS/server/public/index.html';
if (fs.existsSync(file)) {
    const content = fs.readFileSync(file, 'utf8');
    if (content.includes('Oybek')) {
        console.log('Found "Oybek" in Desktop index.html!');
        // Context
        let idx = content.indexOf('Oybek');
        console.log(content.substring(idx - 100, idx + 100));
    } else {
        console.log('No "Oybek" in Desktop index.html.');
    }
} else {
    console.log('Desktop index.html file not found');
}
