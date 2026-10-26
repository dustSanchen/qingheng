import fs from 'node:fs';
const lines = fs.readFileSync('tests/daily-three-copy.test.mjs','utf8').split(/\r?\n/);
lines.forEach((l, i) => { if (/oilSpoons|用油|三样都空着/.test(l)) console.log((i+1) + ': ' + l.trim().slice(0, 160)); });
