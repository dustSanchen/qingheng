import fs from 'node:fs';
const t = fs.readFileSync('tests/gallery.test.mjs','utf8');
const i = t.indexOf('every file input has a visible label');
console.log(t.slice(Math.max(0,i-900), i+200));
