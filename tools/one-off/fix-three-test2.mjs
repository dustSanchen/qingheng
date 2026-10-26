import fs from 'node:fs';
const file = 'tests/daily-three-copy.test.mjs';
const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
const idx = lines.findIndex(l => l.includes('an empty submit is refused'));
if (idx < 0) throw new Error('line missing');
lines[idx] = "check('an empty submit is refused', /if \\(trainingValue === '' && sleep === null && weight === null\\)[\\s\\S]{0,40}三样都空着/.test(app));";
fs.writeFileSync(file, lines.join('\n'));
console.log('rewritten:', lines[idx].slice(0, 120));
