import fs from 'node:fs';

const lib = new Function('window', fs.readFileSync('app/src/main/assets/training-principles.js', 'utf8') + '\nreturn window.TRAINING_PRINCIPLES;')({});
const doc = 'D:\\AI\\codex\\轻衡_训练建议库_三位创作者拆解.md';
let t = fs.readFileSync(doc, 'utf8');

if (!t.includes('## 十六、中文免费权威来源与审美依据')) {
  const cites = lib.sources.filter(s => s.kind === '官方指南' || s.kind === '国家卫健委指南' || s.kind === '学会共识' || s.kind === '学术立场声明' || s.kind === '指南共识' || s.kind === '调查报告' || s.kind === '综述');
  t += `

## 十六、中文免费权威来源与审美依据（1.0.64）

### 拿到的免费中文原文

| 来源 | 类型 | 关键数字 |
| --- | --- | --- |
| 《中国居民膳食指南（2022）》八准则 | 官方指南（官网全文） | 盐 ≤5 g、油 25~30 g、添加糖 ≤50 g（最好 <25）；蔬菜 ≥300 g、水果 200~350 g、奶 ≥300 ml；鱼禽蛋瘦肉 120~200 g/天；每周 ≥150 分钟 + 抗阻 2~3 天；饮水男 1700/女 1500 ml |
| 《成人肥胖食养指南（2024年版）》 | 国家卫健委（摘登全文） | 缺口 30%~50% 或 500~1000 kcal；脂肪 20~30%、蛋白 15~20%、碳水 50~60%；6 个月减 5%~10%、每周 0.5~1 kg；有氧 150~300 分钟/周 + 抗阻 2~3 天；每日约 7 小时睡眠、23 点前上床 |
| 《中国睡眠研究报告2023》 | 调查报告（公开报道） | 平均 7.40 小时；47.55% 不足 8 小时、16.79% 不足 7 小时 |
| ISSN 蛋白质立场声明（2017） | 学会声明（PMC 全文） | 日常 1.4~2.0 g/kg；缺口期 2.3~3.1 g/kg；单餐 0.25 g/kg 或 20~40 g；睡前酪蛋白 30~40 g |

**一个必须写清楚的边界**：肥胖食养指南的 1000~1500 kcal 下限只适用于 BMI≥24 的人群。库中专门有一条 \`cswz-scope-vs-app-floor\` 说明：本 App 的 2,000 kcal 硬底线对 64.6 kg、BMI 正常的薄肌用户仍然优先，不套用该下限，加快进度靠「提高维持热量」而不是降底线。

### 书级材料：能拿到的与拿不到的

- **能合法拿到全文的**：上面四份指南/声明的官方或开放获取版本，数值已逐条录入。
- **拿不到的**：商业书籍（如力量训练教材、睡眠科普书）的正文受版权保护，我没有抓取，也没有编造引用。
- 库里因此把「书级要点」标为 B（二手摘要），「指南/声明」标为 A。若你把某本书的 PDF/EPUB 放进工作区，我可以按同样方式（抽要点 + 标章节）入库。

### 审美：先把「opus 作品」这件事说清楚

- 互联网上**不存在**一个可检索的「opus 作品集」语料；把某种风格说成「学自 opus」会是编造，所以我没有这么做。
- 实际依据是**公开可查的产品设计通用做法**，并记录在库的 \`designNotes\` 里：
  1. 令牌化：一套字阶、一套间距（4/8/12/16/24）、一套圆角（10/14/18）
  2. 数据用等宽数字（\`font-variant-numeric: tabular-nums\`），数字变化时不跳
  3. chip/tag 统一高度与圆角
  4. 尊重系统「减少动态效果」（\`prefers-reduced-motion\`）
  5. 键盘焦点环可见（\`:focus-visible\`，2px 强调色 + 偏移 2px）
  6. 卡片标题与正文的层级固定（标题 15.5px/600，正文 13.5px）
- **限制**：这是通用原则的落地，不冒充任何具体作者或工作室的风格。

### 当前库规模

**${lib.sources.length} 个来源 / ${lib.rules.length} 条规则 / ${lib.rules.filter(r => r.citation).length} 条带文献引用 / ${lib.rules.filter(r => r.evidence).length} 条带口述时间戳 / 3 份日模板**
`;
  fs.writeFileSync(doc, t);
  console.log('doc updated');
}
console.log('sources:', lib.sources.length, 'rules:', lib.rules.length, 'citations:', lib.rules.filter(r => r.citation).length);
