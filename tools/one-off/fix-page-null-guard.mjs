import fs from 'node:fs';
// Page guard: the real shape is "nullnullnull…" followed by the app's own reference list, so the guard
// must look at the leading run instead of the whole string.
const file='app/src/fragments/10-rich-answer.fragment.js';
let t=fs.readFileSync(file,'utf8');
const from = "      const answer = /^(?:[\\s\\u200b-\\u200f\\u2060\\ufeff]*null)+[\\s\\u200b-\\u200f\\u2060\\ufeff]*$/i.test(raw)";
const to = "      const answer = /^(?:[\\s\\u200b-\\u200f\\u2060\\ufeff]*null){3,}/i.test(raw)";
const n=t.split(from).length-1;
if(n!==1) throw new Error(`anchor ${n}x`);
fs.writeFileSync(file, t.replace(from,to));
console.log('page guard now checks the leading null run');
