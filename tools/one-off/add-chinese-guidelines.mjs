import fs from 'node:fs';
import { patch } from '../lib/patch.mjs';

const lib = 'app/src/main/assets/training-principles.js';

// 1) 两个中文官方来源
patch(lib, [
  ['chinese guideline sources',
   `    {
      id: 'community-digest',`,
   `    {
      id: 'cdg-2022',
      label: '《中国居民膳食指南（2022）》平衡膳食八准则',
      kind: '官方指南',
      ref: '中国营养学会 · 2022',
      via: '官网全文（八准则与核心推荐，已逐条核对数值）',
      level: 'A（国家级膳食指南）',
      priority: 2,
      url: 'http://dg.cnsoc.org/article/04/J4-AsD_DR3OLQMnHG0-jZA.html',
      note: '八准则：食物多样、吃动平衡、多吃蔬果奶类全谷大豆、适量鱼禽蛋瘦肉、少盐少油控糖限酒、规律进餐足量饮水、会烹会选会看标签、公筷分餐。数值已按原文录入。'
    },
    {
      id: 'csr-2023',
      label: '《中国睡眠研究报告2023》',
      kind: '调查报告',
      ref: '中国睡眠研究会等 · 2023',
      via: '公开报道数据（央视网/光明网）',
      level: 'B（抽样调查报告）',
      priority: 3,
      url: 'https://m.gmw.cn/2023-03/19/content_1303312753.htm',
      note: '2022 年中国民众平均每晚睡眠 7.40 小时；47.55% 不足 8 小时、16.79% 不足 7 小时；睡眠指数 67.77。'
    },
    {
      id: 'community-digest',`],
]);

