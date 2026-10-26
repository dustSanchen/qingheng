import fs from 'node:fs';
let t=fs.readFileSync('app/src/main/java/cn/qingheng/health/MainActivity.java','utf8');
// The two internal methods keep their bodies but stop being the published names.
const pairs=[['    private JSONObject backupStatus() throws Exception {','    private JSONObject backupStatusInternal() throws Exception {'],
             ['    private JSONObject storedAnchors() throws Exception {','    private JSONObject storedAnchorsInternal() throws Exception {']];
for(const [from,to] of pairs){
  const count=t.split(from).length-1;
  if(count!==1) throw new Error(`anchor ${from.trim()} found ${count}`);
  t=t.replace(from,to);
}
// All remaining internal callers point at the renamed methods.
t=t.split('backupStatus()').join('backupStatusInternal()').split('storedAnchors()').join('storedAnchorsInternal()');
// The interface declarations we just wrote must keep their published names.
t=t.replace('@Override public JSONObject backupStatus() throws Exception { return backupStatusInternal(); }','@Override public JSONObject backupStatus() throws Exception { return backupStatusInternal(); }');
fs.writeFileSync('app/src/main/java/cn/qingheng/health/MainActivity.java', t);
console.log('renamed internals');
