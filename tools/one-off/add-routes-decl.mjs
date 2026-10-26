import fs from 'node:fs';
const decl = "const routes = fs.readFileSync('app/src/main/java/cn/qingheng/health/bridge/MetaRoutes.java', 'utf8');";
const declRead = "const routes = read('app/src/main/java/cn/qingheng/health/bridge/MetaRoutes.java');";
let ci=fs.readFileSync('tests/ci-and-versions.test.mjs','utf8');
if(!ci.includes(declRead)){
  const anchor="const prompts = read('app/src/main/java/cn/qingheng/health/ai/Prompts.java');";
  if(ci.split(anchor).length-1!==1) throw new Error('ci anchor missing');
  ci=ci.replace(anchor, anchor+"\n"+declRead);
  fs.writeFileSync('tests/ci-and-versions.test.mjs', ci);
  console.log('added routes declaration to ci-and-versions');
}
let ob=fs.readFileSync('tests/onboarding-backup.test.mjs','utf8');
if(!ob.includes(decl)){
  const anchor="const main = fs.readFileSync('app/src/main/java/cn/qingheng/health/MainActivity.java', 'utf8');";
  if(ob.split(anchor).length-1!==1) throw new Error('onboarding anchor missing');
  ob=ob.replace(anchor, anchor+"\n"+decl);
  fs.writeFileSync('tests/onboarding-backup.test.mjs', ob);
  console.log('added routes declaration to onboarding-backup');
}
