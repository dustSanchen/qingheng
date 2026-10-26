import fs from 'node:fs';
const apk = 'dist/qingheng-1.0.42.apk';
const buf = fs.readFileSync(apk);
const rows = [];
for (let i = 0; i < buf.length - 4; i++) {
  if (buf.readUInt32LE(i) !== 0x04034b50) continue;
  const compSize = buf.readUInt32LE(i + 18), uncompSize = buf.readUInt32LE(i + 22);
  const nameLen = buf.readUInt16LE(i + 26), extraLen = buf.readUInt16LE(i + 28);
  const name = buf.slice(i + 30, i + 30 + nameLen).toString('latin1');
  rows.push([name, compSize, uncompSize]);
  i += 29 + nameLen + extraLen + compSize;
}
rows.sort((a, b) => b[2] - a[2]);
console.log('entries:', rows.length);
rows.slice(0, 12).forEach(([n, c, u]) => console.log(String(u).padStart(8), String(c).padStart(8), n));
