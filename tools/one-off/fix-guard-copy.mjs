import fs from 'node:fs';
const p = 'app/src/fragments/10-rich-answer.fragment.js';
let t = fs.readFileSync(p, 'utf8');
const from = "'记录都在本机，点「重新加载」通常就好。错误：'";
const to = "'点「重新加载」通常就好（记录已保存在本机）。错误：'";
if (t.includes(from)) { t = t.replace(from, to); fs.writeFileSync(p, t); console.log('文案保住了「记录已保存在本机」承诺'); }
else console.log('anchor missing');
