import fs from 'node:fs';
import { patch } from '../lib/patch.mjs';
patch('app/src/fragments/60-training-copy.fragment.js', [
  ['runs are not strength movements',
   "      if (!row || !Number.isFinite(Number(row.sets))) continue;",
   "      // A run has duration/distance instead of sets: it is not a lift and must not be scheduled as one.\n      if (!row || !Number.isFinite(Number(row.sets)) || row.sets === null) continue;\n      if (Number.isFinite(Number(row.durationMin)) || Number.isFinite(Number(row.distanceKm))) continue;"],
  ['do not borrow exercises from another template',
   "      const exercises = (byTemplate[template] && byTemplate[template].length ? byTemplate[template] : byTemplate.other).slice(0, 5);",
   "      // Only that template's own movements: borrowing 跑步 into a 推 day was a real bug.\n      const exercises = ((byTemplate[template] || []).slice(0, 5));"],
  ['skip runs when collecting last values',
   "        if (!item.name || lastByExercise[item.name]) continue;",
   "        if (!item.name || lastByExercise[item.name]) continue;\n        if (item.sets === null || item.reps === null) continue; // runs and timed work are not scheduled"],
]);
console.log('plan classification fixed');
