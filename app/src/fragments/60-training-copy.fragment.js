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
    const isMeal = draft.kind === 'meal';
    // 问答框里的一句话可能落在六类记录上，标题跟着品类走（写入仍由 applyDraft 按 kind 分流）。
    const title = '识别到' + (DRAFT_KINDS[draft.kind] || '记录') + (isMeal || draft.kind === 'training' ? '草稿' : '记录');
    const missing = isMeal
      ? '<p class="fine-print">会带入现有餐食表单；生成估算预览并确认后才会写入，不会直接落库。</p>'
      : draft.kind === 'training'
        ? draft.missing.length
          ? '<p class="fine-print">还缺：' + esc(draft.missing.join('、')) + '。可以先写入，稍后在训练日志里补；也可以点「补充信息」再改这句描述。</p>'
          : '<p class="fine-print">信息齐全，确认后会写入当天的训练记录。</p>'
        : '<p class="fine-print">确认后会写入当天的记录；写错了可以在卡片上撤销。</p>';
    box.hidden = false;
    box.innerHTML = `<div class="card training-draft"><div class="card-heading"><h2>${title}</h2><span class="tag">待确认</span></div>`
      + `<p><strong>${esc(draft.date)}</strong> · ${esc(draftSummary(draft))}</p>` + missing
      + `<div class="button-row"><button type="button" class="button primary" data-draft-confirm="1">${isMeal ? '去确认餐食' : '写入记录'}</button>`
      + `<button type="button" class="button subtle" data-draft-cancel="1">取消</button></div></div>`;
  }

  const PLATEAU_SPAN_KG = 0.2;

  const DRAFT_KINDS = {training: '训练', weight: '体重', sleep: '睡眠', steps: '步数', water: '饮水', plan: '计划', meal: '餐食'};

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

  /**
   * A finished meal sentence becomes a handoff draft, never a stored meal. The existing estimate
   * form is the only writer, so the user still sees calories, grams and a confirmation step.
   */
  function parseMealDraft(text, baseDate) {
    const raw = String(text || '').trim();
    if (!raw) return null;
    // 提问/咨询句不是记录：「今天吃了鸡胸肉，还要补多少蛋白？」曾被误判成餐食草稿。
    if (/[?？]|吗|什么|怎么|该不该|要不要|建议|打算|计划|准备|还要|多少|够不够|够吗|超没超|行不行|能不能|可以吗/.test(raw)) return null;
    if (!/(吃了|喝了|吃过|喝过|早餐|早饭|午餐|午饭|晚餐|晚饭|加餐|夜宵|零食)/.test(raw)) return null;
    if (/(训练|卧推|深蹲|硬拉|跑步|体重|称重|睡眠|步数|饮水|kg|公斤)/.test(raw)) return null;
    const pad2 = n => String(n).padStart(2, '0');
    const shift = (day, delta) => {
      const [y, m, d] = String(day).split('-').map(Number);
      const date = new Date(y, m - 1, d + delta);
      return date.getFullYear() + '-' + pad2(date.getMonth() + 1) + '-' + pad2(date.getDate());
    };
    const safeBase = /^\d{4}-\d{2}-\d{2}$/.test(String(baseDate || '')) ? baseDate : new Date().toISOString().slice(0, 10);
    let date = safeBase;
    const explicit = raw.match(/(\d{4})[\-\/](\d{1,2})[\-\/](\d{1,2})/) || raw.match(/(\d{1,2})月(\d{1,2})[日号]?/);
    if (explicit) {
      const year = explicit[3] ? Number(explicit[1]) : Number(safeBase.slice(0, 4));
      const month = explicit[3] ? Number(explicit[2]) : Number(explicit[1]);
      const day = explicit[3] ? Number(explicit[3]) : Number(explicit[2]);
      if (month >= 1 && month <= 12 && day >= 1 && day <= 31) date = year + '-' + pad2(month) + '-' + pad2(day);
    } else if (/大前天/.test(raw)) date = shift(safeBase, -3);
    else if (/前天/.test(raw)) date = shift(safeBase, -2);
    else if (/昨天|昨晚|昨日/.test(raw)) date = shift(safeBase, -1);
    const mealType = /早餐|早饭/.test(raw) ? 'breakfast'
      : /午餐|午饭/.test(raw) ? 'lunch'
        : /晚餐|晚饭/.test(raw) ? 'dinner'
          : /加餐|夜宵|零食/.test(raw) ? 'snack' : '';
    return {kind: 'meal', date, rows: [{label: '餐食', value: raw}], missing: [], payload: {text: raw, mealType}};
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
    // 未测算时区块仍有「热量」这一条，但不评分：占位区间不能当成目标（否则只记一餐也会被
    // 2150~2350 的兜底值判超量/不足）。
    const rangeKnown = !!(range && !range.unset && Number.isFinite(range.min) && Number.isFinite(range.max));
    if (range && Number.isFinite(range.min) && Number.isFinite(range.max)) {
      const distance = sum.calories < range.min ? range.min - sum.calories : sum.calories > range.max ? sum.calories - range.max : 0;
      // 按偏离目标的百分比给分：≤3% 满分，5% 0.9，10% 0.75，20% 0.5，35% 0.25，再远 0。
      const reference = Math.max(1, sum.calories > range.max ? range.max : range.min);
      const deviation = distance / reference;
      const calScore = deviation === 0 ? 1 : deviation <= 0.03 ? 1 : deviation <= 0.05 ? 0.9 : deviation <= 0.1 ? 0.75 : deviation <= 0.2 ? 0.5 : deviation <= 0.35 ? 0.25 : 0;
      items.push({key: 'calories', label: '热量', value: Math.round(sum.calories), target: range.min + '~' + range.max,
        weight: DAILY_CHECK_WEIGHTS.calories, evaluated: hasMeals && rangeKnown,
        ok: rangeKnown && distance === 0, score: calScore,
        state: rangeKnown ? (relax || !hasMeals ? 'idle' : (sum.calories < range.min ? 'low' : sum.calories > range.max ? 'high' : undefined)) : 'idle'});
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
    // 一句评价（2026-11-18）：结论 → 差在哪 → 一个动作，合成一句。原来是「评价」一行、
    // 「今天优先」再一行，两行说同一件事，动作句里的数字还与评价重复。
    // 用「明显偏了」这类判断词是要避免的；只报数值和动作。
    const band = score === null ? '' : score >= 85 ? '今天整体到位' : score >= 70 ? '今天整体还不错' : score >= 50 ? '今天有几项没跟上' : '今天缺口比较大';
    const gapOf = item => {
      if (item.key === 'calories' && range) return item.value < range.min
        ? `热量还差 ${Math.round(range.min - item.value)} kcal`
        : `热量超了 ${Math.round(item.value - range.max)} kcal`;
      if (item.key === 'protein') return `蛋白还差 ${Math.max(0, Math.round((src.proteinMin || 0) - item.value))} g`;
      if (item.key === 'fat') return item.value > (src.fatMax || 0)
        ? `脂肪超了 ${Math.round(item.value - (src.fatMax || 0))} g`
        : `脂肪少了 ${Math.round((src.fatMin || 0) - item.value)} g`;
      if (item.key === 'sleep') return `睡眠只有 ${item.value}`;
      return `${item.label}还差一点`;
    };
    const good = scored.filter(item => item.ok).map(item => item.label);
    const goodPart = good.length ? `${good.slice(0, 2).join('和')}在区间内` : '还没有一项完全在区间内';
    // 动作按「哪一项 + 偏哪边」取：热量低和热量高要的是相反的动作。
    const STEP_TEXT = {
      'calories:high': '晚餐只吃蛋白和蔬菜',
      'calories:low': '加一份主食配一个蛋白来源',
      'protein:low': '下一餐先吃一份蛋白质',
      'fat:high': '之后改白灼或清蒸',
      'fat:low': '补一点坚果或食用油',
      'sleep:any': '今天训练别加组'
    };
    let action = '今天的记录都在区间内，保持就好。';
    if (worst) {
      const proteinGap = Math.max(0, Math.round((src.proteinMin || 0) - sum.protein));
      if (worst.key === 'calories' && range && sum.calories > range.max) action = '热量超上限 ' + Math.round(sum.calories - range.max) + ' kcal：晚餐只吃蛋白 + 蔬菜，不再加主食。';
      else if (worst.key === 'calories' && range && sum.calories < range.min) action = '还差 ' + Math.round(range.min - sum.calories) + ' kcal：加一份主食配一个蛋白来源。';
      else if (worst.key === 'protein') action = '优先补蛋白：还差 ' + proteinGap + ' g，下一餐先吃蛋白质。';
      else if (worst.key === 'fat' && src.fatMax) action = '脂肪超 ' + Math.round(Math.max(0, sum.fat - src.fatMax)) + ' g：之后改白灼/清蒸，少油。';
      else if (worst.key === 'sleep') action = '睡眠 ' + (worst.value === '未记录' ? '没记录' : worst.value) + '：今天训练强度降 10%，别加组。';
    }
    let verdict;
    if (relax) {
      // 放松日的动作单独留给 localCoachLine（问一句时的本地方案），页面上只显示合并后的那一句。
      action = '明后两天照常吃就行，不要用少吃或加练去「补回来」——那样更容易在周末反弹。';
      verdict = '今天是本周的放松日：吃多一点属于计划内，明后两天照常吃，不用少吃或加练补回来。';
    }
    else if (score === null) verdict = range && range.unset
      ? '还没有可用的目标区间：到「我的 → 身体档案与目标」补齐性别、身高、体重与年龄。'
      : '还没有可评的记录：先记一餐和睡眠，我再帮你算。';
    else if (worst && !worst.ok) verdict = `${band} · ${gapOf(worst)}，${STEP_TEXT[`${worst.key}:${worst.state || 'any'}`] || '先补这一项'}。`;
    else verdict = `${band} · ${goodPart}，保持就好。`;
    return {items, worst, best, action, verdict, score, coverage, relax, weights: DAILY_CHECK_WEIGHTS, totals: {calories: Math.round(sum.calories), protein: Math.round(sum.protein), fat: Math.round(sum.fat), carbs: Math.round(sum.carbs)}};
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
    return {weeks: 3, span: Math.round(span * 100) / 100, plateau: span < PLATEAU_SPAN_KG,
      from: last3[0].week, to: last3[2].week, mean: last3[2].mean};
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
  /** Weekly mean weights, oldest first, for plateau detection. */
  function weeklyWeightMeans() {
    const byWeek = new Map();
    for (const row of (state.measurements || [])) {
      if (!row || !validDate(row.date)) continue;
      // 未来日期的体重（错录/补记）不能进平台期：看的是截至 activeDate 的历史。
      if (row.date > activeDate) continue;
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
    // 「今天」只留给日历上的今天：周条已经能切到别的一天，这里再无条件写「今天」就会自相矛盾。
    const prefix = (day === localDate() ? '今天' : day.slice(5)) + ' · ';
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
      // 「建议」跟着走进周条详情：这些动作来自训练库（那天还没有记录），别让用户以为是自己的历史。
      const hint = planDay.suggested ? '（训练库建议）' : '';
      return prefix + label + hint + (names ? ' · ' + names + (all.length > 3 ? ' 等 ' + all.length + ' 个' : '') : ' · 动作待定');
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
    // 放松日是当日免除超标扣分的唯一依据：漏传它会让「本周 1/1 放松日」只在文案里存在。
    const relaxInfo = typeof relaxDayInfoFor === 'function' ? relaxDayInfoFor(activeDate) : {relax: false};
    const check = dailyCheck({meals, habit, range, relax: relaxInfo.relax === true,
      proteinMin: number(profile.proteinMin), proteinMax: number(profile.proteinMax),
      fatMin: number(profile.fatMin), fatMax: number(profile.fatMax)});
    if (tag) {
      tag.textContent = check.relax ? '放松日 · 本周 1/1' : range.unset ? '未测算' : check.score === null ? '待记录' : check.score + ' 分';
      tag.classList.toggle('is-relax', !!check.relax);
    }
    // 2026-11-22：四根竖条改成一行横向胶囊（名称 + 3px 细条），纵向占用约减一半。
    box.innerHTML = '<div class="check-caps" role="img" aria-label="今日体检四项完成度">' + check.items.map(item => {
      const level = check.relax ? 'idle' : !item.evaluated ? 'idle' : item.ok || item.score >= 0.95 ? 'ok' : item.score >= 0.6 ? 'near' : 'off';
      const pct = level === 'idle' ? 0 : Math.max(6, Math.round(Math.max(0, Math.min(1, item.score ?? 0)) * 100));
      return `<div class="check-cap ${level}"><span class="check-cap-name">${esc(item.label)}</span>`
        + `<span class="check-cap-track"><span class="check-cap-fill" style="width:${pct}%"></span></span></div>`;
    }).join('') + '</div>'
      + '<div hidden>' + `<p class="check-verdict">${esc(check.verdict)}</p>` + '</div>';
    // 结论不再单独占一行：并进状态胶囊，和热量/宏量提示按优先级轮播。
    TODAY_SIGNALS.check = check.verdict || '';
    if (typeof renderTodayAction === 'function') renderTodayAction();
    // 首屏只有一条行动行（#today-action）；体检只报状态，不再各给一条「该做什么」。
    // 2026-11-24：删掉体检里那颗「补睡眠」快捷——睡眠在正下方的小习惯格里就是同一个跳转，
    // 同一屏两处入口属于重复；"睡眠未记" 已经由睡眠那根 0% 的胶囊说清。
    box.querySelectorAll('.check-fix').forEach(button => {
      button.dataset.goBound = '1';
      button.addEventListener('click', () => {
        if (button.dataset.focus) setTimeout(() => revealField(button.dataset.focus), 160);
      });
    });
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
    // 器械默认「综合」：不限单一器材，交给模型混用。
    const markSaved = saved => {
      mark("days", saved && saved.days ? saved.days : 3);
      mark("split", (saved && saved.split) || "ppl");
      mark("gear", (saved && saved.gear) || "mixed");
      mark("minutes", (saved && saved.minutes) || 45);
    };
    markSaved(planPrefs());
    const summary = $("#plan-prefs-summary"), edit = $("#pref-edit");
    const regen = $("#pref-regen"), save = $("#pref-save"), requestBox = $("#plan-request");
    // 训练要求跟着偏好一起存：换手机、切日期都还在；取消编辑时也要还原成已保存的那句。
    const readRequest = () => String((requestBox && requestBox.value) || "").trim().slice(0, 200);
    const paintRequest = () => {
      if (requestBox) requestBox.value = String((planPrefs() || {}).request || "");
    };
    paintRequest();
    // 摘要跟着 chips 走：展开改选项时上方摘要也换成新值，收起时才不会「看着没变」。
    const paintSummary = () => {
      const saved = planPrefs();
      if (!summary) return;
      if (!saved) { summary.hidden = true; summary.textContent = ""; return; }
      summary.textContent = planPrefsSummary({
        days: Number(read("days")) || saved.days,
        split: read("split") || saved.split,
        gear: read("gear") || saved.gear,
        minutes: Number(read("minutes")) || saved.minutes
      });
    };
    /** 收起 = 放弃这次改动：chips 与要求都回到已保存的偏好。 */
    const restoreSaved = () => {
      markSaved(planPrefs());
      paintRequest();
      paintSummary();
    };
    for (const name of ["days", "split", "gear", "minutes"]) {
      chipsOf(name).forEach(chip => {
        if (chip.dataset.wired) return;
        chip.dataset.wired = "1";
        chip.addEventListener("click", () => { mark(name, chip.dataset.value); paintSummary(); });
      });
    }
    // 收起时是一行摘要 + 两个动作；展开后同一位置变成「取消」——不再出现「点进来就出不去」。
    const setCollapsed = collapsed => {
      box.hidden = collapsed;
      const has = !!planPrefs();
      if (summary) { summary.hidden = !has; paintSummary(); }
      if (edit) {
        edit.hidden = !has;
        edit.textContent = collapsed ? "改偏好" : "取消";
        edit.setAttribute("aria-expanded", String(!collapsed));
        edit.setAttribute("aria-label", collapsed ? "改训练偏好" : "取消训练偏好编辑，改动不保存");
        edit.setAttribute("title", collapsed ? "改频率 / 分化 / 器械 / 时长" : "取消编辑，改动不保存");
      }
      // 「换一套」只在收起时出现：展开时它和「生成本周计划」太像，会分不清。
      // 全身模板每天一样，轮换不出新排法，此时干脆不显示这个按钮。
      if (regen) regen.hidden = !has || !collapsed || String((planPrefs() || {}).split) === "fb";
    };
    setCollapsed(!!planPrefs());
    if (edit && !edit.dataset.wired) {
      edit.dataset.wired = "1";
      edit.addEventListener("click", () => {
        if (box.hidden) {
          setCollapsed(false);
          // preventScroll：展开时卡片会变高，再把焦点抢到第一排按钮会把整页往上顶，
          // 用户刚点的位置就跑了（2026-11-23 真机复验踩到）。焦点给键盘用户，但别动滚动位置。
          const first = $("#plan-prefs .pref-chip");
          if (first) first.focus({preventScroll: true});
          return;
        }
        // 没点「保存」就收起，等于放弃改动：先把 chips 还原到已保存的偏好。
        restoreSaved();
        setCollapsed(true);
      });
    }
    if (regen && !regen.dataset.wired) {
      regen.dataset.wired = "1";
      regen.addEventListener("click", () => {
        regenerateWeekPlan({vary: true});
        const split = (planPrefs() || {}).split;
        const label = {push: "推", pull: "拉", legs: "腿", upper: "上肢", lower: "下肢", full: "全身"}[nextStartTemplate(split, weekVariation)] || "";
        notice("已换一套：本周从「" + label + "日」起排，之后的日期跟着轮换。偏好没变。");
      });
    }
    if (save && !save.dataset.wired) {
      save.dataset.wired = "1";
      save.addEventListener("click", async () => {
        const prefs = {
          days: Number(read("days")) || 3,
          split: read("split") || "ppl",
          gear: read("gear") || "mixed",
          minutes: Number(read("minutes")) || 45,
          request: readRequest()
        };
        savePlanPrefs(prefs);
        // 保存偏好与生成本周安排是同一次动作：以前指纹没变就复用缓存，看起来像「点了没反应」。
        regenerateWeekPlan({fresh: true});
        setCollapsed(true);
        // 2026-11-24：生成不再只弹一句 toast——先给一屏「这周这样排」，把参数怎么落地说清再收工。
        const more = await showCoachSummary(prefs, lastWeekPlan);
        if (more) openPlanSheet();
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
    const weekStart = planStartDate();
    let plan = (lastWeekPlan && lastWeekPlan.days) ? lastWeekPlan : null;
    if (!plan) {
      const cached = readWeekPlanCache(weekStart);
      plan = cached && cached.plan ? cached.plan : null;
    }
    if (!plan) {
      try {
        const baselines = recentExerciseBaselines(14);
        const pref = prefsForPlan() || {};
        const sessions = Math.max(1, Math.min(6, Math.round(number(pref.days) || number(effectiveProfileForDate(activeDate).training) || 3)));
        const flag = (acwrFromDailyLoads(dailyLoads(28), activeDate) || {}).flag || "ok";
        plan = generateWeekPlan({startDate: weekStart, sessions, lastByExercise: baselines, acwrFlag: flag,
          goal: (state.profile || {}).goal, split: pref.split, gear: pref.gear, minutes: pref.minutes,
          request: pref.request, startTemplate: typeof nextStartTemplate === "function" ? nextStartTemplate(pref.split) : ""});
        if (plan) writeWeekPlanCache(weekStart, {plan, fingerprint: weekPlanFingerprint(prefsForPlan(), baselines, sessions), savedAt: Date.now()});
      } catch { plan = null; }
    }
    return {hasPlan: !!(plan && plan.days), day: plan && plan.days ? plan.days.find(item => item.date === activeDate) || null : null};
  }
  /** 本周计划里「今天」那一节：与 weekPlanToday 共用同一个来源，不再各算一遍。 */
  function weekTodaySession() {
    return weekPlanToday().day;
  }
  /** 今天页只读已有缓存，不为了显示「今天该练」临时生成一份新计划。 */
  function cachedWeekPlan() {
    const cached = readWeekPlanCache(planStartDate());
    return cached && cached.plan && Array.isArray(cached.plan.days) ? cached.plan : null;
  }
  /**
   * 今天页的单一行动模型：只读、无网络、无写库。最多一个 primary 加两个 secondary。
   * 休息/未记录/不训练都不在这里被当成「漏练」；计划只来自已存在的周计划缓存。
   */
  function buildTodayAgenda(input) {
    const src = input || {};
    const meals = Array.isArray(src.meals) ? src.meals : [];
    const aiPlan = Array.isArray(src.aiPlan) ? src.aiPlan : [];
    const trainingState = trainingStateFor({
      exercises: src.exercises,
      habitTraining: src.habitTraining,
      profileTraining: src.profileTraining,
      hasPlan: src.hasPlan,
      planDay: src.planDay
    });
    const secondary = [];
    const addSecondary = item => {
      if (!item || secondary.length >= 2) return;
      if (secondary.some(row => row.id === item.id)) return;
      secondary.push(item);
    };
    let primary = null;

    if (src.isToday === false) {
      if (!meals.length) {
        primary = {
          id: 'meal', kind: 'meal', label: '补记一餐', target: 'meal-text',
          mealSlot: src.mealSlot || 'lunch', reason: '这一天还没有餐食记录'
        };
      }
      if (src.sleepMissing) addSecondary({id: 'sleep', kind: 'sleep', label: '补睡眠', target: 'habit-sleep'});
      if (src.weightMissing) addSecondary({id: 'weight', kind: 'weight', label: '补体重', target: 'measurement-weight'});
      return {primary, secondary, state: trainingState};
    }

    const trainingAvailable = trainingState !== 'disabled';
    if (trainingAvailable) {
      const pending = aiPlan.filter(item => item && !item.done);
      if (pending.length) {
        const started = aiPlan.some(item => item && item.done);
        primary = {
          id: 'training-next', kind: 'training',
          label: started ? '继续今天的训练' : '按今天的顺序开始训练',
          target: 'ai-plan', reason: `${pending.length} 个动作还没完成`
        };
      }
    }

    const missing = Array.isArray(src.missingMeals) ? src.missingMeals : [];
    if (!primary && missing.length) {
      const names = missing.map(item => item.label).join('、');
      primary = {
        id: 'meal-missing', kind: 'meal', label: `补记${names}`,
        target: 'meal-text', mealSlot: missing[0].key, reason: '按现在的时段还没有看到记录'
      };
    }
    if (!primary && trainingAvailable && trainingState === 'planned') {
      primary = {
        id: 'training-plan', kind: 'training', label: '记录今天的训练',
        target: 'training-form', reason: '今天有安排，还没有动作记录'
      };
    }
    if (!primary && !meals.length) {
      primary = {
        id: 'meal-first', kind: 'meal', label: '记下今天的一餐',
        target: 'meal-text', mealSlot: src.mealSlot || 'lunch', reason: '今天还没有餐食记录'
      };
    }
    if (!primary && src.proteinGap > 0) {
      primary = {
        id: 'protein-gap', kind: 'meal',
        label: `下一餐补蛋白（还差 ${Math.round(src.proteinGap)} g）`,
        target: 'meal-text', mealSlot: src.mealSlot || 'lunch',
        reason: '蛋白质还没到目标'
      };
    }

    if (src.sleepMissing) addSecondary({id: 'sleep', kind: 'sleep', label: '补睡眠', target: 'habit-sleep'});
    if (src.weightMissing) addSecondary({id: 'weight', kind: 'weight', label: '补体重', target: 'measurement-weight'});
    return {primary, secondary, state: trainingState};
  }
  /** Current-page adapter: gathers state, cache and today's clock for the pure builder. */
  function todayAgendaState() {
    const today = localDate();
    const plan = cachedWeekPlan();
    const planDay = plan && Array.isArray(plan.days) ? plan.days.find(item => item && item.date === activeDate) || null : null;
    const habit = habitRowFor(activeDate) || {};
    const exercises = exercisesFor(activeDate);
    const meals = (state && Array.isArray(state.meals) ? state.meals : []).filter(row => row && row.date === activeDate);
    const measurement = measurementRowFor(activeDate) || {};
    const profile = effectiveProfileForDate(activeDate);
    const totals = totalsFor(meals);
    const proteinMin = number(profile.proteinMin);
    const protein = number(totals.protein);
    const proteinGap = proteinMin !== null && protein !== null && protein < proteinMin ? Math.round((proteinMin - protein) * 10) / 10 : 0;
    const currentMealSlot = typeof defaultMealTypeFor === 'function' ? defaultMealTypeFor(nowClock()) : 'lunch';
    let aiPlan = [];
    if (activeDate === today && typeof aiPlanStore === 'function') {
      try {aiPlan = aiPlanStore(activeDate) || [];} catch {aiPlan = [];}
    }
    return buildTodayAgenda({
      isToday: activeDate === today,
      meals, exercises,
      habitTraining: habit.training,
      profileTraining: state && state.profile ? state.profile.training : '',
      hasPlan: !!plan,
      planDay,
      missingMeals: activeDate === today ? missingMealSlots(activeDate, new Date()) : [],
      aiPlan,
      mealSlot: currentMealSlot,
      sleepMissing: number(habit.sleep) === null,
      weightMissing: number(measurement.weight) === null,
      proteinGap
    });
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
      name: String(item.name || "").slice(0, 60),
      sets: number(item.sets) > 0 ? number(item.sets) : 0,
      reps: number(item.reps) > 0 ? number(item.reps) : 0,
      weight: number(item.weight) > 0 ? number(item.weight) : null,
      ...(item.weightApprox ? {weightApprox: true} : {}),
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
          if (!plan[index]) return;
          // 勾选即记录（1.5.21）走 togglePlanDone 的唯一入口：它会写一条训练记录、回写 done、重绘表单。
          // 2026-11-23 Phase 2 修：这里曾直接改 aiPlanStore 绕过了写库，勾了却什么都没记上。
          Promise.resolve(typeof togglePlanDone === "function" ? togglePlanDone(index, done.checked) : null)
            .then(() => renderAdviceOrder())
            .catch(error => {
              // 写库失败：把勾选框退回原状态，不留半条记录。
              done.checked = !done.checked;
              renderAdviceOrder();
              if (typeof notice === "function") notice(error && error.message ? error.message : "这次没记上，请重试。", true);
            });
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
            if (!externalConsent()) { notice("请先到「我的 → 数据与关于」开启外部模型授权。"); return; }
            askAiPlan(jump);
            return;
          }
          // 本周安排长在「训练」分段里：先切分段，再等卡片真的渲染出来再滚。
          // 原来只 switchTab + 80ms 后 scrollIntoView，记录页此刻还停在饮食分段，滚动打空。
          // 2026-11-27：#ai-plan 卡片 11-22 已删除，AI 清单直接播进执行区，跳转目标改为 #training-log。
          const wantAi = jump.dataset.todayPlan === "ai";
          switchTab("records", true);
          const jumpToPlan = (attempt = 0) => {
            if (typeof switchRecordPanel === "function") switchRecordPanel("training");
            const target = $(wantAi ? "#training-log" : "#week-plan-card");
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
          + "<div class=\"button-row\"><button type=\"button\" class=\"button primary\" data-today-adopt>把今天加入清单</button></div>";
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

  /* ── 动作重量：本地记忆 + 首练推断 + 渐进（2026-11-19，1.4.44）──────────────────
     「用 AI 排今天」曾经只有第一个动作有 kg：模型被要求「不确定就留空」，客户端也只在
     14 天内找到同名记录才补。现在三层兜底——记忆（含历史种子）→ 同族迁移 → 体重比例起步值；
     重量同时写进 localStorage 的 qingheng.exerciseWeights，下次直接用并按上次表现渐进。 */

  const WEEK_PLAN_KEY = week => "qingheng.weekPlan." + week;
  /** 指纹 = 偏好 + 每个动作最近一次的组/次/重量；任一项变才重算，避免回看时清单悄悄变。 */
  /** 指纹只关心影响排课的那几个输入；没有偏好时留空，仍能稳定比较。 */
  function prefsForPlan() {
    return typeof planPrefs === "function" ? planPrefs() : null;
  }
  function weekPlanFingerprint(prefs, lastByExercise, sessions) {
    const parts = [sessions, prefs ? prefs.days : "", prefs ? prefs.split : "", prefs ? prefs.gear : "", prefs ? prefs.minutes : "", prefs ? prefs.request : ""];
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
  /** 「换一套」的轮换量：同偏好再排一版时把起始部位往前推，生成器本身是确定性的。 */
  let weekVariation = 0;
  /** 这一次重排要不要播「重算完成」的动效（只在用户主动生成/换一套时置位）。 */
  let planFresh = false;
  /** 七天窗口的起点：就是正在看的这一天，不再跳到下周一。 */
  function planStartDate() {
    return validDate(activeDate) ? activeDate : localDate();
  }
  /**
   * 「那天该练哪一类」的唯一来源：本周安排（周计划）里当天的 template。
   * 排今天的提示词与问答的训练建议都读这一处，两边才不会一边排推、一边建议练腿。
   */
  function dayTemplateSlot(date = activeDate) {
    const cache = readWeekPlanCache(planStartDate());
    const days = cache && cache.plan && Array.isArray(cache.plan.days) ? cache.plan.days : [];
    return days.find(day => day && day.date === date) || null;
  }
  /** 所看那天的名字：日历上的今天写「今天」，其余写 MM-DD。 */
  function dayLabel(date = activeDate) {
    return date === localDate() ? "今天" : String(date || "").slice(5);
  }
  /** 喂给两个 AI 入口的同一句话；没有周计划就直接给空串，不编一个部位出来。 */
  function dayTemplateNote(date = activeDate) {
    const slot = dayTemplateSlot(date);
    if (!slot || !slot.template) return "";
    const label = TRAINING_TEMPLATES[slot.template] || slot.template;
    return dayLabel(date) + "按周计划应练：" + label + "日（" + slot.template + "）；动作与建议都围绕这一类。";
  }
  /** 明确「重新生成」：清掉本窗口缓存并强制重算，偏好不变也能换一版。 */
  /** 起始部位＝接上一次训练的下一个（2026-11-22 用户拍板）。ppl 按推→拉→腿轮转；上下肢按上下交替；全身固定。
   *  extra：用户点「换一套」时往前推一格——同一套偏好下也能拿到不同的排法，否则生成器是确定性的，按了等于没按。 */
  function nextStartTemplate(split, extra = 0) {
    const key = ['ppl', 'ul', 'fb'].includes(String(split)) ? String(split) : 'ppl';
    const rows = (state.habits || [])
      .filter(row => row && validDate(row.date) && row.date < activeDate && row.template && Array.isArray(row.exercises) && row.exercises.length)
      .sort((a, b) => String(b.date).localeCompare(String(a.date)));
    const last = rows[0] ? String(rows[0].template) : '';
    if (key === 'fb') return 'full';
    if (key === 'ul') {
      const base = ['legs', 'lower'].includes(last) ? 0 : 1;
      return ['upper', 'lower'][(base + extra) % 2];
    }
    const order = ['push', 'pull', 'legs'];
    const at = order.indexOf(last);
    const base = at >= 0 ? (at + 1) % 3 : 0;
    return order[(base + extra) % 3];
  }
  function regenerateWeekPlan(opts = {}) {
    // 换一套 = 起始部位往前一格（生成器确定性，不推一格按了等于没按）；保存偏好 = 回到基准起点。
    weekVariation = opts.vary ? (weekVariation + 1) % 12 : 0;
    planFresh = opts.fresh === true || opts.vary === true;
    const startDate = planStartDate();
    try { localStorage.removeItem(WEEK_PLAN_KEY(startDate)); } catch { }
    lastWeekPlan = null;
    forceWeekPlan = true;
    renderWeekPlan();
  }
  /**
   * 「把这周写进训练记录」：只追加、不覆盖——每天原有记录整条保留，同名动作跳过；
   * 一天都没新增就不写，也不改 training 标记。2026-11-23 Phase 3 从 70 的独立监听器收进来。
   */
  async function scheduleWeekPlan(button) {
    const plan = lastWeekPlan;
    if (!plan) return;
    const ok = await askConfirm('将把 ' + plan.days.length + ' 次训练写入 ' + plan.startDate + ' 起的一周（每天一条训练记录）。已记录的动作会保留，只补充缺的动作。', {title: '排进本周'});
    if (!ok) return;
    button.disabled = true;
    try {
      let written = 0, kept = 0, addedTotal = 0;
      for (const day of plan.days) {
        const habit = habitRowFor(day.date) || {date: day.date};
        const existing = Array.isArray(habit.exercises) ? habit.exercises : [];
        const have = new Set(existing.map(row => String(row && row.name || '').trim()));
        const additions = [];
        for (const item of day.exercises) {
          const name = String(item && item.name || '').trim();
          if (!name || have.has(name)) continue;
          have.add(name);
          additions.push({name, sets: item.sets, reps: item.reps, weight: item.weight});
        }
        if (!additions.length) { kept++; continue; }
        await api('/api/habits', {...habit, date: day.date, training: true, exercises: [...existing, ...additions]});
        written++;
        addedTotal += additions.length;
      }
      await loadState({quiet: true});
      const tail = kept ? '；' + kept + ' 天已排过，未改动' : '';
      notice('已排好 ' + written + ' 次训练（新增 ' + addedTotal + ' 个动作）' + tail + '，可在「记录 · 训练」逐日调整。');
    } catch (error) {
      notice(error.message, true);
    } finally {
      button.disabled = false;
    }
  }
  /**
   * 生成之后的「这一版长什么样」自检：几练、部位顺序、每次几个动作、周组数是否压在上限内、
   * 有多少动作的重量是按体重推算的。只报事实，不报耗时——用户要的是排得对，不是排得快。
   */
  function planQualityLine(plan) {
    if (!plan || !Array.isArray(plan.days) || !plan.days.length) return '';
    const labels = planDayLabels(plan.days);
    const counts = plan.days.map(day => (day.exercises || []).length);
    const span = counts.length && Math.min(...counts) === Math.max(...counts)
      ? `每次 ${counts[0]} 个动作`
      : `每次 ${Math.min(...counts)}–${Math.max(...counts)} 个动作`;
    const cap = plan.days[0]?.weeklySets?.cap || null;
    const part = family => plan.days.reduce((sum, day) => sum + (day.exercises || [])
      .filter(item => typeof exerciseBodyPart === 'function' && exerciseBodyPart(item.name) === family)
      .reduce((inner, item) => inner + (Number(item.sets) || 0), 0), 0);
    const sets = cap ? ` · 周组数 胸 ${part('push')} / 背 ${part('pull')} / 腿 ${part('legs')}（上限 ${cap}）` : '';
    // 4 练的推拉腿必然有一类练两次（胸 12 / 背 6 / 腿 6 这种）：把差距说出来，并给出不改动作的解法。
    const fams = [part('push'), part('pull'), part('legs')];
    const imbalanced = cap && Math.max(...fams) - Math.min(...fams) >= 6;
    const approx = plan.days.reduce((n, day) => n + (day.exercises || []).filter(item => item.weightApprox).length, 0);
    return '<p class="fine-print plan-quality">已生成 ' + plan.days.length + ' 练 · ' + labels + ' · ' + span + sets
      + (approx ? ' · ' + approx + ' 个动作按体重推算起步' : '')
      + (imbalanced ? ' · 想练得更匀，可把每周改成 3 或 6 练' : '') + '</p>';
  }
  /** 一周的部位顺序：连续相同合并成「全身 ×4」，轻量日单独标「（轻）」。 */
  function planDayLabels(days) {
    const tpl = name => (typeof TRAINING_TEMPLATES === 'object' && TRAINING_TEMPLATES[name]) || name;
    const runs = [];
    for (const day of days || []) {
      const label = tpl(day.template) + (day.light ? '（轻）' : '');
      const last = runs[runs.length - 1];
      if (last && last.label === label) last.count += 1;
      else runs.push({label, count: 1});
    }
    return runs.map(run => run.count > 1 ? `${run.label} ×${run.count}` : run.label).join(' / ');
  }
  /**
   * 「为什么这样排？」：把生成时真正用上的参数摊开——时长上限、动作数、器械、起始部位、
   * 被排除的要求、是否减载。默认收起，挂在计划标题下面，不占首屏。
   */
  function planWhyBadgeHtml(plan) {
    const a = (plan && plan.applied) || {};
    const tpl = n => TRAINING_TEMPLATES[n] || n;
    const first = plan && plan.days && plan.days[0] ? tpl(plan.days[0].template) : '';
    const bits = [];
    if (a.minutes) bits.push(`单次按 ${a.minutes} 分钟排，每次 ${a.moves} 个动作、每组最多 ${a.setCap} 组`);
    if (a.gear) bits.push(`器械：${PLAN_GEAR_LABELS[a.gear] || a.gear}`);
    if (first) bits.push(`起始接上一次训练之后：从${first}日开始轮换`);
    if (Array.isArray(a.bannedWords) && a.bannedWords.length) bits.push(`已按你的要求排除：${a.bannedWords.join('、')}`);
    if (plan && plan.deload) bits.push('本周判定为减载周：负重 ×0.9、组数 −1');
    if (!bits.length) return '';
    return `<details class="plan-why-badge"><summary>为什么这样排？</summary><p>${esc(bits.join('；'))}。</p></details>`;
  }
  function openPlanSheet() {
    const trigger = $("#plan-explain-open");
    if (trigger) trigger.click();
  }
  /**
   * 「这周这样排」——生成后必须先看的一屏：把这次改的偏好逐条落到结果上（排了几练、时长怎么折算、
   * 器械、训练要求是否被读取/排除、周组数是否压在上限内）。返回 true 表示用户想去看看详细说明。
   */
  function showCoachSummary(prefs, plan) {
    const a = (plan && plan.applied) || {};
    const tpl = n => TRAINING_TEMPLATES[n] || n;
    const days = (plan && plan.days) || [];
    const labels = planDayLabels(days);
    const rows = [];
    rows.push(`每周 ${prefs.days} 练 → 实际排了 ${days.length} 练：${labels || '—'}`);
    rows.push(`单次 ${prefs.minutes} 分钟上限 → 每次 ${a.moves || '—'} 个动作、每组最多 ${a.setCap || '—'} 组`);
    rows.push(`器械：${PLAN_GEAR_LABELS[prefs.gear] || prefs.gear || '综合'}`);
    const request = String(prefs.request || '').trim();
    rows.push(request
      ? `训练要求：${request}${Array.isArray(a.bannedWords) && a.bannedWords.length ? ` → 已排除：${a.bannedWords.join('、')}` : ' → 已读取，没有命中要排除的动作'}`
      : '训练要求：未填写');
    const cap = days[0] && days[0].weeklySets ? days[0].weeklySets.cap : null;
    if (cap) rows.push(`周组数：压在每部位 ${cap} 组上限内`);
    if (plan && plan.deload) rows.push('负荷判定偏高 → 按减载周排：负重 ×0.9、组数 −1');
    const bodyHtml = `<ul class="dialog-items coach-summary">${rows.map(row => `<li><span>${esc(row)}</span></li>`).join('')}</ul>`;
    return askConfirm('这一版是按你刚改的偏好重排的。', {title: '这周这样排', ok: '知道了', cancel: '看详细说明', bodyHtml})
      .then(ok => ok === false);
  }
  function renderWeekPlan() {
    const box = $('#week-plan'), tag = $('#week-plan-tag');
    if (!box) return;
    const loads = dailyLoads(28);
    const stats = acwrFromDailyLoads(loads, activeDate);
    const lastByExercise = recentExerciseBaselines(14);
    const planPref = prefsForPlan() || {};
    // 以「计划偏好里的每周训练次数」为准，档案次数只做兜底——否则改了 chip 也不生效。
    const sessions = Math.max(1, Math.min(6, Math.round(number(planPref.days) || number(effectiveProfileForDate(activeDate).training) || 3)));
    const startDate = planStartDate();
    const fingerprint = weekPlanFingerprint(prefsForPlan(), lastByExercise, sessions);
    const cached = forceWeekPlan ? null : readWeekPlanCache(startDate);
    let plan, drifted = false;
    if (cached && cached.plan && cached.fingerprint === fingerprint) {
      plan = cached.plan; // 指纹没变：照用上次的结果，计划是被「约定」过的
    } else {
      plan = generateWeekPlan({startDate, sessions, lastByExercise, acwrFlag: stats ? stats.flag : 'ok',
        goal: (state.profile || {}).goal, split: planPref.split, gear: planPref.gear, minutes: planPref.minutes,
        // 训练要求（排除动作 / 改时长）必须一起传：漏传会让「保存并重排」生成的计划完全不执行 excludedMove。
        request: planPref.request,
        startTemplate: nextStartTemplate(planPref.split, weekVariation)});
      drifted = !!(cached && cached.plan);
      if (plan) writeWeekPlanCache(startDate, {plan, fingerprint, savedAt: Date.now()});
    }
    forceWeekPlan = false;
    lastWeekPlan = plan;
    if (!plan) { box.innerHTML = empty('还没有足够的训练记录', '先记两周训练，计划会自动出来。', 'empty'); return; }
    if (tag) tag.textContent = plan.deload ? '减载周' : '负重 +2.5%';
    // "What do I train today": today's planned day, the next one, or what was already logged.
    // 2026-11-23 四模块之四：卡面不再提供「把今天这节加入清单」——计划当天已自动播种成日志行。
    // 负荷：标签 + 数值 + 判定，不写成一句话。「急慢性比」第一次看不知道是谁比谁，改成「负荷比」+ 一行口径。
    const acwrHtml = (() => {
      if (!stats || !Number.isFinite(stats.ratio)) return '';
      const level = stats.flag === 'high' ? 'high' : stats.flag === 'low' ? 'low' : 'ok';
      const verdict = level === 'high' ? '偏高 · 本周减载' : level === 'low' ? '偏低 · 按记录安排' : '维持';
      return '<p class="plan-label">训练负荷</p><div class="plan-load is-' + level + '"><span class="plan-load-label">负荷比</span>'
        + '<span class="plan-load-value">' + stats.ratio.toFixed(2) + '</span>'
        + '<span class="plan-load-verdict">' + verdict + '</span></div>'
        + '<p class="fine-print plan-load-note">负荷比 = 近 7 天 ÷ 近 4 周平均负荷；0.8–1.3 为维持区。</p>';
    })();
    const suggestedNote = plan.days.some(day => day.suggested) ? '<p class="fine-print">带「建议」的动作来自训练库（该模板你还没有记录），先按 3 组建立基线。</p>' : '';
    // 预览日：点周条只换「看哪天」，不动 activeDate——页面不跳、周条窗口也不挪，随时能点回今天。
    const previewStart = startDate;
    const previewEnd = shiftDay(previewStart, 7);
    if (!weekDetailDay || weekDetailDay < previewStart || weekDetailDay >= previewEnd) weekDetailDay = activeDate;
    // 只讲「这一周怎么排的」。AI 给单个动作的理由已经在「今日顺序」每行下面，这里再列一遍
    // 会与预览日期脱节（切到 21 号还挂着 19 号的清单），所以不重复。
    const whyBody = '<p class="plan-why-lead">为什么这样排：这一周的框架按训练库与你最近两周的记录生成。</p>'
      + '<p>' + esc(plan.note) + '</p>'
      + (Array.isArray(plan.reasons) ? plan.reasons.map(reason =>
        '<p>' + esc(reason.text) + '</p>').join('') : '');
    // 2026-11-22：常驻的「动作要点」折叠块撤掉——动作名旁的 ? 已是唯一入口。
    // 「怎么来的」是这一周的口径，与哪天选中无关，所以单独折叠、切日期也不动它。
    const whyHtml = '<details class="plan-why"><summary>这周怎么排的</summary>' + whyBody + '</details>';
    // 本周安排：完全按用户偏好生成；没有偏好就不出方案。
    const planBox = $("#week-plan");
    if (planBox && !planBox.dataset.adoptWired) {
      planBox.dataset.adoptWired = "1";
      planBox.addEventListener("click", event => {
        const cell = event.target.closest("[data-week-day]");
        if (cell) {
          // 2026-11-19（用户：点 21 号页面不要跳，能点回 19；下方显示那天练什么 + 那天的动作要点）：
          // 只换「看哪天」，不动 activeDate——周条窗口还从原来那天起算，页面也不跳。
          const day = cell.dataset.weekDay || "";
          if (!day) return;
          weekDetailDay = day;
          for (const node of planBox.querySelectorAll("[data-week-day]")) {
            const on = node.dataset.weekDay === day;
            node.classList.toggle("is-selected", on);
            node.setAttribute("aria-pressed", String(on));
          }
          const detail = $("#week-detail");
          if (detail) detail.textContent = weekDetailHtml(day, lastWeekPlan);
          // 2026-11-22：常驻「动作要点」块已撤掉，点日期只换这一行明细；
          // 单个动作的要点走动作名旁的 ?（showExerciseGuide），不再占卡面。
          return;
        }
        // 2026-11-23 四模块之四：卡面上的「加入今日清单」已删除（计划当天自动播种，不需要中间步骤）；
        // 今日页那份 [data-today-adopt] 入口仍保留，走 adoptWeekDay()。
        // 2026-11-23 Phase 3：把这周的写入也收进同一个委托，#week-plan 上不再有第二个监听器。
        const schedule = event.target.closest("[data-plan-schedule]");
        if (schedule) scheduleWeekPlan(schedule);
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
      // 2026-11-18：周条改成「从今天起的 7 天」，与计划同日出发，标题也从「下周安排」改回「本周安排」。
      const weekStartPlan = startDate;
      const cells = [];
      for (let offset = 0; offset < 7; offset++) {
        const day = shiftDay(weekStartPlan, offset);
        const planDay = plan.days.find(item => item.date === day) || null;
        const logged = exercisesFor(day).filter(item => item && item.name).length > 0;
        // 加深只给日历上的今天：切到别的那天时，窗口里没有真正今天，就谁都不加深。
        const isToday = day === localDate();
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
      thisWeekHtml = '<h3 class="plan-sub">本周安排 · ' + esc(weekStartPlan.slice(5)) + ' 起</h3>'
        + '<div class="week-strip" role="group" aria-label="从今天起的训练安排，点一天看安排">' + cells.join("") + '</div>'
        + '<p class="week-detail" id="week-detail">' + weekDetailHtml(weekDetailDay, plan) + '</p>';
    }
    const driftHtml = drifted ? '<p class="fine-print">记录有更新，本周安排已按最新数据重算。</p>' : '';
    // 目标对应的训练要求（组数 / 次数 / RIR）：和 docs/design/27-evidence-requirements.md 同一张表，
    // 增肌与减脂的要求不同，页面上直接写出来，别让用户自己猜「这次该练几组」。
    const goalPreset = typeof GOAL_PRESETS === 'object' ? GOAL_PRESETS[(state.profile || {}).goal] : null;
    const goalRequirementHtml = goalPreset && goalPreset.muscleSetsPerWeek
      ? '<p class="fine-print plan-requirement">' + esc('本周要求（' + goalLabelOf((state.profile || {}).goal) + '）：每个大肌群 '
        + goalPreset.muscleSetsPerWeek[0] + '~' + goalPreset.muscleSetsPerWeek[1] + ' 组 · 每组 '
        + goalPreset.reps[0] + '~' + goalPreset.reps[1] + ' 次 · RIR '
        + goalPreset.rir[0] + '~' + goalPreset.rir[1]) + '</p>'
      : '';
    // 一键排课（2026-11-23 四模块之四）：从卡面降级进「计划说明」抽屉——计划当天已自动播种成日志行，
    // 「先点加入 / 先写入」这种中间步骤不再需要；批量补过去几天仍有人要，留在抽屉里当低频动作。
    const scheduleHtml = plan.days.length
      ? '<details class="plan-schedule-more" id="plan-schedule-more"><summary>把这周写进训练记录</summary><p class="fine-print">今天这节已经在下面的日志里了；这里会把这周剩下的 ' + plan.days.length + ' 次训练直接写成记录，之后还能在日志里改。</p><button type="button" class="button subtle full-width" data-plan-schedule="1">写入' + esc(dayLabel(activeDate)) + '起 ' + plan.days.length + ' 次训练</button></details>'
      : '';
    // 「计划 vs 日志」是同屏最容易混的一对：这句话只在抽屉里解释了，卡面不再复述。
    const scopeHtml = plan.days.length
      ? '<p class="fine-print plan-scope">周条只写「练什么」；真正记录的是下面「训练日志」，两者不一致时以日志为准。</p>'
      : '';
    // 两套清单同屏容易混：先说清谁是谁、冲突时听谁的，再让用户读数据。
    const relationHtml = plan.days.length
      ? '<p class="fine-print plan-relation">上面按偏好与最近记录排周框架；实际执行顺序以你在训练日志里确认的那份为准，两者不一致时以日志为准。</p>'
      : '';
    // 卡面只剩本周安排与「记录有更新」一行；其余说明一次性渲染进抽屉，不再靠 move 搬家。
    box.innerHTML = annotateTerms(thisWeekHtml + planQualityLine(plan) + planWhyBadgeHtml(plan) + driftHtml);
    // 徽记默认收起（重画后显式关一次，避免浏览器把新插入的 details 当展开态）。
    box.querySelectorAll('details.plan-why-badge').forEach(node => { node.open = false; });
    // 2026-11-24：刚生成的那一版，标题与说明各播一次 220ms 上浮淡入，再平稳滚到卡头——
    // 「列表已经按新偏好重算过」这件事要有可见动作，而不只是数字变了。
    if (planFresh) {
      planFresh = false;
      const detail = box.querySelector('#week-detail');
      const sub = box.querySelector('.plan-sub');
      if (sub) sub.classList.add('is-fresh');
      if (detail) detail.classList.add('is-fresh');
      $('#week-plan-card')?.scrollIntoView({block: 'start', behavior: 'smooth'});
    }
    const explainHost = $('#plan-explain-body');
    if (explainHost) {
      explainHost.innerHTML = annotateTerms(goalRequirementHtml + relationHtml + whyHtml + acwrHtml + scopeHtml + suggestedNote + scheduleHtml);
    }
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

  /**
   * 记录·身体 的「今天体重」（2026-11-22 由「今天两样」收窄）：卡片只报当天这一条，
   * 点它跳到身体数据卡的体重格——体重只有一个可编辑处，不出现两套口径。
   */
  function renderBodyWeight() {
    const box = $('#body-weight-jump');
    if (!box) return;
    const measurement = (state.measurements || []).find(row => row && row.date === activeDate) || {};
    const weight = number(measurement.weight);
    const value = $('#body-weight-value'), note = $('#body-weight-hint'), tag = $('#body-quick-tag');
    // 空值时「—」按小字 muted 排，不要拿 32px 半粗画成一条黑杠。
    box.classList.toggle('is-empty', weight === null);
    if (value) value.textContent = weight === null ? '—' : fmt(weight, 1);
    if (note) note.textContent = weight === null ? '点一下填今天的体重' : `已记 ${activeDate.slice(5).replace('-', '/')} · 点一下可修改`;
    if (tag) tag.textContent = weight === null ? '待记录' : '已记录';
    // 折叠态标题的常用指标也要跟着数据走，别等用户展开才补。
    if (typeof paintBodyDataHints === 'function') paintBodyDataHints();
  }
  /**
   * 复制上一餐的手机端入口在 1.5.41 已随入口预算移除（index.html 里没有 #copy-meal-buttons），
   * 但这段候选排序 / 去重 / 空态仍被 suite-today 的回归断言直接引用，且快速记录弹窗复用同一套
   * 「昨天优先 + 同名去重」口径，所以保留实现，只把它标注为无 UI 入口。
   */
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
      const label = `${row.date === shiftDay(activeDate,-1) ? '昨天' : String(row.date).slice(5)} · ${mealNames[row.mealType] || '餐食'} · ${stripQuickTag(row.name) || '未命名'}`;
      return `<button type="button" class="button subtle" data-copy-meal="${esc(row.id ?? '')}">${esc(label)}</button>`;
    }).join('') : empty('还没有可复制的餐食记录', '记下一餐后，这里会列出来可直接复制。');
  }
  /**
   * 复制一条餐食到当前日（新 id、当前时刻、来源标 quick-copy）。
   * 注：1.5.41 起没有页面入口（见 renderCopyMeals 的说明），保留它是因为数据层仍需要这一段
   * 「复制后如何打标」的语义；点击委托也已用可选链兜住。
   */
  /** Copies one meal to the viewed date with a fresh id; totals and items are carried over as-is. */
  async function copyMeal(id) {
    const source = (state.meals || []).find(row => row && String(row.id ?? '') === String(id));
    if (!source) {notice('这条记录已经不存在了。', true); renderCopyMeals(); return;}
    const copy = {...source};
    delete copy.id;
    copy.date = activeDate;
    copy.source = 'quick-copy';
    copy.name = stripQuickTag(source.name) || '未命名餐食';
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
      // 快捷值不再由「保存过什么」自动改写：它现在由「自定义快捷值」显式设定，卡底两枚要可预期。
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
    try {const relax=relaxDayInfoFor(date); const data=await api('/api/advice',{date,relaxDay:!!relax.relax,preferences:readPreferences(),...(useAI?{useAI:true,allowExternal:true}:{})}); if(date!==activeDate) return; if(!Array.isArray(data?.messages)) throw new Error('建议数据格式不正确。'); renderAdvice(data.messages,date,data.actionItems);}
    catch(error) {
      // 模型不可用时退回本地建议：这张卡空着比给一条本地结论更糟。
      try {
        const local=await api('/api/advice',{date});
        if(date!==activeDate) return;
        if(Array.isArray(local?.messages) && local.messages.length) {renderAdvice(local.messages,date,local.actionItems); container.dataset.fallback='1'; container.setAttribute('data-note','模型暂时不可用，以下是本地建议。'); return;}
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
    // The row's calories/fat were scaled too; keep its oil marker in the same proportion,
    // otherwise a later "少" subtracts the old (larger) oil and can go negative.
    const oil = number(row.dataset.oil);
    if (oil > 0) row.dataset.oil = String(Math.round(oil * ratio * 10) / 10);
    updatePreviewTotals();
  }
  let itemRecalcReturnFocus = null;
  function openItemRecalc(row) {
    if (!row) return;
    const root = $('#item-recalc-dialog'), grams = number($('[data-item-field="grams"]', row)?.value), baseGrams = number(row.dataset.baseGrams);
    if (!(grams > 0) || !(baseGrams > 0)) return;
    itemRecalcReturnFocus = document.activeElement instanceof HTMLElement && document.activeElement !== document.body ? document.activeElement : null;
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
    const returnTo = itemRecalcReturnFocus; itemRecalcReturnFocus = null;
    if (returnTo && returnTo.isConnected && typeof returnTo.focus === 'function') returnTo.focus({preventScroll: true});
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
  /**
   * 烹调用油（1.4.59）：按「烹饪方式 × 食材重量」在本地算，不再让模型自由给克数。
   * 基线取自 302 道中式菜实测：每 100 g 食材 8.1 g 油（IJERPH 2019），再按烹饪方式分档。
   * 整餐三档（少/一般/多）只乘一次；旧草稿若已带油（oilIncluded）保持原样，不重复加。
   */
  const OIL_METHOD_FACTORS = {炒: 8.1, 爆炒: 11, 红烧: 12, 干锅: 14, 煎: 9, 炸: 14, 油淋: 12, 烤: 6, 蒸: 0, 煮: 1, 炖: 2, 凉拌: 4, 白灼: 0, 生食: 0, 其他: 6};
  const OIL_LEVELS = {low: {ratio: 0.6, label: '少'}, normal: {ratio: 1, label: '一般'}, high: {ratio: 1.5, label: '多'}};
  /**
   * 包装/成品（薯片、饼干、坚果、酸奶、饮料…）的营养表里已经含了本身那份脂肪，
   * 再按「烹调用油」加一遍就是重复计算。只有明确写了炒/炸这类烹饪方式时才照常算油
   * （「炸薯条」确实吸油，但「薯片」不是我们炸的）。
   */
  const PACKAGED_METHODS = ['包装', '即食', '零食', '成品', '预包装'];
  const PACKAGED_NAME_HINTS = /薯片|薯条|饼干|曲奇|巧克力|面包|蛋糕|吐司|坚果|花生|核桃|腰果|瓜子|酸奶|牛奶|豆奶|奶酪|芝士|饮料|可乐|雪碧|果汁|咖啡|奶茶|蛋白棒|能量棒|糖果|果冻|冰淇淋|雪糕|布丁|香肠|火腿肠|培根|罐头|方便面|泡面|麦片|谷物|代餐|蛋白粉|乳清蛋白|奶昔/;
  function isPackagedFood(item) {
    if (!item) return false;
    if (item.packaged === true) return true;
    const method = String(item.method || '').trim();
    if (PACKAGED_METHODS.includes(method)) return true;
    if (method && Object.prototype.hasOwnProperty.call(OIL_METHOD_FACTORS, method) && method !== '其他') return false;
    return PACKAGED_NAME_HINTS.test(String(item.name || ''));
  }
  let estimateOilLevel = 'normal';
  let estimateRawItems = [];
  let estimateView = null;
  function oilRuleFor(method, grams) {
    const key = String(method || '').trim();
    const factor = Object.prototype.hasOwnProperty.call(OIL_METHOD_FACTORS, key) ? OIL_METHOD_FACTORS[key] : OIL_METHOD_FACTORS['其他'];
    const g = number(grams);
    if (!(g > 0)) return 0;
    return Math.round((g / 100 * factor) * 10) / 10;
  }
  function applyOilToItems(items, level = 'normal') {
    const ratio = (OIL_LEVELS[level] || OIL_LEVELS.normal).ratio;
    return (Array.isArray(items) ? items : []).map(item => {
      const next = {...item};
      // A dish that already includes its cooking oil must stay untouched even when its oilGrams is 0.
      if (next.oilIncluded === true) return next;
      if (isPackagedFood(next)) return next;
      const oil = Math.round(oilRuleFor(next.method, next.grams) * ratio * 10) / 10;
      if (!(oil > 0)) return next;
      next.oilGrams = oil;
      next.oilMethod = String(next.method || '其他');
      next.calories = (number(next.calories) || 0) + Math.round(oil * 9);
      next.fat = Math.round(((number(next.fat) || 0) + oil) * 10) / 10;
      next.oilIncluded = true;
      return next;
    });
  }
  function renderOilLevel() {
    const box = $('#estimate-oil-level');
    if (!box) return;
    $$('[data-oil-level]', box).forEach(btn => btn.setAttribute('aria-pressed', btn.dataset.oilLevel === estimateOilLevel ? 'true' : 'false'));
  }
  /** Remove the oil already present in a row, then add the newly selected oil. Never return negative nutrition. */
  function oilAdjustedValues(calories, fat, oldOil, newOil) {
    const cal = number(calories), f = number(fat);
    const old = Math.max(0, number(oldOil) ?? 0), next = Math.max(0, number(newOil) ?? 0);
    const baseCal = Math.max(0, (cal ?? 0) - old * 9);
    const baseFat = Math.max(0, (f ?? 0) - old);
    return {
      calories: Math.round(baseCal + next * 9),
      fat: Math.round((baseFat + next) * 10) / 10
    };
  }
  /** 只调整油量差额，保留用户改过的克重与热量。 */
  function setOilLevel(level) {
    if (!OIL_LEVELS[level] || !estimateView) return;
    const ratioTo = OIL_LEVELS[level].ratio;
    $$('.estimate-item').forEach((row, index) => {
      const raw = estimateRawItems[index] || {};
      const gramsField = $('[data-item-field="grams"]', row);
      const grams = number(gramsField && gramsField.value) ?? number(raw.grams);
      const nameField = $('[data-item-field="name"]', row);
      if (isPackagedFood({...raw, name: (nameField && nameField.value) || raw.name})) return;
      // A saved/mixed dish already carries its own oil; changing the meal-level level would
      // subtract oil that is not independently represented in the row.
      if (raw.oilIncluded === true) return;
      const base = oilRuleFor(raw.method, grams);
      if (!(base > 0)) return;
      const oldOil = Math.max(0, number(row.dataset.oil) ?? number(raw.oilGrams) ?? 0);
      const newOil = Math.round(base * ratioTo * 10) / 10;
      const cal = $('[data-item-field="calories"]', row);
      const fat = $('[data-item-field="fat"]', row);
      const adjusted = oilAdjustedValues(cal && cal.value, fat && fat.value, oldOil, newOil);
      if (cal) cal.value = adjusted.calories;
      if (fat) fat.value = adjusted.fat;
      row.dataset.oil = String(newOil);
    });
    estimateOilLevel = level;
    renderOilLevel();
    updatePreviewTotals();
  }
  const ESTIMATE_LIMITS = Object.freeze({items: 24, name: 120, grams: 20000, calories: 100000, macros: 1000, notes: 6, note: 160, draftId: 120});
  /** Reject malformed model rows before they can reach the preview or a write. */
  function validEstimateItem(item) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return false;
    const name = typeof item.name === 'string' ? item.name.trim() : '';
    if (!name || name.length > ESTIMATE_LIMITS.name) return false;
    if (item.method != null && (typeof item.method !== 'string' || item.method.length > 20)) return false;
    const numeric = [
      ['grams', ESTIMATE_LIMITS.grams],
      ['calories', ESTIMATE_LIMITS.calories],
      ['protein', ESTIMATE_LIMITS.macros],
      ['fat', ESTIMATE_LIMITS.macros],
      ['carbs', ESTIMATE_LIMITS.macros]
    ];
    return numeric.every(([key, max]) => {
      const value = number(item[key]);
      return value !== null && value >= 0 && value <= max;
    });
  }
  function previewDraft(data, form) {
    if (!data || typeof data.draftId !== 'string' || !data.draftId || data.draftId.length > ESTIMATE_LIMITS.draftId
      || !Array.isArray(data.items) || !data.items.length || data.items.length > ESTIMATE_LIMITS.items
      || !['api','local'].includes(data.source)) throw new Error('未返回有效估算预览，请重试。');
    if (!data.items.every(validEstimateItem)) throw new Error('估算明细格式不对，请重新生成。');
    const suggested = defaultMealTime(form.photo, form.text, form.elements.mealType.value);
    const notes = Array.isArray(data.notes)
      ? data.notes.filter(note => typeof note === 'string' && note.length > 0 && note.length <= ESTIMATE_LIMITS.note).slice(0, ESTIMATE_LIMITS.notes)
      : [];
    const view = {id:data.draftId,date:form.elements.date.value,mealType:form.elements.mealType.value,source:data.source,
      localFoodModel:data.localFoodModel === true,
      confidence:data.confidence,notes:notes,items:data.items,name:'',
      oilGrams:number(data.oilGrams) ?? 0,uncertaintyPercent:number(data.uncertaintyPercent) ?? 15,
      ...photoMeta(form.photo), mealTime:suggested.mealTime, mealTimeSource:suggested.mealTimeSource};
    renderPreview(view, false);
    saveToDraftBox(view);
  }
  /** Build the preview view from a saved meal without touching its id or nutrition values. */
  function mealEditView(record) {
    if (!record || record.id === undefined || record.id === null) return null;
    const items = Array.isArray(record.items) ? record.items.map(item => ({...item})) : [];
    if (!items.length) return null;
    const oil = Number(record.oilGrams);
    const uncertainty = Number(record.uncertaintyPercent);
    return {
      id: record.id,
      editingId: record.id,
      date: record.date,
      mealType: record.mealType || 'lunch',
      source: record.source || 'manual',
      mealTime: record.mealTime,
      mealTimeSource: record.mealTimeSource || 'manual',
      items,
      name: record.name || '',
      oilGrams: Number.isFinite(oil) ? oil : 0,
      uncertaintyPercent: Number.isFinite(uncertainty) ? uncertainty : 15,
      photoTakenAt: record.photoTakenAt || null,
      photoTimeSource: record.photoTimeSource || 'unknown'
    };
  }
  function beginMealEdit(record) {
    const view = mealEditView(record);
    if (!view) {notice('这条餐食没有可编辑的明细，请先重新估算。', true); return;}
    switchTab('records', true);
    if (typeof switchRecordPanel === 'function') switchRecordPanel('food');
    setTimeout(() => {
      try {renderPreview(view, true);} catch (error) {notice(error.message, true);}
    }, 60);
  }
  /** Renders a stored or fresh estimate preview; a restored draft is labelled as such. */
  function renderPreview(view, restored) {
    estimateView = view;
    estimateRawItems = (view && Array.isArray(view.items) ? view.items : []).map(item => ({...item}));
    if (!view?.id || !Array.isArray(view.items) || !view.items.length) throw new Error('这份草稿不完整，请重新估算。');
    const mealTime = clockPattern.test(String(view.mealTime||'')) ? view.mealTime : nowClock();
    const source = ['photo','text','now','manual','typical'].includes(view.mealTimeSource) ? view.mealTimeSource : 'now';
    draft={id:view.id,editingId:view.editingId || '',date:view.date,mealType:view.mealType,source:view.source,mealTime,mealTimeSource:source,...photoMeta(view)};
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
    // Editing a saved meal keeps its stored nutrition: applying oil again would double-count it.
    const oiledItems = view.editingId ? estimateRawItems : applyOilToItems(estimateRawItems, estimateOilLevel);
    $('#estimate-items').innerHTML=oiledItems.map(item => `<div class="estimate-item" data-base-grams="${Number(item.grams)}" data-oil="${Number(item.oilGrams)||0}" data-method="${esc(item.oilMethod||item.method||'')}"${item.oilIncluded===true?' data-oil-included="1"':''}><div class="estimate-item-head"><label>食物名称<input data-item-field="name" value="${esc(item.name)}" maxlength="120" required></label><div class="estimate-item-actions"><button type="button" class="recalc-item" title="按克重和每 100g 数据重算" aria-label="按克重重算${esc(item.name)}"><span class="inline-icon" aria-hidden="true"><img src="./icon-refresh.svg" alt="" width="17" height="17"></span></button><button type="button" class="remove-item" title="移除这项" aria-label="移除${esc(item.name)}">×</button></div></div>${modelNote(item)}${number(item.oilGrams)>0?`<p class="fine-print estimate-item-oil">${esc(item.oilMethod||item.method||'按克重')} · 用油 ${fmt(item.oilGrams,0)} g，已含在热量与脂肪里。</p>`:''}<div class="form-grid">${fields.map(([key,label]) => `<label>${label}<input data-item-field="${key}" type="number" value="${Number(item[key])}" ${key === 'grams' ? '' : `data-base-value="${Number(item[key])}"`} min="0" max="20000" step="0.01" required></label>`).join('')}</div></div>`).join('');
    $('#estimate-source').textContent=view.editingId?'编辑已保存餐食':`${view.source==='api'?'外部模型':view.localFoodModel?'本地食品库':'本地估算'} · ${view.confidence==='medium'?'中等':'低'}置信度${restored?' · 已恢复未确认草稿':''}`;
    const uncertainty=number(view.uncertaintyPercent) ?? 15;
    draft.uncertaintyPercent=uncertainty; draft.oilGrams=number(view.oilGrams) ?? 0;
    // 用油按菜归属：模型的每道菜自己带 oilGrams，且已算进那道菜的热量；顶层数只用于展示。
    const itemsOil=(oiledItems||[]).reduce((sum,item)=>sum+(number(item.oilGrams)||0),0);
    const totalCalories=totalsFor(oiledItems).calories;
    const interval=`估算区间：约 ${fmt(totalCalories*(1-uncertainty/100),0)}–${fmt(totalCalories*(1+uncertainty/100),0)} kcal（±${fmt(uncertainty,0)}%）`;
    const oilNote=itemsOil>0
      ? `用油按菜式与克重估算：共 ${fmt(itemsOil,0)} g（约 ${fmt(itemsOil*9,0)} kcal），已含在各菜的热量与脂肪里；整餐可调「少 / 一般 / 多」`
      : draft.oilGrams>0
        ? `已计入烹调用油 ${fmt(draft.oilGrams,0)} g（约 ${fmt(draft.oilGrams*9,0)} kcal）`
        : '这几道菜按清蒸/白灼/生食这类方式算，不计烹调用油；如果实际有油，把「整餐用油」调到一般或多';
    const lowNote='识别结果可能有偏差，请核对份量与克重；不确定的项按常见份量取中位值即可，不必刻意往高报。';
    $('#estimate-notes').innerHTML=[interval,oilNote,lowNote].concat(Array.isArray(view.notes)?view.notes:[]).map(note=>`<li>${esc(note)}</li>`).join('');
    $('#estimate-name').value=view.name || view.items.map(item=>item.name).join('、').slice(0,120);
    $('#estimate-preview').hidden=false;
    feedback($('#preview-feedback'), view.editingId ? '正在编辑已保存餐食；保存后会更新原记录，不会新增一条。' : restored?'已恢复未确认的估算，请核对日期与克重后确认保存。':'请检查数据后确认保存。');
    renderOilLevel();
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
