import fs from 'node:fs';

const f = 'app/src/main/assets/index.html';
let html = fs.readFileSync(f, 'utf8');
const trims = [
  ['语音说明',
   '可以说「米饭 100 克、鸡胸肉 150 克」，也可以直接打字。语音只在本机识别，不上传录音。',
   '可说「米饭 100 克、鸡胸 150 克」；语音只在本机识别。'],
  ['复制一餐说明',
   '一键复制到当前日期，再按实际份量微调。',
   '复制到当前日期，再按实际份量微调。'],
  ['训练日志说明',
   '动作 · 组数 · 次数 · 负重；容量变化在趋势页看。',
   '动作 · 组 · 次 · 负重。'],
  ['餐食汇总说明',
   '未记录的餐食不计入汇总。',
   ''],
];
let n = 0;
for (const [label, from, to] of trims) {
  if (!html.includes(from)) { console.log('MISS', label); continue; }
  html = html.replace(from, to); n++; console.log('ok  ', label);
}
fs.writeFileSync(f, html);
console.log('trimmed:', n);
