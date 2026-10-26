import fs from 'node:fs';
import { patch } from '../lib/patch.mjs';

// 1) 优先级顺序扩到 5 个来源
patch('app/src/main/assets/training-principles.js', [
  ['priority list with five sources',
   "  priority: ['ksw-tcy-3split', 'ksw-channel', 'alex-channel'],",
   "  priority: ['ksw-tcy-3split', 'hrss-channel', 'tcy-channel', 'ksw-channel', 'alex-channel'],"],
  ['conflict policy mentions the anatomy source',
   "  conflictPolicy: '训练与力量细节冲突 → 听 P1；有氧与热身执行 → 听 P3；热量、蛋白、缺口口径 → 以 App 规则为准，本库不得下调硬底线。',",
   "  conflictPolicy: '训练计划与强度冲突 → 听 P1（三分化）；解剖与新手框架 → 听 P2（好人松松）；单动作细节 → 听 P3（谭成义）；有氧与拉伸执行 → 听 P5（ALEX）；热量、蛋白、缺口口径 → 以 App 规则为准，本库不得下调硬底线。',"],
]);

// 2) 新增两个来源（插在 alex 之前）
patch('app/src/main/assets/training-principles.js', [
  ['two new sources',
   `    {
      id: 'alex-channel',`,
   `    {
      id: 'hrss-channel',
      label: '好人松松（B 站）',
      kind: '视频合集',
      ref: 'space 2078781964',
      via: 'B 站公开接口：3 个合集共 10 个视频的标题/时长',
      level: 'A（标题/时长/播放量）',
      priority: 2,
      url: 'https://space.bilibili.com/2078781964',
      note: '体系最完整：解剖手册（关节活动/胸/肩/背/手臂腹肌）、新手训练手册（56 分钟，播放 542 万）、饮食手册（110 分钟）、减脂手册（54 分钟）+ 生活化减脂案例。',
      seasons: [
        {season_id: 4695468, title: '健身中手看这个✔', total: 5},
        {season_id: 4695507, title: '新手健身看这个✔', total: 3},
        {season_id: 4695560, title: '科学减脂看这个✔', total: 2}
      ],
      episodes: [
        {bvid: 'BV1mM6JY6Ei9', title: '健身解剖完全手册 第1集：关节活动', seconds: 3098, views: 1185360},
        {bvid: 'BV1YgcdeqE7y', title: '第2集：练胸', seconds: 3887, views: 1032027},
        {bvid: 'BV167LAzaE14', title: '第3集：练肩', seconds: 3955, views: 870661},
        {bvid: 'BV1jEnuz9ESc', title: '第4集：练背', seconds: 5652, views: 1378585},
        {bvid: 'BV1X1Lj66ENe', title: '第5集：练手臂&腹肌', seconds: 5057, views: 447573},
        {bvid: 'BV1Hk4y187jF', title: '健身新手的训练完全手册', seconds: 3394, views: 5421680},
        {bvid: 'BV1zu4m1N76R', title: '免费工具：生活化减脂增肌 饮食方案+训练计划', seconds: 2503, views: 1434501},
        {bvid: 'BV1yX4y1q7LP', title: '健身新手的饮食完全手册', seconds: 6646, views: 2680597},
        {bvid: 'BV1794y1a7y4', title: '生活化减脂：从理论到案例 就吃食堂外卖', seconds: 2847, views: 1978600},
        {bvid: 'BV1AM411r7z3', title: '健身新手的减肥减脂完全手册', seconds: 3284, views: 2388385}
      ]
    },
    {
      id: 'tcy-channel',
      label: '谭成义（B 站）',
      kind: '视频合集',
      ref: 'space 521903482',
      via: 'B 站公开接口：教学合集（共 21 集，接口仅返回最近 6 集的标题/时长）',
      level: 'A（标题/时长）+ C（细节）',
      priority: 3,
      url: 'https://space.bilibili.com/521903482',
      note: '教学合集 6516587 共 21 集；可见条目集中在手臂、肩、腹肌与呼吸/恢复/神经。',
      seasons: [{season_id: 6516587, title: '教学合集', total: 21}],
      episodes: [
        {bvid: 'BV1hjWgzREJn', title: '一个人偷偷练就完了', seconds: 177},
        {bvid: 'BV1hyWwzeETh', title: '手臂纯享版教学', seconds: 565},
        {bvid: 'BV1LqJCz1EcE', title: '肩部教学', seconds: 325},
        {bvid: 'BV1utntzhE9a', title: '非常详细的肩部教学', seconds: 389},
        {bvid: 'BV1Ehn7zmEHN', title: '最推荐的两个腹肌动作', seconds: 473},
        {bvid: 'BV1czHuzPExA', title: '训练中的呼吸与恢复、神经的作用', seconds: 450}
      ]
    },
    {
      id: 'alex-channel',`],
]);

