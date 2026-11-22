/**
 * 结束训练弹窗 + 今天页单卡 + 休息内联（2026-11-22, 1.5.16）。
 * 约定：弹窗只拼本地数字；耗时来自本机起点；聊天与训练都不因弹窗多一次网络往返。
 */
import fs from 'node:fs';

let fail = 0;
const check = (label, ok, detail) => {
  console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail));
  if (!ok) fail++;
};
const html = fs.readFileSync('app/src/main/assets/index.html', 'utf8');
const app = fs.readFileSync('app/src/main/assets/app.js', 'utf8');
const css = fs.readFileSync('app/src/main/assets/styles.css', 'utf8');

// --- 今天页：体检并进能量卡 ---------------------------------------------------------------
check('the check lives inside the energy card', html.indexOf('id="energy-check"') > html.indexOf('class="card energy-card"') &&
  html.indexOf('id="energy-check"') < html.indexOf('id="today-habits-card"'));
check('the standalone check card is gone', !html.includes('id="daily-check-card"'));
check('renderers keep their mount points', html.includes('id="daily-check"') && html.includes('id="daily-check-tag"'));
check('the merged section is separated by a hairline', css.includes('.energy-check{margin-top:12px;padding-top:12px;border-top:1px solid var(--line)}'));

// --- 训练页顺序与折叠 -------------------------------------------------------------------
check('the week overview sits above the training card', html.indexOf('id="training-overview"') < html.indexOf('id="training-log"'));
check('the overview opens by default', html.includes('<details class="train-overview" id="training-overview" open>'));
check('the plan list is gone; the toolbar and the one primary remain', !html.includes('id="ai-plan-fold"') && !html.includes('id="ai-plan-list"') &&
  html.includes('id="training-toolbar"') && html.includes('id="ai-plan-ask"') &&
  /<div class="log-actions"><button class="button primary" type="submit">保存训练<\/button><\/div>/.test(html));
check('the toolbar carries AI re-order and add-exercise', html.includes('id="ai-plan-ask"') && html.includes('id="training-add"') && !html.includes('id="training-more"'));
check('postpone and clear left the more sheet', html.includes('id="ai-plan-postpone"') && html.includes('id="training-clear"') &&
  !html.includes('id="training-more-sheet"') && html.includes('class="log-tools"'));

// --- 休息倒计时内联 ---------------------------------------------------------------------
check('the rest strip carries its own countdown', app.includes('data-rest-inline') && app.includes('rest-line-bar'));
check('the same paint routine drives both surfaces', /function paintRest\(left\)[\s\S]{0,2200}data-rest-inline[\s\S]{0,200}休息/.test(app));
check('clicking the inline countdown cancels the timer', /data-rest-inline[\s\S]{0,400}startRestTimer\(false, restLength\)/.test(app));
check('the floating pill yields while the strip is visible', app.includes('function restLineVisible') && /restTick \? !inline/.test(app));

// --- 结束训练弹窗 -----------------------------------------------------------------------
check('askConfirm can render extra content', app.includes('options.bodyHtml') && html.includes('id="app-dialog-body"'));
check('the dialog body starts hidden', /id="app-dialog-body" hidden/.test(html));
check('the dialog shows the session totals', app.includes('function trainingSaveDialogHtml') &&
  app.includes("parts.push('容量 '") && app.includes('个动作') && app.includes('有氧 '));
check('the dialog asks for real duration and effort', app.includes('sessionMinutesEstimate') &&
  app.includes('name="durationMin"') && app.includes('今天练下来感觉如何？'));
check('the dialog offers a fill-in-later exit', app.includes('data-dialog-fill'));
check('saving one screen writes duration with the log', /async function saveTrainingLog[\s\S]{0,7000}durationMin: Math\.round/.test(app));
check('effort is submitted in the same confirmation', /async function saveTrainingLog[\s\S]{0,7000}saveTrainingEffort\(chosenEffort\)/.test(app));
check('the session start is recorded and cleared', app.includes('markSessionStart()') &&
  app.includes('clearSessionStart()') && app.includes("'qingheng.sessionStart.'"));

console.log('\nFAIL total: ' + fail);
process.exitCode = fail ? 1 : 0;