// 2) 中式饮食与活动的可执行规则
patch(lib, [
  ['chinese guideline rules',
   '    // ---------------- 指南考据（A 级：ISSN / Helms / AASM） ----------------',
   `    // ---------------- 中国居民膳食指南（A 级，官方八准则） ----------------
    {
      id: 'cdg-salt-oil-sugar',
      topic: '饮食配合',
      tags: ['general', 'diet', 'rules'],
      claim: 'CDG 2022：盐 ≤5 g/天、烹调油 25~30 g/天、添加糖 ≤50 g（最好 <25 g）、反式脂肪 ≤2 g、酒精 ≤15 g。这组数字比「少吃油盐」更可执行，可直接当每日上限。',
      source: 'cdg-2022',
      confidence: '高（官方指南原文）',
      citation: {org: '中国营养学会', year: 2022, section: '准则五'},
      plan: {saltG: 5, oilG: [25, 30], addedSugarG: [0, 50], transFatG: 2, alcoholG: 15}
    },
    {
      id: 'cdg-veg-fruit-dairy',
      topic: '饮食配合',
      tags: ['general', 'diet'],
      claim: 'CDG 2022：蔬菜 ≥300 g/天（深色占一半）、水果 200~350 g/天、奶及奶制品 ≥300 ml/天；果汁不能替代鲜果。',
      source: 'cdg-2022',
      confidence: '高（官方指南原文）',
      citation: {org: '中国营养学会', year: 2022, section: '准则三'},
      plan: {vegG: 300, darkVegHalf: true, fruitG: [200, 350], dairyMl: 300}
    },
    {
      id: 'cdg-protein-foods',
      topic: '饮食配合',
      tags: ['general', 'protein', 'diet'],
      claim: 'CDG 2022：鱼禽蛋瘦肉平均每天 120~200 g；每周鱼 2 次或 300~500 g、蛋 300~350 g、畜禽肉 300~500 g；鸡蛋不要弃蛋黄，少吃深加工肉制品。',
      source: 'cdg-2022',
      confidence: '高（官方指南原文）',
      citation: {org: '中国营养学会', year: 2022, section: '准则四'},
      plan: {dailyG: [120, 200], fishWeeklyG: [300, 500], eggWeeklyG: [300, 350]}
    },
    {
      id: 'cdg-staple-variety',
      topic: '饮食配合',
      tags: ['general', 'carb', 'diet'],
      claim: 'CDG 2022：谷类 200~300 g/天（全谷物与杂豆 50~150 g、薯类 50~100 g）；平均每天 12 种以上食物、每周 25 种以上。',
      source: 'cdg-2022',
      confidence: '高（官方指南原文）',
      citation: {org: '中国营养学会', year: 2022, section: '准则一'},
      plan: {grainG: [200, 300], wholeGrainG: [50, 150], tuberG: [50, 100], dailyFoods: 12, weeklyFoods: 25}
    },
    {
      id: 'cdg-activity-week',
      topic: '训练结构',
      tags: ['general', 'cardio', 'frequency'],
      claim: 'CDG 2022：每周至少 5 天中等强度活动、累计 ≥150 分钟；抗阻训练每周 2~3 天；主动身体活动最好每天 6000 步。这与「每周 3~5 练」并不冲突——150 分钟是底线，不是上限。',
      source: 'cdg-2022',
      confidence: '高（官方指南原文）',
      citation: {org: '中国营养学会', year: 2022, section: '准则二'},
      plan: {moderateMinutes: 150, resistanceDays: [2, 3], steps: 6000}
    },
    {
      id: 'cdg-water',
      topic: '饮食配合',
      tags: ['general', 'diet'],
      claim: 'CDG 2022：温和气候、低活动水平下，成年男性每天饮水 1700 ml、女性 1500 ml；少量多次，白水或茶优先，不用含糖饮料代替水。',
      source: 'cdg-2022',
      confidence: '高（官方指南原文）',
      citation: {org: '中国营养学会', year: 2022, section: '准则六'},
      plan: {waterMl: {male: 1700, female: 1500}}
    },
    {
      id: 'cdg-eating-out',
      topic: '饮食配合',
      tags: ['general', 'diet', 'fatloss'],
      claim: 'CDG 2022 明确「在外就餐不忘适量与平衡」：食堂与外卖场景不是例外，先定份量与蛋白质，再选烹调方式（蒸煮炖优先、少油炸）。',
      source: 'cdg-2022',
      confidence: '高（官方指南原文）',
      citation: {org: '中国营养学会', year: 2022, section: '准则七'},
      plan: {contexts: ['canteen', 'takeout']}
    },
    {
      id: 'cdg-oil-fits-fat-floor',
      topic: '饮食配合',
      tags: ['general', 'fat', 'rules'],
      claim: 'CDG 的 25~30 g 烹调油本身已占本 App 脂肪下限（55 g）的一半左右，剩下由蛋、奶、肉、坚果补足——所以「脂肪 55~70 g」在膳食指南框架内是自洽的，不需要再压低。',
      source: 'cdg-2022',
      confidence: '高（据指南准则五推算）',
      citation: {org: '中国营养学会', year: 2022, section: '准则五'},
      plan: {oilG: [25, 30], fatFloorG: 55}
    },
    {
      id: 'csr-average-seven-four',
      topic: '恢复节奏',
      tags: ['general', 'sleep'],
      claim: '《中国睡眠研究报告2023》：2022 年国人平均每晚睡 7.40 小时，47.55% 不足 8 小时、16.79% 不足 7 小时——也就是说「7 小时」对近两成人已是上限，App 把 7 小时设为提醒下限是贴合现实的。',
      source: 'csr-2023',
      confidence: '中高（抽样调查公开数据）',
      citation: {org: '中国睡眠研究会', year: 2023},
      plan: {meanHours: 7.4, under8Percent: 47.55, under7Percent: 16.79}
    },

    // ---------------- 指南考据（A 级：ISSN / Helms / AASM） ----------------`],
]);

// 3) 优先级
patch(lib, [
  ['priority includes the chinese guideline',
   "  priority: ['issn-2017', 'helms-2014', 'aasm-2015', 'asr-transcript', 'ksw-tcy-3split', 'community-digest', 'hrss-channel', 'tcy-channel', 'ksw-channel', 'alex-channel'],",
   "  priority: ['cdg-2022', 'issn-2017', 'helms-2014', 'aasm-2015', 'csr-2023', 'asr-transcript', 'ksw-tcy-3split', 'community-digest', 'hrss-channel', 'tcy-channel', 'ksw-channel', 'alex-channel'],"],
]);

const loaded = new Function('window', fs.readFileSync(lib, 'utf8') + '\nreturn window.TRAINING_PRINCIPLES;')({});
console.log('sources:', loaded.sources.length, 'rules:', loaded.rules.length, 'citation:', loaded.rules.filter(r => r.citation).length);
