import fs from 'node:fs';
const app = fs.readFileSync('app/src/main/assets/app.js','utf8');
console.log('libraryDayTemplate used:', app.includes('const day = libraryDayTemplate(template);'));
const i = app.indexOf('if (!exercises.length');
console.log(app.slice(i, i + 420));
