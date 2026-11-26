/* Fragment 42-diet-domain -- 饮食领域层（纯计算，禁 DOM；由 00/10/50/60/70 迁入，2026-11-27 Phase 2）
 *
 * 只允许纯函数与常量：不读页面节点、不写页面内容、不弹窗（连注释也不要写出被禁的 DOM 接口名，
 * 架构守卫按文本 token 扫）。
 * 视图与写库流程在 45-diet-ui；全局函数名一律保留，调用方与测试不用改。
 */

  const mealNames = {breakfast:'早餐',lunch:'午餐',dinner:'晚餐',snack:'加餐'};
  const DEFAULT_MEAL_WINDOW = {lunchFrom:'11:20', dinnerFrom:'16:30', snackFrom:'22:00'};
  const MEAL_TYPE_LABEL = {breakfast:'早餐', lunch:'午餐', dinner:'晚餐', snack:'加餐'};
  const nutritionKeys = ['calories','protein','fat','carbs'];
  const nutritionPrecision = value => Math.max(0, Math.round(Number(value) * 100) / 100);
  /**
   * 每日体检评分（2026-11-03 重构）：训练不再计分，按证据强度给四项加权。
   * 热量 30（总摄入是体重管理的主变量）、蛋白质 30（保肌的第一优先级）、
   * 脂肪 20（最容易超的一项）、睡眠 20（恢复与食欲调节）。
   * 未记录的项不计入分母——缺数据不等于差，只报「已评 n/4」，避免半天空表也算低分。
   * Inputs are passed in so the rule engine can be tested without the app.
   */
  const DAILY_CHECK_WEIGHTS = {calories: 30, protein: 30, fat: 20, sleep: 20};
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
  const ESTIMATE_LIMITS = Object.freeze({items: 24, name: 120, grams: 20000, calories: 100000, macros: 1000, notes: 6, note: 160, draftId: 120});
  function goalLabel(goal) {
    // 与 40-targets 的 goalLabelOf / GOAL_LABEL 保持同一套文案：同一目标在能量卡与目标状态区不能出现两种写法。
    const map = {gain: '增肌', cut: '减脂', recomp: '增肌同时减脂', lean: '薄肌（线条）', maintain: '保持身材'};
    return map[String(goal || 'recomp')] || '饮食';
  }
  /** `clock` defaults to now. Both thresholds are inclusive lower bounds. */
  function defaultMealTypeFor(clock) {
    const value = clockPattern.test(clock) ? clock : nowClock();
    const {lunchFrom, dinnerFrom, snackFrom} = readMealWindow();
    if (value >= snackFrom) return 'snack';
    if (value >= dinnerFrom) return 'dinner';
    if (value >= lunchFrom) return 'lunch';
    return 'breakfast';
  }
  /** A time the user wrote in the description, e.g. "12:30 吃了…", "早上七点", "晚上". */
  function clockFromText(text) {
    const value = String(text || '');
    const explicit = value.match(/(\d{1,2})\s*[:：点时]\s*(\d{1,2})?/);
    if (explicit) {
      const before = value.slice(Math.max(0, explicit.index - 4), explicit.index);
      const hour = adjustHour(Number(explicit[1]), before);
      const minute = explicit[2] === undefined || explicit[2] === '' ? 0 : Number(explicit[2]);
      if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) return `${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')}`;
    }
    const spoken = value.match(/([一二两三四五六七八九十]{1,3})\s*[点时]/);
    if (spoken) {
      const before = value.slice(Math.max(0, spoken.index - 4), spoken.index);
      const hour = chineseHour(spoken[1]);
      if (hour !== null && hour <= 23) {
        const adjusted = adjustHour(hour, before);
        if (adjusted >= 0 && adjusted <= 23) return `${String(adjusted).padStart(2,'0')}:00`;
      }
    }
    if (/凌晨/.test(value)) return '05:00';
    if (/早上|早晨|早餐/.test(value)) return '07:30';
    if (/上午/.test(value)) return '10:00';
    if (/中午|午餐|午饭/.test(value)) return '12:30';
    if (/下午/.test(value)) return '15:30';
    if (/夜宵|宵夜|深夜/.test(value)) return '22:00';
    if (/晚上|晚餐|晚饭|傍晚/.test(value)) return '18:30';
    return null;
  }
  function defaultMealTime(photo, text, mealType) {
    const fromPhoto = photoWallClock(photo);
    if (fromPhoto) return {mealTime:fromPhoto, mealTimeSource:'photo'};
    const fromText = clockFromText(text);
    if (fromText) return {mealTime:fromText, mealTimeSource:'text'};
    return {mealTime:nowClock(), mealTimeSource:'now', typical:mealSlotClock[mealType] || null};
  }
  function mealTimeNote(meal) {
    const source = meal?.mealTimeSource;
    if (source === 'photo') return '默认取照片的拍摄时刻；如果实际进餐时间不同，请在这里改。';
    if (source === 'text') return '按描述里提到的时间填写；如果不对，请在这里改。';
    if (source === 'manual') return '已手动确认的进餐时间。';
    if (source === 'typical') return '没有拍摄时间，先按常见餐次时段填写；请确认真实时间。';
    return '没有拍摄/描述时间，先按记录时刻填写；请确认后保存。';
  }
  function sumMeals(meals, key) {return meals.length && meals.every(meal => number(meal[key]) !== null) ? meals.reduce((sum, meal) => sum + Number(meal[key]),0) : null;}
  function totalsFor(meals) {return Object.fromEntries(['calories','protein','fat','carbs'].map(key => [key,sumMeals(meals,key)]));}
  /** 17 点后没记午餐、21 点后没记晚餐 —— 提示「补一下」，并允许一键跳去记录。 */
  function missingMealSlots(date, now = new Date()) {
    const rows = (Array.isArray(state.meals) ? state.meals : []).filter(row => row && row.date === date);
    const minutes = row => {
      const m = /^(\d{1,2}):(\d{2})$/.exec(String(row.mealTime || ""));
      return m ? Number(m[1]) * 60 + Number(m[2]) : null;
    };
    const inWindow = (from, to) => rows.some(row => { const m = minutes(row); return m !== null && m >= from && m < to; });
    const hour = now.getHours();
    const missing = [];
    if (hour >= 17 && !inWindow(630, 900)) missing.push({key: "lunch", label: "午餐"});
    if (hour >= 21 && !inWindow(1020, 1380)) missing.push({key: "dinner", label: "晚餐"});
    return missing;
  }
  /** Canonical totals for the draft: line items plus the cooking oil that was estimated separately. */
  /** Carbs a row does not state but its calories imply; mirrors NutritionMath.inferredCarbs on the client. */
  function carbOfItem(item) {
    const carbs = number(item.carbs);
    if (carbs !== null && carbs > 0) return carbs;
    const kcal = number(item.calories), protein = number(item.protein) ?? 0, fat = number(item.fat) ?? 0;
    if (kcal === null) return carbs ?? 0;
    const rest = kcal - protein * 4 - fat * 9;
    return rest > 60 ? Math.round(rest / 4 * 10) / 10 : (carbs ?? 0);
  }
  function estimateTotals(items) {
    // A row can arrive with calories, protein and fat but no carbs; the preview must not show 0 carbs
    // for a 261 kcal bowl of rice. The saved record applies the same rule server-side.
    const patched = (items || []).map(item => ({...item, carbs: carbOfItem(item)}));
    const totals = totalsFor(patched);
    // 用油按菜归属后，油已经算在各菜的 calories/fat 里；只有旧草稿（菜里没有 oilGrams）才把整餐油再加一次。
    const itemsOil = (patched || []).reduce((sum, item) => sum + (number(item.oilGrams) || 0), 0);
    const oil = itemsOil > 0 ? 0 : (number(draft?.oilGrams) ?? 0);
    if (oil > 0) {
      totals.calories = (totals.calories ?? 0) + oil * 9;
      totals.fat = (totals.fat ?? 0) + oil;
    }
    return totals;
  }
  // Carbohydrate headroom left after protein and fat targets; null when targets are incomplete.
  function carbCap(p, range) {
    // calorieTarget can be empty on a temporary-target day; fall back to the day's range max so the
    // carbohydrate limit still renders instead of showing a dash.
    const kcal = number(p.calorieTarget) ?? number(range && range.max), protein = number(p.proteinMax), fat = number(p.fatMax);
    if (kcal === null || kcal <= 0) return null;
    const rest = kcal - (protein === null ? 0 : protein * 4) - (fat === null ? 0 : fat * 9);
    return rest > 0 ? Math.round(rest / 4) : null;
  }
