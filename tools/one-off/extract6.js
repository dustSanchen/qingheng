const fs=require('fs');
const t=fs.readFileSync('app/src/main/assets/app.js','utf8');
const i=t.indexOf("await api('/api/chat'");
console.log(JSON.stringify(t.slice(i-20, i+230)));
