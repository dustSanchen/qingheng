import fs from 'node:fs';

// 1) 表格放进可横向滚动的容器，并缩短周列标签
let html = fs.readFileSync('app/src/main/assets/index.html', 'utf8');
if (!html.includes('<div class="table-wrap" id="volume-table">')) {
  html = html.replace('<div id="volume-table"></div>', '<div class="table-wrap" id="volume-table"></div>');
  fs.writeFileSync('app/src/main/assets/index.html', html);
  console.log('volume table wrapped');
}

let app = fs.readFileSync('app/src/fragments/60-training-copy.fragment.js', 'utf8');
let n = 0;

// 周标签：2026-10-12 起那一周 -> 10-12 周
const labelFrom = '2026-10-12 起那一周';
if (app.includes('起那一周')) {
  app = app.replace(/\+ esc\([^)]*\) \+ ' 起那一周'/g, "+ esc(weekLabel)");
  n++;
}

fs.writeFileSync('app/src/fragments/60-training-copy.fragment.js', app);
console.log('week label replacements:', n);
