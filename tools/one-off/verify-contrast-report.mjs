const lum = hex => { const n = parseInt(hex.slice(1),16); const c=[(n>>16)&255,(n>>8)&255,n&255].map(v=>{const s=v/255;return s<=.03928?s/12.92:Math.pow((s+.055)/1.055,2.4)}); return .2126*c[0]+.7152*c[1]+.0722*c[2]; };
const ratio = (a,b) => { const [x,y]=[lum(a),lum(b)].sort((m,n)=>n-m); return ((x+.05)/(y+.05)).toFixed(2); };
const paper = '#faf9f5';
for (const c of ['#141413','#3d3d3a','#5e5d59','#87867f','#d97757','#6c6a64']) console.log(c, 'on paper:', ratio(c, paper));
console.log('--- our app ---');
for (const c of ['#141413','#3d3d3a','#6c6a64']) console.log(c, 'on #faf9f5:', ratio(c, '#faf9f5'));
