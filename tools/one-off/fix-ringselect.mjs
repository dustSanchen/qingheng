import fs from 'node:fs';
const p = 'D:/AI/health-android/app/src/main/assets/styles.css';
let css = fs.readFileSync(p, 'utf8');
const before = css;
css = css.replace('--ring-select:0 0 0 2px var(--ring-select)', '--ring-select:0 0 0 2px #44755d22');
fs.writeFileSync(p, css);
console.log('fixed ring-select:', before !== css);
const self = [...css.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;}]+)/g)].filter(m => [...m[2].matchAll(/var\((--[a-z0-9-]+)/g)].some(r => r[1] === m[1]));
console.log('self-ref left:', self.length);
