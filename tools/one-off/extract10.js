const fs=require('fs');
const html=fs.readFileSync('app/src/main/assets/index.html','utf8');
for(const k of ['导入会按日期或记录 ID 合并','onboarding-actions','</section>\r\n\r\n    <div class="onboarding-actions"']){
  console.log(k, '->', html.split(k).length-1);
}
const i=html.indexOf('导入会按日期或记录 ID 合并');
if(i>0) console.log(JSON.stringify(html.slice(i-200, i+260)));
