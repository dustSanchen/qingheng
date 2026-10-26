import fs from 'node:fs';
const html = fs.readFileSync('app/src/main/assets/index.html','utf8');
const i = html.indexOf('native-adapter.js');
console.log(JSON.stringify(html.slice(Math.max(0, i - 60), i + 160)));
