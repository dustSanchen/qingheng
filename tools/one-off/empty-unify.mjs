import fs from 'node:fs';
import { patch } from '../lib/patch.mjs';
// 训练计划空状态改用统一组件
patch('app/src/fragments/60-training-copy.fragment.js', [
  ['plan empty state uses the component',
   "    if (!plan) { box.innerHTML = '<p class=\"muted\">还没有足够的训练记录来自动生成；先记两周训练。</p>'; return; }",
   "    if (!plan) { box.innerHTML = empty('还没有足够的训练记录', '先记两周训练，计划会自动出来。'); return; }"],
]);
// 通用列表空状态改用统一组件
patch('app/src/fragments/10-rich-answer.fragment.js', [
  ['generic list empty state uses the component',
   "    return out.join('') || '<p class=\"muted\">暂无内容。</p>';",
   "    return out.join('') || empty('暂无内容。');"],
]);
console.log('empty states unified');
