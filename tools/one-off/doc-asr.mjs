import fs from 'node:fs';

const lib = new Function('window', fs.readFileSync('app/src/main/assets/training-principles.js', 'utf8') + '\nreturn window.TRAINING_PRINCIPLES;')({});
const doc = 'D:\\AI\\codex\\轻衡_训练建议库_三位创作者拆解.md';
let t = fs.readFileSync(doc, 'utf8');

if (!t.includes('## 十二、本地 ASR：绕开无字幕的最后一条路')) {
  const asrRules = lib.rules.filter(r => r.evidence)
    .map(r => '| ' + r.id + ' | ' + r.evidence.bvid + ' @ ' + r.evidence.at + ' | ' + r.claim.slice(0, 60) + '… |')
    .join('\n');
  t += `

## 十二、本地 ASR：绕开无字幕的最后一条路

### 链路

1. 浏览器插件不可用（DSH 的 Web GUI 不是可装扩展的浏览器），改走公开接口：
   \`x/web-interface/view\` 取 cid → \`x/player/playurl?fnval=16\` 取 **DASH 音频直链**（带签名，无需登录）
2. 下载音频（Podcast 级码率 65 kbps，21 分钟约 10 MB）
3. **faster-whisper small + int8**，纯 CPU，本地转写（约 3.3× 实时）
4. 人工摘录要点 + 时间戳，写入知识库

> 仅用于个人学习，转写文本保存在本机 \`build/asr/\`，不进 App 包、不上传。

### 环境踩坑记录

| 问题 | 解决 |
| --- | --- |
| \`huggingface_hub\` 走 hf-xet 通道崩溃（httpx2/h11 不兼容） | 绕开 hf 库，用 curl 直接下 CTranslate2 模型文件（461 MB） |
| hf-mirror 返回 307/403 | 走本机代理 + \`curl -L\` |
| ffmpeg 被沙箱禁止写文件 | 不用 ffmpeg：faster-whisper 自带 PyAV 直接解码 m4s |
| \`preprocessor_config.json\` 404 | 该文件在 Systran 仓库不存在，删除即可，不影响加载 |

### 转写清单（5 个视频 / 合计 44 分钟）

| 视频 | 时长 | 行数 | 转写耗时 |
| --- | --- | --- | --- |
| 凯圣王-谭成义三分化①训练计划 BV1FcdZBNEm3 | 21:30 | 724 | 444s |
| 谭成义：最推荐的两个腹肌动作 BV1Ehn7zmEHN | 7:53 | 128 | 142s |
| 谭成义：非常详细的肩部教学 BV1utntzhE9a | 6:29 | 90 | 111s |
| 谭成义：手臂纯享版教学 BV1hyWwzeETh | 9:25 | 250 | 176s |
| ALEX：练腿前千万别直接上重量 BV1ncdUBGEs | 5:24 | 96 | 120s |

### 口述级发现（A 级，带时间戳）

| 规则 | 时间戳 | 要点 |
| --- | --- | --- |
${asrRules}

### 交叉验证的结果

- **与整理图一致**：推日 12/10/8、拉日前 3 组 RPE8 + 第 4 组力竭、腿日 3 组 RPE9 —— 口述与「课代表」图完全对得上，说明那份整理图可信
- **补充了图里没有的**：RPE 8 不是 RM；进阶顺序 12→8 → 3×8 → 4×8 → 2×6…4×5；75~80% 强度的复合主项**不做到力竭**；五分化不适合新手；不推荐练四休一；用晨脉/握力决定休息
- **纠正了库里旧说法**：腹肌不是「练两个动作就够」，而是**耐力肌群，一周可 4~5 次**，且练前必须海豹式拉伸（4×20s）；ALEX 腿日热身是 **6 个动作、每边 45 秒**（原先只写了 5 步）

### 当前库规模

**7 个来源 / 54 条规则 / 10 条带口述时间戳 / 18 条带视频 / 3 份日模板**，版本 \`${lib.version}\`。
`;
  fs.writeFileSync(doc, t);
  console.log('doc updated');
}
console.log('sources:', lib.sources.length, 'rules:', lib.rules.length, 'evidence:', lib.rules.filter(r => r.evidence).length);
