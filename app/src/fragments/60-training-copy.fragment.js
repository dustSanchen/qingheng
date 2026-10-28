/* Fragment of assets/app.js -- assembled by tools/assemble-app.ps1 in filename order.
 * Edit this file, never the generated assets/app.js; tests/app-fragments.test.mjs fails on drift. */
  /** "Today's three things" card: training, cooking oil and weight in one submit. */
  /** Strength movements worth recognising without a model. */
  const DRAFT_MOVES = ['卧推', '上斜卧推', '哑铃卧推', '深蹲', '硬拉', '罗马尼亚硬拉', '腿举', '划船', '杠铃划船', '哑铃划船',
    '引体向上', '高位下拉', '肩推', '推举', '侧平举', '弯举', '面拉', '绳索下压', '双杠臂屈伸', '腿弯举', '腿屈伸', '提踵', '卷腹', '平板支撑'];
  /** Training drafts are parsed by parseDraft + the parseTrainingDraft wrapper further down this fragment. */

  function renderTrainingDraft(draft) {
    const box = $('#chat-training-draft');
    if (!box) return;
    if (!draft) { box.hidden = true; box.innerHTML = ''; return; }
    const missing = draft.missing.length
      ? '<p class="fine-print">还缺：' + esc(draft.missing.join('、')) + '。可以先写入，稍后在训练日志里补；也可以点「补充信息」再改这句描述。</p>'
      : '<p class="fine-print">信息齐全，确认后会写入当天的训练记录。</p>';
    box.hidden = false;
    box.innerHTML = `<div class="card training-draft"><div class="card-heading"><h2>识别到训练草稿</h2><span class="tag">待确认</span></div>`
      + `<p><strong>${esc(draft.date)}</strong> · ${esc(draftSummary(draft))}</p>` + missing
      + `<div class="button-row"><button type="button" class="button primary" data-draft-confirm="1">写入记录</button>`
      + `<button type="button" class="button subtle" data-draft-cancel="1">取消</button></div></div>`;
  }

  // ---------------------------------------------------------------------------------------------
  // 纯函数：通用草稿、每日体检、负荷与平台期、周计划
  // ---------------------------------------------------------------------------------------------

  const DRAFT_KINDS = {training: '训练', weight: '体重', sleep: '睡眠', steps: '步数', water: '饮水', plan: '计划'};

  /**
   * One sentence -> one draft. Recognises training, weight, sleep, steps and water.
   * Returns {kind, date, rows, missing, payload} or null. Pure: no DOM, no state.
   */
  function parseDraft(text, baseDate) {
    const raw = String(text || '').trim();
    if (!raw) return null;
    const pad2 = n => String(n).padStart(2, '0');
    const shift = (day, delta) => {
      const [y, m, d] = String(day).split('-').map(Number);
      const date = new Date(y, m - 1, d + delta);
      return date.getFullYear() + '-' + pad2(date.getMonth() + 1) + '-' + pad2(date.getDate());
    };
    const today = /^\d{4}-\d{2}-\d{2}$/.test(String(baseDate || '')) ? baseDate : new Date().toISOString().slice(0, 10);
    let date = today;
    const explicit = raw.match(/(\d{4})[\-\/](\d{1,2})[\-\/](\d{1,2})/) || raw.match(/(\d{1,2})月(\d{1,2})[日号]?/);
    if (explicit) {
      const year = explicit[3] ? Number(explicit[1]) : Number(today.slice(0, 4));
      const month = explicit[3] ? Number(explicit[2]) : Number(explicit[1]);
      const day = explicit[3] ? Number(explicit[3]) : Number(explicit[2]);
      if (month >= 1 && month <= 12 && day >= 1 && day <= 31) date = year + '-' + pad2(month) + '-' + pad2(day);
    } else if (/大前天/.test(raw)) date = shift(today, -3);
    else if (/前天/.test(raw)) date = shift(today, -2);
    else if (/昨天|昨晚|昨日/.test(raw)) date = shift(today, -1);

    const planned = /(打算|计划|准备|明天|后天|下周|要不要|该不该|想做)/.test(raw);

    // --- plain measurements ---------------------------------------------------------------------
    const weight = raw.match(/(\d{2,3}(?:\.\d)?)\s*(?:kg|公斤|千克)/);
    if (weight && /(体重|称了|称重|重量)/.test(raw) && !/(跑了|跑步|卧推|深蹲|硬拉|引体)/.test(raw)) {
      const value = Number(weight[1]);
      if (value >= 20 && value <= 400) return {kind: 'weight', date, rows: [{label: '体重', value: value + ' kg'}], missing: [], payload: {weight: value}};
    }
    const sleep = raw.match(/(\d+(?:\.\d+)?)\s*(?:个)?(?:小时|h|H)/);
    if (sleep && /(睡|睡眠)/.test(raw)) {
      const value = Number(sleep[1]);
      if (value > 0 && value <= 24) return {kind: 'sleep', date, rows: [{label: '睡眠', value: value + ' 小时'}], missing: [], payload: {sleep: value}};
    }
    const steps = raw.match(/(\d{3,6})\s*步/);
    if (steps) return {kind: 'steps', date, rows: [{label: '步数', value: Number(steps[1]).toLocaleString() + ' 步'}], missing: [], payload: {steps: Number(steps[1])}};
    const water = raw.match(/(\d+(?:\.\d+)?)\s*(?:升|L|l|毫升|ml|ML)/);
    if (water && /(喝|饮水|水)/.test(raw)) {
      const isMl = /毫升|ml|ML/.test(water[0]);
      const value = isMl ? Number(water[1]) / 1000 : Number(water[1]);
      if (value > 0 && value <= 10) return {kind: 'water', date, rows: [{label: '饮水', value: value.toFixed(1) + ' L'}], missing: [], payload: {water: Math.round(value * 1000)}};
    }

    // --- training -------------------------------------------------------------------------------
    const runWord = /(跑步|慢跑|跑了|晨跑|夜跑|快走|跑完)/.test(raw);
    const moveHit = DRAFT_MOVES.find(name => raw.includes(name)) || '';
    const strengthWord = /(组|次|kg|公斤|千克|举|推|拉|蹲)/.test(raw);
    if (!runWord && !moveHit && !/(练了|训练了|做了)/.test(raw)) {
      if (!(strengthWord && /组|kg|公斤/.test(raw))) return null;
    }
    const exercises = [];
    const rows = [];
    const missing = [];
    if (runWord) {
      const distance = raw.match(/(\d+(?:\.\d+)?)\s*(?:km|KM|Km|公里|千米)/);
      const minutes = raw.match(/(\d+)\s*(?:分钟|min)/);
      const clock = raw.match(/(\d{1,2}):(\d{2})/);
      const item = {name: '跑步', sets: null, reps: null, weight: null, distanceKm: distance ? Number(distance[1]) : null,
        durationMin: minutes ? Number(minutes[1]) : clock ? Number(clock[1]) * 60 + Number(clock[2]) : null};
      exercises.push(item);
      if (item.distanceKm === null) missing.push('距离（km）');
      if (item.durationMin === null) missing.push('时长（分钟）');
      rows.push({label: '跑步', value: [item.distanceKm !== null ? item.distanceKm + ' km' : '待补距离', item.durationMin !== null ? item.durationMin + ' 分钟' : '待补时长'].join(' · ')});
    }
    if (moveHit) {
      const clauses = raw.split(/[，,；;。、]/).filter(Boolean);
      for (const clause of clauses) {
        const name = DRAFT_MOVES.find(move => clause.includes(move));
        if (!name) continue;
        const sets = clause.match(/(\d+)\s*组/);
        const reps = clause.match(/(\d+)\s*[次下个]/);
        const weightHit = clause.match(/(\d+(?:\.\d+)?)\s*(?:kg|KG|Kg|公斤|千克)/);
        const item = {name, sets: sets ? Number(sets[1]) : null, reps: reps ? Number(reps[1]) : null,
          weight: weightHit ? Number(weightHit[1]) : null, distanceKm: null, durationMin: null};
        exercises.push(item);
        if (!sets || !reps) missing.push(name + ' 的组数/次数');
        rows.push({label: name, value: [item.sets !== null ? item.sets + ' 组' : '待补组数', item.reps !== null ? '× ' + item.reps + ' 次' : '待补次数', item.weight !== null ? item.weight + ' kg' : ''].filter(Boolean).join(' ')});
      }
    }
    if (!exercises.length) return null;
    if (planned && !/今天|昨天|前天|\d/.test(raw)) return null;
    const template = /(腿|深蹲|硬拉|提踵|腿举)/.test(raw) ? 'legs' : /(拉|划船|引体|下拉|弯举)/.test(raw) ? 'pull' : /(推|卧推|肩推|侧平举)/.test(raw) ? 'push' : 'other';
    return {kind: 'training', date, rows, missing, payload: {template, exercises}};
  }

  /** The one live parser: a training-only view over parseDraft; call sites and tests rely on the {payload:{exercises}} shape. */
  function parseTrainingDraft(text, baseDate) {
    const draft = parseDraft(text, baseDate);
    return draft && draft.kind === 'training' ? draft : null;
  }

  function draftSummary(draft) {
    if (!draft) return '';
    return (draft.rows || []).map(row => row.label + ' ' + row.value).join('；');
  }

  /**
   * Five daily metrics -> score, worst item and exactly one local action.
   * Inputs are passed in so the rule engine can be tested without the app.
   */
  function dailyCheck(input) {
    const src = input || {};
    const meals = src.meals || [], habit = src.habit || {}, range = src.range || null;
    const sum = meals.reduce((acc, meal) => {
      const totals = meal && meal.totals ? meal.totals : (meal || {});
      for (const key of ['calories', 'protein', 'fat', 'carbs']) acc[key] += Number(totals[key] ?? 0) || 0;
      return acc;
    }, {calories: 0, protein: 0, fat: 0, carbs: 0});
    const items = [];
    const clamp01 = value => Math.max(0, Math.min(1, value));
    if (range && Number.isFinite(range.min) && Number.isFinite(range.max)) {
      const width = Math.max(200, range.max - range.min);
      const distance = sum.calories < range.min ? range.min - sum.calories : sum.calories > range.max ? sum.calories - range.max : 0;
      items.push({key: 'calories', label: '热量', value: Math.round(sum.calories), target: range.min + '~' + range.max,
        ok: distance === 0, score: distance === 0 ? 1 : clamp01(1 - distance / width), state: sum.calories === 0 ? 'idle' : (sum.calories < range.min ? 'low' : sum.calories > range.max ? 'high' : undefined)});
    }
    if (Number.isFinite(src.proteinMin) && src.proteinMin > 0) {
      items.push({key: 'protein', label: '蛋白质', value: Math.round(sum.protein), target: Math.round(src.proteinMin) + 'g 起',
        ok: sum.protein >= src.proteinMin, score: clamp01(sum.protein / src.proteinMin), state: sum.calories === 0 ? 'idle' : (sum.protein < src.proteinMin ? 'low' : undefined)});
    }
    if (Number.isFinite(src.fatMin) && Number.isFinite(src.fatMax)) {
      const distance = sum.fat < src.fatMin ? src.fatMin - sum.fat : sum.fat > src.fatMax ? sum.fat - src.fatMax : 0;
      items.push({key: 'fat', label: '脂肪', value: Math.round(sum.fat), target: Math.round(src.fatMin) + '~' + Math.round(src.fatMax) + 'g',
        ok: distance === 0, score: distance === 0 ? 1 : clamp01(1 - distance / Math.max(10, src.fatMax)), state: sum.calories === 0 ? 'idle' : (sum.fat > src.fatMax ? 'high' : sum.fat < src.fatMin ? 'low' : undefined)});
    }
    const trained = habit.training === true || habit.training === 'true' || (Array.isArray(habit.exercises) && habit.exercises.length > 0);
    items.push({key: 'training', label: '训练', value: trained ? '已记录' : (habit.training === false || habit.training === 'false' ? '休息' : '未记录'),
      target: '每天记一次', ok: trained || habit.training === false || habit.training === 'false',
      score: trained || habit.training === false || habit.training === 'false' ? 1 : 0.4, state: trained || habit.training === false || habit.training === 'false' ? undefined : 'idle'});
    const sleep = Number(habit.sleep);
    items.push({key: 'sleep', label: '睡眠', value: Number.isFinite(sleep) && sleep > 0 ? sleep + ' 小时' : '未记录',
      target: '7 小时起', ok: Number.isFinite(sleep) && sleep >= 7,
      score: Number.isFinite(sleep) && sleep > 0 ? clamp01(sleep / 7) : 0.4, state: Number.isFinite(sleep) && sleep > 0 ? undefined : 'idle'});

    let worst = null;
    for (const item of items) if (!worst || item.score < worst.score) worst = item;
    let action = '今天的记录都在区间内，保持就好。';
    if (worst) {
      const gap = worst.key === 'calories' ? Math.abs(sum.calories - (sum.calories > (range ? range.max : 0) ? range.max : range.min))
        : worst.key === 'protein' ? Math.max(0, Math.round((src.proteinMin || 0) - sum.protein))
          : 0;
      if (worst.key === 'calories' && range && sum.calories > range.max) action = '热量超上限 ' + Math.round(sum.calories - range.max) + ' kcal：晚餐只吃蛋白 + 蔬菜，不再加主食。';
      else if (worst.key === 'calories' && range && sum.calories < range.min) action = '还差 ' + Math.round(range.min - sum.calories) + ' kcal：加一份主食配一个蛋白来源。';
      else if (worst.key === 'protein') action = '蛋白还差 ' + gap + ' g ≈ 鸡胸 ' + Math.round(gap / 0.31) + ' g 或蛋白粉 ' + Math.max(1, Math.round(gap / 24)) + ' 勺。';
      else if (worst.key === 'fat' && src.fatMax) action = '脂肪超 ' + Math.round(Math.max(0, sum.fat - src.fatMax)) + ' g：之后改白灼/清蒸，少油。';
      else if (worst.key === 'training') action = '今天还没记训练：练一次推/拉，或 20 分钟快走也算。';
      else if (worst.key === 'sleep') action = '睡眠 ' + (worst.value === '未记录' ? '没记录' : worst.value) + '：今天训练强度降 10%，别加组。';
    }
    const score = items.length ? Math.round(items.reduce((acc, item) => acc + item.score, 0) / items.length * 100) : 0;
    return {items, worst, action, score, totals: {calories: Math.round(sum.calories), protein: Math.round(sum.protein), fat: Math.round(sum.fat), carbs: Math.round(sum.carbs)}};
  }

  /**
   * Acute:chronic workload ratio from daily loads. ratio > 1.5 = spike, < 0.8 = detraining.
   * loads: [{date:'YYYY-MM-DD', load:number}] (load = 组×次×负重, or run minutes×6).
   */
  function acwrFromDailyLoads(loads, today) {
    const rows = (loads || []).filter(row => row && Number.isFinite(Number(row.load)));
    if (!rows.length || !/^\d{4}-\d{2}-\d{2}$/.test(String(today || ''))) return null;
    const dayTime = day => new Date(day + 'T00:00:00').getTime();
    const base = dayTime(today);
    const within = days => rows.filter(row => base - dayTime(row.date) < days * 86400000 && dayTime(row.date) <= base);
    const acute = within(7).reduce((acc, row) => acc + Number(row.load), 0);
    const chronicTotal = within(28).reduce((acc, row) => acc + Number(row.load), 0);
    const chronic = chronicTotal / 4;
    if (chronic <= 0) return {acute, chronic, ratio: null, flag: 'none', days: within(7).length};
    const ratio = acute / chronic;
    const flag = ratio > 1.5 ? 'high' : ratio < 0.8 ? 'low' : 'ok';
    return {acute, chronic, ratio: Math.round(ratio * 100) / 100, flag, days: within(7).length};
  }

  /**
   * Plateau: three weekly means and the last two barely differ.
   * weekly: [{week:'YYYY-MM-DD', mean:number}] sorted oldest first.
   */
  function plateauFromWeekly(weekly) {
    const rows = (weekly || []).filter(row => row && Number.isFinite(Number(row.mean)));
    if (rows.length < 3) return null;
    const last3 = rows.slice(-3);
    const span = Math.abs(last3[2].mean - last3[0].mean);
    return {weeks: 3, span: Math.round(span * 100) / 100, plateau: span < 0.2,
      from: last3[0].week, to: last3[2].week, mean: last3[2].mean};
  }

  /**
   * Next week's sessions from the last two weeks per exercise, with a graded progression.
   * lastByExercise: {name: {sets, reps, weight, date}}; acwr flag decides a deload.
   */
  function generateWeekPlan(input) {
    const src = input || {};
    const start = String(src.startDate || '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(start)) return null;
    const pad2 = n => String(n).padStart(2, '0');
    const sessions = Math.max(1, Math.min(6, Number(src.sessions) || 3));
    const templates = ['push', 'pull', 'legs'];
    const rotation = s => {
      const plan = [];
      for (let i = 0; i < s; i++) plan.push(templates[i % 3]);
      return plan;
    };
    // Spread the sessions over the week: Mon/Tue/Thu/Fri/Sat pattern.
    const slots = [[0], [0, 3], [0, 2, 4], [0, 1, 3, 5], [0, 1, 2, 4, 5], [0, 1, 2, 3, 4, 6]][sessions - 1];
    const deload = src.acwrFlag === 'high';
    const lastByExercise = src.lastByExercise || {};
    const byTemplate = {push: [], pull: [], legs: [], other: []};
    for (const [name, row] of Object.entries(lastByExercise)) {
      // A run has duration/distance instead of sets: it is not a lift and must not be scheduled as one.
      if (!row || !Number.isFinite(Number(row.sets)) || row.sets === null) continue;
      if (Number.isFinite(Number(row.durationMin)) || Number.isFinite(Number(row.distanceKm))) continue;
      const template = /(深蹲|硬拉|腿|提踵)/.test(name) ? 'legs' : /(划船|引体|下拉|弯举|面拉)/.test(name) ? 'pull' : /(卧推|肩推|侧平举|下压|臂屈伸)/.test(name) ? 'push' : 'other';
      const weight = Number(row.weight);
      const suggested = Number.isFinite(weight) && weight > 0
        ? Math.round((deload ? weight * 0.9 : weight * 1.025) * 2) / 2
        : null;
      byTemplate[template].push({name, sets: Math.max(2, Number(row.sets) - (deload ? 1 : 0)), reps: Number(row.reps) || 8, weight: suggested});
    }
    const days = [];
    rotation(sessions).forEach((template, index) => {
      const date = new Date(start + 'T00:00:00');
      date.setDate(date.getDate() + slots[index]);
      // Only that template's own movements: borrowing 跑步 into a 推 day was a real bug.
      let exercises = ((byTemplate[template] || []).slice(0, 5));
      let suggested = false;
      if (!exercises.length) {
        // No history yet: use the community-verified day template (sets / reps / RPE from the digest image),
        // falling back to the plain movement list if the template is missing.
        const day = typeof libraryDayTemplate === 'function' ? libraryDayTemplate(template) : null;
        if (day && day.exercises.length) {
          exercises = day.exercises.map(item => ({name: item.name, sets: item.sets || 3, reps: item.reps || 8,
            weight: null, role: item.role || '', rpe: item.rpe || null}));
          suggested = true;
        } else if (typeof libraryMoves === 'function') {
          exercises = libraryMoves(template).slice(0, 5).map(item => ({name: item.name, sets: item.sets || 3,
            reps: item.reps || 8, weight: null, role: item.role || ''}));
          suggested = exercises.length > 0;
        }
      }
      days.push({date: date.getFullYear() + '-' + pad2(date.getMonth() + 1) + '-' + pad2(date.getDate()),
        template, deload, exercises, suggested});
    });
    // The analysis layer is optional: the generator still works without the library loaded.
    const reasons = typeof planWhy === 'function' ? planWhy({deload, suggested: days.some(day => day.suggested),
      templateId: 'push-day-template'}) : [];
    return {startDate: start, sessions, deload, days, reasons,
      note: deload ? '本周负荷偏高（ACWR > 1.5），按减载周安排：负重 ×0.9、组数 −1。'
        : '按上周重量 +2.5% 安排，重量留空的动作表示上周没记到负重。'};
  }

  /** The model-free one-liner used when a request does not need an LLM at all. */
  function localCoachLine(check) {
    if (!check) return '';
    return check.action || '';
  }

  /** The local library, if present. Everything degrades gracefully without it. */
  /** Every meal: does its stated kcal match its own macros? Plus the daily averages. */
  function dietAudit(days) {
    const rows = [];
    let meals = 0, mismatched = 0, worstGap = 0;
    for (const day of days || []) {
      const list = (state.meals || []).filter(row => row && row.date === day);
      if (!list.length) continue;
      let stated = 0, derived = 0;
      for (const meal of list) {
        meals++;
        const p = number(meal.protein) ?? 0, c = number(meal.carbs) ?? 0, f = number(meal.fat) ?? 0;
        const kcal = number(meal.calories) ?? 0;
        const fromMacros = p * 4 + c * 4 + f * 9;
        stated += kcal; derived += fromMacros;
        const gap = Math.abs(kcal - fromMacros);
        if (gap > Math.max(30, fromMacros * 0.12)) { mismatched++; worstGap = Math.max(worstGap, gap); }
      }
      const totals = totalsFor(list);
      rows.push({date: day, meals: list.length, kcal: Math.round(totals.calories), protein: Math.round(totals.protein),
        fat: Math.round(totals.fat), carbs: Math.round(totals.carbs), statedKcal: Math.round(stated), macroKcal: Math.round(derived)});
    }
    // Per-meal tolerance (12% / 30 kcal) hides a systematic bias: 25 meals each 15 kcal high is
    // 375 kcal a week but never trips the per-meal rule. Compare the weekly totals as well.
    const totalStated = rows.reduce((sum, row) => sum + row.statedKcal, 0);
    const totalMacro = rows.reduce((sum, row) => sum + row.macroKcal, 0);
    const totalGap = totalStated - totalMacro;
    const gapPercent = totalMacro > 0 ? Math.round(totalGap / totalMacro * 1000) / 10 : 0;
    const biased = totalMacro > 0 && Math.abs(totalGap) > Math.max(80, totalMacro * 0.05);
    const average = key => rows.length ? Math.round(rows.reduce((sum, row) => sum + row[key], 0) / rows.length) : 0;
    return {rows, meals, mismatched, worstGap: Math.round(worstGap), days: rows.length,
      totalStated, totalMacro, totalGap: Math.round(totalGap), gapPercent, biased,
      avg: {kcal: average('kcal'), protein: average('protein'), fat: average('fat'), carbs: average('carbs')}};
  }
  function trainingLibrary() {
    const lib = window.TRAINING_PRINCIPLES;
    return lib && Array.isArray(lib.rules) ? lib : null;
  }
  function libraryRule(id) {
    const lib = trainingLibrary();
    return lib ? lib.rules.find(rule => rule.id === id) || null : null;
  }
  function libraryDayTemplate(template) {
    const lib = trainingLibrary();
    const day = lib && lib.dayTemplates ? lib.dayTemplates[template] : null;
    return day && Array.isArray(day.exercises) ? day : null;
  }
  function libraryMoves(template) {
    const lib = trainingLibrary();
    return lib && lib.moves && Array.isArray(lib.moves[template]) ? lib.moves[template] : [];
  }
  function librarySourceLabel(sourceId) {
    const lib = trainingLibrary();
    const source = lib && lib.sources ? lib.sources.find(row => row.id === sourceId) : null;
    return source ? source.label + (source.level ? '（' + source.level + ' 级）' : '') : sourceId;
  }
  /** Why this week looks like this: the rules actually used, each carrying its source. */
  function planWhy(input) {
    const src = input || {};
    const reasons = [];
    const push = (id, text) => {
      const rule = libraryRule(id);
      reasons.push({id, text, source: rule ? librarySourceLabel(rule.source) : '', confidence: rule ? rule.confidence : ''});
    };
    if (src.deload) push('deload-rule', '本周按减载周排：负荷偏高时负重 ×0.9、组数 −1');
    else if (src.templateId) push(src.templateId, '动作顺序与组次来自三分化整理图（推/拉/腿各 5 个动作）');
    else push('split-3-rationale', '按三分化排：每部位每周约 1.5~2 次刺激，单次 6~10 组正式组');
    push('main-lift-rpe8', '主项守 RPE 8（留约 2 次余量），不做到力竭');
    push('isolation-failure', '单关节动作接近力竭，复合主项不追求力竭');
    if (src.suggested) push('volume-cap', '没有历史动作时用训练库建议动作，先按 3 组建立基线');
    return reasons;
  }
  /** Keyword → tag routing, so a question about 腹肌 gets the abs rules instead of the top 6 by priority. */
  const LIBRARY_ROUTES = [
    {match: /腹肌|核心|举腿|卷腹/, tags: ['abs']},
    {match: /肩|侧平举|后束|飞鸟/, tags: ['shoulder']},
    {match: /腿|深蹲|硬拉|保加利亚/, tags: ['legs']},
    {match: /背|划船|下拉|引体/, tags: ['pull']},
    {match: /胸|卧推|推日|上斜/, tags: ['push']},
    {match: /热身|激活|拉伸|放松|泡沫轴/, tags: ['warmup', 'stretch']},
    {match: /力竭|RPE|组数|次数|强度/, tags: ['intensity', 'main']},
    {match: /减脂|减肥|缺口|平台|体重不降/, tags: ['fatloss', 'deficit']},
    {match: /蛋白|蛋白质|吃多少/, tags: ['protein']},
    {match: /睡眠|熬夜|累|疲劳|恢复/, tags: ['sleep', 'recovery']},
    {match: /增肌|肌肉|围度/, tags: ['main', 'volume']}
  ];
  function libraryLookup(question, max = 8) {
    const lib = trainingLibrary();
    if (!lib) return '';
    const text = String(question || '');
    const wanted = new Set();
    for (const route of LIBRARY_ROUTES) if (route.match.test(text)) route.tags.forEach(tag => wanted.add(tag));
    if (!wanted.size) return '';
    const order = Array.isArray(lib.priority) ? lib.priority : [];
    const rank = source => {
      const index = order.indexOf(source);
      return index >= 0 ? index : 9;
    };
    const hits = lib.rules
      .filter(rule => (rule.tags || []).some(tag => wanted.has(tag)))
      .sort((a, b) => rank(a.source) - rank(b.source))
      .slice(0, max);
    return hits.map(rule => '[' + rule.topic + '] ' + rule.claim
      + (rule.evidence ? '（口述 ' + rule.evidence.at + '，' + rule.evidence.bvid + '）'
        : rule.video ? '（视频 ' + rule.video.bvid + '）' : '')).join('\n');
  }
  /** Two short cues for today's template, taken from the transcript-level rules. */
  function libraryCues(template) {
    const lib = trainingLibrary();
    if (!lib) return [];
    const byTemplate = {
      push: ['lateral-raise-partial', 'rpe8-is-not-rm'],
      pull: ['rear-delt-neutral-grip', 'compound-deload-not-failure'],
      legs: ['leg-warmup-six-moves', 'rest-by-signal-not-calendar']
    };
    return (byTemplate[template] || [])
      .map(id => lib.rules.find(rule => rule.id === id))
      .filter(Boolean)
      .map(rule => rule.claim.split('；')[0]);
  }
  /** Which library rule answers the weakest metric of the day. */
  function libraryRuleForMetric(key) {
    const map = {calories: 'weekly-rate', protein: 'protein-preserve', fat: 'protein-preserve',
      training: 'split-3-rationale', sleep: 'sleep-deficit'};
    return libraryRule(map[key] || '');
  }
  /** Compact digest for the question payload: priority order, one line per rule. */
  function librarySummary(max = 6) {
    const lib = trainingLibrary();
    if (!lib) return '';
    const order = Array.isArray(lib.priority) ? lib.priority : [];
    const rank = source => {
      const row = lib.sources.find(item => item.id === source);
      const index = order.indexOf(source);
      return index >= 0 ? index : (row && Number.isFinite(row.priority) ? row.priority : 9);
    };
    return lib.rules.slice()
      .sort((a, b) => rank(a.source) - rank(b.source))
      .slice(0, max)
      .map(rule => '[' + rule.topic + '·P' + (rank(rule.source) + 1) + '] ' + rule.claim
        + (rule.video ? '（视频 ' + rule.video.bvid + '，' + Math.round(rule.video.seconds / 60) + ' 分钟：' + rule.video.title + '）' : ''))
      .join('\n');
  }
  /** Daily training load (sets × reps × weight; runs count as minutes × 6). */
  function dailyLoads(days) {
    const out = [];
    for (let offset = 0; offset < days; offset++) {
      const day = shiftDay(activeDate, -offset);
      let load = 0;
      for (const item of exercisesFor(day)) {
        const volume = exerciseVolume(item);
        if (volume !== null) load += volume;
        const minutes = number(item.durationMin);
        if (minutes !== null) load += minutes * 6;
      }
      out.push({date: day, load});
    }
    return out;
  }
  /** Weekly mean weights, oldest first, for plateau detection. */
  function weeklyWeightMeans() {
    const byWeek = new Map();
    for (const row of (state.measurements || [])) {
      if (!row || !validDate(row.date)) continue;
      const weight = number(row.weight);
      if (weight === null || weight <= 0) continue;
      const date = new Date(row.date + 'T00:00:00');
      if (Number.isNaN(date.getTime())) continue;
      const monday = new Date(date);
      monday.setDate(date.getDate() - ((date.getDay() + 6) % 7));
      const week = localDate(monday);
      if (!byWeek.has(week)) byWeek.set(week, []);
      byWeek.get(week).push(weight);
    }
    return [...byWeek.entries()].sort((a, b) => a[0].localeCompare(b[0]))
      .map(([week, values]) => ({week, mean: Math.round(values.reduce((sum, v) => sum + v, 0) / values.length * 10) / 10}));
  }
  /** 0 = Monday … 6 = Sunday. */
  function weekdayIndex(day) {
    const date = new Date(day + 'T00:00:00');
    return Number.isNaN(date.getTime()) ? 0 : (date.getDay() + 6) % 7;
  }

  /** The plan currently on screen; the schedule button writes exactly this. */
  let lastWeekPlan = null;

  /** Five-metric check for the selected day, plus the single action to take. */
  function renderDailyCheck() {
    const box = $('#daily-check'), tag = $('#daily-check-tag');
    if (!box) return;
    const meals = (state.meals || []).filter(row => row && row.date === activeDate);
    const habit = habitRowFor(activeDate) || {};
    const profile = effectiveProfileForDate(activeDate);
    const range = intakeRangeForDate(activeDate);
    const check = dailyCheck({meals, habit, range,
      proteinMin: number(profile.proteinMin), proteinMax: number(profile.proteinMax),
      fatMin: number(profile.fatMin), fatMax: number(profile.fatMax)});
    if (tag) tag.textContent = '达标 ' + check.score + '/100';
    box.innerHTML = '<div class="check-grid">' + check.items.map(item =>
      `<div class="check-item ${item.state || (item.ok ? 'ok' : 'bad')}"><span class="check-dot" aria-hidden="true"></span><small>${esc(item.label)}</small><strong>${esc(String(item.value))}</strong><em>${esc(item.target)}</em></div>`).join('') + '</div>'
      + `<p class="check-action"><strong>今天优先：</strong>${esc(check.action)}</p>`
      + (() => {const rule = libraryRuleForMetric(check.worst && check.worst.key); return rule
        ? annotateTerms(`<p class="check-rule">依据：${esc(rule.claim.split('；')[0].slice(0, 60))} · ${esc(librarySourceLabel(rule.source))}</p>`) : '';})();
  }

  /** Two weeks of history -> next week's sessions, with a deload when the load ran hot. */
  const PLAN_PREFS_KEY = "qingheng.planPrefs";
  /** 器械偏好的中文名；直接把 barbell 丢给模型它会不确定。mixed = 综合。 */
  const GEAR_LABELS = {mixed: "综合（杠铃、哑铃、固定器械、自重都可用）", barbell: "杠铃为主", dumbbell: "哑铃为主", machine: "固定器械", body: "自重"};
  /** 用户偏好：没有设置就不生成方案。 */
  function planPrefs() {
    try { const raw = localStorage.getItem(PLAN_PREFS_KEY); return raw ? JSON.parse(raw) : null; } catch { return null; }
  }
  function savePlanPrefs(prefs) {
    try { localStorage.setItem(PLAN_PREFS_KEY, JSON.stringify(prefs)); } catch { }
    // 收进 state.json：换新手机导入备份后周计划偏好还在；localStorage 此时是空的。
    if (typeof schedulePrefsSync === 'function') schedulePrefsSync({planPrefs: prefs ?? null, aiPlans: collectedAiPlans()});
  }
  /** 每周练几天 -> 落在周几（0=周一）。 */
  function trainingDays(count) {
    const map = {3: [0, 2, 4], 4: [0, 1, 3, 5], 5: [0, 1, 3, 4, 5], 6: [0, 1, 2, 3, 4, 5]};
    return map[Math.max(3, Math.min(6, Number(count) || 3))] || map[3];
  }
  function splitLabels(split) {
    if (split === "ul") return ["上肢", "下肢"];
    if (split === "fb") return ["全身"];
    return ["推", "拉", "腿"];
  }

  function installPlanPrefs() {
    const box = $("#plan-prefs");
    if (!box) return;
    const chipsOf = name => $$(`[data-pref="${name}"] .pref-chip`);
    const mark = (name, value) => chipsOf(name).forEach(chip => {
      chip.setAttribute("aria-pressed", String(chip.dataset.value) === String(value) ? "true" : "false");
    });
    const read = name => {
      const on = chipsOf(name).find(chip => chip.getAttribute("aria-pressed") === "true");
      return on ? on.dataset.value : null;
    };
    const prefs = planPrefs();
    // 器械默认「综合」：不限单一器材，交给模型混用。
    mark("days", prefs && prefs.days ? prefs.days : 3);
    mark("split", (prefs && prefs.split) || "ppl");
    mark("gear", (prefs && prefs.gear) || "mixed");
    mark("minutes", (prefs && prefs.minutes) || 45);
    for (const name of ["days", "split", "gear", "minutes"]) {
      chipsOf(name).forEach(chip => {
        if (chip.dataset.wired) return;
        chip.dataset.wired = "1";
        chip.addEventListener("click", () => mark(name, chip.dataset.value));
      });
    }
    const save = $("#pref-save");
    if (save && !save.dataset.wired) {
      save.dataset.wired = "1";
      save.addEventListener("click", () => {
        savePlanPrefs({
          days: Number(read("days")) || 3,
          split: read("split") || "ppl",
          gear: read("gear") || "mixed",
          minutes: Number(read("minutes")) || 45
        });
        renderWeekPlan();
        notice("已按偏好生成本周安排。");
      });
    }
    const edit = $("#pref-edit");
    if (edit && !edit.dataset.wired) {
      edit.dataset.wired = "1";
      edit.addEventListener("click", () => { box.hidden = !box.hidden; });
    }
  }

  /**
   * 今天页的「今日训练清单」：计划语义的唯一入口。三态——
   * 有 AI 清单：可勾选的镜像 + 完成度 + 一键加入训练记录；
   * 无清单但有记录：列出已记录动作（只报记录，不伪装成排好的顺序）；
   * 都没有：给「用 AI 排今天 / 看本周安排」两个入口。
   */
  function renderAdviceOrder() {
    const box = $("#training-advice-order");
    if (!box) return;
    if (!box.dataset.todayWired) {
      box.dataset.todayWired = "1";
      box.addEventListener("click", event => {
        const done = event.target.closest("[data-today-done]");
        if (done) {
          const plan = typeof aiPlanStore === "function" ? (aiPlanStore(activeDate) || []) : [];
          const index = Number(done.dataset.todayDone);
          if (plan[index]) { plan[index].done = done.checked; aiPlanStore(activeDate, plan); }
          renderAdviceOrder();
          if (typeof renderAiPlan === "function") renderAiPlan();
          return;
        }
        const addAll = event.target.closest("[data-today-add-all]");
        if (addAll) {
          const pending = (typeof aiPlanStore === "function" ? (aiPlanStore(activeDate) || []) : []).filter(item => !item.done);
          if (typeof addExercisesToToday === "function") addExercisesToToday(pending).catch(() => {});
          return;
        }
        const jump = event.target.closest("[data-today-plan]");
        if (jump) {
          switchTab("records", true);
          setTimeout(() => {
            const target = jump.dataset.todayPlan === "ai" ? $("#ai-plan") : $("#week-plan-card");
            if (target) { target.scrollIntoView({block: "start", behavior: "smooth"}); if (typeof flashTarget === "function") flashTarget(target); }
          }, 80);
        }
      });
    }
    const plan = typeof aiPlanStore === "function" ? aiPlanStore(activeDate) : null;
    const items = exercisesFor(activeDate).filter(item => item && item.name);
    if (plan && plan.length) {
      const doneCount = plan.filter(item => item.done).length;
      const pending = plan.length - doneCount;
      const rows = plan.map((item, index) => {
        const dose = [item.sets ? item.sets + " 组" : "", item.reps ? item.reps + " 次" : "", item.weight ? item.weight + " kg" : ""].filter(Boolean).join(" × ");
        return "<li><label class=\"adv-plan-item\"><input type=\"checkbox\" data-today-done=\"" + index + "\"" + (item.done ? " checked" : "") + ">"
          + "<span class=\"adv-name\">" + esc(item.name) + "</span>" + (dose ? "<span class=\"adv-dose\">" + esc(dose) + "</span>" : "") + "</label></li>";
      }).join("");
      box.hidden = false;
      box.innerHTML = "<h3 class=\"plan-sub\">今日清单 · " + doneCount + "/" + plan.length + " 完成</h3><ol class=\"adv-order-list\">" + rows + "</ol>"
        + (pending ? "<div class=\"button-row\"><button type=\"button\" class=\"button subtle\" data-today-add-all>把未完成的加入训练记录</button></div>" : "<p class=\"fine-print\">清单已全部完成。</p>")
        + "<p class=\"fine-print\">编辑清单请到「记录 → 训练计划」。</p>";
      return;
    }
    if (!items.length) {
      box.hidden = false;
      box.innerHTML = "<p class=\"muted\">今天还没有训练清单；想练的时候再排也来得及。</p>"
        + "<div class=\"button-row\"><button type=\"button\" class=\"button subtle\" data-today-plan=\"ai\">用 AI 排今天</button>"
        + "<button type=\"button\" class=\"button subtle\" data-today-plan=\"week\">看本周安排</button></div>";
      return;
    }
    const rows = items.map((item, index) => {
      const dose = [item.sets && item.sets + " 组", item.reps && item.reps + " 次", item.weight && item.weight + " kg"].filter(Boolean).join(" × ");
      return "<li><span class=\"adv-order\">" + (index + 1) + "</span><span class=\"adv-name\">" + esc(item.name) + "</span>" + (dose ? "<span class=\"adv-dose\">" + esc(dose) + "</span>" : "") + "</li>";
    }).join("");
    box.hidden = false;
    box.innerHTML = "<h3 class=\"plan-sub\">已记录 " + items.length + " 个动作</h3><ol class=\"adv-order-list\">" + rows + "</ol>"
      + "<p class=\"fine-print\">想要一份按顺序的清单？用 AI 排今天，或按本周安排练。</p>";
  }

  /** 14 天内每个动作最近一次的组/次/负重，供渐进参考；跑步与计时类不参与排课。 */
  function recentExerciseBaselines(days = 14) {
    const lastByExercise = {};
    for (let offset = 0; offset < days; offset++) {
      const day = shiftDay(activeDate, -offset);
      for (const item of exercisesFor(day)) {
        if (!item.name || lastByExercise[item.name]) continue;
        if (item.sets === null || item.reps === null) continue; // runs and timed work are not scheduled
        lastByExercise[item.name] = {sets: item.sets, reps: item.reps, weight: item.weight, date: day};
      }
    }
    return lastByExercise;
  }

  function renderWeekPlan() {
    const box = $('#week-plan'), tag = $('#week-plan-tag');
    if (!box) return;
    const loads = dailyLoads(28);
    const stats = acwrFromDailyLoads(loads, activeDate);
    const lastByExercise = recentExerciseBaselines(14);
    const sessions = Math.max(1, Math.min(6, Math.round(number(effectiveProfileForDate(activeDate).training) || 3)));
    const startDate = shiftDay(activeDate, 7 - weekdayIndex(activeDate));
    const plan = generateWeekPlan({startDate, sessions, lastByExercise, acwrFlag: stats ? stats.flag : 'ok'});
    lastWeekPlan = plan;
    if (!plan) { box.innerHTML = empty('还没有足够的训练记录', '先记两周训练，计划会自动出来。', 'empty'); return; }
    if (tag) tag.textContent = plan.deload ? '减载周' : '按上周 +2.5%';
    // "What do I train today": today's planned day, the next one, or what was already logged.
    const todayPlan = plan.days.find(day => day.date === activeDate);
    const nextPlan = plan.days.find(day => day.date > activeDate);
    const logged = exercisesFor(activeDate);
    // 状态拆成三行：今天 / 下一训练日 / 分化，一行一件事。
    const stateRows = [];
    if (logged.length) stateRows.push(['今天', '已记录 ' + logged.length + ' 个动作']);
    else if (todayPlan) stateRows.push(['今天', (TRAINING_TEMPLATES[todayPlan.template] || todayPlan.template)
      + (todayPlan.exercises.length ? ' · ' + todayPlan.exercises.map(item => item.name).slice(0, 3).join('、') : '（动作待定）')]);
    else stateRows.push(['今天', '休息']);
    if (nextPlan) stateRows.push(['下一训练日', nextPlan.date.slice(5) + ' · '
      + (TRAINING_TEMPLATES[nextPlan.template] || nextPlan.template)
      + (nextPlan.exercises.length ? ' · ' + nextPlan.exercises[0].name : '')]);
    else stateRows.push(['下一训练日', '本周没有安排']);
    stateRows.push(['分化', (() => {
      const now = planPrefs();
      return now && now.split ? splitLabels(now.split).join(' / ') : '未选';
    })()]);
    // 负荷：标签 + 数值 + 判定，不写成一句话。
    const acwrHtml = (() => {
      if (!stats || !Number.isFinite(stats.ratio)) return '';
      const level = stats.flag === 'high' ? 'high' : stats.flag === 'low' ? 'low' : 'ok';
      const verdict = level === 'high' ? '偏高 · 本周减载' : level === 'low' ? '偏低 · 按记录安排' : '维持';
      return '<div class="plan-load is-' + level + '"><span class="plan-load-label">急慢性负荷比</span>'
        + '<span class="plan-load-value">' + stats.ratio.toFixed(2) + '</span>'
        + '<span class="plan-load-verdict">' + verdict + '</span></div>';
    })();
    const reference = (() => {
      const lib = trainingLibrary();
      if (!lib || !lib.dayTemplates) return '';
      const names = ['push', 'pull', 'legs'];
      const rows = names.map(key => {
        const day = lib.dayTemplates[key];
        if (!day || !day.exercises) return '';
        const list = day.exercises.map(item => esc(item.name) + ' ' + item.sets + '×' + item.reps + (item.rpe ? ' RPE' + item.rpe : '')).join(' · ');
        const dayCues = Array.isArray(day.cues) && day.cues.length
          ? '<br><small>' + day.cues.map(cue => esc(cue)).join('；') + '</small>' : '';
        return '<p><strong>' + esc(day.label) + '</strong><br>' + list + dayCues + '</p>';
      }).join('');
      return rows ? '<details class="plan-ref"><summary>整理图参考处方</summary>' + rows
        + '<p class="fine-print">来自评论区「课代表」按三分化视频整理的图片（C 级，与视频结构互证）。</p></details>' : '';
    })();
    const suggestedNote = plan.days.some(day => day.suggested) ? '<p class="fine-print">带「建议」的动作来自训练库（该模板你还没有记录），先按 3 组建立基线。</p>' : '';
    // 依据与说明沉到默认折叠的 details 里：首屏只留数据。
    const why = '<details class="plan-why"><summary>为什么这样排</summary>'
      + '<p>' + esc(plan.note) + '</p>'
      + (Array.isArray(plan.reasons) ? plan.reasons.map(reason =>
        '<p>' + esc(reason.text) + (reason.source ? '<small> · ' + esc(reason.source) + '</small>' : '') + '</p>').join('') : '')
      + '</details>';
    const cues = (typeof libraryCues === 'function' && plan.days.length) ? libraryCues(plan.days[0].template) : [];
    const cueHtml = cues.length ? annotateTerms('<p class="plan-cue">' + cues.map(cue => esc(cue)).join('；') + '</p>') : '';
    // 本周安排：完全按用户偏好生成；没有偏好就不出方案。
    const prefsForm = $("#plan-prefs");
    const prefs = planPrefs();
    // 偏好芯片常驻：生成过也保持可见，改一个值就能重排，不用先点「修改」再找入口。
    if (prefsForm) prefsForm.hidden = false;
    const weekStart = shiftDay(activeDate, -((new Date(activeDate + "T00:00:00").getDay() + 6) % 7));
    let thisWeekHtml;
    if (!prefs) {
      thisWeekHtml = "<p class=\"muted\">先选一下训练偏好（频率 / 分化 / 器械 / 时长），再按它安排本周。</p>";
    } else {
      const days = trainingDays(prefs.days);
      const labels = splitLabels(prefs.split);
      let rotation = 0;
      const rows = [];
      for (let offset = 0; offset < 7; offset++) {
        const day = shiftDay(weekStart, offset);
        const items = exercisesFor(day).filter(item => item && item.name);
        const isToday = day === activeDate;
        const past = day < activeDate;
        const planned = days.includes(offset);
        const label = planned ? labels[rotation++ % labels.length] : "休息";
        let mark, cls;
        if (items.length) { mark = items.slice(0, 3).map(item => item.name).join("、") + (items.length > 3 ? " 等 " + items.length + " 个" : ""); cls = "done"; }
        else if (isToday) { mark = "今天 · " + label + " · " + (prefs.minutes || 45) + " 分钟"; cls = "today"; }
        else if (past) { mark = planned ? "未记录 · 计划 " + label : "休息"; cls = planned ? "miss" : "plan"; }
        else { mark = planned ? label + " · " + (prefs.minutes || 45) + " 分钟" : "休息"; cls = planned ? "plan" : "plan"; }
        rows.push("<li class=\"wk-" + cls + "\"><strong>" + esc(day.slice(5)) + "</strong><span>" + esc(mark) + "</span></li>");
      }
      thisWeekHtml = "<h3 class=\"plan-sub\">本周安排 · " + esc(weekStart.slice(5)) + " 起 · 每周 " + prefs.days + " 练</h3><ul class=\"plan-week\">" + rows.join("") + "</ul>";
    }
    const stateHtml = '<div class="plan-state">' + stateRows.map(row =>
      '<div class="plan-state-row"><span>' + esc(row[0]) + '</span><b>' + esc(row[1]) + '</b></div>').join('') + '</div>';
    box.innerHTML = annotateTerms(thisWeekHtml + cueHtml + stateHtml + acwrHtml + suggestedNote + why + reference);
      + '<div class="plan-days">' + plan.days.map(day =>
        `<div class="plan-day"><div class="plan-day-head"><strong>${esc(day.date.slice(5))}</strong><span>${esc(TRAINING_TEMPLATES[day.template] || day.template)}</span></div>`
        + (day.exercises.length ? day.exercises.map(item =>
          `<div class="plan-item"><span>${esc(item.name)}${day.suggested ? ' <small class="plan-suggest">建议</small>' : ''}</span><b>${item.sets} × ${item.reps}${item.rpe ? ' · RPE ' + item.rpe : ''}${item.weight !== null ? ' · ' + item.weight + ' kg' : ''}</b></div>`).join('')
          : '<div class="plan-item"><span>还没有可安排的动作</span><b>—</b></div>') + '</div>').join('') + '</div>'
      + `<div class="button-row"><button type="button" class="button primary" data-plan-schedule="1">一键排课</button></div>`;
  }

  /** Load and plateau warnings shown above the weight chart. */
  function renderTrendWarnings() {
    const box = $('#trend-warnings');
    if (!box) return;
    const notes = [];
    const stats = acwrFromDailyLoads(dailyLoads(28), activeDate);
    if (stats && stats.flag === 'high') notes.push('训练负荷急增：近 7 天是近 4 周均值的 ' + stats.ratio + ' 倍，建议本周减载或休息一天。');
    if (stats && stats.flag === 'low' && stats.days >= 3) notes.push('训练量偏低：近 7 天只有均值的 ' + stats.ratio + ' 倍，若在减脂期注意保住肌肉量。');
    const weekly = weeklyWeightMeans();
    const plateau = plateauFromWeekly(weekly);
    if (plateau && plateau.plateau) notes.push('体重平台期：最近三周周均在 ' + plateau.mean + ' kg 上下浮动不到 0.2 kg，可以重算维持热量或调整缺口。');
    if (!notes.length) { box.hidden = true; box.innerHTML = ''; return; }
    box.hidden = false;
    box.innerHTML = annotateTerms(notes.map(note => `<p class="warn-line">${esc(note)}</p>`).join(''));
  }

  function renderDailyThree() {
    const form = $('#daily-three-form');
    if (!form) return;
    const tag = $('#daily-three-tag');
    const habit = (state.habits || []).find(row => row && row.date === activeDate) || {};
    const measurement = (state.measurements || []).find(row => row && row.date === activeDate) || {};
    const training = habit.training === true || habit.training === 'true' ? 'true' : habit.training === false || habit.training === 'false' ? 'false' : '';
    if (document.activeElement !== form.elements.training) form.elements.training.value = training;
    if (document.activeElement !== form.elements.sleep) form.elements.sleep.value = number(habit.sleep) ?? '';
    if (document.activeElement !== form.elements.weight) form.elements.weight.value = number(measurement.weight) ?? '';
    const filled = [training !== '', number(habit.sleep) !== null, number(measurement.weight) !== null].filter(Boolean).length;
    if (tag) tag.textContent = filled === 0 ? '待记录' : filled === 3 ? '已记录三样' : `已记录 ${filled}/3`;
  }
  /** One-tap copies: yesterday's meals first, then the most recent ones. */
  function copyCandidates() {
    const rows = (state.meals || []).filter(row => row && validDate(row.date) && !row.needsDate);
    const yesterday = shiftDay(activeDate,-1);
    const rank = row => (row.date === yesterday ? 0 : 1);
    const key = row => `${row.date}|${row.mealType || ''}|${row.name || ''}|${fmt(row.calories, 0)}`;
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
    if (tag) tag.textContent = rows.length ? `最近 ${rows.length} 餐` : '暂无可复制记录';
    box.innerHTML = rows.length ? rows.map(row => {
      const label = `${row.date === shiftDay(activeDate,-1) ? '昨天' : String(row.date).slice(5)} · ${mealNames[row.mealType] || '餐食'} · ${row.name || '未命名'}`;
      return `<button type="button" class="button subtle" data-copy-meal="${esc(row.id ?? '')}">${esc(label)}</button>`;
    }).join('') : empty('还没有可复制的餐食记录', '记下一餐后，这里会列出来供一键复制。');
  }
  /** Copies one meal to the viewed date with a fresh id; totals and items are carried over as-is. */
  async function copyMeal(id) {
    const source = (state.meals || []).find(row => row && String(row.id ?? '') === String(id));
    if (!source) {notice('这条记录已经不存在了。', true); renderCopyMeals(); return;}
    const copy = {...source};
    delete copy.id;
    copy.date = activeDate;
    copy.source = 'quick-copy';
    copy.mealTime = nowClock();
    copy.mealTimeSource = 'manual';
    delete copy.estimateId;
    delete copy.draftId;
    if (!await askConfirm(`把「${source.name || '这一餐'}」复制到 ${activeDate}？复制后可以再改份量。`, {title: '复制这一餐', ok: '复制'})) return;
    try {
      await api('/api/meals', copy);
      await loadState({quiet: true});
      notice(`已复制到 ${activeDate}，请核对份量。`);
    } catch (error) {notice(error.message, true);}
  }
  function numericForm(form, fields) {return Object.fromEntries(fields.map(key => [key, number(form.elements.namedItem(key).value)]));}
  async function submitForm(form, path, build) {
    const button=$('button[type=submit]',form), message=$('.form-feedback',form);
    if (button.disabled || !form.reportValidity()) return;
    button.disabled=true; feedback(message,'正在保存…');
    try {
      const payload=build(form); if (payload===null) return;
      await api(path,payload);
      feedback(message,'已保存。');
      if (path === '/api/meals') {form.reset();setDefaultDates();}
      if (path === '/api/settings') {delete providerDrafts[selectedProvider];form.elements.apiKey.value='';form.elements.clearKey.checked=false;}
      try {await loadState({quiet:true});} catch {feedback(message,'保存成功，但刷新失败。请检查连接后重新加载；不要重复提交。',true);}
      if (path === '/api/settings') await refreshSettings();
    } catch (error) {feedback(message,error.message,true);} finally {button.disabled=false;}
  }
  async function refreshAdvice() {
    const button=$('#refresh-advice'), container=$('#advice-content');
    button.disabled=true; container.textContent='正在整理已记录数据…'; container.removeAttribute('data-date');
    syncCalendarDay();
    const date=activeDate,useAI=$('#advice-ai').checked;
    if(useAI && !$('#advice-consent').hidden && !$('#advice-consent').checked){container.textContent='AI 建议需要先勾选本次外发同意。';button.disabled=false;return;}
    try {const data=await api('/api/advice',{date,...(useAI?{useAI:true,allowExternal:true}:{})}); if(date!==activeDate) return; if(!Array.isArray(data?.messages)) throw new Error('建议数据格式不正确。'); renderAdvice(data.messages,date);}
    catch(error) {container.textContent=error.message;} finally {button.disabled=false;if(useAI)acceptConsent('advice');}
  }
  function clearImage() {lastCaptureId='';mealPhotoMeta=photoMeta(null);imageVersion++;imageData=null;imageBusy=false;$('#meal-image').value='';$('#meal-gallery').value='';$('#image-preview').hidden=true;$('#meal-image-preview').removeAttribute('src');}
  async function compressImage(file) {
    if (/\.hei[cf]$/i.test(file.name) || /hei[cf]/i.test(file.type)) throw new Error('暂不支持 HEIC / HEIF。请先在相册导出为 JPEG，再上传。');
    if (!['image/jpeg','image/png','image/webp'].includes(file.type)) throw new Error('请选择 JPEG、PNG 或 WebP 图片；暂不支持此格式。');
    if (file.size>20*1024*1024) throw new Error('图片过大，请选择小于 20MB 的图片。');
    const url=URL.createObjectURL(file);
    try {
      const image=await new Promise((resolve,reject) => {const node=new Image();node.onload=()=>resolve(node);node.onerror=()=>reject(new Error('无法解码这张图片，请换一张 JPEG / PNG 图片。'));node.src=url;});
      if (!image.naturalWidth || !image.naturalHeight) throw new Error('图片尺寸无效。');
      const scale=Math.min(1,1280/Math.max(image.naturalWidth,image.naturalHeight));
      const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
      const context=canvas.getContext('2d');if(!context) throw new Error('此浏览器不支持图片压缩，请使用餐食文字描述。');
      context.fillStyle='#ffffff';context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(image,0,0,canvas.width,canvas.height);
      return canvas.toDataURL('image/jpeg',.82);
    } finally {URL.revokeObjectURL(url);}
  }
  const nutritionKeys = ['calories','protein','fat','carbs'];
  const nutritionPrecision = value => Math.max(0, Math.round(Number(value) * 100) / 100);
  function scaleEstimateItem(row, grams) {
    const baseGrams = number(row.dataset.baseGrams);
    if (!(grams > 0) || !(baseGrams > 0)) return;
    const ratio = grams / baseGrams;
    for (const key of nutritionKeys) {
      const input = $(`[data-item-field="${key}"]`, row), base = number(input?.dataset.baseValue);
      if (input && base !== null) input.value = nutritionPrecision(base * ratio);
    }
    updatePreviewTotals();
  }
  function openItemRecalc(row) {
    if (!row) return;
    const root = $('#item-recalc-dialog'), grams = number($('[data-item-field="grams"]', row)?.value), baseGrams = number(row.dataset.baseGrams);
    if (!(grams > 0) || !(baseGrams > 0)) return;
    $('#item-recalc-summary').textContent = `${$('[data-item-field="name"]', row)?.value || '这项食品'}：当前 ${fmt(grams)}g。`;
    $('#item-recalc-grams').value = grams;
    for (const key of nutritionKeys) {
      const input = $(`[data-item-field="${key}"]`, row), base = number(input?.dataset.baseValue);
      $(`#item-recalc-${key}`).value = base === null ? '' : nutritionPrecision(base / baseGrams * 100);
    }
    $('#item-recalc-feedback').textContent = '';
    root.dataset.itemIndex = String($$('.estimate-item').indexOf(row));
    root.hidden = false;
    $('#item-recalc-grams').focus();
    $('#item-recalc-grams').select();
  }
  function closeItemRecalc() {
    const root = $('#item-recalc-dialog');
    root.hidden = true; delete root.dataset.itemIndex;
    $('#item-recalc-form').reset();
    $('#item-recalc-feedback').textContent = '';
  }
  /** The user's own anchor table, sent along so the model reuses the same numbers (rules.md 第五节). */
  function anchorSummary() {
    try {return window.QinghengAnchors?.summary?.() || '';} catch {return '';}
  }
  /** Stores the anchor block natively once per session so push/advice prompts can reuse it too. */
  async function syncAnchors() {
    const summary = anchorSummary();
    if (!summary) return;
    try {
      const current = await api('/api/anchors');
      if (current?.summary === summary) return;
      await api('/api/anchors', {summary});
    } catch { /* Anchors are an optimisation; never block the app on them. */ }
  }
  function previewDraft(data, form) {
    if (!data?.draftId || !Array.isArray(data.items) || !data.items.length || !['api','local'].includes(data.source)) throw new Error('未返回有效估算预览，请重试。');
    if (data.items.some(item => ['grams','calories','protein','fat','carbs'].some(key => number(item[key])===null || Number(item[key])<0))) throw new Error('估算中有无效营养数值，请重新生成。');
    const suggested = defaultMealTime(form.photo, form.text, form.elements.mealType.value);
    const view = {id:data.draftId,date:form.elements.date.value,mealType:form.elements.mealType.value,source:data.source,
      confidence:data.confidence,notes:Array.isArray(data.notes)?data.notes:[],items:data.items,name:'',
      oilGrams:number(data.oilGrams) ?? 0,uncertaintyPercent:number(data.uncertaintyPercent) ?? 15,
      ...photoMeta(form.photo), mealTime:suggested.mealTime, mealTimeSource:suggested.mealTimeSource};
    renderPreview(view, false);
    saveToDraftBox(view);
  }
  /** Renders a stored or fresh estimate preview; a restored draft is labelled as such. */
  function renderPreview(view, restored) {
    if (!view?.id || !Array.isArray(view.items) || !view.items.length) throw new Error('这份草稿不完整，请重新估算。');
    const mealTime = clockPattern.test(String(view.mealTime||'')) ? view.mealTime : nowClock();
    const source = ['photo','text','now','manual','typical'].includes(view.mealTimeSource) ? view.mealTimeSource : 'now';
    draft={id:view.id,date:view.date,mealType:view.mealType,source:view.source,mealTime,mealTimeSource:source,...photoMeta(view)};
    $('#estimate-date').value=draft.date; $('#estimate-meal-type').value=draft.mealType;
    $('#estimate-meal-time').value=mealTime;
    $('#estimate-meal-time-note').textContent=mealTimeNote(draft);
    $('#estimate-photo-time').textContent=photoTimeLabel(draft);
    const fields=[['grams','克重 · g'],['calories','热量 · kcal'],['protein','蛋白质 · g'],['fat','脂肪 · g'],['carbs','碳水 · g']];
    const modelNote = item => {
      const model = item?.model, per100 = model?.per100;
      if (!model || !per100 || number(per100.calories) === null) return '';
      const basis = ({raw:'生重',cooked:'熟重',as_served:'食用状态'})[model.basis] || model.basis || '口径未标注';
      const range = Array.isArray(model.calorieRangePer100) && model.calorieRangePer100.length === 2 && number(item.grams) !== null
        ? ` · 此配方热量约 ${fmt(model.calorieRangePer100[0]*item.grams/100,0)}–${fmt(model.calorieRangePer100[1]*item.grams/100,0)} kcal` : '';
      return `<p class="fine-print">本地参考：${fmt(per100.calories,0)} kcal/100g · ${esc(basis)}${range}。${esc(model.note || '')}</p>`;
    };
    // Each row keeps its original estimate as a ratio baseline, so repeated gram edits never accumulate rounding drift.
    $('#estimate-items').innerHTML=view.items.map(item => `<div class="estimate-item" data-base-grams="${Number(item.grams)}"><div class="estimate-item-head"><label>食物名称<input data-item-field="name" value="${esc(item.name)}" maxlength="120" required></label><div class="estimate-item-actions"><button type="button" class="recalc-item" title="按克重和每 100g 数据重算" aria-label="按克重重算${esc(item.name)}"><span class="inline-icon" aria-hidden="true"><img src="./icon-refresh.svg" alt="" width="17" height="17"></span></button><button type="button" class="remove-item" title="移除这项" aria-label="移除${esc(item.name)}">×</button></div></div>${modelNote(item)}<div class="form-grid">${fields.map(([key,label]) => `<label>${label}<input data-item-field="${key}" type="number" value="${Number(item[key])}" ${key === 'grams' ? '' : `data-base-value="${Number(item[key])}"`} min="0" max="20000" step="0.01" required></label>`).join('')}</div></div>`).join('');
    $('#estimate-source').textContent=`${view.source==='api'?'外部模型':'本地估算'} · ${view.confidence==='medium'?'中等':'低'}置信度${restored?' · 已恢复未确认草稿':''}`;
    const uncertainty=number(view.uncertaintyPercent) ?? 15;
    draft.uncertaintyPercent=uncertainty; draft.oilGrams=number(view.oilGrams) ?? 0;
    const totalCalories=totalsFor(view.items).calories;
    const interval=`估算区间：约 ${fmt(totalCalories*(1-uncertainty/100),0)}–${fmt(totalCalories*(1+uncertainty/100),0)} kcal（±${fmt(uncertainty,0)}%）`;
    const oilNote=draft.oilGrams>0?`已计入烹调用油 ${fmt(draft.oilGrams,0)} g（约 ${fmt(draft.oilGrams*9,0)} kcal）`:'照片无法判断用油量；如果这餐是炒菜，请补上后用油量，否则热量会偏低。';
    const lowNote='识别结果可能有偏差，请核对份量与用油；不确定的项按常见份量取中位值即可，不必刻意往高报。';
    $('#estimate-notes').innerHTML=[interval,oilNote,lowNote].concat(Array.isArray(view.notes)?view.notes:[]).map(note=>`<li>${esc(note)}</li>`).join('');
    $('#estimate-name').value=view.name || view.items.map(item=>item.name).join('、').slice(0,120);
    $('#estimate-preview').hidden=false;
    feedback($('#preview-feedback'), restored?'已恢复未确认的估算，请核对日期与克重后确认保存。':'请检查数据后确认保存。');
    updatePreviewTotals();
    $('#estimate-preview').scrollIntoView({block:'nearest',behavior:'auto'});
  }
