import fs from 'node:fs';
const css = fs.readFileSync('D:/AI/health-android/app/src/main/assets/styles.css','utf8');
for (const t of ['--icon-sm','--icon-md','--icon-lg','--gap','--ease-out','--shadow-rgb','--fw-display']) {
  const re = new RegExp('[^\\n]*' + t + '[^\\n]*', 'gi');
  const m = css.match(re);
  console.log(t, '->', m ? m.slice(0,3).map(s => s.trim().slice(0,90)) : 'none');
}
