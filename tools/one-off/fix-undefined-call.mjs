import fs from 'node:fs';
import { patch } from '../lib/patch.mjs';
patch('app/src/fragments/00-head.fragment.js', [
  ['no call to a function that does not exist',
   `      if (node) node.hidden = !on;
    }
    applyHabitTiles();
  }`,
   `      if (node) node.hidden = !on;
    }
    // Habit tiles filter themselves in renderAll(); there is nothing to re-apply here.
  }`],
]);
console.log('removed the undefined call');
