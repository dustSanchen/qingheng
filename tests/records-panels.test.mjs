/**
 * 记录页分段化断言：三段存在、卡片归位、跳转先切段、不健身时隐藏训练段。
 */
import fs from 'node:fs';

let fail = 0;
const check = (label, ok, detail) => { console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail)); if (!ok) fail++; };
const read = path => fs.readFileSync(path, 'utf8');
const app = read('app/src/main/assets/app.js');
const css = read('app/src/main/assets/styles.css');
const html = read('app/src/main/assets/index.html');

check('three segments are declared', /label: '饮食'/.test(app) && /label: '训练'/.test(app) && /label: '身体'/.test(app));
check('every card lands in a segment', ['轻松记一餐', '最近的餐食记录', '训练日志', '今天体重', '身体数据', '日常习惯']
  .every(h => app.includes(`'${h}'`)));
check('body opens with today\'s weight, then the body card and habits', app.includes("headings: ['今天体重', '身体数据', '日常习惯']"));
check('the food segment keeps two cards and nothing is folded any more', app.includes("headings: ['轻松记一餐', '最近的餐食记录']") && !app.includes("foldedHeadings: ['食品热量参考库'"));
check('plan, today order, then logging', app.includes("headings: ['训练计划', '今日顺序', '训练日志']"));
check('training overview belongs to the training segment', app.includes('panels.training.insertBefore(overview, logCard)'));
check('plan preferences can be collapsed again', app.includes('edit.textContent = collapsed ? "改偏好" : "取消"') &&
  app.includes('restoreSaved();') && app.includes('"改训练偏好"'));
check('entering records from another page opens food first', app.includes("tab === 'records' && currentTab !== 'records' && !sub"));
check('training save outranks week planning', html.includes('class="button subtle" id="pref-save"') && html.includes('class="button primary" type="submit">保存训练'));
check('the installer runs at boot', app.includes('installRecordPanels();'));
check('segments are buttons with role=tab', app.includes('role="tab" data-records-panel='));
check('one segment is visible at a time', app.includes("node.hidden = panel.key !== target"));
check('the choice is remembered', app.includes("localStorage.setItem(RECORD_PANEL_STORAGE, target)"));
check('training segment hides for a no-training profile', app.includes('panel.trainingOnly && !trainingEnabled()'));
check('jumps pick the owning segment', app.includes('function recordPanelForField(id)') && app.includes("return 'body';"));
check('reveal switches before focusing', /switchRecordPanel\(recordPanelForField\(id\)\);/.test(app));
check('the sleep chip lands in the body segment', app.includes("addSecondary({id: 'sleep', kind: 'sleep', label: '补睡眠', target: 'habit-sleep'})") && app.includes("['habit-sleep', 'habit-steps', 'habit-form', 'measurement-weight', 'measurement-form']"));
check('a no-training profile never opens an empty records page', app.includes("if (target === 'training' && !trainingEnabled()) target = 'food';"));
check('the training quick chip is hidden without a plan', app.includes(".filter(([, , focus]) => focus !== 'training-form' || trainingEnabled())"));
check('body composition is not hidden with training', read('app/src/main/assets/index.html').includes('id="body-comp-card"') && app.includes("headings: ['体重变化', '上周回看', '身体成分对照', '身体记录明细']"));
check('the bar is sticky and styled', css.includes('.segment-bar{position:sticky') && css.includes('.segment[aria-selected="true"]'));
check('both skins share the hairline segment bar', css.includes('#view-records .segment-bar,#view-trends .segment-bar{border:0;border-bottom:1px solid var(--line)') &&
  !css.includes('[data-skin="ledger"] #view-records .segment-bar'));
check('paper cards use open sections while ledger cards keep one frame', css.includes('.card{background:transparent;border:0;border-radius:0;padding:var(--card-pad) 0') &&
  css.includes('[data-skin="ledger"] .card{background:var(--surface);border:1px solid var(--line);border-radius:var(--shape-card-radius)'));
check('paper navigation rows use separators while ledger rows keep a frame', css.includes('.hub-row{display:flex;align-items:center;gap:14px;width:100%;min-height:var(--btn-h);padding:16px 20px;border:0;border-bottom:1px solid var(--line)') &&
  css.includes('[data-skin="ledger"] .hub-row{border:1px solid var(--line)') &&
  css.includes('border-radius:0;background:transparent;color:var(--ink);text-align:left;}') &&
  css.includes('border-radius:var(--shape-row-radius);background:var(--surface);}'));
check('ledger card headings do not duplicate the outer frame', css.includes('[data-skin="ledger"] .card-heading{padding-bottom:0;border-bottom:0}'));
check('day disclosures are open sections in both skins', css.includes('.day-more{border-block:1px solid var(--line);background:transparent;padding:var(--space-3) 0}') &&
  css.includes('.day-more .card{margin:0;padding:var(--space-3) 0;border:0;border-top:1px solid var(--line)') &&
  css.includes('.day-more .card:first-of-type{border-top:0}'));
check('draft state keeps its dashed boundary after paper cards are opened', css.includes('.training-draft{border:1px dashed var(--accent-line)'));
const profileMore = app.slice(app.indexOf('function installProfileMore()'), app.indexOf('function installTrendPanels()'));
check('skin selection leads the appearance sub-page', profileMore.indexOf("$('#skin-card')") >= 0 &&
  profileMore.includes('appearance.insertBefore(skin, anchor)'));
check('hidden panels do not take space', css.includes('.record-panel[hidden]{display:none}'));
check('ledger record controls use a 2px physical hairline at 480 dpi', /\[data-skin="ledger"\] #view-records input:not\(\[type=checkbox\]\):not\(\[type=radio\]\),\s*\[data-skin="ledger"\] #view-records select,\s*\[data-skin="ledger"\] #view-records textarea\{border-width:\.67px\}/.test(css));
check('ledger form cells own separators without nested control borders', css.includes('[data-skin="ledger"] #view-records .form-grid>label input:not([type=checkbox]):not([type=radio])') &&
  css.includes('border:0;border-radius:0;background:transparent;padding-left:0;padding-right:0'));
check('training entries use bottom separators instead of closed cards', /\.training-row\{[^}]*border:0;border-bottom:1px solid var\(--line\);border-radius:0/.test(css) &&
  css.includes('#training-exercises .training-row:last-child{border-bottom:0}'));
check('folded cards do not keep a second frame', css.includes('details.panel-more{margin:var(--space-3) 0;border:0;border-top:1px solid var(--line)') &&
  css.includes('.panel-more>.card{margin:var(--space-2) 0 0;padding:var(--space-2) 0;border:0') &&
  !css.includes('.profile-more'));

console.log('\nFAIL total: ' + fail);
process.exitCode = fail ? 1 : 0;
