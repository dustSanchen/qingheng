const fs = require('fs');
const buf = fs.readFileSync('build/hc-controller.apk');
const text = buf.toString('latin1');
const found = new Set();
for (const m of text.matchAll(/android\.health\.connect\.[A-Za-z0-9_.]+/g)) found.add(m[0]);
const list = [...found].sort();
console.log(list.join('\n'));
console.log('--- android.health.connect.* count:', list.length);
