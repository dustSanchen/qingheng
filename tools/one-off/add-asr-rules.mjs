import fs from 'node:fs';
import { patch } from '../lib/patch.mjs';

const lib = 'app/src/main/assets/training-principles.js';

// 1) 新来源：本地 ASR 转写（A 级，创作者本人口述）
patch(lib, [
  ['asr transcript source',
   `    {
      id: 'community-digest',`,
   `    {
      id: 'asr-transcript',
      label: '四位 UP 视频口述（本地 ASR 转写）',
      kind: '视频口述',
      ref: 'faster-whisper small int8 本地转写（个人学习用途）',
      via: 'B 站公开接口取音频 → 本地 ASR → 人工摘录',
      level: 'A（创作者本人口述，含时间戳）',
      priority: 1,
      url: 'https://www.bilibili.com/video/BV1FcdZBNEm3',
      note: '本轮转写 5 个高价值视频（合计 44 分钟）：三分化①训练计划、谭成义腹肌/肩部/手臂、ALEX 练腿前热身。口述是创作者本人说的，比标题级证据高一级；ASR 有少量同音字（体脂率→踢直低、肌肥大→机肥大），摘录时已按上下文校正。',
      episodes: [
        {bvid: 'BV1FcdZBNEm3', title: '凯圣王-谭成义三分化①训练计划', seconds: 1290, lines: 724},
        {bvid: 'BV1Ehn7zmEHN', title: '谭成义：最推荐的两个腹肌动作', seconds: 473, lines: 128},
        {bvid: 'BV1utntzhE9a', title: '谭成义：非常详细的肩部教学', seconds: 389, lines: 90},
        {bvid: 'BV1hyWwzeETh', title: '谭成义：手臂纯享版教学', seconds: 565, lines: 250},
        {bvid: 'BV1ncdUBGEbS', title: 'ALEX：练腿前千万别直接上重量', seconds: 324, lines: 96}
      ]
    },
    {
      id: 'community-digest',`],
]);

