const fs = require('fs');

const file = '/Users/nurmuhammadsamandarov/Desktop/OpenScienceEnigmaSuite_66_SOFT_HARD_SCIENCE_BOARDS/server/public/admindashboard/assets/index-GwRcjPUc.js';
if (fs.existsSync(file)) {
    const content = fs.readFileSync(file, 'utf8');
    if (content.includes("beforeEach")) {
        console.log('Found beforeEach in index-GwRcjPUc.js');
        // Let's find index
        let idx = 0;
        while ((idx = content.indexOf('beforeEach', idx)) !== -1) {
            console.log(`Context at ${idx}: ... ${content.substring(idx - 100, idx + 200).replace(/\s+/g, ' ')} ...`);
            idx += 10;
        }
    } else {
        console.log('No beforeEach found in index-GwRcjPUc.js');
    }
} else {
    console.log('File not found');
}
