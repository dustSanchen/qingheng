/**
 * 计算类行为测试：目标下调公式与临时目标覆盖，直接跑 calc.js，不靠字符串断言。
 */
import fs from 'node:fs';
import vm from 'node:vm';

let fail = 0;
const check = (label, ok, detail) => { console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail)); if (!ok) fail++; };
const ctx = {window: {}};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync('app/src/main/assets/calc.js', 'utf8'), ctx);
const calc = ctx.window.QinghengCalc;

check('calc module loads', !!calc && typeof calc.adjustedTargets === 'function');

const male = calc.adjustedTargets({sex: 'male', calorieTarget: 2000, fatMin: 40, fatMax: 60});
check('male 2000 drops 10% and rounds to 50', male.ok && male.calorieTarget === 1800, JSON.stringify(male));
check('fat max drops 10% without going under the floor', male.ok && male.fatMax === 54, String(male.fatMax));

const floor = calc.adjustedTargets({sex: 'female', calorieTarget: 1300, fatMin: 40, fatMax: 60});
check('the female safety floor is never crossed', floor.ok && floor.calorieTarget >= 1200, String(floor.calorieTarget));

const atFloor = calc.adjustedTargets({sex: 'male', calorieTarget: 1500, fatMin: 30, fatMax: 50});
check('a target already at the floor is refused', !atFloor.ok && atFloor.reason === 'floor');

const missing = calc.adjustedTargets({sex: 'male', fatMin: 30, fatMax: 50});
check('a missing target is refused', !missing.ok && missing.reason === 'missing');

const base = {min: 1900, max: 2100, trainingDay: {min: 2100, max: 2300}, restDay: {min: 1900, max: 2100}, basis: '减脂'};
const overridden = calc.applyTemporaryRange(base, {calorieTarget: 1800});
check('the temporary value becomes both bounds', overridden.min === 1800 && overridden.max === 1800);
check('training and rest days are overridden too', overridden.trainingDay.max === 1800 && overridden.restDay.min === 1800);
check('the override says it expires tomorrow', overridden.basis === '临时调整，明天恢复');
check('the base range is not mutated', base.min === 1900 && base.trainingDay.max === 2300);
check('no adjustment returns the same range', calc.applyTemporaryRange(base, null) === base);

if (fail) { console.log('\nFAIL total: ' + fail); process.exit(1); }
console.log('\nPASS total: 0 failed');
