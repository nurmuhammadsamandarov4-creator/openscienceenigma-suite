const fs = require('fs');

const file1 = '/Users/nurmuhammadsamandarov/Downloads/OpenScienceEnigmaSuite_66_SOFT_HARD_SCIENCE_BOARDS/server/public/admindashboard/index.html';
const file2 = '/Users/nurmuhammadsamandarov/Downloads/OpenScienceEnigmaSuite_66_SOFT_HARD_SCIENCE_BOARDS/admindashboard/dist/index.html';

console.log('File 1:', fs.existsSync(file1) && fs.readFileSync(file1, 'utf8').includes('website-editor-menu-overlay') ? 'YES' : 'NO');
console.log('File 2:', fs.existsSync(file2) && fs.readFileSync(file2, 'utf8').includes('website-editor-menu-overlay') ? 'YES' : 'NO');
