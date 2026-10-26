import fs from 'node:fs';
const html = fs.readFileSync('app/src/main/assets/index.html','utf8');
const marks = [...html.matchAll(/<section[^>]*id="([^"]+)"/g)].map(m => m[1] + '@' + m.index);
console.log('sections:', marks.join(' | '));
const rec = [...html.matchAll(/id="view-record[^"]*"/g)].map(m => m[0] + '@' + m.index);
console.log('record views:', rec.join(' | '));
