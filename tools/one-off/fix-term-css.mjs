import fs from 'node:fs';
const f = 'app/src/main/assets/styles.css';
let css = fs.readFileSync(f, 'utf8');
const from = '.term{display:inline;padding:0;border:0;background:transparent;color:inherit;font:inherit;border-bottom:1px dashed var(--muted);cursor:pointer}';
const to = '.term{display:inline;padding:0;border:0;background:transparent;color:inherit;font:inherit;cursor:pointer;text-decoration:underline dotted var(--muted);text-underline-offset:3px;text-decoration-thickness:1px}';
if (!css.includes(from)) { console.log('MISS term rule'); } else { css = css.replace(from, to); console.log('ok  term underline'); }
const after = '.term::after{content:"?";font-size:.75em;vertical-align:super;color:var(--muted);margin-left:1px}';
if (css.includes(after)) { css = css.replace(after, ''); console.log('ok  removed ? mark'); }
fs.writeFileSync(f, css);
