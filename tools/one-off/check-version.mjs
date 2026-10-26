import fs from 'node:fs';
const f = 'app/src/fragments/70-rest.fragment.js';
const t = fs.readFileSync(f, 'utf8');
const m = t.match(/const APP_VERSION = '([\d.]+)'/);
console.log('current:', m && m[1]);
const b = fs.readFileSync('build.ps1', 'utf8').match(/Version='([\d.]+)',\[int\]\$VersionCode=(\d+)/);
console.log('build.ps1:', b && b[1], b && b[2]);
