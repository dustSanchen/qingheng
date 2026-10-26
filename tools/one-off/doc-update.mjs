import fs from 'node:fs';
const lib = new Function('window', fs.readFileSync('app/src/main/assets/training-principles.js','utf8') + '\nreturn window.TRAINING_PRINCIPLES;')({});
const doc = 'D:\\AI\\codex\\轻衡_训练建议库_三位创作者拆解.md';
let t = fs.readFileSync(doc, 'utf8');
if (!t.includes('## 八、B 站公开接口核验（2026-10-24 补充）')) {
  t += `

## 八、B 站公开接口核验（2026-10-24 补充）

用 B 站公开接口（\`api.bilibili.com/x/web-interface/view?bvid=…\`）核到了原始结构，置信度因此升级：

**凯圣王 × 谭成义三分化（season 7937371，7 集）**

| 集 | 标题 | 时长 |
|---|---|---|
| ① | 训练计划 BV1FcdZBNEm3 | 21 分 30 秒 |
| ② | 跟练胸肩三头 BV1CSoKBaEgK | 84 分 11 秒 |
| ③ | 名词释义 BV1hCdSBaEvw | 19 分 55 秒 |
| ④ | 跟练背三角肩后束二头 BV1v5opBhEDc | 84 分 9 秒 |
| ⑤ | 跟练腿股四头肌腘绳肌 BV17aovBqEdg | 58 分 9 秒 |
| ⑥ | 约练背 vlog BV1SEorB6Ekj | 63 分 30 秒 |
| 合集 | BV17ooLBUEqS | 267 分 51 秒 |

简介原文（①）：「今年合作更新一个三分化系列，新手和训练发烧友都可以用，详细介绍动作选择、周期计划、设计思路和训练中需要注意的细节，后面继续更新跟练部分」。

**ALEX健身频道（mid 1681952786）—— 纠正了一处错误**

- 频道主打 **拉伸与热身**：season 3806101「每日拉伸跟练，全身放松！」**16 集**（全身 12 分钟、臀腿 8 分钟、肩颈 8 分钟、泡沫轴滚腿、练腿日 7 分钟动态拉伸等），单集 5~14 分钟
- 「练腿前千万别直接上重量」BV1ncdUBGEbS，**5 分 24 秒**
- ⚠️ 「跟着 ALEX 40 分钟有氧减脂」系列是**第三方 up 主跟练其视频的再上传**（喀山羊 mid 1369771901，season 8967160），不是 ALEX 本人的频道内容 → 库中标记为 C 级存在性证据，不作为训练规则依据

## 九、饮食计算的两处修复（同版本）

| 问题 | 修法 |
|---|---|
| 手动记录只有总数、无法校验 | 合成单个明细项时用 \`reconciledKcal\` 按 4/4/9 重算，并把修正后的热量写回记录与 totals |
| 纤维按 4 kcal/g 计入（高纤维日高估 10~30 kcal） | 新增 \`caloriesFromMacros(p, c, f, fiber)\`：纤维按 **2 kcal/g**、从碳水里扣除（clamp 到 0..carbs）；估算提示词允许返回可选 \`fiber\`；有纤维时说明「膳食纤维按 2 kcal/g」 |

当前库规模：**${lib.rules.length} 条规则 / 3 个来源 / 15 个建议动作**，版本 \`${lib.version}\`。
`;
  fs.writeFileSync(doc, t);
  console.log('doc updated');
}
console.log('rules:', lib.rules.length, 'version:', lib.version);