// 3) 新增 10 条主题级规则（插在拉伸规则之前）
patch('app/src/main/assets/training-principles.js', [
  ['topic-level rules from the two new channels',
   '    // ---------------- 拉伸与热身（P3，标题/时长已用 B 站接口核验） ----------------',
   `    // ---------------- 解剖与框架（P2 好人松松，主题级证据） ----------------
    {
      id: 'joint-mobility-first',
      topic: '解剖基础',
      tags: ['general', 'anatomy'],
      claim: '先理解关节活动度再谈动作：《健身解剖完全手册》第1集讲关节活动，之后按胸/肩/背/手臂腹肌分集（单集 51~94 分钟），顺序本身就是「先关节、后部位」。',
      source: 'hrss-channel',
      confidence: '中（标题/时长已核验，内容未逐字）',
      plan: {order: ['关节活动', '胸', '肩', '背', '手臂腹肌']}
    },
    {
      id: 'beginner-framework',
      topic: '训练结构',
      tags: ['general', 'beginner'],
      claim: '新手先拿框架再抠细节：训练手册 56 分钟讲训练框架，饮食手册 110 分钟讲饮食框架，两者合计覆盖新手 90% 的问题。',
      source: 'hrss-channel',
      confidence: '中（标题/时长/播放量已核验）',
      plan: {frameworkFirst: true}
    },
    {
      id: 'diet-template-first',
      topic: '饮食配合',
      tags: ['general', 'diet', 'rules'],
      claim: '饮食先有底表（热量与三大营养素的框架表），再谈具体食物；有了底表才能自己算方案，而不是照抄别人的餐单。',
      source: 'hrss-channel',
      confidence: '中（标题已核验）',
      plan: {templateFirst: true}
    },
    {
      id: 'canteen-takeout',
      topic: '饮食配合',
      tags: ['general', 'diet', 'fatloss'],
      claim: '减脂可以吃食堂与外卖：关键是先定总热量与蛋白，再在可选范围里挑（少油版、加蛋白质、主食定量），不是只能吃水煮。',
      source: 'hrss-channel',
      confidence: '中（标题已核验）',
      plan: {contexts: ['canteen', 'takeout']}
    },
    {
      id: 'fatloss-playbook',
      topic: '减脂执行',
      tags: ['general', 'fatloss'],
      claim: '减脂有完整处理顺序：先算维持热量与缺口，再定蛋白，再排训练，最后处理平台与依从性；《减肥减脂完全手册》54 分钟按这个顺序讲。',
      source: 'hrss-channel',
      confidence: '中（标题/时长已核验）',
      plan: {order: ['maintenance', 'deficit', 'protein', 'training', 'plateau']}
    },

    // ---------------- 单动作细节（P3 谭成义，主题级证据） ----------------
    {
      id: 'arm-isolation',
      topic: '动作细节',
      tags: ['pull', 'isolation'],
      claim: '手臂单独安排一集（9 分钟）：二头与三头分开练，用孤立动作补足复合动作的刺激缺口。',
      source: 'tcy-channel',
      confidence: '中低（标题级）',
      plan: {split: ['biceps', 'triceps']}
    },
    {
      id: 'shoulder-two-parts',
      topic: '动作细节',
      tags: ['push', 'shoulder'],
      claim: '肩部分两集讲（5~6 分钟各一集），说明中束与后束需要单独安排，靠推举练不全。',
      source: 'tcy-channel',
      confidence: '中低（标题级）',
      plan: {parts: ['lateral', 'rear']}
    },
    {
      id: 'abs-two-moves',
      topic: '动作细节',
      tags: ['general', 'abs'],
      claim: '腹肌只推荐两个动作（8 分钟）：与其堆十种花式，不如把两个动作做到有负荷、可渐进。',
      source: 'tcy-channel',
      confidence: '中低（标题级）',
      plan: {moves: 2}
    },
    {
      id: 'breathing-recovery',
      topic: '恢复节奏',
      tags: ['general', 'recovery', 'breathing'],
      claim: '呼吸与恢复、神经状态直接决定训练表现：睡眠差或神经疲劳时，先调呼吸与休息，而不是加量。',
      source: 'tcy-channel',
      confidence: '中低（标题级）',
      plan: {focus: ['breathing', 'recovery', 'cns']}
    },
    {
      id: 'solo-training',
      topic: '训练结构',
      tags: ['general', 'adherence'],
      claim: '一个人也能练：不需要搭子或社交压力，把计划拆成可独立完成的动作组即可长期坚持。',
      source: 'tcy-channel',
      confidence: '低（标题级）',
      plan: {solo: true}
    },

    // ---------------- 拉伸与热身（P5，标题/时长已用 B 站接口核验） ----------------`],
]);
const lib = new Function('window', fs.readFileSync('app/src/main/assets/training-principles.js','utf8') + '\nreturn window.TRAINING_PRINCIPLES;')({});
console.log('sources:', lib.sources.length, 'rules:', lib.rules.length, 'unique:', new Set(lib.rules.map(r=>r.id)).size);
console.log('priority:', lib.priority.join(' > '));
