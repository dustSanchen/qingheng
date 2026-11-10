/**
 * 训练预设动作断言：按部位给常见动作、点一下加一行、沿用上次数据。
 */
import fs from 'node:fs';

let fail = 0;
const check = (label, ok, detail) => { console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail)); if (!ok) fail++; };
const read = path => fs.readFileSync(path, 'utf8');

const app = read('app/src/main/assets/app.js');
const html = read('app/src/main/assets/index.html');
const onboarding = read('app/src/fragments/50-onboarding.fragment.js');
const rest = read('app/src/fragments/70-rest.fragment.js');

// --- presets per body part ---------------------------------------------------------------------------
check('presets are declared once', (app.match(/const EXERCISE_PRESETS/g) || []).length === 1);
for (const [key, label] of [['push', '推'], ['pull', '拉'], ['legs', '腿'], ['other', '其他']]) {
  check(`${label}: has presets`, new RegExp(`\\b${key}: \\[`).test(app));
}
check('legs carry the most options', /legs: \['深蹲'[\s\S]{0,220}平板支撑'\]/.test(app));
check('push includes a bench press', app.includes("push: ['卧推'"));
check('pull includes pull-ups', app.includes("'引体向上'"));

// --- UI -----------------------------------------------------------------------------------------------
check('a chips container exists', html.includes('id="training-presets"'));
check('chips are rendered from the template', app.includes('function renderTrainingPresets()') && app.includes('box.dataset.template = template;'));
check('they render with the log', /renderTrainingPresets\(\);\s*const tag = \$\('#training-tag'\)/.test(app));
check('switching template re-renders them', rest.includes("$('#training-template')?.addEventListener('change', () => renderTrainingPresets());"));

// --- one tap adds a row, reusing the last values --------------------------------------------------------
check('a chip click adds a row', rest.includes("$('#training-presets')?.addEventListener('click', event => {"));
check('the name comes from the chip', rest.includes('const name = chip.dataset.trainingPreset;'));
check('last values are looked up', app.includes('function latestExerciseValues(name)'));
check('lookup scans newest habits first', app.includes("sort((a, b) => String(b.date).localeCompare(String(a.date)))"));
check('incomplete history is skipped', app.includes('if (sets === null || reps === null || weight === null) continue;'));
check('the row is prefilled', app.includes('function appendExerciseRow(name, values)') && app.includes('${attr(values && values.sets)}'));
check('the user is told what was reused', rest.includes('沿用 ${previous.date} 的'));
check('the 12-row cap still applies', app.includes("if (index >= 12) {notice('一次最多记录 12 个动作。', true); return null;}"));

// --- no duplicate declarations after the fix ----------------------------------------------------------
check('the preset block is not duplicated', (onboarding.match(/const EXERCISE_PRESETS/g) || []).length === 1);
check('there is one training log renderer', (onboarding.match(/function renderTrainingLog\(/g) || []).length === 1);

console.log('\nFAIL total: ' + fail);
process.exitCode = fail ? 1 : 0;
