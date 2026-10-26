import fs from 'node:fs';
const app = fs.readFileSync('app/src/main/assets/app.js','utf8');
for (const k of ['请先勾选本次发送同意','allowExternal','consent']) {
  let i = app.indexOf(k);
  if (i > 0) console.log(k, '@', i, ':', app.slice(Math.max(0,i-260), i+160).replace(/\s+/g,' ').slice(0,420));
}
