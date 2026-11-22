/**
 * One visible decision for today; the whole-week write is optional and explained.
 * The AI replan has one home (the training page's today sequence), not two.
 */
import fs from 'node:fs';

let fail = 0;
const check = (label, ok, detail) => {
  console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail));
  if (!ok) fail++;
};
const app = fs.readFileSync('app/src/main/assets/app.js', 'utf8');
const css = fs.readFileSync('app/src/main/assets/styles.css', 'utf8');

check('today adoption is the single visible primary', app.includes('data-adopt-today') && app.includes('把今天加入清单') && app.includes('这节加入'));
check('the advice page no longer carries a second AI button', !app.includes('改用 AI 排今天'));
check('the whole-week write is folded as optional', app.includes('id="plan-schedule-more"') && app.includes('把这周写进训练记录') && app.includes('上面的按钮只改今天的安排'));
check('the whole-week write still uses the existing schedule handler', app.includes('data-plan-schedule="1"') && app.includes('data-adopt-today'));
check('the optional fold has a clear summary affordance', css.includes('.plan-schedule-more') && css.includes('.plan-schedule-more>summary'));

// --- 1.5.30：AI 排今天要落到可保存的执行行；训练要求进偏好 -------------------------------
check('AI 排完会重新播种执行区', app.includes('if (typeof renderTrainingLog === "function") renderTrainingLog();') && app.includes('模型这次没有给出清单'));
check('done 不带 reply 时用流式全文兜底', app.includes('let streamedText = "";') && app.includes('streamedText += chunk;') && app.includes('parseAiPlanReply(streamedText)'));
check('流式已画出的动作不会被退回步骤清空', app.includes('if (!planShownRows) {'));
check('推断不出重量时按器械给保守起步值', app.includes('const START = {barbell: 40, dumbbell: 8, machine: 20};') && app.includes('source: "gear"'));
check('训练要求随偏好保存', app.includes('request: readRequest()') && app.includes('paintRequest();'));
check('本周安排会读要求里的时长与排除项', app.includes('const requestMinutes = (request.match(/(\\d{2,3})\\s*分钟/)') && app.includes('excludedMove(item)'));

console.log('FAIL total: ' + fail);
process.exitCode = fail ? 1 : 0;
