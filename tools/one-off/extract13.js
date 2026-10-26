const fs=require('fs');
const html=fs.readFileSync('app/src/main/assets/index.html','utf8');
for(const k of ['今日能量','手动添加餐食','记录一餐']){
  const i=html.indexOf(k);
  console.log(k,'->',i, i>0? JSON.stringify(html.slice(i-70,i+40)) : '');
}
