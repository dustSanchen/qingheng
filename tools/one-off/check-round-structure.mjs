/** Structure check for this round's two UI additions. */
import fs from 'node:fs';

const html = fs.readFileSync('app/src/main/assets/index.html', 'utf8');
const app = fs.readFileSync('app/src/main/assets/app.js', 'utf8');
for (const [label, ok] of [
  ['calorie action line', html.includes('id="calorie-action"')],
  ['training insights box', html.includes('id="training-advice-insights"')],
  ['action renderer', app.includes("const actionBox = $('#calorie-action')")],
  ['insights renderer', app.includes('function renderTrainingInsights()')],
  ['insights wired into render', app.includes('renderTrainingInsights();')],
  ['reuses weeklyVolume', app.includes('typeof weeklyVolume === \'function\' ? weeklyVolume() : []')],
]) console.log((ok ? 'PASS  ' : 'FAIL  ') + label);
