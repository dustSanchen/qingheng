import fs from 'node:fs';
const t = fs.readFileSync('tests/trends-ui.test.mjs','utf8');
for (const line of t.split(/\r?\n/)) if (line.includes('per-point value labels')) console.log('TEST: ' + line.trim());
const css = fs.readFileSync('app/src/main/assets/styles.css','utf8');
const fams = [...css.matchAll(/font-family:\s*([^;}]+)/g)].map(m => m[1].trim());
console.log('families:');
for (const f of fams) console.log('  ' + f.slice(0, 80));
console.log('non-token declarations:', fams.filter(f => !f.includes('var(--font-')).length);
