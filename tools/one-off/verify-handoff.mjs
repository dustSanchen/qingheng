import fs from 'node:fs';
const p = 'docs/design/09-codex-handoff.md';
const t = fs.readFileSync(p, 'utf8');
console.log('lines:', t.split(/\r?\n/).length, '| chars:', t.length);
const heads = t.split(/\r?\n/).filter(l => /^## /.test(l));
console.log(heads.join('\n'));
// 事实自检：文中数字与代码一致
const css = fs.readFileSync('app/src/main/assets/styles.css','utf8');
const app = fs.readFileSync('app/src/main/assets/app.js','utf8');
console.log('css lines:', css.split(/\r?\n/).length);
console.log('version:', (app.match(/const APP_VERSION = '([\d.]+)'/)||[])[1]);
console.log('tokens declared:', new Set([...css.matchAll(/(^|[{;\s])(--[a-z0-9-]+):/gm)].map(m=>m[2])).size);
console.log('hex left:', (css.match(/#[0-9a-fA-F]{3,8}\b/g)||[]).length);
