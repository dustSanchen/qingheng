import fs from 'node:fs';
let t = fs.readFileSync('tests/training-presets.test.mjs','utf8');
const bad = "check('they render with the log', /renderTrainingLog\\(\\)[\\s\\S]{0,400}renderTrainingPresets\\(\\);/.test(app) || app.includes('renderTrainingPresets();\\n    const tag = $(''#training-tag'');'));";
const good = "check('they render with the log', /renderTrainingPresets\\(\\);\\s*const tag = \\$\\('#training-tag'\\)/.test(app));";
if (!t.includes(bad)) throw new Error('anchor missing');
t = t.replace(bad, good);
fs.writeFileSync('tests/training-presets.test.mjs', t);
console.log('assertion rewritten');
