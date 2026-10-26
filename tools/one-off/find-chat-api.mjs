import fs from 'node:fs';
const app = fs.readFileSync('app/src/main/assets/app.js','utf8');
for (const k of ["'/api/chat'", '"/api/chat"', 'api(\'/api/chat']) {
  const i = app.indexOf(k);
  if (i > 0) { console.log('found @', i); console.log(app.slice(i-500, i+700).replace(/\s+/g,' ').slice(0,1100)); break; }
}
