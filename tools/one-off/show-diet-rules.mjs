import fs from 'node:fs';
const src = fs.readFileSync('app/src/main/assets/training-principles.js','utf8');
const re = /claim:\s*['"]([^'"]{10,120})['"][\s\S]{0,200}?source:\s*['"]([^'"]+)['"]/g;
let m, out = [];
while ((m = re.exec(src)) && out.length < 40) {
  if (/蛋白|缺口|减脂|增肌|热量|体重/.test(m[1])) out.push(m[2] + ' | ' + m[1]);
}
console.log(out.join('\n'));
