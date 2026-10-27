/* Fragment of assets/app.js -- assembled by tools/assemble-app.ps1 in filename order.
 * Edit this file, never the generated assets/app.js; tests/app-fragments.test.mjs fails on drift. */
  const TARGET_RULES = {
    intakeFloor: 2000,        // 日摄入硬底线 kcal
    deficitCapPercent: 20,    // 缺口不超过维持热量的 20%
    proteinPerKgMin: 2.0,     // g/kg
    proteinPerKgMax: 2.2,
    fatFloorG: 50,            // 脂肪下限：低于此影响激素水平
    fatIdealMinG: 55,
    fatIdealMaxG: 70,
    trainingDayMin: 2150,     // 训练日摄入区间
    trainingDayMax: 2350,
    restDayMin: 2000,         // 休息日摄入区间
    restDayMax: 2150
  };
  /**
   * Goal presets: the deficit each goal plans (negative = surplus) and the protein band it needs.
   * Presets live *inside* the 口径 — the intake floor and the deficit cap still win, and a plan that
   * cannot fit is reported instead of silently trimmed.
   */
  const GOAL_PRESETS = {
    gain:     {deficitPercent: -8, proteinPerKgMin: 2.0, proteinPerKgMax: 2.2},
    recomp:   {deficitPercent: 8,  proteinPerKgMin: 2.0, proteinPerKgMax: 2.2},
    cut:      {deficitPercent: 18, proteinPerKgMin: 2.2, proteinPerKgMax: 2.4},
    maintain: {deficitPercent: 0,  proteinPerKgMin: 1.6, proteinPerKgMax: 2.0},
    lean:     {deficitPercent: 12, proteinPerKgMin: 2.2, proteinPerKgMax: 2.4}
  };
  const RULE_KEYS = Object.keys(TARGET_RULES);
  /** 蛋白区间按缺口幅度分档（ISSN 2017：缺口期 2.3~3.1，越大越靠上限）。 */
  function proteinBandFor(goal, gapPercent) {
    if (goal === 'maintain') return {min: 1.6, max: 2.0};
    const gap = Math.abs(Number(gapPercent) || 0);
    if (gap < 10) return {min: 2.0, max: 2.2};
    if (gap <= 20) return {min: 2.3, max: 2.5};
    return {min: 2.5, max: 2.8};
  }
  /** 增肌盈余按训练年限分级。 */
  function surplusForYears(years) {
    const y = Number(years);
    if (!Number.isFinite(y) || y <= 0) return 8;
    if (y < 1) return 10;
    if (y <= 3) return 8;
    return 5;
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
    const floor = rules.intakeFloor;
    // Goal presets: the deficit each goal plans and the protein band it needs. The 口径 stays a hard
    // constraint — a preset can never push intake below the floor or past the deficit cap.
    if (!GOAL_PRESETS[goal]) { return { incomplete: true, missing: [...missing, '饮食目标'], lines: ['还缺 饮食目标，补齐后才能测算目标（不猜默认值）。'] }; }
    const preset = GOAL_PRESETS[goal];
    const cap = rules.deficitCapPercent;
    const deficitOf = value => Math.round((tdee - value) / tdee * 1000) / 10;

    let trainingDay = {min: Math.max(floor, rules.trainingDayMin), max: Math.max(floor, rules.trainingDayMax)};
    let restDay = {min: Math.max(floor, rules.restDayMin), max: Math.max(floor, rules.restDayMax)};
    let proteinPerKgMin = rules.proteinPerKgMin;
    let proteinPerKgMax = rules.proteinPerKgMax;
    let leanPlan = null;
    if (goal === 'lean') {
      // The floor is what usually binds: a 2,157 kcal maintenance with a 2,000 kcal floor allows at most
      // a ~7% deficit, so the plan must say so instead of pretending a 12% cut is available.
      const floorPercent = Math.max(0, Math.round((tdee - floor) / tdee * 1000) / 10);
      const centre = tdee * (1 - Math.min(preset.deficitPercent, cap) / 100);
      // A thin look is carb-cycled: train near maintenance, take the deficit on rest days. The floor then
      // decides how much deficit is actually available, which is the number worth reporting.
      const trainMid = Math.max(floor + 20, Math.round(centre * 1.03));
      const restMid = Math.max(floor, Math.round(centre * 0.96));
      trainingDay = {min: Math.max(floor, Math.round(trainMid * 0.98)), max: Math.max(floor, Math.round(trainMid * 1.05))};
      restDay = {min: Math.max(floor, Math.round(restMid * 0.97)), max: Math.max(floor, Math.round(restMid * 1.02))};
      proteinPerKgMin = Math.max(rules.proteinPerKgMin, preset.proteinPerKgMin);
      proteinPerKgMax = Math.max(rules.proteinPerKgMax, preset.proteinPerKgMax);
      const weeklyCentre = (trainMid * 4 + restMid * 3) / 7;
      const effectivePercent = Math.max(0, Math.round((tdee - weeklyCentre) / tdee * 1000) / 10);
      const weeklyLoss = Math.round(effectivePercent / 100 * tdee * 7 / 7700 * 100) / 100;
      leanPlan = {
        plannedPercent: preset.deficitPercent,
        effectivePercent,
        floorPercent,
        weeklyLoss,
        limitedByFloor: floorPercent < preset.deficitPercent,
        lossRatePercent: w > 0 ? Math.round(weeklyLoss / w * 1000) / 10 : null,
        fatPerMonth: Math.round(weeklyLoss * 4.3 * 10) / 10
      };
    }
    // non-lean goal ranges：只在没有自定义日区间时套用目标预设，口径永远优先。
    const customRanges = !!(input.rules && (input.rules.trainingDayMin || input.rules.trainingDayMax || input.rules.restDayMin || input.rules.restDayMax));
    if (goal !== 'lean' && !customRanges) {
      const years = (typeof state !== "undefined" && state && state.profile) ? number(state.profile.trainingYears) : null;
      const gap = goal === 'gain' ? -surplusForYears(years) : preset.deficitPercent;
      const centre = Math.round(tdee * (1 - Math.min(gap, cap) / 100));
      trainingDay = {min: Math.max(floor, Math.round(centre * 0.98)), max: Math.max(floor, Math.round(centre * 1.04))};
      restDay = {min: Math.max(floor, Math.round(centre * 0.95)), max: Math.max(floor, Math.round(centre * 1.01))};
      const band = proteinBandFor(goal, gap);
      proteinPerKgMin = Math.max(rules.proteinPerKgMin, band.min);
      proteinPerKgMax = Math.max(rules.proteinPerKgMax, band.max);
    }
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
    const weeklyAverage = Math.round((trainingDay.max * 4 + restDay.max * 3) / 7);
    const weeklyAverageDeficit = deficitOf(weeklyAverage);
    const warnings = [];
    if (rules.trainingDayMin < floor || rules.restDayMin < floor) warnings.push(`已把低于 ${floor} kcal 的目标抬到硬底线上（口径：日摄入 ≥ ${floor}）`);
    if (trainingDeficit > cap) warnings.push(`训练日缺口 ${trainingDeficit}% 超过口径上限 ${cap}%；要么降目标，要么把缺口上限调高并说明理由`);
    if (restDeficit > cap) warnings.push(`休息日缺口 ${restDeficit}% 超过口径上限 ${cap}%`);
    if (trainingDeficit < 0) warnings.push(`训练日目标上限比维持热量高 ${Math.abs(trainingDeficit)}%（盈余）`);
    if (goal === 'cut' && trainingDeficit <= 0) warnings.push('目标是减脂，但当前区间不低于维持热量，减脂期不会有效果');
    if (goal === 'gain' && trainingDeficit > 10) warnings.push('目标是增肌，但当前缺口偏大，增肌原料可能不足');
    if (fatMin < 40) warnings.push('脂肪下限低于 40 g 会影响激素水平（口径：≥ 50 g，理想 55~70 g）');
    if (trainingUnset) warnings.push('每周训练次数未填，暂按久坐（系数 1.2）估算；填好后重新测算才准确');
    if (leanPlan) {
      if (leanPlan.limitedByFloor) warnings.push(`薄肌计划想要 ${leanPlan.plannedPercent}% 的缺口，但硬底线 ${floor} kcal 把可用缺口压到 ${leanPlan.floorPercent}%（约每周 -${leanPlan.weeklyLoss} kg）。想更快只有三条路：提高维持热量（增肌/加日常活动）、延长周期、或经你确认后下调硬底线`);
      if (leanPlan.effectivePercent < 8) warnings.push(`有效缺口只有 ${leanPlan.effectivePercent}%，线条变化会很慢（每月约 -${leanPlan.fatPerMonth} kg 脂肪）；这是硬底线的直接后果，不是执行不力`);
      if (leanPlan.lossRatePercent !== null && leanPlan.lossRatePercent > 0.7) warnings.push(`每周减重 ${leanPlan.lossRatePercent}% 体重，超过保肌的安全上限 0.5~0.7%/周；薄肌要慢，快减必掉肌肉`);
    }
    const lines = [
      `维持热量（TDEE）：约 ${tdee} kcal／天（基础代谢 ${bmr} × 活动系数 ${factor}${trainingUnset ? '（训练次数未填，按久坐）' : `，按每周 ${sessions} 次训练`}）`,
      `目标摄入：训练日 ${trainingDay.min}~${trainingDay.max} kcal／天；休息日 ${restDay.min}~${restDay.max} kcal／天（周均 ${weeklyAverage}，相当于缺口 ${weeklyAverageDeficit}%）`,
      `与维持热量相比：训练日缺口 ${trainingDeficit}%，休息日缺口 ${restDeficit}%（口径：缺口 ≤ 维持的 ${cap}%，摄入 ≥ ${floor} kcal）`,
      `蛋白质：${proteinMin}~${proteinMax} g（${proteinPerKgMin}~${proteinPerKgMax} g/kg）· 脂肪：${fatMin}~${fatMax} g（不低于 ${rules.fatFloorG} g）`,
      `碳水：约 ${carbs} g（按训练日上限 ${budget} kcal 推算剩余热量）`
    ];
    if (leanPlan) {
      // Raising maintenance is the only lever that speeds this up without touching the 口径.
      const altFactor = activityFactorFor(4);
      const altTdee = Math.round(bmr * altFactor);
      const altTarget = Math.round(altTdee * (1 - Math.min(preset.deficitPercent, cap) / 100));
      lines.push(
        `训练频率杠杆：3 次/周（系数 ${activityFactorFor(3)}）→ 维持 ${Math.round(bmr * activityFactorFor(3))}；4 次/周（系数 ${altFactor}）→ 维持约 ${altTdee}，12% 缺口目标约 ${altTarget} kcal` +
        (altTarget >= floor ? `，仍在硬底线 ${floor} 之上，不必下调口径` : `，会跌破硬底线 ${floor}，需要另议`)
      );
      lines.push(
        `薄肌（线条）路径：计划缺口 ${leanPlan.plannedPercent}%，实际按 ${leanPlan.effectivePercent}% 执行 → 预计每周 -${leanPlan.weeklyLoss} kg（约 ${leanPlan.fatPerMonth} kg 脂肪/月，占体重 ${leanPlan.lossRatePercent}%）`,
        `体脂跑道：媒体常给男性 10~15% 可见腹肌，但缺少可靠实证阈值（受脂肪分布、腹肌厚度、光线与水合影响），只当参考；按当前速度每减 1 kg 脂肪约 ${leanPlan.weeklyLoss > 0 ? Math.round(1 / leanPlan.weeklyLoss) : '—'} 周，2 kg 约 ${leanPlan.weeklyLoss > 0 ? Math.round(2 / leanPlan.weeklyLoss) : '—'} 周`
      );
    }
    return {
      incomplete: false, goal, rules, preset,
      bmr, factor, tdee, sessions, trainingUnset,
      trainingDay, restDay, floor, cap,
      proteinMin, proteinMax, proteinMid, proteinPerKgMin, proteinPerKgMax,
      fatMin, fatMax, fatMid, carbs, budget,
      trainingDeficit, restDeficit, weeklyAverage, weeklyAverageDeficit,
      // 1 kg of fat is ~7700 kcal, so the weekly gap converts to a rate the trend can grade against.
      expectedWeeklyKg: Math.round(((tdee - weeklyAverage) * 7 / 7700) * 100) / 100,
      leanPlan,
      warnings,
      provisional: trainingUnset,
      trainingOff,
      lines
    };
  }
  const GOAL_LABEL = {gain: '增肌', cut: '减脂', recomp: '增肌同时减脂', maintain: '保持身材', lean: '薄肌（线条）'};
  /** Onboarding values -> computeTargets input. An unanswered training frequency stays unanswered. */
  function targetInputFrom(values) {
    return {
      sex: values.sex,
      weight: values.weight,
      height: values.height,
      age: values.age,
      goal: values.goal,
      training: values.training === '' || values.training === undefined ? null : values.training,
      rules: values.rules
    };
  }
  function latestWeight() {
    const rows = (state.measurements || []).filter(row => number(row.weight) !== null && validDate(row.date)).sort((a, b) => a.date.localeCompare(b.date));
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
      training: options.training !== undefined ? options.training : form.elements.training.value,
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
    for (const meal of meals) {
      const date = String(meal.date || '');
      if (!validDate(date)) continue;
      const kcal = number(meal.calories);
      if (kcal === null) continue;
      byDay.set(date, (byDay.get(date) || 0) + kcal);
    }
    const intakeDays = [...byDay.keys()].sort().slice(-maxDays);
    if (intakeDays.length < 14) {
      return {ok: false, reason: `有热量的记录只有 ${intakeDays.length} 天，至少需要 14 天`};
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
    const meanIntake = [...byDay.entries()].filter(([date]) => date >= from && date <= to).reduce((sum, [, kcal]) => sum + kcal, 0) / intakeDays.length;
    const tdee = Math.round(meanIntake - deltaKg * 7700 / spanDays);
    return {
      ok: true,
      tdee,
      meanIntake: Math.round(meanIntake),
      deltaKg: Math.round(deltaKg * 10) / 10,
      spanDays,
      days: intakeDays.length,
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
    const calibrationLine = calibration.ok
      ? `实测维持热量：约 ${calibration.tdee} kcal（${calibration.days} 天记录，平均摄入 ${calibration.meanIntake}，${calibration.spanDays} 天体重变化 ${calibration.deltaKg} kg）`
        + (Math.abs(calibration.tdee - result.tdee) >= 120 ? `；与公式值 ${result.tdee} 相差 ${calibration.tdee - result.tdee > 0 ? '+' : ''}${calibration.tdee - result.tdee} kcal，以实测为准` : '；与公式值一致')
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
    const fields = ['goal', 'training', 'weight', 'height', 'age'];
    form.addEventListener('change', event => {
      const name = event.target && event.target.name;
      if (!fields.includes(name)) return;
      recalcProfileTargets({saveMeasurement: false, auto: true}).catch(() => {});
    });
  }
  async function persistProfile(extra) {
    const form = $('#profile-form');
    const training = number(form.elements.training.value);
    const goal = form.elements.goal.value;
    const payload = {
      sex: form.elements.sex.value,
      height: number(form.elements.height.value),
      age: number(form.elements.age.value),
      goal,
      // Stamping the start date here is what makes the 8~12 week review possible at all.
      ...(goal === 'lean' && !(state.profile && state.profile.leanPhaseStartedAt) ? {leanPhaseStartedAt: localDate()} : {}),
      training,
      ...ruleOverridesFrom(form),
      ...extra
    };
    for (const key of ['calorieTarget', 'referenceCalories', 'proteinMin', 'proteinMax', 'fatMin', 'fatMax']) {
      const value = number(form.elements[key].value);
      if (value !== null) payload[key] = value;
    }
    return api('/api/profile', payload);
  }
