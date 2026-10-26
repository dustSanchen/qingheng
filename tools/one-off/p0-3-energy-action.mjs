/**
 * P0-3: the energy card's action line. Re-applied on its own because the earlier combined script
 * aborted before writing this file (a failed anchor later in the list means nothing is written).
 */
import {patch} from '../lib/patch.mjs';

patch('app/src/fragments/10-rich-answer.fragment.js', [
  [
    'energy card action line',
    `    $('#macro-summary').innerHTML = [['protein','蛋白质',p.proteinMin,p.proteinMax],['fat','脂肪',p.fatMin,p.fatMax],['carbs','碳水',null,carbCap(p)]]`,
    `    // What to do next, not just how far off the target is: a number without an action is useless.
    const actionBox = $('#calorie-action');
    if (actionBox) {
      const parts = [];
      const protein = number(totals.protein), proteinMin = number(p.proteinMin);
      const fat = number(totals.fat), fatMax = number(p.fatMax);
      const kcal = number(totals.calories), cap = range ? range.max : number(p.calorieTarget);
      if (protein !== null && proteinMin !== null && protein < proteinMin) {
        const gap = proteinMin - protein;
        parts.push(\`优先补蛋白：还差 \${fmt(gap,0)} g ≈ 白灼虾 \${Math.ceil(gap * 100 / 19)} g（或水煮蛋 \${Math.ceil(gap / 6.3)} 个）\`);
      }
      if (fat !== null && fatMax !== null && fat > fatMax) parts.push(\`脂肪超 \${fmt(fat - fatMax,0)} g：剩下的菜改白灼或清蒸，别再额外加油\`);
      if (kcal !== null && cap !== null && kcal > cap) parts.push(\`热量已超上限 \${fmt(kcal - cap,0)} kcal：不再加餐，晚餐只吃蛋白加蔬菜\`);
      if (!parts.length && protein !== null && proteinMin !== null && protein >= proteinMin) parts.push('蛋白质已达标，剩下的额度分给主食与蔬菜即可。');
      actionBox.textContent = parts.join('；');
    }
    $('#macro-summary').innerHTML = [['protein','蛋白质',p.proteinMin,p.proteinMax],['fat','脂肪',p.fatMin,p.fatMax],['carbs','碳水',null,carbCap(p)]]`,
  ],
]);

console.log('P0-3 wired');
