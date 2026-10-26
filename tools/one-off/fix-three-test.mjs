import fs from 'node:fs';
const file = 'tests/daily-three-copy.test.mjs';
let t = fs.readFileSync(file, 'utf8');
t = t.replace(
  "html.includes('name=\"training\"') && html.includes('name=\"oilSpoons\"') && html.includes('name=\"weight\"')",
  "html.includes('name=\"training\"') && html.includes('name=\"sleep\"') && html.includes('name=\"weight\"')");
t = t.replace(
  "app.includes(\"if (trainingValue === '' && oilSpoons === null && weight === null) {feedback(message, '三样都空着，没有可保存的内容。', true)\")",
  "app.includes(\"if (trainingValue === '' && sleep === null && weight === null) {feedback(message, '三样都空着，没有可保存的内容。', true)\")");
fs.writeFileSync(file, t);
console.log('daily-three test updated for sleep');
