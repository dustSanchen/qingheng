import fs from 'node:fs';
import { sectionMap } from './section-map.mjs';

// ── 1) 标记：在训练计划卡里加「用 AI 排今天」
const file = 'app/src/main/assets/index.html';
let html = fs.readFileSync(file, 'utf8');
const before = sectionMap(file);

if (!html.includes('id="ai-plan"')) {
  const anchor = '<div class="plan-prefs" id="plan-prefs" hidden>';
  const i = html.indexOf(anchor);
  if (i < 0) throw new Error('plan-prefs anchor missing');
  const cardStart = html.lastIndexOf('<article', i);
  const cardEnd = html.indexOf('</article>', i);
  const block = [
    '<div class="ai-plan" id="ai-plan">',
    '<div class="card-heading"><h3>今日顺序</h3><span class="tag" id="ai-plan-tag">未生成</span></div>',
    '<label class="check-label"><input type="checkbox" id="ai-plan-consent"><span>我同意把今天的训练记录、目标与偏好发送给已配置的模型，用来排今天的动作顺序。</span></label>',
    '<div class="button-row"><button type="button" class="button primary" id="ai-plan-ask">用 AI 排今天</button><button type="button" class="button subtle" id="ai-plan-clear" hidden>清除</button></div>',
    '<div id="ai-plan-list" class="list-stack" role="list"></div>',
    '</div>'
  ].join('');
  html = html.slice(0, cardEnd) + block + html.slice(cardEnd);
  fs.writeFileSync(file, html);
  console.log('ai-plan block inserted');
}

const after = sectionMap(file);
for (const id of Object.keys(before)) {
  const a = before[id], b = after[id];
  if (b && (a.length !== b.length)) console.log('  ' + id, a.length, '->', b.length);
}
const open = (html.match(/<div\b/g) || []).length, close = (html.match(/<\/div>/g) || []).length;
console.log('div:', open, close, open === close ? 'OK' : 'MISMATCH');
