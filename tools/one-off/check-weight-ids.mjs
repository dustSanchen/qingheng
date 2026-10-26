import fs from 'node:fs';
const html = fs.readFileSync('app/src/main/assets/index.html','utf8');
for (const id of ['weight-sheet','weight-close','weight-calc','bar-weight','plate-weight','weight-per-side','weight-fill','photo-add','photo-sheet']) {
  console.log(id.padEnd(16), html.includes('id="' + id + '"'));
}
