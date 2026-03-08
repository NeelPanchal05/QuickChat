const fs = require('fs');
const babel = require('@babel/parser');

try {
  const code = fs.readFileSync('src/components/ChatWindow.js', 'utf8');
  babel.parse(code, {
    sourceType: 'module',
    plugins: ['jsx']
  });
  fs.writeFileSync('test_syntax_out.txt', 'Success - JSX is perfectly balanced!');
} catch (e) {
  fs.writeFileSync('test_syntax_out.txt', e.message);
}
