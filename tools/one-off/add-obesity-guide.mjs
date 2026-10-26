import fs from 'node:fs';
import { patch } from '../lib/patch.mjs';

const lib = 'app/src/main/assets/training-principles.js';

patch(lib, [
  ['obesity guidance source',
   `    {
      id: 'community-digest',`,
   `    {
      id: 'cswz-2024',
      label: '《成人肥胖食养指南（2024年版）》',
      kind: '国家卫健委指南',
      ref: '国家卫生健康委员会 · 2024',
      via: '官方摘登全文（中国医药报转载）',
      level: 'A（国家部委指南）',
      priority: 2,
      url: 'http://bk.cnpharm.com/zgyyb/2025/03/29/320317.html',
      note: '适用人群是 BMI≥24 的超重与肥胖患者。能量下限（男 1200~1500、女 1000~1200 kcal）只适用于这一人群；本 App 的用户体重 64.6 kg、BMI 正常，因此仍以 2,000 kcal 硬底线为准，不能套用该下限。'
    },
    {
      id: 'community-digest',`],
]);

patch(lib, [
  ['obesity guidance rules',
   '    // ---------------- 中国居民膳食指南（A 级，官方八准则） ----------------',
   `    // ---------------- 成人肥胖食养指南（A 级，国家卫健委 2024） ----------------
    {
      id: 'cswz-energy-deficit',
      topic: '减脂执行',
      tags: ['general', 'fatloss', 'deficit'],
      claim: '肥胖食养指南的缺口口径：每日能量比需要量降低 30%~50%，或降 500~1000 kcal；限能量平衡膳食为男 1200~1500、女 1000~1200 kcal；也可按理想体重 ×15~35 kcal/kg 计算。',
      source: 'cswz-2024',
      confidence: '高（官方指南原文）',
      citation: {org: '国家卫健委', year: 2024, section: '食养原则一'},
      plan: {deficitPercent: [30, 50], deficitKcal: [500, 1000], floorKcal: {male: [1200, 1500], female: [1000, 1200]}}
    },
    {
      id: 'cswz-scope-vs-app-floor',
      topic: '减脂执行',
      tags: ['general', 'fatloss', 'rules'],
      claim: '那条 1000~1500 kcal 的下限只针对 BMI≥24 的超重/肥胖患者；体重 64.6 kg、BMI 正常的薄肌用户套用它会把摄入压到基础代谢以下。本 App 因此保留 2,000 kcal 底线，并靠「提高维持热量」而不是降底线来加快进度。',
      source: 'cswz-2024',
      confidence: '高（指南适用人群 + App 口径）',
      citation: {org: '国家卫健委', year: 2024, section: '适用人群'},
      plan: {appliesTo: 'BMI>=24', appFloor: 2000}
    },
    {
      id: 'cswz-macro-split',
      topic: '饮食配合',
      tags: ['general', 'diet', 'rules'],
      claim: '三大营养素供能比：脂肪 20%~30%、蛋白 15%~20%、碳水 50%~60%；三餐按 3:4:3 分配。对 64.6 kg 的人，蛋白 15%~20% 约等于 108~144 g，与本 App 的 142~155 g 基本对齐。',
      source: 'cswz-2024',
      confidence: '高（官方指南原文）',
      citation: {org: '国家卫健委', year: 2024, section: '食养原则一'},
      plan: {fatPercent: [20, 30], proteinPercent: [15, 20], carbPercent: [50, 60], meals: '3:4:3'}
    },
    {
      id: 'cswz-loss-rate',
      topic: '减脂执行',
      tags: ['general', 'fatloss'],
      claim: '理想减重目标：6 个月内减当前体重的 5%~10%；合理速度每月 2~4 kg；平稳下降每周 0.5~1 kg；起始目标建议每周约 0.5 kg。',
      source: 'cswz-2024',
      confidence: '高（官方指南原文）',
      citation: {org: '国家卫健委', year: 2024, section: '食养原则六'},
      plan: {sixMonthPercent: [5, 10], monthlyKg: [2, 4], weeklyKg: [0.5, 1], startWeeklyKg: 0.5}
    },
    {
      id: 'cswz-activity-dose',
      topic: '有氧',
      tags: ['general', 'cardio', 'frequency'],
      claim: '减重运动处方：每周 150~300 分钟中等强度有氧、5~7 天、至少隔天一次；抗阻每周 2~3 天、隔天一次、每次 10~20 分钟；每周运动消耗目标 ≥2000 kcal；静坐时间控制在每天 2~4 小时内。',
      source: 'cswz-2024',
      confidence: '高（官方指南原文）',
      citation: {org: '国家卫健委', year: 2024, section: '食养原则四'},
      plan: {cardioMinutes: [150, 300], resistanceDays: [2, 3], weeksKcal: 2000, sittingHours: [2, 4]}
    },
    {
      id: 'cswz-sleep-seven-23',
      topic: '恢复节奏',
      tags: ['general', 'sleep', 'fatloss'],
      claim: '经常熬夜、睡眠不足会引起内分泌紊乱与脂肪代谢异常，增加「过劳肥」风险；建议每日约 7 小时睡眠、尽量在 23 点前上床。',
      source: 'cswz-2024',
      confidence: '高（官方指南原文）',
      citation: {org: '国家卫健委', year: 2024, section: '食养原则四'},
      plan: {hours: 7, bedtime: '23:00'}
    },
    {
      id: 'cswz-food-portions',
      topic: '饮食配合',
      tags: ['general', 'diet'],
      claim: '减重期食物份量：谷薯 150~300 g（全谷杂豆 50~150、薯 50~100）；蔬菜 300~500 g（深色 ≥1/2）；水果约 200 g；水产每周 2 次或 280~525 g；畜禽每周 ≤500 g；蛋每周 280~350 g；低脂奶 300~500 ml；大豆 15~25 g；坚果每日约 10 g。',
      source: 'cswz-2024',
      confidence: '高（官方指南原文）',
      citation: {org: '国家卫健委', year: 2024, section: '食物选择'},
      plan: {grainG: [150, 300], vegG: [300, 500], fruitG: 200, fishWeeklyG: [280, 525], meatWeeklyMaxG: 500, eggWeeklyG: [280, 350], dairyMl: [300, 500], soyG: [15, 25], nutsDailyG: 10}
    },
    {
      id: 'cswz-meal-order',
      topic: '饮食配合',
      tags: ['general', 'diet', 'fatloss'],
      claim: '进餐顺序按「蔬菜 → 肉类 → 主食」有助于减少高能量食物摄入；细嚼慢咽、定时定量、晚餐 17:00~19:00、晚餐后不再进食（可饮水）。',
      source: 'cswz-2024',
      confidence: '高（官方指南原文）',
      citation: {org: '国家卫健委', year: 2024, section: '食养原则三'},
      plan: {order: ['蔬菜', '肉类', '主食'], dinnerWindow: ['17:00', '19:00']}
    },
    {
      id: 'cswz-oil-salt-tight',
      topic: '饮食配合',
      tags: ['general', 'diet', 'rules'],
      claim: '减重期比一般人群更严：烹调油 ≤20~25 g/天、盐 ≤5 g/天、添加糖最好 <25 g/天；蒸煮熘与水滑优先，少油煎炸。',
      source: 'cswz-2024',
      confidence: '高（官方指南原文）',
      citation: {org: '国家卫健委', year: 2024, section: '食养原则二'},
      plan: {oilG: [20, 25], saltG: 5, addedSugarG: 25}
    },
    {
      id: 'cswz-alcohol-cost',
      topic: '饮食配合',
      tags: ['general', 'diet', 'fatloss'],
      claim: '酒精约 7 kcal/g，且几乎不含其他营养素；减重期应严格限制饮酒——一顿酒很容易吃掉几百千卡而不带来饱腹感。',
      source: 'cswz-2024',
      confidence: '高（官方指南原文）',
      citation: {org: '国家卫健委', year: 2024, section: '食养原则二'},
      plan: {kcalPerGram: 7}
    },

    // ---------------- 中国居民膳食指南（A 级，官方八准则） ----------------`],
]);

patch(lib, [
  ['priority includes the obesity guide',
   "  priority: ['cdg-2022', 'issn-2017', 'helms-2014', 'aasm-2015', 'csr-2023', 'asr-transcript', 'ksw-tcy-3split', 'community-digest', 'hrss-channel', 'tcy-channel', 'ksw-channel', 'alex-channel'],",
   "  priority: ['cdg-2022', 'cswz-2024', 'issn-2017', 'helms-2014', 'aasm-2015', 'csr-2023', 'asr-transcript', 'ksw-tcy-3split', 'community-digest', 'hrss-channel', 'tcy-channel', 'ksw-channel', 'alex-channel'],"],
]);

const loaded = new Function('window', fs.readFileSync(lib, 'utf8') + '\nreturn window.TRAINING_PRINCIPLES;')({});
console.log('sources:', loaded.sources.length, 'rules:', loaded.rules.length, 'citation:', loaded.rules.filter(r => r.citation).length);
