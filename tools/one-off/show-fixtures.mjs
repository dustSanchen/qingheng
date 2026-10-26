import fs from 'node:fs';
const t = fs.readFileSync('tests/targets.test.mjs','utf8');
const lines = t.split(/\r?\n/);
lines.forEach((l, i) => {
  if (/const ref = computeTargets|const recomp = computeTargets|rules:\s*\{/.test(l)) console.log((i+1) + ': ' + l.trim().slice(0, 220));
});
