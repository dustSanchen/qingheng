import fs from 'node:fs';
const t = fs.readFileSync('tests/training-log.test.mjs', 'utf8');
const i = t.indexOf('an incomplete exercise is refused instead of stored');
console.log('ASSERT:', t.slice(Math.max(0, i - 60), i + 200).replace(/\n/g, ' | '));
const app = fs.readFileSync('app/src/main/assets/app.js', 'utf8');
const j = app.indexOf('每个动作都要填完整');
console.log('in app.js:', j > 0);
const k = app.indexOf('incomplete');
console.log('ctx:', app.slice(Math.max(0, k - 160), k + 120).replace(/\s+/g, ' '));
