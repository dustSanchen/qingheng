/**
 * P1-C meal draft (1.4.78): chat text is handed to the existing estimate form,
 * never written directly to a meal record.
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
  throw new Error('unterminated ' + name);
}

const app = fs.readFileSync('app/src/main/assets/app.js', 'utf8');
const parse = new Function(extractFunction(app, 'parseMealDraft') + '\nreturn parseMealDraft;')();

let draft = parse('午餐吃了米饭和鸡胸肉', '2026-11-21');
check('a finished meal sentence becomes a draft', draft && draft.kind === 'meal', draft && draft.kind);
check('the date follows the selected day', draft.date === '2026-11-21', draft.date);
check('lunch is detected', draft.payload.mealType === 'lunch', draft.payload.mealType);
check('the original text is kept for the estimate form', draft.payload.text === '午餐吃了米饭和鸡胸肉', draft.payload.text);

draft = parse('早餐吃了两个鸡蛋', '2026-11-21');
check('breakfast is detected', draft && draft.payload.mealType === 'breakfast', draft && draft.payload.mealType);
draft = parse('夜宵吃了酸奶', '2026-11-21');
check('a late-night snack is not forced into dinner', draft && draft.payload.mealType === 'snack', draft && draft.payload.mealType);
draft = parse('昨天晚餐吃了面条', '2026-11-21');
check('yesterday is resolved relative to the selected day', draft && draft.date === '2026-11-20', draft && draft.date);
draft = parse('11月20日午餐吃了牛肉饭', '2026-11-21');
check('an explicit month/day is respected', draft && draft.date === '2026-11-20', draft && draft.date);

for (const text of ['午餐该吃什么？', '晚餐吃什么都行吗', '今天训练卧推 5 组', '体重 65 kg', '今天睡了 7 小时', '明天打算吃火锅']) {
  check('non-meal/hypothetical text is not a draft: ' + text, parse(text, '2026-11-21') === null);
}

check('DRAFT_KINDS includes a meal label', app.includes("meal: '餐食'"));
check('the chat detects training first and meal second', app.includes('parseTrainingDraft(question, activeDate)') && app.includes('parseMealDraft(question, activeDate)'));
check('the meal card offers a handoff, not a write', app.includes("isMeal ? '去确认餐食' : '写入记录'") && app.includes('会带入现有餐食表单'));
check('the handoff fills the existing estimate form', app.includes('function openMealDraft(draft)') && app.includes("field.value = text") && app.includes("form.elements.mealType.value = slot"));
check('the handoff does not write a meal itself', !/function openMealDraft[\s\S]{0,1600}api\('\/api\/meals'/.test(app));
check('the generic draft writer refuses meal drafts', app.includes("draft.kind === 'meal'") && app.includes('餐食草稿需要在餐食表单生成预览并确认'));
check('the meal confirmation button routes to the handoff', /if \(draft.kind === 'meal'\)[\s\S]{0,220}openMealDraft\(draft\)/.test(app));
check('the confirmation path still requires the existing preview', app.includes("data-draft-confirm") && app.includes('生成估算预览'));

console.log('FAIL total: ' + fail);
process.exitCode = fail ? 1 : 0;
