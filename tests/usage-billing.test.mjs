/**
 * 用量与余额的静态契约：token 从响应里读、账本只存数量、余额只查 DeepSeek、充值只开浏览器。
 */
import fs from 'node:fs';

let fail = 0;
const check = (label, ok, detail) => { console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail)); if (!ok) fail++; };
const read = path => fs.readFileSync(path, 'utf8');

const chat = read('app/src/main/java/cn/qingheng/health/ChatCompletion.java');
const main = read('app/src/main/java/cn/qingheng/health/MainActivity.java');
const html = read('app/src/main/assets/index.html');
const app = read('app/src/main/assets/app.js');
const usage = read('app/src/fragments/55-usage.fragment.js');

check('buffered responses carry usage', chat.includes('response.optJSONObject("usage")') && chat.includes('out.put("usage", usage)'));
check('streaming asks DeepSeek for usage', chat.includes('stream_options') && chat.includes('include_usage') && chat.includes('contains("deepseek")'));
check('the stream reports usage to the caller', chat.includes('interface UsageSink') && chat.includes('onUsage.onUsage(usageObj)'));

check('every chat path records usage', (main.match(/recordUsage\(result\.optJSONObject\("usage"\)/g) || []).length >= 2
  && /recordUsage\(usage, (usageModel|estimateModel)\)/.test(main));
const record = main.slice(main.indexOf('private void recordUsage'), main.indexOf('private JSONObject usageLog'));
check('the ledger stores only token counts', record.includes('"usageLog"') && record.includes('"in"') && record.includes('"out"')
  && !record.includes('question') && !record.includes('answer'));
check('usage routes exist', main.includes('path.equals("/api/usage")') && main.includes('path.equals("/api/balance")'));
check('balance is DeepSeek-only', main.includes('余额查询目前只支持 DeepSeek'));
check('the balance URL drops /v1', main.includes('base.endsWith("/v1")') && main.includes('/user/balance'));
check('external links are allowlisted', main.includes('openExternal') && main.includes('platform.deepseek.com'));

check('the page exposes the usage card', html.includes('id="usage-card"') && html.includes('id="usage-balance"'));
check('the panel aggregates tokens and costs', usage.includes('usageMoney') && usage.includes('USAGE_PRICE_KEY'));
check('the panel opens the DeepSeek top-up page', usage.includes('platform.deepseek.com/top_up'));
check('the panel is installed at boot', app.includes('installUsagePanel()'));

if (fail) { console.log('\nFAIL total: ' + fail); process.exit(1); }
console.log('\nPASS total: 0 failed');
