import fs from 'node:fs';

const f = 'app/src/main/java/cn/qingheng/health/MainActivity.java';
let t = fs.readFileSync(f, 'utf8');

const from = '            boundNumber(patch, "training", 0, 14);';
if (!t.includes(from)) { console.log('MISS training bound'); process.exit(1); }

const to = [
  '            // "none" 是一个合法答案（不健身），不是缺失值：只有数字才走范围校验。',
  '            Object trainingRaw = patch.opt("training");',
  '            if (trainingRaw != null && !"none".equals(String.valueOf(trainingRaw))) {',
  '                boundNumber(patch, "training", 0, 14);',
  '            }'
].join('\n');

t = t.replace(from, to);
fs.writeFileSync(f, t);
console.log('training field accepts "none"');
