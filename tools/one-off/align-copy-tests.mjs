import fs from 'node:fs';
import { patch } from '../lib/patch.mjs';
// 1) 保留「进餐日期」语义的短句
let html = fs.readFileSync('app/src/main/assets/index.html','utf8');
html = html.split('拍摄时间 ≠ 进餐时间，可在上方改。').join('拍摄时间 ≠ 进餐日期与时间，可在上方改。');
fs.writeFileSync('app/src/main/assets/index.html', html);

// 2) 三条断言跟着行为更新
patch('tests/habit-and-training-mode.test.mjs', [
  ['reveal helper signature', "check('a reveal helper exists', app.includes('function revealField(id)'));",
   "check('a reveal helper exists', app.includes('function revealField(id, options = {})'));"],
]);
patch('tests/layout-four.test.mjs', [
  ['the training chip no longer focuses', "check('training chip focuses the preset row', app.includes(\"$('[data-training-preset]', form)?.focus();\"));",
   "check('the training chip scrolls without focusing', app.includes(\"flashTarget(form.closest('.card'))\") && app.includes(\"revealField(focus, {focus: false, block: 'start'});\"));"],
]);
patch('tests/meal-date-context.test.mjs', [
  ['copy keeps the meal-date meaning', "assert.match(html, /拍摄时间不等于进餐日期/, 'the UI separates capture time from the meal date');",
   "assert.match(html, /拍摄时间 ≠ 进餐日期/, 'the UI separates capture time from the meal date');"],
]);
console.log('copy + assertions aligned');
