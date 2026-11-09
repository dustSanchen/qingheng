/**
 * 纯计算：目标下调与临时目标覆盖。
 *
 * 这两段以前分散在「弹窗」「今日页」「原生 effectiveProfile」里各写一遍，口径容易漂。
 * 这里给页面一份可单测的实现；原生侧仍保留同一公式（Java 无法复用 JS）。
 */
(function () {
  function number(value) {
    if (value === null || value === undefined || value === '') return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  /** 由当前档案算「明日临时目标」；不满足下调条件时返回原因，不静默给一个数。 */
  function adjustedTargets(profile) {
    const source = profile || {};
    const target = number(source.calorieTarget);
    if (target === null) return {ok: false, reason: 'missing'};
    const safety = source.sex === 'female' ? 1200 : 1500;
    if (target <= safety) return {ok: false, reason: 'floor', safety};
    const fatMin = number(source.fatMin) || 0;
    const fatMax = number(source.fatMax);
    const reduction = Math.min(250, Math.max(100, target * 0.10));
    return {
      ok: true,
      safety,
      reduction: Math.round(reduction),
      calorieTarget: Math.max(safety, Math.round((target - reduction) / 50) * 50),
      fatMax: fatMax === null ? null : Math.max(fatMin, Math.round(fatMax * 0.90))
    };
  }
  /** 临时目标是一整天的单值：上下限与训练/休息日四处一起改，返回新对象不改入参。 */
  function applyTemporaryRange(range, temporary) {
    const adjusted = number(temporary && temporary.calorieTarget);
    if (adjusted === null || !range) return range;
    return {
      ...range,
      min: adjusted,
      max: adjusted,
      trainingDay: {min: adjusted, max: adjusted},
      restDay: {min: adjusted, max: adjusted},
      basis: '临时调整，明天恢复'
    };
  }
  window.QinghengCalc = {adjustedTargets, applyTemporaryRange};
})();
