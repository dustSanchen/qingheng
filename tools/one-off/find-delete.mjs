import fs from 'node:fs';
const lines = fs.readFileSync('app/src/main/java/cn/qingheng/health/MainActivity.java','utf8').split(/\r?\n/);
lines.forEach((l,i) => { if (/deleteCameraTemp|pendingImageOwned|clearPendingImage|deliverCapture/.test(l)) console.log((i+1) + '  ' + l.trim().slice(0,150)); });
