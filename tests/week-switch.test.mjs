/**
 * 「本周安排」的周条曾经只换一行预览：点周六，下面那行详情改成「拉日」，
 * 但再往下的「动作要点」还写着「今天（推）」，训练日志也仍然是今天那一天——
 * 同一块屏幕上三处读的不是同一个日期。
 *
 * 这一轮的契约：点周条 = 把那天切成正在看的那天（activeDate），
 * 动作要点、训练日志表单与今日顺序都读 activeDate，所以一起跟过去，改完直接存到那一天。
 * 同时「今天」这个词只留给日历上的今天，切到别的一天就写日期。
 */
import fs from 'node:fs';

let fail = 0;
const check = (label, ok, detail) => { console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail)); if (!ok) fail++; };
const read = path => fs.readFileSync(path, 'utf8');

const app = read('app/src/main/assets/app.js');
const training = read('app/src/fragments/60-training-copy.fragment.js');
const onboarding = read('app/src/fragments/50-onboarding.fragment.js');

// --- 点周条切日期，而不是只换预览 ---------------------------------------------------------------
check('点周条切的是正在看的那天',
  training.includes('if (typeof setActiveDate === "function") { setActiveDate(day); return; }'));
check('旧的手动高亮已删（它只换 class，不动日期）',
  !training.includes('node.dataset.weekDay === weekDetailDay'));
check('选中的格子永远等于正在看的那天',
  training.includes('weekDetailDay = activeDate;'));

// --- 「今天」只给日历上的今天 -------------------------------------------------------------------
check('详情行的「今天」按 localDate 判定',
  training.includes("const prefix = (day === localDate() ? '今天' : day.slice(5)) + ' · ';"));
check('周条加深按 localDate 判定',
  training.includes('const isToday = day === localDate();'));
check('要点标签按日期取名，休息日写清属于下一个训练日',
  training.includes(': cueIsViewed ? activeDate.slice(5) : "下一个训练日（" + cueDay.date.slice(5) + "）"'));
check('要点在正在看的那天默认展开',
  training.includes("(cueIsViewed ? ' open' : '')"));

// --- 旧状态没有以死代码的形式留下 ---------------------------------------------------------------
check('没有留下 weekEndPlan / firstPlanDay / cueToday 残骸',
  !/weekEndPlan|firstPlanDay|cueToday/.test(training));

// --- 训练日志跟着那天走，并且能改 ---------------------------------------------------------------
check('训练日志表单读正在看的那天',
  onboarding.includes('const row = habitRowFor(activeDate);')
  && onboarding.includes('const exercises = exercisesFor(activeDate);'));
check('训练日志保存写正在看的那天',
  onboarding.includes('date: activeDate, training: true'));

// --- 生成物与片段同步 ---------------------------------------------------------------------------
check('app.js 与片段同步',
  app.includes('if (typeof setActiveDate === "function") { setActiveDate(day); return; }')
  && app.includes('const isToday = day === localDate();')
  && app.includes('const cueIsViewed = !!(cueDay && cueDay.date === activeDate);'));

console.log('\nFAIL total: ' + fail);
process.exitCode = fail ? 1 : 0;
