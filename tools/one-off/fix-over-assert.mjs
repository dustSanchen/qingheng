import fs from 'node:fs';
let t = fs.readFileSync('tests/layout-four.test.mjs','utf8');
const lines = t.split(/\r?\n/);
const idx = lines.findIndex(l => l.includes('over-target days are marked'));
if (idx < 0) throw new Error('line missing');
lines[idx] = "check('each bar carries its state class', app.includes('class=\"${stateKey}\"'));";
fs.writeFileSync('tests/layout-four.test.mjs', lines.join('\n'));
console.log('replaced:', lines[idx].slice(0, 90));
