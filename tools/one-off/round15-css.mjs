import fs from 'node:fs';
const f = 'app/src/main/assets/styles.css';
let css = fs.readFileSync(f, 'utf8');
if (!css.includes('.day-more')) {
  css += '\n/* 「更多」折叠：把三张低频卡片收成一行，第一屏只留 5 张。 */\n' +
    '.day-more{margin:0 0 var(--space-3);border:1px solid var(--line);border-radius:var(--radius-lg);background:var(--surface);padding:12px 14px}\n' +
    '.day-more > summary{cursor:pointer;font-size:var(--text-sm);color:var(--muted)}\n' +
    '.day-more[open] > summary{margin-bottom:var(--space-2)}\n' +
    '.day-more .card{border:0;box-shadow:none;padding:var(--space-3) 0;margin:0;border-top:1px solid var(--line);border-radius:0}\n' +
    '.day-more .card:first-of-type{border-top:0}\n\n' +
    '/* 今日流水：时间在上、事件在下，一眼看完今天。 */\n' +
    '#day-stream .meal-row{padding:var(--space-2) 0;border-top:1px solid var(--line)}\n' +
    '#day-stream .meal-row:first-child{border-top:0}\n' +
    '#day-stream .row-head strong{font-variant-numeric:tabular-nums;min-width:52px;display:inline-block}\n';
  fs.writeFileSync(f, css);
  console.log('styles added');
} else console.log('styles exist');
