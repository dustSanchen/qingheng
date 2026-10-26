import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const root='app/src/main/';
const app=fs.readFileSync(root+'assets/app.js','utf8');
const html=fs.readFileSync(root+'assets/index.html','utf8');
const java=fs.readFileSync(root+'java/cn/qingheng/health/MainActivity.java','utf8');
const http=fs.readFileSync(root+'java/cn/qingheng/health/ChatCompletion.java','utf8');
const store=fs.readFileSync(root+'java/cn/qingheng/health/SecretStore.java','utf8');
assert(html.indexOf('food-models.js')<html.indexOf('native-adapter.js'));
// Web assets must stay flat: aapt2 on Windows writes sub-directory entries with a backslash,
// which Android's AssetManager cannot resolve, so nested assets silently 404 at runtime.
const assetDirs=fs.readdirSync(root+'assets',{withFileTypes:true}).filter(e=>e.isDirectory());
assert.deepEqual(assetDirs.map(e=>e.name),[],'assets/ must not contain sub-directories');
for(const name of ['camera','gallery']){
 const svg=fs.readFileSync(root+'assets/icon-'+name+'.svg','utf8');
 assert(svg.includes('stroke="#44755d"')&&svg.includes('rx="14"'));
 assert(!svg.includes('<script')&&!svg.includes('http://',svg.indexOf('>')));
 assert(html.includes('./icon-'+name+'.svg'),name+' icon is referenced by its flat path');
}
assert(!html.includes('./icons/'),'no nested asset references remain');
assert(html.includes('id="connection-check"'));
assert(app.includes("api('/api/connection-check',{allowExternal:true})"));
assert(http.includes('conn.setRequestMethod("GET")'));
assert(http.includes('conn.setInstanceFollowRedirects(false)'));
const diag=http.slice(http.indexOf('public static JSONObject checkConnection'),http.indexOf('private static void checkStatus'));
assert(!diag.includes('messages')&&!diag.includes('apiKey'));
for(const status of [401,403,402,429,404])assert(http.includes('code == '+status));
// A pasted "Bearer " prefix is now stripped by the shared Unicode-safe sanitizer.
assert(java.includes('SecretStore.sanitize(patch.getString("apiKey"))'));
assert(store.includes('regionMatches(true, 0, "Bearer", 0, 6)'));
assert(java.includes('c.optString("provider", provider())'),'key provider snapshot matches request config');
// Exercise real adapter local estimate with shared food library loaded.
const adapter=fs.readFileSync(root+'assets/native-adapter.js','utf8');
const food=fs.readFileSync(root+'assets/food-models.js','utf8');
const context=vm.createContext({window:{},globalThis:{},JSON,Date,Number,Math,sequence:0});
vm.runInContext(food,context);
const start=adapter.indexOf('  const foods = [');
const end=adapter.indexOf('  const numeric=',start);
vm.runInContext(adapter.slice(start,end)+';globalThis.localEstimate=localEstimate;',context);
const result=context.globalThis.localEstimate({text:'番茄炒蛋 200g、米饭 150g'});
assert.equal(result.items.length,2);
assert.equal(result.items[0].model.includesOil,true);
assert.equal(result.totals.calories,result.items.reduce((sum,row)=>sum+row.calories,0));
assert.throws(()=>context.globalThis.localEstimate({text:'不知道什么菜 100g'}));
assert.throws(()=>context.globalThis.localEstimate({text:'米饭 100g',image:'data:image/jpeg;base64,AA=='}),'offline does not pretend to see photos');
assert(adapter.includes('window.QinghengFoods.calibrateDraft(result)'));
assert(app.includes("$('#calibrate-foods').addEventListener"));
console.log('PASS auth/food integration: status separation, consent, key scope, icons, food local estimates and image calibration');
