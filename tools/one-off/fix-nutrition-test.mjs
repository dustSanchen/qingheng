import fs from 'node:fs';
let t = fs.readFileSync('tests/nutrition-math.test.mjs','utf8');
t = t.replace("const lines = Object.fromEntries(out.trim().split('\\n').map(line => line.split('=')).map(([key, value]) => [key, value]));",
              "const lines = Object.fromEntries(out.trim().split(/\\r?\\n/).map(line => line.trim().split('=')).map(([key, value]) => [key, value]));");
fs.writeFileSync('tests/nutrition-math.test.mjs', t);
console.log('parser normalised');
