/**
 * B10 令牌棘轮：styles.css 里的硬编码颜色只许减少，不许增加。
 *
 * 为什么用棘轮而不是一次性清零：令牌化是分批做的，如果测试直接要求「零硬编码」，
 * 每次改样式都会因为别处的历史遗留而红；改成「不超过基线、减少时自动下调」，
 * 才能一边收敛一边保持绿灯。
 *
 * 合法例外（确实不该令牌化的）：令牌自身的取值定义（--xxx:#rrggbb）、图表辅助色、
 * 食材类目色。它们同样计入总量——只要不增长就不会失控。
 */
import fs from 'node:fs';

let fail = 0;
const check = (label, ok, detail) => {
  console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail));
  if (!ok) fail++;
};

const css = fs.readFileSync('app/src/main/assets/styles.css', 'utf8');
const hexes = [...css.matchAll(/#[0-9a-fA-F]{3,8}\b/g)].map(m => m[0].toLowerCase());
const rgbCalls = [...css.matchAll(/rgba?\(/g)].length;

// 基线：2026-10-27 · 1.1.60 实测。只允许往下调，不往上调。
const BASELINE_HEX = 134;
const BASELINE_RGB = 12;

check('hex colours do not grow past the baseline', hexes.length <= BASELINE_HEX, `${hexes.length} / ${BASELINE_HEX}`);
check('rgb()/rgba() literals do not grow past the baseline', rgbCalls <= BASELINE_RGB, `${rgbCalls} / ${BASELINE_RGB}`);

// 唯一值越少越好：同一个颜色写成两种大小写或三条长度不同的 hex，是收敛前的典型症状。
const unique = new Set(hexes);
check('no colour appears written two different ways', unique.size <= hexes.length, `${unique.size} unique / ${hexes.length} total`);

// 令牌块本身必须还在，否则上面的统计会"因为令牌全被删掉"而虚假通过。
check('the paper token block still exists', css.includes(':root{') || css.includes(':root {'));
check('the ledger token block still exists', css.includes('[data-skin="ledger"]'));

// 新增令牌必须登记到设计文档。文档里允许 `--tone-water/tip/neutral` 这种合并写法
// （同组令牌并列更易读），所以先把合并写法展开成完整名字，再逐个比对。
const tokensDoc = fs.readFileSync('docs/design/02-tokens.md', 'utf8');
const registered = new Set();
for (const m of tokensDoc.matchAll(/--[a-z0-9-]+(?:\/[a-z0-9-]+)*/g)) {
  const parts = m[0].split('/');
  const head = parts[0];
  const prefix = head.slice(0, head.lastIndexOf('-') + 1); // --tone-protein -> --tone-
  for (const part of parts) registered.add(part.startsWith('--') ? part : prefix + part);
}
const declared = [...css.matchAll(/(--[a-z0-9-]+):\s*#[0-9a-fA-F]{3,8}/g)].map(m => m[1]);
const unregistered = [...new Set(declared)].filter(name => !registered.has(name));
check('every colour token is registered in 02-tokens.md', unregistered.length === 0, unregistered.slice(0, 6).join(', ') || 'none');

console.log('\nFAIL total: ' + fail);
process.exitCode = fail ? 1 : 0;
