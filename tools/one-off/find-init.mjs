import fs from 'node:fs';
const t = fs.readFileSync('app/src/main/assets/app.js','utf8');
const lines = t.split(/\r?\n/);
// 找初始化块：bindEvents / init / boot
lines.forEach((l, i) => { if (/^(async )?function (init|boot|bindEvents|start)\b|addEventListener\('DOMContentLoaded'|^\s*loadState\(\)|^\s*bindEvents\(\)/.test(l.trim())) console.log((i+1) + '  ' + l.trim().slice(0, 100)); });
