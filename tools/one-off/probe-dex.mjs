import fs from 'node:fs';
import zlib from 'node:zlib';
// Read the zip central directory minimally: find classes.dex, inflate it, then search its strings.
const buf = fs.readFileSync('dist/qingheng-1.0.18.apk');
let found = null;
for (let i = 0; i < buf.length - 4; i++) {
  if (buf.readUInt32LE(i) === 0x04034b50) {
    const method = buf.readUInt16LE(i + 8);
    const compSize = buf.readUInt32LE(i + 18);
    const nameLen = buf.readUInt16LE(i + 26);
    const extraLen = buf.readUInt16LE(i + 28);
    const name = buf.slice(i + 30, i + 30 + nameLen).toString('latin1');
    if (name !== 'classes.dex') { i += 29 + nameLen + extraLen + compSize; continue; }
    const dataStart = i + 30 + nameLen + extraLen;
    const raw = buf.slice(dataStart, dataStart + compSize);
    found = method === 8 ? zlib.inflateRawSync(raw) : raw;
    console.log('classes.dex', found.length, 'bytes, method', method);
    break;
  }
}
if (!found) throw new Error('classes.dex not found in the APK');
const latin = found.toString('latin1');
for (const marker of ['这次回答没有正确返回', 'repairChatAnswers', 'chatAnswersRepaired', 'isBlank']) {
  const probe = Buffer.from(marker, 'utf8').toString('latin1');
  console.log(marker, '->', latin.includes(probe) ? 'FOUND' : 'missing');
}
