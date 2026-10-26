import fs from 'node:fs';
import { patch } from '../lib/patch.mjs';

const lib = 'app/src/main/assets/training-principles.js';

patch(lib, [
  ['shoulder rules from episode three',
   '    // ---------------- 口述级规则（A 级，ASR 转写） ----------------',
   `    // ---------------- 练肩（A 级，好人松松第 3 集 ASR） ----------------
    {
      id: 'lateral-raise-elbow-bend',
      topic: '动作细节',
      tags: ['shoulder'],
      claim: '侧平举可以曲肘：曲肘能缩短力臂、降低肩关节力矩，是「举不动」时最直接的调整，比甩腰借力安全。',
      source: 'asr-transcript',
      confidence: '高（本人口述 32:08~32:26）',
      evidence: {bvid: 'BV167LAzaE14', at: '32:08'},
      plan: {cue: '曲肘缩短力臂'}
    },
    {
      id: 'upper-trap-participates',
      topic: '动作细节',
      tags: ['shoulder'],
      claim: '正确的侧平举一定有上斜方参与，练完上斜方酸痛不代表动作错；中束最大力臂出现在肩外展 0~90° 区间。',
      source: 'asr-transcript',
      confidence: '高（本人口述 29:20~29:42、36:54）',
      evidence: {bvid: 'BV167LAzaE14', at: '29:20'},
      plan: {abductionRange: [0, 90]}
    },
    {
      id: 'rear-delt-row-must-flare',
      topic: '动作细节',
      tags: ['pull', 'shoulder'],
      claim: '用开肘划船练后束必须开肘到近乎水平，半开肘甚至假肘都练不到：水平外展才是后束的关节活动。',
      source: 'asr-transcript',
      confidence: '高（本人口述 54:11~56:19）',
      evidence: {bvid: 'BV167LAzaE14', at: '54:11'},
      plan: {elbowFlare: 'horizontal'}
    },
    {
      id: 'scapular-retraction-error',
      topic: '动作细节',
      tags: ['pull', 'shoulder'],
      claim: '划船时过度肩胛后缩是常见错误——它把「肩胛骨后缩」当成了发力，掩盖了肩水平外展；可以刻意做一点肩胛前引来抑制过度后缩。',
      source: 'asr-transcript',
      confidence: '高（本人口述 50:02~50:40）',
      evidence: {bvid: 'BV167LAzaE14', at: '50:02'},
      plan: {avoid: '过度肩胛后缩', cue: '肩胛前引抑制'}
    },

    // ---------------- 口述级规则（A 级，ASR 转写） ----------------`],
]);

const loaded = new Function('window', fs.readFileSync(lib, 'utf8') + '\nreturn window.TRAINING_PRINCIPLES;')({});
console.log('rules:', loaded.rules.length, 'evidence:', loaded.rules.filter(r => r.evidence).length);
