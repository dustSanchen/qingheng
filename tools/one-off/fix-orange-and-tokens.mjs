/**
 * 第 10 轮（前半）：修掉橙色横框 + 状态色令牌化。
 *
 * 问题：`.notice` 用的是米黄底（#f1ebdb）+ 土黄边框（#e7dcc3），在暖纸底上像一条脏橙色横框；
 *       而 `.stats-*`、`.tone-*`、`.check-item.*` 各自写死色值，换皮肤时它们不会跟着变。
 *
 * 做法：
 *  1) 新增语义令牌 warn / danger / ok / 各自 soft 与 line，两套皮肤各给一套值
 *  2) notice 改为「表面底 + 发丝线 + 正文色」，只有 error 用 danger 系——不再有橙色横框
 *  3) 其余状态色改为引用令牌（.stats-good/.stats-bad 保持原样：它们是方向色，且有测试锁定）
 */
import fs from 'node:fs';

let css = fs.readFileSync('app/src/main/assets/styles.css', 'utf8');
let changed = 0;

// 1) 令牌
if (!css.includes('--warn:')) {
  css = css.replace('  --accent:#3f6b4a;', `  --accent:#3f6b4a;
  --warn:#a8622c;
  --warn-soft:#f6efe3;
  --warn-line:#e4d5bf;
  --danger:#a74638;
  --danger-soft:#f9ede7;
  --danger-line:#ecd8ce;
  --ok:#4f7a52;
  --ok-soft:#eef4ea;
  --ok-line:#cfe0cb;`);
  changed++;
  console.log('ok  状态色令牌');
}

// 2) ledger 覆盖（冷一点）
const ledgerAdd = `  --warn:#95602b;
  --warn-soft:#f4f1ea;
  --warn-line:#e2dccf;
  --danger:#9c4a3e;
  --danger-soft:#f7eeec;
  --danger-line:#e8d6d2;
  --ok:#3f6b52;
  --ok-soft:#eef3f0;
  --ok-line:#cfdfd8;`;
if (!css.includes('--warn-soft:#f4f1ea')) {
  css = css.replace(/(\[data-skin="ledger"\]\{[\s\S]*?)(\n\})/, (m, head, tail) => head + '\n' + ledgerAdd + tail);
  changed++;
  console.log('ok  ledger 状态色');
}

// 3) 替换写法（精确保留 .stats-good/.stats-bad）
const swaps = [
  ['.notice{background:#f1ebdb;color:#786246;padding:13px 16px;border:1px solid #e7dcc3;border-radius:12px;font-size:var(--text-sm);margin-bottom:18px}',
   '.notice{display:flex;align-items:flex-start;gap:var(--space-2);background:var(--surface);color:var(--body-text);padding:12px 14px;border:1px solid var(--line);border-left:3px solid var(--accent);border-radius:var(--radius-md);font-size:var(--text-sm);line-height:1.6;margin-bottom:var(--space-3)}'],
  ['.notice.error{color:#994f40;background:#f9ede7;border-color:#ecd8ce}',
   '.notice.error{color:var(--danger);background:var(--danger-soft);border-color:var(--danger-line);border-left-color:var(--danger)}'],
  ['.warn-text{color:#b4531f}', '.warn-text{color:var(--warn)}'],
  ['.check-item.bad{border-color:#e8cfc9;background:#fdf5f3}', '.check-item.bad{border-color:var(--danger-line);background:var(--danger-soft)}'],
  ['.check-item.ok{border-color:#cfe0cb}', '.check-item.ok{border-color:var(--ok-line)}'],
  ['.tone-energy{color:#a74638}', '.tone-energy{color:var(--danger)}'],
  ['.tone-warn{color:#a74638}', '.tone-warn{color:var(--danger)}'],
  ['.tone-fat{color:#a8622c}', '.tone-fat{color:var(--warn)}'],
  ['.diet-bar i.over{background:#c9776f}', '.diet-bar i.over{background:var(--danger)}'],
  ['.diet-key.over{color:#c9776f}', '.diet-key.over{color:var(--danger)}'],
];
for (const [from, to] of swaps) {
  if (!css.includes(from)) { console.log('MISS', from.slice(0, 34)); continue; }
  css = css.replace(from, to); changed++; console.log('ok  ', from.slice(0, 34));
}

fs.writeFileSync('app/src/main/assets/styles.css', css);
console.log('changed:', changed);
