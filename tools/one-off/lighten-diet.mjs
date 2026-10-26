import fs from 'node:fs';
import { patch } from '../lib/patch.mjs';
patch('app/src/fragments/00-head.fragment.js', [
  ['in-range greens are lighter and calmer',
   "    return `hsl(${Math.round(132 + 8 * t)} ${Math.round(38 - 8 * t)}% ${Math.round(37 + 6 * t)}%)`;",
   "    return `hsl(${Math.round(132 + 8 * t)} ${Math.round(26 - 6 * t)}% ${Math.round(63 + 5 * t)}%)`;"],
  ['under the floor is a light wheat',
   "    return `hsl(${Math.round(48 - 14 * t)} ${Math.round(58 + 10 * t)}% ${Math.round(50 - 4 * t)}%)`;",
   "    return `hsl(${Math.round(46 - 10 * t)} ${Math.round(38 + 8 * t)}% ${Math.round(70 - 4 * t)}%)`;"],
  ['over the cap is a soft terracotta',
   "    return `hsl(${Math.round(22 - 16 * t)} ${Math.round(62 + 8 * t)}% ${Math.round(48 - 4 * t)}%)`;",
   "    return `hsl(${Math.round(20 - 12 * t)} ${Math.round(44 + 10 * t)}% ${Math.round(66 - 4 * t)}%)`;"],
]);
console.log('diet palette lightened');
