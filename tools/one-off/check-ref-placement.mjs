import fs from 'node:fs';
const app = fs.readFileSync('app/src/main/assets/app.js','utf8');
const i = app.indexOf('整理图参考处方');
console.log('found at', i);
console.log(app.slice(Math.max(0,i-700), i+120));
console.log('--- append site ---');
const j = app.indexOf("+ suggestedNote + why");
console.log(app.slice(Math.max(0,j-200), j+220));
