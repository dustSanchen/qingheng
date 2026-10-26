import fs from 'node:fs';
const app = fs.readFileSync('D:/AI/health-android/app/src/main/assets/app.js', 'utf8');
const html = fs.readFileSync('D:/AI/health-android/app/src/main/assets/index.html', 'utf8');
const lines = app.split('\n');

// Collect every top-level element lookup used as a binding target, in file order.
const bindings = [];
lines.forEach((line, i) => {
  const m = line.match(/\$\('#([a-zA-Z0-9_-]+)'\)\.addEventListener/g);
  if (m) for (const one of m) bindings.push({ line: i + 1, id: one.match(/\$\('#([^']+)'\)/)[1], kind: 'addEventListener' });
  const m2 = line.match(/\$\$\('([^']+)'\)\.forEach/g);
  if (m2) bindings.push({ line: i + 1, id: m2[0], kind: 'querySelectorAll' });
});

console.log('=== binding targets in execution order ===');
let broken = 0;
for (const b of bindings) {
  let exists = true;
  if (b.kind === 'addEventListener') exists = html.includes(`id="${b.id}"`);
  else exists = true; // group selectors are checked below
  if (!exists) broken++;
  console.log(`${String(b.line).padStart(4)}  ${b.kind === 'addEventListener' ? '#' + b.id : b.id}  ${exists ? 'ok' : '*** MISSING IN HTML ***'}`);
}

// Look for any statement that could throw during the IIFE (would stop later bindings).
console.log('\n=== risky unguarded statements before the onboarding binding ===');
const restartLine = lines.findIndex(l => l.includes("#restart-onboarding"));
const risky = [];
lines.slice(0, restartLine).forEach((line, i) => {
  if (/document\.querySelector\([^)]*\)\.\w/.test(line) && !/\?\./.test(line)) risky.push({ line: i + 1, text: line.trim().slice(0, 150) });
  if (/\$\('#[^']+'\)\.\w/.test(line) && !/\$\('#[^']+'\)\?\./.test(line) && !/\$\('#[^']+'\)\.addEventListener/.test(line) && !/\$\('#[^']+'\)\.value/.test(line)) risky.push({ line: i + 1, text: line.trim().slice(0, 150) });
});
for (const r of risky.slice(0, 12)) console.log(r.line + ': ' + r.text);
if (!risky.length) console.log('none found by this heuristic');

console.log('\nmissing targets: ' + broken);
