import fs from 'node:fs';

const libPath = 'app/src/main/assets/training-principles.js';
const lib = new Function('window', fs.readFileSync(libPath, 'utf8') + '\nreturn window.TRAINING_PRINCIPLES;')({});
const doc = 'D:\\AI\\codex\\轻衡_训练建议库_三位创作者拆解.md';
let t = fs.readFileSync(doc, 'utf8');

if (!t.includes('## 十一、评论区是否可用：可用，而且拿到了处方级细节')) {
  t += `

## 十一、评论区是否可用：可用，而且拿到了处方级细节

### 结论

| 评论类型 | 占比（抽样 40 条顶级评论） | 是否入库 | 处理方式 |
| --- | --- | --- | --- |
| 「课代表」整理图（动作/容量/进阶） | ~5% | ✅ 高价值 | 逐张读图，转成 dayTemplates 处方 |
| 对视频内容的纠错 | ~3% | ✅ 入库 | 修正规则措辞，并在来源里记录 |
| 真实训练疑问 | ~15% | ✅ 部分 | 转为 FAQ 主题（如居家哑铃三分化、动作替换） |
| 情绪/玩梗/感慨 | ~70% | ❌ | 过滤 |
| 无关推广 | ~7% | ❌ | 过滤 |

### 拿到的处方（来自评论区图片，C 级，与 P1 视频互证）

**推日**：杠铃卧推 3 组 12/10/8 RPE8 → 哑铃上斜卧推 4×12 RPE8（可升到第 3、4 组 RPE9.5/10，最多两组力竭）→ 双杠臂屈伸 4×12 RPE10（做不到做退阶）→ 仰卧臂屈伸 4×15 RPE8 → Y 字侧平举 3×10+10（组内歇 5 秒）

**拉日**：单手钢线下拉 前 3 组 12 次 RPE8 + 第 4 组 10 次 RPE10 + 歇 5 秒 5 次 → 对握下拉 4×8–12 RPE10 → 单手器械划船 前 3 组 10 RPE8 / 第 4 组 RPE10 → 坐姿开肘划船 4×15–12 RPE8 → 钢线弯举 3×12

**腿日**：单腿硬拉 3×12 RPE9 → 单腿保加利亚蹲 3×10 RPE9 → 高脚杯深蹲 3×15 RPE9 → 杠铃罗马尼亚硬拉 3×15 RPE9 → 山羊挺身 3×8 RPE9；热身 5 步（动态青蛙趴 / 髋 90/90 / 脚踝激活 / 泡沫轴松解 / 伟大者伸展）

### 一条纠错

评论区指出：「开肘划船应该是练中下斜方，视频里说成上斜方了」——库中 \`pull-trap-balance\` 与 \`dayTemplates.pull\` 都按**中下斜方**记录，来源备注里也写明了这处口误。

### 在 App 里的用法

- **计划卡**新增「整理图参考处方」折叠块：推/拉/腿三份处方常驻可查，但**不覆盖**用户已有记录
- 模板**没有历史**时，计划直接用日模板生成（含组数/次数/RPE，条目显示 RPE）
- 「为什么这样排」会引用日模板规则，并标注来源等级
- 问答上下文里，相关规则带视频 BV 号与时长

### 边界

- 评论区是**读者整理**，不是创作者本人逐字稿；标 C 级，与 A 级视频结构互证后才使用
- 只取了顶级评论前 1 页；更多页需要继续翻，但边际收益递减
- 图片版「课代表」笔记无法用接口文字化，需要逐张读图（本轮读了 6 张里的 3 张：推/拉/腿各一）
`;
  fs.writeFileSync(doc, t);
  console.log('doc updated');
}

console.log('sources:', lib.sources.length, 'rules:', lib.rules.length, 'digest exercises:', lib.dayTemplates.push.exercises.length);
