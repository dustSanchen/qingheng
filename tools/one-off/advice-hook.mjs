import fs from 'node:fs';
import { patch } from '../lib/patch.mjs';
patch('app/src/fragments/60-training-copy.fragment.js', [
  ['call advice order on render',
   '    if (typeof renderLastChat === "function") renderLastChat();',
   '    if (typeof renderAdviceOrder === "function") renderAdviceOrder();'],
]);
console.log('render hook added');
