import fs from 'node:fs';

// 把速率提示接到「今日能量」的说明行（calorie-action），不改膳食计算本身
const f = 'app/src/fragments/00-head.fragment.js';
let t = fs.readFileSync(f, 'utf8');

if (!t.includes('rateCalibration(profile.goal)')) {
  const anchor = "const basis = active ? `${goalLabel(profile.goal)}";
  const i = t.indexOf(anchor);
  if (i < 0) { console.log('basis anchor missing'); process.exit(1); }
  // 在 basis 之后追加速率提示（如果存在）
  const semi = t.indexOf(';', i);
  const insert = '\n  const rateHint = typeof rateCalibration === "function" ? rateCalibration(profile.goal) : null;';
  t = t.slice(0, semi + 1) + insert + t.slice(semi + 1);
  console.log('rate hint computed');
}

fs.writeFileSync(f, t);
