/**
 * 第 5 轮：表达优化
 *  1) 精简 6 段最长说明文字——删冗词、合并重复主语，事实（来源、许可、限流、隐私、合并规则）一条不丢
 *  2) 正文栏宽与行高：prose 限制到 34em、行高 1.65，段间留白
 *  3) 空状态统一为一个组件（图标位 + 一句说明 + 可选动作）
 */
import fs from 'node:fs';
import { patch } from '../lib/patch.mjs';

// ---------------------------------------------------------------- 1) 精简文案 --------------------------
const trims = [
  [
    'usda note',
    '食材数据来自 <strong>USDA FoodData Central</strong>（美国农业部，公有领域）；家常菜为示例估算，含示例烹调油，实际配方可能不同。每 100g 可食部参考，不是薄荷官方数据库。',
    '食材数据来自 <strong>USDA FoodData Central</strong>（公有领域）；家常菜为示例估算，含示例油。按每 100g 可食部计，非薄荷数据库。'
  ],
  [
    'open food facts note',
    '数据来源 <strong>Open Food Facts</strong>（开放数据，ODbL 许可，可自由复用并需署名）。数值为包装标示的每 100g 参考，请以实物标签为准。该服务限制约每分钟 10 次搜索，因此只在点按钮时查询，不做逐字搜索。',
    '数据来源 <strong>Open Food Facts</strong>（ODbL 许可，可复用需署名）。包装标示按每 100g 计，以实物标签为准；服务限约 10 次/分钟，故只在点按钮时查询。'
  ],
  [
    'notification note',
    '到点后用手机本地通知提醒并给出当天分析。若已开启「消耗 token 自动分析」且已配置 API，App 会在后台自动生成建议并直接写进通知（会产生 API 费用）；否则只发一条提醒，点开后再分析。',
    '到点用本地通知提醒并给出当天分析。若开启「自动分析」且已配 API，会在后台生成建议并写进通知（产生 API 费用）；否则只提醒，点开再分析。'
  ],
  [
    'offline note',
    '手机 APK 可离线读取、保存与使用本地规则建议 / 明确克重食物估算。只有你同意的外部 AI 调用需要网络。浏览器演示仅将健康记录保存在当前浏览器，不保存密钥。导入按日期或记录 ID 合并；请先备份。',
    'APK 可离线记录、查看与使用本地规则建议和明确克重的估算；只有你同意的外部 AI 调用需要网络。浏览器演示只把记录存在本机、不保存密钥。导入按日期或记录 ID 合并，请先备份。'
  ],
  [
    'about intro',
    '轻衡是一个个人健康记录工具：记录、趋势、本地估算与本地建议都能离线使用。只有在你勾选同意并点击时，才会把当次需要的数字发送给你自己配置的模型服务商。本应用不提供诊断或处方，任何结论都应以你自己的记录与专业意见为准。',
    '轻衡是个人健康记录工具：记录、趋势、本地估算与本地建议都可离线。只有你勾选同意并点击时，才把当次所需数字发给你配置的模型服务商。不提供诊断或处方，结论以你的记录与专业意见为准。'
  ],
  [
    'storage note',
    '记录以 JSON（state.json）为唯一权威来源；SQLite 目前只是同步镜像，用于一致性校验与后续迁移。两者不一致时以 JSON 为准，点「立即镜像」即可重建。',
    '记录以 JSON（state.json）为唯一权威来源，SQLite 只是同步镜像（用于一致性校验与迁移）。不一致时以 JSON 为准，点「立即镜像」重建。'
  ]
];

for (const [label, from, to] of trims) {
  patch('app/src/main/assets/index.html', [[label, from, to]]);
  console.log('trimmed', label, from.length, '->', to.length);
}

// ---------------------------------------------------------------- 2) 栏宽与空状态 ----------------------
let css = fs.readFileSync('app/src/main/assets/styles.css', 'utf8');
let changed = 0;
if (!css.includes('--measure')) {
  css = css.replace('--font-display:', '--measure:34em;\n  --font-display:');
  changed++;
  console.log('ok   measure token');
}
if (!css.includes('/* reading measure */')) {
  css += `
/* reading measure — prose stops at ~34 Chinese characters per line; data and grids stay full width. */
.card p,.fine-print,.muted,details p{max-width:var(--measure);line-height:1.65}
.card p + p{margin-top:var(--space-2)}
.fine-print{line-height:1.6}

/* one empty state — icon slot, one sentence, optional action; never a bare sentence in a corner. */
.empty-state{display:flex;flex-direction:column;align-items:center;gap:var(--space-2);padding:var(--space-5) var(--space-4);text-align:center;color:var(--muted)}
.empty-state .empty-title{font-size:var(--text-md);color:var(--body-text)}
.empty-state .empty-hint{font-size:var(--text-sm);line-height:1.6;max-width:26em}
.empty-state svg,.empty-state .empty-icon{width:28px;height:28px;opacity:.45}
`;
  changed++;
  console.log('ok   measure + empty state');
}
if (changed) fs.writeFileSync('app/src/main/assets/styles.css', css);
console.log('css changed:', changed);
