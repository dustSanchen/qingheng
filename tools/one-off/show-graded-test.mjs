import fs from 'node:fs';
const t = fs.readFileSync('tests/graded-colors.test.mjs','utf8');
console.log(t.split(/\r?\n/).filter(l => /assert|lightness|hsl|dietBarColor|rangeColor|underColor|overColor/.test(l)).slice(0, 20).join('\n').slice(0, 1800));
