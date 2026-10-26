import fs from 'node:fs';
import { patch } from '../lib/patch.mjs';
// 关于页显示冷启动耗时（只在有值时才显示，避免误导）。
patch('app/src/fragments/70-rest.fragment.js', [
  ['cold start on the version card',
   `      const audit = Array.isArray(info?.answerAudit) ? info.answerAudit.join(' · ') : '';`,
   `      const audit = Array.isArray(info?.answerAudit) ? info.answerAudit.join(' · ') : '';
      const coldStart = number(info?.coldStartMs) ?? 0;`],
  ['append the cold start chip',
   `        + (audit ? \`<span>问答体检 <b>\${esc(audit)}</b></span>\` : '');`,
   `        + (audit ? \`<span>问答体检 <b>\${esc(audit)}</b></span>\` : '')
        + (coldStart > 0 ? \`<span>冷启动 <b>\${fmt(coldStart, 0)}</b> ms</span>\` : '');`],
]);
console.log('cold start rendered');
