import fs from 'node:fs';
const t = fs.readFileSync('tests/targets.test.mjs','utf8');
const names = ['a raised ceiling is honoured','a ceiling above TDEE is reported as a surplus','an ineffective cut is called out','a gain phase with a big deficit is called out'];
const lines = t.split(/\r?\n/);
lines.forEach((l, i) => {
  for (const n of names) if (l.includes(n)) {
    console.log('--- ' + n + ' @' + (i+1));
    console.log(lines.slice(Math.max(0,i-6), i+2).join('\n').slice(0, 700));
  }
});
