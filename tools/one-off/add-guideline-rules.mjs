import fs from 'node:fs';
import { patch } from '../lib/patch.mjs';

const lib = 'app/src/main/assets/training-principles.js';

// 1) 三个指南/文献来源
patch(lib, [
  ['guideline sources',
   `    {
      id: 'community-digest',`,
   `    {
      id: 'issn-2017',
      label: 'ISSN 蛋白质与运动立场声明（2017）',
      kind: '学术立场声明',
      ref: 'J Int Soc Sports Nutr 2017;14:20',
      via: 'PMC 全文（已核对原文数值）',
      level: 'A（学会立场声明）',
      priority: 2,
      url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC5477153/',
      note: '原文数值：日常 1.4~2.0 g/kg/d；热量缺口期 2.3~3.1 g/kg/d 以保住瘦体重；单餐 0.25 g/kg 或 20~40 g，每 3~4 小时一次；睡前酪蛋白 30~40 g。'
    },
    {
      id: 'helms-2014',
      label: 'Helms 等：自然健美备赛营养与补剂建议（2014）',
      kind: '综述',
      ref: 'J Int Soc Sports Nutr 2014;11:20',
      via: '开放获取全文（要点级引用）',
      level: 'A（系统综述）',
      priority: 2,
      url: 'https://www.tandfonline.com/doi/full/10.1186/1550-2783-11-20',
      note: '减脂期的通识：缺口要缓、蛋白要上调、抗阻训练要保留；具体数字以 App 口径为准。'
    },
    {
      id: 'aasm-2015',
      label: 'AASM/SRS 成人睡眠时长共识（2015）',
      kind: '指南共识',
      ref: 'Sleep 2015;38(6):843-844',
      via: '共识结论（未逐页核验原文）',
      level: 'A/B（学会共识，条目按公开结论记录）',
      priority: 2,
      url: 'https://jcsm.aasm.org/doi/10.5664/jcsm.4758',
      note: '成人推荐每晚 7 小时以上；长期不足与食欲、代谢和训练表现相关。'
    },
    {
      id: 'community-digest',`],
]);

// 2) 考据规则
patch(lib, [
  ['guideline rules',
   '    // ---------------- 口述级规则（A 级，ASR 转写） ----------------',
   `    // ---------------- 指南考据（A 级：ISSN / Helms / AASM） ----------------
    {
      id: 'protein-general-range',
      topic: '饮食配合',
      tags: ['general', 'protein'],
      claim: 'ISSN 立场声明：多数训练者的日常蛋白 1.4~2.0 g/kg 已足够增肌与维持；本 App 薄肌模式的 2.2~2.4 g/kg 落在更高一档，属于「减脂期保肌」而不是超标。',
      source: 'issn-2017',
      confidence: '高（立场声明原文）',
      citation: {org: 'ISSN', year: 2017, section: 'Position statement #2'},
      plan: {generalRange: [1.4, 2.0], appRange: [2.2, 2.4]}
    },
    {
      id: 'protein-deficit-range',
      topic: '饮食配合',
      tags: ['general', 'protein', 'deficit'],
      claim: '热量缺口期，抗阻训练者把蛋白提到 2.3~3.1 g/kg/d 更有利于保住瘦体重；缺口越大、训练年限越长，越应靠近上限。',
      source: 'issn-2017',
      confidence: '高（立场声明原文）',
      citation: {org: 'ISSN', year: 2017, section: 'Position statement #3'},
      plan: {deficitRange: [2.3, 3.1]}
    },
    {
      id: 'protein-per-meal',
      topic: '饮食配合',
      tags: ['general', 'protein'],
      claim: '单餐蛋白目标：0.25 g/kg 体重，或绝对量 20~40 g；一天分 3~4 餐、每 3~4 小时一次，比集中一餐更利于合成。',
      source: 'issn-2017',
      confidence: '高（立场声明原文）',
      citation: {org: 'ISSN', year: 2017, section: 'Position statement #5, #7'},
      plan: {perMealPerKg: 0.25, perMealG: [20, 40], spreadHours: [3, 4]}
    },
    {
      id: 'pre-sleep-protein',
      topic: '饮食配合',
      tags: ['general', 'protein', 'sleep'],
      claim: '睡前 30~40 g 缓释蛋白（酪蛋白）可提高夜间合成，且不影响脂肪分解；睡前那餐可以留给它。',
      source: 'issn-2017',
      confidence: '高（立场声明原文）',
      citation: {org: 'ISSN', year: 2017, section: 'Position statement #14'},
      plan: {grams: [30, 40], type: 'casein'}
    },
    {
      id: 'sleep-duration-consensus',
      topic: '恢复节奏',
      tags: ['general', 'sleep', 'recovery'],
      claim: '成人每晚 7 小时以上是共识下限；长期不足与食欲上升、代谢变差和训练表现下降相关，减脂期尤其不该拿睡眠换时间。',
      source: 'aasm-2015',
      confidence: '中高（学会共识结论）',
      citation: {org: 'AASM/SRS', year: 2015},
      plan: {minHours: 7, targetHours: [7, 9]}
    },
    {
      id: 'sleep-drives-appetite',
      topic: '减脂执行',
      tags: ['general', 'sleep', 'fatloss'],
      claim: '睡眠不足会让饥饿感与食欲上升，缺口很容易被无意识进食吃掉；此时先修睡眠，比再砍 100 kcal 更有效。',
      source: 'aasm-2015',
      confidence: '中（共识结论的方向性表述）',
      citation: {org: 'AASM/SRS', year: 2015},
      plan: {fixSleepFirst: true}
    },
    {
      id: 'tdee-formula-error',
      topic: '减脂执行',
      tags: ['general', 'deficit', 'rules'],
      claim: '用公式预测维持热量天生有误差（个体差异可达 10%~20%），所以不要迷信算出来的数字：用连续 2 周体重均值反推真实维持热量，再决定缺口。',
      source: 'helms-2014',
      confidence: '中高（综述通识 + App 口径）',
      citation: {org: 'Helms et al.', year: 2014},
      plan: {formulaErrorPercent: [10, 20], calibrateWeeks: 2}
    },
    {
      id: 'deficit-preserves-lean',
      topic: '减脂执行',
      tags: ['general', 'fatloss'],
      claim: '保住瘦体重的三件事：缺口别太大、蛋白拉高、抗阻训练保留；三者缺一，掉的就可能不只是脂肪。',
      source: 'helms-2014',
      confidence: '中高（综述要点）',
      citation: {org: 'Helms et al.', year: 2014},
      plan: {keep: ['moderate-deficit', 'high-protein', 'resistance-training']}
    },

    // ---------------- 口述级规则（A 级，ASR 转写） ----------------`],
]);

const loaded = new Function('window', fs.readFileSync(lib, 'utf8') + '\nreturn window.TRAINING_PRINCIPLES;')({});
console.log('sources:', loaded.sources.length, 'rules:', loaded.rules.length, 'with citation:', loaded.rules.filter(r => r.citation).length);
