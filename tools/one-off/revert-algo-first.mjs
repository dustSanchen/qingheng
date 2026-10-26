import fs from 'node:fs';

const f = 'app/src/fragments/40-targets.fragment.js';
let t = fs.readFileSync(f, 'utf8');
let n = 0;

// 回到「有显式口径就按口径，没有就按目标算法」——这是能通过全部断言与用户预期的最小公约
const gateFrom = "if (goal !== 'lean') {";
if (t.includes(gateFrom)) {
  t = t.replace(gateFrom, "if (goal !== 'lean' && !customRanges) {");
  n++; console.log('restored 口径 gate');
}

// 移除事后的 clamp（会与 gate 叠加，导致区间被二次覆盖）
const cs = t.indexOf('    // 口径事后调整');
if (cs >= 0) {
  const ce = t.indexOf('proteinMin = Math.round', cs);
  const lineStart = t.indexOf('\n', ce) === -1 ? ce : t.lastIndexOf('\n', ce) + 1;
  t = t.slice(0, cs) + t.slice(lineStart);
  n++; console.log('removed post-hoc clamp');
}

fs.writeFileSync(f, t);
console.log('changes:', n);
