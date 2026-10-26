import fs from 'node:fs';
import { patch } from '../lib/patch.mjs';
patch('app/src/main/assets/training-principles.js', [
  ['priority includes the transcript source',
   "  priority: ['ksw-tcy-3split', 'community-digest', 'hrss-channel', 'tcy-channel', 'ksw-channel', 'alex-channel'],",
   "  priority: ['asr-transcript', 'ksw-tcy-3split', 'community-digest', 'hrss-channel', 'tcy-channel', 'ksw-channel', 'alex-channel'],"],
]);
const lib = new Function('window', fs.readFileSync('app/src/main/assets/training-principles.js','utf8') + '\nreturn window.TRAINING_PRINCIPLES;')({});
console.log('priority:', lib.priority.join(' > '));
console.log('sources in priority:', lib.sources.every(s => lib.priority.includes(s.id)));
