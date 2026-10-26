import fs from 'node:fs';
import { patch } from '../lib/patch.mjs';

const lib = 'app/src/main/assets/training-principles.js';

patch(lib, [
  ['back rules from episode four',
   '    // ---------------- 口述级规则（A 级，ASR 转写） ----------------',
   `    // ---------------- 练背（A 级，好人松松第 4 集 ASR） ----------------
    {
      id: 'traps-grow-by-retraction',
      topic: '动作细节',
      tags: ['pull', 'anatomy'],
      claim: '中斜方与下斜方都要靠「肩胛骨后缩」来练肌肥大：下斜方虽然也能让肩胛下沉（引体/下拉的起始），但那只算激活、不算肌肥大动作；真正的动作是大开手划船配合刻意的前伸→后缩。',
      source: 'asr-transcript',
      confidence: '高（本人口述 50:22~51:43）',
      evidence: {bvid: 'BV1jEnuz9ESc', at: '50:22'},
      plan: {movement: 'scapular-retraction', example: '大开手划船'}
    },
    {
      id: 'row-scapula-depends-on-goal',
      topic: '动作细节',
      tags: ['pull'],
      claim: '开手划船要不要刻意动肩胛，取决于目标：只练背阔与大圆肌就保持肩胛稳定；想兼练中下斜方就做前伸→后缩——两种说法都对，看你要什么。',
      source: 'asr-transcript',
      confidence: '高（本人口述 50:39~51:00）',
      evidence: {bvid: 'BV1jEnuz9ESc', at: '50:39'},
      plan: {stable: 'lats', retract: 'mid-lower-traps'}
    },
    {
      id: 'teres-major-is-small-lat',
      topic: '解剖基础',
      tags: ['pull', 'anatomy'],
      claim: '大圆肌又被称作「小背阔肌」：关节活动与背阔一样，肩伸前半程对它有利、后半程不利，所以仰卧上拉这类前半程肩伸动作对大圆肌更有效。',
      source: 'asr-transcript',
      confidence: '高（本人口述 15:01~15:26、23:41~24:54）',
      evidence: {bvid: 'BV1jEnuz9ESc', at: '15:01'},
      plan: {alias: '小背阔肌', effectiveRange: 'early-shoulder-extension'}
    },
    {
      id: 'scapular-depression-before-pull',
      topic: '动作细节',
      tags: ['pull', 'warmup'],
      claim: '引体/下拉在克服阻力阶段先让肩胛骨下沉，再拉大臂；这一步主要激活下斜方，是热身与动作启动的要点，但不能替代中下斜方的增肌训练。',
      source: 'asr-transcript',
      confidence: '高（本人口述 51:02~51:22）',
      evidence: {bvid: 'BV1jEnuz9ESc', at: '51:02'},
      plan: {step: 'scapular-depression-first'}
    },

    // ---------------- 口述级规则（A 级，ASR 转写） ----------------`],
]);

const loaded = new Function('window', fs.readFileSync(lib, 'utf8') + '\nreturn window.TRAINING_PRINCIPLES;')({});
console.log('rules:', loaded.rules.length, 'evidence:', loaded.rules.filter(r => r.evidence).length);
