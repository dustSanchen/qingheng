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
const completion = read('app/src/main/java/cn/qingheng/health/ChatCompletion.java');

check('the week list reads the generated plan, not a second rotation',
  training.includes('const planDay = plan.days.find(item => item.date === day)')
  && !training.includes('const planned = days.includes(offset)'));
check('today session delegates to weekPlanToday', training.includes('return weekPlanToday().day;'));

check('config registry lists synced local keys', head.includes('const CONFIG_REGISTRY') && head.includes("id: 'planPrefs'") && head.includes("id: 'aiPlans'"));
check('loadState reconciles config drift', head.includes('try { verifyConfigSync(); }'));

check('full-screen busy layer is gone', !html.includes('id="busy-layer"') && !rest.includes('$("#busy-layer")'));

check('native estimate accepts a thinking sink', main.includes('Delta sink, ChatCompletion.Delta think') && main.includes('pushEstimateEvent("think"'));
check('adapter forwards think events', adapter.includes("event.kind==='think'") && adapter.includes('sink.onThink'));
check('estimate status uses verb + noun only',
  rest.includes('正在分析食品营养') && rest.includes('正在核算份量与热量') && !rest.includes('estimate-think'));

check('state schema version and migration exist',
  main.includes('STATE_VERSION = 2') && main.includes('private static void migrateState')
  && main.includes('backupBeforeMigration'));
check('calc module is loaded before app.js', html.includes('./calc.js'));

check('estimate turns DeepSeek thinking off',
  main.includes('CAP_ESTIMATE, false)') && main.includes(', false).trim();')
  && main.includes('ChatCompletion.completeMessage'));
check('thinking is only disabled for DeepSeek',
  completion.includes('private static void disableThinking')
  && completion.includes('"thinking", new JSONObject().put("type", "disabled")'));

check('streaming chat honours logToHistory:false', adapter.includes("if(body?.logToHistory!==false) await storageRequest('/api/chatlog'"));
check('old plan prompts are cleaned from chat history once', head.includes('cleanupPlanChatEntries') && head.includes('请为今天排一个按顺序执行的训练清单'));

if (fail) { console.log('\nFAIL total: ' + fail); process.exit(1); }
console.log('\nPASS total: 0 failed');
