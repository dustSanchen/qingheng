import fs from 'node:fs';
const p = 'app/src/main/java/cn/qingheng/health/ChatCompletion.java';
const t = fs.readFileSync(p, 'utf8');
const i = t.indexOf('max_tokens');
console.log('max_tokens at', i);
console.log(t.slice(Math.max(0, i - 600), i + 300));
console.log('=== signatures ===');
for (const m of t.matchAll(/public static [^\n{]+/g)) console.log(m[0].trim());
