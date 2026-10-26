import fs from 'node:fs';
const app = fs.readFileSync('app/src/main/assets/app.js','utf8');
for (const k of ['estimate-preview', '正在本地压缩', 'async function estimate', '生成估算预览']) {
  const i = app.indexOf(k);
  if (i > 0) { console.log(k, '@', i); console.log(app.slice(Math.max(0,i-160), i+160).replace(/\s+/g,' ').slice(0,300)); }
}
