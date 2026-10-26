/**
 * 第 6 轮：把剩余「列表空状态」全部改为统一组件 empty()。
 * 不改的是状态类文案（未配置 API、未测算、标签值），它们不是列表空态，塞进空状态卡反而更重。
 */
import fs from 'node:fs';
import { patch } from '../lib/patch.mjs';

patch('app/src/fragments/10-rich-answer.fragment.js', [
  ['advice empty state uses the component',
   "  : '<p>目前记录不足，暂不作判断。</p>';",
   "  : empty('目前记录不足，暂不作判断', '先记两三天，建议会自己长出来。');"],
]);

patch('app/src/fragments/60-training-copy.fragment.js', [
  ['quick copy empty state uses the component',
   "  }).join('') : '<span class=\"fine-print\">还没有可复制的餐食记录。</span>';",
   "  }).join('') : empty('还没有可复制的餐食记录', '记下一餐后，这里会列出来供一键复制。');"],
]);

patch('app/src/fragments/00-head.fragment.js', [
  ['food search empty state uses the component',
   "  : '<p class=\"fine-print\">没有匹配结果。可以换个说法，或直接在描述里写明食物与克重。</p>';",
   "  : empty('没有匹配结果', '换个说法，或直接在描述里写明食物与克重。');"],
]);

// 断言：不允许再出现「裸灰字」的列表空态
let t = fs.readFileSync('tests/training-library.test.mjs', 'utf8');
if (!t.includes('empty states all go through the component')) {
  t = t.replace("console.log('\\nFAIL total: ' + fail);",
`const frags = fs.readdirSync('app/src/fragments').map(f => fs.readFileSync('app/src/fragments/' + f, 'utf8')).join('\\n');
check('empty states all go through the component', !/<p>目前记录不足/.test(frags) && !/还没有可复制的餐食记录。'<\\/span>/.test(frags) && !/没有匹配结果。/.test(frags));
check('the component has a title and hint', frags.includes('empty-title') && frags.includes('empty-hint'));
check('the component is used in at least six places', (frags.match(/empty\\(/g) || []).length >= 6, String((frags.match(/empty\\(/g) || []).length));
console.log('\\nFAIL total: ' + fail);`);
  fs.writeFileSync('tests/training-library.test.mjs', t);
  console.log('empty-state assertions added');
}
console.log('round 6 unified');
