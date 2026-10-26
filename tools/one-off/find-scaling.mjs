import fs from 'node:fs';
const t = fs.readFileSync('app/src/main/assets/app.js','utf8');
const lines = t.split(/\r?\n/);
lines.forEach((line, i) => {
  if (/protein\s*:\s*scale|protein:scale|\.map\(item => \(\{\.\.\.item/.test(line)) console.log((i+1) + '  ' + line.trim().slice(0, 200));
});
