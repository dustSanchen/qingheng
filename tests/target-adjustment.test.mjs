/**
 * 临时目标与估算进度的契约：
 * 临时目标必须改到「区间」这一层，否则第二天界面与 AI 都会读旧区间；
 * 估算等待期只让骨架动，文字不在中途跳来跳去。
 */
import fs from 'node:fs';

let fail = 0;
const check = (label, ok, detail) => { console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail)); if (!ok) fail++; };
const read = path => fs.readFileSync(path, 'utf8');

const head = read('app/src/fragments/00-head.fragment.js');
const targetOffer = read('app/src/fragments/20-permissions-backup.fragment.js');
const rest = read('app/src/fragments/70-rest.fragment.js');
const main = read('app/src/main/java/cn/qingheng/health/MainActivity.java');

const effective = head.slice(head.indexOf('function effectiveProfileForDate'), head.indexOf('function effectiveProfileForDate') + 1800);
check('adjustment is merged before the range is computed',
  effective.indexOf('Object.assign(profile, adjustment.temporary)') > 0
  && effective.indexOf('Object.assign(profile, adjustment.temporary)') < effective.indexOf('const range = intakeRangeForDate'));
check('the range itself is overridden for the temporary day',
  /range\.min = adjusted;\s*range\.max = adjusted;/.test(effective)
  && effective.includes('range.basis = \'临时调整，明天恢复\''));
check('the range helper accepts an explicit profile', head.includes('function intakeRangeForDate(date = activeDate, profileOverride = null)'));

check('the popup reports the value the server stored', targetOffer.includes('saved.temporary') && targetOffer.includes('const temp ='));
check('native effective profile overrides the day boundaries',
  main.includes('"trainingDayMin", "trainingDayMax", "restDayMin", "restDayMax"')
  && main.includes('Double adjustedCalories = finite(values, "calorieTarget")'));

check('estimate progress no longer ticks on a timer', !rest.includes('},1400)') && !rest.includes('clearInterval(ticker)'));
check('estimate status stays one stable line', rest.includes('正在估算这份餐食（') && !rest.includes('正在核算 ${progressNames[progressIndex]}'));
check('streamed names still update the rows', rest.includes('if(names.length>progressNames.length){') && rest.includes('progressNames=names;'));

if (fail) { console.log('\nFAIL total: ' + fail); process.exit(1); }
console.log('\nPASS total: 0 failed');
