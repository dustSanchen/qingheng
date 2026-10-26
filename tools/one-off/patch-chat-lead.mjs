import fs from 'node:fs';
let html=fs.readFileSync('app/src/main/assets/index.html','utf8');
const from='我会结合你本机记录的数据回答；不确定的地方会直说。';
const to='我先用你本机记录的数据直接回答；哪部分没有记录就跳过哪部分，不给结论留空。';
const n=html.split(from).length-1;
if(n!==1) throw new Error(`lead anchor ${n}x`);
fs.writeFileSync('app/src/main/assets/index.html', html.replace(from,to));
console.log('updated the chat page lead');
