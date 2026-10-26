import fs from 'node:fs';
// Page-side guard: even before the native repair lands, an answer made of JSON nulls is shown as a note.
const file='app/src/fragments/10-rich-answer.fragment.js';
let t=fs.readFileSync(file,'utf8');
const from=`    if (log) log.innerHTML = shown.length ? [...shown].reverse().map(row => {
      const answer = String(row.answer || '');`;
const to=`    if (log) log.innerHTML = shown.length ? [...shown].reverse().map(row => {
      // An answer that is nothing but JSON nulls ("nullnull…") is not an answer: show what happened
      // instead of the raw text, even if the stored record was never repaired.
      const raw = String(row.answer || '');
      const answer = /^(?:[\\s\\u200b-\\u200f\\u2060\\ufeff]*null)+[\\s\\u200b-\\u200f\\u2060\\ufeff]*$/i.test(raw)
        ? '这次回答没有正确返回（模型只返回了思考过程，没有输出内容）。请重新提问；如果反复出现，请在「我的 → 模型连接」换一个非推理模型。'
        : raw;`;
const n=t.split(from).length-1;
if(n!==1) throw new Error(`anchor ${n}x`);
fs.writeFileSync(file, t.replace(from,to));
console.log('page-side null answer guard added');
