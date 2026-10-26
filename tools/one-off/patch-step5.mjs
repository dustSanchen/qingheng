/*
 * Step 5: "today's three things" (training / cooking oil / weight) in one submit, and one-tap copies
 * of yesterday's or the most recent meal. Both reuse existing routes; nothing new is invented.
 */
import fs from 'node:fs';

function patch(file, edits) {
  let text = fs.readFileSync(file, 'utf8');
  const crlf = text.includes('\r\n');
  for (const [label, fromRaw, toRaw] of edits) {
    const from = crlf ? fromRaw.replace(/\n/g, '\r\n') : fromRaw;
    const to = crlf ? toRaw.replace(/\n/g, '\r\n') : toRaw;
    const count = text.split(from).length - 1;
    if (count === 0 && text.includes(to)) { console.log(`skip (already applied)  ${label}`); continue; }
    if (count !== 1) throw new Error(`${file} :: ${label}: expected 1 anchor, found ${count}`);
    text = text.replace(from, to);
    console.log(`ok  ${label}`);
  }
  fs.writeFileSync(file, text);
}

patch('app/src/main/assets/index.html', [
  [
    'today: three things card',
    '<article class="card energy-card"><div class="card-heading"><h2>今日能量</h2>',
    '<article class="card" id="daily-three"><div class="card-heading"><h2>今日三样</h2><span class="tag" id="daily-three-tag">待记录</span></div><p class="muted">训练、炒菜用油、体重 —— 每天 30 秒填完这三样，长期趋势就有依据。</p><form id="daily-three-form"><div class="form-grid"><label>今天训练了吗<select name="training"><option value="">未记录</option><option value="true">已训练</option><option value="false">休息 / 未训练</option></select></label><label>炒菜用油 · 勺（1 勺≈10 g≈90 kcal）<input name="oilSpoons" type="number" min="0" max="30" step="0.5" placeholder="没有炒菜可留空"></label><label>体重 · kg<input name="weight" type="number" min="20" max="400" step="0.1" placeholder="空腹、同一状态"></label></div><button class="button primary" type="submit">一次记录三样</button><p class="form-feedback" role="status" aria-live="polite"></p></form></article><article class="card energy-card"><div class="card-heading"><h2>今日能量</h2>',
  ],
  [
    'records: copy-a-meal card',
    '<div class="record-grid">\n          <article class="card estimate-card">',
    '<div class="record-grid">\n          <article class="card" id="copy-meal"><div class="card-heading"><h2>复制一餐</h2><span class="tag" id="copy-meal-tag">最近 5 餐</span></div><p class="muted">昨天或最近吃过的同一餐，一键复制到当前日期，再按实际份量微调即可。</p><div class="button-row" id="copy-meal-buttons"></div><p class="fine-print" id="copy-meal-note">复制的记录会标记为「复制」，方便你区分估算与复用。</p></article>\n          <article class="card estimate-card">',
  ],
]);

