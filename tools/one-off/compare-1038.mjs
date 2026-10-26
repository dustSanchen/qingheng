import fs from 'node:fs';
import zlib from 'node:zlib';
function readEntry(apk, wanted) {
  const buf = fs.readFileSync(apk);
  for (let i = 0; i < buf.length - 4; i++) {
    if (buf.readUInt32LE(i) !== 0x04034b50) continue;
    const method = buf.readUInt16LE(i + 8), compSize = buf.readUInt32LE(i + 18);
    const nameLen = buf.readUInt16LE(i + 26), extraLen = buf.readUInt16LE(i + 28);
    const name = buf.slice(i + 30, i + 30 + nameLen).toString('latin1');
    if (name !== wanted) { i += 29 + nameLen + extraLen + compSize; continue; }
    const start = i + 30 + nameLen + extraLen;
    const raw = buf.slice(start, start + compSize);
    return (method === 8 ? zlib.inflateRawSync(raw) : raw).toString('utf8');
  }
  return null;
}
const newer = readEntry('dist/qingheng-1.0.38.apk', 'assets/app.js');
const mine = fs.readFileSync('app/src/main/assets/app.js', 'utf8');
console.log('1.0.38 app.js chars:', newer?.length, 'current:', mine.length);
const markers = ['diet-band','data-meal-items','renderRecordMeals','installTrendPanels','renderDietTrend','weeklyVolume','dietBarColor','goalColor','跑步'];
for (const m of markers) console.log(m.padEnd(20), 'in 1.0.38:', newer.includes(m), ' current:', mine.includes(m));
// functions present in the newer build but missing here
const fnRe = /function ([A-Za-z_$][\w$]*)\s*\(/g;
const a = new Set([...newer.matchAll(fnRe)].map(x => x[1]));
const b = new Set([...mine.matchAll(fnRe)].map(x => x[1]));
const onlyNewer = [...a].filter(x => !b.has(x));
const onlyMine = [...b].filter(x => !a.has(x));
console.log('only in 1.0.38 (' + onlyNewer.length + '):', onlyNewer.slice(0, 30).join(', '));
console.log('only in current (' + onlyMine.length + '):', onlyMine.slice(0, 30).join(', '));
