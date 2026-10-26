import fs from 'node:fs';
import { patch } from '../lib/patch.mjs';
patch('app/src/fragments/00-head.fragment.js', [
  ['a date shift helper',
   '  const validDate = ',
   `  /** Moves a YYYY-MM-DD key by whole days in local time; returns the input when it is not a date. */
  function shiftDate(day, delta) {
    if (!validDate(day)) return day;
    const [year, month, date] = day.split('-').map(Number);
    const moved = new Date(year, month - 1, date + delta);
    const pad = value => String(value).padStart(2, '0');
    return \`\${moved.getFullYear()}-\${pad(moved.getMonth() + 1)}-\${pad(moved.getDate())}\`;
  }
  const validDate = `],
]);
console.log('shiftDate added');
