import fs from 'node:fs';
import { patch } from '../lib/patch.mjs';
patch('app/src/fragments/00-head.fragment.js', [
  ['structured empty state',
   "  function empty(text) {return `<div class=\"empty-state\"><span aria-hidden=\"true\">✧</span>${esc(text)}</div>`;}",
   "  function empty(text, hint = '') {\n    return `<div class=\"empty-state\"><span class=\"empty-icon\" aria-hidden=\"true\">✧</span><p class=\"empty-title\">${esc(text)}</p>${hint ? `<p class=\"empty-hint\">${esc(hint)}</p>` : ''}</div>`;\n  }"],
]);
console.log('empty helper structured');
