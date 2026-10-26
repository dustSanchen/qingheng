import fs from 'node:fs';
const html = fs.readFileSync('app/src/main/assets/index.html','utf8');
const open = (html.match(/<div\b/g)||[]).length;
const close = (html.match(/<\/div>/g)||[]).length;
console.log('div balance:', open, close, open===close ? 'OK' : 'MISMATCH');
const app = fs.readFileSync('app/src/main/assets/app.js','utf8');
console.log('loadState defined:', app.includes('function loadState'));
console.log('boot then chain:', app.includes('loadState().then'));
