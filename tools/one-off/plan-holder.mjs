import fs from 'node:fs';
import { patch } from '../lib/patch.mjs';
// renderWeekPlan 需要记住最后一次生成的计划，供「一键排课」使用
patch('app/src/fragments/60-training-copy.fragment.js', [
  ['remember the generated plan',
   "    const plan = generateWeekPlan({startDate, sessions, lastByExercise, acwrFlag: stats ? stats.flag : 'ok'});",
   "    const plan = generateWeekPlan({startDate, sessions, lastByExercise, acwrFlag: stats ? stats.flag : 'ok'});\n    lastWeekPlan = plan;"],
  ['declare the holder',
   '  /** Five-metric check for the selected day, plus the single action to take. */',
   '  /** The plan currently on screen; the schedule button writes exactly this. */\n  let lastWeekPlan = null;\n\n  /** Five-metric check for the selected day, plus the single action to take. */'],
]);
console.log('plan holder added');
