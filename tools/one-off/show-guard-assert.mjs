import fs from 'node:fs';
const t = fs.readFileSync('tests/render-guard.test.mjs','utf8');
const i = t.indexOf('the bar explains the record is safe');
console.log(t.slice(Math.max(0,i-260), i+120));
