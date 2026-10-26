import fs from 'node:fs';
const app = fs.readFileSync('app/src/main/assets/app.js','utf8');
for (const k of ['notice = ', 'const notice', 'function showNotice', 'global-notice']) {
  const i = app.indexOf(k);
  if (i > 0) console.log(k, '@', i, ':', app.slice(i, i + 260).replace(/\s+/g,' ').slice(0, 260));
}
