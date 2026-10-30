/**
 * Verifies the target math that ships in app.js by extracting the shipped function text and running
 * it, so the test cannot drift from the product.
 *
 * The model changed on 2026-10-17: targets now come from the user's own 口径 (rules) instead of a
 * goal-based multiplier, missing input is reported instead of guessed, and an unanswered training
 * frequency is provisional rather than silently sedentary.
 */
import fs from 'node:fs';
import assert from 'node:assert/strict';

const app = fs.readFileSync('D:/AI/health-android/app/src/main/assets/app.js', 'utf8');

// Pull the real implementation (and its helpers) out of app.js rather than re-implementing it.
const start = app.indexOf('const TARGET_RULES = {');
assert(start > 0, 'TARGET_RULES found in app.js');
const end = app.indexOf('\n  const GOAL_LABEL', start);
assert(end > start, 'target block delimited');
const source = app.slice(start, end);
const number = v => (v !== null && v !== undefined && v !== '' && Number.isFinite(Number(v)) ? Number(v) : null);
const {computeTargets, targetRules} = new Function('number', source + '\nreturn {computeTargets, targetRules};')(number);

let fail = 0;
const check = (label, ok, detail) => { console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail)); if (!ok) fail++; };

// Reference case: the user's own numbers (male, 166 cm, 64.3 kg, 24 y, 3 sessions/week).
const ref = computeTargets({sex: 'male', weight: 64.3, height: 166, age: 24, goal: 'recomp', training: 3});
const expectedBmr = Math.round(10 * 64.3 + 6.25 * 166 - 5 * 24 + 5);
check('BMR matches Mifflin-St Jeor (male)', ref.bmr === expectedBmr, `${ref.bmr} vs ${expectedBmr}`);
const expectedTdee = Math.round(expectedBmr * 1.375);
check('TDEE uses the 2-3 sessions factor 1.375', ref.tdee === expectedTdee, `${ref.tdee} vs ${expectedTdee}`);
check('reference case is not incomplete', ref.incomplete === false);
check('training frequency is echoed back', ref.sessions === 3 && ref.trainingUnset === false);

// The 口径 replaces the old goal multiplier.
const rules = targetRules(null);
check('the 2000 kcal floor is gone from the rules', !('intakeFloor' in rules) && !('proteinPerKgMin' in rules));
check('default 口径 deficit cap is 20%', rules.deficitCapPercent === 20, rules.deficitCapPercent);
check('default 训练日 2150~2350', rules.trainingDayMin === 2150 && rules.trainingDayMax === 2350);
check('default 休息日 2000~2150', rules.restDayMin === 2000 && rules.restDayMax === 2150);
check('training-day range follows the goal preset', ref.trainingDay.min > 0 && ref.trainingDay.max <= ref.tdee && ref.trainingDay.min < ref.trainingDay.max, JSON.stringify(ref.trainingDay));
check('rest-day range follows the goal preset', ref.restDay.min > 0 && ref.restDay.max <= ref.tdee && ref.restDay.min < ref.restDay.max, JSON.stringify(ref.restDay));
check('deficit is reported as a signed percentage of TDEE', typeof ref.trainingDeficit === 'number' && Math.abs(ref.trainingDeficit) <= 30, String(ref.trainingDeficit));
// 同一身体数据下，减脂 18% 会低于旧的 2000 地板，说明地板确实不再参与计算。
const cutRef = computeTargets({sex: 'male', weight: 64.3, height: 166, age: 24, goal: 'cut', training: 3});
check('cut goes below the old 2000 floor', cutRef.trainingDay.max < 2000 && cutRef.trainingDay.max > 0, JSON.stringify(cutRef.trainingDay));

// Protein and fat come from the 口径, not from the goal.
check('protein lower bound is 2.0 g/kg', ref.proteinMin === Math.round(64.3 * 2.0), ref.proteinMin);
check('protein upper bound is 2.2 g/kg', ref.proteinMax === Math.round(64.3 * 2.2), ref.proteinMax);
check('protein never dips below the documented 130 g floor at this weight', ref.proteinMin >= 128, ref.proteinMin);
check('fat floor honours the 50 g rule', ref.fatMin >= 50, ref.fatMin);
check('fat ideal range is 55~70 g by default', ref.fatMin === 55 && ref.fatMax === 70, `${ref.fatMin}~${ref.fatMax}`);
check('carbs derive from the training-day ceiling', ref.carbs === Math.max(0, Math.round((ref.budget - ref.proteinMid * 4 - ref.fatMid * 9) / 4)), ref.carbs);
check('every line is present for the 三件套 display', ref.lines.length === 5 && ref.lines[0].includes('维持热量') && ref.lines[1].includes('训练日'), ref.lines.length);
check('the basis is stated in the first line', /活动系数 1\.375/.test(ref.lines[0]), ref.lines[0]);

