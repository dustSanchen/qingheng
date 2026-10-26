import fs from 'node:fs';
const t = fs.readFileSync('app/src/fragments/00-head.fragment.js','utf8');
const a = t.indexOf('const GOAL_PRESETS');
console.log('A' + JSON.stringify(t.slice(a, a + 260)));
const b = t.indexOf('const RULE_KEYS');
console.log('B' + JSON.stringify(t.slice(b, b + 80)));
const c = t.indexOf('const proteinMin = Math.round');
console.log('C' + JSON.stringify(t.slice(c - 120, c + 40)));
