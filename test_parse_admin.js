const fs = require('fs');
const acorn = require('acorn');
const code = fs.readFileSync('server/public/admindashboard/assets/AdminLayout.vue_vue_type_script_setup_true_lang-vAAOklqO.js', 'utf8');
try {
  acorn.parse(code, { ecmaVersion: 'latest', sourceType: 'module' });
  console.log('Parsed successfully');
} catch (e) {
  console.log('Parse error:', e.message);
  const pos = e.pos;
  console.log('Context:');
  console.log(code.substring(Math.max(0, pos - 50), pos) + ' >>> ' + code.substring(pos, Math.min(code.length, pos + 50)));
}
