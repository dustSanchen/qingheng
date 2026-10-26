// Read-only: extract one file from a DSH app.asar archive.
import fs from 'node:fs';

const [file, wanted, dest] = process.argv.slice(2);
const fd = fs.openSync(file, 'r');
const head = Buffer.alloc(16);
fs.readSync(fd, head, 0, 16, 0);
const headerStringSize = head.readUInt32LE(12);
const json = Buffer.alloc(headerStringSize);
fs.readSync(fd, json, 0, headerStringSize, 16);
const dir = JSON.parse(json.toString('utf8'));

// asar data section starts after the pickle prefix: 8 + pickleSize, then the JSON string.
const base = 8 + head.readUInt32LE(4) + 4;

function find(node, prefix, target) {
  for (const [name, value] of Object.entries(node.files || {})) {
    const full = prefix ? `${prefix}/${name}` : name;
    if (value.files) { const hit = find(value, full, target); if (hit) return hit; }
    else if (full === target) return value;
  }
  return null;
}

const entry = find(dir, '', wanted.replace(/\\/g, '/'));
if (!entry) { console.error('not found:', wanted); process.exit(2); }
const size = Number(entry.size);
const offset = base + Number(entry.offset);
const buf = Buffer.alloc(size);
fs.readSync(fd, buf, 0, size, offset);
fs.closeSync(fd);

const text = buf.toString('utf8');
// Sanity check: a mis-computed offset yields binary noise.
const printable = text.slice(0, 400).replace(/[^\x09\x0a\x0d\x20-\x7e\u4e00-\u9fff]/g, '');
if (printable.length < 40) { console.error('offset looks wrong; first bytes:', buf.slice(0, 32)); process.exit(3); }
// Write UTF-8 directly: PowerShell's ">" redirection emits UTF-16 and corrupts the text.
if (dest) { fs.writeFileSync(dest, text, 'utf8'); console.log('wrote', dest, size, 'bytes'); }
else process.stdout.write(text);
