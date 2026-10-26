import fs from 'node:fs';
const t = fs.readFileSync('tools/dev-loop.ps1','utf8');
console.log('lines:', t.split(/\r?\n/).length);
for (const m of t.matchAll(/^.*(Run |adb|node|Timeout|Wait-Process|Start-Process).*$/gm)) {
  const line = m[0].trim();
  if (line.length > 0) console.log(line.slice(0, 150));
}
