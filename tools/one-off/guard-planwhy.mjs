import fs from 'node:fs';
import { patch } from '../lib/patch.mjs';
patch('app/src/fragments/60-training-copy.fragment.js', [
  ['planWhy is optional for the generator',
   "    const reasons = planWhy({deload, suggested: days.some(day => day.suggested)});",
   "    // The analysis layer is optional: the generator still works without the library loaded.\n    const reasons = typeof planWhy === 'function' ? planWhy({deload, suggested: days.some(day => day.suggested)}) : [];"],
]);
console.log('generator guarded');
