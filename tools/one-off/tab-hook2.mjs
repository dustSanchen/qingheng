import fs from 'node:fs';
import { patch } from '../lib/patch.mjs';
patch('app/src/fragments/00-head.fragment.js', [
  ['tab switch reapplies the skin',
   "function switchTab(tab, moveFocus = false, sub = '') {",
   "function switchTab(tab, moveFocus = false, sub = '') {\n  document.documentElement.dataset.tab = tab;\n  if (typeof applySkin === 'function') applySkin(document.documentElement.dataset.skinChoice || 'paper', false);"],
]);
console.log('tab hook added');
