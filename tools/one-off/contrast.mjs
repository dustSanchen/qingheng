import fs from 'node:fs';
const apk = 'dist/qingheng-1.0.65.apk';
console.log('apk exists:', fs.existsSync(apk), fs.existsSync(apk) ? Math.round(fs.statSync(apk).size/1024) + ' KB' : '');
const css = fs.readFileSync('app/src/main/assets/styles.css','utf8');
const get = name => (css.match(new RegExp(name + '\\s*:\\s*(#[0-9a-fA-F]{6})')) || [])[1];
const lum = hex => {
  const n = parseInt(hex.slice(1), 16);
  const rgb = [(n>>16)&255, (n>>8)&255, n&255].map(v => { const s = v/255; return s <= .03928 ? s/12.92 : Math.pow((s+.055)/1.055, 2.4); });
  return .2126*rgb[0] + .7152*rgb[1] + .0722*rgb[2];
};
const ratio = (a,b) => { const [x,y] = [lum(a), lum(b)].sort((m,n)=>n-m); return ((x+.05)/(y+.05)).toFixed(2); };
const ink = get('--ink'), paper = get('--paper'), surface = get('--surface'), muted = get('--muted'), line = get('--line');
console.log('tokens:', {ink, paper, surface, muted, line});
console.log('ink on paper:', ratio(ink, paper), '(AA needs 4.5)');
console.log('ink on card:', ratio(ink, surface), '(AA needs 4.5)');
console.log('muted on paper:', ratio(muted, paper), '(AA needs 4.5 for body, 3 for large)');
console.log('line on paper:', ratio(line, paper), '(decorative)');
console.log('serif titles:', css.includes('--font-display'));
console.log('warm hairline:', css.includes('0 1px 0 rgba(30,30,26,.035)'));
