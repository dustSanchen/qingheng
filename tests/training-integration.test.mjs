/**
 * 训练功能整合（2026-11-22 深夜）：四个已知问题各留一条断言，
 * 以后再动训练相关代码，先跑这个文件。
 *   ① 自重能存：原生校验对空负重放行
 *   ② 草稿不丢：训练表单按日期留内存草稿，重建时还原
 *   ③ 计划说明：搬抽屉不再父子同选，训练卡不再挂 note/timing
 *   ④ 计划按需要：split/gear/minutes 进生成器，起始部位接上一次训练的下一个
 */
import fs from 'node:fs';

let fail = 0;
const check = (label, ok, detail) => {
  console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail));
  if (!ok) fail++;
};
const read = path => fs.readFileSync(path, 'utf8');

const app = read('app/src/main/assets/app.js');
const html = read('app/src/main/assets/index.html');
const main = read('app/src/main/java/cn/qingheng/health/MainActivity.java');
const onboarding = read('app/src/fragments/50-onboarding.fragment.js');
const training = read('app/src/fragments/60-training-copy.fragment.js');

// ① 自重能存
check('the native check allows an empty set weight', main.includes('if (weight != null && (weight < 0 || weight > 500))') &&
  !main.includes('if (weight == null || weight < 0 || weight > 500)'));
check('the JS side already allows it for bodyweight moves', onboarding.includes('const bodyweight = isBodyweightMove(item.name)') &&
  onboarding.includes('!bodyweight && set.weight === null'));

// ② 草稿不丢
check('a per-day draft store exists', onboarding.includes('const trainingDrafts = new Map()') && onboarding.includes('function rememberTrainingDraft()'));
check('the draft is captured on input and on set toggles', onboarding.includes("box.addEventListener('input', remember)") &&
  onboarding.includes("event.target.closest('[data-set-done], [data-set-add], [data-exercise-remove]')"));
check('a rebuild prefers the draft over saved rows', onboarding.includes('draft && draft.length ? draft :'));
check('the draft is dropped after saving and after clearing', onboarding.includes('forgetTrainingDraft();') &&
  read('app/src/fragments/70-rest.fragment.js').includes('forgetTrainingDraft()'));
check('set rows restore their done state', onboarding.includes('set && set.done ? \' is-done\'') && onboarding.includes('done: set.done === true'));

// ③ 计划说明
check('the sheet move no longer picks the nested lead paragraph', app.includes('.plan-requirement, .plan-relation, .plan-why, .plan-label, .plan-load, .plan-load-note, .drift-line') &&
  !app.includes('.plan-why, .plan-why-lead'));
check('the two note lines live in the sheet now', html.includes('id="plan-explain-notes"') && app.includes("for (const id of ['ai-plan-note', 'ai-plan-timing'])"));

// ④ 计划按需要
check('the generator receives split, gear, minutes and a start template', app.includes('split: planPref.split, gear: planPref.gear, minutes: planPref.minutes') &&
  app.includes('startTemplate: nextStartTemplate(planPref.split)'));
check('the weekly sessions come from the preference, not only the profile', training.includes('number(planPref.days) || number(effectiveProfileForDate(activeDate).training)'));
check('templates follow the split', app.includes("split === 'ul' ? ['upper', 'lower'] : split === 'fb' ? ['full'] : ['push', 'pull', 'legs']"));
check('gear filters the movement pool', app.includes('const applyGear = list =>') && app.includes('const GEAR_RE = {'));
check('minutes cap the density', app.includes('const maxMoves = minutes <= 30 ? 3') && app.includes('const setCap = minutes <= 30 ? 3'));
check('the start template continues after the last session', app.includes('function nextStartTemplate(split)') &&
  app.includes("return at >= 0 ? order[(at + 1) % 3] : 'push';"));

console.log('\nFAIL total: ' + fail);
process.exitCode = fail ? 1 : 0;
