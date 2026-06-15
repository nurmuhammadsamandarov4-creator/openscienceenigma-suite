const fs = require('fs');
const path = require('path');

const rootDir = '/Users/nurmuhammadsamandarov/Desktop/OpenScienceEnigmaSuite_66_SOFT_HARD_SCIENCE_BOARDS';
const targetString = 'oybek';

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

console.log('Scanning Desktop files...');
const files = walk(rootDir);
let foundCount = 0;

files.forEach(file => {
    try {
        const content = fs.readFileSync(file, 'utf8');
        if (content.toLowerCase().includes(targetString)) {
            console.log(`Found in: ${file}`);
            foundCount++;
        }
    } catch (e) {
        // ignore errors
    }
});

console.log(`Scan completed. Found ${foundCount} matches.`);
