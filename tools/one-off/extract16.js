const fs=require('fs');
const t=fs.readFileSync('app/src/main/assets/app.js','utf8');
const i=t.indexOf("loadStorageStatus(false).catch");
console.log(JSON.stringify(t.slice(i-120, i+60)));
