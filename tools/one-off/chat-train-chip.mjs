import fs from 'node:fs';
import { patch } from '../lib/patch.mjs';
patch('app/src/fragments/70-rest.fragment.js', [
  ['a chip that turns a sentence into a training draft',
   `    const presets = ['我今天蛋白够吗？', '今天训练日该怎么吃？', '本周体重趋势怎么样？'];
    row.innerHTML = presets.map((text, index) => \`<button type="button" class="button subtle" data-chat-chip="\${index}">\${esc(text)}</button>\`).join('');
    row.addEventListener('click', event => {
      const button = event.target.closest('[data-chat-chip]');
      if (!button) return;
      box.value = presets[Number(button.dataset.chatChip)] || '';
      box.focus();
    });`,
   `    const presets = ['我今天蛋白够吗？', '今天训练日该怎么吃？', '本周体重趋势怎么样？'];
    row.innerHTML = presets.map((text, index) => \`<button type="button" class="button subtle" data-chat-chip="\${index}">\${esc(text)}</button>\`).join('')
      + \`<button type="button" class="button subtle" data-chat-train="1">＋ 记一条训练</button>\`;
    row.addEventListener('click', event => {
      const train = event.target.closest('[data-chat-train]');
      if (train) {
        // Fills a sentence template and immediately shows the draft card, so the flow is one tap in.
        const sample = '昨天跑步 5 公里，用了 30 分钟';
        box.value = sample;
        showTrainingDraft(parseTrainingDraft(sample, activeDate));
        box.focus();
        return;
      }
      const button = event.target.closest('[data-chat-chip]');
      if (!button) return;
      box.value = presets[Number(button.dataset.chatChip)] || '';
      box.focus();
    });`],
]);
console.log('chat train chip added');
