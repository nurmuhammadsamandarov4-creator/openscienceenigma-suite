const fs = require('fs');
const path = require('path');

const dirs = [
  '/Users/nurmuhammadsamandarov/Desktop/OpenScienceEnigmaSuite_66_SOFT_HARD_SCIENCE_BOARDS/server/public',
  '/Users/nurmuhammadsamandarov/Downloads/OpenScienceEnigmaSuite_66_SOFT_HARD_SCIENCE_BOARDS/server/public'
];

dirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    console.log(`Directory does not exist: ${dir}`);
    return;
  }
  
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    if (path.extname(file) === '.html') {
      const filePath = path.join(dir, file);
      let content = fs.readFileSync(filePath, 'utf8');
      
      let modified = false;
      
      // Update i18n.js to v6
      const i18nRegex = /(src="\/public\/i18n\.js(?:\?v=[a-zA-Z0-9_-]+)?"|src="\.\/i18n\.js(?:\?v=[a-zA-Z0-9_-]+)?")/g;
      if (content.match(i18nRegex)) {
        content = content.replace(i18nRegex, (match) => {
          if (match.includes('/public/')) {
            return 'src="/public/i18n.js?v=20260615_v6"';
          } else {
            return 'src="./i18n.js?v=20260615_v6"';
          }
        });
        modified = true;
      }
      
      // Update lang-ui.js to v6
      const langUiRegex = /(src="\/public\/lang-ui\.js(?:\?v=[a-zA-Z0-9_-]+)?"|src="\.\/lang-ui\.js(?:\?v=[a-zA-Z0-9_-]+)?")/g;
      if (content.match(langUiRegex)) {
        content = content.replace(langUiRegex, (match) => {
          if (match.includes('/public/')) {
            return 'src="/public/lang-ui.js?v=20260615_v6"';
          } else {
            return 'src="./lang-ui.js?v=20260615_v6"';
          }
        });
        modified = true;
      }

      // Update script.js to v6
      const scriptRegex = /(src="\/public\/script\.js(?:\?v=[a-zA-Z0-9_-]+)?"|src="\.\/script\.js(?:\?v=[a-zA-Z0-9_-]+)?")/g;
      if (content.match(scriptRegex)) {
        content = content.replace(scriptRegex, (match) => {
          if (match.includes('/public/')) {
            return 'src="/public/script.js?v=20260615_v6"';
          } else {
            return 'src="./script.js?v=20260615_v6"';
          }
        });
        modified = true;
      }
      
      if (modified) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated cache-busting to v6 in: ${filePath}`);
      }
    }
  });
});
