import fs from 'node:fs';
import { patch } from '../lib/patch.mjs';

const NL = '\n';

// 1) 计划卡：整块做一次术语标注（覆盖 ACWR 这类出现在正文里的词）
patch('app/src/fragments/60-training-copy.fragment.js', [
  ['annotate the whole plan card',
   "    box.innerHTML = cueHtml + '<p class=\"plan-today\"><strong>' + esc(todayText) + '</strong></p>'\n      + '<p class=\"fine-print\">' + esc(plan.note) + '</p>' + suggestedNote + why + reference",
   [
     '    box.innerHTML = annotateTerms(cueHtml + \'<p class="plan-today"><strong>\' + esc(todayText) + \'</strong></p>\'',
     '      + \'<p class="fine-print">\' + esc(plan.note) + \'</p>\' + suggestedNote + why + reference);'
   ].join(NL)],
]);

// 2) 计划条目的 RPE 变成「RPE 8」（带空格才能被标注）
patch('app/src/fragments/60-training-copy.fragment.js', [
  ['RPE gets a space so it can be annotated',
   "${item.rpe ? ' · RPE' + item.rpe : ''}",
   "${item.rpe ? ' · RPE ' + item.rpe : ''}"],
]);

// 3) 趋势警示与体检卡也标注（那里会出现 ACWR、力竭等）
patch('app/src/fragments/60-training-copy.fragment.js', [
  ['annotate trend warnings',
   "    box.innerHTML = notes.map(note => `<p class=\"warn-line\">${esc(note)}</p>`).join('');",
   "    box.innerHTML = annotateTerms(notes.map(note => `<p class=\"warn-line\">${esc(note)}</p>`).join(''));"],
]);

patch('app/src/fragments/60-training-copy.fragment.js', [
  ['annotate the daily check body',
   "  box.innerHTML = '<div class=\"check-grid\">' + check.items.map(item =>",
   "  box.innerHTML = annotateTerms('<div class=\"check-grid\">' + check.items.map(item =>"],
]);

console.log('annotation coverage extended');
