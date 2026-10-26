/**
 * 纯函数层：通用草稿解析、每日体检、ACWR、平台期、周计划生成。
 * 全部不碰 DOM、尽量只吃参数，方便用 Node 直接跑真实断言。
 */
import {patch} from '../lib/patch.mjs';

patch('app/src/fragments/60-training-copy.fragment.js', [
  [
    'pure analysis helpers',
    `  function renderDailyThree() {`,
    `  // ---------------------------------------------------------------------------------------------
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
    const today = /^\\d{4}-\\d{2}-\\d{2}$/.test(String(baseDate || '')) ? baseDate : new Date().toISOString().slice(0, 10);
    let date = today;
    const explicit = raw.match(/(\\d{4})[\\-\\/](\\d{1,2})[\\-\\/](\\d{1,2})/) || raw.match(/(\\d{1,2})月(\\d{1,2})[日号]?/);
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
    const weight = raw.match(/(\\d{2,3}(?:\\.\\d)?)\\s*(?:kg|公斤|千克)/);
    if (weight && /(体重|称了|称重|重量)/.test(raw) && !/(跑了|跑步|卧推|深蹲|硬拉|引体)/.test(raw)) {
      const value = Number(weight[1]);
      if (value >= 20 && value <= 400) return {kind: 'weight', date, rows: [{label: '体重', value: value + ' kg'}], missing: [], payload: {weight: value}};
    }
    const sleep = raw.match(/(\\d+(?:\\.\\d+)?)\\s*(?:个)?(?:小时|h|H)/);
    if (sleep && /(睡|睡眠)/.test(raw)) {
      const value = Number(sleep[1]);
      if (value > 0 && value <= 24) return {kind: 'sleep', date, rows: [{label: '睡眠', value: value + ' 小时'}], missing: [], payload: {sleep: value}};
    }
    const steps = raw.match(/(\\d{3,6})\\s*步/);
    if (steps) return {kind: 'steps', date, rows: [{label: '步数', value: Number(steps[1]).toLocaleString() + ' 步'}], missing: [], payload: {steps: Number(steps[1])}};
    const water = raw.match(/(\\d+(?:\\.\\d+)?)\\s*(?:升|L|l|毫升|ml|ML)/);
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
      const distance = raw.match(/(\\d+(?:\\.\\d+)?)\\s*(?:km|KM|Km|公里|千米)/);
      const minutes = raw.match(/(\\d+)\\s*(?:分钟|min)/);
      const clock = raw.match(/(\\d{1,2}):(\\d{2})/);
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
        const sets = clause.match(/(\\d+)\\s*组/);
        const reps = clause.match(/(\\d+)\\s*[次下个]/);
        const weightHit = clause.match(/(\\d+(?:\\.\\d+)?)\\s*(?:kg|KG|Kg|公斤|千克)/);
        const item = {name, sets: sets ? Number(sets[1]) : null, reps: reps ? Number(reps[1]) : null,
          weight: weightHit ? Number(weightHit[1]) : null, distanceKm: null, durationMin: null};
        exercises.push(item);
        if (!sets || !reps) missing.push(name + ' 的组数/次数');
        rows.push({label: name, value: [item.sets !== null ? item.sets + ' 组' : '待补组数', item.reps !== null ? '× ' + item.reps + ' 次' : '待补次数', item.weight !== null ? item.weight + ' kg' : ''].filter(Boolean).join(' ')});
      }
    }
    if (!exercises.length) return null;
    if (planned && !/今天|昨天|前天|\\d/.test(raw)) return null;
    const template = /(腿|深蹲|硬拉|提踵|腿举)/.test(raw) ? 'legs' : /(拉|划船|引体|下拉|弯举)/.test(raw) ? 'pull' : /(推|卧推|肩推|侧平举)/.test(raw) ? 'push' : 'other';
    return {kind: 'training', date, rows, missing, payload: {template, exercises}};
  }

  /** Kept for the older call sites/tests: only training drafts. */
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
        ok: distance === 0, score: distance === 0 ? 1 : clamp01(1 - distance / width)});
    }
    if (Number.isFinite(src.proteinMin) && src.proteinMin > 0) {
      items.push({key: 'protein', label: '蛋白质', value: Math.round(sum.protein), target: Math.round(src.proteinMin) + 'g 起',
        ok: sum.protein >= src.proteinMin, score: clamp01(sum.protein / src.proteinMin)});
    }
    if (Number.isFinite(src.fatMin) && Number.isFinite(src.fatMax)) {
      const distance = sum.fat < src.fatMin ? src.fatMin - sum.fat : sum.fat > src.fatMax ? sum.fat - src.fatMax : 0;
      items.push({key: 'fat', label: '脂肪', value: Math.round(sum.fat), target: Math.round(src.fatMin) + '~' + Math.round(src.fatMax) + 'g',
        ok: distance === 0, score: distance === 0 ? 1 : clamp01(1 - distance / Math.max(10, src.fatMax))});
    }
    const trained = habit.training === true || habit.training === 'true' || (Array.isArray(habit.exercises) && habit.exercises.length > 0);
    items.push({key: 'training', label: '训练', value: trained ? '已记录' : (habit.training === false || habit.training === 'false' ? '休息' : '未记录'),
      target: '每天记一次', ok: trained || habit.training === false || habit.training === 'false',
      score: trained || habit.training === false || habit.training === 'false' ? 1 : 0.4});
    const sleep = Number(habit.sleep);
    items.push({key: 'sleep', label: '睡眠', value: Number.isFinite(sleep) && sleep > 0 ? sleep + ' 小时' : '未记录',
      target: '7 小时起', ok: Number.isFinite(sleep) && sleep >= 7,
      score: Number.isFinite(sleep) && sleep > 0 ? clamp01(sleep / 7) : 0.4});

    let worst = null;
    for (const item of items) if (!worst || item.score < worst.score) worst = item;
    let action = '今天的记录都在区间内，保持就好。';
    if (worst) {
      const gap = worst.key === 'calories' ? Math.abs(sum.calories - (sum.calories > (range ? range.max : 0) ? range.max : range.min))
        : worst.key === 'protein' ? Math.max(0, Math.round((src.proteinMin || 0) - sum.protein))
          : 0;
      if (worst.key === 'calories' && range && sum.calories > range.max) action = '热量超上限 ' + Math.round(sum.calories - range.max) + ' kcal：晚餐只吃蛋白 + 蔬菜，不再加主食。';
      else if (worst.key === 'calories' && range) action = '还差 ' + Math.round(range.min - sum.calories) + ' kcal：加一份主食配一个蛋白来源。';
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
    if (!rows.length || !/^\\d{4}-\\d{2}-\\d{2}$/.test(String(today || ''))) return null;
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
    if (!/^\\d{4}-\\d{2}-\\d{2}$/.test(start)) return null;
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
      if (!row || !Number.isFinite(Number(row.sets))) continue;
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
      const exercises = (byTemplate[template] && byTemplate[template].length ? byTemplate[template] : byTemplate.other).slice(0, 5);
      days.push({date: date.getFullYear() + '-' + pad2(date.getMonth() + 1) + '-' + pad2(date.getDate()),
        template, deload, exercises});
    });
    return {startDate: start, sessions, deload, days,
      note: deload ? '本周负荷偏高（ACWR > 1.5），按减载周安排：负重 ×0.9、组数 −1。'
        : '按上周重量 +2.5% 安排，重量留空的动作表示上周没记到负重。'};
  }

  /** The model-free one-liner used when a request does not need an LLM at all. */
  function localCoachLine(check) {
    if (!check) return '';
    return check.action || '';
  }

  function renderDailyThree() {`,
  ],
]);

console.log('pure analysis layer added');
