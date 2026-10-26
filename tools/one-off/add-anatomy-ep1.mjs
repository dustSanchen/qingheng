import fs from 'node:fs';
import { patch } from '../lib/patch.mjs';

const lib = 'app/src/main/assets/training-principles.js';

patch(lib, [
  ['anatomy rules from episode one',
   '    // ---------------- 口述级规则（A 级，ASR 转写） ----------------',
   `    // ---------------- 解剖基础（A 级，好人松松第 1 集 ASR） ----------------
    {
      id: 'joint-motion-map',
      topic: '解剖基础',
      tags: ['general', 'anatomy', 'warmup'],
      claim: '健身只涉及 6 个关节（肩、肘、髋、膝、踝、肩胛胸壁）和 3 个运动面；动作↔关节活动↔肌肉是一一映射，几十上百个动作实质是十来种关节活动的组合。',
      source: 'asr-transcript',
      confidence: '高（本人口述 05:28~06:40）',
      evidence: {bvid: 'BV1mM6JY6Ei9', at: '05:28'},
      plan: {joints: 6, planes: 3}
    },
    {
      id: 'judge-by-resistance-phase',
      topic: '解剖基础',
      tags: ['general', 'anatomy'],
      claim: '判断一个动作属于哪种关节活动，要看「克服阻力」的阶段（通常是抬起阶段），不是下落阶段——下落时配重反而在帮大臂加速。',
      source: 'asr-transcript',
      confidence: '高（本人口述 08:06~08:36）',
      evidence: {bvid: 'BV1mM6JY6Ei9', at: '08:06'},
      plan: {phase: 'concentric'}
    },
    {
      id: 'bench-grip-decides-motion',
      topic: '动作细节',
      tags: ['push', 'anatomy'],
      claim: '卧推握距决定它练的是哪种关节活动：窄握（大臂在矢状面）= 肩屈，主要前束+上胸；宽握 = 大臂外展位/水平内收，更偏胸；所以「卧推练多少肩屈」取决于握距与开肘大小。',
      source: 'asr-transcript',
      confidence: '高（本人口述 08:42~09:12）',
      evidence: {bvid: 'BV1mM6JY6Ei9', at: '08:42'},
      plan: {narrow: 'shoulder-flexion', wide: 'horizontal-adduction'}
    },
    {
      id: 'shoulder-flexion-muscles',
      topic: '解剖基础',
      tags: ['push', 'anatomy'],
      claim: '肩屈的主要贡献者是前束（拉力线最接近矢状面），上胸次之；肱二头肌虽在矢状面但属双关节肌，受「节约法则」影响参与有限；不要以为整块胸大肌都参与肩屈，只有上胸。',
      source: 'asr-transcript',
      confidence: '高（本人口述 09:19~10:13）',
      evidence: {bvid: 'BV1mM6JY6Ei9', at: '09:19'},
      plan: {primary: ['前束'], secondary: ['上胸'], limited: ['肱二头肌']}
    },

    // ---------------- 口述级规则（A 级，ASR 转写） ----------------`],
]);

const loaded = new Function('window', fs.readFileSync(lib, 'utf8') + '\nreturn window.TRAINING_PRINCIPLES;')({});
console.log('rules:', loaded.rules.length, 'with evidence:', loaded.rules.filter(r => r.evidence).length);
