import fs from 'node:fs';
const css = fs.readFileSync('app/src/main/assets/styles.css','utf8');
const body = css.match(/--body-text\s*:\s*(#[0-9a-fA-F]{6})/);
console.log('body token present:', !!body, body && body[1]);
console.log(css.split(/\r?\n/).slice(0, 22).join('\n'));
