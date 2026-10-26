import fs from 'node:fs';
const css = fs.readFileSync('D:/AI/health-android/app/src/main/assets/styles.css','utf8');
const before = fs.readFileSync('D:/AI/health-android/build/styles.before-tokens.css','utf8');
const decl = new Set([...css.matchAll(/(^|[{;\s])(--[a-z0-9-]+):/gm)].map(m => m[2]));
const hexNow = (css.match(/#[0-9a-fA-F]{3,8}\b/g) || []).length;
const hexBefore = (before.match(/#[0-9a-fA-F]{3,8}\b/g) || []).length;
const varUsage = (css.match(/var\(/g) || []).length;
console.log('tokens declared:', decl.size);
console.log('hex before -> now:', hexBefore, '->', hexNow);
console.log('var() usages:', varUsage);
for (const t of ['--icon-xl','--dur-slow','--dur-pulse','--ease-out','--fw-display','--tracking-caps','--space-0','--accent-line','--accent-deep','--ring-select']) {
  console.log(t.padEnd(20), decl.has(t));
}
