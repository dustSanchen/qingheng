import fs from 'node:fs';
const f='tests/stream-bubble.test.mjs';
let t=fs.readFileSync(f,'utf8');
t=t.replace("  constructor(tag) {\n    this.tag = tag;", "  constructor(tag, className) {\n    this.tag = tag;\n    this.className = className || '';");
t=t.replace("    this.className = '';\n    this.attrs = {};", "    this.attrs = {};");
fs.writeFileSync(f,t);
console.log('fake element now keeps its class name');
