import fs from 'node:fs';
const css = fs.readFileSync('D:/AI/health-android/app/src/main/assets/styles.css','utf8');
const roots = [...css.matchAll(/^\s*--[a-z0-9-]+:[^;]+;/gmi)].map(m => m[0].trim());
const wanted = ['--muted','--ink-soft','--ring-focus-color','--line-strong','--warn','--accent-press','--tone-water','--tone-tip','--tone-neutral','--overlay','--overlay-weak','--accent-line','--accent-soft','--on-accent','--elev-','--dur-','--fw-','--tracking-','--space-','--icon-'];
for (const line of roots) {
  if (wanted.some(w => line.startsWith(w))) console.log(line);
}
