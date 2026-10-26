import fs from 'node:fs';
import { patch } from '../lib/patch.mjs';
patch('app/src/fragments/60-training-copy.fragment.js', [
  ['pad2 must exist in the plan generator',
   "    const sessions = Math.max(1, Math.min(6, Number(src.sessions) || 3));",
   "    const pad2 = n => String(n).padStart(2, '0');\n    const sessions = Math.max(1, Math.min(6, Number(src.sessions) || 3));"],
  ['a day inside the range must not be told to eat more',
   "      else if (worst.key === 'calories' && range) action = '还差 ' + Math.round(range.min - sum.calories) + ' kcal：加一份主食配一个蛋白来源。';",
   "      else if (worst.key === 'calories' && range && sum.calories < range.min) action = '还差 ' + Math.round(range.min - sum.calories) + ' kcal：加一份主食配一个蛋白来源。';"],
]);
console.log('two bugs fixed');
