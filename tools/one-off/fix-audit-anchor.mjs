import fs from 'node:fs';
let t = fs.readFileSync('tools/one-off/diet-audit.mjs','utf8');
t = t.replace("'  /** The library, if present. Everything here degrades gracefully without it. */',", "'  /** The local library, if present. Everything here degrades gracefully without it. */',");
t = t.replace("   '  /** The library, if present. Everything here degrades gracefully without it. */',", "   '  /** The local library, if present. Everything here degrades gracefully without it. */',");
fs.writeFileSync('tools/one-off/diet-audit.mjs', t);
console.log('anchor fixed:', t.includes('The local library'));
