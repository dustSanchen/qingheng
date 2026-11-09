/**
 * P1–P3 的结构契约：单一计划来源、配置注册表、两种等待反馈、估算思考流。
 */
import fs from 'node:fs';

let fail = 0;
const check = (label, ok, detail) => { console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail)); if (!ok) fail++; };
const read = path => fs.readFileSync(path, 'utf8');

const head = read('app/src/fragments/00-head.fragment.js');
const training = read('app/src/fragments/60-training-copy.fragment.js');
const rest = read('app/src/fragments/70-rest.fragment.js');
const html = read('app/src/main/assets/index.html');
const adapter = read('app/src/main/assets/native-adapter.js');
const main = read('app/src/main/java/cn/qingheng/health/MainActivity.java');

check('the week list reads the generated plan, not a second rotation',
  training.includes('const planDay = plan.days.find(item => item.date === day)')
  && !training.includes('const planned = days.includes(offset)'));
check('today session delegates to weekPlanToday', training.includes('return weekPlanToday().day;'));

check('config registry lists synced local keys', head.includes('const CONFIG_REGISTRY') && head.includes("id: 'planPrefs'") && head.includes("id: 'aiPlans'"));
check('loadState reconciles config drift', head.includes('try { verifyConfigSync(); }'));

check('full-screen busy layer is gone', !html.includes('id="busy-layer"') && !rest.includes('$("#busy-layer")'));

check('native estimate accepts a thinking sink', main.includes('Delta sink, ChatCompletion.Delta think') && main.includes('pushEstimateEvent("think"'));
check('adapter forwards think events', adapter.includes("event.kind==='think'") && adapter.includes('sink.onThink'));
check('estimate surface renders the thinking stream', rest.includes("className='estimate-think'") && rest.includes('onThink:chunk=>'));

if (fail) { console.log('\nFAIL total: ' + fail); process.exit(1); }
console.log('\nPASS total: 0 failed');
