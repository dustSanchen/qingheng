import fs from 'node:fs';
for (const [f, needle] of [['tests/anchors-oil.test.mjs','the page sends anchors with chat'],['tests/meal-date-java.test.mjs','chat context is appended after the history'],['tests/training-draft.test.mjs','write merges with the day row']]) {
  const lines = fs.readFileSync(f,'utf8').split(/\r?\n/);
  const i = lines.findIndex(l => l.includes(needle));
  console.log('== ' + f + ' line ' + (i+1));
  console.log(lines[i].trim().slice(0, 300));
}
