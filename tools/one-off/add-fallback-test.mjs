import fs from 'node:fs';
let t = fs.readFileSync('tests/training-library.test.mjs','utf8');

const extra = `
// --- the fallback really runs (library + generator in one sandbox) ---------------------------------
const genStart = app.indexOf('function generateWeekPlan(');
const genEnd = app.indexOf('\\n  }', genStart);
const genSource = app.slice(genStart, genEnd + 4);
const runPlan = new Function('window', helpers + '\\n' + whySource + '\\n' + genSource + '\\nreturn generateWeekPlan;')({TRAINING_PRINCIPLES: lib});
const emptyPlan = runPlan({startDate: '2026-10-26', sessions: 3, acwrFlag: 'ok', lastByExercise: {}});
const pushDay = emptyPlan.days.find(day => day.template === 'push');
check('empty history still gets a push day', !!pushDay);
check('its movements come from the library', pushDay && pushDay.exercises.some(item => item.name.includes('卧推')), JSON.stringify(pushDay && pushDay.exercises.map(e => e.name)));
check('those days are marked suggested', pushDay && pushDay.suggested === true);
check('the plan explains itself', Array.isArray(emptyPlan.reasons) && emptyPlan.reasons.length >= 3);
`;
t = t.replace("console.log('\\nFAIL total: ' + fail);", extra + "\nconsole.log('\\nFAIL total: ' + fail);");
fs.writeFileSync('tests/training-library.test.mjs', t);
console.log('execution test appended');
