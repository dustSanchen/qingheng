const fs=require('fs');
const html=fs.readFileSync('app/src/main/assets/index.html','utf8');
const keys=['onboarding','ob-next','ob-finish','ob-result','data-step','onboarding-step'];
for(const k of keys){const i=html.indexOf(k);console.log(k,'->',i);}
const i=html.indexOf('ob-goals');
if(i>0) console.log(JSON.stringify(html.slice(i-1500, i+300)));
