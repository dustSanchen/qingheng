import fs from 'node:fs';
const app = fs.readFileSync('app/src/main/assets/app.js','utf8');
console.log('meal-row count:', (app.match(/class="meal-row list-row"/g)||[]).length);
