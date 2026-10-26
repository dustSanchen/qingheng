import fs from 'node:fs';

const f = 'app/src/fragments/60-training-copy.fragment.js';
let t = fs.readFileSync(f, 'utf8');
if (t.includes('本周已经练了什么')) { console.log('already present'); process.exit(0); }

const anchor = "    box.innerHTML = annotateTerms(cueHtml + '<p class=\"plan-today\"><strong>' + esc(todayText) + '</strong></p>'";
if (!t.includes(anchor)) throw new Error('assignment anchor missing');

const week = [
  '    // 本周已经练了什么 —— 之前只显示下周计划。',
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
