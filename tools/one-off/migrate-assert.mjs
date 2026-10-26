import fs from 'node:fs';
const p = 'tests/training-log.test.mjs';
let t = fs.readFileSync(p, 'utf8');
const from = `check('an incomplete exercise is refused instead of stored', app.includes("if (incomplete) {feedback(message, '每个动作都要填完整：名称、组数、次数、负重；不想记的动作请先移除。', true); return;}"));`;
const to = [
  "// 断言更新登记（03-global-changes.md §5 第 3 条）：实现从「整表单一次性拒绝」改为",
  "// 「逐字段 aria-invalid + 聚焦第一个缺失项」，语义未变，故改断言到现役实现。",
  "check('an incomplete exercise is refused instead of stored',",
  "  app.includes(\"markFieldInvalid(field, '请补全这个动作的记录。')\")",
  "  && app.includes(\"'每个动作都要填完整：名称、组数、次数、负重；不想记的动作请先移除。'\")",
  "  && app.includes('missing[0]?.focus();'));"
].join('\n');
if (t.includes(from)) { t = t.replace(from, to); fs.writeFileSync(p, t); console.log('assertion migrated'); }
else console.log('anchor missing');
