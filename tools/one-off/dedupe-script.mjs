import fs from 'node:fs';
const f = 'app/src/main/assets/index.html';
let html = fs.readFileSync(f, 'utf8');
const dup = '<script src="./anchors.js" defer></script>';
const first = html.indexOf(dup);
const second = html.indexOf(dup, first + 1);
if (second > 0) { html = html.slice(0, second) + html.slice(second + dup.length); console.log('removed duplicate anchors.js'); }
fs.writeFileSync(f, html);
console.log('count now:', (html.match(/anchors\.js/g)||[]).length);
