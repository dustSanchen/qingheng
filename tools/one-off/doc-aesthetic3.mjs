import fs from 'node:fs';
const apk = 'dist/qingheng-1.0.65.apk';
if (fs.existsSync(apk)) {
  const st = fs.statSync(apk);
  console.log('apk:', Math.round(st.size/1024) + ' KB', st.mtime.toISOString());
  fs.copyFileSync(apk, 'D:\\AI\\codex\\qingheng-1.0.65.apk');
  console.log('copied to codex');
} else console.log('apk missing');

const doc = 'D:\\AI\\codex\\轻衡_训练建议库_三位创作者拆解.md';
let t = fs.readFileSync(doc, 'utf8');
if (!t.includes('## 十七、审美第三轮：claude.ai 可观察的表达')) {
  t += `

## 十七、审美第三轮：claude.ai 可观察的表达（1.0.65）

### 依据与限制

- \`anthropic.com/brand\` 现在返回 **404**，没有官方色值可引用；所以以下数值是「公开界面可观察倾向」的近似，**不声称是官方设计令牌**。
- 观察到的表达特征：暖米纸底、近黑墨色、**衬线标题**、发丝级分隔线、极克制的强调色、留白优先、少阴影。

### 落到令牌上

| 令牌 | 之前 | 现在 |
| --- | --- | --- |
| \`--paper\` | #f6f8f2（偏绿） | **#faf8f2**（暖米） |
| \`--surface\` | #ffffff | **#fffefb** |
| \`--ink\` | #22261f | **#1e1e1a** |
| \`--muted\` | #6f776c | **#6b6a63** |
| \`--line\` | #e5e9df | **#e8e5dc** |
| \`--font-display\` | 无 | **Iowan/Palatino/Songti 衬线栈**（仅标题） |

- 标题（页面标题、卡片 h2）用衬线，数据与正文保持无衬线——中文长文全衬线会掉可读性，这条是刻意取舍。
- 卡片阴影换成「暖色发丝线 + 极淡外阴影」，不再靠灰边框制造层级。

### 可读性验证（不是感觉，是算出来的）

| 组合 | 对比度 | 结论 |
| --- | --- | --- |
| 墨色 / 纸底 | **15.75:1** | 远超 AA 4.5 |
| 墨色 / 卡片 | **16.58:1** | 远超 AA 4.5 |
| 次要文字 / 纸底 | **5.11:1** | 正文仍达 AA |

语义色（蛋白/脂肪/碳水、状态色）与图标底色保持不变，测试里固定的 #44755d / #3f7a5e 等未被触碰。
`;
  fs.writeFileSync(doc, t);
  console.log('doc updated');
}
