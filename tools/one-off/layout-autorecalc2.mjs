/**
 * 40-targets 的两个编辑：状态行区分「自动重算（未保存）」，并挂上 change 监听。
 * 上一版失败因为 status.className 与 textContent 之间多了一行 phase 计算。
 */
import {patch} from '../lib/patch.mjs';

patch('app/src/fragments/40-targets.fragment.js', [
  [
    'auto recalc wording',
    `    status.textContent = ['已按「' + (GOAL_LABEL[result.goal] || '增肌同时减脂') + '」与你的口径测算：']`,
    `    status.textContent = [options.auto ? '已按当前选择自动重算（未保存，点「保存档案」生效）：' : '已按「' + (GOAL_LABEL[result.goal] || '增肌同时减脂') + '」与你的口径测算：']`,
  ],
  [
    'auto recalc installer',
    `  async function persistProfile(extra) {`,
    `  /**
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
  async function persistProfile(extra) {`,
  ],
]);

console.log('auto recalc wired');
