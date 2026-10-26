import fs from 'node:fs';
import { patch } from '../lib/patch.mjs';

const lib = 'app/src/main/assets/training-principles.js';

patch(lib, [
  ['arm and abs rules from episode five',
   '    // ---------------- 口述级规则（A 级，ASR 转写） ----------------',
   `    // ---------------- 手臂与腹肌（A 级，好人松松第 5 集 ASR） ----------------
    {
      id: 'biceps-long-head-dual-joint',
      topic: '动作细节',
      tags: ['isolation', 'arm'],
      claim: '肱二头长头是跨越肩与肘的双关节肌：只有上臂处在身体前方时，长头才有前后关系、才能在屈肘之外参与肩伸；上臂贴在体侧时它不参与肩伸。',
      source: 'asr-transcript',
      confidence: '高（本人口述 33:13~33:55）',
      evidence: {bvid: 'BV1X1Lj66ENe', at: '33:13'},
      plan: {joints: ['肩', '肘'], position: 'arm-in-front'}
    },
    {
      id: 'long-head-stretch-myth',
      topic: '强度控制',
      tags: ['isolation', 'arm'],
      claim: '「在过头位或身后位拉长三头长头、让它继续收缩就能更好增肌」——作者本人明确表示存疑：缺乏循证研究，很可能不成立，不应作为训练依据。',
      source: 'asr-transcript',
      confidence: '高（本人口述 40:23~41:11，作者存疑）',
      evidence: {bvid: 'BV1X1Lj66ENe', at: '40:23'},
      plan: {status: 'unproven'}
    },
    {
      id: 'triceps-heads-crossing',
      topic: '解剖基础',
      tags: ['isolation', 'arm', 'anatomy'],
      claim: '肱三头分长头、外侧头、内侧头：长头起于肩胛骨、跨肩与肘，外侧头与内侧头只跨肘——所以只做体侧下压，长头的肩伸部分基本不参与。',
      source: 'asr-transcript',
      confidence: '高（本人口述 35:27~36:23、41:00）',
      evidence: {bvid: 'BV1X1Lj66ENe', at: '35:27'},
      plan: {heads: 3, crossing: ['long']}
    },
    {
      id: 'abs-blocks-are-genetic',
      topic: '解剖基础',
      tags: ['abs', 'anatomy'],
      claim: '腹直肌的腱划有 2 条、3 条或 4 条，取决于基因，决定了你是四块、六块还是八块腹肌——训练只能让腹肌变厚、变清晰，不能增加块数。',
      source: 'asr-transcript',
      confidence: '高（本人口述 63:32~63:40）',
      evidence: {bvid: 'BV1X1Lj66ENe', at: '63:32'},
      plan: {blocks: 'genetic'}
    },

    // ---------------- 口述级规则（A 级，ASR 转写） ----------------`],
]);

const loaded = new Function('window', fs.readFileSync(lib, 'utf8') + '\nreturn window.TRAINING_PRINCIPLES;')({});
console.log('rules:', loaded.rules.length, 'evidence:', loaded.rules.filter(r => r.evidence).length);
const eps = new Set(loaded.rules.filter(r => r.evidence).map(r => r.evidence.bvid));
console.log('transcribed videos cited:', [...eps].join(', '));
