import fs from 'node:fs';

// 1) 状态类
const f = 'app/src/fragments/00-head.fragment.js';
let t = fs.readFileSync(f, 'utf8');
const anchor = 'function hideTrainingTabs(on) {';
if (!t.includes('toggle(\'no-training\'')) {
  if (!t.includes(anchor)) throw new Error('hideTrainingTabs missing');
  t = t.replace(anchor, [
    'function hideTrainingTabs(on) {',
    '    // 状态类留给 CSS：即使分段按钮被 JS 重建，display:none 依然生效。',
    '    if (document.body) document.body.classList.toggle("no-training", !on);'
  ].join('\n'));
  fs.writeFileSync(f, t);
  console.log('ok body state class');
}

// 2) CSS 兜底
let css = fs.readFileSync('app/src/main/assets/styles.css', 'utf8');
if (!css.includes('.no-training [data-records-panel="training"]')) {
  css += [
    '',
    '/* 不健身模式：用状态类兜底，JS 重建节点也隐藏掉训练相关选项卡与入口。 */',
    'body.no-training [data-records-panel="training"],',
    'body.no-training [data-trends-panel="training"],',
    'body.no-training [data-go="training"],',
    'body.no-training [data-focus="training"],',
    'body.no-training #record-panel-training,',
    'body.no-training #trend-panel-training,',
    'body.no-training #week-plan-card,',
    'body.no-training #training-log,',
    'body.no-training #training-advice,',
    'body.no-training #training-volume-card,',
    'body.no-training #training-advice-order{display:none !important}'
  ].join('\n') + '\n';
  fs.writeFileSync('app/src/main/assets/styles.css', css);
  console.log('ok css fallback');
}
