/**
 * Step 8 checks: the monolith split is landed for real -- the WebView script is assembled from
 * fragments, and the Java side has packages that own the prompts and the aggregation rules.
 */
import fs from 'node:fs';

let fail = 0;
const check = (label, ok, detail) => { console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail)); if (!ok) fail++; };
const read = path => fs.readFileSync(path, 'utf8');

// --- frontend: fragments + assembler ------------------------------------------------------------------
const assembler = read('tools/assemble-app.ps1');
check('an assembler exists', assembler.includes('fragment.js'));
check('it sorts fragments so the order is deterministic', assembler.includes('Sort-Object Name'));
check('it writes without a BOM', assembler.includes('UTF8Encoding($false)'));
check('it skips writing when nothing changed', assembler.includes('$existing -ne $text'));
check('the build assembles before packaging', read('build.ps1').includes('assemble-app.ps1'));
check('the fragments stay out of assets/', !fs.existsSync('app/src/main/assets/app'));
check('the drift guard test exists', fs.existsSync('tests/app-fragments.test.mjs'));

// --- Java: packages own their concern -------------------------------------------------------------------
const prompts = read('app/src/main/java/cn/qingheng/health/ai/Prompts.java');
check('prompts live in their own package', prompts.includes('package cn.qingheng.health.ai;'));
check('the prompt version lives with the prompt text', prompts.includes('public static final int PROMPT_VERSION = 6;') && prompts.includes('public static final int RULES_VERSION = 1;'));
check('every prompt is exposed as a method', ['chat()', 'mealEstimate()', 'dailyAdvice(', 'weeklyReview()', 'withAnchors('].every(symbol => prompts.includes(symbol)));
check('the prompts document the rules they encode', prompts.includes('missing data is stated, never treated as zero') && prompts.includes('must not under-report'));
check('anchor framing moved into Prompts', prompts.includes('同一食物必须沿用这里的数值'));

const main = read('app/src/main/java/cn/qingheng/health/MainActivity.java');
const alarm = read('app/src/main/java/cn/qingheng/health/AlarmReceiver.java');
check('the chat prompt is delegated', main.includes('return cn.qingheng.health.ai.Prompts.chat();'));
check('the estimator prompt is delegated', main.includes('cn.qingheng.health.ai.Prompts.withAnchors(cn.qingheng.health.ai.Prompts.mealEstimate()'));
check('the daily push prompt is delegated', alarm.includes('cn.qingheng.health.ai.Prompts.dailyAdvice(mealSlot)'));
check('the weekly prompt is delegated', alarm.includes('cn.qingheng.health.ai.Prompts.weeklyReview()'));
check('no prompt text is duplicated in the activity', !main.includes('你是谨慎的餐食营养估算助手') && !main.includes('你是谨慎的个人健康助手'));
check('no prompt text is duplicated in the receiver', !alarm.includes('你是谨慎的饮食营养助手') && !alarm.includes('你是谨慎的个人健康助手'));
check('the versions read from the same place', main.includes('static final int PROMPT_VERSION = cn.qingheng.health.ai.Prompts.PROMPT_VERSION;'));

const math = read('app/src/main/java/cn/qingheng/health/store/RecordMath.java');
check('aggregation helpers live in their own package', math.includes('package cn.qingheng.health.store;'));
check('the helpers take JSON, not Android types', !/import android\./.test(math) && !/android\.content\.Context/.test(math));
check('missing stays missing in the sums', math.includes('return seen ? total : null;'));
check('a null-safe range check exists', math.includes('public static boolean withinRange('));
check('the receiver uses the shared helpers', alarm.includes('cn.qingheng.health.store.RecordMath.hasAnyOf(') && alarm.includes('cn.qingheng.health.store.RecordMath.sumRounded('));
check('the receiver no longer sums by hand', !/double calories = 0, protein = 0, fat = 0/.test(alarm));

// --- the split is documented ------------------------------------------------------------------------------
const doc = read('D:/AI/codex/qingheng-1.0.16-progress-20261017.md');
check('the delivery doc explains the fragment workflow', doc.includes('tools\\one-off') && doc.includes('片段'));
check('the architecture note names the remaining splits', doc.includes('桥方法转薄'));

console.log('\nFAIL total: ' + fail);
process.exitCode = fail ? 1 : 0;
