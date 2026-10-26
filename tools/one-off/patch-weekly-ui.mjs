/*
 * Step 4b (UI): expose the weekly review in the push settings form, keep the form's fields in sync
 * with the stored settings, and draw the weekly weight mean on the trends chart.
 */
import fs from 'node:fs';

function patch(file, edits) {
  let text = fs.readFileSync(file, 'utf8');
  const crlf = text.includes('\r\n');
  for (const [label, fromRaw, toRaw] of edits) {
    const from = crlf ? fromRaw.replace(/\n/g, '\r\n') : fromRaw;
    const to = crlf ? toRaw.replace(/\n/g, '\r\n') : toRaw;
    const count = text.split(from).length - 1;
    if (count !== 1) throw new Error(`${file} :: ${label}: expected 1 anchor, found ${count}`);
    text = text.replace(from, to);
    console.log(`ok  ${label}`);
  }
  fs.writeFileSync(file, text);
}

patch('app/src/main/assets/index.html', [
  [
    'weekly fields in the push form',
    '<label class="check-label"><input type="checkbox" name="analysisEnabled"><span>允许在后台自动调用 API 生成分析（消耗 token，需要已保存 Key 与外发许可）</span></label>',
    '<label class="check-label"><input type="checkbox" name="weeklyEnabled" id="weekly-enabled" checked><span>每周复盘（体重周均值、训练次数、三项达标天数、下周调整）</span></label><div class="form-grid"><label>周报星期<select name="weeklyDay" id="weekly-day"><option value="1">周一</option><option value="2">周二</option><option value="3">周三</option><option value="4">周四</option><option value="5">周五</option><option value="6">周六</option><option value="7">周日</option></select></label><label>周报时间<input name="weeklyTime" type="time" value="20:00" required></label></div><label class="check-label"><input type="checkbox" name="analysisEnabled"><span>允许在后台自动调用 API 生成分析（消耗 token，需要已保存 Key 与外发许可）</span></label>',
  ],
]);

patch('app/src/main/assets/app.js', [
  [
    'push form submits the weekly fields',
    "const body = {enabled:form.elements.enabled.checked, morningTime:form.elements.morningTime.value, eveningTime:form.elements.eveningTime.value, analysisEnabled:form.elements.analysisEnabled.checked};",
    "const body = {enabled:form.elements.enabled.checked, morningTime:form.elements.morningTime.value, eveningTime:form.elements.eveningTime.value, weeklyEnabled:form.elements.weeklyEnabled.checked, weeklyDay:Number(form.elements.weeklyDay.value) || 7, weeklyTime:form.elements.weeklyTime.value, analysisEnabled:form.elements.analysisEnabled.checked};",
  ],
  [
    'push form reflects the stored weekly settings',
    "    if (detail) detail.textContent =",
    `    const weeklyEnabled = $('#weekly-enabled'), weeklyDay = $('#weekly-day'), weeklyTime = form?.elements?.weeklyTime;
    if (weeklyEnabled) weeklyEnabled.checked = p.weeklyEnabled !== false;
    if (weeklyDay) weeklyDay.value = String(number(p.weeklyDay) ?? 7);
    if (weeklyTime && p.weeklyTime) weeklyTime.value = p.weeklyTime;
    if (detail) detail.textContent =`,
  ],
  [
    'push summary mentions the weekly report',
    "每天最多 2 条（白天与晚间各一条），两次之间至少间隔 3 小时，不会在同一时段连发两条。",
    "每天最多 2 条（白天与晚间各一条），两次之间至少间隔 3 小时，不会在同一时段连发两条；周报${p.weeklyEnabled === false ? '已关闭' : `每周${['','一','二','三','四','五','六','日'][number(p.weeklyDay) ?? 7] || '日'} ${p.weeklyTime || '20:00'} 一条`}。",
  ],
  [
    'weekly means on the trends chart',
    '    const minWeight=Math.min(...weights),maxWeight=Math.max(...weights)',
    `    // Weekly means are what the written rules use for weight judgement, so they are drawn on top
    // of the raw points instead of being left to the eye.
    const weeklyMeans = (() => {
      const byWeek = new Map();
      for (const row of weightRows) {
        const date = new Date(\`\${row.date}T00:00:00\`);
        if (Number.isNaN(date.getTime())) continue;
        const monday = new Date(date);
        const iso = (date.getDay() + 6) % 7;
        monday.setDate(date.getDate() - iso);
        const key = localDate(monday);
        if (!byWeek.has(key)) byWeek.set(key, []);
        byWeek.get(key).push(number(row.weight));
      }
      return [...byWeek.entries()].map(([week, values]) => ({week, mean: values.reduce((sum, v) => sum + v, 0) / values.length}))
        .sort((a, b) => a.week.localeCompare(b.week));
    })();
    const lastTwo = weeklyMeans.slice(-2);
    const weeklyNote = lastTwo.length === 2
      ? \`本周均值 \${fmt(lastTwo[1].mean)} kg（\${lastTwo[1].week} 起）· 上周均值 \${fmt(lastTwo[0].mean)} kg · 变化 \${lastTwo[1].mean - lastTwo[0].mean >= 0 ? '+' : ''}\${fmt(lastTwo[1].mean - lastTwo[0].mean)} kg\`
      : lastTwo.length === 1 ? \`本周均值 \${fmt(lastTwo[0].mean)} kg · 还缺上一周的数据，暂时无法对比\` : '';
    const minWeight=Math.min(...weights),maxWeight=Math.max(...weights)`,
  ],
]);

console.log('weekly UI wired');
