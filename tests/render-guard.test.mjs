/**
 * 渲染健壮性断言：state 未加载不抛错、异常变成可重试提示、子页在数据到位后重绘。
 */
import fs from 'node:fs';

let fail = 0;
const check = (label, ok, detail) => { console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail)); if (!ok) fail++; };
const read = path => fs.readFileSync(path, 'utf8');

const app = read('app/src/main/assets/app.js');
const html = read('app/src/main/assets/index.html');
const css = read('app/src/main/assets/styles.css');

check('render is split into a guarded wrapper and a body', app.includes('function render() {') && app.includes('function renderBody() {'));
check('it returns before drawing when state is missing', app.includes('if (!state) return;'));
check('exceptions are caught', /try \{ renderBody\(\); \} catch \(error\) \{ showRenderError\(error\); \}/.test(app));
check('the bar explains the record is safe', app.includes('（记录已保存在本机）'));
check('a retry control exists in the page', html.includes('id="render-error"') && html.includes('id="render-error-retry"'));
check('retry reloads the state', app.includes("$('#render-error-retry')?.addEventListener('click'"));
check('retry failure is reported, not silent', app.includes('重新加载失败，请确认应用仍在前台'));
check('an open subpage is redrawn after loading', app.includes('if (openSub) showSubpage(openSub);'));
check('the bar is above everything and hidden by default', css.includes('.render-error{position:fixed') && css.includes('.render-error[hidden]{display:none}'));

console.log('\nFAIL total: ' + fail);
process.exitCode = fail ? 1 : 0;
