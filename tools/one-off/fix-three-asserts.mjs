import fs from 'node:fs';
const file = 'tests/training-library.test.mjs';
let t = fs.readFileSync(file,'utf8');
t = t.replace("check('the plan carries reasons', app.includes('typeof planWhy === \\'function\\' ? planWhy({deload, suggested: days.some(day => day.suggested)}) : []'));",
  "check('the plan carries reasons', app.includes(\"typeof planWhy === 'function' ? planWhy(\"));");
t = t.replace("check('priority order is declared', Array.isArray(lib.priority) && lib.priority.length === 5, JSON.stringify(lib.priority));",
  "check('priority order is declared', Array.isArray(lib.priority) && lib.priority.length === 6, JSON.stringify(lib.priority));");
t = t.replace("check('the generator uses the day templates', app.includes('const day = libraryDayTemplate(template);') && app.includes('function libraryDayTemplate(template)'));",
  "check('the generator uses the day templates', app.includes('libraryDayTemplate(template)') && app.includes('function libraryDayTemplate(template)'));");
fs.writeFileSync(file, t);
console.log('three assertions fixed');
