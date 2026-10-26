import fs from 'node:fs';
let t=fs.readFileSync('tests/chat-quality.test.mjs','utf8');
const pairs=[
 ["check('the renderer refuses an oversized table', app.includes('function answerTableFits(rows)') && app.includes(\"if (!answerTableFits(rows)) return '';\"));",
  "check('the renderer refuses an oversized table', app.includes('function answerTableFits(rows)') && app.includes(\"if (!answerTableFits([head].concat(body))) return '';\"));"],
 ["check('both table builders are guarded', app.includes(\"if (!answerTableFits(rows)) return '';\") && app.includes('if (!answerTableFits([head].concat(body))) return \\'\\';'));",
  "check('both table builders are guarded', app.split('if (!answerTableFits([head].concat(body))) return \\'\\';').length - 1 === 2);"],
];
for(const [from,to] of pairs){
  const n=t.split(from).length-1;
  if(n===0 && t.includes(to)) continue;
  if(n!==1) throw new Error(`anchor ${n}x -> ${from.slice(0,70)}`);
  t=t.replace(from,to);
}
fs.writeFileSync('tests/chat-quality.test.mjs', t);
console.log('table assertions retargeted to the split cells');
