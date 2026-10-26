import fs from 'node:fs';
const f='tests/stream-bubble.test.mjs';
let t=fs.readFileSync(f,'utf8');
t=t.replace('const CLASS_RE = /class="([^"]+)"/g;', 'const CLASS_RE = /class="([^"]+)"([^>]*)>/g;');
t=t.replace("    for (const match of value.matchAll(CLASS_RE)) this.children.push(new El('span', match[1]));",
            "    for (const match of value.matchAll(CLASS_RE)) {\n      const child = new El('span', match[1]);\n      // A browser honours a bare `hidden` attribute; the fake DOM must too or the test lies.\n      if (/\\bhidden\\b/.test(match[2] || '')) child.hidden = true;\n      this.children.push(child);\n    }");
fs.writeFileSync(f,t);
console.log('fake DOM now parses the hidden attribute');
