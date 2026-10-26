/*
 * Step 6: a training log (template + exercises with sets/reps/weight) stored on the day's habit row,
 * plus a progressive-overload view that compares weekly volume per exercise.
 *
 * The log merges into the existing row for the date instead of appending, so a day keeps exactly one
 * habit row and training/oil/steps are never split across duplicates.
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
    'training log card',
    '<article class="card" id="copy-meal">',
    `<article class="card" id="training-log"><div class="card-heading"><h2>训练日志</h2><span class="tag" id="training-tag">未记录</span></div><p class="muted">记下今天练了什么：动作、组数、次数、负重。同一动作的容量变化会在趋势页给出，用来判断渐进超负荷。</p><form id="training-form"><div class="form-grid"><label>训练模板<select name="template" id="training-template"><option value="push">推（胸肩三头）</option><option value="pull">拉（背二头）</option><option value="legs">腿（下肢核心）</option><option value="other">其他</option></select></label></div><div id="training-exercises" class="list-stack"></div><div class="button-row"><button class="button subtle" type="button" id="training-add">添加动作</button><button class="button primary" type="submit">保存训练</button><button class="button subtle" type="button" id="training-clear">清空今天的训练</button></div><p class="form-feedback" role="status" aria-live="polite"></p></form></article><article class="card" id="copy-meal">`,
  ],
  [
    'volume table on trends',
    '<div class="card-heading"><h2>身体成分对照</h2>',
    '<div class="card-heading"><h2>训练容量（渐进超负荷）</h2><span class="tag">按周对比</span></div><div id="volume-table"></div><div class="card-heading"><h2>身体成分对照</h2>',
  ],
]);

patch('app/src/main/assets/app.js', [
  [
    'habit row helper',
    '  /** "Today\'s three things" card: training, cooking oil and weight in one submit. */',
    `  /** The habit row for a date; older builds could append duplicates, so keep the fullest one. */
  function habitRowFor(date) {
    const rows = (state.habits || []).filter(row => row && row.date === date);
    if (rows.length <= 1) return rows[0] || null;
    return rows.slice().sort((a, b) => JSON.stringify(b).length - JSON.stringify(a).length)[0];
  }
  const TRAINING_TEMPLATES = {push: '推', pull: '拉', legs: '腿', other: '其他'};
  /** Normalised exercise list of one day: [{name, sets, reps, weight}]. */
  function exercisesFor(date) {
    const row = habitRowFor(date);
    const list = Array.isArray(row?.exercises) ? row.exercises : [];
    return list.map(item => ({
      name: String(item?.name ?? '').slice(0, 60),
      sets: number(item?.sets), reps: number(item?.reps), weight: number(item?.weight)
    })).filter(item => item.name || item.sets !== null || item.reps !== null || item.weight !== null);
  }
  /** Volume = sets × reps × weight; null when any factor is missing, so nothing is invented. */
  function exerciseVolume(item) {
    const sets = number(item?.sets), reps = number(item?.reps), weight = number(item?.weight);
    if (sets === null || reps === null || weight === null) return null;
    return sets * reps * weight;
  }
  function renderTrainingLog() {
    const form = $('#training-form');
    if (!form) return;
    const row = habitRowFor(activeDate);
    const exercises = exercisesFor(activeDate);
    const template = TRAINING_TEMPLATES[row?.template] ? row.template : 'push';
    if (document.activeElement !== form.elements.template) form.elements.template.value = template;
    const box = $('#training-exercises');
    const rows = exercises.length ? exercises : [{name: '', sets: null, reps: null, weight: null}];
    box.innerHTML = rows.map((item, index) => \`<div class="training-row" data-exercise-row="\${index}"><label>动作<input data-exercise="name" value="\${esc(item.name)}" maxlength="60" placeholder="例如 卧推"></label><div class="form-grid"><label>组数<input data-exercise="sets" type="number" min="0" max="30" step="1" value="\${item.sets ?? ''}"></label><label>每组次数<input data-exercise="reps" type="number" min="0" max="200" step="1" value="\${item.reps ?? ''}"></label><label>负重 · kg<input data-exercise="weight" type="number" min="0" max="500" step="0.5" value="\${item.weight ?? ''}"></label></div><div class="row-meta"><span>容量 \${exerciseVolume(item) === null ? '—' : \`\${fmt(exerciseVolume(item), 0)} kg\`}</span><button type="button" class="icon-button danger" data-exercise-remove="\${index}" aria-label="移除这个动作">×</button></div></div>\`).join('');
    const tag = $('#training-tag');
    if (tag) tag.textContent = exercises.length ? \`\${TRAINING_TEMPLATES[template]} · \${exercises.length} 个动作\` : row?.training === true ? '已标记训练' : '未记录';
  }
  function readTrainingExercises() {
    const box = $('#training-exercises');
    return [...box.querySelectorAll('[data-exercise-row]')].map(row => ({
      name: $('[data-exercise="name"]', row).value.trim().slice(0, 60),
      sets: number($('[data-exercise="sets"]', row).value),
      reps: number($('[data-exercise="reps"]', row).value),
      weight: number($('[data-exercise="weight"]', row).value)
    })).filter(item => item.name || item.sets !== null || item.reps !== null || item.weight !== null);
  }
  /** Saves the log onto the day's habit row, preserving every other field it already carries. */
  async function saveTrainingLog() {
    const form = $('#training-form'), message = $('.form-feedback', form), button = $('button[type=submit]', form);
    const exercises = readTrainingExercises();
    const incomplete = exercises.find(item => !item.name || item.sets === null || item.reps === null || item.weight === null);
    if (incomplete) {feedback(message, '每个动作都要填完整：名称、组数、次数、负重；不想记的动作请先移除。', true); return;}
    if (!exercises.length) {feedback(message, '还没有动作可保存；可以先用「清空今天的训练」。', true); return;}
    if (button.disabled) return;
    button.disabled = true;
    feedback(message, '正在保存训练…');
    try {
      const existing = habitRowFor(activeDate) || {};
      await api('/api/habits', {...existing, date: activeDate, training: true, template: form.elements.template.value, exercises,
        ...(exerciseVolume(exercises[0]) === null ? {} : {})});
      await loadState({quiet: true});
      feedback(message, \`已保存 \${exercises.length} 个动作。\`);
      renderTrainingLog();
    } catch (error) {feedback(message, error.message, true);}
    finally {button.disabled = false;}
  }
  /** Weekly volume per exercise, newest week first, using ISO weeks (Monday start). */
  function weeklyVolume() {
    const byExercise = new Map();
    for (const row of (state.habits || [])) {
      if (!row || !Array.isArray(row.exercises) || !validDate(row.date)) continue;
      const date = new Date(\`\${row.date}T00:00:00\`);
      if (Number.isNaN(date.getTime())) continue;
      const monday = new Date(date);
      monday.setDate(date.getDate() - ((date.getDay() + 6) % 7));
      const week = localDate(monday);
      for (const item of row.exercises) {
        const name = String(item?.name ?? '').trim();
        const volume = exerciseVolume(item);
        if (!name || volume === null) continue;
        if (!byExercise.has(name)) byExercise.set(name, new Map());
        const weeks = byExercise.get(name);
        weeks.set(week, (weeks.get(week) || 0) + volume);
      }
    }
    const out = [];
    for (const [name, weeks] of byExercise) {
      const ordered = [...weeks.entries()].sort((a, b) => a[0].localeCompare(b[0]));
      if (ordered.length < 2) continue;
      const [lastWeek, lastVolume] = ordered[ordered.length - 1];
      const [prevWeek, prevVolume] = ordered[ordered.length - 2];
      out.push({name, lastWeek, lastVolume, prevWeek, prevVolume, delta: lastVolume - prevVolume});
    }
    return out.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta) || b.lastVolume - a.lastVolume).slice(0, 6);
  }
  function renderVolumeTable() {
    const box = $('#volume-table');
    if (!box) return;
    const rows = weeklyVolume();
    if (!rows.length) {
      box.innerHTML = '<p class="fine-print">还不足以比较：同一动作至少需要两周的训练记录（趋势页按周一为一周起点）。</p>';
      return;
    }
    box.innerHTML = '<table class="stats-table"><caption class="fine-print">容量 = 组数 × 次数 × 负重；只比较你自己记录过的同一动作。</caption>'
      + '<thead><tr><th scope="col">动作</th><th scope="col">' + esc(rows[0].prevWeek) + ' 起那一周</th><th scope="col">' + esc(rows[0].lastWeek) + ' 起</th><th scope="col">变化</th></tr></thead><tbody>'
      + rows.map(row => \`<tr><td>\${esc(row.name)}</td><td class="num">\${fmt(row.prevVolume, 0)} <small>kg</small></td><td class="num">\${fmt(row.lastVolume, 0)} <small>kg</small></td><td><span class="stats-trend stats-\${row.delta >= 0 ? 'good' : 'warn'}">\${row.delta >= 0 ? '+' : ''}\${fmt(row.delta, 0)} <small>kg</small></span></td></tr>\`).join('')
      + '</tbody></table>';
  }
  /** "Today's three things" card: training, cooking oil and weight in one submit. */`,
  ],
  [
    'daily three merges into the day row',
    "        await api('/api/habits', {date: activeDate, ...(trainingValue === '' ? {} : {training: trainingValue === 'true'}), ...(oilSpoons === null ? {} : {oilSpoons})});",
    "        // Merge into the day's row so training, oil and the training log never split into duplicates.\n        await api('/api/habits', {...(habitRowFor(activeDate) || {}), date: activeDate, ...(trainingValue === '' ? {} : {training: trainingValue === 'true'}), ...(oilSpoons === null ? {} : {oilSpoons})});",
  ],
  [
    'render the training log and volume table',
    '    renderCopyMeals();',
    `    renderCopyMeals();
    renderTrainingLog();
    renderVolumeTable();`,
  ],
  [
    'wire the training buttons',
    "  $('#copy-meal-buttons')?.addEventListener('click', event => {",
    `  $('#training-add')?.addEventListener('click', () => {
    const box = $('#training-exercises');
    const index = box.querySelectorAll('[data-exercise-row]').length;
    if (index >= 12) {notice('一次最多记录 12 个动作。', true); return;}
    const row = document.createElement('div');
    row.className = 'training-row';
    row.dataset.exerciseRow = String(index);
    row.innerHTML = '<label>动作<input data-exercise="name" maxlength="60" placeholder="例如 深蹲"></label><div class="form-grid"><label>组数<input data-exercise="sets" type="number" min="0" max="30" step="1"></label><label>每组次数<input data-exercise="reps" type="number" min="0" max="200" step="1"></label><label>负重 · kg<input data-exercise="weight" type="number" min="0" max="500" step="0.5"></label></div><div class="row-meta"><span>容量 —</span><button type="button" class="icon-button danger" data-exercise-remove="\${index}" aria-label="移除这个动作">×</button></div>';
    box.append(row);
  });
  $('#training-exercises')?.addEventListener('click', event => {
    const button = event.target.closest?.('[data-exercise-remove]');
    if (!button) return;
    button.closest('[data-exercise-row]')?.remove();
  });
  $('#training-form')?.addEventListener('submit', event => {event.preventDefault(); saveTrainingLog().catch(error => notice(error.message, true));});
  $('#training-clear')?.addEventListener('click', async () => {
    if (!await askConfirm('清空今天的训练记录？习惯行的其他数据（步数、睡眠、饮水、用油）会保留。', {title: '清空训练', ok: '清空', danger: true})) return;
    const existing = habitRowFor(activeDate);
    if (!existing) {renderTrainingLog(); return;}
    const next = {...existing};
    delete next.exercises;
    delete next.template;
    try {await api('/api/habits', next); await loadState({quiet: true}); renderTrainingLog(); notice('已清空今天的训练记录。');}
    catch (error) {notice(error.message, true);}
  });
  $('#copy-meal-buttons')?.addEventListener('click', event => {`,
  ],
]);

console.log('step 6 wired');
