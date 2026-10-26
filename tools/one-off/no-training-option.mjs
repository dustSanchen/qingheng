/**
 * ④ 新增「不健身」选项：选了之后
 *  - 目标测算按久坐（系数 1.2）算，且不再提示「训练次数未填」；
 *  - 今天页隐藏「训练日志」「今日训练建议」，趋势页隐藏训练容量；
 *  - 小习惯里的「训练」tile 不显示；
 *  - 推送提示词不再给训练建议。
 */
import {patch} from '../lib/patch.mjs';

// ---------------------------------------------------------------- 表单选项 ------------------------------
patch('app/src/main/assets/index.html', [
  [
    'profile: a no-training option',
    `<label>每周力量训练次数<select name="training"><option value="">未填（不猜）</option>`,
    `<label>每周力量训练次数<select name="training"><option value="">未填（不猜）</option><option value="none">不健身（隐藏训练功能）</option>`,
  ],
  [
    'onboarding: the same option',
    `<select name="training" id="ob-training"><option value="0">0~1 次（久坐）</option>`,
    `<select name="training" id="ob-training"><option value="0">0~1 次（久坐）</option><option value="none">不健身（隐藏训练功能）</option>`,
  ],
  [
    'the trends card needs an id to hide it',
    `<article class="card"><div class="card-heading"><h2>训练容量（渐进超负荷）</h2>`,
    `<article class="card" id="training-volume-card"><div class="card-heading"><h2>训练容量（渐进超负荷）</h2>`,
  ],
]);

// ---------------------------------------------------------------- 目标测算 ------------------------------
patch('app/src/fragments/40-targets.fragment.js', [
  [
    'no-training counts as sedentary on purpose',
    `    const rawTraining = input.training;
    const trainingUnset = rawTraining === null || rawTraining === undefined || rawTraining === '';
    const sessions = trainingUnset ? 0 : Number(rawTraining);`,
    `    const rawTraining = input.training;
    // "不健身" is an answer, not a missing value: it means sedentary, and it must not be called unset.
    const trainingOff = String(rawTraining) === 'none';
    const trainingUnset = !trainingOff && (rawTraining === null || rawTraining === undefined || rawTraining === '');
    const sessions = trainingUnset || trainingOff ? 0 : Number(rawTraining);`,
  ],
  [
    'and the plan says so',
    `      provisional: trainingUnset,`,
    `      provisional: trainingUnset,
      trainingOff,`,
  ],
]);

// ---------------------------------------------------------------- 显隐 ---------------------------------
patch('app/src/fragments/00-head.fragment.js', [
  [
    'one place decides whether training UI exists',
    `  function intakeRangeForDate(date = activeDate) {`,
    `  /** True when the user told us they do not train, so training UI should not be shown at all. */
  function trainingEnabled() {
    const raw = state && state.profile ? String(state.profile.training ?? '') : '';
    return raw !== 'none';
  }
  /** Hides every training-only block when the profile says 不健身. Idempotent. */
  function applyTrainingVisibility() {
    const on = trainingEnabled();
    for (const id of ['training-log', 'training-advice', 'training-volume-card']) {
      const node = document.getElementById(id);
      if (node) node.hidden = !on;
    }
    applyHabitTiles();
  }
  function intakeRangeForDate(date = activeDate) {`,
  ],
]);

// ---------------------------------------------------------------- 调用点 -------------------------------
patch('app/src/fragments/10-rich-answer.fragment.js', [
  [
    'visibility follows every render',
    `    renderTrainingInsights();`,
    `    renderTrainingInsights();
    applyTrainingVisibility();`,
  ],
  [
    'the training tile disappears when training is off',
    `    const tiles = [
      ['icon-habit-training.svg', training, '训练'],`,
    `    const tiles = [
      ...(trainingEnabled() ? [['icon-habit-training.svg', training, '训练']] : []),`,
  ],
]);

patch('app/src/fragments/70-rest.fragment.js', [
  [
    're-apply after the profile is saved',
    `  installProfileAutoRecalc();`,
    `  installProfileAutoRecalc();
  applyTrainingVisibility();`,
  ],
]);

// ---------------------------------------------------------------- 推送 --------------------------------
patch('app/src/main/java/cn/qingheng/health/AlarmReceiver.java', [
  [
    'a no-training user gets no training advice',
    `        Boolean trainedToday = data == null ? null : data.trainedOn(today);
        if (data != null) user.put("trainsToday", trainedToday == null ? JSONObject.NULL : trainedToday);`,
    `        Boolean trainedToday = data == null ? null : data.trainedOn(today);
        if (data != null) user.put("trainsToday", trainedToday == null ? JSONObject.NULL : trainedToday);
        // The profile decides whether training advice makes sense at all.
        JSONObject profileForPush = state == null ? null : state.optJSONObject("profile");
        boolean trainingOff = profileForPush != null && "none".equals(profileForPush.optString("training", ""));
        if (trainingOff) user.put("trainingDisabled", true);`,
  ],
]);

patch('app/src/main/java/cn/qingheng/health/ai/Prompts.java', [
  [
    'the prompt honours trainingDisabled',
    `                // One training sentence, not a section: the push is still two bullets.`,
    `                + "若 body.trainingDisabled 为 true，用户不做力量训练：不要提训练、组数、渐进超负荷，把那条位置留给饮食或睡眠。"
                // One training sentence, not a section: the push is still two bullets.`,
  ],
]);

console.log('no-training option wired');
