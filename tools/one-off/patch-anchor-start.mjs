import fs from 'node:fs';
let t=fs.readFileSync('app/src/main/assets/app.js','utf8');
const from='  switchTab(restoreTab());render();connection();';
if(t.split(from).length-1!==1) throw new Error('anchor missing');
t=t.replace(from, from+'syncAnchors().catch(()=>{});');
fs.writeFileSync('app/src/main/assets/app.js', t);
console.log('startup syncAnchors wired');
