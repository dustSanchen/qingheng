import fs from 'node:fs';
const css = fs.readFileSync('D:/AI/health-android/app/src/main/assets/styles.css','utf8');
const self = [...css.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;}]+)/g)].filter(m => [...m[2].matchAll(/var\((--[a-z0-9-]+)/g)].some(r => r[1] === m[1]));
for (const s of self) {
  const i = css.indexOf(s[0]);
  console.log('SELF:', s[0].trim().slice(0,120));
  console.log('ctx:', css.slice(Math.max(0,i-120), i+120).replace(/\s+/g,' '));
}
