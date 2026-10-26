import fs from 'node:fs';
import { patch } from '../lib/patch.mjs';
patch('app/src/fragments/60-training-copy.fragment.js', [
  ['reference block shows the calibrated cues',
   "        return '<p><strong>' + esc(day.label) + '</strong><br>' + list + '</p>';",
   "        const dayCues = Array.isArray(day.cues) && day.cues.length\n          ? '<br><small>' + day.cues.map(cue => esc(cue)).join('；') + '</small>' : '';\n        return '<p><strong>' + esc(day.label) + '</strong><br>' + list + dayCues + '</p>';"],
]);
console.log('reference cues wired');
