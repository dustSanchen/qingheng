import fs from 'node:fs';

const libPath = 'app/src/main/assets/training-principles.js';
const lib = new Function('window', fs.readFileSync(libPath, 'utf8') + '\nreturn window.TRAINING_PRINCIPLES;')({});

const lines = ['| 来源 | 优先级 | 合集/结构 | 视频条数 |', '| --- | --- | --- | --- |'];
for (const s of lib.sources) {
  const eps = Array.isArray(s.episodes) ? s.episodes.length : 0;
  const seasons = Array.isArray(s.seasons)
    ? s.seasons.map(x => x.title + '(' + x.total + ')').join('、')
    : (s.season || '—');
  lines.push('| ' + s.label + ' | P' + s.priority + ' | ' + seasons + ' | ' + eps + ' |');
}

const videoRows = lib.rules.filter(r => r.video)
  .map(r => '| ' + r.topic + ' | ' + r.video.title + '（' + r.video.bvid + '） | ' + Math.round(r.video.seconds / 60) + ' 分钟 |')
  .join('\n');

const doc = 'D:\\AI\\codex\\轻衡_训练建议库_三位创作者拆解.md';
let t = fs.readFileSync(doc, 'utf8');
if (!t.includes('## 十、四位 UP 的合集结构与视频索引')) {
  t += `

## 十、四位 UP 的合集结构与视频索引（2026-10-24 晚）

用 B 站公开接口核到的结构（标题/时长/播放量），四个主页：

${lines.join('\n')}

**好人松松（2078781964）** 三个合集共 10 条：
- 《健身解剖完全手册》第 1~5 集：关节活动 51:38 / 练胸 64:47 / 练肩 65:55 / 练背 94:12 / 手臂&腹肌 84:17
- 《新手健身》：训练手册 56:34（播放 542 万）、饮食手册 110:46、免费工具（饮食方案+训练计划）41:43
- 《科学减脂》：生活化减脂（食堂外卖）47:27、减肥减脂完全手册 54:44

**谭成义（521903482）** 教学合集 6516587 共 21 集（接口仅返回最近 6 集）：
手臂纯享 9:25 / 肩部教学 5:25 / 详细肩部教学 6:29 / 最推荐的两个腹肌动作 7:53 / 呼吸与恢复·神经 7:30 / 一个人偷偷练 2:57

**凯圣王（2100737396）** 三分化 7 集（见第八节）｜**ALEX（1681952786）** 拉伸热身 16 集（见第八节）

### 视频索引（库中 ${lib.rules.filter(r => r.video).length} 条规则已挂视频）

| 主题 | 视频 | 时长 |
| --- | --- | --- |
${videoRows}

### 为什么没有逐字内容

- 这四个 UP 的相关视频 **subtitle.list 都是空**（未上传字幕），接口没有文字稿
- 合规前提下不下载视频音频做 ASR，因此规则停在「主题级 + 标题/时长」证据
- 但每条规则现在都挂 video（bvid/标题/时长），问答可以直接说「去看这一集」；摘要里也带 BV 号
`;
  fs.writeFileSync(doc, t);
  console.log('doc updated');
}

console.log('sources:', lib.sources.length);
console.log('rules:', lib.rules.length);
console.log('with video:', lib.rules.filter(r => r.video).length);
