import fs from 'node:fs';
const dir = 'app/src/fragments';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.fragment.js')).sort();
const joined = files.map(f => fs.readFileSync(dir + '/' + f, 'utf8')).join('\n');
const app = fs.readFileSync('app/src/main/assets/app.js', 'utf8');
console.log('fragments:', files.length, '| joined len:', joined.length, '| app.js len:', app.length);
// 找 app.js 里出现但 frageme 里没有的片段（取片段中长度>40 的行做抽样）
const fragSet = new Set(joined.split(/\r?\n/).map(l => l.trim()).filter(Boolean));
const onlyInApp = app.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 40 && !fragSet.has(l));
console.log('仅在 app.js 的行数:', onlyInApp.length);
console.log(onlyInApp.slice(0, 5).map(l => l.slice(0, 120)).join('\n'));
