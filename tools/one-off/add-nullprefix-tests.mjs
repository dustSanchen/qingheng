import fs from 'node:fs';
const file='tests/chat-quality.test.mjs';
let t=fs.readFileSync(file,'utf8');
const add = [
"check('a leading null run is recognised', completion.includes('public static boolean hasNullPrefix(String value)') && completion.includes('return run >= 3;'));",
"check('the real broken shape is matched (nulls then the reference list)', completion.includes('the app') && completion.includes('then appended its own reference list'));",
"check('the repair uses the shape audit', main.includes('String shape = ChatCompletion.shape(answer);') && main.includes('if (shape.equals(\"text\")) continue;'));",
"check('the page guard checks the leading run', /const answer = \\/\\^\\(\\?:\\[\\\\s/.test(app) && app.includes('null){3,}/i.test(raw)'));"
].join('\n') + '\n';
const anchor = "check('already-saved null answers are repaired'";
t = t.replace(anchor, add + anchor);
fs.writeFileSync(file, t);
console.log('added null-prefix assertions');
