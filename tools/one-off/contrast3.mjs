import fs from 'node:fs';
const css = fs.readFileSync('app/src/main/assets/styles.css','utf8');
const get = n => (css.match(new RegExp(n + '\\s*:\\s*(#[0-9a-fA-F]{6})')) || [])[1];
const lum = hex => { const n = parseInt(hex.slice(1),16); const c=[(n>>16)&255,(n>>8)&255,n&255].map(v=>{const s=v/255;return s<=.03928?s/12.92:Math.pow((s+.055)/1.055,2.4)}); return .2126*c[0]+.7152*c[1]+.0722*c[2]; };
const ratio = (a,b) => { const [x,y]=[lum(a),lum(b)].sort((m,n)=>n-m); return ((x+.05)/(y+.05)).toFixed(2); };
const ink=get('--ink'), body=get('--body-text'), muted=get('--muted'), paper=get('--paper'), surface=get('--surface'), soft=get('--surface-soft');
console.log('tokens:', {ink, body, muted, paper, surface, soft});
console.log('ink/paper', ratio(ink,paper), '| body/paper', ratio(body,paper), '| muted/paper', ratio(muted,paper), '| ink/card', ratio(ink,surface), '| ink/soft', ratio(ink,soft));
