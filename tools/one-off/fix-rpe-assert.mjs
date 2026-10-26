import fs from 'node:fs';
const f = 'tests/training-library.test.mjs';
let t = fs.readFileSync(f, 'utf8');
t = t.replace("check('plan items show RPE', app.includes(\"' · RPE' + item.rpe\"));",
"check('plan items show RPE', app.includes(\"' · RPE ' + item.rpe\"));");
fs.writeFileSync(f, t);
console.log('assertion follows the new spacing');
