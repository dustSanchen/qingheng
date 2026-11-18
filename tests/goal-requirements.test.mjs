/**
 * 2026-11-18：目标要求表（训练组数/次数/RIR + 饮食速率）与证据文档、提示词的一致性。
 * 数字改了这里必须改 docs/design/27-evidence-requirements.md，两处对不上就失败。
 */
import fs from 'node:fs';
import vm from 'node:vm';

let fail = 0;
const check = (label, ok, detail) => { console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail)); if (!ok) fail++; };

const app = fs.readFileSync('app/src/main/assets/app.js', 'utf8');
const doc = fs.readFileSync('docs/design/27-evidence-requirements.md', 'utf8');
const lib = fs.readFileSync('app/src/main/assets/training-principles.js', 'utf8');

const sandbox = {number: v => (v !== null && v !== undefined && v !== '' && Number.isFinite(Number(v)) ? Number(v) : null)};
vm.createContext(sandbox);
const rulesSource = app.slice(app.indexOf('const TARGET_RULES = {'), app.indexOf('\n  const GOAL_LABEL'));
// 顶层 const 只产生词法绑定，不会挂到 vm 的 context 上：显式导出一次再读。
vm.runInContext(rulesSource + '\n;globalThis.__presets = GOAL_PRESETS;', sandbox);
const presets = sandbox.__presets;
check('goal presets are readable from the product', !!presets && Object.keys(presets).length === 5);

// --- 每个目标的训练与速率要求都在，且方向正确 ------------------------------------------------
for (const goal of ['gain', 'recomp', 'cut', 'maintain', 'lean']) {
  const p = presets && presets[goal];
  check(`${goal}: has a weekly set range`, !!p && Array.isArray(p.muscleSetsPerWeek) && p.muscleSetsPerWeek[0] >= 10 && p.muscleSetsPerWeek[1] <= 20, p && JSON.stringify(p.muscleSetsPerWeek));
  check(`${goal}: has a rep range`, !!p && p.reps[0] >= 6 && p.reps[1] <= 30, p && JSON.stringify(p.reps));
  check(`${goal}: has an RIR range`, !!p && p.rir[0] >= 0 && p.rir[1] <= 3, p && JSON.stringify(p.rir));
  check(`${goal}: has a weekly rate band`, !!p && Array.isArray(p.ratePctPerWeek), p && JSON.stringify(p.ratePctPerWeek));
}
check('cutting loses faster than leaning out', presets.cut.ratePctPerWeek[1] >= presets.lean.ratePctPerWeek[1]);
check('gaining is slower than cutting', presets.gain.ratePctPerWeek[1] <= presets.cut.ratePctPerWeek[1]);
check('gain carries the most volume', presets.gain.muscleSetsPerWeek[0] >= presets.cut.muscleSetsPerWeek[0]);
check('a deficit expects more protein than maintenance', presets.cut.proteinPerKgMin > presets.maintain.proteinPerKgMin);
check('protein bands stay inside the evidence range', presets.cut.proteinPerKgMax <= 2.6 && presets.gain.proteinPerKgMin >= 1.6);
check('a cut never plans more than the 20% deficit cap', Math.abs(presets.cut.deficitPercent) <= 20);
check('a gain plans a surplus, not a deficit', presets.gain.deficitPercent < 0);

// --- 文档与实现同一张表 -------------------------------------------------------------------------
for (const [goal, label] of [['gain', '增肌 gain'], ['recomp', '增肌同时减脂 recomp'], ['cut', '减脂 cut'], ['maintain', '保持 maintain'], ['lean', '薄肌 lean']]) {
  const p = presets[goal];
  const row = `| ${label} | ${p.muscleSetsPerWeek[0]}~${p.muscleSetsPerWeek[1]} | ${p.reps[0]}~${p.reps[1]} | ${p.rir[0]}~${p.rir[1]} |`;
  check(`${goal}: the doc row matches the preset`, doc.includes(row), row);
}
check('the doc cites the volume meta-analysis', doc.includes('10.1080/02640414.2016.1210197'));
check('the doc cites the protein meta-analysis', doc.includes('10.1136/bjsports-2017-097608'));
check('the doc cites the off-season review', doc.includes('10.3390/sports7070154'));
check('the doc cites the ACLM/ACSM overview', doc.includes('PMC12965823'));
check('the doc explains the limits', doc.includes('## 5. 已知局限'));

// --- 证据补录进了规则库 -------------------------------------------------------------------------
check('the library carries the new sources', ['schoenfeld-2017', 'baz-valle-2022', 'morton-2018', 'iraki-2019', 'acsm-2026'].every(id => lib.includes(`id: '${id}'`)));
check('the volume rule is cited to the meta-analysis', lib.includes("id: 'volume-dose-response'") && lib.includes("source: 'schoenfeld-2017'"));
check('the RIR rule is cited to the position stand', lib.includes("id: 'proximity-to-failure'") && lib.includes("source: 'acsm-2026'"));
check('the protein-in-deficit rule exists', lib.includes("id: 'protein-in-deficit'"));
check('the surplus rule exists', lib.includes("id: 'off-season-surplus'"));

// --- 页面与提示词用上同一张表 -------------------------------------------------------------------
check('the plan card prints the goal requirement', app.includes('本周要求（') && app.includes('goalPreset.muscleSetsPerWeek'));
check('the AI plan request carries the requirement', app.includes('训练要求（按目标，必须满足）：每个大肌群每周'));
check('the profile status prints the training requirement', app.includes('训练要求（${goalLabelOf(goal)}）：每个大肌群'));
check('the profile status prints the weight rate', app.includes('体重速率：每周 ${ratePctPerWeek[0]}~${ratePctPerWeek[1]}%'));
check('the computed result exposes the requirements', app.includes('trainingTargets, ratePctPerWeek, weeklyRatePercent: weeklyLossFromRate,'));
check('a gain day gets one extra set on its first lift', app.includes('const gainBonus = goalPreset && goal === \'gain\' && !deload && firstOfTemplate ? 1 : 0;'));
check('a cutting plan is not padded with volume', app.includes("goal === 'gain' && !deload && firstOfTemplate ? 1 : 0"));
check('the goal table is used by the plan generator', app.includes("typeof GOAL_PRESETS === 'object' ? GOAL_PRESETS[goal] : null"));
check('a rate outside the goal band warns instead of silently changing numbers', app.includes('高于「${goalLabelOf(goal)}」的 ${lo}~${hi}%/周'));

console.log('\nFAIL total: ' + fail);
process.exitCode = fail ? 1 : 0;
