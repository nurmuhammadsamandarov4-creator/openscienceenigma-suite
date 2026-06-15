const fs = require('fs');
const path = require('path');

const dir = '/Users/nurmuhammadsamandarov/Downloads/OpenScienceEnigmaSuite_66_SOFT_HARD_SCIENCE_BOARDS/server/public/admindashboard';
const targets = [
    'website-editor',
    'linear-gradient',
    '118, 75, 162',
    '102, 126, 234',
    'nav-btn'
];

function walk(currentDir) {
    let results = [];
    const list = fs.readdirSync(currentDir);
    list.forEach(file => {
        const filePath = path.join(currentDir, file);
        const stat = fs.statSync(filePath);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(filePath));
        } else {
            results.push(filePath);
        }
    });
    return results;
}

const files = walk(dir);

files.forEach(file => {
    if (file.endsWith('.png') || file.endsWith('.ico')) return;
    try {
        const content = fs.readFileSync(file, 'utf8');
        targets.forEach(target => {
            let idx = 0;
            while ((idx = content.indexOf(target, idx)) !== -1) {
                console.log(`Found "${target}" in file: ${file} at index ${idx}`);
                const start = Math.max(0, idx - 100);
                const end = Math.min(content.length, idx + target.length + 100);
                console.log(`Context: ... ${content.substring(start, end).replace(/\s+/g, ' ')} ...\n`);
                idx += target.length;
            }
        });
    } catch (e) {
        // ignore
    }
});

console.log('Search completed.');
