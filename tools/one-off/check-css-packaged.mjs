import fs from 'node:fs';
import zlib from 'node:zlib';
const buf = fs.readFileSync('dist/qingheng-1.0.22.apk');
let entry = null;
for (let i = 0; i < buf.length - 4; i++) {
  if (buf.readUInt32LE(i) !== 0x04034b50) continue;
  const method = buf.readUInt16LE(i + 8), compSize = buf.readUInt32LE(i + 18);
  const nameLen = buf.readUInt16LE(i + 26), extraLen = buf.readUInt16LE(i + 28);
  const name = buf.slice(i + 30, i + 30 + nameLen).toString('latin1');
  if (name !== 'assets/styles.css') { i += 29 + nameLen + extraLen + compSize; continue; }
  const start = i + 30 + nameLen + extraLen;
  const raw = buf.slice(start, start + compSize);
  entry = method === 8 ? zlib.inflateRawSync(raw) : raw;
  break;
}
if (!entry) { console.log('styles.css NOT PACKAGED'); process.exit(1); }
const text = entry.toString('utf8');
console.log('packaged size', text.length);
console.log('fixed bar rule:', text.includes('.onboarding-actions{position:fixed'));
console.log('onboarding padding rule:', text.includes('.onboarding{padding-bottom:calc(112px'));
