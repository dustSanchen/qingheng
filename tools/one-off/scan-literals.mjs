import fs from 'node:fs';
const css = fs.readFileSync('app/src/main/assets/styles.css','utf8');
const fw = [...css.matchAll(/font-weight:\s*(\d{3})/g)].map(m=>m[1]);
const tally = fw.reduce((a,v)=>(a[v]=(a[v]||0)+1,a),{});
console.log('font-weight literal tally:', JSON.stringify(tally));
const dur = [...css.matchAll(/(?:transition|animation)(?::|)[^;}]*?(\.\d+s|\d+\.?\d*s)/g)].map(m=>m[1]);
console.log('dur samples:', [...new Set(dur)].slice(0,12).join(' '));
// tab bar/z-index
for (const k of ['.tab-bar{','.app-header{','body{']) {
  const i = css.indexOf(k);
  if (i>=0) console.log(k, css.slice(i, i+240).replace(/\s+/g,' ').slice(0,240));
}
