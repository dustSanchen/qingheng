import fs from 'node:fs';
import { patch } from '../lib/patch.mjs';
patch('app/src/main/assets/training-principles.js', [
  ['three verified recovery rules',
   '    // ---------------- 有氧（P3 + 通用） ----------------',
   `    // ---------------- 拉伸与热身（P3，标题/时长已用 B 站接口核验） ----------------
    {
      id: 'stretch-after-training',
      topic: '恢复节奏',
      tags: ['general', 'recovery', 'stretch'],
      claim: '训练后做 8~12 分钟全身拉伸（每个部位 30~45 秒），缓解酸痛并恢复活动度；ALEX 频道有 12 分钟全身拉伸与腿部深度拉伸两套跟练。',
      source: 'alex-channel',
      confidence: '中高（标题/时长已核验）',
      plan: {minutes: [8, 12], perStretchSec: [30, 45]}
    },
    {
      id: 'foam-roll-legs',
      topic: '恢复节奏',
      tags: ['legs', 'recovery', 'stretch'],
      claim: '臀腿用泡沫轴放松 5~8 分钟，重点是臀中肌、股四头外侧与腘绳肌；不要把泡沫轴压在膝窝或腰椎上。',
      source: 'alex-channel',
      confidence: '中（标题已核验，细节未逐字）',
      plan: {minutes: [5, 8]}
    },
    {
      id: 'desk-neck-release',
      topic: '恢复节奏',
      tags: ['general', 'recovery', 'desk'],
      claim: '久坐者每天 8 分钟肩颈放松（胸小肌、上斜方与胸椎伸展），缓解圆肩与久坐腰背不适。',
      source: 'alex-channel',
      confidence: '中低（标题已核验，细节未逐字）',
      plan: {minutes: [8, 9]}
    },

    // ---------------- 有氧（P3 + 通用） ----------------`],
]);
const lib = new Function('window', fs.readFileSync('app/src/main/assets/training-principles.js','utf8') + '\nreturn window.TRAINING_PRINCIPLES;')({});
console.log('rules now:', lib.rules.length);
