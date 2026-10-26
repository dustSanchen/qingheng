import fs from 'node:fs';
const html = fs.readFileSync('app/src/main/assets/index.html','utf8');
for (const m of html.matchAll(/<script[^>]*>/g)) console.log(m[0]);
console.log('body close:', html.includes('</body>'), '| html close:', html.includes('</html>'));
console.log('tail:', JSON.stringify(html.slice(-160)));
