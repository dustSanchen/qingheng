import fs from 'node:fs';
const css = fs.readFileSync('D:/AI/health-android/app/src/main/assets/styles.css','utf8');
console.log('stats literal kept:', /\.stats-good\{color:#3f7a5e\}/.test(css));
const used = new Set([...css.matchAll(/var\((--[a-z0-9-]+)/g)].map(m => m[1]));
const declared = new Set([...css.matchAll(/(^|[{\s;])(--[a-z0-9-]+):/gm)].map(m => m[2]));
const undef = [...used].filter(t => !declared.has(t));
console.log('undeclared var() refs:', undef.length, undef.slice(0, 12).join(' '));
