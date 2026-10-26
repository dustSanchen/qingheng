import fs from 'node:fs';
const t = fs.readFileSync('tests/training-library.test.mjs','utf8');
for (const l of t.split(/\r?\n/)) if (/smallest text is readable/.test(l)) console.log(l.trim());
