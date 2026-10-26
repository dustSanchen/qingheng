import fs from 'node:fs';
const f = 'app/src/main/assets/index.html';
let html = fs.readFileSync(f, 'utf8');
let n = 0;
const swaps = [
  ['USDA 说明',
   '食材数据来自 <strong>USDA FoodData Central</strong>（公有领域）；家常菜为示例估算，含示例油。按每 100g 可食部计，非薄荷数据库。',
   '食材数据：<strong>USDA FoodData Central</strong>（公有领域）；家常菜为示例估算，按每 100g 可食部计。'],
  ['OFF 说明',
   '数据来源 <strong>Open Food Facts</strong>（ODbL 许可，可复用需署名）。包装标示按每 100g 计，以实物标签为准；服务限约 10 次/分钟，故只在点按钮时查询。',
   '在线查询：<strong>Open Food Facts</strong>（ODbL，需署名）；按每 100g，以标签为准；限约 10 次/分钟，只在点按钮时查询。']
];
for (const [label, from, to] of swaps) {
  if (!html.includes(from)) { console.log('MISS', label); continue; }
  html = html.replace(from, to); n++; console.log('ok  ', label);
}
fs.writeFileSync(f, html);
console.log('trimmed:', n);
