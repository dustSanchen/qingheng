import fs from 'node:fs';
const t = fs.readFileSync('app/src/main/assets/app.js','utf8');
console.log('skinForPage:', t.includes('function skinForPage'));
console.log('auto option:', fs.readFileSync('app/src/main/assets/index.html','utf8').includes('data-skin-pick="auto"'));
console.log('tab hook:', t.includes("document.documentElement.dataset.tab = tab"));
