import fs from 'node:fs';
const lib = new Function('window', fs.readFileSync('app/src/main/assets/training-principles.js','utf8') + '\nreturn window.TRAINING_PRINCIPLES;')({});
const doc = 'D:\\AI\\codex\\轻衡_训练建议库_三位创作者拆解.md';
let t = fs.readFileSync(doc, 'utf8');
if (!t.includes('## 十三、把口述数据变成 App 里的建议')) {
  t += `

## 十三、把口述数据变成 App 里的建议（1.0.57）

| 位置 | 之前 | 现在 |
| --- | --- | --- |
| 计划卡顶部 | 只有「今天练什么」 | 多一行**动作要点**：按今天的模板取 2 条口述级 cue（推日=侧平举只放 2/3 + RPE8 不是 RM；拉日=对握飞鸟 + 复合不力竭；腿日=6 个热身动作 + 按信号休息） |
| 问答上下文 | 固定取优先级前 6 条 | **按问题检索**：腹肌/肩/腿/背/胸/热身/力竭/减脂/蛋白/睡眠/增肌 11 组关键词路由到对应 tag，没有命中才回退到 top-6 |
| 依据标注 | 只有来源等级 | 口述规则额外带**时间戳**（如「口述 06:03，BV1FcdZBNEm3」） |

检索是真的在跑（测试里执行了真实函数）：
- 「腹肌怎么练才对」→ 命中腹肌三条（含悬垂举腿）
- 「减脂平台期怎么办」→ 命缺口/平台规则
- 「最近睡眠不好很累」→ 命睡眠/晨脉规则
- 「今天天气怎么样」→ 返回空

## 十四、后台转写：好人松松《健身解剖完全手册》1~5 集

| 集 | bvid | 时长 |
| --- | --- | --- |
| 第1集 关节活动 | BV1mM6JY6Ei9 | 51:38 |
| 第2集 练胸 | BV1YgcdeqE7y | 64:47 |
| 第3集 练肩 | BV167LAzaE14 | 65:55 |
| 第4集 练背 | BV1jEnuz9ESc | 94:12 |
| 第5集 手臂&腹肌 | BV1X1Lj66ENe | 84:17 |

合计约 **6 小时**音频，CPU 转写约 **1.7~2 小时**（small int8，约 3.3× 实时）。转写完成后按同样的「口述级」方式入库：每集抽 3~6 条，全部带时间戳。

进度可看：\`build/asr/BV1*.txt\` 是否出现对应文件。
`;
  fs.writeFileSync(doc, t);
  console.log('doc updated');
}
console.log('library:', lib.sources.length, 'sources /', lib.rules.length, 'rules');
