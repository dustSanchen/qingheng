/**
 * P1-4 / P1-6 / P1-7 断言。
 */
import fs from 'node:fs';

let fail = 0;
const check = (label, ok, detail) => { console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail)); if (!ok) fail++; };
const read = path => fs.readFileSync(path, 'utf8');

const main = read('app/src/main/java/cn/qingheng/health/MainActivity.java');
const adapter = read('app/src/main/assets/native-adapter.js');
const app = read('app/src/main/assets/app.js');
const targets = read('app/src/fragments/40-targets.fragment.js');

// --- P1-4 answers -----------------------------------------------------------------------------------
check('citations are persisted with the answer', main.includes('Citations are saved with the answer') && main.includes('.put("sources", sources)'));
check('only https citations survive', main.includes('if (!url.startsWith("https://") || !seen.add(url)) continue;'));
check('citations are capped', main.includes('sources.length() < 6'));
check('feedback is stored on the row', main.includes('feedback.equals("unhelpful")') && main.includes('feedback.equals("helpful")'));
check('the stream path saves citations', adapter.includes('sources:final?.webSearch?.sources||[]'));
check('the buffered path saves citations', adapter.includes('sources:reply?.sources||[]'));
check('rows render citations', app.includes('function citationBlock(row)') && app.includes('来源 ${sources.length} 条'));
check('rows offer regenerate and unhelpful', app.includes('data-chat-again') && app.includes('data-chat-unhelpful'));
check('regenerate refills the question', app.includes('async function regenerateChat(id)') && app.includes("box.value = String(row.question || '')"));
check('regenerate respects the shared consent', app.includes("typeof externalConsent === 'function' && externalConsent()"));
check('unhelpful state is remembered', app.includes('localStorage.setItem(CHAT_UNHELPFUL_KEY'));

// --- P1-6 lean phase ---------------------------------------------------------------------------------
check('a phase counter exists', targets.includes('function leanPhase(goal, startedAt)'));
check('the start date is stamped once', targets.includes("goal === 'lean' && !(state.profile && state.profile.leanPhaseStartedAt)"));
check('the plan shows the week number', targets.includes('薄肌阶段第 ${weeks} 周'));
check('week eight triggers a review', targets.includes('已满 8 周') && targets.includes('weeks >= 8'));

// --- P1-7 record page --------------------------------------------------------------------------------
check('low-frequency cards collapse', app.includes('function installCardCollapse()'));
check('habit, food and manual cards are the targets', app.includes("'#habit-form'") && app.includes("'#food-search'") && app.includes("'#manual-meal-form'"));
check('collapsing is idempotent', app.includes("card.dataset.collapsed === '1'"));
check('it runs at boot', app.includes('installCardCollapse(); installTrainingAdvice();'));

console.log('\nFAIL total: ' + fail);
process.exitCode = fail ? 1 : 0;
