const fs = require('fs');
const file = '/Users/nurmuhammadsamandarov/Downloads/OpenScienceEnigmaSuite_66_SOFT_HARD_SCIENCE_BOARDS/server/public/admindashboard/assets/AdminLayout.vue_vue_type_script_setup_true_lang-vAAOklqO.js';

if (fs.existsSync(file)) {
    const content = fs.readFileSync(file, 'utf8');
    const target = '/admin/';
    let idx = 0;
    while ((idx = content.indexOf(target, idx)) !== -1) {
        console.log(`Found "${target}" at ${idx}`);
        console.log(`Context: ... ${content.substring(idx - 100, idx + 100).replace(/\s+/g, ' ')} ...\n`);
        idx += target.length;
    }
} else {
    console.log('File not found');
}
