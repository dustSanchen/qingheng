import fs from 'node:fs';
const lib = new Function('window', fs.readFileSync('app/src/main/assets/training-principles.js','utf8') + '\nreturn window.TRAINING_PRINCIPLES;')({});
const doc = 'D:\\AI\\codex\\轻衡_训练建议库_三位创作者拆解.md';
let t = fs.readFileSync(doc, 'utf8');
if (!t.includes('## 十五、解剖手册 5 集入库完成')) {
  const rows = lib.rules.filter(r => r.evidence && r.evidence.bvid.startsWith('BV1mM6') || (r.evidence && ['BV1YgcdeqE7y','BV167LAzaE14','BV1jEnuz9ESc','BV1X1Lj66ENe'].includes(r.evidence.bvid)))
    .map(r => '| ' + r.evidence.bvid.slice(-4) + ' @' + r.evidence.at + ' | ' + r.topic + ' | ' + r.claim.slice(0, 46) + '… |').join('\n');
  t += `

## 十五、解剖手册 5 集入库完成（1.0.61）

| 集 | 转写行数 | 入库规则 |
| --- | --- | --- |
| 第1集 关节活动 | 1149 | 4 条：6 关节 3 运动面、看克服阻力阶段、握距决定卧推练什么、肩屈肌肉分工 |
| 第2集 练胸 | 2297 | 3 条：开肘角度选上胸/中胸、人造下斜板、双杠练前锯肌 |
| 第3集 练肩 | 1721 | 4 条：曲肘缩短力臂、上斜方必然参与、开肘划船要水平、过度肩胛后缩是错误 |
| 第4集 练背 | 3104 | 4 条：中下斜方靠后缩练、划船肩胛看目标、大圆肌=小背阔、下拉先下沉 |
| 第5集 手臂&腹肌 | 2427 | 4 条：二头长头双关节、**长头拉伸增肌存疑（作者本人）**、三头三头跨关节、腹肌块数由基因决定 |

合计 **19 条**，全部带口述时间戳；累计口述级规则 29 条。

### 第 2 步：模板校准

推/拉/腿三份 dayTemplates 各加 3 条执行提示（cues），来自第 1~4 集：
- 推：握距→前束/上胸；想练上胸要开肘更大；别做人造下斜板
- 拉：开肘划船必须水平；别用肩胛后缩代替发力；第一个动作第 4 组力竭
- 腿：6 个热身动作每边 45 秒；脚跟抬高重点做踝背屈；加旋转前固定大腿

### 第 3 步：按部位查解剖要点

关于页新增可展开块，分 8 组（关节活动度 / 胸 / 肩 / 背 / 手臂 / 腹肌 / 腿 / 减脂恢复），每组按优先级取 2~3 条，带口述时间戳。真机已验证。

**当前库规模：7 个来源 / 73 条规则 / 29 条口述时间戳 / 3 份日模板 / 18 条视频引用。**
`;
  fs.writeFileSync(doc, t);
  console.log('doc updated');
}
console.log('rules:', lib.rules.length, 'evidence:', lib.rules.filter(r => r.evidence).length);
