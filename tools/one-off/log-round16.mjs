import fs from 'node:fs';

const doc = 'D:\\AI\\codex\\轻衡_设计迭代日志.md';
let t = fs.readFileSync(doc, 'utf8');
if (!t.includes('## 第 16 轮 · 去 AI 感、修能量球、精简说明')) {
  const lines = [
    '',
    '## 第 16 轮 · 去 AI 感、修能量球、精简说明（1.0.87）',
    '',
    '### 1. 「AI 感过重」的根因与处理',
    '',
    '实测下来，AI 模板感的最大来源不是配色，是**全大写英文眉题 + 营销式副标题**：',
    '',
    '| 之前 | 现在 |',
    '| --- | --- |',
    '| A LITTLE BETTER, EVERY DAY / PROGRESS, NOT PERFECTION / MADE FOR YOU / YOUR DAILY JOURNAL / ASK ANYTHING / SMALL THINGS MATTER / PROFILE / ABOUT | 全部删除（12 处） |',
    '| 「不追求完美，只让每一次记录都有意义。」「看见真实记录，不替空白下结论。」等 5 条营销副标题 | 全部删除 |',
    '| .eyebrow 样式保留着大写 tracking | 改为普通小标签（字号 text-sm、正常字距） |',
    '',
    '删除后页面只剩中文标题，读起来像工具而不是落地页。',
    '',
    '### 2. 今日能量球不完整显示',
    '',
    '**根因**：.dashboard-grid 是两列网格（1.55fr 1fr），手机上能量卡只拿到约 60% 宽度，而环固定 150px，右侧文字又不可压缩 → 环被裁。',
    '**修复**：',
    '- 640px 以下强制单列，子元素 min-width:0',
    '- 环 150px → 112px（内圈 94px），数字 32px → 26px',
    '- .energy-body 允许换行，文字区 flex:1 1 150px',
    '- 顺手归一 .card 的旧规则（22px 内边距 + 阴影）回令牌值，避免与后来的令牌打架',
    '',
    '### 3. 说明文字与嵌套',
    '',
    '审计（按卡片文字量排序）：个人档案 390 字、模型连接 293、问答 283、关于 257、每日推送 240 —— 全部集中在「我的」的子页；',
    '今天页与记录页的卡片都很轻（训练建议 90 字、身体数据 82 字）。',
    '',
    '本轮精简：USDA 与 Open Food Facts 两段来源说明各压掉约 15 字，保留署名与限流信息（限流是测试断言的一部分）。',
    '',
    '嵌套现状：卡内嵌 details 4 处、details 内嵌卡 4 处（第 15 轮的「更多」折叠）。原则建议：**一层为限**——卡内可以有折叠，折叠里不再放卡（day-more 已把内层卡去框）。',
    '',
    '**下一步建议**：把「我的」里 4 张说明密集卡的第一段说明收进卡内 details「说明」，首屏只留状态行与操作。',
    ''
  ].join('\n');
  t += lines;
  fs.writeFileSync(doc, t);
  console.log('log appended');
} else console.log('already logged');
