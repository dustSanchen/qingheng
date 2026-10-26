import fs from 'node:fs';
let css = fs.readFileSync('app/src/main/assets/styles.css','utf8');
if (!css.includes('.diet-audit{')) {
  css += `
/* Diet audit: two or three plain lines above the bars, no extra card. */
.diet-audit{margin:0 0 10px;padding:8px 10px;border-radius:10px;background:#f6f8f3}
.diet-audit p{margin:2px 0;font-size:12px;color:var(--muted)}
.diet-audit p:first-child{color:var(--ink)}
`;
  fs.writeFileSync('app/src/main/assets/styles.css', css);
  console.log('ok  diet-audit styles');
}
