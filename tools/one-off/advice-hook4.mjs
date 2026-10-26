import fs from 'node:fs';
const p = 'app/src/fragments/10-rich-answer.fragment.js';
let t = fs.readFileSync(p, 'utf8');
const lines = t.split(/\r?\n/);
const i = lines.findIndex(l => /applyTrainingVisibility\(\);/.test(l));
console.log('line', i + 1, JSON.stringify(lines[i]));
if (i >= 0 && !t.includes('renderAdviceOrder')) {
  lines.splice(i + 1, 0, '    if (typeof renderAdviceOrder === "function") renderAdviceOrder();');
  fs.writeFileSync(p, lines.join('\n'));
  console.log('hook added');
}
