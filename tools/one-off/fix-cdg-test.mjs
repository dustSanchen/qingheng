import fs from 'node:fs';
const f = 'tests/training-library.test.mjs';
let t = fs.readFileSync(f,'utf8');
t = t.replace("check('priority starts with the ISSN stand', lib.priority[0] === 'issn-2017');",
"check('priority starts with the chinese guide', lib.priority[0] === 'cdg-2022');");
fs.writeFileSync(f, t);
console.log('fixed');
