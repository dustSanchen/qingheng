import fs from 'node:fs';
import { patch } from '../lib/patch.mjs';
patch('app/src/fragments/40-targets.fragment.js', [
  ['the plan states its expected weekly change',
   `      trainingDeficit, restDeficit, weeklyAverage, weeklyAverageDeficit, leanPlan,`,
   `      trainingDeficit, restDeficit, weeklyAverage, weeklyAverageDeficit,
      // 1 kg of fat is ~7700 kcal, so the weekly gap converts to a rate the trend can grade against.
      expectedWeeklyKg: Math.round(((tdee - weeklyAverage) * 7 / 7700) * 100) / 100,
      leanPlan,`],
]);
console.log('expectedWeeklyKg added');
