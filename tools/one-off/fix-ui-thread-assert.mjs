import fs from 'node:fs';
const file='tests/chat-streaming.test.mjs';
let lines=fs.readFileSync(file,'utf8').split('\n');
const i=lines.findIndex(l => l.includes('WebView access stays on the UI thread'));
if(i<0) throw new Error('not found');
lines[i] = "check('WebView access stays on the UI thread', /runOnUiThread\\(\\(\\) -> \\{[\\s\\S]{0,400}?web\\.evaluateJavascript\\(/.test(main));";
fs.writeFileSync(file, lines.join('\n'));
console.log('rewrote:', lines[i].slice(0, 90));
