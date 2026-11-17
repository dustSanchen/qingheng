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
   * 每日体检评分（2026-11-03 重构）：训练不再计分，按证据强度给四项加权。
   * 热量 30（总摄入是体重管理的主变量）、蛋白质 30（保肌的第一优先级）、
   * 脂肪 20（最容易超的一项）、睡眠 20（恢复与食欲调节）。
   * 未记录的项不计入分母——缺数据不等于差，只报「已评 n/4」，避免半天空表也算低分。
   * Inputs are passed in so the rule engine can be tested without the app.
   */
  const DAILY_CHECK_WEIGHTS = {calories: 30, protein: 30, fat: 20, sleep: 20};
  /**
   * 放松日判定（不落库，纯推导）：
   * 热量超区间上限 12% 或脂肪超上限 20%，且当天至少两餐、不是吃太少；
   * 同一自然周只认一天——更早已经有放松日，今天就算第二次超量，不再享受。
   */
  const RELAX_TAG = 'qingheng.relaxDay';
  function relaxDayInfoFor(date) {
    const meals = (state.meals || []).filter(row => row && row.date === date);
    const range = intakeRangeForDate(date);
    const profile = effectiveProfileForDate(date);
    const fatMax = number(profile.fatMax);
    let calories = 0, fat = 0;
    for (const meal of meals) {
      const totals = meal && meal.totals ? meal.totals : meal;
      calories += Number(totals?.calories ?? 0) || 0;
      fat += Number(totals?.fat ?? 0) || 0;
    }
    const overKcal = range && number(range.max) ? calories - Number(range.max) : 0;
    const overFat = fatMax ? fat - fatMax : 0;
    const bigKcal = range && number(range.max) && calories >= Number(range.max) * 1.12;
    const bigFat = fatMax && fat >= fatMax * 1.2;
    const qualifies = meals.length >= 2 && !!(bigKcal || bigFat) && !(range && calories < Number(range.min || 0));
    if (!qualifies) return {relax: false, calories, fat, overKcal: Math.max(0, overKcal), overFat: Math.max(0, overFat)};
    // 本周（周一~周日）里比这天更早的符合条件日：有则说明本周额度已用掉。
    const start = shiftDay(date, -((weekdayIndex(date) + 6) % 7));
    const earlier = [];
    for (let i = 0; i < 7; i++) {
      const day = shiftDay(start, i);
      if (day >= date) break;
      const rows = (state.meals || []).filter(row => row && row.date === day);
      if (rows.length < 2) continue;
      const r = intakeRangeForDate(day);
      const pf = effectiveProfileForDate(day);
      const fm = number(pf.fatMax);
      let c = 0, f = 0;
      for (const meal of rows) {
        const t = meal && meal.totals ? meal.totals : meal;
        c += Number(t?.calories ?? 0) || 0;
        f += Number(t?.fat ?? 0) || 0;
      }
      if (r && number(r.max) && c >= Number(r.max) * 1.12 && c >= Number(r.min || 0)) earlier.push(day);
      else if (fm && f >= fm * 1.2 && r && number(r.max) && c >= Number(r.min || 0)) earlier.push(day);
    }
    const used = earlier.length > 0;
    return {relax: !used, used, earlier, calories, fat, overKcal: Math.max(0, overKcal), overFat: Math.max(0, overFat)};
  }
  function dailyCheck(input) {
    const src = input || {};
    const meals = src.meals || [], habit = src.habit || {}, range = src.range || null;
    const relax = src.relax === true;
    const sum = meals.reduce((acc, meal) => {
      const totals = meal && meal.totals ? meal.totals : (meal || {});
      for (const key of ['calories', 'protein', 'fat', 'carbs']) acc[key] += Number(totals[key] ?? 0) || 0;
      return acc;
    }, {calories: 0, protein: 0, fat: 0, carbs: 0});
    const items = [];
    const clamp01 = value => Math.max(0, Math.min(1, value));
    const hasMeals = sum.calories > 0;
    if (range && Number.isFinite(range.min) && Number.isFinite(range.max)) {
      const distance = sum.calories < range.min ? range.min - sum.calories : sum.calories > range.max ? sum.calories - range.max : 0;
      // 按偏离目标的百分比给分：≤3% 满分，5% 0.9，10% 0.75，20% 0.5，35% 0.25，再远 0。
      const reference = Math.max(1, sum.calories > range.max ? range.max : range.min);
      const deviation = distance / reference;
      const calScore = deviation === 0 ? 1 : deviation <= 0.03 ? 1 : deviation <= 0.05 ? 0.9 : deviation <= 0.1 ? 0.75 : deviation <= 0.2 ? 0.5 : deviation <= 0.35 ? 0.25 : 0;
      items.push({key: 'calories', label: '热量', value: Math.round(sum.calories), target: range.min + '~' + range.max,
        weight: DAILY_CHECK_WEIGHTS.calories, evaluated: hasMeals,
        ok: distance === 0, score: calScore,
        state: relax || !hasMeals ? 'idle' : (sum.calories < range.min ? 'low' : sum.calories > range.max ? 'high' : undefined)});
    }
    if (Number.isFinite(src.proteinMin) && src.proteinMin > 0) {
      items.push({key: 'protein', label: '蛋白质', value: Math.round(sum.protein), target: Math.round(src.proteinMin) + 'g 起',
        weight: DAILY_CHECK_WEIGHTS.protein, evaluated: hasMeals,
        ok: sum.protein >= src.proteinMin, score: clamp01(sum.protein / src.proteinMin),
        state: !hasMeals ? 'idle' : (sum.protein < src.proteinMin ? 'low' : undefined)});
    }
    if (Number.isFinite(src.fatMin) && Number.isFinite(src.fatMax)) {
      const distance = sum.fat < src.fatMin ? src.fatMin - sum.fat : sum.fat > src.fatMax ? sum.fat - src.fatMax : 0;
      const span = sum.fat > src.fatMax ? Math.max(10, src.fatMax) : Math.max(10, src.fatMin || 10);
      items.push({key: 'fat', label: '脂肪', value: Math.round(sum.fat), target: Math.round(src.fatMin) + '~' + Math.round(src.fatMax) + 'g',
        weight: DAILY_CHECK_WEIGHTS.fat, evaluated: hasMeals,
        ok: distance === 0, score: distance === 0 ? 1 : clamp01(1 - distance / span),
        state: relax || !hasMeals ? 'idle' : (sum.fat > src.fatMax ? 'high' : sum.fat < src.fatMin ? 'low' : undefined)});
    }
    // 睡眠：7 小时满档；6–7 线性 0.7→1；4–6 线性 0.25→0.7；4 以下 0.1。未记录不计分。
    const sleep = Number(habit.sleep);
    const sleepKnown = Number.isFinite(sleep) && sleep > 0;
    const sleepScore = !sleepKnown ? 0 : sleep >= 7 ? 1 : sleep >= 6 ? 0.7 + (sleep - 6) * 0.3 : sleep >= 4 ? 0.25 + (sleep - 4) * 0.225 : 0.1;
    items.push({key: 'sleep', label: '睡眠', value: sleepKnown ? sleep + ' 小时' : '未记录', target: '7 小时起',
      weight: DAILY_CHECK_WEIGHTS.sleep, evaluated: sleepKnown,
      ok: sleepKnown && sleep >= 7, score: sleepScore, state: sleepKnown ? undefined : 'idle'});

    const scored = items.filter(item => item.evaluated);
    const weightSum = scored.reduce((acc, item) => acc + item.weight, 0);
    const score = weightSum > 0 ? Math.round(scored.reduce((acc, item) => acc + item.score * item.weight, 0) / weightSum * 100) : null;
    const coverage = Math.round(weightSum / Object.values(DAILY_CHECK_WEIGHTS).reduce((a, b) => a + b, 0) * 100);

    let worst = null, best = null;
    for (const item of scored) {
      if (!worst || item.score < worst.score) worst = item;
      if (!best || item.score > best.score) best = item;
    }
    // 一句评价：先给结论，再说哪一项差多少，最后给一句人话。不用「明显偏了」这类判断词。
    let verdict = '还没有可评的记录：先记一餐和睡眠，我再帮你算。';
    if (score !== null) {
      const band = score >= 85 ? '今天整体到位' : score >= 70 ? '今天整体还不错' : score >= 50 ? '今天有几项没跟上' : '今天缺口比较大';
      const gapOf = item => {
        if (item.key === 'calories' && range) return item.value < range.min
          ? `热量还差 ${Math.round(range.min - item.value)} kcal`
          : `热量超了 ${Math.round(item.value - range.max)} kcal`;
        if (item.key === 'protein') return `蛋白还差 ${Math.max(0, Math.round((src.proteinMin || 0) - item.value))} g`;
        if (item.key === 'fat') return item.value > (src.fatMax || 0)
          ? `脂肪超了 ${Math.round(item.value - (src.fatMax || 0))} g`
          : `脂肪少了 ${Math.round((src.fatMin || 0) - item.value)} g`;
        if (item.key === 'sleep') return `睡眠只有 ${item.value}（建议 7 小时以上）`;
        return `${item.label}还差一点`;
      };
      const good = scored.filter(item => item.ok).map(item => item.label);
      const goodPart = good.length ? `${good.slice(0, 2).join('和')}在区间内` : '还没有一项完全在区间内';
      const worstPart = worst && !worst.ok ? gapOf(worst) : '';
      verdict = worstPart
        ? `${band}：${goodPart}，${worstPart}，先补这一项。`
        : `${band}：${goodPart}。`;
      const missing = items.length - scored.length;
      if (missing > 0) verdict += `还有 ${missing} 项没记录，记了才评得准。`;
    }
    let action = '今天的记录都在区间内，保持就好。';
    if (worst) {
      const proteinGap = Math.max(0, Math.round((src.proteinMin || 0) - sum.protein));
      if (worst.key === 'calories' && range && sum.calories > range.max) action = '热量超上限 ' + Math.round(sum.calories - range.max) + ' kcal：晚餐只吃蛋白 + 蔬菜，不再加主食。';
      else if (worst.key === 'calories' && range && sum.calories < range.min) action = '还差 ' + Math.round(range.min - sum.calories) + ' kcal：加一份主食配一个蛋白来源。';
      else if (worst.key === 'protein') action = '优先补蛋白：还差 ' + proteinGap + ' g，下一餐先吃蛋白质。';
      else if (worst.key === 'fat' && src.fatMax) action = '脂肪超 ' + Math.round(Math.max(0, sum.fat - src.fatMax)) + ' g：之后改白灼/清蒸，少油。';
      else if (worst.key === 'sleep') action = '睡眠 ' + (worst.value === '未记录' ? '没记录' : worst.value) + '：今天训练强度降 10%，别加组。';
    }
    if (relax) {
      verdict = '今天是本周的放松日：吃得比目标多一些，属于计划内，不算失败。';
      action = '明后两天照常吃就行，不要用少吃或加练去「补回来」——那样更容易在周末反弹。';
    }
    return {items, worst, best, action, verdict, score, coverage, relax, weights: DAILY_CHECK_WEIGHTS, totals: {calories: Math.round(sum.calories), protein: Math.round(sum.protein), fat: Math.round(sum.fat), carbs: Math.round(sum.carbs)}};
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
   * 把建议重量落到健身房里装得出来的数：杠铃按 20 kg 空杆 + 每侧 2.5 kg 的整数倍，
   * 哑铃按 2 kg、器械按 5 kg 递增。装不出的数字（如 62.5 kg）比偏轻更伤执行。
   */
  function loadableWeightKg(name, desired) {
    const kg = Number(desired);
    const text = String(name || '');
    if (!Number.isFinite(kg) || kg <= 0) return null;
    if (/(负重)?(引体向上|俯卧撑|平板支撑|卷腹|悬垂举腿|双杠臂屈伸)/.test(text) && !/负重/.test(text)) return null;
    const barbell = /杠铃/.test(text) || (!/(哑铃|器械|绳索|史密斯|龙门)/.test(text)
      && /(卧推|深蹲|硬拉|划船|推举|肩推|罗马尼亚|臀推|臀桥|早安|箭步|实力举|借力推)/.test(text));
    if (barbell) {
      if (kg <= 20) return 20;
      return 20 + Math.max(5, Math.round((kg - 20) / 5) * 5);
    }
    if (/(哑铃|飞鸟|侧平举|前平举|锤式|弯举|保加利亚)/.test(text)) return Math.max(2, Math.round(kg / 2) * 2);
    if (/(器械|绳索|下拉|腿举|腿屈伸|腿弯举|夹胸|史密斯|龙门)/.test(text)) return Math.max(5, Math.round(kg / 5) * 5);
    return Math.round(kg * 2) / 2;
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
      let suggested = Number.isFinite(weight) && weight > 0
        ? Math.round((deload ? weight * 0.9 : weight * 1.025) * 2) / 2
        : null;
      if (suggested !== null) {
        suggested = loadableWeightKg(name, suggested);
        // +2.5% 对轻重量可能落回同一档（60 kg → 61.5 → 装不出 → 60），这时至少进一档，不能原地不动。
        if (!deload && suggested !== null && suggested <= weight) suggested = loadableWeightKg(name, weight + 2.5);
      }
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
    // 只给规则本身，不带出处：模型不该在回答里报 BV 号或「口述 02:08」。
    return hits.map(rule => '[' + rule.topic + '] ' + rule.claim).join('\n');
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
  /** 去掉器械/姿态前缀，留下动作本体（卧推 / 硬拉 / 划船…），用来和训练库对名。 */
  function exerciseCore(name) {
    let text = String(name || '').replace(/\s+/g, '');
    const prefix = /^(杠铃|哑铃|器械|固定器械|固定|坐姿|站姿|俯身|仰卧|上斜|下斜|单臂|单手|双臂|绳索|钢线|高位|颈前|对握|平板|斜板|反握|正握|罗马尼亚|保加利亚|双杠)/;
    for (let i = 0; i < 2; i += 1) text = text.replace(prefix, '');
    return text.length >= 2 ? text : String(name || '').replace(/\s+/g, '');
  }
  /** 对名用的候选词：全名、逐层去掉器械/姿态前缀后的形态，以及被去掉的修饰词本身
   *  （哑铃上斜卧推 → 上斜卧推 / 卧推 / 上斜 / 哑铃），这样「上斜」这类线索也能命中。 */
  function cueTokens(name) {
    const raw = String(name || '').replace(/\s+/g, '');
    const prefix = /^(杠铃|哑铃|器械|固定器械|固定|坐姿|站姿|俯身|仰卧|上斜|下斜|单臂|单手|双臂|绳索|钢线|高位|颈前|对握|平板|斜板|反握|正握|罗马尼亚|保加利亚|双杠)/;
    const tokens = new Set([raw]);
    let text = raw;
    for (let i = 0; i < 3; i += 1) {
      const head = (text.match(prefix) || [])[0];
      if (!head || text.length - head.length < 2) break;
      tokens.add(head);
      text = text.slice(head.length);
      tokens.add(text);
    }
    return [...tokens].filter(token => token.length >= 2);
  }
  /** 一条要点别超过两行：到句号或 46 字为止。 */
  function trimCue(text) {
    const clean = String(text || '').replace(/\s+/g, ' ').trim();
    const first = clean.split('。')[0].split('；')[0].trim();
    if (first.length <= 46) return first;
    return first.slice(0, 46).replace(/[，、：]$/, '') + '…';
  }
  /** 从一条规则里挑「能照做」的那半句：先挑提到这个动作的分句，再挑有动作要求的，最后用第一句。 */
  function pickCueClause(text, tokens) {
    const parts = String(text || '').split(/[；。]/).map(part => part.trim()).filter(Boolean);
    const named = (tokens || []).length
      ? parts.find(part => tokens.some(token => part.indexOf(token) >= 0))
      : null;
    if (named) return named;
    const actionable = parts.find(part => /(要|别|先|可以|守|留|建议|每组|每次|次数|组数|RPE|激活|热身|握距|开肘|幅度|退阶|曲肘)/.test(part));
    return actionable || parts[0] || '';
  }
  /**
   * 动作要点跟着「那天实际要做的动作」走，命中顺序按「说得有多准」排：
   * ⓪ 带修饰的动作（上斜哑铃卧推）先用「上斜/上斜哑铃」这类词找，免得回落到泛泛的「卧推」；
   * ① 以这个动作开头的规则（「划船时过度肩胛后缩…」）；
   * ② 模板要点里点名这个动作的那条（上斜/深蹲/引体都覆盖得到）；
   * ③ 规则里提到它、且标签与今天的分化对得上；
   * ④ 都没有就返回 null，由调用方补通用提醒。
   */
  function cueForExercise(name, family) {
    const lib = trainingLibrary();
    if (!lib) return null;
    const raw = String(name || '').trim();
    if (!raw) return null;
    const core = exerciseCore(raw);
    const tokens = cueTokens(raw);
    const specific = raw.replace(/\s+/g, '') !== core ? tokens.filter(token => token !== core && token.indexOf(core) < 0) : [];
    const order = Array.isArray(lib.priority) ? lib.priority : [];
    const rank = source => { const index = order.indexOf(source); return index < 0 ? 9 : index; };
    const rules = lib.rules || [];
    const startsWith = (rule, list) => list.some(token => String(rule.claim || '').indexOf(token) === 0);
    const mentions = (rule, list) => list.some(token => String(rule.claim || '').indexOf(token) >= 0);
    const bodyText = rule => trimCue(pickCueClause(rule.claim, [raw].concat(tokens)));
    // ⓪ 修饰词优先：长的先试（上斜卧推 > 上斜 > 哑铃），免得回落到泛泛的「卧推」
    if (specific.length) {
      const ordered = specific.slice().sort((a, b) => b.length - a.length);
      for (const token of ordered) {
        const head = rules
          .filter(rule => String(rule.claim || '').indexOf(token) === 0)
          .sort((a, b) => rank(a.source) - rank(b.source));
        if (head.length) {
          const text = bodyText(head[0]);
          if (text) return {name: raw, text};
        }
      }
      for (const token of ordered) {
        for (const key of Object.keys(lib.dayTemplates || {})) {
          const hit = (lib.dayTemplates[key].cues || []).find(cue => String(cue).indexOf(token) >= 0);
          if (hit) {
            const text = trimCue(hit);
            if (text) return {name: raw, text};
          }
        }
      }
    }
    // ① 以动作本体/全名开头的规则
    const heads = rules.filter(rule => startsWith(rule, tokens)).sort((a, b) => rank(a.source) - rank(b.source));
    if (heads.length) {
      const text = bodyText(heads[0]);
      if (text) return {name: raw, text};
    }
    // ② 模板要点里点名这个动作的
    const templates = lib.dayTemplates || {};
    for (const key of Object.keys(templates)) {
      const hit = (templates[key].cues || []).find(cue => mentions({claim: cue}, tokens));
      if (hit) {
        const text = trimCue(hit);
        if (text) return {name: raw, text};
      }
    }
    // ③ 规则里提到它、且标签与分化对得上
    const tagged = rules
      .filter(rule => (family || []).some(tag => (rule.tags || []).indexOf(tag) >= 0) && mentions(rule, tokens))
      .sort((a, b) => rank(a.source) - rank(b.source));
    if (tagged.length) {
      const text = bodyText(tagged[0]);
      if (text) return {name: raw, text};
    }
    return null;
  }
  /** 计划某一天的要点：最多 3 条，每条点名对应的动作；命中不足时补通用提醒。 */
  function libraryCuesFor(day) {
    if (!day) return [];
    const family = {push: ['push', 'shoulder', 'main', 'intensity'], pull: ['pull', 'shoulder', 'main', 'intensity'], legs: ['legs', 'warmup', 'main', 'intensity']}[day.template] || [];
    const out = [];
    const seen = new Set();
    for (const item of (day.exercises || [])) {
      const cue = cueForExercise(item && item.name, family);
      if (!cue || !cue.text || seen.has(cue.text)) continue;
      seen.add(cue.text);
      out.push(cue);
      if (out.length >= 3) break;
    }
    if (out.length < 3) {
      for (const item of (day.exercises || [])) {
        if (out.length >= 3) break;
        const name = String(item && item.name || '').trim();
        if (!name || out.some(cue => cue.name === name)) continue;
        out.push({name, text: '做到接近力竭前停；动作变形就结束这一组'});
      }
    }
    return out;
  }
  /** 某一天用户用 AI 排的那份清单（含它给的理由）。 */
  function aiPlanEntries(day) {
    if (!day) return [];
    try {
      const list = typeof aiPlanStore === 'function' ? aiPlanStore(day) : null;
      return Array.isArray(list) ? list.filter(item => item && item.name) : [];
    } catch (error) { return []; }
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
  /** 周条上被点开的那一天；空着就默认今天。 */
  let weekDetailDay = null;

  /** 周条下方的一行详情：那天记录了什么、计划是什么。 */
  function weekDetailHtml(day, plan) {
    if (!day) return '';
    const prefix = (day === activeDate ? '今天' : day.slice(5)) + ' · ';
    const items = exercisesFor(day).filter(item => item && item.name);
    const planDay = (plan && Array.isArray(plan.days) ? plan.days : []).find(item => item.date === day) || null;
    if (items.length) {
      return prefix + '已记录 ' + items.length + ' 个动作 · '
        + items.slice(0, 3).map(item => item.name).join('、') + (items.length > 3 ? ' 等' : '');
    }
    if (planDay) {
      const label = TRAINING_TEMPLATES[planDay.template] || planDay.template;
      const all = planDay.exercises || [];
      const names = all.slice(0, 3).map(item => item.name).join('、');
      return prefix + label + (names ? ' · ' + names + (all.length > 3 ? ' 等 ' + all.length + ' 个' : '') : ' · 动作待定');
    }
    return prefix + '休息';
  }

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
    if (tag) {
      tag.textContent = check.relax ? '放松日 · 本周 1/1' : check.score === null ? '待记录' : '达标 ' + check.score + '/100 · 已评 ' + check.items.filter(item => item.evaluated).length + '/' + check.items.length;
      tag.classList.toggle('is-relax', !!check.relax);
    }
    box.innerHTML = '<div class="check-grid">' + check.items.map(item => {
      // 区间内绿、接近青、差得多淡红；没记录的保持中性。
      const level = check.relax ? 'idle' : !item.evaluated ? 'idle' : item.ok || item.score >= 0.95 ? 'ok' : item.score >= 0.6 ? 'near' : 'off';
      return `<div class="check-item ${level}"><span class="check-icon" aria-hidden="true">${metricIcon(item.label)}</span><small>${esc(item.label)}</small><strong>${esc(String(item.value))}</strong><em>${esc(item.target)}</em></div>`;
    }).join('') + '</div>'
      + `<p class="check-verdict">${esc(check.verdict)}</p>`
      + `<p class="check-action"><strong>今天优先：</strong>${esc(check.action)}</p>`
      + (() => {const rule = libraryRuleForMetric(check.worst && check.worst.key); return rule
        ? '' : '';})();
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

  /** 已保存的训练安排压成一行：折叠后仍要知道「每周几天、怎么分、用什么器械、每次多久」。 */
  const PLAN_SPLIT_LABELS = {ppl: "推拉腿", ul: "上下肢", fb: "全身"};
  const PLAN_GEAR_LABELS = {mixed: "综合", barbell: "杠铃", dumbbell: "哑铃", machine: "固定器械", body: "自重"};
  function planPrefsSummary(prefs) {
    if (!prefs) return "";
    const days = Number(prefs.days) > 0 ? Number(prefs.days) : 3;
    const split = PLAN_SPLIT_LABELS[prefs.split] || "推拉腿";
    const gear = PLAN_GEAR_LABELS[prefs.gear] || "综合";
    const minutes = Number(prefs.minutes) > 0 ? Number(prefs.minutes) : 45;
    return "每周 " + days + " 练 · " + split + " · " + gear + " · " + minutes + " 分钟";
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
    // 已经定过的安排默认收起：首屏只留一行摘要，要看或改再展开。
    const summary = $("#plan-prefs-summary"), edit = $("#pref-edit");
    const setCollapsed = collapsed => {
      box.hidden = collapsed;
      if (summary) {
        summary.hidden = !collapsed;
        if (collapsed) summary.textContent = planPrefsSummary(planPrefs());
      }
      if (edit) {
        edit.hidden = !collapsed;
        edit.setAttribute("aria-expanded", String(!collapsed));
      }
    };
    setCollapsed(!!prefs);
    if (edit && !edit.dataset.wired) {
      edit.dataset.wired = "1";
      edit.addEventListener("click", () => {
        setCollapsed(false);
        const first = $("#plan-prefs .pref-chip");
        if (first) first.focus();
      });
    }
    const regen = $("#pref-regen");
    if (regen) {
      regen.hidden = !prefs;
      if (!regen.dataset.wired) {
        regen.dataset.wired = "1";
        regen.addEventListener("click", () => {
          regenerateWeekPlan();
          notice("已按当前偏好重新生成本周安排（偏好没改也能换一版）。");
        });
      }
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
        // 保存偏好与生成本周安排是同一次动作：以前指纹没变就复用缓存，看起来像「点了没反应」。
        regenerateWeekPlan();
        setCollapsed(true);
        notice("已保存训练偏好，并按新偏好重新生成本周安排。");
      });
    }
  }

  /**
   * 今天页的「今日训练清单」：计划语义的唯一入口。三态——
   * 有 AI 清单：可勾选的镜像 + 完成度 + 一键加入训练记录；
   * 无清单但有记录：列出已记录动作（只报记录，不伪装成排好的顺序）；
   * 都没有：给「用 AI 排今天 / 看本周安排」两个入口。
   */
  /** 本周计划整体是否存在、今天那一节是什么——休息日与「还没排」是两件事，不能混成一句话。 */
  function weekPlanToday() {
    const weekStart = shiftDay(activeDate, 7 - weekdayIndex(activeDate));
    let plan = (lastWeekPlan && lastWeekPlan.days) ? lastWeekPlan : null;
    if (!plan) {
      const cached = readWeekPlanCache(weekStart);
      plan = cached && cached.plan ? cached.plan : null;
    }
    if (!plan) {
      try {
        const baselines = recentExerciseBaselines(14);
        const sessions = Math.max(1, Math.min(6, Math.round(number(effectiveProfileForDate(activeDate).training) || 3)));
        const flag = (acwrFromDailyLoads(dailyLoads(28), activeDate) || {}).flag || "ok";
        plan = generateWeekPlan({startDate: weekStart, sessions, lastByExercise: baselines, acwrFlag: flag});
        if (plan) writeWeekPlanCache(weekStart, {plan, fingerprint: weekPlanFingerprint(prefsForPlan(), baselines, sessions), savedAt: Date.now()});
      } catch { plan = null; }
    }
    return {hasPlan: !!(plan && plan.days), day: plan && plan.days ? plan.days.find(item => item.date === activeDate) || null : null};
  }
  /** 本周计划里「今天」那一节：与 weekPlanToday 共用同一个来源，不再各算一遍。 */
  function weekTodaySession() {
    return weekPlanToday().day;
  }
  /** 把周计划今天那一节写进今日清单，两处入口（今日页 / 记录页）共用。 */
  async function adoptWeekDay() {
    const day = weekTodaySession();
    if (!day || !day.exercises.length) { notice("今天的安排是空的，没有可采纳的动作。"); return; }
    // 覆盖前先问：用户可能刚用 AI 排过一份，替换掉要他自己点头。
    const existing = aiPlanStore(activeDate) || [];
    if (existing.length) {
      const go = await askConfirm("今天已有一份清单（" + existing.length + " 个动作）。要用本周安排替换它吗？",
        {title: "替换今日清单", ok: "替换", cancel: "保留原来的"});
      if (!go) return;
    }
    const plan = day.exercises.map(item => ({
      name: String(item.name || "").slice(0, 24),
      sets: number(item.sets) > 0 ? number(item.sets) : 0,
      reps: number(item.reps) > 0 ? number(item.reps) : 0,
      weight: number(item.weight) > 0 ? number(item.weight) : null,
      reason: "",
      source: "week",
      done: false
    })).filter(item => item.name);
    if (!plan.length) { notice("今天的安排是空的，没有可采纳的动作。"); return; }
    aiPlanStore(activeDate, plan);
    if (typeof renderAiPlan === "function") renderAiPlan();
    renderAdviceOrder();
    renderWeekPlan();
    notice("已把今天这节采纳到今日清单，可以逐项勾选执行。");
  }
  function renderAdviceOrder() {
    const box = $("#training-advice-order");
    if (!box) return;
    if (!box.dataset.todayWired) {
      box.dataset.todayWired = "1";
      box.addEventListener("click", event => {
        const log = event.target.closest("[data-today-log]");
        if (log) {
          event.preventDefault();
          const plan = typeof aiPlanStore === "function" ? (aiPlanStore(activeDate) || []) : [];
          if (typeof startLoggingFromPlan === "function") startLoggingFromPlan(plan[Number(log.dataset.todayLog)]).catch(() => {});
          return;
        }
        const done = event.target.closest("[data-today-done]");
        if (done) {
          const plan = typeof aiPlanStore === "function" ? (aiPlanStore(activeDate) || []) : [];
          const index = Number(done.dataset.todayDone);
          if (plan[index]) { plan[index].done = done.checked; aiPlanStore(activeDate, plan); }
          renderAdviceOrder();
          if (typeof renderAiPlan === "function") renderAiPlan();
          return;
        }
        const adopt = event.target.closest("[data-today-adopt]");
        if (adopt) { event.preventDefault(); adoptWeekDay(); return; }
        const addAll = event.target.closest("[data-today-add-all]");
        if (addAll) {
          const pending = (typeof aiPlanStore === "function" ? (aiPlanStore(activeDate) || []) : []).filter(item => !item.done);
          if (typeof addExercisesToToday === "function") addExercisesToToday(pending).catch(() => {});
          return;
        }
        const jump = event.target.closest("[data-today-plan]");
        if (jump) {
          // 「用 AI 排今天」就地排：跳页再让用户点第二次，是最伤直觉的一步。
          if (jump.dataset.todayPlan === "ai" && typeof askAiPlan === "function") {
            if (!externalConsent()) { notice("请先到「我的 → 数据、外观与说明」开启外部模型授权。"); return; }
            askAiPlan(jump);
            return;
          }
          // 本周安排长在「训练」分段里：先切分段，再等卡片真的渲染出来再滚。
          // 原来只 switchTab + 80ms 后 scrollIntoView，记录页此刻还停在饮食分段，滚动打空。
          const wantAi = jump.dataset.todayPlan === "ai";
          switchTab("records", true);
          const jumpToPlan = (attempt = 0) => {
            if (!wantAi && typeof switchRecordPanel === "function") switchRecordPanel("training");
            const target = $(wantAi ? "#ai-plan" : "#week-plan-card");
            if (target) {
              target.scrollIntoView({block: "start", behavior: "smooth"});
              if (typeof flashTarget === "function") flashTarget(target);
              return;
            }
            if (attempt < 12) setTimeout(() => jumpToPlan(attempt + 1), 100);
          };
          setTimeout(() => jumpToPlan(), 60);
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
        return "<li class=\"adv-plan-li\"><label class=\"adv-plan-item\"><input type=\"checkbox\" data-today-done=\"" + index + "\"" + (item.done ? " checked" : "") + ">"
          + "<span class=\"adv-name\">" + esc(item.name) + "</span>" + (dose ? "<span class=\"adv-dose\">" + esc(dose) + "</span>" : "") + "</label>"
          + "<button type=\"button\" class=\"text-button adv-plan-log\" data-today-log=\"" + index + "\" aria-label=\"记录" + esc(item.name) + "\">记录</button></li>";
      }).join("");
      box.hidden = false;
      box.innerHTML = "<h3 class=\"plan-sub\">今日清单 · " + doneCount + "/" + plan.length + " 完成</h3><ol class=\"adv-order-list\">" + rows + "</ol>"
        + (pending ? "<div class=\"button-row\"><button type=\"button\" class=\"button subtle\" data-today-add-all>把未完成的加入训练记录</button></div>" : "<p class=\"fine-print\">清单已全部完成。</p>")
        + "<p class=\"fine-print\">编辑清单请到「记录 → 训练计划」。</p>";
      return;
    }
    if (!items.length) {
      const weekInfo = weekPlanToday();
      const weekDay = weekInfo.day;
      if (weekInfo.hasPlan && (!weekDay || !weekDay.exercises.length)) {
        // 排过周计划、今天就是休息日——直说休息，别用「还没有训练清单」这种暗示漏排的说法。
        box.hidden = false;
        box.innerHTML = "<h3 class=\"plan-sub\">今天按本周安排是休息日</h3>"
          + "<p class=\"fine-print\">想练也可以临时排一份，不会改动本周安排。</p>"
          + "<div class=\"button-row\"><button type=\"button\" class=\"button subtle\" data-today-plan=\"ai\">临时用 AI 排今天</button>"
          + "<button type=\"button\" class=\"button subtle\" data-today-plan=\"week\">看本周安排</button></div>";
        return;
      }
      if (weekDay && weekDay.exercises.length) {
        const names = weekDay.exercises.map(item => item.name).slice(0, 4).join("、");
        box.hidden = false;
        box.innerHTML = "<h3 class=\"plan-sub\">本周计划今天 · " + esc(TRAINING_TEMPLATES[weekDay.template] || weekDay.template) + "</h3>"
          + "<p class=\"fine-print\">" + esc(names) + (weekDay.exercises.length > 4 ? " 等 " + weekDay.exercises.length + " 个动作" : "") + "</p>"
          + "<div class=\"button-row\"><button type=\"button\" class=\"button primary\" data-today-adopt>采纳到今日清单</button>"
          + "<button type=\"button\" class=\"button subtle\" data-today-plan=\"ai\">改用 AI 排今天</button></div>";
        return;
      }
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

  const WEEK_PLAN_KEY = week => "qingheng.weekPlan." + week;
  /** 指纹 = 偏好 + 每个动作最近一次的组/次/重量；任一项变才重算，避免回看时清单悄悄变。 */
  /** 指纹只关心影响排课的那几个输入；没有偏好时留空，仍能稳定比较。 */
  function prefsForPlan() {
    return typeof planPrefs === "function" ? planPrefs() : null;
  }
  function weekPlanFingerprint(prefs, lastByExercise, sessions) {
    const parts = [sessions, prefs ? prefs.days : "", prefs ? prefs.split : "", prefs ? prefs.gear : "", prefs ? prefs.minutes : ""];
    for (const name of Object.keys(lastByExercise || {}).sort()) {
      const row = lastByExercise[name];
      parts.push(name + ":" + row.sets + "x" + row.reps + "x" + row.weight);
    }
    const text = parts.join("|");
    let hash = 5381;
    for (let i = 0; i < text.length; i++) hash = ((hash << 5) + hash + text.charCodeAt(i)) | 0;
    return String(hash >>> 0);
  }
  function readWeekPlanCache(week) {
    try { const raw = localStorage.getItem(WEEK_PLAN_KEY(week)); return raw ? JSON.parse(raw) : null; } catch { return null; }
  }
  function writeWeekPlanCache(week, value) {
    try { localStorage.setItem(WEEK_PLAN_KEY(week), JSON.stringify(value)); } catch {}
  }
  let forceWeekPlan = false;
  /** 明确「重新生成」：清掉本周缓存并强制重算，偏好不变也能换一版。 */
  function regenerateWeekPlan() {
    const startDate = shiftDay(activeDate, 7 - weekdayIndex(activeDate));
    try { localStorage.removeItem(WEEK_PLAN_KEY(startDate)); } catch { }
    lastWeekPlan = null;
    forceWeekPlan = true;
    renderWeekPlan();
  }
  function renderWeekPlan() {
    const box = $('#week-plan'), tag = $('#week-plan-tag');
    if (!box) return;
    const loads = dailyLoads(28);
    const stats = acwrFromDailyLoads(loads, activeDate);
    const lastByExercise = recentExerciseBaselines(14);
    const sessions = Math.max(1, Math.min(6, Math.round(number(effectiveProfileForDate(activeDate).training) || 3)));
    const startDate = shiftDay(activeDate, 7 - weekdayIndex(activeDate));
    const fingerprint = weekPlanFingerprint(prefsForPlan(), lastByExercise, sessions);
    const cached = forceWeekPlan ? null : readWeekPlanCache(startDate);
    let plan, drifted = false;
    if (cached && cached.plan && cached.fingerprint === fingerprint) {
      plan = cached.plan; // 指纹没变：照用上次的结果，计划是被「约定」过的
    } else {
      plan = generateWeekPlan({startDate, sessions, lastByExercise, acwrFlag: stats ? stats.flag : 'ok'});
      drifted = !!(cached && cached.plan);
      if (plan) writeWeekPlanCache(startDate, {plan, fingerprint, savedAt: Date.now()});
    }
    forceWeekPlan = false;
    lastWeekPlan = plan;
    if (!plan) { box.innerHTML = empty('还没有足够的训练记录', '先记两周训练，计划会自动出来。', 'empty'); return; }
    if (tag) tag.textContent = plan.deload ? '减载周' : '负重 +2.5%';
    // "What do I train today": today's planned day, the next one, or what was already logged.
    const todayPlan = plan.days.find(day => day.date === activeDate);
    // 负荷：标签 + 数值 + 判定，不写成一句话。「急慢性比」第一次看不知道是谁比谁，改成「负荷比」+ 一行口径。
    const acwrHtml = (() => {
      if (!stats || !Number.isFinite(stats.ratio)) return '';
      const level = stats.flag === 'high' ? 'high' : stats.flag === 'low' ? 'low' : 'ok';
      const verdict = level === 'high' ? '偏高 · 本周减载' : level === 'low' ? '偏低 · 按记录安排' : '维持';
      return '<p class="plan-label">训练负荷</p><div class="plan-load is-' + level + '"><span class="plan-load-label">负荷比</span>'
        + '<span class="plan-load-value">' + stats.ratio.toFixed(2) + '</span>'
        + '<span class="plan-load-verdict">' + verdict + '</span></div>'
        + '<p class="fine-print">负荷比 = 近 7 天 ÷ 近 4 周平均负荷；0.8–1.3 为维持区。</p>';
    })();
    const suggestedNote = plan.days.some(day => day.suggested) ? '<p class="fine-print">带「建议」的动作来自训练库（该模板你还没有记录），先按 3 组建立基线。</p>' : '';
    // 依据与说明沉到默认折叠的 details 里：首屏只留数据。
    // 要点与理由都跟着「今天或下一个训练日」走：周计划第一天是周一，直接用 days[0] 会在休息日
    // 弹出与今天无关的提示，读起来像凭空冒出来的警告。
    const cueDay = plan.days.find(day => day.date === activeDate)
      || plan.days.find(day => day.date > activeDate)
      || plan.days[0];
    // 先回答「你排的那份清单为什么这么排」：AI 排的顺序带着它自己给的理由；
    // 没有 AI 清单时，才解释这一周按规则是怎么来的。
    const aiEntries = (() => {
      const wanted = [cueDay && cueDay.date, activeDate].filter(Boolean);
      for (const day of wanted) {
        const list = aiPlanEntries(day);
        if (list.length) return {day, list};
      }
      return null;
    })();
    const aiWhy = aiEntries
      ? '<p class="plan-why-lead">' + esc(aiEntries.day === activeDate ? '今天这份顺序' : aiEntries.day.slice(5) + ' 这份顺序')
        + '是用 AI 排的，它给的理由：</p>'
        + '<ol class="plan-why-ai">' + aiEntries.list.slice(0, 6).map(item =>
          '<li><b>' + esc(item.name) + '</b><span>' + esc(item.reason || '按训练库安排') + '</span></li>').join('') + '</ol>'
      : '';
    // 2026-11-17：要点与依据合成一块「这份计划怎么来的」，不再让用户读两处。
    const whyBody = aiWhy
      + '<p class="plan-why-lead">为什么这样排：' + (aiWhy ? '这一周的框架按训练库与你最近两周的记录生成。' : '这一周按训练库与你最近两周的记录生成。') + '</p>'
      + '<p>' + esc(plan.note) + '</p>'
      + (Array.isArray(plan.reasons) ? plan.reasons.map(reason =>
        '<p>' + esc(reason.text) + '</p>').join('') : '');
    // 要点跟着「今天或下一个训练日」走：优先按那天实际要做的动作点名给要点。
    const cues = (typeof libraryCuesFor === 'function' && cueDay) ? libraryCuesFor(cueDay) : [];
    const templateCues = !cues.length && (typeof libraryCues === 'function' && cueDay) ? libraryCues(cueDay.template) : [];
    const cueToday = !!(cueDay && cueDay.date === activeDate);
    const cueLabel = esc((cueToday ? "今天" : "下一个训练日") + "（" + (TRAINING_TEMPLATES[cueDay.template] || cueDay.template) + "）的动作要点");
    const cueBody = cues.length
      ? '<ul class="plan-cue-list">' + cues.map(cue =>
        '<li><b>' + esc(cue.name) + '</b><span class="plan-cue-text">' + annotateTerms(esc(cue.text)) + '</span></li>').join('') + '</ul>'
      : (templateCues.length
        ? annotateTerms('<p class="plan-cue">' + templateCues.map(cue => esc(cue)).join('；') + '</p>')
        : '');
    const explainHtml = '<details class="plan-why plan-cue-block"' + (cueToday ? ' open' : '') + '><summary>' + (cueBody ? cueLabel : '这份计划怎么来的') + '</summary>'
      + cueBody + whyBody + '</details>';
    // 本周安排：完全按用户偏好生成；没有偏好就不出方案。
    const planBox = $("#week-plan");
    if (planBox && !planBox.dataset.adoptWired) {
      planBox.dataset.adoptWired = "1";
      planBox.addEventListener("click", event => {
        const cell = event.target.closest("[data-week-day]");
        if (cell) {
          weekDetailDay = cell.dataset.weekDay || null;
          for (const node of planBox.querySelectorAll("[data-week-day]")) {
            const on = node.dataset.weekDay === weekDetailDay;
            node.classList.toggle("is-selected", on);
            node.setAttribute("aria-pressed", String(on));
          }
          const detail = $("#week-detail");
          if (detail) detail.textContent = weekDetailHtml(weekDetailDay, lastWeekPlan);
          return;
        }
        const button = event.target.closest("[data-adopt-today]");
        if (!button) return;
        adoptWeekDay();
      });
    }
    const prefs = planPrefs();
    // 收起/展开由 installPlanPrefs 统一管：这里别再强行显示，否则「修改」刚收起又会被撑开。
    let thisWeekHtml;
    if (!prefs) {
      thisWeekHtml = "<p class=\"muted\">先选一下训练偏好（频率 / 分化 / 器械 / 时长），再按它安排本周。</p>";
    } else {
      // 2026-11-11 晚（用户：美术效果优先于表格结构）：本周安排不再是一张 7 行表格，
      // 而是一条 7 格周条——训练日一根绿短线、已练实心、今天加深；点某格在下面换一行详情。
      // 周条画「计划所在的那一周」（startDate = 下一个周一），而不是今天所在的日历周：
      // 以前标题写「本周安排」、内容却是下周的计划，所以计划日一根线都画不出来。
      const weekStartPlan = startDate;
      const weekEndPlan = shiftDay(weekStartPlan, 7);
      const firstPlanDay = plan.days.length ? plan.days[0].date : activeDate;
      if (!weekDetailDay || weekDetailDay < weekStartPlan || weekDetailDay >= weekEndPlan) weekDetailDay = firstPlanDay;
      const cells = [];
      for (let offset = 0; offset < 7; offset++) {
        const day = shiftDay(weekStartPlan, offset);
        const planDay = plan.days.find(item => item.date === day) || null;
        const logged = exercisesFor(day).filter(item => item && item.name).length > 0;
        const isToday = day === activeDate;
        const selected = day === weekDetailDay;
        const dow = "日一二三四五六"[new Date(day + "T00:00:00").getDay()];
        const label = planDay ? (TRAINING_TEMPLATES[planDay.template] || planDay.template) : "休息";
        cells.push('<button type="button" class="week-cell'
          + (planDay ? " is-plan" : "") + (logged ? " is-done" : "") + (isToday ? " is-today" : "") + (selected ? " is-selected" : "")
          + '" data-week-day="' + day + '" aria-pressed="' + (selected ? "true" : "false") + '" aria-label="' + esc(day.slice(5)) + " " + esc(label) + '">'
          + '<span class="week-dow">' + dow + '</span>'
          + '<span class="week-num">' + esc(day.slice(8)) + '</span>'
          + '<span class="week-bar" aria-hidden="true"></span></button>');
      }
      thisWeekHtml = '<h3 class="plan-sub">下周安排 · ' + esc(weekStartPlan.slice(5)) + ' 起</h3>'
        + '<div class="week-strip" role="group" aria-label="下周训练安排，点一天看安排">' + cells.join("") + '</div>'
        + '<p class="week-detail" id="week-detail">' + weekDetailHtml(weekDetailDay, plan) + '</p>';
    }
    const driftHtml = drifted ? '<p class="fine-print">记录有更新，本周安排已按最新数据重算。</p>' : '';
    // 采纳入口：今天有安排且今日清单还空着时，一键把它变成今日清单——否则用户要自己把
    // 数据层里的安排重录一遍。已有 AI 清单时不出现：AI 排的优先级高于周计划。
    const hasTodayList = (() => { try { const raw = localStorage.getItem(AI_PLAN_KEY(activeDate)); const list = raw ? JSON.parse(raw) : null; return Array.isArray(list) && list.length > 0; } catch { return false; } })();
    const adoptHtml = (!hasTodayList && todayPlan && todayPlan.exercises.length)
      ? '<button type="button" class="button subtle full-width" data-adopt-today>把今天这节采纳到今日清单</button>'
      : '';
    box.innerHTML = annotateTerms(thisWeekHtml + explainHtml + acwrHtml + driftHtml + adoptHtml + suggestedNote);
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

  let dailyThreeEditing = '';
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
    const sleep = number(habit.sleep), weight = number(measurement.weight);
    const filled = [training !== '', sleep !== null, weight !== null].filter(Boolean).length;
    // 三样都记过就收成一列只读摘要：这张卡在首屏占地大，展开态最容易误触。
    let savedThisDay = false;
    try {savedThisDay = localStorage.getItem(DAILY_THREE_KEY(activeDate)) === '1';} catch {}
    const collapsed = (savedThisDay || filled === 3) && dailyThreeEditing !== activeDate;
    const body = $('#daily-three-body'), summary = $('#daily-three-summary');
    if (body) body.hidden = collapsed;
    if (summary) {
      summary.hidden = !collapsed;
      if (collapsed) {
        const rows = [
          ['训练', training === 'true' ? '已训练' : training === 'false' ? '休息' : '未记录'],
          ['睡眠', sleep === null ? '—' : `${fmt(sleep)} 小时`],
          ['体重', weight === null ? '—' : `${fmt(weight)} kg`]
        ];
        summary.innerHTML = rows.map(([label, value]) => `<div class="daily-three-row"><span>${label}</span><b>${esc(value)}</b></div>`).join('')
          + '<button type="button" class="text-button" data-daily-three-edit>修改</button>';
      }
    }
    if (tag) tag.textContent = filled === 0 ? '待记录' : filled === 3 ? '已记录三样' : `已记录 ${filled}/3`;
  }
  document.addEventListener('click', event => {
    const edit = event.target.closest?.('[data-daily-three-edit]');
    if (!edit) return;
    dailyThreeEditing = activeDate;
    renderDailyThree();
  });
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
  let adviceTicker = 0, adviceStartedAt = 0;
  function adviceBusy(container) {
    const count = readPreferences().length;
    container.innerHTML = '<div class="inline-busy"><span class="busy-ring" aria-hidden="true"></span>'
      + '<span class="inline-busy-text" data-advice-wait>正在读今天的记录…</span></div>'
      + `<p class="fine-print advice-pref-note">${count ? `已带上 ${count} 条偏好` : '在「我的 → 偏好与记忆」写一条，建议会更贴合你的习惯'}</p>`;
  }
  async function refreshAdvice() {
    const button=$('#refresh-advice'), container=$('#advice-content');
    button.disabled=true; container.removeAttribute('data-date');
    syncCalendarDay();
    const date=activeDate,useAI=externalConsent();
    adviceBusy(container);
    adviceStartedAt=Date.now();
    clearInterval(adviceTicker);
    adviceTicker=setInterval(() => {
      const line=container.querySelector('[data-advice-wait]');
      if (line) line.textContent=`正在读今天的记录…已等 ${Math.round((Date.now()-adviceStartedAt)/1000)}s`;
    },800);
    try {const relax=relaxDayInfoFor(date); const data=await api('/api/advice',{date,relaxDay:!!relax.relax,preferences:readPreferences(),...(useAI?{useAI:true,allowExternal:true}:{})}); if(date!==activeDate) return; if(!Array.isArray(data?.messages)) throw new Error('建议数据格式不正确。'); renderAdvice(data.messages,date);}
    catch(error) {
      // 模型不可用时退回本地建议：这张卡空着比给一条本地结论更糟。
      try {
        const local=await api('/api/advice',{date});
        if(date!==activeDate) return;
        if(Array.isArray(local?.messages) && local.messages.length) {renderAdvice(local.messages,date); container.dataset.fallback='1'; container.setAttribute('data-note','模型暂时不可用，以下是本地建议。'); return;}
      } catch {}
      container.textContent=error.message;
    }
    finally {clearInterval(adviceTicker); button.disabled=false;}
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
    $('#item-recalc-name').value = $('[data-item-field="name"]', row)?.value || '';
    $('#item-recalc-grams').value = grams;
    for (const key of nutritionKeys) {
      const input = $(`[data-item-field="${key}"]`, row), base = number(input?.dataset.baseValue);
    // 默认动作是按「名称 + 克重」请模型重算，所以每 100g 一律留空；只有用户主动填四项才走手算。
      $(`#item-recalc-${key}`).value = '';
    }
    $('#item-recalc-feedback').textContent = '';
    root.dataset.itemIndex = String($$('.estimate-item').indexOf(row));
    root.hidden = false;
    $('#item-recalc-name').focus();
    $('#item-recalc-name').select();
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
    $('#estimate-items').innerHTML=view.items.map(item => `<div class="estimate-item" data-base-grams="${Number(item.grams)}" data-oil="${Number(item.oilGrams)||0}"><div class="estimate-item-head"><label>食物名称<input data-item-field="name" value="${esc(item.name)}" maxlength="120" required></label><div class="estimate-item-actions"><button type="button" class="recalc-item" title="按克重和每 100g 数据重算" aria-label="按克重重算${esc(item.name)}"><span class="inline-icon" aria-hidden="true"><img src="./icon-refresh.svg" alt="" width="17" height="17"></span></button><button type="button" class="remove-item" title="移除这项" aria-label="移除${esc(item.name)}">×</button></div></div>${modelNote(item)}${number(item.oilGrams)>0?`<p class="fine-print estimate-item-oil">这道菜的用油 ${fmt(item.oilGrams,0)} g，已含在热量与脂肪里。</p>`:''}<div class="form-grid">${fields.map(([key,label]) => `<label>${label}<input data-item-field="${key}" type="number" value="${Number(item[key])}" ${key === 'grams' ? '' : `data-base-value="${Number(item[key])}"`} min="0" max="20000" step="0.01" required></label>`).join('')}</div></div>`).join('');
    $('#estimate-source').textContent=`${view.source==='api'?'外部模型':'本地估算'} · ${view.confidence==='medium'?'中等':'低'}置信度${restored?' · 已恢复未确认草稿':''}`;
    const uncertainty=number(view.uncertaintyPercent) ?? 15;
    draft.uncertaintyPercent=uncertainty; draft.oilGrams=number(view.oilGrams) ?? 0;
    // 用油按菜归属：模型的每道菜自己带 oilGrams，且已算进那道菜的热量；顶层数只用于展示。
    const itemsOil=(view.items||[]).reduce((sum,item)=>sum+(number(item.oilGrams)||0),0);
    const totalCalories=totalsFor(view.items).calories;
    const interval=`估算区间：约 ${fmt(totalCalories*(1-uncertainty/100),0)}–${fmt(totalCalories*(1+uncertainty/100),0)} kcal（±${fmt(uncertainty,0)}%）`;
    const oilNote=itemsOil>0
      ? `用油已按菜计入 ${fmt(itemsOil,0)} g（约 ${fmt(itemsOil*9,0)} kcal），已含在各菜的热量与脂肪里，不用再单独加`
      : draft.oilGrams>0
        ? `已计入烹调用油 ${fmt(draft.oilGrams,0)} g（约 ${fmt(draft.oilGrams*9,0)} kcal）`
        : '照片看不到锅底积油；红烧、干煸这类已按方法取中位值，清蒸白灼按 0 计';
    const lowNote='识别结果可能有偏差，请核对份量与克重；不确定的项按常见份量取中位值即可，不必刻意往高报。';
    $('#estimate-notes').innerHTML=[interval,oilNote,lowNote].concat(Array.isArray(view.notes)?view.notes:[]).map(note=>`<li>${esc(note)}</li>`).join('');
    $('#estimate-name').value=view.name || view.items.map(item=>item.name).join('、').slice(0,120);
    $('#estimate-preview').hidden=false;
    feedback($('#preview-feedback'), restored?'已恢复未确认的估算，请核对日期与克重后确认保存。':'请检查数据后确认保存。');
    updatePreviewTotals();
    $('#estimate-preview').scrollIntoView({block:'nearest',behavior:'auto'});
  }

/**
 * 体检格图标：文字已经够多，用图标替代那个无意义的灰点（2026-10-29）。
 * 只映射已有资源，不新增文件；未知指标回退成空，保持排版不塌。
 */
function metricIcon(label) {
  // 取自 Lucide（MIT）：蛋白用鸡腿、脂肪用水滴，两类轮廓差异最大；其余同样 24 网格、1.7 描边。
  const glyphs = {
    热量: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3q1 4 4 6.5t3 5.5a1 1 0 0 1-14 0 5 5 0 0 1 1-3 1 1 0 0 0 5 0c0-2-1.5-3-1.5-5q0-2 2.5-4" /><circle cx="12" cy="16.6" r="1" fill="currentColor" stroke="none" /></svg>',
    蛋白质: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15.4 15.63a7.875 6 135 1 1 6.23-6.23 4.5 3.43 135 0 0-6.23 6.23" /><path d="m8.29 12.71-2.6 2.6a2.5 2.5 0 1 0-1.65 4.65A2.5 2.5 0 1 0 8.7 18.3l2.59-2.59" /><circle cx="18.2" cy="6.4" r="1" fill="currentColor" stroke="none" /></svg>',
    脂肪: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z" /><circle cx="10.6" cy="16.2" r="1" fill="currentColor" stroke="none" /></svg>',
    碳水: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 22 16 8" /><path d="M3.47 12.53 5 11l1.53 1.53a3.5 3.5 0 0 1 0 4.94L5 19l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z" /><path d="M7.47 8.53 9 7l1.53 1.53a3.5 3.5 0 0 1 0 4.94L9 15l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z" /><path d="M11.47 4.53 13 3l1.53 1.53a3.5 3.5 0 0 1 0 4.94L13 11l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z" /><path d="M20 2h2v2a4 4 0 0 1-4 4h-2V6a4 4 0 0 1 4-4Z" /><path d="M11.47 17.47 13 19l-1.53 1.53a3.5 3.5 0 0 1-4.94 0L5 19l1.53-1.53a3.5 3.5 0 0 1 4.94 0Z" /><path d="M15.47 13.47 17 15l-1.53 1.53a3.5 3.5 0 0 1-4.94 0L9 15l1.53-1.53a3.5 3.5 0 0 1 4.94 0Z" /><path d="M19.47 9.47 21 11l-1.53 1.53a3.5 3.5 0 0 1-4.94 0L13 11l1.53-1.53a3.5 3.5 0 0 1 4.94 0Z" /></svg>',
    训练: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17.596 12.768a2 2 0 1 0 2.829-2.829l-1.768-1.767a2 2 0 0 0 2.828-2.829l-2.828-2.828a2 2 0 0 0-2.829 2.828l-1.767-1.768a2 2 0 1 0-2.829 2.829z" /><path d="m2.5 21.5 1.4-1.4" /><path d="m20.1 3.9 1.4-1.4" /><path d="M5.343 21.485a2 2 0 1 0 2.829-2.828l1.767 1.768a2 2 0 1 0 2.829-2.829l-6.364-6.364a2 2 0 1 0-2.829 2.829l1.768 1.767a2 2 0 0 0-2.828 2.829z" /><path d="m9.6 14.4 4.8-4.8" /></svg>',
    睡眠: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 5h4" /><circle cx="16.6" cy="16.4" r="1" fill="currentColor" stroke="none" /><path d="M20 3v4" /><path d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401" /></svg>',
    饮水: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5.116 4.104A1 1 0 0 1 6.11 3h11.78a1 1 0 0 1 .994 1.105L17.19 20.21A2 2 0 0 1 15.2 22H8.8a2 2 0 0 1-2-1.79z" /><path d="M6 12a5 5 0 0 1 6 0 5 5 0 0 0 6 0" /></svg>'
  };
  const markup = glyphs[label];
  return markup ? `<span class="metric-glyph">${markup}</span>` : '';
}
