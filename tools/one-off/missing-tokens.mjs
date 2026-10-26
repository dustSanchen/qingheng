import fs from 'node:fs';
const doc = fs.readFileSync('D:/AI/health-android/docs/design/02-tokens.md','utf8');
const css = fs.readFileSync('D:/AI/health-android/app/src/main/assets/styles.css','utf8');
const names = [...new Set([...doc.matchAll(/`(--[a-z0-9-]+)`/g)].map(m => m[1]))];
const missing = names.filter(n => !new RegExp('^\\s*' + n + ':', 'mi').test(css));
console.log('doc tokens:', names.length);
console.log('missing in css (' + missing.length + '):');
console.log(missing.join(' '));
