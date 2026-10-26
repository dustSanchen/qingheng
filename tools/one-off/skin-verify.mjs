import fs from 'node:fs';
const t = fs.readFileSync('app/src/main/assets/app.js','utf8');
console.log('applySkin defined:', t.includes('function applySkin'));
console.log('boot call:', t.includes('installSkinPicker();'));
console.log('ledger skin:', fs.readFileSync('app/src/main/assets/styles.css','utf8').includes('[data-skin="ledger"]'));
console.log('picker markup:', fs.readFileSync('app/src/main/assets/index.html','utf8').includes('data-skin-pick'));
