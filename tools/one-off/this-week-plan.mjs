import fs from 'node:fs';

const f = 'app/src/fragments/60-training-copy.fragment.js';
let t = fs.readFileSync(f, 'utf8');

const anchor = "    box.innerHTML = annotateTerms(cueHtml + '<p class=\"plan-today\"><strong>' + esc(todayText) + '</strong></p>'";
if (!t.includes(anchor)) throw new Error('assignment anchor missing');

const week = [
  '    // 本周已经练了什么 —— 之前只显示下周计划，用户看不到本周。',
  '    const weekStart = shiftDay(activeDate, -((new Date(activeDate + "T00:00:00").getDay() + 6) % 7));',
  '    const weekRows = [];',
  '    for (let offset = 0; offset < 7; offset++) {',
  '      const day = shiftDay(weekStart, offset);',
  '      const items = exercisesFor(day).filter(item => item && item.name);',
  '      if (!items.length) continue;',
  '      const names = items.slice(0, 3).map(item => item.name).join("、");',
  '      weekRows.push("<li><strong>" + esc(day.slice(5)) + "</strong> " + esc(names) + (items.length > 3 ? " 等 " + items.length + " 个动作" : "") + "</li>");',
  '    }',
  '    const thisWeekHtml = weekRows.length',
  '      ? "<h3 class=\\"plan-sub\\">本周 · " + esc(weekStart.slice(5)) + " 起</h3><ul class=\\"plan-week\\">" + weekRows.join("") + "</ul>"',
  '      : "<h3 class=\\"plan-sub\\">本周还没有训练记录</h3>";',
  ''
].join('\n');

t = t.replace(anchor, week + "    box.innerHTML = annotateTerms(thisWeekHtml + cueHtml + '<p class=\"plan-today\"><strong>' + esc(todayText) + '</strong></p>'");
fs.writeFileSync(f, t);
console.log('this-week block added');

let css = fs.readFileSync('app/src/main/assets/styles.css', 'utf8');
if (!css.includes('.plan-week')) {
  css += [
    '',
    '/* 计划卡：先本周（已发生的），再下周（建议）。 */',
    '.plan-sub{margin:var(--space-2) 0 var(--space-1);font-size:var(--text-sm);color:var(--muted);font-weight:500}',
    '.plan-week{margin:0 0 var(--space-3);padding-left:1.1em;font-size:var(--text-sm);line-height:1.75;color:var(--body-text)}',
    '.plan-week strong{font-weight:600;font-variant-numeric:tabular-nums;margin-right:4px}'
  ].join('\n') + '\n';
  fs.writeFileSync('app/src/main/assets/styles.css', css);
  console.log('plan-week styles');
}
