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

// --- 1.5.30：AI 排完要能直接保存 -----------------------------------------------------------
// 只留两条行为断言：排完重新播种、推断不出重量时给保守值；流式兜底与字段名属于实现细节，不锁。
check('AI 排完会重新播种执行区', app.includes('if (typeof renderTrainingLog === "function") renderTrainingLog();') && app.includes('模型这次没有给出清单'));
check('推断不出重量时按器械给保守起步值', app.includes('const START = {barbell: 40, dumbbell: 8, machine: 20};') && app.includes('source: "gear"'));

console.log('FAIL total: ' + fail);
process.exitCode = fail ? 1 : 0;
