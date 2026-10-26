// Read-only: list entries inside the DSH app.asar archive.
// asar layout = 8-byte Chromium pickle prefix, then a JSON directory, then the file bytes.
import fs from 'node:fs';

const file = process.argv[2];
const needles = process.argv.slice(3).map(s => s.toLowerCase());

const fd = fs.openSync(file, 'r');
const head = Buffer.alloc(16);
fs.readSync(fd, head, 0, 16, 0);
const headerStringSize = head.readUInt32LE(12);
const json = Buffer.alloc(headerStringSize);
fs.readSync(fd, json, 0, headerStringSize, 16);
fs.closeSync(fd);

const dir = JSON.parse(json.toString('utf8'));
const paths = [];
(function walk(node, prefix) {
  for (const [name, value] of Object.entries(node.files || {})) {
    const full = prefix ? `${prefix}/${name}` : name;
    if (value.files) walk(value, full);
    else paths.push(full);
  }
})(dir, '');

console.log('total entries:', paths.length);
if (needles.length === 0) {
  console.log(paths.filter(p => /node_modules\/@deepseek-ai\/[^/]+\/package\.json$/.test(p)).slice(0, 60).join('\n'));
} else {
  for (const needle of needles) {
    const hits = paths.filter(p => p.toLowerCase().includes(needle));
    console.log(`\n--- "${needle}" -> ${hits.length} hit(s)`);
    console.log(hits.slice(0, 25).join('\n'));
  }
}
