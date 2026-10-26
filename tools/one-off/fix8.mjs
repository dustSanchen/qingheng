import fs from 'node:fs';
let t=fs.readFileSync('tools/one-off/patch-step8-java.mjs','utf8');
// The anchors must stay RegExp objects; .source turned them into plain strings.
const before=(t.match(/\.source,/g)||[]).length;
t=t.replace(/\.source,/g, ',');
fs.writeFileSync('tools/one-off/patch-step8-java.mjs', t);
console.log('removed .source from', before, 'anchors');
