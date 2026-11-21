/**
 * P2 onboarding: AI and permission checks are optional; local recording must not require a key.
 */
import fs from 'node:fs';

let fail = 0;
const check = (label, ok, detail) => {
  console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail));
  if (!ok) fail++;
};

const app = fs.readFileSync('app/src/main/assets/app.js', 'utf8');
const html = fs.readFileSync('app/src/main/assets/index.html', 'utf8');

check('the AI step says it can be skipped', html.includes('这一步可以跳过') && html.includes('暂时不接也不影响记录、目标和本地计划'));
check('necessary setup can finish before optional steps', html.includes('id="ob-finish-early"') && html.includes('先开始记录，AI 与提醒稍后再设'));
check('the early finish uses the same save path', app.includes("$('#ob-finish-early')") && app.includes('obFinish()'));
check('AI can be deferred with one action', html.includes('id="ob-skip-ai"') && html.includes('先不接 AI，继续'));
check('permission checks can be deferred too', html.includes('id="ob-skip-checks"') && html.includes('先不检查，直接完成'));
check('skipping AI still reaches the permission step', app.includes("$('#ob-skip-ai')") && app.includes('onboardingStep(4)'));
check('skipping checks finishes through the existing onboarding save', app.includes("$('#ob-skip-checks')") && app.includes('obFinish()'));
check('the AI step still keeps the key local and optional', html.includes('Key 只保存在本机') && html.includes('可留空'));
check('the first-run copy does not require an API key', !html.includes('必须填入 API Key') && html.includes('先不接 AI'));
check('the final copy points to later settings', html.includes('我的 → AI 与提醒'));

console.log('FAIL total: ' + fail);
process.exitCode = fail ? 1 : 0;
