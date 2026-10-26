import fs from 'node:fs';
let t=fs.readFileSync('app/src/main/java/cn/qingheng/health/MainActivity.java','utf8');
const fixes=[['@Override public JSONObject backupStatusInternal() throws Exception { return backupStatusInternal(); }','@Override public JSONObject backupStatus() throws Exception { return backupStatusInternal(); }'],
             ['@Override public JSONObject storedAnchorsInternal() throws Exception { return storedAnchorsInternal(); }','@Override public JSONObject storedAnchors() throws Exception { return storedAnchorsInternal(); }']];
for(const [from,to] of fixes){
  const count=t.split(from).length-1;
  if(count!==1) throw new Error(`override anchor found ${count}: ${from.slice(0,60)}`);
  t=t.replace(from,to);
}
fs.writeFileSync('app/src/main/java/cn/qingheng/health/MainActivity.java', t);
console.log('overrides restored');
