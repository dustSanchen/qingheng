import fs from 'node:fs';
const f = 'tests/food-database.test.mjs';
let t = fs.readFileSync(f,'utf8');
t = t.replace("assert(/每分钟 10 次搜索/.test(html), 'the documented rate limit is explained to the user');",
"assert(/每分钟 10 次搜索|10 次\\/分钟/.test(html), 'the documented rate limit is explained to the user');");
fs.writeFileSync(f, t);
console.log('assertion loosened to the new phrasing');
