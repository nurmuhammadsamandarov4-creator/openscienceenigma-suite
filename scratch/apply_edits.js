const fs = require('fs');
const path = require('path');

const downloadsRoot = '/Users/nurmuhammadsamandarov/Downloads/OpenScienceEnigmaSuite_66_SOFT_HARD_SCIENCE_BOARDS';
const desktopRoot = '/Users/nurmuhammadsamandarov/Desktop/OpenScienceEnigmaSuite_66_SOFT_HARD_SCIENCE_BOARDS';

// 1. Clean HTML files
const cleanHtmlSource = path.join(downloadsRoot, 'server/public/admindashboard/index.html');
if (!fs.existsSync(cleanHtmlSource)) {
    console.error('Clean HTML source not found!');
    process.exit(1);
}

const cleanHtmlContent = fs.readFileSync(cleanHtmlSource, 'utf8');

const htmlTargets = [
    path.join(downloadsRoot, 'server/public/admindashboard/index.html'),
    path.join(downloadsRoot, 'admindashboard/dist/index.html'),
    path.join(desktopRoot, 'server/public/admindashboard/index.html'),
    path.join(desktopRoot, 'admindashboard/dist/index.html')
];

htmlTargets.forEach(target => {
    try {
        fs.writeFileSync(target, cleanHtmlContent, 'utf8');
        console.log(`Successfully wrote clean HTML to: ${target}`);
    } catch (e) {
        console.error(`Failed to write to target ${target}:`, e.message);
    }
});

// 2. Add beforeEach route guard to index-GwRcjPUc.js
const jsTargets = [
    path.join(downloadsRoot, 'server/public/admindashboard/assets/index-GwRcjPUc.js'),
    path.join(downloadsRoot, 'admindashboard/dist/assets/index-GwRcjPUc.js'),
    path.join(desktopRoot, 'server/public/admindashboard/assets/index-GwRcjPUc.js'),
    path.join(desktopRoot, 'admindashboard/dist/assets/index-GwRcjPUc.js')
];

jsTargets.forEach(target => {
    if (!fs.existsSync(target)) {
        console.log(`JS Target does not exist (skipping): ${target}`);
        return;
    }
    
    let content = fs.readFileSync(target, 'utf8');
    const guardString = "if(n.path==='/website'){window.location.href='/?editMode=1';return;}";
    
    if (content.includes(guardString)) {
        console.log(`Guard already present in: ${target}`);
        return;
    }
    
    // Let's replace: sh.beforeEach((n,e,t)=>{
    const targetString = "sh.beforeEach((n,e,t)=>{";
    if (content.includes(targetString)) {
        content = content.replace(targetString, targetString + guardString);
        fs.writeFileSync(target, content, 'utf8');
        console.log(`Successfully injected route guard into: ${target}`);
    } else {
        console.error(`Could not find target string "sh.beforeEach((n,e,t)=>{" in: ${target}`);
    }
});

console.log('Edits application completed.');
