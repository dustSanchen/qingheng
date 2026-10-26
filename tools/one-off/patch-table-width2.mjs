import fs from 'node:fs';
const rich='app/src/fragments/10-rich-answer.fragment.js';
let text=fs.readFileSync(rich,'utf8');
function once(from,to,label){
  const n=text.split(from).length-1;
  if(n===0 && text.includes(to)){console.log('skip '+label);return;}
  if(n!==1) throw new Error(`${label}: ${n}`);
  text=text.replace(from,to); console.log('ok  '+label);
}
once('  function answerTable(rows) {',
`  /** Widest table that still reads on a phone: 4 columns, 8 body rows, short cells. */
  const ANSWER_TABLE_COLUMNS = 4, ANSWER_TABLE_ROWS = 8, ANSWER_TABLE_CELL = 12;
  /** False when a parsed block would overflow a phone screen, so it is shown as prose instead. */
  function answerTableFits(rows) {
    if (!Array.isArray(rows) || rows.length < 2) return false;
    if (rows[0].length > ANSWER_TABLE_COLUMNS || rows.length - 1 > ANSWER_TABLE_ROWS) return false;
    return rows.every(cells => cells.every(cell => String(cell).length <= ANSWER_TABLE_CELL));
  }
  function answerTable(rows) {`, 'table guard');
const headLine = text.split('\n').find(line => line.includes('const head = split(rows[0]);'));
if(!headLine) throw new Error('head line not found');
const indent = headLine.match(/^\s*/)[0];
const guard = `${indent}if (!answerTableFits(rows)) return '';`;
if(!text.includes(guard)){
  text = text.replace(headLine, headLine + '\n' + guard);
  console.log('ok  guard the whitespace table');
} else console.log('skip guard the whitespace table');
let wrapped = text.split('<table class="answer-table">').length - 1;
if (wrapped !== 2) throw new Error(`expected 2 table builders, found ${wrapped}`);
text = text.split('<table class="answer-table">').join('<div class="answer-table-wrap"><table class="answer-table">');
text = text.split('</table>`;').join('</table></div>`;');
console.log('ok  wrapped both table builders');
fs.writeFileSync(rich, text);
const css = `
/* A wide table scrolls inside its own box instead of pushing the page sideways; long cells wrap. */
.answer-table-wrap{max-width:100%;overflow-x:auto;-webkit-overflow-scrolling:touch}
.answer-table{width:100%;table-layout:fixed;border-collapse:collapse;font-size:12.5px}
.answer-table th,.answer-table td{padding:5px 6px;border-bottom:1px solid var(--line,#e3e7e2);text-align:left;overflow-wrap:anywhere;vertical-align:top}
.answer-table th{font-weight:600;opacity:.85}
`;
let styles=fs.readFileSync('app/src/main/assets/styles.css','utf8');
if(!styles.includes('.answer-table-wrap')){fs.writeFileSync('app/src/main/assets/styles.css', styles+css); console.log('ok  table styles appended');}
else console.log('skip table styles');
