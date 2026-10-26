import fs from 'node:fs';
const html = fs.readFileSync('app/src/main/assets/index.html','utf8');
const i = html.search(/<nav[\s>]/);
console.log('nav markup:', i>=0 ? html.slice(i, i+160).replace(/\s+/g,' ') : 'no <nav>');
const css = fs.readFileSync('app/src/main/assets/styles.css','utf8');
for (const k of ['.tab-bar','.tabbar','nav.tabs','.bottom-nav']) console.log(k, 'in css:', css.includes(k), '| in html:', html.includes(k.replace('.','')));
const rest = [...css.matchAll(/letter-spacing:\s*(?!var\()[^;}]+/g)].map(m=>m[0].trim());
console.log('残留:', [...new Set(rest)].join(' | '));
