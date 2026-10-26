import fs from 'node:fs';
let t = fs.readFileSync('tools/one-off/chat-history.mjs','utf8');
t = t.replace("import { patch } from '../lib/patch.mjs';", "import fs from 'node:fs';\nimport { patch } from '../lib/patch.mjs';");
t = t.replace("let css = require('node:fs').readFileSync('app/src/main/assets/styles.css', 'utf8');", "let css = fs.readFileSync('app/src/main/assets/styles.css', 'utf8');");
t = t.replace("  require('node:fs').writeFileSync('app/src/main/assets/styles.css', css);", "  fs.writeFileSync('app/src/main/assets/styles.css', css);");
fs.writeFileSync('tools/one-off/chat-history.mjs', t);
console.log('imports fixed');
