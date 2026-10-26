import fs from 'node:fs';
const f = 'app/src/fragments/00-head.fragment.js';
let t = fs.readFileSync(f, 'utf8');
const from = [
  '  function annotateTerms(html) {',
  '    let out = String(html || "");',
  '    for (const term of Object.keys(TERMS)) {',
  '      const token = ">" + term + "<";',
  '      if (!out.includes(token)) continue;',
  '      out = out.replace(token, "><button type=\\"button\\" class=\\"term\\" data-term=\\"" + term + "\\">" + term + "</button><");',
  '    }',
  '    return out;',
  '  }'
].join('\n');
const to = [
  '  function annotateTerms(html) {',
  '    let out = String(html || "");',
  '    for (const term of Object.keys(TERMS)) {',
  '      if (out.includes("data-term=\\"" + term + "\\"")) continue;',
  '      const safe = term.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&");',
  '      const re = new RegExp("(?<![A-Za-z0-9-])" + safe + "(?![A-Za-z0-9-])");',
  '      if (!re.test(out)) continue;',
  '      out = out.replace(re, "<button type=\\"button\\" class=\\"term\\" data-term=\\"" + term + "\\">" + term + "</button>");',
  '    }',
  '    return out;',
  '  }'
].join('\n');
if (!t.includes(from)) { console.log('MISS annotate block'); process.exit(1); }
fs.writeFileSync(f, t.replace(from, to));
console.log('annotateTerms upgraded');
