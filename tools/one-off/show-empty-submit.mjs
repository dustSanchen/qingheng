import fs from 'node:fs';
const app = fs.readFileSync('app/src/main/assets/app.js','utf8');
const i = app.indexOf('三样都空着');
console.log(JSON.stringify(app.slice(Math.max(0, i - 200), i + 80)));
