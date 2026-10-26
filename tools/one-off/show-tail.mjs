import fs from 'node:fs';
const lines = fs.readFileSync('tools/one-off/training-library.mjs','utf8').split(/\r?\n/);
lines.slice(111, 118).forEach((l, i) => console.log((i + 112) + ': ' + l));
