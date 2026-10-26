/**
 * 补丁修正：习惯载荷的油字段替换成睡眠，并同步提示文案。
 * 上一版把锚点写成了带尾逗号的形状，源码里其实是 `...(oilSpoons),` 紧跟 `});`。
 */
import fs from 'node:fs';
import {patch} from '../lib/patch.mjs';

patch('app/src/fragments/70-rest.fragment.js', [
  [
    'habits payload carries sleep',
    `...(oilSpoons === null ? {} : {oilSpoons})});
        saved.push(trainingValue === '' ? '用油' : '训练');`,
    `...(sleep === null ? {} : {sleep})});
        saved.push(trainingValue === '' ? '睡眠' : '训练');`,
  ],
]);

// 若前一步已把 oilSpoons 变量改名，这里兜住旧引用
let text = fs.readFileSync('app/src/fragments/70-rest.fragment.js', 'utf8');
const remaining = (text.match(/oilSpoons/g) || []).length;
console.log('remaining oilSpoons refs:', remaining);
if (remaining) {
  const lines = text.split(/\r?\n/).filter(line => line.includes('oilSpoons'));
  lines.forEach(line => console.log('  ', line.trim().slice(0, 130)));
}
