import fs from 'node:fs';
const app = fs.readFileSync('app/src/main/assets/app.js','utf8');
const i = app.indexOf('function openQuickRecord');
console.log(app.slice(i, i + 1300));
console.log('=== callers ===');
for (const m of app.matchAll(/openQuickRecord|quick-record/g)) { /* count */ }
console.log('refs:', (app.match(/quick-record/g)||[]).length);