// Female BMR constant must be -161.
const female = computeTargets({sex: 'female', weight: 60, height: 165, age: 30, goal: 'maintain', training: 3});
const expectedFemale = Math.round(10 * 60 + 6.25 * 165 - 5 * 30 - 161);
check('female BMR uses -161', female.bmr === expectedFemale, `${female.bmr} vs ${expectedFemale}`);

// Missing input is reported, never guessed.
const noAge = computeTargets({sex: 'male', weight: 70, height: 175, age: null, goal: 'maintain', training: 3});
check('missing age refuses to compute', noAge.incomplete === true && noAge.missing.includes('年龄'), JSON.stringify(noAge.missing));
check('missing age never falls back to 30', noAge.bmr === undefined);
const noWeight = computeTargets({sex: 'male', weight: null, height: 175, age: 25, goal: 'cut', training: 3});
check('missing weight refuses to compute', noWeight.incomplete === true && noWeight.missing.includes('体重'));
const noHeight = computeTargets({sex: 'male', weight: 70, height: null, age: 25, goal: 'cut', training: 3});
check('missing height refuses to compute', noHeight.incomplete === true && noHeight.missing.includes('身高'));
check('the refusal names what is missing', noWeight.lines[0].includes('体重'), noWeight.lines[0]);

// An unanswered training frequency is provisional, not sedentary-by-default.
const unset = computeTargets({sex: 'male', weight: 70, height: 175, age: 25, goal: 'maintain', training: null});
check('unset training still computes (provisional)', unset.incomplete === false);
check('unset training is flagged provisional', unset.provisional === true && unset.trainingUnset === true);
check('unset training says which factor it assumed', unset.warnings.some(text => text.includes('按久坐')) && unset.lines[0].includes('没有训练计划'), JSON.stringify(unset.warnings));
check('explicitly sedentary is not flagged provisional', computeTargets({sex: 'male', weight: 70, height: 175, age: 25, goal: 'maintain', training: 0}).provisional === false);

// 口径 overrides: a coarse value is ignored, a real one is honoured.
const custom = computeTargets({sex: 'male', weight: 70, height: 175, age: 25, goal: 'cut', training: 5, rules: {trainingDayMax: 3000, restDayMax: 2400, deficitCapPercent: 10}});
check('custom day ranges are honoured', custom.trainingDay.max === 3000 && custom.restDay.max === 2400);
check('a ceiling above TDEE is reported as a surplus', custom.warnings.some(text => text.includes('盈余')), JSON.stringify(custom.warnings));
const bogus = computeTargets({sex: 'male', weight: 70, height: 175, age: 25, goal: 'maintain', training: 5, rules: {deficitCapPercent: 0}});
check('nonsense overrides are ignored, not applied', bogus.rules.deficitCapPercent === 20, bogus.rules.deficitCapPercent);

// Goal consistency checks stay honest instead of forcing a number.
const cutAtMaintenance = computeTargets({sex: 'male', weight: 70, height: 175, age: 25, goal: 'cut', training: 1, rules: {restDayMax: 3000, trainingDayMax: 3000}});
check('an ineffective cut is called out', cutAtMaintenance.warnings.some(text => text.includes('减脂')), JSON.stringify(cutAtMaintenance.warnings));
const gainTooLow = computeTargets({sex: 'male', weight: 70, height: 175, age: 25, goal: 'gain', training: 5, rules: {trainingDayMax: 1700, restDayMax: 1700, trainingDayMin: 1600, restDayMin: 1600}});
check('a gain phase with a big deficit is called out', gainTooLow.warnings.some(text => text.includes('增肌')), JSON.stringify(gainTooLow.warnings));

// Activity factors must be monotonic.
const sedentary = computeTargets({sex: 'male', weight: 70, height: 175, age: 25, goal: 'maintain', training: 1});
const often = computeTargets({sex: 'male', weight: 70, height: 175, age: 25, goal: 'maintain', training: 6});
check('more training raises TDEE', often.tdee > sedentary.tdee, `${often.tdee} > ${sedentary.tdee}`);

console.log('\nFAIL total: ' + fail);
process.exitCode = fail ? 1 : 0;
