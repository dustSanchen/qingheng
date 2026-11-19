/**
 * 用 AI 排今天的重量链（2026-11-19，1.4.44）。
 * 事故：模型只给第一个动作写 kg，其余整行留空——提示词结尾写着「不确定就留空」，
 * 客户端也只在 14 天内找到同名记录时才补重量。
 * 契约：三层兜底（同名记忆 → 同族迁移 → 体重比例起步）+ 本地记忆持久化 + 渐进规则。
 */
import fs from 'node:fs';

let fail = 0;
const check = (label, ok, detail) => { console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail)); if (!ok) fail++; };
const app = fs.readFileSync('app/src/main/assets/app.js', 'utf8');

// --- 本地记忆 ---------------------------------------------------------------------------------------------
check('a local weight memory survives restarts', app.includes("const WEIGHT_MEMORY_KEY = 'qingheng.exerciseWeights'") && app.includes('localStorage.setItem(WEIGHT_MEMORY_KEY'));
check('the memory is seeded from real training records', app.includes('function seedWeightMemoryFromHistory') && app.includes("source: 'log'"));
check('a weaker source never overwrites a stronger one', app.includes('WEIGHT_SOURCE_RANK') && app.includes("if (prev && number(prev.weight) > 0)"));

// --- 提示词 -----------------------------------------------------------------------------------------------
check('the prompt no longer tells the model to leave weights empty', !app.includes('器械按 5 kg 递增；不确定就留空'));
check('the prompt demands a weight for every loaded move', app.includes('每个配重动作都必须给 weight'));
check('the prompt carries the starting-weight ratios', app.includes('杠铃卧推 0.5 倍体重') && app.includes('器械取杠铃的 0.8 倍'));
check('the prompt gets up to ten baselines from the memory', app.includes('seedWeightMemoryFromHistory()') && app.includes('.slice(0, 10)'));
check('bodyweight moves are still allowed to carry no kg', app.includes('自重动作（引体向上、俯卧撑、双杠臂屈伸、平板支撑、卷腹）weight 留空'));

// --- 补齐与渐进 -------------------------------------------------------------------------------------------
check('a missing weight falls back to the planned weight', app.includes('function planWeightFor') && app.includes('plannedWeightFor(row && row.name)'));
check('progression is step-based and capped at +10%', app.includes('Math.min(last * 1.1, last + step)') && app.includes('const step = LOWER_BODY.test'));
check('long layoffs deload instead of adding', app.includes('if (gap > 60) kg = last * 0.95') && app.includes('else if (gap > 21) kg = last'));
check('a first timer starts from bodyweight ratios', app.includes("const bodyweight = number((state.profile || {}).weight)") && app.includes('WEIGHT_RATIOS'));
check('a same-family transfer is discounted to 85%', app.includes('* 0.85'));
check('swapping an exercise recomputes its weight', /item\.name = pool\[index % pool\.length\];[\s\S]{0,500}plannedWeightFor\(item\.name\)/.test(app));

// --- 界面与落库 -------------------------------------------------------------------------------------------
check('inferred weights are marked with 约', app.includes('"约 " + kg + " kg"'));
check('the plan explains where inferred weights came from', app.includes('ai-plan-weight-note') && app.includes('练完一次后按实际记录校准'));
check('saving the plan remembers the planned load', app.includes('rememberPlanWeights(plan)'));
check('saving the training log remembers the real load', app.includes('rememberExerciseLogs(exercises, activeDate)'));

console.log('\nFAIL total: ' + fail);
process.exitCode = fail ? 1 : 0;
