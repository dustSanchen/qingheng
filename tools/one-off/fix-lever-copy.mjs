import fs from 'node:fs';
import { patch } from '../lib/patch.mjs';
patch('app/src/fragments/40-targets.fragment.js', [
  ['the lever states both frequencies explicitly',
   "        `训练频率杠杆：3 次/周 → 维持 ${tdee}；提到 4 次/周（系数 ${altFactor}）→ 维持约 ${altTdee}，12% 缺口目标约 ${altTarget} kcal` +",
   "        `训练频率杠杆：3 次/周（系数 ${activityFactorFor(3)}）→ 维持 ${Math.round(bmr * activityFactorFor(3))}；4 次/周（系数 ${altFactor}）→ 维持约 ${altTdee}，12% 缺口目标约 ${altTarget} kcal` +"],
]);
console.log('lever wording fixed');
