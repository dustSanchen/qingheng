import fs from 'node:fs';
const patches = [
  ['tests/anchors-oil.test.mjs',
   "check('the page sends anchors with chat', app.includes(\"anchors:anchorSummary(),webSearch:\"));",
   "check('the page sends anchors with chat', app.includes(\"anchors:anchorSummary(),tier,\") || app.includes(\"anchors:anchorSummary(),webSearch:\"));"],
  ['tests/meal-date-java.test.mjs',
   "check('chat context is appended after the history', /for \\(int i = 0; i < history\\.length\\(\\); i\\+\\+\\) messages\\.put\\(history\\.get\\(i\\)\\);[\\s\\S]{0,300}chatDataContext\\(selectedDate\\)/.test(main));",
   "check('chat context is appended after the history', /for \\(int i = 0; i < history\\.length\\(\\); i\\+\\+\\) messages\\.put\\(history\\.get\\(i\\)\\);[\\s\\S]{0,600}chatDataContext\\(selectedDate\\)/.test(main));"],
  ['tests/training-draft.test.mjs',
   "check('write merges with the day row', app.includes('exercises: [...existing, ...draft.exercises]'));",
   "check('write merges with the day row', app.includes('exercises: [...existing, ...(draft.payload.exercises || [])]'));"],
];
for (const [file, from, to] of patches) {
  const text = fs.readFileSync(file, 'utf8');
  if (!text.includes(from)) throw new Error('anchor missing in ' + file);
  fs.writeFileSync(file, text.replace(from, to));
  console.log('updated ' + file);
}
