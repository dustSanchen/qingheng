import fs from 'node:fs';

const f = 'app/src/fragments/00-head.fragment.js';
let t = fs.readFileSync(f, 'utf8');
const start = t.indexOf('  function annotateTerms(html) {');
if (start < 0) throw new Error('annotateTerms not found');

// 用花括号配对找到函数结尾
let depth = 0, i = t.indexOf('{', start), end = -1;
for (; i < t.length; i++) {
  if (t[i] === '{') depth++;
  else if (t[i] === '}') { depth--; if (depth === 0) { end = i + 1; break; } }
}
if (end < 0) throw new Error('unbalanced');

const replacement = [
  '  function annotateTerms(html) {',
  '    let out = String(html || "");',
  '    for (const term of Object.keys(TERMS)) {',
  '      if (out.includes("data-term=\\"" + term + "\\"")) continue;',
  '      const safe = term.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&");',
  '      const re = new RegExp("(?<![A-Za-z0-9-])" + safe + "(?![A-Za-z0-9-])");',
  '      if (!re.test(out)) continue;',
  '      out = out.replace(re, "<button type=\\"button\\" class=\\"term\\" data-term=\\"" + term + "\\">" + term + "</button>");',
  '    }',
  '    return out;',
  '  }'
].join('\n');

t = t.slice(0, start) + replacement + t.slice(end);
fs.writeFileSync(f, t);
console.log('annotateTerms replaced');

// 自检：用计划里的真实文案跑一遍
const run = new Function('return ' + replacement.replace('function annotateTerms(html)', 'function annotateTerms(html)'))();
const sample = '<p class="plan-cue">计划里的 12/10/8 次不是 RM（力竭次数），而是每组留约 2 次余量（RPE 8）；本周负荷偏高（ACWR &gt; 1.5）</p>';
const TERMS = {RPE: 1, RM: 1, ACWR: 1, TDEE: 1, '减载': 1, '渐进超负荷': 1, '力竭': 1, '离心': 1};
const fn = new Function('TERMS', replacement + '\nreturn annotateTerms;')(TERMS);
const out = fn(sample);
console.log('annotated RPE:', out.includes('data-term="RPE"'));
console.log('annotated RM:', out.includes('data-term="RM"'));
console.log('annotated ACWR:', out.includes('data-term="ACWR"'));
console.log('annotated 力竭:', out.includes('data-term="力竭"'));
