import fs from 'node:fs';
const app = fs.readFileSync('app/src/main/assets/app.js','utf8');
const i = app.indexOf('function empty(');
console.log('empty():', app.slice(i, i + 380).replace(/\n\s*/g,' ').slice(0,380));
console.log('usages:', (app.match(/empty\(/g)||[]).length);
const css = fs.readFileSync('app/src/main/assets/styles.css','utf8');
const j = css.indexOf('.empty-state{');
console.log('css:', css.slice(j, j+260).replace(/\s+/g,' '));