function intakeRangeForDate(date = activeDate, profileOverride = null) {
    const profile = profileOverride || state?.profile || {}, rules = targetRules(profile);
    // 训练日只看动作（2026-11-18）：当天保存过训练动作就是训练日，不再读手填的训练情况。
    const trained = typeof trainedOn === 'function' ? !!trainedOn(date) : false;
    const useTraining = trained;
    const plan = computeTargets({
          sex: profile.sex,
          weight: number(profile.weight) ?? latestWeight(date),
          height: profile.height,
          age: profile.age,
          goal: profile.goal,
          applyGoalPresets: true,
          training: plannedSessions(),
          rules: profile
        });
    const active = plan && !plan.incomplete ? plan : null;
    const unset = !active;
    const trainingDay = active ? active.trainingDay : {min: rules.trainingDayMin, max: rules.trainingDayMax};
    const restDay = active ? active.restDay : {min: rules.restDayMin, max: rules.restDayMax};
    const basis = active
      ? `${goalLabel(profile.goal)}（按维持 ${active.tdee}${active.leanPlan ? ' 与有效缺口 ' + active.leanPlan.effectivePercent + '%' : ''}）`
      : '未测算：到「我的 → 身体档案与目标」补齐性别、身高、体重与年龄';
    return {
      min: useTraining ? trainingDay.min : restDay.min,
      max: useTraining ? trainingDay.max : restDay.max,
      trained,
      basis,
      unset,
      trainingDay,
      restDay,
      expectedWeeklyKg: active && Number.isFinite(active.expectedWeeklyKg) ? active.expectedWeeklyKg : null
    };
  }
  /**
   * Profile for a given date with the day's own budget applied: a training day uses the training-day
   * ceiling, a rest day (or an unrecorded day) uses the rest-day ceiling. The 口径 range is never
   * replaced by a single number — `intakeRange` is carried along for the UI to show.
   */
  function effectiveProfileForDate(date = activeDate) {
    const profile = {...(state?.profile || {})}, adjustment = targetAdjustmentForDate(date);
    // 临时目标要先并进 profile 再算区间：区间是最终口径，只改 calorieTarget 会被区间覆盖掉，
    // 「弹窗说调低了、第二天却没变」就是这么来的。
    if (adjustment) Object.assign(profile, adjustment.temporary);
    const baseRange = intakeRangeForDate(date, profile);
    // 覆盖逻辑放在 calc.js（可单测）；没有该文件时退回原区间。
    const range = adjustment && window.QinghengCalc && typeof window.QinghengCalc.applyTemporaryRange === 'function'
      ? window.QinghengCalc.applyTemporaryRange(baseRange, adjustment.temporary)
      : baseRange;
    // 区间与当日上限都以目标预设算出的结果为准，手填字段不再参与。
    // 未测算时不给占位数字当目标：calorieTarget 置空，页面显示「未测算」而不是 2150 这类假区间。
    profile.calorieTarget = range.unset ? null : range.max;
    profile.trainingDayMin = range.trainingDay.min;
    profile.trainingDayMax = range.trainingDay.max;
    profile.restDayMin = range.restDay.min;
    profile.restDayMax = range.restDay.max;
    // trained 一起带出去：页面上「按训练日 / 按休息日」只该看这个布尔值，
    // 不该去 basis 文本里找「训练」二字（有目标预设时 basis 讲的是口径，不写训练/休息）。
    profile.intakeRange = {min: range.min, max: range.max, basis: range.basis, trained: !!range.trained, unset: !!range.unset};
    return profile;
  }
  function isPackagedFood(item) {
    if (!item) return false;
    if (item.packaged === true) return true;
    const method = String(item.method || '').trim();
    if (PACKAGED_METHODS.includes(method)) return true;
    if (method && Object.prototype.hasOwnProperty.call(OIL_METHOD_FACTORS, method) && method !== '其他') return false;
    return PACKAGED_NAME_HINTS.test(String(item.name || ''));
  }
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
  function intakeConfidence(date = activeDate) {
    const history = Array.isArray(state.meals) ? state.meals : [];
    const meals = history.filter(row => row && row.date === date && number(row.calories) !== null);
    if (!meals.length) return {level: 'none', score: 0, reasons: ['今天还没有可用记录'], meals: 0, recordedDays: 0};
    let score = 100;
    const reasons = [];
    if (meals.length < 2) { score -= 25; reasons.push('今天只记了 ' + meals.length + ' 餐'); }
    const oilTracked = meals.filter(row => number(row.oilGrams) > 0 || row.oilIncluded === true).length;
    if (oilTracked === 0) { score -= 20; reasons.push('没有一处标了烹调用油'); }
    else if (oilTracked / meals.length < 0.5) { score -= 20; reasons.push('多数餐没标用油'); }
    const detailed = meals.filter(row => Array.isArray(row.items) && row.items.length > 0).length;
    if (detailed / meals.length < 0.5) { score -= 10; reasons.push('有一半餐只有总数、没有逐项'); }
    let recordedDays = 0;
    for (let offset = 0; offset < 7; offset++) {
      const day = typeof shiftDay === 'function' ? shiftDay(date, -offset) : date;
      if (history.some(row => row && row.date === day && number(row.calories) !== null)) recordedDays += 1;
    }
    if (recordedDays <= 2) { score -= 15; reasons.push('近 7 天只记了 ' + recordedDays + ' 天'); }
    else if (recordedDays <= 4) { score -= 8; reasons.push('近 7 天记了 ' + recordedDays + ' 天'); }
    score = Math.max(10, Math.min(100, score));
    // 只记了一餐就没有「一天」可言：无论分数多少都按低可信度处理。
    const level = meals.length < 2 ? 'low' : score >= 85 ? 'high' : score >= 60 ? 'medium' : 'low';
    return {level, score, reasons, meals: meals.length, recordedDays};
  }
  /** 只写本地缓存，不改界面。上限 60 天，滚动保留。 */
  function recordIntakeConfidence() {
    const confidence = intakeConfidence();
    if (!confidence || confidence.level === 'none') return confidence;
    try {
      const map = JSON.parse(localStorage.getItem(INTAKE_CONFIDENCE_KEY) || '{}') || {};
      map[activeDate] = {level: confidence.level, score: confidence.score, reasons: confidence.reasons.slice(0, 3)};
      const dates = Object.keys(map).sort();
      for (const old of dates.slice(0, Math.max(0, dates.length - 60))) delete map[old];
      localStorage.setItem(INTAKE_CONFIDENCE_KEY, JSON.stringify(map));
    } catch {}
    return confidence;
  }
  /** 按日期取可信度：当天现算，历史读缓存；取不到时返回 high（不参与扣分）。 */
  function intakeConfidenceLevelFor(date) {
    if (date === activeDate) return intakeConfidence(date).level;
    try {
      const map = JSON.parse(localStorage.getItem(INTAKE_CONFIDENCE_KEY) || '{}') || {};
      return (map[date] && map[date].level) || 'high';
    } catch { return 'high'; }
  }
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
  /**
   * Pure weekly review: current/previous seven-day summaries in, honest comparison out.
   * It never reads the network, never invents a score, and omits training for a no-training profile.
   */
  function buildWeeklyReview(input) {
    const src = input || {};
    const current = Array.isArray(src.currentDays) ? src.currentDays.slice(0, 7) : [];
    const previous = Array.isArray(src.previousDays) ? src.previousDays.slice(0, 7) : [];
    const weightOf = day => {
      const value = Number(day && day.weight);
      return Number.isFinite(value) && value > 0 ? value : null;
    };
    const numberOrNull = value => value === null || value === undefined || value === '' ? null : Number(value);
    const average = days => {
      const values = days.map(weightOf).filter(value => value !== null);
      return {count: values.length, mean: values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length * 10) / 10 : null};
    };
    const currentWeight = average(current), previousWeight = average(previous);
    const currentHasRecord = day => day && (day.hasMeal === true || weightOf(day) !== null || day.hasExercise === true || day.hasRecord === true);
    const recordedDays = current.filter(currentHasRecord).length;
    const mealDays = current.filter(day => day && day.hasMeal === true).length;
    const targetKnownDays = current.filter(day => {
      const min = numberOrNull(day && day.min), max = numberOrNull(day && day.max), calories = numberOrNull(day && day.calories);
      return Number.isFinite(min) && Number.isFinite(max) && Number.isFinite(calories);
    }).length;
    const targetDays = current.filter(day => {
      const min = numberOrNull(day && day.min), max = numberOrNull(day && day.max), calories = numberOrNull(day && day.calories);
      return Number.isFinite(min) && Number.isFinite(max) && Number.isFinite(calories) && calories >= min && calories <= max;
    }).length;
    const trainingDays = current.filter(day => day && day.hasExercise === true).length;
    const training = src.trainingEnabled === false ? null : {days: trainingDays};
    const comparable = currentWeight.count >= 2 && previousWeight.count >= 2;
    let action = '保持现在的记录节奏，下周同一时间再看。';
    if (!recordedDays) action = '上周还没有记录；下周先记两天，回看才有内容。';
    else if (currentWeight.count < 2) action = '固定两天早上称重，周均值才有参考。';
    else if (training && trainingDays === 0) action = '下周安排一次能完成的训练，不用补课。';
    else if (mealDays < 4) action = '下周先记满四天餐食，再看摄入和体重的关系。';
    else if (comparable) {
      const delta = Math.round((currentWeight.mean - previousWeight.mean) * 10) / 10;
      if (Math.abs(delta) >= 0.1) action = `体重周均值变化 ${delta >= 0 ? '+' : ''}${delta} kg；先保持现在的节奏。`;
    }
    return {
      enough: recordedDays > 0,
      rangeLabel: src.weekStart && src.weekEnd ? `${String(src.weekStart).slice(5)}–${String(src.weekEnd).slice(5)}` : '',
      recordedDays, mealDays, targetDays, targetKnownDays,
      weight: {
        currentMean: currentWeight.mean,
        previousMean: previousWeight.mean,
        currentCount: currentWeight.count,
        previousCount: previousWeight.count,
        comparable,
        delta: comparable ? Math.round((currentWeight.mean - previousWeight.mean) * 10) / 10 : null
      },
      training,
      action
    };
  }
  function weeklyDaySummary(date) {
    const meals = (state.meals || []).filter(row => row && row.date === date);
    const habit = habitRowFor(date) || {};
    const measurement = measurementRowFor(date) || {};
    const exercises = exercisesFor(date);
    const range = intakeRangeForDate(date);
    const calories = meals.length ? totalsFor(meals).calories : null;
    return {
      date,
      weight: number(measurement.weight),
      hasMeal: meals.length > 0,
      calories,
      min: range && !range.unset ? number(range.min) : null,
      max: range && !range.unset ? number(range.max) : null,
      hasExercise: exercises.some(item => item && String(item.name || '').trim()),
      hasRecord: meals.length > 0 || number(measurement.weight) !== null || number(habit.sleep) !== null ||
        number(habit.steps) !== null || number(habit.water) !== null || exercises.length > 0
    };
  }
