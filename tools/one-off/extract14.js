const fs=require('fs');
const html=fs.readFileSync('app/src/main/assets/index.html','utf8');
const keys=['手动','添加餐食','餐食','id="view-records"'];
for(const k of ['id="view-records"']){
  const i=html.indexOf(k);
  console.log(JSON.stringify(html.slice(i, i+700)));
}
