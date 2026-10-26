/** 清理：v1 与 v3 各插入了一份预设块，删掉较早的一份并去重调用。 */
import fs from 'node:fs';

const file = 'app/src/fragments/50-onboarding.fragment.js';
let text = fs.readFileSync(file, 'utf8');
const marker = '/** Common lifts per template, ordered the way most people train them. */';
const first = text.indexOf(marker);
const second = text.indexOf(marker, first + marker.length);
if (first < 0 || second < 0) throw new Error('expected two preset blocks, found: ' + [first, second].join(','));
text = text.slice(0, first) + text.slice(second);
// 只保留一次调用
const call = '    renderTrainingPresets();\n';
const occurrences = text.split(call).length - 1;
if (occurrences > 1) text = text.replace(call + call, call);
if (occurrences > 2) throw new Error('unexpected call count: ' + occurrences);
fs.writeFileSync(file, text);
const check = fs.readFileSync(file, 'utf8');
console.log('EXERCISE_PRESETS blocks:', (check.match(/const EXERCISE_PRESETS/g) || []).length);
console.log('renderTrainingLog:', (check.match(/function renderTrainingLog\(\)/g) || []).length);
console.log('renderTrainingPresets calls:', (check.match(/^\s*renderTrainingPresets\(\);/gm) || []).length);
