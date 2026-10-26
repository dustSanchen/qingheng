import fs from 'node:fs';
function entries(apk) {
  const buf = fs.readFileSync(apk); const out = new Map();
  for (let i = 0; i < buf.length - 4; i++) {
    if (buf.readUInt32LE(i) !== 0x04034b50) continue;
    const compSize = buf.readUInt32LE(i + 18), uncompSize = buf.readUInt32LE(i + 22);
    const nameLen = buf.readUInt16LE(i + 26), extraLen = buf.readUInt16LE(i + 28);
    const name = buf.slice(i + 30, i + 30 + nameLen).toString('latin1');
    out.set(name, uncompSize);
    i += 29 + nameLen + extraLen + compSize;
  }
  return out;
}
for (const f of ['dist/qingheng-1.0.41.apk','dist/qingheng-1.0.42.apk']) {
  if (!fs.existsSync(f)) { console.log(f, 'missing'); continue; }
  const e = entries(f);
  const total = [...e.values()].reduce((a,b) => a+b, 0);
  console.log(f, 'entries=' + e.size, 'uncompressed=' + Math.round(total/1024) + 'KB', 'file=' + Math.round(fs.statSync(f).size/1024) + 'KB');
}
const a = entries('dist/qingheng-1.0.41.apk'), b = entries('dist/qingheng-1.0.42.apk');
const onlyB = [...b.keys()].filter(k => !a.has(k));
console.log('added in 1.0.42:', onlyB.join(', ') || '(none)');
