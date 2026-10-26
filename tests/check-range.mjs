import fs from 'node:fs';
import zlib from 'node:zlib';

const html = fs.readFileSync('app/src/main/assets/index.html', 'utf8');
const block = html.match(/<select id="trend-range">[\s\S]*?<\/select>/);
console.log('SOURCE :', block ? block[0] : 'NOT FOUND');

// Read the packaged asset back out of the APK so the check covers what ships.
const apkName = fs.readdirSync('dist').filter(name => /^qingheng-.*\.apk$/.test(name))
  .sort((a, b) => fs.statSync('dist/' + a).mtimeMs - fs.statSync('dist/' + b).mtimeMs).at(-1);
if (!apkName) throw new Error('No Qingheng APK found in dist');
const apk = fs.readFileSync('dist/' + apkName);
let found = null;
for (let i = 0; i < apk.length - 4; i++) {
  if (apk.readUInt32LE(i) !== 0x04034b50) continue;
  const method = apk.readUInt16LE(i + 8);
  const nameLen = apk.readUInt16LE(i + 26);
  const extraLen = apk.readUInt16LE(i + 28);
  const name = apk.slice(i + 30, i + 30 + nameLen).toString('utf8');
  if (!name.endsWith('index.html')) continue;
  const compSize = apk.readUInt32LE(i + 18);
  const start = i + 30 + nameLen + extraLen;
  const raw = apk.slice(start, start + compSize);
  const text = method === 0 ? raw.toString('utf8') : zlib.inflateRawSync(raw).toString('utf8');
  const packed = text.match(/<select id="trend-range">[\s\S]*?<\/select>/);
  found = packed ? packed[0] : 'range select missing in APK';
  break;
}
console.log('IN APK :', found);
