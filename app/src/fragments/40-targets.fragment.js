/* Fragment of assets/app.js -- assembled by tools/assemble-app.ps1 in filename order.
 * Edit this file, never the generated assets/app.js; tests/app-fragments.test.mjs fails on drift. */
  const TARGET_RULES = {
    deficitCapPercent: 20,    // 缺口不超过维持热量的 20%
    fatFloorG: 50,            // 脂肪下限：低于此影响激素水平
    fatIdealMinG: 55,
    fatIdealMaxG: 70,
    trainingDayMin: 2150,     // 未测算时的占位区间，不再充当任何目标的固定地板
    trainingDayMax: 2350,
    restDayMin: 2000,
    restDayMax: 2150
  };
  /**
   * Goal presets: the deficit each goal plans (negative = surplus) and the protein band it needs.
   * 蛋白带由目标直接决定；缺口上限仍是唯一硬约束，不再有 2000 kcal 的统一地板。
   *
   * additions 2026-11-18（口径来自 docs/design/27-evidence-requirements.md）：
   *  - muscleSetsPerWeek：每个大肌群每周的正式组范围（Schoenfeld 2017 剂量-反应；Baz-Valle 2022 综述）
   *  - rir：离力竭留几次（RIR），ACSM 2026 综述与 Refalo 2023 都指向「接近力竭」比绝对重量更关键
   *  - reps：每组次数范围（6~30 次在同等努力下增肌差异小，Schoenfeld 2021）
   *  - ratePctPerWeek：每周体重变化目标（减脂 0.5~1%；增肌 0.25~0.5%）
   */
  const GOAL_PRESETS = {
    gain:     {deficitPercent: -10, proteinPerKgMin: 1.6, proteinPerKgMax: 2.2, muscleSetsPerWeek: [14, 20], rir: [1, 3], reps: [6, 12], ratePctPerWeek: [0.25, 0.5]},
    recomp:   {deficitPercent: 8,   proteinPerKgMin: 2.0, proteinPerKgMax: 2.4, muscleSetsPerWeek: [10, 16], rir: [1, 2], reps: [6, 15], ratePctPerWeek: [0, 0.25]},
    cut:      {deficitPercent: 18,  proteinPerKgMin: 2.3, proteinPerKgMax: 2.6, muscleSetsPerWeek: [10, 16], rir: [1, 2], reps: [6, 15], ratePctPerWeek: [0.5, 1]},
    maintain: {deficitPercent: 0,   proteinPerKgMin: 1.6, proteinPerKgMax: 2.0, muscleSetsPerWeek: [10, 16], rir: [2, 3], reps: [6, 15], ratePctPerWeek: [0, 0.25]},
    lean:     {deficitPercent: 12,  proteinPerKgMin: 2.2, proteinPerKgMax: 2.6, muscleSetsPerWeek: [12, 18], rir: [1, 2], reps: [8, 15], ratePctPerWeek: [0.5, 0.7]}
  };
  // 只有这四个仍允许口径覆盖；训练日/休息日区间永远由目标预设算，避免第二套口径。
  const RULE_KEYS = ['deficitCapPercent', 'fatFloorG', 'fatIdealMinG', 'fatIdealMaxG'];
  /** 每周训练天数只认「记录→训练计划」的偏好；老档案里的 training 仅作兜底。 */
  function plannedSessions() {
    try {
      const raw = localStorage.getItem("qingheng.planPrefs");
      const prefs = raw ? JSON.parse(raw) : null;
      const days = number(prefs && prefs.days);
      if (days !== null && days > 0) return days;
    } catch { }
    const legacy = number(state && state.profile ? state.profile.training : null);
    return legacy !== null && legacy > 0 ? legacy : null;
  }

  /** Weekly strength sessions -> activity factor. Unset is NOT the same as sedentary. */
  function activityFactorFor(sessions) {
    const s = Number(sessions);
    if (!Number.isFinite(s) || s <= 0) return 1.2;
    return s >= 6 ? 1.725 : s >= 4 ? 1.55 : s >= 2 ? 1.375 : 1.2;
  }
  function targetRules(overrides) {
    const rules = {...TARGET_RULES};
    for (const key of RULE_KEYS) {
      const value = number(overrides && overrides[key]);
      if (value !== null && value > 0) rules[key] = value;
    }
    return rules;
  }
  /** 目标中文名：口径行与警告共用界面那份标签（GOAL_LABEL 在本片段后段定义，函数调用时已初始化）。 */
  function goalLabelOf(goal) {
    return {gain: '增肌', cut: '减脂', recomp: '增肌同时减脂', maintain: '保持身材', lean: '薄肌（线条）'}[goal] || '饮食';
  }
  /**
   * Mifflin-St Jeor BMR -> activity TDEE -> intake ranges straight from the user's own 口径.
   *
   * Two things this deliberately does NOT do: pick a silent default for a missing age, or treat an
   * unanswered training frequency as sedentary. Missing input is reported instead of guessed, and an
   * unset training frequency yields a provisional result that says which factor it assumed.
   */
  function computeTargets(input) {
    const {sex = '', weight, height, age, goal = ''} = input;
    const rules = targetRules(input.rules);
    const w = number(weight), h = number(height), a = number(age);
    const missing = [];
    if (!(w > 0)) missing.push('体重');
    if (!(h > 0)) missing.push('身高');
    if (!(a > 0)) missing.push('年龄');
    // 性别决定 BMR 的常数项（+5 / −161），缺省按男性算会让整条能量链偏高约 160 kcal；
    // 宁可报缺，也不静默替用户选一个。
    if (sex !== 'male' && sex !== 'female') missing.push('性别');
    if (missing.length) {
      return {
        incomplete: true, missing, goal: goal,
        lines: [`还缺 ${missing.join('、')}，补齐后才能测算目标（不猜默认值）。`]
      };
    }
    const rawTraining = input.training;
    // "不健身" is an answer, not a missing value: it means sedentary, and it must not be called unset.
    const trainingOff = String(rawTraining) === 'none';
    const trainingUnset = !trainingOff && (rawTraining === null || rawTraining === undefined || rawTraining === '');
    const sessions = trainingUnset || trainingOff ? 0 : Number(rawTraining);
    const factor = activityFactorFor(sessions);
    const bmr = Math.round(10 * w + 6.25 * h - 5 * a + (sex === 'female' ? -161 : 5));
    const tdee = Math.round(bmr * factor);
    // 2000 kcal 的统一地板已删除：区间只由目标预设、缺口上限与用户自定义区间决定。
    if (!GOAL_PRESETS[goal]) { return { incomplete: true, missing: [...missing, '饮食目标'], lines: ['还缺 饮食目标，补齐后才能测算目标（不猜默认值）。'] }; }
    const preset = GOAL_PRESETS[goal];
    const cap = rules.deficitCapPercent;
    const deficitOf = value => Math.round((tdee - value) / tdee * 1000) / 10;
    // 每周训练天数决定碳循环的加权；未填训练计划时仍按 4 练 3 休估算并标注 provisional。
    const weeklyTrainDays = trainingUnset ? 4 : Math.max(0, Math.min(7, sessions));

    let trainingDay = {min: rules.trainingDayMin, max: rules.trainingDayMax};
    let restDay = {min: rules.restDayMin, max: rules.restDayMax};
    let leanPlan = null;
    if (goal === 'lean') {
      // 薄肌走碳循环：训练日贴近维持，缺口放在休息日。
      const centre = tdee * (1 - Math.min(preset.deficitPercent, cap) / 100);
      // 训练日的上调由休息日的下调抵消：无论每周几练，周均都落在计划缺口上。
      const lift = weeklyTrainDays >= 7 ? 0 : 0.03;
      const restDrop = weeklyTrainDays > 0 && weeklyTrainDays < 7 ? Math.min(0.08, lift * weeklyTrainDays / (7 - weeklyTrainDays)) : 0;
      const trainMid = Math.round(centre * (1 + lift));
      const restMid = Math.round(centre * (1 - restDrop));
      trainingDay = {min: Math.round(trainMid * 0.98), max: Math.round(trainMid * 1.05)};
      restDay = {min: Math.round(restMid * 0.97), max: Math.round(restMid * 1.02)};
      leanPlan = {plannedPercent: preset.deficitPercent};
    }
    // non-lean goal ranges：区间只按目标预设算，不再接受手填的日区间覆盖。
    if (goal !== 'lean') {
      const gap = preset.deficitPercent;
      const centre = Math.round(tdee * (1 - Math.min(gap, cap) / 100));
      trainingDay = {min: Math.round(centre * 0.98), max: Math.round(centre * 1.04)};
      restDay = {min: Math.round(centre * 0.95), max: Math.round(centre * 1.01)};
    }
    const proteinPerKgMin = preset.proteinPerKgMin;
    const proteinPerKgMax = preset.proteinPerKgMax;
    const proteinMin = Math.round(w * proteinPerKgMin);
    const proteinMax = Math.round(w * proteinPerKgMax);
    const proteinMid = Math.round(w * (proteinPerKgMin + proteinPerKgMax) / 2);
    const fatMin = Math.round(Math.max(rules.fatFloorG, rules.fatIdealMinG));
    const fatMax = Math.round(Math.max(fatMin, rules.fatIdealMaxG));
    const fatMid = Math.round((fatMin + fatMax) / 2);
    const budget = trainingDay.max;
    const carbs = Math.max(0, Math.round((budget - proteinMid * 4 - fatMid * 9) / 4));
    const trainingDeficit = deficitOf(trainingDay.max);
    const restDeficit = deficitOf(restDay.max);
    // 周均与预期速率按区间中值算：薄肌的「有效缺口」与周均不再出现两个口径。
    const weeklyAverage = Math.round((((trainingDay.min + trainingDay.max) / 2) * weeklyTrainDays + ((restDay.min + restDay.max) / 2) * (7 - weeklyTrainDays)) / 7);
    const weeklyAverageDeficit = deficitOf(weeklyAverage);
    if (leanPlan) {
      leanPlan.effectivePercent = Math.max(0, weeklyAverageDeficit);
      leanPlan.weeklyLoss = Math.round(leanPlan.effectivePercent / 100 * tdee * 7 / 7700 * 100) / 100;
      leanPlan.lossRatePercent = w > 0 ? Math.round(leanPlan.weeklyLoss / w * 1000) / 10 : null;
      leanPlan.fatPerMonth = Math.round(leanPlan.weeklyLoss * 4.3 * 10) / 10;
    }
    const warnings = [];
    // 不再把低目标抬到 2000：低于常见安全区间只提示，不改用户的目标数字。
    const safety = sex === 'female' ? 1200 : 1500;
    if (trainingDay.max < safety) warnings.push(`训练日目标上限 ${trainingDay.max} kcal 低于常见安全下限 ${safety} kcal：请复核体重、目标与缺口；App 不再自动抬到 2000`);
    if (trainingDeficit > cap) warnings.push(`训练日缺口 ${trainingDeficit}% 超过口径上限 ${cap}%；要么降目标，要么把缺口上限调高并说明理由`);
    if (restDeficit > cap) warnings.push(`休息日缺口 ${restDeficit}% 超过口径上限 ${cap}%`);
    if (trainingDeficit < 0) warnings.push(`训练日目标上限比维持热量高 ${Math.abs(trainingDeficit)}%（盈余）`);
    if (goal === 'cut' && trainingDeficit <= 0) warnings.push('目标是减脂，但当前区间不低于维持热量，减脂期不会有效果');
    if (goal === 'gain' && trainingDeficit > 10) warnings.push('目标是增肌，但当前缺口偏大，增肌原料可能不足');
    if (fatMin < 40) warnings.push('脂肪下限低于 40 g 会影响激素水平（口径：≥ 50 g，理想 55~70 g）');
    if (trainingUnset) warnings.push('还没有训练计划：暂按久坐（系数 1.2）估算；到「记录→训练计划」保存每周天数后重新测算更准');
    if (leanPlan) {
      if (leanPlan.effectivePercent < 8) warnings.push(`有效缺口只有 ${leanPlan.effectivePercent}%，线条变化会很慢（每月约 -${leanPlan.fatPerMonth} kg 脂肪）；可以延长周期或提高维持热量`);
      if (leanPlan.lossRatePercent !== null && leanPlan.lossRatePercent > 0.7) warnings.push(`每周减重 ${leanPlan.lossRatePercent}% 体重，超过保肌的安全上限 0.5~0.7%/周；薄肌要慢，快减必掉肌肉`);
    }
    // 目标对应的训练要求（2026-11-18）：每个大肌群的周组数、每组的次数区间、离力竭留几次。
    // 数字与 docs/design/27-evidence-requirements.md 同一张表，改一处必须同改。
    const trainingTargets = {
      muscleSetsPerWeek: preset.muscleSetsPerWeek,
      reps: preset.reps,
      rir: preset.rir,
      sessions: {min: 3, max: 6}
    };
    const ratePctPerWeek = preset.ratePctPerWeek;
    const {weeklyLossFromRate} = (() => {
      const expected = Math.round(((tdee - weeklyAverage) * 7 / 7700) * 100) / 100;
      return {weeklyLossFromRate: w > 0 ? Math.round(Math.abs(expected) / w * 1000) / 10 : null};
    })();
    if (ratePctPerWeek && weeklyLossFromRate !== null) {
      const [lo, hi] = ratePctPerWeek;
      if (weeklyLossFromRate > hi) warnings.push(`按当前区间推算每周变化 ${weeklyLossFromRate}% 体重，高于「${goalLabelOf(goal)}」的 ${lo}~${hi}%/周：把缺口调小或延长周期`);
      if (weeklyLossFromRate < lo && (goal === 'cut' || goal === 'lean')) warnings.push(`按当前区间推算每周变化 ${weeklyLossFromRate}% 体重，低于 ${lo}%/周：线条变化会很慢，可以延长周期`);
    }
    const lines = [
      `维持热量（TDEE）：约 ${tdee} kcal／天（基础代谢 ${bmr} × 活动系数 ${factor}${trainingOff ? '（不健身）' : trainingUnset ? '（没有训练计划，按久坐）' : `，按每周 ${sessions} 次训练`}）`,
      `目标摄入：训练日 ${trainingDay.min}~${trainingDay.max} kcal／天；休息日 ${restDay.min}~${restDay.max} kcal／天（周均 ${weeklyAverage}，相当于缺口 ${weeklyAverageDeficit}%）`,
      `与维持热量相比：训练日缺口 ${trainingDeficit}%，休息日缺口 ${restDeficit}%（口径：缺口 ≤ 维持的 ${cap}%）`,
      `蛋白质：${proteinMin}~${proteinMax} g（${proteinPerKgMin}~${proteinPerKgMax} g/kg，按目标）· 脂肪：${fatMin}~${fatMax} g（不低于 ${rules.fatFloorG} g）`,
      `碳水：约 ${carbs} g（按训练日上限 ${budget} kcal 推算剩余热量）`,
      `训练要求（${goalLabelOf(goal)}）：每个大肌群 ${trainingTargets.muscleSetsPerWeek[0]}~${trainingTargets.muscleSetsPerWeek[1]} 组/周 · 每组 ${trainingTargets.reps[0]}~${trainingTargets.reps[1]} 次 · RIR ${trainingTargets.rir[0]}~${trainingTargets.rir[1]}（离力竭留几次）`,
      `体重速率：每周 ${ratePctPerWeek[0]}~${ratePctPerWeek[1]}%（约 ${Math.round(w * ratePctPerWeek[0] / 100 * 100) / 100}~${Math.round(w * ratePctPerWeek[1] / 100 * 100) / 100} kg），按当前区间推算约 ${weeklyLossFromRate}%`
    ];
    if (leanPlan) {
      // 提高维持热量是唯一不碰口径的加速杠杆。
      const altFactor = activityFactorFor(4);
      const altTdee = Math.round(bmr * altFactor);
      const altTarget = Math.round(altTdee * (1 - Math.min(preset.deficitPercent, cap) / 100));
      lines.push(
        `训练频率杠杆：3 次/周（系数 ${activityFactorFor(3)}）→ 维持 ${Math.round(bmr * activityFactorFor(3))}；4 次/周（系数 ${altFactor}）→ 维持约 ${altTdee}，12% 缺口目标约 ${altTarget} kcal`
      );
      lines.push(
        `薄肌（线条）路径：计划缺口 ${leanPlan.plannedPercent}%，实际按 ${leanPlan.effectivePercent}% 执行 → 预计每周 -${leanPlan.weeklyLoss} kg（约 ${leanPlan.fatPerMonth} kg 脂肪/月，占体重 ${leanPlan.lossRatePercent}%）`,
        `体脂跑道：10~15% 可见腹肌仅为媒体参考（受脂肪分布、光线、水合影响），不可靠。按当前速度每减 1 kg 脂肪约 ${leanPlan.weeklyLoss > 0 ? Math.round(1 / leanPlan.weeklyLoss) : '—'} 周，2 kg 约 ${leanPlan.weeklyLoss > 0 ? Math.round(2 / leanPlan.weeklyLoss) : '—'} 周`
      );
    }
    return {
      incomplete: false, goal, rules, preset,
      bmr, factor, tdee, sessions, trainingUnset,
      trainingDay, restDay, cap,
      proteinMin, proteinMax, proteinMid, proteinPerKgMin, proteinPerKgMax,
      fatMin, fatMax, fatMid, carbs, budget,
      trainingDeficit, restDeficit, weeklyAverage, weeklyAverageDeficit,
      // 1 kg of fat is ~7700 kcal, so the weekly gap converts to a rate the trend can grade against.
      expectedWeeklyKg: Math.round(((tdee - weeklyAverage) * 7 / 7700) * 100) / 100,
      trainingTargets, ratePctPerWeek, weeklyRatePercent: weeklyLossFromRate,
      leanPlan,
      warnings,
      provisional: trainingUnset,
      trainingOff,
      lines
    };
  }
  const GOAL_LABEL = {gain: '增肌', cut: '减脂', recomp: '增肌同时减脂', maintain: '保持身材', lean: '薄肌（线条）'};
  /** 每个目标的实际口径：缺口/盈余、蛋白带与节奏，和 computeTargets 使用同一组数字。 */
  // 文案必须是 GOAL_PRESETS 的镜像：以前这里写 8% / 2.0~2.2，与预设的 10% / 1.6~2.2 不一致，
  // 用户按页面做和按 AI 做会得到两套方案。改预设时必须同改这里（tests/goal-requirements 守着）。
  const GOAL_HINTS = {
    gain: '热量比维持高 10%，蛋白 1.6~2.2 g/kg；体重常见 +0.25~0.5%/周，涨秤会带一点脂肪。',
    recomp: '小幅缺口 8%，蛋白 2.0~2.4 g/kg；体重可能缓降或不动，围度变化更慢。',
    cut: '缺口 18%，蛋白 2.3~2.6 g/kg；常见 −0.5~1%/周，降太快容易掉肌肉。',
    lean: '缺口 12% 碳循环：训练日接近维持、休息日吃缺口；蛋白 2.2~2.6 g/kg，每周 −0.5~0.7%，8~12 周一阶段。',
    maintain: '按维持热量吃，蛋白 1.6~2.0 g/kg；体重目标稳定在 0~+0.25%/周。'
  };
  /** Onboarding values -> computeTargets input. 训练天数统一取「记录→训练计划」的偏好。 */
  function targetInputFrom(values) {
    return {
      sex: values.sex,
      weight: values.weight,
      height: values.height,
      age: values.age,
      goal: values.goal,
      training: plannedSessions(),
      rules: values.rules
    };
  }
  /** 体重取「那天及以前」的最后一次测量：补记旧日期时不能用今天的体重重算旧目标。 */
  function latestWeight(date = null) {
    const rows = (state.measurements || []).filter(row => number(row.weight) !== null && validDate(row.date) && (!date || row.date <= date)).sort((a, b) => a.date.localeCompare(b.date));
    return rows.length ? rows[rows.length - 1].weight : null;
  }
  /** Reads the 口径 overrides currently typed into the profile form. */
  function ruleOverridesFrom(form) {
    const rules = {};
    for (const key of RULE_KEYS) {
      const field = form.elements[key];
      if (!field) continue;
      const value = number(field.value);
      if (value !== null && value > 0) rules[key] = value;
    }
    return rules;
  }
  /** Reads the profile form into the raw input computeTargets expects (no silent defaults). */
  function profileTargetInput(form, options = {}) {
    const weightField = number(form.elements.weight.value);
    return {
      sex: form.elements.sex.value,
      height: form.elements.height.value,
      weight: weightField !== null ? weightField : latestWeight(),
      age: form.elements.age.value,
      goal: form.elements.goal.value,
      training: plannedSessions(),
      rules: ruleOverridesFrom(form)
    };
  }
  /**
   * Real maintenance calories from the user's own log: mean intake minus the energy implied by the
   * weight change over the same window. This is the only maintenance number that is not an estimate.
   *
   * Deliberately works on dates that actually have records (no "today minus N days" arithmetic), so a
   * timezone or a gap in logging cannot silently shift the window.
   */
  function calibratedTdee(maxDays = 21) {
    const meals = Array.isArray(state.meals) ? state.meals : [];
    const byDay = new Map();
    const countByDay = new Map();
    for (const meal of meals) {
      const date = String(meal.date || '');
      if (!validDate(date)) continue;
      const kcal = number(meal.calories);
      if (kcal === null) continue;
      byDay.set(date, (byDay.get(date) || 0) + kcal);
      countByDay.set(date, (countByDay.get(date) || 0) + 1);
    }
    const allDays = [...byDay.keys()].sort().slice(-maxDays);
    if (allDays.length < 14) {
      return {ok: false, reason: `有热量的记录只有 ${allDays.length} 天，至少需要 14 天`};
    }
    // 校准分账：只把「那天吃得基本记全」的日子纳入平均摄入。
    // 只记一两餐的日子会把平均摄入拉低，最后被读成「代谢低」——那其实是少记，不是代谢。
    // 完整日门槛按这个人自己的中位餐数算（0.8 倍，至少 1 餐），一天只吃一顿的人也不会被误杀。
    const counts = allDays.map(date => countByDay.get(date) || 1).sort((a, b) => a - b);
    const typicalMeals = counts[Math.floor(counts.length / 2)];
    const completeFloor = Math.max(1, Math.ceil(typicalMeals * 0.8));
    const intakeDays = allDays.filter(date => (countByDay.get(date) || 1) >= completeFloor);
    const skippedDays = allDays.length - intakeDays.length;
    if (intakeDays.length < 14) {
      return {ok: false, reason: `记录基本完整的天只有 ${intakeDays.length} 天（另有 ${skippedDays} 天只记了一部分），至少需要 14 天`};
    }
    const from = intakeDays[0], to = intakeDays[intakeDays.length - 1];
    const points = (Array.isArray(state.measurements) ? state.measurements : [])
      .filter(row => validDate(String(row.date)) && number(row.weight) !== null && String(row.date) >= from && String(row.date) <= to)
      .map(row => ({date: String(row.date), weight: number(row.weight)}))
      .sort((a, b) => a.date.localeCompare(b.date));
    if (points.length < 2) {
      return {ok: false, reason: `窗口内只有 ${points.length} 次体重记录，至少需要 2 次`};
    }
    const spanDays = Math.max(1, Math.round((Date.parse(points[points.length - 1].date) - Date.parse(points[0].date)) / 86400000));
    const deltaKg = points[points.length - 1].weight - points[0].weight;
    // 只加完整日的摄入：以前把「只吃了一餐的那天」也当整天算，等于替用户少算热量。
    const meanIntake = intakeDays.reduce((sum, date) => sum + (byDay.get(date) || 0), 0) / intakeDays.length;
    const tdee = Math.round(meanIntake - deltaKg * 7700 / spanDays);
    return {
      ok: true,
      tdee,
      meanIntake: Math.round(meanIntake),
      deltaKg: Math.round(deltaKg * 10) / 10,
      spanDays,
      days: intakeDays.length,
      skippedDays,
      typicalMeals,
      completeFloor,
      from, to
    };
  }
  /**
   * 薄肌 is an 8~12 week block, not a permanent setting. The start date is stamped when the goal is
   * saved, and the plan says which week it is and when to review.
   */
  function leanPhase(goal, startedAt) {
    if (goal !== 'lean') return null;
    const start = validDate(String(startedAt || '')) ? String(startedAt) : '';
    if (!start) return {weeks: 0, start: null, due: false, text: '薄肌是 8~12 周一个阶段：保存档案后开始计时。'};
    const days = Math.max(0, Math.round((Date.parse(localDate()) - Date.parse(start)) / 86400000));
    const weeks = Math.floor(days / 7) + 1;
    return {
      weeks, start, due: weeks >= 8,
      text: weeks >= 8
        ? `薄肌阶段第 ${weeks} 周（起点 ${start}），已满 8 周：用实测维持热量重算，并考虑安排 1~2 周维持或换阶段`
        : `薄肌阶段第 ${weeks} 周（起点 ${start}），第 8~12 周复盘`
    };
  }
  /** Writes computed targets back into the profile form and reports the basis. */
  async function recalcProfileTargets(options = {}) {
    const form = $('#profile-form');
    const status = $('#profile-target-status');
    const input = profileTargetInput(form, options);
    const result = computeTargets(input);
    if (result.incomplete) {
      status.className = 'target-status empty';
      status.textContent = result.lines.join('\n');
      return result;
    }
    // The saved number is the rest-day ceiling; the training-day range is shown alongside it so a
    // single figure is never mistaken for "the" target.
    form.elements.calorieTarget.value = result.trainingDay.max;
    form.elements.referenceCalories.value = result.tdee;
    form.elements.proteinMin.value = result.proteinMin;
    form.elements.proteinMax.value = result.proteinMax;
    form.elements.fatMin.value = result.fatMin;
    form.elements.fatMax.value = result.fatMax;
    // The formula TDEE is a starting point; the log-derived one is what the plan should trust.
    const calibration = calibratedTdee();
    const gapKcal = calibration.ok ? calibration.tdee - result.tdee : 0;
    const gapPercent = calibration.ok && result.tdee > 0 ? Math.round(Math.abs(gapKcal) / result.tdee * 100) : 0;
    const calibrationLine = calibration.ok
      ? `实测维持热量：约 ${calibration.tdee} kcal（${calibration.days} 天完整记录，平均摄入 ${calibration.meanIntake}，${calibration.spanDays} 天体重变化 ${calibration.deltaKg} kg`
        + (calibration.skippedDays > 0 ? `；另有 ${calibration.skippedDays} 天只记了一部分，未计入` : '') + '）'
        + (gapPercent >= 10
          ? `；与公式值 ${result.tdee} 相差 ${gapKcal > 0 ? '+' : ''}${gapKcal} kcal（${gapPercent}%）——差这么多通常是摄入记录不全（少记了油、零食或饮料），先补全几天的记录再决定信哪个`
          : Math.abs(gapKcal) >= 120 ? `；与公式值 ${result.tdee} 相差 ${gapKcal > 0 ? '+' : ''}${gapKcal} kcal，以实测为准` : '；与公式值一致')
      : `还测不出实测维持热量：${calibration.reason}（记录满 2~3 周再回来看）`;
    status.className = 'target-status';
    const phase = leanPhase(result.goal, state.profile && state.profile.leanPhaseStartedAt);
    status.textContent = [options.auto ? '已按当前选择自动重算（未保存，点「保存档案」生效）：' : '已按「' + (GOAL_LABEL[result.goal] || '增肌同时减脂') + '」与你的口径测算：']
      .concat(result.lines)
      .concat(phase ? [phase.text] : [])
      .concat([calibrationLine])
      .concat(result.warnings.map(text => '⚠ ' + text))
      .concat(['这是起点而非结论，用 2~4 周真实记录校准更可靠。'])
      .join('\n');
    // Weight doubles as the first measurement so the trend chart has a starting point.
    if (options.saveMeasurement !== false && number(input.weight) !== null) {
      const today = localDate();
      const exists = (state.measurements || []).some(row => row.date === today && number(row.weight) !== null);
      if (!exists) {
        try {await api('/api/measurements', {date: today, weight: number(input.weight)});}
        catch {notice('目标已测算，但体重起始记录保存失败；可稍后手动补记。', true);}
      }
    }
    return result;
  }
  /**
   * Changing weekly training frequency (or the goal) changes TDEE, so every derived target is
   * recalculated at once: calorie ranges, protein, fat, carbs and the weekly average. Nothing is
   * written until 保存档案, and the status line says so.
   */
  function installProfileAutoRecalc() {
    const form = $('#profile-form');
    if (!form) return;
    const fields = ['goal', 'weight', 'height', 'age'];
    form.addEventListener('change', event => {
      const name = event.target && event.target.name;
      if (!fields.includes(name)) return;
      recalcProfileTargets({saveMeasurement: false, auto: true}).catch(() => {});
    });
  }
  async function persistProfile(extra) {
    const form = $('#profile-form');
    const goal = form.elements.goal.value;
    // 区间随档案一起落库，原生层的问答/推送上下文才能拿到同一套目标。
    const plan = computeTargets(profileTargetInput(form));
    const payload = {
      sex: form.elements.sex.value,
      height: number(form.elements.height.value),
      age: number(form.elements.age.value),
      goal,
      // Stamping the start date here is what makes the 8~12 week review possible at all.
      ...(goal === 'lean' && !(state.profile && state.profile.leanPhaseStartedAt) ? {leanPhaseStartedAt: localDate()} : {}),
      training: plannedSessions(),
      ...(plan && !plan.incomplete ? {
        trainingDayMin: plan.trainingDay.min, trainingDayMax: plan.trainingDay.max,
        restDayMin: plan.restDay.min, restDayMax: plan.restDay.max
      } : {}),
      ...ruleOverridesFrom(form),
      ...extra
    };
    for (const key of ['calorieTarget', 'referenceCalories', 'proteinMin', 'proteinMax', 'fatMin', 'fatMax']) {
      const value = number(form.elements[key].value);
      if (value !== null) payload[key] = value;
    }
    return api('/api/profile', payload);
  }
