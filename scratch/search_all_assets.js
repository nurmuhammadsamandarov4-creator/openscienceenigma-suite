const fs = require('fs');
const path = require('path');

const dir = '/Users/nurmuhammadsamandarov/Downloads/OpenScienceEnigmaSuite_66_SOFT_HARD_SCIENCE_BOARDS/server/public/admindashboard/assets';

fs.readdirSync(dir).forEach(file => {
    if (!file.endsWith('.js')) return;
    const filePath = path.join(dir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    
    // search for /admin/ or admin_id
    if (content.includes('/admin/') || content.includes('admin_id')) {
        console.log(`Found match in file: ${file}`);
        // find indices
        let idx = 0;
        while ((idx = content.indexOf('admin', idx)) !== -1) {
            console.log(`  Context at ${idx}: ... ${content.substring(idx - 50, idx + 150).replace(/\s+/g, ' ')} ...`);
            idx += 5;
        }
    }
});
