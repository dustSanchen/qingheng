import fs from 'node:fs';
import { patch } from '../lib/patch.mjs';

const lib = 'app/src/main/assets/training-principles.js';

// 1) 新来源：评论区「课代表」整理图（C 级，但与 P1 视频互证）
patch(lib, [
  ['community digest source',
   `  /** 每个模板的建议动作（P1 板书），用户没有历史时用它给出可执行建议。 */`,
   `  /**
   * 评论区「课代表」整理的训练处方（图片，C 级证据）。三个 UP 的视频没有字幕，
   * 但评论区有读者按视频整理的推/拉/腿完整处方，具体到组数、次数、RPE 与进阶路线。
   * 与 P1 视频标题/结构互证，因此可用；仍按 C 级标注，不当作医学建议。
   */
  dayTemplates: {
    push: {
      label: '推日 · 胸 / 三角肌中束 / 肱三头肌',
      source: 'community-digest',
      warmup: ['转肩/弹力带活动', '俯卧撑或空杆热身 15 次 RPE8'],
      exercises: [
        {name: '杠铃卧推', role: '胸（主项）', sets: 3, reps: '12/10/8', rpe: 8, progression: '四组 8 次 RPE8 熟练后 → 热身外两组 6 次 → 三组 6 次 → 四组 6 次，再降容量加重量'},
        {name: '哑铃上斜卧推', role: '胸', sets: 4, reps: 12, rpe: 8, progression: '第4组提到 RPE9.5 → 两级后第3、4组力竭；最多两组力竭'},
        {name: '双杠臂屈伸', role: '下胸/三头', sets: 4, reps: 12, rpe: 10, progression: '做不到就先做支撑退阶或换下胸替代动作'},
        {name: '仰卧臂屈伸', role: '三头', sets: 4, reps: 15, rpe: 8, progression: '4×12 RPE8 → 后两组力竭 → 加组间歇/加重量'},
        {name: 'Y 字侧平举', role: '三角肌中束', sets: 3, reps: '10+10', rpe: 10, progression: '每组 10 次 → 组内歇 5 秒 → 再 10 次到力竭'}
      ]
    },
    pull: {
      label: '拉日 · 背 / 三角肌后束 / 肱二头肌',
      source: 'community-digest',
      warmup: ['伟大者伸展', '弹力带热身', '胸椎本体感受激活', '胸椎屈曲激活', '三头拉伸'],
      exercises: [
        {name: '单手钢线下拉', role: '背', sets: 4, reps: '12', rpe: 8, progression: '前3组12次RPE8，第4组10次RPE10，歇5秒再做5次；之后主要加重量'},
        {name: '对握高位下拉', role: '背/后束', sets: 4, reps: '8~12', rpe: 10, progression: '保证动作质量前提下尽量加重量'},
        {name: '单手器械划船', role: '背', sets: 4, reps: 10, rpe: 8, progression: '第4组力竭；之后减组数、加重量，保持 RPE8 进入循环'},
        {name: '坐姿开肘划船', role: '三角肌后束/中下斜方', sets: 4, reps: '15~12', rpe: 8, progression: '先做满 15 次，再逐步加重量降到 12 次'},
        {name: '钢线弯举', role: '肱二头', sets: 3, reps: 12, rpe: 8, progression: '加重量即可'}
      ]
    },
    legs: {
      label: '腿日 · 臀 / 股四头肌 / 腘绳肌',
      source: 'community-digest',
      warmup: ['动态青蛙趴', '髋关节 90/90', '脚踝激活（闭眼单侧平衡）', '泡沫轴松解胫骨前肌/小腿后侧/大腿前后/臀/阔筋膜张肌', '伟大者伸展'],
      exercises: [
        {name: '单腿硬拉', role: '臀/腘绳', sets: 3, reps: 12, rpe: 9, progression: '加重量；髋为轴转动，全掌踩死抓地'},
        {name: '单腿保加利亚蹲', role: '臀/股四', sets: 3, reps: 10, rpe: 9, progression: '前腿屈膝张力拉满；足背屈不足则降低坐幅'},
        {name: '高脚杯深蹲', role: '股四头', sets: 3, reps: 15, rpe: 9, progression: '动作连贯、张力在腿上；足背屈受限则降低坐幅'},
        {name: '杠铃罗马尼亚硬拉', role: '腘绳/臀', sets: 3, reps: 15, rpe: 9, progression: '杠铃只放到膝盖位，瓦式呼吸，杠铃贴腿'},
        {name: '山羊挺身', role: '竖脊肌', sets: 3, reps: 8, rpe: 9, progression: '膝盖不锁死，上身保持一体'}
      ]
    }
  },

  /** 每个模板的建议动作（P1 板书），用户没有历史时用它给出可执行建议。 */`],
]);

