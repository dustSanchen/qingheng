import fs from 'node:fs';
let t = fs.readFileSync('tests/training-library.test.mjs','utf8');
t = t.replace("check('ALEX episodes are recorded', Array.isArray(lib.sources[2].episodes) && lib.sources[2].episodes.length >= 3);",
  "const alexSource = lib.sources.find(s => s.id === 'alex-channel');\ncheck('ALEX episodes are recorded', Array.isArray(alexSource.episodes) && alexSource.episodes.length >= 3);");
t = t.replace("check('the ALEX correction is written down', lib.sources[2].note.includes('第三方'));",
  "check('the ALEX correction is written down', alexSource.note.includes('第三方'));");
fs.writeFileSync('tests/training-library.test.mjs', t);
console.log('alex lookups fixed');
