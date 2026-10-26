import fs from 'node:fs';
const t = fs.readFileSync('app/src/fragments/70-rest.fragment.js','utf8');
const i = t.indexOf('function installChatChips');
console.log(t.slice(i, i + 1100));
