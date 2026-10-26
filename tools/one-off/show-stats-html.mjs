import fs from 'node:fs';
const t = fs.readFileSync('app/src/fragments/10-rich-answer.fragment.js','utf8');
const i = t.indexOf("$('#trend-stats').innerHTML");
console.log(JSON.stringify(t.slice(i, i + 620)));
