const fs = require('fs');
const acorn = require('acorn');
const code = fs.readFileSync('server/public/admindashboard/assets/index-GwRcjPUc.js', 'utf8');
try {
  acorn.parse(code, { ecmaVersion: 'latest', sourceType: 'module' });
  console.log('Parsed successfully');
} catch (e) {
  console.log('Parse error:', e.message);
  console.log('Context:');
  const pos = e.pos;
  console.log(code.substring(Math.max(0, pos - 50), pos) + ' >>> ' + code.substring(pos, Math.min(code.length, pos + 50)));
}