// 2) 来源注册
patch(lib, [
  ['register the digest source',
   `    {
      id: 'alex-channel',`,
   `    {
      id: 'community-digest',
      label: 'B 站评论区「课代表」整理图',
      kind: '网友整理',
      ref: '评论区图片（凯圣王×谭成义三分化：推/拉/腿各一张）',
      via: 'x/v2/reply 接口 + 图片阅读',
      level: 'C（与 P1 视频结构互证）',
      priority: 2,
      url: 'https://www.bilibili.com/video/BV1FcdZBNEm3',
      note: '按视频整理的处方图：三天各 5 个动作、组数/次数/RPE 与进阶路线写得很具体，比正片标题细一个量级。读者也指出视频口误：开肘划船应为中下斜方而非上斜方。'
    },
    {
      id: 'alex-channel',`],
]);

// 3) 三条日模板规则（可被问答引用）
patch(lib, [
  ['three day-template rules',
   '    // ---------------- 解剖与框架（P2 好人松松，主题级证据） ----------------',
   `    // ---------------- 日模板（P1 视频 + C 级整理图互证） ----------------
    {
      id: 'push-day-template',
      topic: '训练结构',
      tags: ['push'],
      claim: '推日按「杠铃卧推 → 哑铃上斜卧推 → 双杠臂屈伸 → 仰卧臂屈伸 → Y 字侧平举」排序：主项卧推守 RPE8（12/10/8），上斜 4×12 起，双杠与仰卧臂屈伸做力竭，侧平举用 10+10 休息停顿。',
      source: 'community-digest',
      confidence: '中（评论区整理图 + 视频结构互证）',
      plan: {order: ['卧推', '上斜哑铃卧推', '双杠臂屈伸', '仰卧臂屈伸', 'Y 字侧平举']},
      video: {bvid: 'BV1CSoKBaEgK', title: '三分化②——跟练胸肩三头', seconds: 5051}
    },
    {
      id: 'pull-day-template',
      topic: '训练结构',
      tags: ['pull'],
      claim: '拉日按「单手钢线下拉 → 对握高位下拉 → 单手器械划船 → 坐姿开肘划船 → 钢线弯举」排序：前三个动作第 4 组做到力竭（RPE10），开肘划船练中下斜方与后束，弯举 3×12 收尾。',
      source: 'community-digest',
      confidence: '中（评论区整理图 + 视频结构互证）',
      plan: {order: ['单手钢线下拉', '对握高位下拉', '单手器械划船', '坐姿开肘划船', '钢线弯举']},
      video: {bvid: 'BV1v5opBhEDc', title: '三分化④——跟练背三角肩后束二头', seconds: 5049}
    },
    {
      id: 'legs-day-template',
      topic: '训练结构',
      tags: ['legs'],
      claim: '腿日按「单腿硬拉 → 单腿保加利亚蹲 → 高脚杯深蹲 → 杠铃罗马尼亚硬拉 → 山羊挺身」排序，全部 3 组、RPE9，以单侧稳定性与后侧链为主；热身先做动态青蛙趴、髋 90/90、脚踝激活与泡沫轴松解。',
      source: 'community-digest',
      confidence: '中（评论区整理图 + 视频结构互证）',
      plan: {order: ['单腿硬拉', '单腿保加利亚蹲', '高脚杯深蹲', '杠铃罗马尼亚硬拉', '山羊挺身']},
      video: {bvid: 'BV17aovBqEdg', title: '三分化⑤——跟练腿股四头肌腘绳肌', seconds: 3489}
    },
    {
      id: 'rest-pause-isolation',
      topic: '强度控制',
      tags: ['push', 'pull', 'isolation'],
      claim: '单关节动作用「10+10 休息停顿」：做 10 次 → 组内歇 5 秒 → 再做到接近力竭；侧平举、下拉、划船都适合这种收尾方式。',
      source: 'community-digest',
      confidence: '中（整理图 + P1 力竭分区一致）',
      plan: {pattern: '10+10', intraRestSec: 5}
    },
    {
      id: 'warmup-legs-detailed',
      topic: '恢复节奏',
      tags: ['legs', 'warmup'],
      claim: '腿日热身按顺序做：动态青蛙趴（骨盆前倾/后倾对抗）→ 髋关节 90/90 → 脚踝激活（闭眼单侧平衡）→ 泡沫轴松解（胫骨前肌、小腿后侧、大腿前后、臀、阔筋膜张肌）→ 伟大者伸展；共 5 步，再上重量。',
      source: 'community-digest',
      confidence: '中（整理图）',
      plan: {steps: 5}
    },

    // ---------------- 解剖与框架（P2 好人松松，主题级证据） ----------------`],
]);

const loaded = new Function('window', fs.readFileSync(lib, 'utf8') + '\nreturn window.TRAINING_PRINCIPLES;')({});
console.log('sources:', loaded.sources.length, 'rules:', loaded.rules.length);
console.log('dayTemplates:', Object.keys(loaded.dayTemplates).join(','), 'exercises per day:', loaded.dayTemplates.push.exercises.length);
