import fs from 'node:fs';
const t = fs.readFileSync('app/src/fragments/70-rest.fragment.js','utf8');
const start = t.indexOf('// ---- Training draft from a chat message');
const end = t.indexOf("$('#global-notice-close')", start);
console.log(t.slice(start, end + 40));
