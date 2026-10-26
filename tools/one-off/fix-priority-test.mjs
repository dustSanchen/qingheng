import fs from 'node:fs';
const f = 'tests/training-library.test.mjs';
let t = fs.readFileSync(f,'utf8');
t = t.replace("check('priority starts with the 3-split source', lib.priority[0] === 'ksw-tcy-3split');",
"check('priority starts with the transcript source', lib.priority[0] === 'asr-transcript');");
fs.writeFileSync(f, t);
console.log('assertion updated');
