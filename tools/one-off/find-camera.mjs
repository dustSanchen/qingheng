import fs from 'node:fs';
const t = fs.readFileSync('app/src/main/java/cn/qingheng/health/MainActivity.java','utf8');
const lines = t.split(/\r?\n/);
lines.forEach((l,i) => {
  if (/onShowFileChooser|capture|CAMERA|FileProvider|photoPicker|onActivityResult|cacheDir/i.test(l)) {
    console.log((i+1) + '  ' + l.trim().slice(0,140));
  }
});
