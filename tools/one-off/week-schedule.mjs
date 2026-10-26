import fs from 'node:fs';

const f = 'app/src/fragments/60-training-copy.fragment.js';
let t = fs.readFileSync(f, 'utf8');

const start = t.indexOf('    // 本周已经练了什么');
const endMarker = "    box.innerHTML = annotateTerms(thisWeekHtml + cueHtml";
const end = t.indexOf(endMarker);
if (start < 0 || end < 0) throw new Error('this-week block not found');

const block = [
  '    // 本周安排：周一为起点，已练的显示动作，过去的显示「未记录」，今天与之后给建议。',
  '    const weekStart = shiftDay(activeDate, -((new Date(activeDate + "T00:00:00").getDay() + 6) % 7));',
  '    const rotation = ["推", "拉", "腿", "休息", "推", "拉", "休息"];',
  '    const weekRows = [];',
  '    for (let offset = 0; offset < 7; offset++) {',
  '      const day = shiftDay(weekStart, offset);',
  '      const items = exercisesFor(day).filter(item => item && item.name);',
  '      const isToday = day === activeDate;',
  '      const past = day < activeDate;',
  '      let mark = "";',
  '      if (items.length) mark = items.slice(0, 3).map(item => item.name).join("、") + (items.length > 3 ? " 等 " + items.length + " 个" : "");',
  '      else if (isToday) mark = "今天 · 建议 " + rotation[offset];',
  '      else if (past) mark = "未记录";',
  '      else mark = "建议 " + rotation[offset];',
  '      const cls = items.length ? "done" : (isToday ? "today" : (past ? "miss" : "plan"));',
  '      weekRows.push("<li class=\\"wk-" + cls + "\\"><strong>" + esc(day.slice(5)) + "</strong><span>" + esc(mark) + "</span></li>");',
  '    }',
  '    const thisWeekHtml = "<h3 class=\\"plan-sub\\">本周安排 · " + esc(weekStart.slice(5)) + " 起</h3><ul class=\\"plan-week\\">" + weekRows.join("") + "</ul>";',
  ''
].join('\n');

t = t.slice(0, start) + block + t.slice(end);
fs.writeFileSync(f, t);
console.log('this-week schedule generated');

let css = fs.readFileSync('app/src/main/assets/styles.css', 'utf8');
if (!css.includes('.wk-done')) {
  css += [
    '',
    '/* 本周安排：七天一行行，状态用色点与文字区分，不再堆卡片。 */',
    '.plan-week{list-style:none;padding:0;margin:0 0 var(--space-3)}',
    '.plan-week li{display:flex;gap:var(--space-2);align-items:baseline;padding:6px 0;border-bottom:1px solid var(--line);font-size:var(--text-sm)}',
    '.plan-week li:last-child{border-bottom:0}',
    '.plan-week li strong{flex:0 0 44px;color:var(--muted);font-weight:500;font-variant-numeric:tabular-nums}',
    '.plan-week li span{flex:1 1 auto;color:var(--body-text)}',
    '.plan-week .wk-done span{color:var(--accent)}',
    '.plan-week .wk-today span{color:var(--ink);font-weight:600}',
    '.plan-week .wk-miss span{color:var(--muted)}',
    '.plan-week .wk-plan span{color:var(--body-text)}'
  ].join('\n') + '\n';
  fs.writeFileSync('app/src/main/assets/styles.css', css);
  console.log('week list styles');
}
