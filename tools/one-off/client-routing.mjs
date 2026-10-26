/**
 * P2-8 客户端路由：短问题走 fast 档（不联网 + 精简上下文 + 3 句上限），
 * 需要检索或长解释的问题走 deep 档。提示语里标出档位，成本可见。
 */
import {patch} from '../lib/patch.mjs';

patch('app/src/fragments/10-rich-answer.fragment.js', [
  [
    'pick a tier for this question',
    `      const payload = {question,history,date:submittedDate,allowExternal:true,anchors:anchorSummary(),webSearch:$('#chat-web').checked && navigator.onLine,...(submittedImage?{image:submittedImage,...submittedPhotoMeta}:{})};`,
    `      // Routing rule: a short question with no lookup intent is answered in the fast tier.
      const deepIntent = /(检索|搜索|查一下|最新|研究|证据|为什么|原理|对比|论文|指南)/.test(question);
      const tier = !submittedImage && !deepIntent && question.length <= 24 ? 'fast' : 'deep';
      const payload = {question,history,date:submittedDate,allowExternal:true,anchors:anchorSummary(),tier,webSearch:$('#chat-web').checked && navigator.onLine && tier === 'deep',...(submittedImage?{image:submittedImage,...submittedPhotoMeta}:{})};`,
  ],
  [
    'say which tier answered',
    `'已收到回答，但本次未能联网检索。') : '已收到回答。');`,
    `'已收到回答，但本次未能联网检索。') : (tier === 'fast' ? '已收到回答（快速档：不联网、只带最近三天数据）。' : '已收到回答。'));`,
  ],
]);
console.log('client routing wired');
