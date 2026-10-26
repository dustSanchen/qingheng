import fs from 'node:fs';

const f = 'app/src/main/assets/styles.css';
let css = fs.readFileSync(f, 'utf8');
if (!css.includes('.energy-detail{display:flex')) {
  css += [
    '',
    '/* 能量卡的两个按钮：拉开间距，避免贴在一起。 */',
    '.energy-detail{display:flex;flex-direction:column;align-items:flex-start;gap:var(--space-2)}',
    '.energy-detail p{margin:0}',
    '.energy-detail .button{margin-top:0}',
    '.energy-detail .button.primary{margin-top:var(--space-2)}'
  ].join('\n') + '\n';
  fs.writeFileSync(f, css);
  console.log('appended');
} else {
  console.log('already present');
}
console.log('check:', fs.readFileSync(f, 'utf8').includes('.energy-detail{display:flex'));
