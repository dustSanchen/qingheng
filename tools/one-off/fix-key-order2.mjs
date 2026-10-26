import fs from 'node:fs';
const f='tests/adapter.test.mjs';
let t=fs.readFileSync(f,'utf8');
const from = "['qingheng.tab','qingheng.tab','qingheng.training.consent','qingheng.training.consent','qingheng.chat.web'";
const to = "['qingheng.tab','qingheng.tab','qingheng.chat.unhelpful','qingheng.chat.unhelpful','qingheng.training.consent','qingheng.training.consent','qingheng.chat.web'";
if(t.split(from).length-1!==1) throw new Error('anchor missing');
fs.writeFileSync(f, t.replace(from,to));
console.log('key order updated for the unhelpful marker');
