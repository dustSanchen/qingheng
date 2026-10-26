import fs from 'node:fs';
import { patch } from '../lib/patch.mjs';
patch('app/src/fragments/00-head.fragment.js', [
  ['the range carries the expected rate through',
   `      floor: rules.intakeFloor
    };`,
   `      floor: rules.intakeFloor,
      expectedWeeklyKg: active && Number.isFinite(active.expectedWeeklyKg) ? active.expectedWeeklyKg : null
    };`],
]);
console.log('range exposes expectedWeeklyKg');
