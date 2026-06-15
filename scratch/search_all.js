const fs = require('fs');
const path = require('path');

const rootDir = '/Users/nurmuhammadsamandarov/Downloads/OpenScienceEnigmaSuite_66_SOFT_HARD_SCIENCE_BOARDS';
const targetString = 'website-editor';

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
            results.push(filePath);
        }
    });
    return results;
}

console.log('Scanning all files...');
const files = walk(rootDir);
let foundCount = 0;

files.forEach(file => {
    try {
        const content = fs.readFileSync(file, 'utf8');
        if (content.toLowerCase().includes(targetString.toLowerCase())) {
            console.log(`Found in: ${file}`);
            foundCount++;
        }
    } catch (e) {
        // ignore errors
    }
});

console.log(`Scan completed. Found ${foundCount} matches.`);
