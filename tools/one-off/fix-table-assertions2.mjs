import fs from 'node:fs';
const file='tests/chat-quality.test.mjs';
let lines=fs.readFileSync(file,'utf8').split('\n');
lines[32] = "check('the renderer refuses an oversized table', app.includes('function answerTableFits(rows)') && app.includes(\"if (!answerTableFits([head].concat(body))) return '';\"));";
lines[33] = "check('both table builders are guarded', app.split(\"if (!answerTableFits([head].concat(body))) return '';\").length - 1 === 2);";
fs.writeFileSync(file, lines.join('\n'));
console.log('rewrote lines 33-34');
