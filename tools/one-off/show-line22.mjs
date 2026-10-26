import fs from 'node:fs';
const lines = fs.readFileSync('tests/daily-three-copy.test.mjs','utf8').split(/\r?\n/);
console.log(JSON.stringify(lines[21]));
