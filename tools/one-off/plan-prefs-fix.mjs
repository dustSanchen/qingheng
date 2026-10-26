import fs from 'node:fs';
import { sectionMap } from './section-map.mjs';

const file = 'app/src/main/assets/index.html';
let html = fs.readFileSync(file, 'utf8');
const before = sectionMap(file);

const form = [
  '<div class="plan-prefs" id="plan-prefs" hidden>',
  '<div class="pref-row"><label>每周训练<select id="pref-days"><option value="3">3 次</option><option value="4">4 次</option><option value="5">5 次</option><option value="6">6 次</option></select></label>',
  '<label>分化<select id="pref-split"><option value="ppl">推拉腿</option><option value="ul">上下肢</option><option value="fb">全身</option></select></label></div>',
  '<div class="pref-row"><label>器械<select id="pref-gear"><option value="barbell">杠铃为主</option><option value="dumbbell">哑铃为主</option><option value="machine">固定器械</option><option value="body">自重</option></select></label>',
  '<label>单次时长<select id="pref-minutes"><option value="30">30 分钟</option><option value="45">45 分钟</option><option value="60">60 分钟</option></select></label></div>',
  '<div class="button-row"><button type="button" class="button primary" id="pref-save">生成本周安排</button><button type="button" class="button subtle" id="pref-edit">修改偏好</button></div>',
  '</div>'
].join('');

// 1) 先把上次弄丢的 </article> 补回来：计划卡的 </div> 后面直接跟了 <article ...training-log>
const repairAnchor = '</div><article class="card" id="training-log">';
if (html.includes(repairAnchor)) {
  html = html.replace(repairAnchor, '</div></article><article class="card" id="training-log">');
  console.log('restored the plan card closing tag');
}

// 2) 在 #week-plan 之后插入偏好表单
const weekPlanOpen = html.indexOf('<div id="week-plan">');
if (weekPlanOpen < 0) throw new Error('week-plan missing');
const closeTag = '</div>';
const weekPlanClose = html.indexOf(closeTag, weekPlanOpen) + closeTag.length;
if (!html.includes('id="plan-prefs"')) {
  html = html.slice(0, weekPlanClose) + form + html.slice(weekPlanClose);
  console.log('prefs form inserted after #week-plan');
}
fs.writeFileSync(file, html);

const open = (html.match(/<div\b/g) || []).length, close = (html.match(/<\/div>/g) || []).length;
const art = (html.match(/<article\b/g) || []).length, artClose = (html.match(/<\/article>/g) || []).length;
console.log('div:', open, close, open === close ? 'OK' : 'MISMATCH');
console.log('article:', art, artClose, art === artClose ? 'OK' : 'MISMATCH');
const after = sectionMap(file);
for (const id of Object.keys(before)) {
  const a = before[id], b = after[id];
  if (b && (a.length !== b.length || a.div !== b.div)) console.log('  ' + id.padEnd(17), a.length, '->', b.length, 'div', a.div, '->', b.div);
}
