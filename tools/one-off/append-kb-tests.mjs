import fs from 'node:fs';
let t = fs.readFileSync('tests/training-library.test.mjs','utf8');
const extra = `
// --- v2：优先级、减脂主题、建议链路 ---------------------------------------------------------------
check('priority order is declared', Array.isArray(lib.priority) && lib.priority.length === 3, JSON.stringify(lib.priority));
check('priority starts with the 3-split source', lib.priority[0] === 'ksw-tcy-3split');
check('sources carry a priority number', lib.sources.every(s => Number.isFinite(s.priority)));
check('a conflict policy exists', typeof lib.conflictPolicy === 'string' && lib.conflictPolicy.includes('App 规则'));
check('topics index exists', Array.isArray(lib.topics) && lib.topics.length >= 6, String(lib.topics && lib.topics.length));
const topics = new Set(lib.rules.map(r => r.topic));
for (const topic of ['训练结构', '减脂执行', '饮食配合', '有氧']) check('topic covered: ' + topic, topics.has(topic));
for (const id of ['deficit-cap', 'protein-preserve', 'weekly-rate', 'plateau-check', 'sleep-deficit', 'cardio-dose', 'neat-first', 'refeed-day', 'meal-protein-spread']) {
  check('reduction rule present: ' + id, ids.has(id));
}
check('the hard floor is restated, not relaxed', lib.rules.find(r => r.id === 'deficit-cap').claim.includes('不得低于硬底线'));
check('protein rule keeps the app range', lib.rules.find(r => r.id === 'protein-preserve').plan.proteinPerKg[1] === 2.4);
check('rules are plentiful in v2', lib.rules.length >= 24, String(lib.rules.length));
`;
t = t.replace("console.log('\\nFAIL total: ' + fail);", extra + "\nconsole.log('\\nFAIL total: ' + fail);");
fs.writeFileSync('tests/training-library.test.mjs', t);
console.log('v2 assertions appended');
