import fs from 'node:fs';
const t = fs.readFileSync('tests/targets.test.mjs','utf8');
const names = ['training-day range is reported verbatim','rest-day range is reported verbatim','deficit is reported as a signed percentage','not silently cut to 1699'];
for (const l of t.split(/\r?\n/)) for (const n of names) if (l.includes(n)) console.log(l.trim());
const t2 = fs.readFileSync('tests/lean-targets.test.mjs','utf8');
for (const l of t2.split(/\r?\n/)) if (l.includes('recomp keeps the user')) console.log(l.trim());
