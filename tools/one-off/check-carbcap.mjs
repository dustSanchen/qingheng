import fs from 'node:fs';
const t = fs.readFileSync('app/src/main/assets/app.js','utf8');
const i = t.indexOf('function carbCap');
console.log('--- carbCap ---');
console.log(t.slice(Math.max(0,i-200), i+600));
const j = t.indexOf("$('#macro-summary').innerHTML");
console.log('--- usage ---');
console.log(t.slice(j-300, j+420));
