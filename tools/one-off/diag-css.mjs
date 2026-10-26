import fs from 'node:fs';
const css = fs.readFileSync('D:/AI/health-android/app/src/main/assets/styles.css','utf8');
const open = (css.match(/\{/g)||[]).length, close = (css.match(/\}/g)||[]).length;
console.log('braces:', open, close, open===close?'OK':'MISMATCH');
const bad = [...css.matchAll(/var\(--[a-z0-9-]+\)[0-9a-f]{1,6}\b/gi)].map(m=>m[0]).slice(0,8);
console.log('suspicious var+hex:', bad.length, bad.join(' '));
for (const sel of ['body{','.card{','.segment-bar{','.segment.active{','.view{']) {
  const i = css.indexOf(sel);
  console.log(sel, '->', i >= 0 ? css.slice(i, i + 180).replace(/\s+/g,' ') : 'missing');
}
