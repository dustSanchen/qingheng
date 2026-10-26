import fs from 'node:fs';
for (const f of ['tests/habit-and-training-mode.test.mjs','tests/layout-four.test.mjs','tests/meal-date-context.test.mjs']) {
  const lines = fs.readFileSync(f,'utf8').split(/\r?\n/);
  lines.forEach((l, i) => {
    if (/reveal helper exists|training chip focuses|meal-row|daily-three|三条|每天 30 秒|训练、睡眠/.test(l)) console.log(f + ':' + (i+1) + ' ' + l.trim().slice(0, 150));
  });
}
