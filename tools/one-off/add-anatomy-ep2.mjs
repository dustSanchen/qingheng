import fs from 'node:fs';
import { patch } from '../lib/patch.mjs';

const lib = 'app/src/main/assets/training-principles.js';

patch(lib, [
  ['chest rules from episode two',
   '    // ---------------- 口述级规则（A 级，ASR 转写） ----------------',
   `    // ---------------- 练胸（A 级，好人松松第 2 集 ASR） ----------------
    {
      id: 'elbow-angle-selects-chest',
      topic: '动作细节',
      tags: ['push', 'anatomy'],
      claim: '开肘角度决定推胸/夹胸练上胸还是中胸：开肘越大，胸的受力指点越高、水平拉力线越高，越偏上胸；开肘越小，受力点下移落到中胸——很多人以为在上斜板练上胸，其实开肘不够大，练的还是中胸。',
      source: 'asr-transcript',
      confidence: '高（本人口述 15:45~16:25）',
      evidence: {bvid: 'BV1YgcdeqE7y', at: '15:45'},
      plan: {moreElbowFlare: 'upper-chest', lessElbowFlare: 'mid-chest'}
    },
    {
      id: 'fake-decline-habit',
      topic: '动作细节',
      tags: ['push'],
      claim: '「人造下斜板」：坐姿动作把屁股往前挪、或刻意狠狠挺胸，会让躯干下斜化，大臂变成斜下运动，训练部位整体下移——这是上斜变成中下胸最常见的原因。',
      source: 'asr-transcript',
      confidence: '高（本人口述 16:25~16:51）',
      evidence: {bvid: 'BV1YgcdeqE7y', at: '16:25'},
      plan: {avoid: ['屁股前移', '过度挺胸']}
    },
    {
      id: 'dips-serratus',
      topic: '动作细节',
      tags: ['push'],
      claim: '双杠臂屈伸是推类动作里最能练前锯肌的：它没有靠背限制肩胛，推出阶段肩胛前移最明显；但难度大，新手不必执着。',
      source: 'asr-transcript',
      confidence: '高（本人口述 57:19~58:02）',
      evidence: {bvid: 'BV1YgcdeqE7y', at: '57:19'},
      plan: {target: '前锯肌', beginnerFriendly: false}
    },

    // ---------------- 口述级规则（A 级，ASR 转写） ----------------`],
]);

const loaded = new Function('window', fs.readFileSync(lib, 'utf8') + '\nreturn window.TRAINING_PRINCIPLES;')({});
console.log('rules:', loaded.rules.length, 'evidence:', loaded.rules.filter(r => r.evidence).length);