patch('app/src/main/assets/app.js', [
  [
    'render the daily three card',
    '    const weeklyNode = $(\'#trend-weekly\');',
    `    renderDailyThree();
    const weeklyNode = $('#trend-weekly');`,
  ],
  [
    'daily three helpers',
    '  function numericForm(form, fields) {',
    `  /** "Today's three things" card: training, cooking oil and weight in one submit. */
  function renderDailyThree() {
    const form = $('#daily-three-form');
    if (!form) return;
    const tag = $('#daily-three-tag');
    const habit = (state.habits || []).find(row => row && row.date === activeDate) || {};
    const measurement = (state.measurements || []).find(row => row && row.date === activeDate) || {};
    const training = habit.training === true || habit.training === 'true' ? 'true' : habit.training === false || habit.training === 'false' ? 'false' : '';
    if (document.activeElement !== form.elements.training) form.elements.training.value = training;
    if (document.activeElement !== form.elements.oilSpoons) form.elements.oilSpoons.value = number(habit.oilSpoons) ?? '';
    if (document.activeElement !== form.elements.weight) form.elements.weight.value = number(measurement.weight) ?? '';
    const filled = [training !== '', number(habit.oilSpoons) !== null, number(measurement.weight) !== null].filter(Boolean).length;
    if (tag) tag.textContent = filled === 0 ? '待记录' : filled === 3 ? '已记录三样' : \`已记录 \${filled}/3\`;
  }
  /** One-tap copies: yesterday's meals first, then the most recent ones. */
  function copyCandidates() {
    const rows = (state.meals || []).filter(row => row && validDate(row.date) && !row.needsDate);
    const yesterday = dayOffset(-1);
    const rank = row => (row.date === yesterday ? 0 : 1);
    const key = row => \`\${row.date}|\${row.mealType || ''}|\${row.name || ''}|\${fmt(row.calories, 0)}\`;
    const seen = new Set();
    return rows.slice().sort((a, b) => rank(a) - rank(b) || String(b.date).localeCompare(String(a.date)))
      .filter(row => {
        const id = key(row);
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
      })
      .slice(0, 5);
  }
  function renderCopyMeals() {
    const box = $('#copy-meal-buttons');
    if (!box) return;
    const rows = copyCandidates();
    const tag = $('#copy-meal-tag');
    if (tag) tag.textContent = rows.length ? \`最近 \${rows.length} 餐\` : '暂无可复制记录';
    box.innerHTML = rows.length ? rows.map(row => {
      const label = \`\${row.date === dayOffset(-1) ? '昨天' : String(row.date).slice(5)} · \${mealNames[row.mealType] || '餐食'} · \${row.name || '未命名'}\`;
      return \`<button type="button" class="button subtle" data-copy-meal="\${esc(row.id ?? '')}">\${esc(label)}</button>\`;
    }).join('') : '<span class="fine-print">还没有可复制的餐食记录。</span>';
  }
  /** Copies one meal to the viewed date with a fresh id; totals and items are carried over as-is. */
  async function copyMeal(id) {
    const source = (state.meals || []).find(row => row && String(row.id ?? '') === String(id));
    if (!source) {notice('这条记录已经不存在了。', true); renderCopyMeals(); return;}
    const copy = {...source};
    delete copy.id;
    copy.date = activeDate;
    copy.source = 'quick-copy';
    copy.mealTime = source.mealTime && clockPattern.test(String(source.mealTime)) ? source.mealTime : nowClock();
    copy.mealTimeSource = 'manual';
    delete copy.estimateId;
    delete copy.draftId;
    if (!await askConfirm(\`把「\${source.name || '这一餐'}」复制到 \${activeDate}？复制后可以再改份量。\`, {title: '复制这一餐', ok: '复制'})) return;
    try {
      await api('/api/meals', copy);
      await loadState({quiet: true});
      notice(\`已复制到 \${activeDate}，请核对份量。\`);
    } catch (error) {notice(error.message, true);}
  }
  function numericForm(form, fields) {`,
  ],
  [
    'wire the copy buttons',
    "  for (const id of ['#ob-checks', '#data-checks']) {\n    const node = $(id);\n    if (node) node.addEventListener('click', event => {",
    `  $('#copy-meal-buttons')?.addEventListener('click', event => {
    const button = event.target.closest?.('[data-copy-meal]');
    if (button) copyMeal(button.dataset.copyMeal).catch(error => notice(error.message, true));
  });
  $('#daily-three-form')?.addEventListener('submit', async event => {
    event.preventDefault();
    const form = event.currentTarget, message = $('.form-feedback', form), button = $('button[type=submit]', form);
    if (button.disabled) return;
    const trainingValue = form.elements.training.value;
    const oilSpoons = number(form.elements.oilSpoons.value);
    const weight = number(form.elements.weight.value);
    if (trainingValue === '' && oilSpoons === null && weight === null) {feedback(message, '三样都空着，没有可保存的内容。', true); return;}
    button.disabled = true;
    feedback(message, '正在保存…');
    const saved = [];
    try {
      if (trainingValue !== '' || oilSpoons !== null) {
        await api('/api/habits', {date: activeDate, ...(trainingValue === '' ? {} : {training: trainingValue === 'true'}), ...(oilSpoons === null ? {} : {oilSpoons})});
        saved.push(trainingValue === '' ? '用油' : '训练');
      }
      if (weight !== null) {
        await api('/api/measurements', {date: activeDate, weight});
        saved.push('体重');
      }
      await loadState({quiet: true});
      feedback(message, \`已记录：\${saved.join('、')}。\`);
    } catch (error) {feedback(message, error.message, true);}
    finally {button.disabled = false;}
  });
  for (const id of ['#ob-checks', '#data-checks']) {
    const node = $(id);
    if (node) node.addEventListener('click', event => {`,
  ],
  [
    'render the copy list with the rest',
    '    renderDailyThree();',
    `    renderDailyThree();
    renderCopyMeals();`,
  ],
]);

console.log('step 5 wired');
