import fs from 'node:fs';
const html = fs.readFileSync('app/src/main/assets/index.html','utf8');
for (const m of html.matchAll(/^.*carb.*$/gmi)) console.log('html: ' + m[0].trim().slice(0, 170));
