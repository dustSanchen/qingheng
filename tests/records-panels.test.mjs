/**
 * 记录页分段化断言：三段存在、卡片归位、跳转先切段、不健身时隐藏训练段。
 */
import fs from 'node:fs';

let fail = 0;
const check = (label, ok, detail) => { console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail)); if (!ok) fail++; };
const read = path => fs.readFileSync(path, 'utf8');
const app = read('app/src/main/assets/app.js');
const css = read('app/src/main/assets/styles.css');

check('three segments are declared', /label: '饮食'/.test(app) && /label: '训练'/.test(app) && /label: '身体'/.test(app));
check('every card lands in a segment', ['轻松记一餐', '复制一餐', '最近的餐食记录', '食品热量参考库', '手动记录餐食', '训练日志', '身体数据', '日常习惯']
  .every(h => app.includes(`'${h}'`)));
check('the installer runs at boot', app.includes('installRecordPanels();'));
check('segments are buttons with role=tab', app.includes('role="tab" data-records-panel='));
check('one segment is visible at a time', app.includes("node.hidden = panel.key !== target"));
check('the choice is remembered', app.includes("localStorage.setItem(RECORD_PANEL_STORAGE, target)"));
check('training segment hides for a no-training profile', app.includes('panel.trainingOnly && !trainingEnabled()'));
check('jumps pick the owning segment', app.includes('function recordPanelForField(id)') && app.includes("return 'body';"));
check('reveal switches before focusing', /switchRecordPanel\(recordPanelForField\(id\)\);/.test(app));
check('the bar is sticky and styled', css.includes('.segment-bar{position:sticky') && css.includes('.segment[aria-selected="true"]'));
check('hidden panels do not take space', css.includes('.record-panel[hidden]{display:none}'));
check('ledger record controls use a 2px physical hairline at 480 dpi', /\[data-skin="ledger"\] #view-records input:not\(\[type=checkbox\]\):not\(\[type=radio\]\),\s*\[data-skin="ledger"\] #view-records select,\s*\[data-skin="ledger"\] #view-records textarea\{border-width:\.67px\}/.test(css));

console.log('\nFAIL total: ' + fail);
process.exitCode = fail ? 1 : 0;
