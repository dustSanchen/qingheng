import fs from 'node:fs';
const app = fs.readFileSync('app/src/main/assets/app.js','utf8');
const html = fs.readFileSync('app/src/main/assets/index.html','utf8');
const all = app + html;
const probes = ['quick-record-dialog','exact-alarm-settings','health-connect-sync','renderAll','openFromNotification'];
for (const p of probes) {
  const inApp = (app.match(new RegExp(p.replace(/[-]/g,'\\-'),'g'))||[]).length;
  const inHtml = (html.match(new RegExp(p.replace(/[-]/g,'\\-'),'g'))||[]).length;
  console.log(p.padEnd(24), 'app.js=' + inApp, 'index.html=' + inHtml);
  if (p === 'renderAll') {
    const i = app.indexOf('renderAll');
    console.log('   ctx:', JSON.stringify(app.slice(Math.max(0,i-120), i+80)));
  }
  if (p === 'openFromNotification') {
    const i = app.indexOf('openFromNotification');
    console.log('   ctx:', JSON.stringify(app.slice(Math.max(0,i-140), i+120)));
  }
}
