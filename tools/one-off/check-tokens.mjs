import fs from 'node:fs';
const css = fs.readFileSync('D:/AI/health-android/app/src/main/assets/styles.css','utf8');
const lines = css.split(/\r?\n/);
console.log('total lines:', lines.length);
for (const t of ['--icon-sm','--dur-fast','--fw-medium','--tracking-label','--space-5','--elev-2','--shadow-rgb','--ink-soft','--accent-soft','--accent-line','--on-accent','--overlay','--line-strong','--ring-focus-color','--tone-protein','--macro-protein','--accent-press','--shape-card-radius','--body-leading','--card-pad']) {
  console.log(t.padEnd(22), css.includes(t + ':'));
}
