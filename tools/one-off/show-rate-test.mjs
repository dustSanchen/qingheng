import fs from 'node:fs';
const t = fs.readFileSync('tests/food-database.test.mjs','utf8');
for (const line of t.split(/\r?\n/)) if (line.includes('rate limit')) console.log(line.trim());
