import fs from 'node:fs';
const css = fs.readFileSync('app/src/main/assets/styles.css','utf8');
for (const k of ['.card{','.list-row{','.meal-row{','.segment{','.segment-bar{']) {
  const i = css.indexOf(k);
  console.log(k, i>=0 ? css.slice(i, i+200).replace(/\s+/g,' ') : 'MISSING');
}
const app = fs.readFileSync('app/src/main/assets/app.js','utf8');
const hits = [...app.matchAll(/empty\(([^)]{0,80})\)/g)].map(m=>m[1]).slice(0,14);
console.log('empty calls sample:', hits.join(' || ').slice(0,600));
