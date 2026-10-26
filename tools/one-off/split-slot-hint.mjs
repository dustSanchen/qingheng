import fs from 'node:fs';
const f = 'app/src/fragments/00-head.fragment.js';
let t = fs.readFileSync(f, 'utf8');
const from = [
  '    node.textContent = "现在 " + clock + " · " + slot.label + "：" + slot.hint + suffix;',
].join('\n');
const to = [
  '    const timeNode = $("#slot-time"), textNode = $("#slot-text");',
  '    if (timeNode) timeNode.textContent = clock;',
  '    if (textNode) textNode.textContent = slot.label + "：" + slot.hint + suffix;'
].join('\n');
if (!t.includes(from)) { console.log('MISS hint render'); process.exit(1); }
fs.writeFileSync(f, t.replace(from, to));
console.log('hint render split into time + text');
