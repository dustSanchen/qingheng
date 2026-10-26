import fs from 'node:fs';
const f='tests/lean-targets.test.mjs';
let t=fs.readFileSync(f,'utf8');
t=t.replace("read('app/src/fragments/70-rest.fragment.js')", "fs.readFileSync('app/src/fragments/70-rest.fragment.js', 'utf8')");
fs.writeFileSync(f,t);
console.log('used fs directly:', t.includes("fs.readFileSync('app/src/fragments/70-rest.fragment.js'"));
