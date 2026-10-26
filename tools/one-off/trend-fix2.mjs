import fs from 'node:fs';

const f = 'app/src/fragments/50-onboarding.fragment.js';
let t = fs.readFileSync(f, 'utf8');
let n = 0;

// 周列标签：完整日期 + 「起那一周」 太长，改成「10-12 周」
const from1 = "<th scope=\"col\">' + esc(rows[0].prevWeek) + ' 起那一周</th>";
const to1 = "<th scope=\"col\">' + esc(String(rows[0].prevWeek).slice(5)) + ' 周</th>";
if (t.includes(from1)) { t = t.replace(from1, to1); n++; console.log('prev week label shortened'); }

const from2 = "<th scope=\"col\">' + esc(rows[0].lastWeek) + ' 起</th>";
const to2 = "<th scope=\"col\">' + esc(String(rows[0].lastWeek).slice(5)) + ' 周</th>";
if (t.includes(from2)) { t = t.replace(from2, to2); n++; console.log('last week label shortened'); }

fs.writeFileSync(f, t);
console.log('labels changed:', n);

// 表格容器 + 两张子表的间隔
let html = fs.readFileSync('app/src/main/assets/index.html', 'utf8');
if (!html.includes('<div class="table-wrap" id="volume-table">')) {
  html = html.replace('<div id="volume-table"></div>', '<div class="table-wrap" id="volume-table"></div>');
  html = html.replace('<div class="card-heading"><h2>身体成分对照</h2>', '<div class="card-heading section-gap"><h2>身体成分对照</h2>');
  fs.writeFileSync('app/src/main/assets/index.html', html);
  console.log('volume table wrapped + section gap');
}

let css = fs.readFileSync('app/src/main/assets/styles.css', 'utf8');
if (!css.includes('.section-gap')) {
  css += [
    '',
    '/* 趋势：两张子表之间要断开，表格本身可横向滚动，不再溢出卡片。 */',
    '.table-wrap{overflow-x:auto;-webkit-overflow-scrolling:touch}',
    '.stats-table{min-width:100%;table-layout:auto;white-space:nowrap}',
    '.stats-table caption{text-align:left;padding:0 0 var(--space-2);color:var(--muted)}',
    '.section-gap{margin-top:var(--space-4);padding-top:var(--space-3);border-top:1px solid var(--line)}'
  ].join('\n') + '\n';
  fs.writeFileSync('app/src/main/assets/styles.css', css);
  console.log('trend table styles');
}
