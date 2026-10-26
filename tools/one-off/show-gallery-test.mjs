import fs from 'node:fs';
const t = fs.readFileSync('tests/gallery.test.mjs','utf8');
for (const l of t.split(/\r?\n/)) if (/capture-button|photo-add|meal-gallery/.test(l)) console.log('TEST:', l.trim().slice(0,140));
