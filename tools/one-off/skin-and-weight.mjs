import fs from 'node:fs';

// ── A. 拍照方框跟随皮肤：把写死的绿灰换成令牌
let css = fs.readFileSync('app/src/main/assets/styles.css', 'utf8');
const swaps = [
  ['.date-picker input{min-height:38px;font-size:var(--text-sm);background:#f0f4eb',
   '.date-picker input{min-height:38px;font-size:var(--text-sm);background:var(--surface-soft)'],
  ['.capture-button:active{background:#eef4ea;border-color:#c9dcc6',
   '.capture-button:active{background:var(--ok-soft);border-color:var(--ok-line)'],
  ['.capture-button>span{font-size:20px;color:#6e906c}',
   '.capture-button>span{font-size:20px;color:var(--accent)}'],
];
let n = 0;
for (const [from, to] of swaps) {
  if (!css.includes(from)) { console.log('MISS', from.slice(0, 40)); continue; }
  css = css.replace(from, to); n++;
}
fs.writeFileSync('app/src/main/assets/styles.css', css);
console.log('photo boxes tokenised:', n);

// ── B. 负重计算器：单侧开关 + 杆重可存 + 回填
let html = fs.readFileSync('app/src/main/assets/index.html', 'utf8');
const fromSheet = '<label class="weight-row">每侧片重 · kg<input type="number" id="plate-weight" value="15" min="0" max="100" step="0.5" inputmode="decimal"></label>';
if (html.includes(fromSheet)) {
  html = html.replace(fromSheet, fromSheet +
    '<label class="weight-row">按单侧输入<input type="checkbox" id="weight-per-side" checked></label>');
  console.log('per-side toggle added');
}
if (!html.includes('id="weight-fill"')) {
  html = html.replace('<p class="fine-print">两侧对称时：总重 = 杆重 + 2 × 每侧片重。单侧递进（比如只加一边）按实际总重填。</p>',
    '<p class="fine-print">两侧对称时：总重 = 杆重 + 2 × 每侧片重。单侧递进（只加一边）按实际总重填。</p><div class="button-row"><button type="button" class="button primary" id="weight-fill">填入当前动作的负重</button></div>');
  console.log('fill button added');
}
fs.writeFileSync('app/src/main/assets/index.html', html);
