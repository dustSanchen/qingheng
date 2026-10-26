import fs from 'node:fs';
let t = fs.readFileSync('tests/layout-four.test.mjs','utf8');
t = t.replace("check('trends get a segment bar', app.includes(\"bar.id = 'trends-tabs'\"));",
              "check('trends get a segment bar', app.includes(\"bar.id = 'trends-tabs'\"));\ncheck('the trends bar is inserted inside its view', app.includes(\"if (heading) heading.after(bar); else view.prepend(bar);\"));");
fs.writeFileSync('tests/layout-four.test.mjs', t);
console.log('assertion added');
