/**
 * Advice actionItems (1.4.72): optional, whitelisted, form-opening only. Old string actions remain valid.
 */
import fs from 'node:fs';

let fail = 0;
const check = (label, ok, detail) => {
  console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail));
  if (!ok) fail++;
};

function extractFunction(source, name) {
  const marker = 'function ' + name + '(';
  const start = source.indexOf(marker);
  if (start < 0) throw new Error('missing function ' + name);
  const open = source.indexOf('{', start);
  let depth = 0, quote = '';
  for (let i = open; i < source.length; i++) {
    const ch = source[i], prev = source[i - 1];
    if (quote) {
      if (ch === quote && prev !== '\\') quote = '';
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') { quote = ch; continue; }
    if (ch === '{') depth++;
    else if (ch === '}' && --depth === 0) return source.slice(start, i + 1);
  }
  throw new Error('unterminated function ' + name);
}

const app = fs.readFileSync('app/src/main/assets/app.js', 'utf8');
const prompts = fs.readFileSync('app/src/main/java/cn/qingheng/health/ai/Prompts.java', 'utf8');
const main = fs.readFileSync('app/src/main/java/cn/qingheng/health/MainActivity.java', 'utf8');
const source = [
  'const ADVICE_ACTION_TARGETS = {record_meal: "meal-text", record_weight: "measurement-weight", record_sleep: "habit-sleep", open_training: "training-form"};',
  'const ADVICE_ACTION_LABELS = {record_meal: "记这一餐", record_weight: "记录体重", record_sleep: "记录睡眠", open_training: "打开训练"};',
  extractFunction(app, 'normalizeAdviceActions'),
  'return normalizeAdviceActions;'
].join('\n');
const normalize = new Function(source)();
const messages = ['今天蛋白质还差一些', '下一餐补一份蛋白质', '记一下体重'];

let actions = normalize([{index: 0, type: 'record_meal', payload: {slot: 'dinner'}}], messages, true);
check('a valid meal action survives', actions.length === 1 && actions[0].type === 'record_meal');
check('it opens the existing meal field', actions[0] && actions[0].target === 'meal-text', actions[0] && actions[0].target);
check('the validated slot is kept', actions[0] && actions[0].mealSlot === 'dinner', actions[0] && actions[0].mealSlot);
check('the label comes from local copy, not the model', actions[0] && actions[0].label === '记这一餐', actions[0] && actions[0].label);

actions = normalize([{index: 1, type: 'record_weight'}], messages, true);
check('a weight action points at the measured field', actions[0] && actions[0].target === 'measurement-weight', actions[0] && actions[0].target);

actions = normalize([{index: 2, type: 'record_sleep'}], messages, true);
check('a sleep action points at the habit field', actions[0] && actions[0].target === 'habit-sleep', actions[0] && actions[0].target);

actions = normalize([{index: 0, type: 'open_training'}], messages, false);
check('training is dropped for a no-training profile', actions.length === 0, actions.length);
actions = normalize([{index: 0, type: 'open_training'}], messages, true);
check('training opens the existing training form when enabled', actions[0] && actions[0].target === 'training-form', actions[0] && actions[0].target);

for (const item of [
  null,
  {},
  {index: -1, type: 'record_weight'},
  {index: 99, type: 'record_weight'},
  {index: 0, type: 'open_url', payload: {url: 'https://example.com'}},
  {index: 0, type: 'record_meal', payload: {slot: 'brunch'}},
  {index: 0, type: 'record_meal', payload: {slot: '<script>'}},
  {index: 0, type: 'record_meal'}
]) {
  actions = normalize([item], messages, true);
  check('malformed or unsafe action is ignored: ' + JSON.stringify(item), actions.length === 0, actions.length);
}

actions = normalize([
  {index: 0, type: 'record_meal', payload: {slot: 'lunch'}},
  {index: 0, type: 'record_weight'},
  {index: 1, type: 'record_weight'},
  {index: 2, type: 'record_sleep'}
], messages, true);
check('duplicate indices are collapsed and the unique set is capped', actions.length === 2, actions.length);
check('at most two action buttons are exposed', actions.length <= 2, actions.length);

const rich = normalize([{index: 0, type: 'record_meal', payload: {slot: 'lunch'}}], ['\n标题\n正文'], true);
check('rich advice still permits a valid action', rich.length === 1, rich.length);

check('the backend prompt documents actionItems', prompts.includes('actionItems') && prompts.includes('record_meal') && prompts.includes('record_weight') && prompts.includes('open_training'));
check('the backend validates action types', main.includes('adviceActionItemsFromReply') && main.includes('"record_weight".equals(type)') && main.includes('"record_meal".equals(type)'));
check('the backend does not accept arbitrary URLs', !main.includes('https://example.com') && main.includes('Arrays.asList("breakfast", "lunch", "dinner", "snack")'));
check('advice response keeps messages and adds actionItems', main.includes('.put("messages", output).put("actionItems", actionItems)'));
check('the app passes actionItems into renderAdvice', app.includes('renderAdvice(data.messages,date,data.actionItems)') && app.includes('local.actionItems'));
check('the frontend renders a delegated button group', app.includes('advice-action-row') && app.includes('data-advice-action') && app.includes('openRecordTarget(button.dataset.adviceTarget'));
check('old string-only advice still renders without actions', app.includes('const safeActions = normalizeAdviceActions(actionItems, rows'));

console.log('FAIL total: ' + fail);
process.exitCode = fail ? 1 : 0;
