import fs from 'node:fs';
import { sectionMap } from './section-map.mjs';

const file = 'app/src/main/assets/index.html';
let html = fs.readFileSync(file, 'utf8');
const before = sectionMap(file);

// 计划卡内加「训练偏好」表单（默认不提供方案，先让用户选）
const anchor = '<h2>训练计划</h2>';
const i = html.indexOf(anchor);
if (i < 0) throw new Error('plan heading missing');
const cardStart = html.lastIndexOf('<article', i);
const cardEnd = html.indexOf('</article>', i);
const block = html.slice(cardStart, cardEnd);
if (!block.includes('id="plan-prefs"')) {
  const form = '<div class="plan-prefs" id="plan-prefs" hidden>' +
    '<div class="pref-row"><label>每周训练<select id="pref-days"><option value="3">3 次</option><option value="4">4 次</option><option value="5">5 次</option><option value="6">6 次</option></select></label>' +
    '<label>分化<select id="pref-split"><option value="ppl">推拉腿</option><option value="ul">上下肢</option><option value="fb">全身</option></select></label></div>' +
    '<div class="pref-row"><label>器械<select id="pref-gear"><option value="barbell">杠铃为主</option><option value="dumbbell">哑铃为主</option><option value="machine">固定器械</option><option value="body">自重</option></select></label>' +
    '<label>单次时长<select id="pref-minutes"><option value="30">30 分钟</option><option value="45">45 分钟</option><option value="60">60 分钟</option></select></label></div>' +
    '<div class="button-row"><button type="button" class="button primary" id="pref-save">生成本周安排</button><button type="button" class="button subtle" id="pref-edit">修改偏好</button></div>' +
    '</div>';
  html = html.slice(0, cardStart) + block.replace(/<div id="week-plan"><\/div>/, '<div id="week-plan"></div>' + form).replace('</article>', form + '</article>') + html.slice(cardEnd + '</article>'.length);
  console.log('prefs form inserted');
} else {
  console.log('prefs form already present');
}
fs.writeFileSync(file, html);

const after = sectionMap(file);
for (const id of Object.keys(before)) {
  const a = before[id], b = after[id];
  if (b && (a.length !== b.length || a.div !== b.div)) console.log('  ' + id.padEnd(17), a.length, '->', b.length);
}
const open = (html.match(/<div\b/g) || []).length, close = (html.match(/<\/div>/g) || []).length;
console.log('div:', open, close, open === close ? 'OK' : 'MISMATCH');
