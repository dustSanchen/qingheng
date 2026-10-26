import fs from 'node:fs';
const app = fs.readFileSync('app/src/main/assets/app.js','utf8');
for (const k of ['function notice', 'const chatPayload', 'streamChat(', 'webSearch:']) {
  const i = app.indexOf(k);
  if (i > 0) { console.log('---', k); console.log(app.slice(i, i + 420).replace(/\s+/g,' ').slice(0, 420)); }
}
