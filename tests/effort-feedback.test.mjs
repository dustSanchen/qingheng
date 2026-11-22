/**
 * 训练强度反馈 + 「今天的要求」（2026-11-19，1.4.45）。
 * 用户要求：练完问一句累不累，用简单选项喂给后续排课；并给一个窗口让他对当天的计划提要求，
 * 由模型按「经验丰富的教练」判断该不该照办，而不是无条件服从。
 * 契约：四档点选落库 → 排课时降/加一档；要求原样进提示词；不采纳时给一句教练说明。
 */
import fs from 'node:fs';

let fail = 0;
const check = (label, ok, detail) => { console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail)); if (!ok) fail++; };
const html = fs.readFileSync('app/src/main/assets/index.html', 'utf8');
const app = fs.readFileSync('app/src/main/assets/app.js', 'utf8');
const css = fs.readFileSync('app/src/main/assets/styles.css', 'utf8');

// --- 强度反馈的入口 ---------------------------------------------------------------------------------------
check('the training card asks how the session felt', html.includes('id="training-effort"') && html.includes('aria-label="今天练下来感觉如何"'));
for (const [value, label] of [['tooLight', '太轻'], ['justRight', '刚好'], ['tired', '有点累'], ['tooMuch', '太累']]) {
  check('option: ' + label, html.includes('data-effort="' + value + '"') && html.includes('>' + label + '</button>'));
}
check('chips use aria-pressed for the selected state', html.includes('aria-pressed="false"') && css.includes('.effort-chip[aria-pressed="true"]'));
check('the answer is stored on the day row', app.includes('async function saveTrainingEffort') && /saveTrainingEffort[\s\S]{0,600}api\("\/api\/habits"[\s\S]{0,200}effort: value/.test(app));
check('the chips follow the active date', app.includes('function renderTrainingEffort') && app.includes('if (typeof renderTrainingEffort === \'function\') renderTrainingEffort();'));
check('saving a log asks for the missing effort answer', app.includes('今天练下来感觉如何？在下面点一下'));

// --- 反馈如何影响排课 -------------------------------------------------------------------------------------
check('a recent deload signal exists', app.includes('function effortSignal') && app.includes("level: \"deload\""));
check('two tired sessions or one tooMuch trigger deload', app.includes("last === \"tooMuch\" || heavy >= 2"));
check('two light sessions trigger a push', app.includes("light >= 2 && heavy === 0"));
check('deload trims a set and lowers the load for real', /applyEffortSignalToPlan[\s\S]{0,700}Math\.max\(1,[\s\S]{0,300}reduceLoadableWeightKg/.test(app));
check('push adds one set to the first compound', app.includes('Math.min(5, (Number(first.sets) || 3) + 1)'));
check('the plan runs through the effort signal', app.includes('applyEffortSignalToPlan(parseAiPlanReply('));
check('the prompt carries the effort feedback', app.includes('最近强度反馈（用户自己点的）：') && app.includes('按降载排：每个配重动作少一组'));

// --- 今天的要求 -------------------------------------------------------------------------------------------
check('the plan card can take a request', html.includes('id="plan-request"') && html.includes('maxlength="200"'));
check('the request lives with the plan preferences', html.indexOf('id="plan-prefs"') < html.indexOf('id="plan-request"') && html.indexOf('id="plan-request"') < html.indexOf('id="pref-save"'));
check('the request is read when planning', app.includes('const requestText = String((requestBox && requestBox.value) || "").trim().slice(0, 200)'));
check('the model is told to judge, not to obey', app.includes('用户今天的要求（可能不专业，需要你判断）：') && app.includes('判断原则：先保目标口径'));
check('a rejected request leaves a one-line coach note', app.includes('把一句不超过 40 字的原因写进第一个动作的 note 字段'));
check('the coach note is parsed and stored locally', app.includes('writePlanNote(activeDate, noteMatch ? noteMatch[1] : "")') && app.includes('function readPlanNote'));
check('the coach note has a slot in the card', html.includes('id="ai-plan-note"') && css.includes('.ai-plan-note{'));

console.log('\nFAIL total: ' + fail);
process.exitCode = fail ? 1 : 0;
