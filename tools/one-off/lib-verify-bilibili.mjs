import fs from 'node:fs';
const f = 'app/src/main/assets/training-principles.js';
let t = fs.readFileSync(f, 'utf8');

// 1) 三分化来源：升级为 A（结构证据），补 7 集清单
t = t.replace(`      level: 'B',
      priority: 1,`, `      level: 'A（标题/时长/简介来自 B 站公开接口）',
      priority: 1,
      season: '凯圣王-谭成义三分化（season 7937371，7 集）',
      episodes: [
        {bvid: 'BV1FcdZBNEm3', title: '①训练计划', seconds: 1290},
        {bvid: 'BV1CSoKBaEgK', title: '②跟练胸肩三头', seconds: 5051},
        {bvid: 'BV1hCdSBaEvw', title: '③名词释义', seconds: 1195},
        {bvid: 'BV1v5opBhEDc', title: '④跟练背三角肩后束二头', seconds: 5049},
        {bvid: 'BV17ooLBUEqS', title: '合集', seconds: 16071},
        {bvid: 'BV17aovBqEdg', title: '⑤跟练腿股四头肌腘绳肌', seconds: 3489},
        {bvid: 'BV1SEorB6Ekj', title: '⑥约练背vlog', seconds: 3810}
      ],`);

// 2) ALEX 来源纠正：拉伸/热身，不是有氧减脂系列
t = t.replace(`      via: '频道页、视频标题（有氧减脂跟练、练腿前热身）',
      level: 'C',`, `      via: 'B 站公开接口：频道 season 与视频标题',
      level: 'A（标题/时长）/ C（内容细节）',`);
t = t.replace(`      note: '以「跟着 ALEX 有氧减脂」跟练与部位热身教学为主；只取通用做法。'`,
`      note: '频道主打拉伸与热身：season 3806101「每日拉伸跟练，全身放松！」共 16 集（全身/臀腿/肩颈/泡沫轴/练腿日动态拉伸，7~14 分钟）。「跟着 ALEX 有氧减脂」40 分钟系列是第三方 up 主跟练其视频的再上传，只能作为其有氧内容存在性的 C 级证据。',
      episodes: [
        {bvid: 'BV1ncdUBGEbS', title: '练腿前千万别直接上重量！这套热身太关键了', seconds: 324},
        {bvid: 'BV1rh4Ne3Evt', title: '12分钟全身拉伸｜缓解酸痛｜提高灵活性', seconds: 742},
        {bvid: 'BV1MFzhBwE1B', title: '泡沫轴滚腿：正确臀腿放松教学+跟练', seconds: 422},
        {bvid: 'BV1Qxhv6cEgj', title: '腿部深度拉伸｜练后放松·睡前舒缓', seconds: 572},
        {bvid: 'BV1hE421w7qF', title: '8分钟肩颈放松｜久坐腰酸背痛', seconds: 491}
      ],`);

// 3) 新增三条已验证规则
t = t.replace(`  rules: [
    // ---------------- 训练结构（P1） ----------------`,
`  rules: [
    // ---------------- 拉伸与热身（P3，已核验标题/时长） ----------------
    {
      id: 'stretch-after-training',
      topic: '恢复节奏',
      tags: ['general', 'recovery', 'stretch'],
      claim: '训练后做 8~12 分钟全身拉伸（每部位 30~45 秒），缓解酸痛、恢复活动度；ALEX 频道有 12 分钟全身拉伸与腿部深度拉伸两套跟练。',
      source: 'alex-channel',
      confidence: '中高（标题/时长已核验）',
      plan: {minutes: [8, 12], perStretchSec: [30, 45]}
    },
    {
      id: 'foam-roll-legs',
      topic: '恢复节奏',
      tags: ['legs', 'recovery', 'stretch'],
      claim: '臀腿用泡沫轴放松约 7 分钟，重点在臀中肌、股四头外侧与腘绳肌；滚错位置（直接滚膝窝、腰椎）反而有害。',
      source: 'alex-channel',
      confidence: '中（标题已核验，细节未逐字）',
      plan: {minutes: [5, 8]}
    },
    {
      id: 'desk-neck-release',
      topic: '恢复节奏',
      tags: ['general', 'recovery', 'desk'],
      claim: '久坐者每天 8 分钟肩颈放松（含胸小肌、上斜方与胸椎伸展），能缓解圆肩与久坐腰背不适。',
      source: 'alex-channel',
      confidence: '中低（标题已核验，细节未逐字）',
      plan: {minutes: [8, 9]}
    },

    // ---------------- 训练结构（P1） ----------------`);

// 4) 热身规则补上已核验的时长
t = t.replace(`      claim: '练腿前先做髋、踝与臀中肌激活，再上重量；直接上大重量是最常见的受伤路径。',
      source: 'alex-channel',
      confidence: '中低',
      plan: {warmupMinutes: [6, 10]}`,
`      claim: '练腿前先做 6~8 分钟动态拉伸与髋、踝、臀中肌激活，再上重量；ALEX 有专门一期「练腿前千万别直接上重量」（5 分 24 秒）。',
      source: 'alex-channel',
      confidence: '中高（标题/时长已核验）',
      plan: {warmupMinutes: [6, 8]}`);

fs.writeFileSync(f, t);
const lib = new Function('window', fs.readFileSync(f, 'utf8') + '\nreturn window.TRAINING_PRINCIPLES;')({});
console.log('sources:', lib.sources.length, 'rules:', lib.rules.length);
console.log('season episodes:', lib.sources[0].episodes.length, 'alex episodes:', lib.sources[2].episodes.length);
