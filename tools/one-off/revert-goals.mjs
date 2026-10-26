import fs from 'node:fs';

const f = 'app/src/fragments/40-targets.fragment.js';
let t = fs.readFileSync(f, 'utf8');

const start = t.indexOf('    // non-lean goal ranges');
if (start < 0) { console.log('branch not found'); process.exit(0); }
const endMarker = 'proteinMin = Math.round(w * proteinPerKgMin);';
const endLine = t.indexOf(endMarker);
if (endLine < 0) throw new Error('marker missing');
t = t.slice(0, start) + t.slice(t.lastIndexOf('\n', endLine) + 1);

// 同时移除未使用的 helper，避免死代码
const h1 = t.indexOf('  /** 蛋白区间按缺口幅度分档');
const h2 = t.indexOf('function surplusForYears(');
if (h1 >= 0 && h2 > h1) {
  const close = t.indexOf('\n  }', t.indexOf('return 5;', h2)) + 4;
  t = t.slice(0, h1) + t.slice(close);
  console.log('helpers removed');
}

fs.writeFileSync(f, t);
console.log('reverted to green state');
