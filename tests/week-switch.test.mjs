/**
 * 「本周安排」的周条点日期（2026-11-19 用户原话）：
 * 「如点击对应日期（21）后页面不跳转（可点回19号），下方显示周六 练什么动作，
 *  今天（对应动作）的动作要点，动作要点内容根据生成的本周安排具体健身项目内容变动。」
 *
 * 契约三层：
 * ① 点周条只换「看哪天」，不动 activeDate —— 周条窗口仍从原来那天起算，页面不跳，能点回今天；
 * ② 下方详情行说清那天练什么（已记录的优先，没记录就按计划）；
 * ③ 动作要点按那天计划里实际要做的动作重算，换一版计划动作变了，要点就跟着变。
 */
import fs from 'node:fs';

let fail = 0;
const check = (label, ok, detail) => { console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail)); if (!ok) fail++; };
const read = path => fs.readFileSync(path, 'utf8');

const app = read('app/src/main/assets/app.js');
const training = read('app/src/fragments/60-training-copy.fragment.js');

// ① 点日期不跳页 -------------------------------------------------------------------------------
// 固定长度的窗口：用「到 const prefs」切片会撞上文件里更早出现的同名片段，切出空串。
const handlerStart = training.indexOf('planBox.addEventListener("click"');
const handler = training.slice(handlerStart, handlerStart + 1800);
check('点周条不再切换 activeDate', !handler.includes('setActiveDate'));
check('点周条只更新选中的预览日', handler.includes('weekDetailDay = day;'));
check('周条窗口的起点不受点击影响', training.includes('const weekStartPlan = startDate;'));
check('预览日越出窗口才回到正在看的那天',
  training.includes('if (!weekDetailDay || weekDetailDay < previewStart || weekDetailDay >= previewEnd) weekDetailDay = activeDate;'));

// ② 详情行说清那天练什么 ------------------------------------------------------------------------
check('详情行按预览日渲染', handler.includes('detail.textContent = weekDetailHtml(day, lastWeekPlan);'));
check('详情行优先说已记录的动作', training.includes("return prefix + '已记录 ' + items.length + ' 个动作 · '"));

// ③ 要点按那天的动作重算，并且能就地替换 ---------------------------------------------------------
check('要点由预览日计算', training.includes('const cueHtml = weekCueHtml(weekDetailDay, plan);'));
check('要点点名那天计划里的动作', training.includes('const cues = typeof libraryCuesFor === \'function\' ? libraryCuesFor(planDay) : [];'));
check('要点块有稳定宿主，点日期时只换这一块', handler.includes('cueHost.innerHTML = weekCueHtml(day, lastWeekPlan);')
  && training.includes('<div id="week-cues-host">'));
check('要点默认展开（点日期就能看到）', training.includes('class="plan-why plan-cue-block" id="week-cues" open'));
check('休息日不给要点', training.includes('是休息日，不排动作要点'));
check('要点标题按日期取名，不写死在「今天」', training.includes('const head = esc(label + \'（\' + (TRAINING_TEMPLATES[planDay.template] || planDay.template) + \'）的动作要点\');'));

// 旧做法与死变量清干净 ---------------------------------------------------------------------------
check('没有留下 setActiveDate 切日期的旧路径', !training.includes('if (typeof setActiveDate === "function") { setActiveDate(day); return; }'));
check('没有留下 explainHtml/cueLabel/cueBody/cueDay/cueIsViewed 残骸',
  !/explainHtml|cueLabel|cueBody|cueDay|cueIsViewed/.test(training));

// 生成物同步 -----------------------------------------------------------------------------------
check('app.js 与片段同步', app.includes('function weekCueHtml(day, plan)') && app.includes('id="week-cues-host"'));

console.log('\nFAIL total: ' + fail);
process.exitCode = fail ? 1 : 0;
