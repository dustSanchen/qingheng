import fs from 'node:fs';

const f = 'app/src/main/assets/index.html';
let html = fs.readFileSync(f, 'utf8');
let n = 0;

// 1) 把两段食材来源说明从记录页移走，换成一句指向「关于轻衡」
const usda = '食材数据：<strong>USDA FoodData Central</strong>（公有领域）；家常菜为示例估算，按每 100g 可食部计。';
const off = '在线查询：<strong>Open Food Facts</strong>（ODbL，需署名）；按每 100g，以标签为准；限约 10 次/分钟，只在点按钮时查询。';
if (html.includes(usda) || html.includes(off)) {
  html = html.replace(usda, '');
  html = html.replace(off, '数据来源与许可见「我的 → 关于轻衡 → 参考与致谢」。');
  n++; console.log('moved USDA/OFF notes out of the record page');
}

// 2) 关于页的食材说明补上限流口径（测试依赖这一句）
const target = '食材营养值来自 USDA FoodData Central（公有领域）；在线查询使用 Open Food Facts（ODbL 许可，需署名）。家常菜为示例估算，按每 100g 可食部计。';
if (html.includes(target)) {
  html = html.replace(target, '食材营养值来自 USDA FoodData Central（公有领域）；在线查询使用 Open Food Facts（ODbL 许可，需署名），按每 100g 计、以标签为准，服务限约 10 次/分钟，只在点按钮时查询。家常菜为示例估算。');
  n++; console.log('credits keep the rate-limit wording');
}

fs.writeFileSync(f, html);
console.log('moved:', n);
