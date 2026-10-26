import fs from 'node:fs';
import { patch } from '../lib/patch.mjs';
// 生成器在库缺失时也要能跑：没有 libraryMoves 就不回退
patch('app/src/fragments/60-training-copy.fragment.js', [
  ['library fallback is optional',
   "      if (!exercises.length) {",
   "      if (!exercises.length && typeof libraryMoves === 'function') {"],
]);
// 断言跟随实现
patch('tests/training-library.test.mjs', [
  ['the guarded reasons line',
   "check('the plan carries reasons', app.includes('const reasons = planWhy({deload, suggested: days.some(day => day.suggested)});'));",
   "check('the plan carries reasons', app.includes('typeof planWhy === \\'function\\' ? planWhy({deload, suggested: days.some(day => day.suggested)}) : []'));"],
]);
console.log('guards added');
