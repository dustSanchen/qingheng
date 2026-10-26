import fs from 'node:fs';
const p = 'app/src/fragments/10-rich-answer.fragment.js';
let t = fs.readFileSync(p, 'utf8');
if (!t.includes('renderAiPlan')) {
  const lines = t.split(/\r?\n/);
  const i = lines.findIndex(l => /applyTrainingVisibility\(\);/.test(l));
  if (i >= 0) { lines.splice(i + 1, 0, '    if (typeof renderAiPlan === "function") renderAiPlan();'); fs.writeFileSync(p, lines.join('\n')); console.log('render hook added at line', i + 2); }
  else console.log('anchor missing');
} else console.log('hook exists');
