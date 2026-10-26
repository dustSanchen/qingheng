import fs from 'node:fs';
const lines = fs.readFileSync('app/src/main/java/cn/qingheng/health/MainActivity.java','utf8').split(/\r?\n/);
for (let k = 616; k < 640; k++) console.log((k+1) + '  ' + (lines[k]||'').slice(0,150));
console.log('--- tests mentioning delete ---');
import { readdirSync } from 'node:fs';
for (const f of readdirSync('tests')) {
  if (!f.endsWith('.mjs')) continue;
  const t = fs.readFileSync('tests/' + f, 'utf8');
  if (/delete\(uri|cameraTemp|pending_image_owned/.test(t)) console.log(f, '->', (t.match(/.*delete\(uri.*/g)||[''])[0].trim().slice(0,110));
}
