import fs from 'node:fs';

const doc = 'D:\\AI\\codex\\轻衡_设计迭代日志.md';
let t = fs.readFileSync(doc, 'utf8');
const marker = '## 第 10 轮及以后 · 待办';
if (!t.includes('## 第 10 轮 · 去掉橙色横框')) {
  const lines = [
    '## 第 10 轮 · 去掉橙色横框 + 状态色令牌化 + 按页面切皮肤（1.0.75）',
    '',
    '### 1. 橙色横框（真机截图定位）',
    '',
    '**根因**：.notice（全局提示条）被一条早期规则统一设成 background: var(--surface-soft)，',
    '而 --surface-soft 是 #efe9de（土黄）。在暖纸底上就成了一条「脏橙色横框」。',
    '',
    '**修法**',
    '- notice 移出色块分组，改为「背景 = --surface + 1px 发丝线 + 左侧 3px 强调色条」',
    '- 问答页的 details summary 同样移出，改成中性底 + 边框（「查看本次将发送的数据」那条）',
    '- --surface-soft 由 #efe9de 调为 #f3f2ee；ledger 补上 #f2f5f4',
    '- 趋势页警示框 .warn-line 从「粉底 #fdf5f3 + 粉边」改为「--surface + 发丝线 + 左侧 3px 危险色」',
    '',
    '### 2. 状态色令牌化（部分完成）',
    '',
    '| 令牌 | paper | ledger |',
    '| --- | --- | --- |',
    '| --warn / -soft / -line | #a8622c / #f6efe3 / #e4d5bf | #95602b / #f4f1ea / #e2dccf |',
    '| --danger / -soft / -line | #a74638 / #f9ede7 / #ecd8ce | #9c4a3e / #f7eeec / #e8d6d2 |',
    '| --ok / -soft / -line | #4f7a52 / #eef4ea / #cfe0cb | #3f6b52 / #eef3f0 / #cfdfd8 |',
    '',
    '已替换 12 处：notice / notice.error / warn-text / check-item.ok / check-item.bad / tone-energy / tone-warn / tone-fat / diet-bar.over / diet-key.over。',
    '',
    '**未完成**：全表仍有 190 个硬编码色值，集中在食材类目色、图表辅助线、按钮渐变、对话框危险态与早期组件。',
    '要支持「一键换主色」需要一次性全部映射，工作量约 2~3 轮。',
    '',
    '### 3. 按页面切皮肤（自动模式）',
    '',
    '- 皮肤选择器新增第三项「自动」：趋势页 → 账本；其余页面 → 纸感',
    '- 实现：switchTab 写入 data-tab，applySkin 按 skinForPage(choice, tab) 解析；用户仍可固定选任一套',
    '- 标签显示「自动 · ledger」/「自动 · paper」，明确当前实际生效的那套',
    '',
    '**验证**：55 个测试全绿；真机截图确认问答页横条已中性、自动模式在趋势页切到账本。',
    '',
    '## 第 11 轮及以后 · 待办'
  ];
  t = t.replace(marker, lines.join('\n'));
  fs.writeFileSync(doc, t);
  console.log('log updated, length', t.length);
} else {
  console.log('already logged');
}
