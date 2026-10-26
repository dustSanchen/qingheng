import fs from 'node:fs';
let t = fs.readFileSync('tests/habit-and-training-mode.test.mjs','utf8');
t = t.replace("check('it re-runs on every render', app.includes('renderTrainingInsights();\\n    applyTrainingVisibility();'));",
              "check('it re-runs on every render', /renderTrainingInsights\\(\\);\\r?\\n\\s*applyTrainingVisibility\\(\\);/.test(app));");
fs.writeFileSync('tests/habit-and-training-mode.test.mjs', t);
console.log('assertion made CRLF tolerant');
