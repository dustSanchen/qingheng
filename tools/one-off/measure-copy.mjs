import fs from 'node:fs';
const html = fs.readFileSync('app/src/main/assets/index.html','utf8');
const needles = [
  ['USDA', 'USDA FoodData Central</strong>（公有领域）'],
  ['OFF', 'Open Food Facts</strong>（ODbL'],
  ['通知', '到点用本地通知提醒'],
  ['离线', 'APK 可离线记录'],
  ['关于', '轻衡是个人健康记录工具'],
  ['存储', '记录以 JSON（state.json）']
];
let total = 0;
for (const [label, needle] of needles) {
  const i = html.indexOf(needle);
  const start = html.lastIndexOf('<p class="fine-print"', i);
  const end = html.indexOf('</p>', i);
  const text = html.slice(start, end).replace(/<[^>]+>/g, '').trim();
  total += text.length;
  console.log(label + ': ' + text.length + ' 字');
}
console.log('六段合计: ' + total + ' 字（原 587 字，减少 ' + (587 - total) + ' 字）');
