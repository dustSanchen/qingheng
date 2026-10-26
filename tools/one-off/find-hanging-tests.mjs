import fs from 'node:fs';
for (const f of ['tests/auth-food-integration.test.mjs','tests/camera-bugfix.test.mjs']) {
  const t = fs.readFileSync(f,'utf8');
  console.log('== ' + f + ' (' + t.length + ' chars)');
  for (const m of t.matchAll(/^.*(child_process|execFileSync|spawnSync|spawn\(|execSync|adb|java|readFileSync\(.*apk|inflate).*$/gm)) {
    console.log('   ' + m[0].trim().slice(0, 140));
  }
}