// 2) 8 条口述级规则（带时间戳）
patch(lib, [
  ['asr rules',
   '    // ---------------- 日模板（P1 视频 + C 级整理图互证） ----------------',
   `    // ---------------- 口述级规则（A 级，ASR 转写） ----------------
    {
      id: 'abs-endurance-training',
      topic: '动作细节',
      tags: ['general', 'abs'],
      claim: '腹肌是耐力型肌群，一周练 4~5 次都没问题；体脂低但腹肌薄、浅说明只减脂没练腹肌，必须刻意练。',
      source: 'asr-transcript',
      confidence: '高（本人口述 00:31）',
      evidence: {bvid: 'BV1Ehn7zmEHN', at: '00:31'},
      plan: {sessionsPerWeek: [4, 5]}
    },
    {
      id: 'abs-two-moves-detail',
      topic: '动作细节',
      tags: ['general', 'abs'],
      claim: '腹肌只安排两个动作：悬垂举腿（身体撑起让腹肌预收缩，下放不要到底，抬得高，可加旋转）与反向山羊挺身（反过来面朝上，大腿后侧用力抵垫子保持骨盆稳定，只做上下不卷腹）；不推荐卷腹，对结构影响大、前侧易紧张。',
      source: 'asr-transcript',
      confidence: '高（本人口述 03:26~07:41）',
      evidence: {bvid: 'BV1Ehn7zmEHN', at: '03:26'},
      plan: {moves: ['悬垂举腿', '反向山羊挺身'], avoid: ['卷腹']}
    },
    {
      id: 'abs-stretch-before',
      topic: '动作细节',
      tags: ['general', 'abs', 'warmup'],
      claim: '练腹前先做海豹式拉伸 4 组、每组约 20 秒：双手撑在肋骨两侧，深吸气把气维持在腹腔再后仰，用呼吸对抗；气一松腰的压力就大了。',
      source: 'asr-transcript',
      confidence: '高（本人口述 01:07~02:50）',
      evidence: {bvid: 'BV1Ehn7zmEHN', at: '01:07'},
      plan: {sets: 4, seconds: 20}
    },
    {
      id: 'lateral-raise-partial',
      topic: '动作细节',
      tags: ['push', 'shoulder'],
      claim: '侧平举下放只到全程的 2/3，不要放到底——放到底张力就松了；同时肋骨收住、腰背贴凳、头颈稳定，否则练的是腰不是肩。',
      source: 'asr-transcript',
      confidence: '高（本人口述 02:08~02:19）',
      evidence: {bvid: 'BV1utntzhE9a', at: '02:08'},
      plan: {rangeOfMotion: '2/3'}
    },
    {
      id: 'rear-delt-neutral-grip',
      topic: '动作细节',
      tags: ['pull', 'shoulder'],
      claim: '俯身哑铃飞鸟用对握、重量偏轻，从外展位开始、胸口抵凳：对握能保住中束与后束之间的形态完整性，正握虽然更孤立但会让那个「坑」变大。',
      source: 'asr-transcript',
      confidence: '高（本人口述 03:16~03:44）',
      evidence: {bvid: 'BV1utntzhE9a', at: '03:16'},
      plan: {grip: 'neutral', start: 'abducted'}
    },
    {
      id: 'leg-warmup-six-moves',
      topic: '恢复节奏',
      tags: ['legs', 'warmup'],
      claim: '练腿前做 6 个激活动作、每边 45 秒：髋关节开合（膝盖尽量贴地）、内收肌（脚面相对）、前脚踝+后侧链（脚跟不离地）、髋激活（手指尖朝侧或后、膝盖伸直）、踝+大腿内侧（膝盖伸直、扭转到底）、踝背屈（身体前倾压脚踝、脚跟踩实）；深蹲时脚跟易抬高的人尤其要做最后一个。',
      source: 'asr-transcript',
      confidence: '高（本人逐动作讲解 00:25~04:56）',
      evidence: {bvid: 'BV1ncdUBGEbS', at: '00:25'},
      plan: {moves: 6, secondsPerSide: 45}
    },
    {
      id: 'rpe8-is-not-rm',
      topic: '强度控制',
      tags: ['main', 'progression'],
      claim: '计划里的 12/10/8 次不是 RM（力竭次数），而是每组留约 2 次余量（RPE 8）；递进顺序是 10 次改 8 次 → 12 次也改 8 次 → 3 组 8 次 → 4 组 8 次 → 2 组 6 次 → 3 组 6 次 → 4 组 6 次 → 2/3/4 组 5 次，全程 RPE 8。',
      source: 'asr-transcript',
      confidence: '高（本人口述 06:03~09:12）',
      evidence: {bvid: 'BV1FcdZBNEm3', at: '06:03'},
      plan: {rpe: 8, ladder: ['12→8', '3×8', '4×8', '2×6', '3×6', '4×6', '2×5', '3×5', '4×5']}
    },
    {
      id: 'compound-deload-not-failure',
      topic: '强度控制',
      tags: ['main'],
      claim: '强度大（约 75%~80% 1RM）的复合主项不做到力竭：第一下就募集到足够快肌纤维，力竭只会让神经「披露」（恢复不过来）；只有低强度、孤立动作才做到力竭。',
      source: 'asr-transcript',
      confidence: '高（本人口述 19:27~19:58）',
      evidence: {bvid: 'BV1FcdZBNEm3', at: '19:27'},
      plan: {failureOnlyForIsolation: true}
    },
    {
      id: 'no-five-day-split',
      topic: '训练结构',
      tags: ['general', 'beginner', 'frequency'],
      claim: '五分化不适合新手：频率太慢（同一部位隔 6~7 天），却要求单次强度很大，一般人做不到；三分化频率高、强度适中、可持续渐进。',
      source: 'asr-transcript',
      confidence: '高（本人口述 20:04~20:31）',
      evidence: {bvid: 'BV1FcdZBNEm3', at: '20:04'},
      plan: {avoid: 'five-day-split'}
    },
    {
      id: 'rest-by-signal-not-calendar',
      topic: '恢复节奏',
      tags: ['general', 'recovery'],
      claim: '三分化不等于「练三休一」：用晨脉、握力等信号监测，发现疲劳时哪怕只练了两天也休息；不推荐连练四天。',
      source: 'asr-transcript',
      confidence: '高（本人口述 20:34~21:12）',
      evidence: {bvid: 'BV1FcdZBNEm3', at: '20:34'},
      plan: {signals: ['晨脉', '握力']}
    },

    // ---------------- 日模板（P1 视频 + C 级整理图互证） ----------------`],
]);

const loaded = new Function('window', fs.readFileSync(lib, 'utf8') + '\nreturn window.TRAINING_PRINCIPLES;')({});
console.log('sources:', loaded.sources.length, 'rules:', loaded.rules.length, 'with evidence:', loaded.rules.filter(r => r.evidence).length);
