import fs from 'node:fs';
const file='tests/chat-quality.test.mjs';
let t=fs.readFileSync(file,'utf8');
// Remove the duplicate declaration I just introduced; the original one stays.
const dup = "const completion = read('app/src/main/java/cn/qingheng/health/ChatCompletion.java');\nconst completionText = completion;";
const n=t.split(dup).length-1;
if(n>1){ t=t.replace(dup+'\n',''); }
t=t.replace('completionText.includes','completion.includes');
fs.writeFileSync(file,t);
console.log('duplicate declaration count now', (t.split("const completion = read(").length-1));
