const fs = require('fs');
const path = require('path');

const rootDir = '/Users/nurmuhammadsamandarov/Downloads/OpenScienceEnigmaSuite_66_SOFT_HARD_SCIENCE_BOARDS';

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat && stat.isDirectory()) {
            if (file !== 'node_modules' && file !== '.git') {
                results = results.concat(walk(filePath));
            }
        } else {
            if (file === 'index.html') {
                results.push(filePath);
            }
        }
    });
    return results;
}

const files = walk(rootDir);
console.log('Found index.html files:');
files.forEach(file => {
    console.log(file);
});
