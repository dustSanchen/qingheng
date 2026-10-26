const hex2rgb = h => [1,3,5].map(i => parseInt(h.slice(i, i+2), 16));
const srgb2lin = v => { const s = v/255; return s <= .04045 ? s/12.92 : Math.pow((s+.055)/1.055, 2.4); };
const rgb2xyz = ([r,g,b]) => { const R=srgb2lin(r),G=srgb2lin(g),B=srgb2lin(b); return [R*.4124+G*.3576+B*.1805, R*.2126+G*.7152+B*.0722, R*.0193+G*.1192+B*.9505]; };
const xyz2lab = ([x,y,z]) => { const f = t => t > .008856 ? Math.cbrt(t) : 7.787*t + 16/116; const X=f(x/0.95047),Y=f(y),Z=f(z/1.08883); return [116*Y-16,500*(X-Y),200*(Y-Z)]; };
const lab = h => xyz2lab(rgb2xyz(hex2rgb(h)));
const dE = (a,b) => { const [l1,a1,b1]=lab(a),[l2,a2,b2]=lab(b); return Math.sqrt((l1-l2)**2+(a1-a2)**2+(b1-b2)**2).toFixed(2); };
const pairs = [
  ['皮肤间画布', '#f7f4ec', '#f2f5f7'],
  ['paper 卡 vs 画布', '#fffdf7', '#f7f4ec'],
  ['ledger 卡 vs 画布', '#ffffff', '#f2f5f7'],
];
for (const [l,a,b] of pairs) console.log(l.padEnd(20), 'dE=' + dE(a,b));
