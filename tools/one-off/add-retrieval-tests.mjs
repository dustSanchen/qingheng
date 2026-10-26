import fs from 'node:fs';

let t = fs.readFileSync('tests/training-library.test.mjs', 'utf8');
if (t.includes('the question routes to the right rules')) {
  console.log('already added');
  process.exit(0);
}

const extra = `
// --- 问答检索与训练卡要点 ---------------------------------------------------------------------
check('topic routing exists', app.includes('const LIBRARY_ROUTES') && app.includes('function libraryLookup(question'));
check('the question routes to the right rules', app.includes('libraryLookup(question, 8)'));
check('cues exist per template', app.includes('function libraryCues(template)') && app.includes("legs: ['leg-warmup-six-moves'"));
check('the plan shows cues', app.includes('plan-cue') && app.includes('const cues ='));

// really run the routing: 腹肌 → abs rules, 减脂 → fatloss rules
const routeStart = app.indexOf('const LIBRARY_ROUTES');
const routeEnd = app.indexOf('/** Which library rule answers the weakest metric');
const routeSource = app.slice(routeStart, routeEnd);
const runLookup = new Function('window', 'trainingLibrary',
  routeSource + '\\nreturn {libraryLookup, libraryCues};')({TRAINING_PRINCIPLES: lib}, () => lib);
const absHits = runLookup.libraryLookup('腹肌怎么练才对', 5);
check('腹肌 question returns abs rules', absHits.includes('腹肌') && absHits.includes('悬垂举腿'), absHits.slice(0, 60));
const fatHits = runLookup.libraryLookup('减脂平台期怎么办', 5);
check('减脂 question returns fatloss rules', fatHits.includes('平台') || fatHits.includes('缺口'), fatHits.slice(0, 60));
const sleepHits = runLookup.libraryLookup('最近睡眠不好很累', 5);
check('sleep question returns recovery rules', sleepHits.includes('睡眠') || sleepHits.includes('晨脉'), sleepHits.slice(0, 60));
check('unrelated question returns nothing', runLookup.libraryLookup('今天天气怎么样', 5) === '');
const cues = runLookup.libraryCues('legs');
check('leg cues cite the six-move warmup', cues.some(c => c.includes('6 个动作') || c.includes('45 秒')), JSON.stringify(cues));
`;

t = t.replace("console.log('\\nFAIL total: ' + fail);", extra + "\nconsole.log('\\nFAIL total: ' + fail);");
fs.writeFileSync('tests/training-library.test.mjs', t);
console.log('retrieval assertions appended');
