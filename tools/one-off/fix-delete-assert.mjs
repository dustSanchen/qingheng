import fs from 'node:fs';
import { patch } from '../lib/patch.mjs';
patch('tests/meal-date-context.test.mjs', [
  ['delete action is now a compact icon in the title row',
   `assert.match(app, /class="icon-button danger" data-delete-meal=/, 'the meal delete action is an icon button');`,
   `assert.match(app, /class="icon-button danger row-delete" data-delete-meal=/, 'the meal delete action is a compact icon in the title row');
assert.match(app, /\\.row-side"><span class="row-kcal">/, 'the calorie column holds only the number now');`],
]);
console.log('assertion updated');
