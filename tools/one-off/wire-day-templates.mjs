/**
 * 让训练计划直接用「课代表」整理图里的处方：
 *  - 空模板回退改用 dayTemplates（动作顺序、组数、次数、RPE 都来自整理图）
 *  - 计划条目显示 RPE
 *  - 「为什么这样排」引用日模板规则
 */
import fs from 'node:fs';
import { patch } from '../lib/patch.mjs';

patch('app/src/fragments/60-training-copy.fragment.js', [
  ['day templates are the first fallback',
   `      if (!exercises.length && typeof libraryMoves === 'function') {
        // No history yet: use the library's canonical movements for that template.
        exercises = libraryMoves(template).slice(0, 5).map(item => ({name: item.name, sets: item.sets || 3,
          reps: item.reps || 8, weight: null, role: item.role || ''}));
        suggested = exercises.length > 0;
      }`,
   `      if (!exercises.length) {
        // No history yet: use the community-verified day template (sets / reps / RPE from the digest image),
        // falling back to the plain movement list if the template is missing.
        const day = libraryDayTemplate(template);
        if (day && day.exercises.length) {
          exercises = day.exercises.map(item => ({name: item.name, sets: item.sets || 3, reps: item.reps || 8,
            weight: null, role: item.role || '', rpe: item.rpe || null}));
          suggested = true;
        } else if (typeof libraryMoves === 'function') {
          exercises = libraryMoves(template).slice(0, 5).map(item => ({name: item.name, sets: item.sets || 3,
            reps: item.reps || 8, weight: null, role: item.role || ''}));
          suggested = exercises.length > 0;
        }
      }`],
]);

patch('app/src/fragments/60-training-copy.fragment.js', [
  ['a day-template accessor',
   '  function libraryMoves(template) {',
   `  function libraryDayTemplate(template) {
    const lib = trainingLibrary();
    const day = lib && lib.dayTemplates ? lib.dayTemplates[template] : null;
    return day && Array.isArray(day.exercises) ? day : null;
  }
  function libraryMoves(template) {`],
]);

patch('app/src/fragments/60-training-copy.fragment.js', [
  ['plan items show RPE and rep ranges',
   "${item.sets} × ${item.reps}${item.weight !== null ? ' · ' + item.weight + ' kg' : ''}",
   "${item.sets} × ${item.reps}${item.rpe ? ' · RPE' + item.rpe : ''}${item.weight !== null ? ' · ' + item.weight + ' kg' : ''}"],
]);

patch('app/src/fragments/60-training-copy.fragment.js', [
  ['the plan explains the day template',
   `    if (src.deload) push('deload-rule', '本周按减载周排：负荷偏高时负重 ×0.9、组数 −1');`,
   `    if (src.deload) push('deload-rule', '本周按减载周排：负荷偏高时负重 ×0.9、组数 −1');
    else if (src.templateId) push(src.templateId, '动作顺序与组次来自三分化整理图（推/拉/腿各 5 个动作）');`],
]);

patch('app/src/fragments/60-training-copy.fragment.js', [
  ['pass the template rule id',
   "    const reasons = typeof planWhy === 'function' ? planWhy({deload, suggested: days.some(day => day.suggested)}) : [];",
   "    const reasons = typeof planWhy === 'function' ? planWhy({deload, suggested: days.some(day => day.suggested),\n      templateId: 'push-day-template'}) : [];"],
]);

console.log('day templates wired into the plan');
