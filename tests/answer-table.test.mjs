/**
 * Runs the shipped table parsers against the exact text a model produced, so "it should render as a
 * table" is a checked claim rather than an assumption.
 *
 * The sample is the real answer from the device log: a header line plus one data line, with no blank
 * line between them.
 */
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

let fail = 0;
const check = (label, ok, detail) => { console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail)); if (!ok) fail++; };

// Normalised to LF so the slice markers below can be written plainly.
const source = fs.readFileSync('app/src/fragments/10-rich-answer.fragment.js', 'utf8').replace(/\r\n/g, '\n');
const slice = (startMarker, endMarker) => {
  const start = source.indexOf(startMarker);
  if (start < 0) throw new Error(`${startMarker} not found`);
  const end = source.indexOf(endMarker, start);
  if (end < 0) throw new Error(`end marker for ${startMarker} not found`);
  return source.slice(start, end);
};

const sandbox = {
  esc: value => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'),
  number: v => (v !== null && v !== undefined && v !== '' && Number.isFinite(Number(v)) ? Number(v) : null),
  String, Number, Array, RegExp, Math, Set, Boolean,
};
vm.createContext(sandbox);
const code = [
  slice('  const answerNumericCell', '\n  /**'),
  slice('  /** Widest table that still reads on a phone', '  /** Plain text'),
  slice('  function answerSpaceTable(rows) {', '\n  }\n') + '\n  }',
  '  function answerInline(text) { return esc(text); }',
].join('\n');
vm.runInContext(code + '\nthis.answerSpaceTable = answerSpaceTable; this.answerTable = answerTable; this.answerTableFits = answerTableFits;', sandbox);
const {answerSpaceTable, answerTable} = sandbox;

// The real answer text, split the way the renderer splits blocks (on blank lines).
const block = [
  '日期 热量（千卡） 蛋白质（克） 记录餐数',
  '2026-10-16 1755.1 99.22 3',
];
const spaceHtml = answerSpaceTable(block);
check('the real whitespace table renders as a table', spaceHtml.includes('<table'), spaceHtml.slice(0, 80));
check('it is wrapped so it can scroll', spaceHtml.includes('answer-table-wrap'));
check('it has a header row and one body row', (spaceHtml.match(/<tr>/g) || []).length === 2, spaceHtml);

const threeDays = [
  '日期 热量（千卡） 蛋白质（克） 记录餐数',
  '2026-10-16 1755.1 99.22 3',
  '2026-10-15 2103.4 121.5 4',
  '2026-10-14 1890 98 3',
];
check('three days still fit', answerSpaceTable(threeDays).includes('<table'));

// A Markdown pipe table must render too, and must be refused when it cannot fit a phone.
const pipes = ['| 日期 | 热量 | 蛋白 |', '| --- | --- | --- |', '| 2026-10-16 | 1755 | 99 |'];
check('a pipe table renders', answerTable(pipes.slice(1)).includes('<table') || answerTable(pipes).includes('<table'));

const tooWide = ['日期 热量 蛋白 脂肪 碳水 记录餐数', '2026-10-16 1755 99 60 200 3'];
check('a table wider than four columns is not drawn', answerSpaceTable(tooWide) === '', answerSpaceTable(tooWide).slice(0, 40));

const tooLong = ['日期 热量 蛋白 记录餐数'].concat(
  Array.from({length: 12}, (_, i) => `2026-10-${String(i + 1).padStart(2, '0')} 1800 100 3`));
check('a table longer than eight rows is not drawn', answerSpaceTable(tooLong) === '');

const longCell = ['日期 热量 蛋白质说明文字特别长的一列 记录餐数', '2026-10-16 1755 这是一段很长的说明文字 3'];
check('a table with an oversized cell is not drawn as a table', answerSpaceTable(longCell) === '');

// Prose must never be mistaken for a table.
const prose = ['我建议你今天把蛋白质补到 130 克左右，', '晚餐可以加一掌大的鱼或一份豆腐。'];
check('ordinary prose is not turned into a table', answerSpaceTable(prose) === '');

console.log('\nFAIL total: ' + fail);
process.exitCode = fail ? 1 : 0;
