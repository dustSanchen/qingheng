import fs from 'node:fs';
const file = 'tools/dev-loop.ps1';
let t = fs.readFileSync(file, 'utf8');
const edits = [
  [`Run ("test " + $file.Name) { & $node $file.FullName }`, `Run ("test " + $file.Name) { & $node $file.FullName } 90`],
  [`Run 'build.ps1' { & powershell @arguments }`, `Run 'build.ps1' { & powershell @arguments } 420`],
  [`Run 'verify-web-apk' { & $node tests\\verify-web-apk.mjs }`, `Run 'verify-web-apk' { & $node tests\\verify-web-apk.mjs } 120`],
  [`Run 'icon-style' { & $node tests\\icon-style.test.mjs }`, `Run 'icon-style' { & $node tests\\icon-style.test.mjs } 90`],
  [`Run 'adb install' { & $adb install -r $apk }`, `Run 'adb install' { & $adb install -r $apk } 240`],
  [`Run 'device smoke' { & $node tools\\device.mjs smoke }`, `Run 'device smoke' { & $node tools\\device.mjs smoke } 180`],
];
for (const [from, to] of edits) {
  if (!t.includes(from)) throw new Error('anchor missing: ' + from.slice(0, 40));
  if (t.includes(to)) continue;
  t = t.replace(from, to);
}
fs.writeFileSync(file, t);
console.log('timeouts added:', edits.length);
