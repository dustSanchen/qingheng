/**
 * 排课耗时的可见性（2026-11-19，1.4.49）。
 * 事故：1.4.48 把耗时只写进 toast，10 秒自动消失，用户点完说「页面没有弹时间」。
 * 契约：耗时与失败原因必须留在今日顺序卡上，不能只活在提示条里。
 */
import fs from 'node:fs';

let fail = 0;
const check = (label, ok, detail) => { console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail)); if (!ok) fail++; };
const html = fs.readFileSync('app/src/main/assets/index.html', 'utf8');
const app = fs.readFileSync('app/src/main/assets/app.js', 'utf8');

check('the plan card has a slot for the last run timing', html.includes('id="ai-plan-timing"'));
check('timing is rendered from local storage', app.includes('function renderPlanTiming') && app.includes('"qingheng.planTiming."'));
check('renderPlanTiming runs with the plan render', /function renderAiPlan\(\)[\s\S]{0,400}renderPlanTiming\(\)/.test(app));
check('a failed run also leaves evidence', /catch \(error\) \{[\s\S]{0,400}qingheng\.planTiming\.[\s\S]{0,200}error:/.test(app));
check('the toast still carries the numbers', app.includes('耗时 ') && app.includes('首条 '));
check('both numbers come from the same measurement', app.includes('planFirstRowAt') && app.includes('planTotalMs'));
check('the wait is staged with real numbers', app.includes('已取 " + (planStageInfo.recordDays') && app.includes('正在按你的口径排'));
check('the streamed rows take over the busy text', app.includes('if (planShownRows > 0) return;'));
check('the card also reports sets and minutes after the local check', app.includes('Number(timing.sets)') && app.includes('折算 '));

console.log('\nFAIL total: ' + fail);
process.exitCode = fail ? 1 : 0;
