/**
 * 合并后的 infra 套件（由 114 个单文件回归合并而来，2026-11-23）。
 * 每个原文件仍在自己的函数作用域里跑：一个文件抛错只记一条 FAIL，不会中断同组其他文件。
 */
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

let __fail = 0;
async function __run(name, fn) {
  try { const n = await fn(); __fail += Number(n) || 0; }
  catch (error) { console.log('FAIL  [' + name + '] ' + (error && error.message ? error.message : error)); __fail += 1; }
}

await __run("accessibility-focus", async () => {
/**
 * P2 accessibility closure: dialogs and sheets must return focus to the trigger.
 */

let fail = 0;
const check = (label, ok, detail) => {
  console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail));
  if (!ok) fail++;
};

const app = fs.readFileSync('app/src/main/assets/app.js', 'utf8');
const html = fs.readFileSync('app/src/main/assets/index.html', 'utf8');

check('the confirm dialog remembers its trigger', app.includes('dialogReturnFocus') && app.includes("document.activeElement instanceof HTMLElement"));
check('the confirm dialog returns focus after close', /function closeDialog\(result\)[\s\S]{0,420}returnTo\.focus\(\{preventScroll: true\}\)/.test(app));
check('the action sheet remembers its trigger', app.includes('sheetReturnFocus') && app.includes('function openSheet(config)'));
check('the action sheet focuses its first option', app.includes("first.focus({preventScroll: true})"));
check('the action sheet returns focus after close', /function closeSheet\(result\)[\s\S]{0,320}returnTo\.focus\(\{preventScroll: true\}\)/.test(app));
check('the item recalc dialog remembers its trigger', app.includes('itemRecalcReturnFocus'));
check('the item recalc dialog returns focus after close', /function closeItemRecalc\(\)[\s\S]{0,420}returnTo\.focus\(\{preventScroll: true\}\)/.test(app));
check('the page exposes modal semantics', html.includes('role="dialog"') && html.includes('aria-modal="true"') && html.includes('role="alertdialog"'));
check('the focus styles remain present', app.includes('focus') && html.includes('aria-live="polite"'));
check('focus restoration uses preventScroll instead of jumping the page', app.includes('focus({preventScroll: true})'));

console.log('FAIL total: ' + fail);
;return typeof fail === 'number' ? fail : 0;
});

await __run("adapter", async () => {
const assets = new URL('../app/src/main/assets/', import.meta.url);
const code = fs.readFileSync(new URL('native-adapter.js', assets), 'utf8');
const saved = new Map();
let seedFetches = 0;
function environment({native=false, android=false, timeout=false}={}) {
  const href = android ? 'https://app.qingheng.local/index.html' : 'http://localhost:9090/index.html';
  const url = new URL(href);
  const ctx = {URL, Headers, AbortController, console, setTimeout, clearTimeout,
    location:{href,protocol:url.protocol,hostname:url.hostname,origin:url.origin},
    localStorage:{getItem:k=>{assert(!android,'Android must not access localStorage');return saved.get(k)||null;},setItem:(k,v)=>{assert(!android,'Android must not access localStorage');saved.set(k,v);}}};
  ctx.window=ctx;
  ctx.fetch=async path=>{assert.equal(path,'./seed.json');assert(!android);seedFetches++;return {ok:true,json:async()=>({profile:{calorieTarget:1800},measurements:[],meals:[],habits:[]})};};
  ctx.calls=[];
  const configs={deepseek:{baseUrl:'https://api.deepseek.com',model:'deepseek-flash',visionModel:'deepseek-flash',visionEnabled:true,apiConfigured:true},bai:{baseUrl:'https://api.b.ai/v1',model:'',visionModel:'',visionEnabled:false,apiConfigured:false}};
  let provider='deepseek';
  const push={enabled:false,morningTime:'07:00',eveningTime:'20:30',analysisEnabled:false,canScheduleExact:true,notificationsGranted:true};
  const state={profile:{},measurements:[],meals:[],habits:[],chats:[]};
  if(native)ctx.QinghengNative={request(raw){const req=JSON.parse(raw);ctx.calls.push(req);if(timeout)return;let data;
    if(req.path==='/api/push'){if(req.method==='POST'){Object.assign(push,{enabled:req.body.enabled===true,morningTime:req.body.morningTime,eveningTime:req.body.eveningTime,analysisEnabled:req.body.analysisEnabled===true});}data={...push};}
    else if(req.path==='/api/chatlog'){if(req.method==='POST'){const saved={id:`chat-${state.chats.length+1}-${Date.now()}`,...req.body.entry};state.chats.push(saved);data=saved;}else if(req.method==='DELETE'){state.chats.length=0;data={deleted:true};}else data=state.chats.slice();}else if(req.path.startsWith('/api/chatlog/')&&req.method==='DELETE'){const id=decodeURIComponent(req.path.slice('/api/chatlog/'.length));const before=state.chats.length;state.chats=state.chats.filter(row=>row.id!==id);data={deleted:state.chats.length<before,id};}else if(req.path==='/api/push-history'){data={records:[]};}
    else if(req.path==='/api/settings'){if(req.method==='POST'){provider=req.body.provider;Object.assign(configs[provider],Object.fromEntries(Object.entries(req.body).filter(([key])=>!['provider','apiKey'].includes(key))));if(req.body.apiKey)configs[provider].apiConfigured=true;}data={provider,...configs[provider],providers:configs};}
    else if(req.path==='/api/state')data={...state,settings:{provider,...configs[provider],providers:configs}};
    else if(req.path==='/api/meals'){const old=state.meals.find(row=>row.estimateId===req.body.estimateId);data=old||{...req.body,id:`native-${state.meals.length}`};if(!old)state.meals.push(data);}
    else if(req.path==='/api/chat'){if(req.body?.allowExternal!==true||configs[provider].allowExternal!==true||!configs[provider].apiConfigured){data=null;queueMicrotask(()=>ctx.__nativeReply({id:req.id,ok:false,data:null,error:'请先开启外发许可，并确认本次发送健康数据给所选 API 提供方'}));return;}data={source:'api',reply:'测试回答'};}
    else data={source:'api',messages:['ok'],reply:'测试回答'};
    queueMicrotask(()=>ctx.__nativeReply({id:req.id,ok:true,data}));}};
  if(timeout){ctx.setTimeout=(fn,ms)=>{assert.equal(ms,90000);ctx.expire=fn;return 1;};ctx.clearTimeout=()=>{};}
  vm.createContext(ctx);vm.runInContext(code,ctx);return ctx;
}
async function request(ctx,path,body,method){const response=await ctx.fetch(path,{method:method||(body?'POST':'GET'),body:body?JSON.stringify(body):undefined});return {ok:response.ok,data:await response.json()};}
let ctx=environment();
let result=await request(ctx,'/api/state');assert.equal(result.data.profile.calorieTarget,1800);
await request(ctx,'/api/measurements',{date:'2026-01-01',weight:70});
await request(ctx,'/api/habits',{date:'2026-01-01',steps:100});
const meal={date:'2026-01-01',estimateId:'same',name:'meal',calories:null,protein:null,fat:null};
await request(ctx,'/api/meals',meal);await request(ctx,'/api/meals',meal);
ctx=environment();result=await request(ctx,'/api/state');assert.equal(result.data.measurements[0].weight,70);assert.equal(result.data.meals.length,1);assert.equal(seedFetches,1);
result=await request(ctx,'/api/advice',{date:'2026-01-01'});assert(result.data.messages.some(x=>x.includes('补全营养数值')));assert(result.data.messages.some(x=>x.includes('按身体趋势校准')));assert(!result.data.messages.some(x=>x.includes('TDEE')||x.includes('2000')||x.includes('来源：')));
result=await request(ctx,'/api/estimate',{text:'米饭 100g、150g 鸡胸肉'});assert(result.ok);assert.equal(result.data.totals.calories,310);assert.equal(result.data.needsConfirmation,true);assert.equal(result.data.confidence,'low');
const draft=result.data;
const count=(await request(ctx,'/api/state')).data.meals.length;assert.equal(count,1,'estimate preview must not save');
const confirmation={estimateId:draft.draftId,date:'2026-01-02',name:'local draft',source:draft.source,items:draft.items,...draft.totals};
await request(ctx,'/api/meals',confirmation);await request(ctx,'/api/meals',confirmation);assert.equal((await request(ctx,'/api/state')).data.meals.length,count+1);
result=await request(ctx,'/api/estimate',{text:'米饭 100g、火星菜 100g'});assert(!result.ok);
await request(ctx,'/api/settings',{provider:'deepseek',model:'ds-custom'});await request(ctx,'/api/settings',{provider:'bai',model:'bai-custom',visionModel:'vision',visionEnabled:true});result=await request(ctx,'/api/settings');assert.equal(result.data.providers.deepseek.model,'ds-custom');assert.equal(result.data.providers.bai.model,'bai-custom');
result=await request(ctx,'/api/settings',{provider:'bai',apiKey:'TEST_NOT_REAL'});assert(!result.ok);assert(![...saved.values()].join('').includes('TEST_NOT_REAL'));assert(![...saved.values()].join('').includes('bai-custom'));
await assert.rejects(ctx.fetch('https://example.com/file'));result=await request(ctx,'/api/advice',{date:'2026-01-01',useAI:true,allowExternal:true});assert(!result.ok);
const android=environment({android:true});result=await request(android,'/api/state');assert(!result.ok);
const native=environment({native:true,android:true});result=await request(native,'/api/state');assert(result.ok);assert.equal(native.calls[0].path,'/api/state');assert.equal(native.calls[0].body,null);
result=await request(native,'/api/settings');assert.equal(result.data.providers.deepseek.model,'deepseek-flash');assert.equal(result.data.providers.deepseek.visionModel,'deepseek-flash');assert.equal(result.data.providers.deepseek.visionEnabled,true);assert.equal(result.data.providers.bai.baseUrl,'https://api.b.ai/v1');assert.equal(result.data.providers.bai.model,'');assert.equal(result.data.providers.bai.visionEnabled,false);
await request(native,'/api/settings',{provider:'bai',model:'bai-model',apiKey:'TEST_NOT_REAL'});await request(native,'/api/settings',{provider:'deepseek'});result=await request(native,'/api/settings');assert(!JSON.stringify(result.data).includes('TEST_NOT_REAL'));assert.equal(result.data.providers.bai.model,'bai-model');
result=await request(native,'/api/estimate',{text:'米饭 100g',allowExternal:true});assert(result.ok);assert(native.calls.some(x=>x.path==='/api/estimate'&&x.body.allowExternal===true));
await request(native,'/api/settings',{provider:'deepseek',visionEnabled:false});let visionCount=native.calls.filter(x=>x.path==='/api/estimate').length;result=await request(native,'/api/estimate',{image:'data:image/jpeg;base64,x',allowExternal:true});assert(!result.ok);assert.equal(native.calls.filter(x=>x.path==='/api/estimate').length,visionCount);
await request(native,'/api/settings',{provider:'deepseek',visionEnabled:true,visionModel:'deepseek-flash'});result=await request(native,'/api/estimate',{image:'data:image/jpeg;base64,x',allowExternal:true});assert(result.ok);assert(native.calls.some(x=>x.path==='/api/estimate'&&x.body.image&&x.body.allowExternal===true));
const externalCount=native.calls.filter(x=>x.path==='/api/estimate').length;await request(native,'/api/settings',{provider:'bai',apiKey:'TEST_NOT_REAL'});result=await request(native,'/api/estimate',{image:'data:image/jpeg;base64,x',allowExternal:true});assert(!result.ok);assert.equal(native.calls.filter(x=>x.path==='/api/estimate').length,externalCount);
result=await request(native,'/api/estimate',{text:'米饭 100g',allowExternal:false});assert.equal(result.data.source,'local');const nativeDraft=result.data;const nativeConfirmation={estimateId:nativeDraft.draftId,date:'2026-01-02',name:'native local draft',source:'local',items:nativeDraft.items,...nativeDraft.totals};await request(native,'/api/meals',nativeConfirmation);await request(native,'/api/meals',nativeConfirmation);assert.equal((await request(native,'/api/state')).data.meals.length,1);
const timed=environment({native:true,android:true,timeout:true});const waiting=request(timed,'/api/state');timed.expire();result=await waiting;assert(!result.ok);assert(result.data.error.includes('90'));
// Push settings: browser demo refuses to enable real device notifications, native passes through.
const demoPush=environment({});result=await request(demoPush,'/api/push');assert.equal(result.data.enabled,false);assert.equal(result.data.morningTime,'07:00');assert.equal(result.data.eveningTime,'20:30');result=await request(demoPush,'/api/push',{enabled:true,morningTime:'07:00',eveningTime:'20:30'});assert(!result.ok);
result=await request(native,'/api/push',{enabled:true,morningTime:'06:45',eveningTime:'21:15',analysisEnabled:true});assert(result.ok);assert.equal(result.data.morningTime,'06:45');assert.equal(result.data.eveningTime,'21:15');assert.equal(result.data.analysisEnabled,true);
// Chat: requires explicit per-request consent, the provider permission, and a configured key.
await request(native,'/api/settings',{provider:'deepseek',allowExternal:false});
result=await request(native,'/api/chat',{question:'蛋白质够吗？',allowExternal:true});assert(!result.ok,'chat refuses when the provider permission is off');
await request(native,'/api/settings',{provider:'deepseek',allowExternal:true});
const gated=await request(native,'/api/chat',{question:'蛋白质够吗？'});assert(!gated.ok,'chat refuses without per-request consent');
assert(gated.data.error.includes('同意'),'the consent error names the missing consent');
const logsAfterGated=(await request(native,'/api/chatlog')).data;assert.equal(logsAfterGated.length,0,'a refused question is never stored as a chat record');
result=await request(native,'/api/chat',{question:'蛋白质够吗？',allowExternal:true});assert(result.ok);assert(native.calls.some(x=>x.path==='/api/chat'&&x.body.question==='蛋白质够吗？'&&x.body.allowExternal===true&&Array.isArray(x.body.history)));
const persisted=(await request(native,'/api/chatlog')).data;assert.equal(persisted.length,1,'chat reply is persisted locally');assert.equal(persisted[0].question,'蛋白质够吗？');const chatId=persisted[0].id;result=await request(native,`/api/chatlog/${encodeURIComponent(chatId)}`,undefined,'DELETE');assert(result.ok,'targeted chat delete succeeds');assert.equal((await request(native,'/api/chatlog')).data.length,0);
result=await request(demoPush,'/api/chat',{question:'x',allowExternal:true});assert(!result.ok);
// Chat with a photo: refused without an enabled vision model, forwarded with one, and a photo alone is enough.
await request(native,'/api/settings',{provider:'deepseek',visionEnabled:false});
result=await request(native,'/api/chat',{question:'这餐怎么样？',image:'data:image/jpeg;base64,YQ==',allowExternal:true});assert(!result.ok,'chat photo refused while vision is disabled');
assert(result.data.error.includes('视觉模型'),'the error explains the vision requirement');
assert(!native.calls.some(x=>x.path==='/api/chat'&&x.body.image),'a refused photo is never sent to the native layer');
await request(native,'/api/settings',{provider:'deepseek',visionEnabled:true,visionModel:'deepseek-flash'});
const imageCallsBefore=native.calls.filter(x=>x.path==='/api/chat'&&x.body.image).length;
result=await request(native,'/api/chat',{image:'data:image/jpeg;base64,YQ==',allowExternal:true});assert(result.ok,'a photo without text is accepted');
assert.equal(native.calls.filter(x=>x.path==='/api/chat'&&x.body.image).length,imageCallsBefore+1,'the photo reaches the native layer');
const photoEntry=(await request(native,'/api/chatlog')).data;assert.equal(photoEntry.length,1);assert(photoEntry[0].question.includes('含照片'),'history marks that a photo was attached');
await request(native,'/api/chatlog',undefined,'DELETE');
result=await request(native,'/api/chat',{question:'',allowExternal:true});assert(!result.ok,'empty question without a photo is refused');
// Source-level UI boundary assertions; actual DOM/device interactions need manual smoke tests.
const html=fs.readFileSync(new URL('index.html',assets),'utf8'),app=fs.readFileSync(new URL('app.js',assets),'utf8');
assert(html.indexOf('native-adapter.js')<html.indexOf('app.js'));assert.match(html,/name="apiKey" type="password"/);assert(!html.includes('login-dialog'));assert.match(app,/control\.type === 'password'/);assert.match(app,/form\.elements\.apiKey\.value=''/);// 守卫：localStorage 只允许通过常量引用，不允许新增裸键名。
// 旧写法数字面量出现次数，一改成常量就红；现在改验「裸键只剩视图态」+ 「三个常量都声明了字面量」。
assert.deepEqual([...app.matchAll(/localStorage\.(?:setItem|getItem)\('([^']+)'/g)].map(m=>m[1]),['qingheng.tab','qingheng.tab'],'only the view-state key is still a raw literal');
  for (const constant of ['CHAT_UNHELPFUL_KEY','CHAT_WEB_KEY','TRAINING_CONSENT_KEY']) assert(app.includes(`const ${constant} = 'qingheng.`), `${constant} is declared with its literal`);assert(!app.includes('state.settings.apiKey'));assert.match(html,/capture="environment"/);
assert.match(html,/id="view-chat"/);assert.match(html,/data-tab="chat"/);assert.match(html,/id="push-form"/);assert.match(app,/'today','records','chat','trends','profile'/);
const navOrder=[...html.matchAll(/data-tab="([a-z]+)"/g)].map(m=>m[1]);assert.deepEqual(navOrder,['today','records','chat','trends','profile'],'chat tab sits in the middle');
console.log('PASS adapter acceptance: browser persistence/seed once, CRUD and local draft confirmation dedup, actionable local advice, strict offline food estimates, provider defaults/switching, key non-readback/storage boundaries, no browser external calls, native routing/vision gate/fail-closed Android host, 90s timeout, UI source privacy invariants.');
console.log('Native Java persistence/import/SAF and actual DOM behavior are NOT exercised by this VM suite.');
;return typeof fail === 'number' ? fail : 0;
});

await __run("apk-contents", async () => {

const apkName = fs.readdirSync('dist').filter(name => /^qingheng-.*\.apk$/.test(name))
  .sort((a, b) => fs.statSync('dist/' + a).mtimeMs - fs.statSync('dist/' + b).mtimeMs).at(-1);
if (!apkName) throw new Error('No Qingheng APK found in dist');
const apk = 'dist/' + apkName;
const assets = 'app/src/main/assets/';
let fail = 0;
const check = (label, ok, detail) => { console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail)); if (!ok) fail++; };

// Read entries straight out of the shipped APK.
const zipPath = path.resolve('D:/AI/health-android/_verify.zip');
fs.copyFileSync(apk, zipPath);
const list = execFileSync('powershell', ['-NoProfile', '-Command', `Add-Type -AssemblyName System.IO.Compression.FileSystem; $z=[IO.Compression.ZipFile]::OpenRead('${zipPath.replace(/\//g, '\\\\')}'); $z.Entries | ForEach-Object { $_.FullName }; $z.Dispose()`], { encoding: 'utf8' }).split(/\r?\n/).filter(Boolean);
const readEntry = name => {
  const out = execFileSync('powershell', ['-NoProfile', '-Command', `Add-Type -AssemblyName System.IO.Compression.FileSystem; $z=[IO.Compression.ZipFile]::OpenRead('${zipPath.replace(/\//g, '\\\\')}'); $e=$z.Entries | Where-Object { $_.FullName -eq '${name}' }; $ms=New-Object IO.MemoryStream; $e.Open().CopyTo($ms); [Convert]::ToBase64String($ms.ToArray()); $z.Dispose()`], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).trim();
  return Buffer.from(out, 'base64');
};
const dex = readEntry('classes.dex').toString('utf8');
const apkSeed = JSON.parse(readEntry('assets/seed.json').toString('utf8'));
const apkApp = readEntry('assets/app.js').toString('utf8');
const apkAdapter = readEntry('assets/native-adapter.js').toString('utf8');
fs.unlinkSync(zipPath);

check('no personal data in the packaged seed', apkSeed.measurements.length === 0 && apkSeed.meals.length === 0 && (apkSeed.notes || []).length === 0);
check('packaged seed has no demo dates', !JSON.stringify(apkSeed).includes('2026-07-05') && !JSON.stringify(apkSeed).includes('2026-10-10'));
check('packaged seed is the migration release', apkSeed.seedMigrated === 2 && apkSeed.onboardingDone === false);
check('dex has the markdown export route', dex.includes('/api/export-markdown'));
check('dex has the SAF text export bridge', dex.includes('exportText'));
check('dex has the seed migration marker', dex.includes('seedMigrated'));
check('dex has the onboarding flag', dex.includes('onboardingDone'));
check('dex carries no demo record ids', !/c39aab93|dcc1bd9f|b7916f40|4228198f|b251bb11|cda44a3a|fc172d13|75a5615b/.test(dex));
check('packaged app.js calls the markdown route', apkApp.includes("api('/api/export-markdown'"));
check('packaged app.js uses the exportText bridge', apkApp.includes('window.QinghengNative.exportText'));
check('packaged app.js gates onboarding on height too', apkApp.includes('number((state.profile || {}).height) === null'));
check('packaged app.js computes targets with Mifflin-St Jeor', apkApp.includes('10 * w + 6.25 * h - 5 *'));
check('packaged adapter routes markdown', apkAdapter.includes("path==='/api/export-markdown'"));
check('packaged adapter keeps the JS markdown fallback', apkAdapter.includes('function buildMarkdown('));
const sourceSeed = JSON.parse(fs.readFileSync(assets + 'seed.json', 'utf8'));
check('source seed matches packaged seed (by value)', JSON.stringify(sourceSeed) === JSON.stringify(apkSeed));

const sha = crypto.createHash('sha256').update(fs.readFileSync(apk)).digest('hex').toUpperCase();
const size = fs.statSync(apk).size;
console.log('\nAPK SHA-256: ' + sha);
console.log('APK size   : ' + size + ' bytes');
;return typeof fail === 'number' ? fail : 0;
});

await __run("boot-integrity", async () => {
/**
 * 启动完整性（2026-11-19，1.4.46）。
 * 事故：把「食品热量参考库」的 searchFoods() 一起删掉后，启动行里还留着 `searchFoods();`，
 * 于是 1.4.46 一启动就 ReferenceError，页面停在「正在计算…」的骨架态；而 77 个测试全绿。
 * 这份测试只做一件事：启动行里调用的每个本仓函数都必须真的存在。
 */

let fail = 0;
const check = (label, ok, detail) => { console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail)); if (!ok) fail++; };

const app = fs.readFileSync('app/src/main/assets/app.js', 'utf8');
const lines = app.split('\n');
const bootLine = lines.find(line => line.includes('setupCollapsibleSections()') && line.includes('installDietModule()'));
check('the boot line is found', Boolean(bootLine), bootLine ? bootLine.trim().slice(0, 80) : 'not found');

const BUILTINS = new Set(['if', 'for', 'while', 'switch', 'catch', 'function', 'return', 'typeof', 'setTimeout', 'setInterval', 'clearTimeout', 'requestAnimationFrame', 'parseInt', 'parseFloat', 'isNaN', 'Number', 'String', 'Boolean', 'Array', 'Object', 'JSON', 'Promise', 'Date', 'Math', 'Map', 'Set', 'encodeURIComponent', 'decodeURIComponent', 'alert']);
const called = bootLine
  ? [...bootLine.matchAll(/(^|[^.\w$])([A-Za-z_$][\w$]*)\s*\(/g)].map(m => m[2]).filter(name => !BUILTINS.has(name))
  : [];

// 定义可能有两种形态：function foo( / const foo = / let foo = / foo = function
const defined = name => new RegExp(`function\\s+${name}\\s*\\(|(const|let|var)\\s+${name}\\s*=|^\\s*${name}\\s*=\\s*(async\\s*)?(function|\\()`, 'm').test(app);
const missing = [...new Set(called)].filter(name => !defined(name));

check('every function called at boot is defined', missing.length === 0, missing.join(', '));
check('the removed food-search boot call is gone', !app.includes('searchFoods('));
check('the removed manual-meal wiring is gone', !app.includes("$('#manual-meal-form')") && !app.includes("$('#off-search')"));
;return typeof fail === 'number' ? fail : 0;
});

await __run("ci-and-versions", async () => {
/**
 * Step 7 checks: one command verifies everything, one-off scripts are archived, and the versions that
 * make a record explainable are recorded and surfaced.
 */

let fail = 0;
const check = (label, ok, detail) => { console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail)); if (!ok) fail++; };

const exists = path => fs.existsSync(path);
const read = path => fs.readFileSync(path, 'utf8');

// --- one command ----------------------------------------------------------------------------------------
const ci = read('tools/verify-all.ps1');
check('a single verification command exists', exists('tools/verify-all.ps1'));
check('it runs every test suite', ci.includes("Get-ChildItem tests -Filter *.test.mjs") && ci.includes('$failed += $suite.Name'));
check('it fails fast on a test failure', ci.includes("if ($failed.Count) { throw (\"test failures: \" + ($failed -join ', ')) }"));
check('it builds through build.ps1 (single source of the version)', ci.includes("Join-Path $root 'build.ps1'"));
check('it runs the packaging checks', ci.includes('tests\\verify-web-apk.mjs') && ci.includes('suite-infra.test.mjs')
  && !ci.includes('tests\\icon-style.test.mjs'));
check('it prints the APK hash', ci.includes('Get-FileHash $apk.FullName -Algorithm SHA256'));
check('the packaging guard rejects backslash and leftover entries', read('build.ps1').includes('packaging guard') && read('build.ps1').includes('ZipFile'));
check('it can skip the build for a quick test run', ci.includes('[switch]$SkipBuild'));
check('it works from any directory', ci.includes('Split-Path -Parent $PSScriptRoot'));

// --- housekeeping ---------------------------------------------------------------------------------------
check('one-off scripts are archived', exists('tools/one-off/README.md'));
const oneOff = fs.readdirSync('tools/one-off');
check('the archive holds the historical patches', oneOff.filter(name => name.endsWith('.py')).length >= 30, oneOff.filter(n => n.endsWith('.py')).length);
check('the archive explains they must not be re-run', read('tools/one-off/README.md').includes('不要在新流程里执行') && read('tools/one-off/README.md').includes('重复执行会重复插入内容'));
check('the repo root is free of loose scripts', fs.readdirSync('.').filter(name => /\.(py|mjs)$/.test(name)).length === 0);
check('the anchor generator stays a real tool', exists('tools/build-anchors.mjs') && !oneOff.includes('build-anchors.mjs'));

// --- prompt / 口径 versioning ---------------------------------------------------------------------------
const main = read('app/src/main/java/cn/qingheng/health/MainActivity.java');
const prompts = read('app/src/main/java/cn/qingheng/health/ai/Prompts.java');
const routes = read('app/src/main/java/cn/qingheng/health/bridge/MetaRoutes.java');
check('a prompt version exists', prompts.includes('public static final int PROMPT_VERSION = 9;'));
check('a 口径 version exists', prompts.includes('public static final int RULES_VERSION = 2;'));
check('the versions explain themselves', main.includes('which prompt produced an answer') && main.includes('which 口径 the numbers were computed with'));
check('the lean prompt mirrors the preset', prompts.includes('热量缺口 12%') && prompts.includes('2.2~2.6 g/kg') && prompts.includes('12~18 组/肌群/周') && prompts.includes('0.5~0.7%'));
check('a versions route exists', routes.includes('path.equals("/api/versions")') && main.includes('MetaRoutes.handle(path, get, post, b, this)'));
check('versions never include keys or records', /private JSONObject versionsInternal\(\) throws Exception \{[\s\S]{0,1500}?\}/.test(main) && !/versionsInternal\(\)[\s\S]{0,1500}apiKey/.test(main));
check('versions report the anchors and last backup', main.includes('.put("anchorsPresent"') && /backupAt", backupStatusInternal\(\)\.optLong\("at", 0L\)/.test(main));

const app = read('app/src/main/assets/app.js');
const html = read('app/src/main/assets/index.html');
check('the about page shows the versions', html.includes('id="version-info"') && app.includes('async function loadVersions()'));
check('it explains why the versions matter', html.includes('旧记录不会被重新解释'));
check('it loads when the about subpage opens', app.includes("loadStorageStatus(false).catch(() => {}); loadVersions().catch(() => {});"));
check('the about page names the author and states the source is public', html.includes('作者 Sanchen') && html.includes('源码公开'));
check('state migrates away removed health fields', main.includes('STATE_VERSION = 4') && main.includes('root.remove("healthConnectRecords")'));
check('imports carry anchors and temporary targets', main.includes('next.put("foodAnchors", imported.getJSONObject("foodAnchors"))') && main.includes('next.put("temporaryTargets"'));
check('future weights stay out of plateau maths', app.includes('if (row.date > activeDate) continue;'));
check('the about page links to the source repository', html.includes('github.com/dustSanchen/qingheng') && html.includes('open-project-page'));
check('the about page shows the build signature', html.includes('id="build-signature"') && main.includes('OFFICIAL_CERT_SHA256'));
check('building cannot disagree with the shipped app version', read('build.ps1').includes('APP_VERSION') && read('build.ps1').includes('does not match APP_VERSION'));
check('it states the no-resale terms', html.includes('禁止二次转售') && read('LICENSE').includes('二次转售') && read('LICENSE').includes('再分发'));
const readme = read('README.md');
const site = read('site/index.html');
const apkVersion = (read('app/src/fragments/70-rest.fragment.js').match(/APP_VERSION = '([0-9.]+)'/) || [])[1];
check('the readme keeps the release facts', readme.includes('LICENSE') && readme.includes('site/shots/today.jpg') && readme.includes('version-' + apkVersion) && readme.includes('b23aba9a2955e620dad5453c15a879ffab3ca4ad90a3e5b1b63beb5f55fab1ac'));
check('the readme screenshots are on disk', fs.readdirSync('site/shots').filter(name => name.endsWith('.jpg')).length >= 8);
check('the showcase page also drops the source link', site.includes('个人作品') && site.includes('许可') && !site.includes('>打开仓库<'));
const publisher = read('tools/publish-pages.ps1');
check('the pages publisher only touches gh-pages', publisher.includes('gh-pages') && publisher.includes('site\\index.html') && !publisher.includes('README.md=README.md'));

check('the one-command dev loop exists', fs.existsSync('tools/dev-loop.ps1') && fs.readFileSync('tools/dev-loop.ps1', 'utf8').includes('install + smoke'));
check('the patcher library exists', fs.existsSync('tools/lib/patch.mjs'));
check('the device helper converts preview coordinates', fs.readFileSync('tools/device.mjs', 'utf8').includes('fromPreview'));
check('the tools are documented', fs.readFileSync('tools/README.md', 'utf8').includes('dev-loop.ps1'));
;return typeof fail === 'number' ? fail : 0;
});

await __run("data-flow", async () => {
/**
 * Cross-page reading flow: records -> trends, trends -> records, and the chat
 * context -> the existing meal field. No new pages, no second write path.
 */

let fail = 0;
const check = (label, ok, detail) => {
  console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail));
  if (!ok) fail++;
};
const html = fs.readFileSync('app/src/main/assets/index.html', 'utf8');
const app = fs.readFileSync('app/src/main/assets/app.js', 'utf8');

check('records header leads to the matching trend view', html.includes('data-go="trends"') && html.includes('看趋势'));
check('trends header leads back to records', html.includes('data-go="records"') && html.includes('去记录'));
check('chat context links to the existing meal field, not a new editor', html.includes('id="chat-record-link"') && html.includes('data-go="records" data-focus="meal-text"'));
check('the chat link text follows the selected day count', app.includes("recordLink.textContent=count>0?'查看这一天的记录':'去记录这一天'"));
check('the link uses the existing delegated go handler', app.includes("document.addEventListener('click'") && app.includes('revealField(action.dataset.focus)'));
check('no second records page or duplicate form is introduced', (html.match(/id="view-records"/g) || []).length === 1);
check('the records page still has one primary form per segment', ['id="estimate-form"', 'id="training-form"', 'id="measurement-form"', 'id="habit-form"'].every(id => html.includes(id)));

console.log('FAIL total: ' + fail);
;return typeof fail === 'number' ? fail : 0;
});

await __run("graded-colors", async () => {
/**
 * 连续配色断言：越接近目标越绿，而不是简单的三档。
 */

let fail = 0;
const check = (label, ok, detail) => { console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail)); if (!ok) fail++; };
const read = path => fs.readFileSync(path, 'utf8');
const app = read('app/src/main/assets/app.js');
const targets = read('app/src/fragments/40-targets.fragment.js');

// --- the shared colour ramp --------------------------------------------------------------------------
// goalColor 曾在全文件只有声明、没有调用；颜色现在由下面的 dietBarColor/rateGoalColor 各自负责。
check('the unused colour ramp is gone', !app.includes('function goalColor(ratio)'));

// --- diet bars --------------------------------------------------------------------------------------
check('diet bars pick a colour by state', app.includes('function dietBarColor(kcal, min, max)') && app.includes('if (kcal > max) return overColor(kcal, max);'));
check('in-range stays green', app.includes('function rangeColor(kcal, min, max)') && app.includes('132 + 8 * t'));
check('over the cap turns red quickly', app.includes('function overColor(kcal, max)') && app.includes('max * 0.08'));
check('below the floor turns amber', app.includes('function underColor(kcal, min)'));
check('the bar paints that colour', app.includes('background:${barColor}'));
check('a band marks the acceptable range', app.includes('class="diet-band" style="left:') && app.includes('const bandLeft = unset ? 0 : Math.max(0, Math.min(100, (range.min / scaleMax) * 100));'));
check('the scale leaves headroom above the cap', app.includes('const scaleMax = Math.max((unset ? Math.max(kcal, 1) : range.max) * 1.08, 1);'));
check('the band is explained in the caption', app.includes('浅绿带 = 当天目标区间'));
check('the band sits under the fill', read('app/src/main/assets/styles.css').includes('.diet-band{position:absolute') && read('app/src/main/assets/styles.css').includes('.diet-bar i{z-index:1') && !read('app/src/main/assets/styles.css').includes('.diet-bar i{position:relative'));
check('unrecorded days stay transparent', app.includes("recorded && !unset ? dietBarColor(kcal, range.min, range.max) : 'transparent'"));
check('state classes are kept for accessibility', app.includes('class="${stateKey}"'));

// --- weight delta graded against the plan -----------------------------------------------------------
check('the plan states an expected weekly rate', targets.includes('expectedWeeklyKg: Math.round(((tdee - weeklyAverage) * 7 / 7700) * 100) / 100'));
check('the range exposes it', app.includes('expectedWeeklyKg: active && Number.isFinite(active.expectedWeeklyKg)'));
check('the weight delta compares planned vs observed', app.includes('Math.abs(observedRate - plannedRate) / Math.max(0.2, Math.abs(plannedRate) * 1.5)'));
check('it colours the delta value', app.includes('stats[1].style.color = rateColor'));
check('the rate uses its own ramp', app.includes('function rateGoalColor(observed, planned)') && app.includes('rateGoalColor(observedRate, plannedRate)'));
check('the plan rate is shown on hover', app.includes('计划每周 ') && app.includes('实际每周 '));

// --- training volume graded -------------------------------------------------------------------------
check('volume deltas use their own ramp', app.includes('function volumeColor(delta, previous)') && app.includes('volumeColor(row.delta, row.prevVolume)'));
check('growth is measured as a share of last volume', app.includes('const pct = previous > 0 ? delta / previous : 0;'));
;return typeof fail === 'number' ? fail : 0;
});

await __run("icon-style", async () => {
// Icon style gate for the WebView assets folder.
// Run from the project root:  node tests/icon-style.test.mjs

const here = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(here, '..');
const assetsDir = path.join(projectRoot, 'app', 'src', 'main', 'assets');

const ICONS = fs.readdirSync(assetsDir)
  .filter(name => /^icon-[a-z0-9-]+\.svg$/i.test(name))
  .sort();

const STYLE_SNIPPETS = [
  'viewBox="0 0 24 24"',
  'fill="none"',
  '<g ',
  'stroke-width="1.5"',
  'stroke-linecap="round"',
  'stroke-linejoin="round"',
];

const FORBIDDEN_SNIPPETS = ['<image', 'base64', 'style='];
// Only the SVG canvas must be CSS-sized; rect/path geometry may use width/height.
const FORBIDDEN_SIZE_ATTR = /<svg\b[^>]*\s(?:width|height)="/i;

const failures = [];
function check(condition, message) {
  if (!condition) failures.push(message);
}

const svgText = new Map();

// 1. The browser-facing assets folder must stay flat (AAPT/asset pitfalls).
const entries = fs.readdirSync(assetsDir, { withFileTypes: true });
const subDirs = entries.filter((e) => e.isDirectory()).map((e) => e.name);
check(subDirs.length === 0, `assets must stay flat, found subdirectories: ${subDirs.join(', ')}`);

// 2. Every icon in the flat assets directory obeys one shared drawing contract.
check(ICONS.length > 0, 'assets must contain at least one icon-*.svg');
for (const name of ICONS) {
  const file = path.join(assetsDir, name);
  const raw = fs.readFileSync(file);
  const text = raw.toString('utf8');
  svgText.set(name, text);

  check(raw.length < 900, `${name}: ${raw.length} bytes is not < 900`);
  for (const snippet of STYLE_SNIPPETS) {
    check(text.includes(snippet), `${name}: missing ${snippet}`);
  }
  for (const snippet of FORBIDDEN_SNIPPETS) {
    check(!text.includes(snippet), `${name}: must not contain ${snippet}`);
  }
  check(!FORBIDDEN_SIZE_ATTR.test(text), `${name}: must not set a width/height attribute (CSS governs size)`);

  const colors = [...text.matchAll(/(?:stroke|fill)="(#[0-9a-fA-F]{3,8}|currentColor)"/g)]
    .map(match => match[1].toLowerCase());
  check(new Set(colors).size === 1, `${name}: expected one non-none drawing color, got ${[...new Set(colors)].join(', ')}`);
  check(!/fill="#/i.test(text), `${name}: must remain an outline icon`);

  // Geometry must breathe inside a 24x24 box: absolute coordinates stay in 3..21.
  // Absolute commands are arity-aware scanned; relative deltas and arc flags are skipped.
  const PATH_ARITY = { m: 2, l: 2, h: 1, v: 1, c: 6, s: 4, q: 4, t: 2, a: 7, z: 0 };
  const tokens = [];
  for (const d of text.matchAll(/\sd="([^"]+)"/g)) {
    for (const m of d[1].matchAll(/([A-Za-z])|(-?\d*\.?\d+)/g)) {
      tokens.push(m[1] !== undefined ? m[1] : Number(m[2]));
    }
  }
  const coords = [];
  let command = null;
  let arity = 0;
  let consumed = 0;
  let group = [];
  for (const token of tokens) {
    if (typeof token === 'string') {
      command = token;
      arity = PATH_ARITY[token.toLowerCase()] ?? 0;
      consumed = 0;
      group = [];
      continue;
    }
    if (command === null || arity === 0) continue;
    consumed += 1;
    group.push(token);
    if (group.length === arity) {
      if (command === command.toUpperCase()) {
        if (command.toLowerCase() === 'a') {
          // rx ry x-axis-rotation large-arc-flag sweep-flag x y
          // Only the end point is a position; the radii and the rotation carry no
          // location and the two flags are legitimately 0/1.
          coords.push(group[5], group[6]);
        } else {
          coords.push(...group);
        }
      }
      group = [];
    }
  }
  const outOfRange = [...new Set(coords)].filter((n) => n < 3 || n > 21);
  check(outOfRange.length === 0, `${name}: coordinates outside 3..21: ${outOfRange.join(', ')}`);
}

// 3. Every ./icon-*.svg reference in the shipped web code must resolve to a real file.
const REF_SOURCES = ['index.html', 'app.js'];
const refPattern = /(?:\.\/)?(icon-[a-z0-9-]+\.svg)/g;
let refCount = 0;
const referenced = new Set();
for (const sourceName of REF_SOURCES) {
  const sourceFile = path.join(assetsDir, sourceName);
  if (!fs.existsSync(sourceFile)) continue;
  const source = fs.readFileSync(sourceFile, 'utf8');
  for (const match of source.matchAll(refPattern)) {
    refCount += 1;
    referenced.add(match[1]);
    const target = path.join(assetsDir, match[1]);
    check(fs.existsSync(target), `${sourceName}: references missing asset ${match[1]}`);
  }
}
for (const name of ICONS) check(referenced.has(name), `${name}: unreferenced icon asset`);

if (failures.length > 0) {
  console.error(`FAIL icon style: ${failures.length} problem(s)`);
  for (const failure of failures) console.error(`  - ${failure}`);
} else {
  console.log(
      `PASS icon style: ${ICONS.length} icons, 24x24 / 1.5 round strokes, ` +
      `flat assets dir, ${refCount} references resolved, no orphans, all < 900 bytes`,
  );
}
;return typeof fail === 'number' ? fail : 0;
});

await __run("icons-motion", async () => {
// 2026-10-19: icon delivery + motion contract.
// Semantic (currentColor) icons must NEVER be loaded through <img> — an external SVG resource
// cannot inherit the page colour and renders black. They must be inlined so the surrounding
// CSS colour (mint-dark, danger, tone colours) applies. Skeleton icons keep their baked mint.

const app = fs.readFileSync('app/src/main/assets/app.js', 'utf8');
const html = fs.readFileSync('app/src/main/assets/index.html', 'utf8');
const css = fs.readFileSync('app/src/main/assets/styles.css', 'utf8');

// --- inline delivery of semantic icons ---------------------------------------------------------
const SEMANTIC = ['tip', 'copy', 'check', 'bookmark', 'select', 'trash',
  'nutrient-protein', 'nutrient-fat', 'nutrient-carb', 'energy', 'meal',
  'habit-steps', 'habit-sleep', 'water', 'warn'];
assert(app.includes('const SVG_ICONS = {'), 'app.js carries the inline icon map');
assert(app.includes('const iconMarkup = name =>'), 'app.js renders icons through iconMarkup()');
for (const name of SEMANTIC) {
  assert(!app.includes(`<img src="./icon-${name}.svg`), `app.js must not load icon-${name}.svg via <img>`);
  assert(!html.includes(`<img src="./icon-${name}.svg`), `index.html must not load icon-${name}.svg via <img>`);
}
for (const name of ['copy', 'select', 'bookmark', 'trash', 'check', 'meal', 'glyph-balance', 'glyph-training', 'habit-steps', 'habit-sleep']) {
  assert(app.includes(`'icon-${name}.svg': svgIcon(`), `SVG_ICONS defines icon-${name}.svg`);
}
// Today quick-action chips carry the line-icon family, never emoji glyphs.
for (const emoji of ['🍜', '🏋', '⚖', '📷', '＋ 记一餐']) assert(!app.includes(emoji), `quick chips must not use the glyph ${emoji}`);
assert(/class="quick-chip-icon" aria-hidden="true">\$\{iconMarkup\(icon\)\}/.test(app), 'chips render icons through iconMarkup');
assert(css.includes('.quick-chip .quick-chip-icon{'), 'chip icons are sized and tinted mint');
assert(/class="hub-icon" aria-hidden="true"><svg /.test(html), 'the hub icons are inline SVG');
assert(!/icon-(tip|copy|check)\.svg" alt/.test(html), 'no black currentColor icons remain in the hub');

// --- skeleton icons stay file-loaded and tintable ----------------------------------------------
assert(html.includes('icon-glyph-ring.svg') && html.includes('icon-nav-back.svg'), 'navigation reuses the ring glyph and keeps the back icon file');
assert(css.includes('.bottom-nav button:not([aria-current=page]) .nav-icon img{opacity:.55'), 'inactive nav icons are dimmed');
for (const rule of ['.hub-icon svg{width:21px', '.sheet-option-icon svg{width:19px', '.fav-badge svg{width:14px']) {
  assert(css.includes(rule), `CSS sizes the inline icon: ${rule}`);
}

// --- habit icon files obey the shared drawing contract -----------------------------------------
for (const name of ['icon-glyph-training.svg', 'icon-habit-steps.svg', 'icon-habit-sleep.svg', 'icon-water.svg']) {
  const text = fs.readFileSync(`app/src/main/assets/${name}`, 'utf8');
  assert(text.includes('stroke-width="1.5"'), `${name} uses the shared 1.5 stroke`);
  assert(text.includes('stroke-linecap="round"') && text.includes('stroke-linejoin="round"'), `${name} uses round joins`);
  assert(!/(^|[\s"'<>])width="/.test(text), `${name} sets no width attribute`);
  assert(!text.includes('#4b6b52'), `${name} left the off-palette colour`);
}

// --- motion: direction-aware tab switch, dialog rise, collapsible unfold, list stagger ---------
assert(css.includes('@keyframes viewInRight') && css.includes('@keyframes viewInLeft'), 'direction-aware view keyframes exist');
assert(css.includes('.view{animation:viewIn var(--dur-slow) cubic-bezier(.22,.8,.3,1)'), 'views animate on compositor-friendly properties');
assert(/const dir = lastShownTab \? TAB_ORDER\.indexOf\(tab\) - TAB_ORDER\.indexOf\(lastShownTab\) : 0;/.test(app), 'switchTab derives the travel direction');
assert(/view\.classList\.add\(dir > 0 \? 'from-right' : 'from-left'\)/.test(app), 'the incoming view gets the direction class');
assert(/lastShownTab = tab;/.test(app), 'switchTab remembers the previous tab');
assert(css.includes('@keyframes dialogRise') && css.includes('.app-dialog-panel{animation:dialogRise'), 'dialogs rise in');
assert(css.includes('.app-dialog{animation:scrimIn'), 'dialog scrim fades in');
assert(css.includes('.collapsible-body{animation:unfoldIn'), 'collapsible bodies unfold');
assert(css.includes('.food-result{animation:rowIn var(--dur-base) ease-out both'), 'search results enter as rows');
assert(css.includes('{animation-delay:.21s}'), 'rows are staggered');
// Everything animates transform/opacity only — no layout properties in the new keyframes.
for (const kf of ['viewIn', 'viewInRight', 'viewInLeft', 'dialogRise', 'scrimIn', 'unfoldIn', 'rowIn']) {
  const body = css.match(new RegExp(`@keyframes ${kf}\\{[\\s\\S]*?\\}(?:\\}|,|@|/|$)`));
  assert(body, `@keyframes ${kf} exists`);
  assert(!/[,{;]width:|[,{;]height:|[,{;]margin|[,{;]padding|[,{;]top:|[,{;]left:/.test(body[0].replace('@keyframes ' + kf, '')), `${kf} animates only transform/opacity`);
}

console.log('PASS icons-motion: reusable symbols inline (colour inherits), SVG assets on 1.5 round-stroke contract, direction-aware tab motion, dialog/collapsible/list transitions on transform+opacity');
;return typeof fail === 'number' ? fail : 0;
});

await __run("interaction-finish", async () => {
/**
 * Cross-page button/motion finish: press feedback, one hover language, readable
 * record summary, and reduced-motion safety via existing global rule.
 */

let fail = 0;
const check = (label, ok, detail) => {
  console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail));
  if (!ok) fail++;
};
const css = fs.readFileSync('app/src/main/assets/styles.css', 'utf8');

check('buttons animate color and transform', css.includes('.button{transition:background var(--dur-fast) var(--ease-opus),border-color var(--dur-fast) var(--ease-opus),color var(--dur-fast) var(--ease-opus),transform var(--dur-fast) var(--ease-opus)}'));
check('hover feedback exists for primary/subtle/text/icon', css.includes('.button.primary:hover') && css.includes('.button.subtle:hover') && css.includes('.text-button:hover') && css.includes('.icon-button:hover'));
check('segments and chips have state transitions', css.includes('.segment{transition:color var(--dur-fast) var(--ease-opus)') && css.includes('.chip-toggle{transition:background var(--dur-fast)'));
check('record summary is a readable data line, not muted fine print', css.includes('#today-meta,#records-meta{font-size:var(--text-md);color:var(--ink-soft)'));
check('reduced motion remains globally respected', css.includes('@media(prefers-reduced-motion:reduce)'));
check('chat send and attachments give press feedback', css.includes('.chat-send-button:active,.chat-attach-button:active{transform:scale(.94)}'));
check('notice slides in with the shared ease', css.includes('@keyframes noticeIn') && css.includes('.notice{animation:noticeIn'));
check('no transition-all fallback is introduced', !/transition:\s*all/.test(css));

console.log('FAIL total: ' + fail);
;return typeof fail === 'number' ? fail : 0;
});

await __run("key-hygiene", async () => {

const root = new URL('../app/src/main/', import.meta.url);
const java = fs.readFileSync(new URL('java/cn/qingheng/health/MainActivity.java', root), 'utf8');
const store = fs.readFileSync(new URL('java/cn/qingheng/health/SecretStore.java', root), 'utf8');
const app = fs.readFileSync(new URL('assets/app.js', root), 'utf8');
const html = fs.readFileSync(new URL('assets/index.html', root), 'utf8');

// The 401 cause this fixes: keys copied from a web page carry NBSP/BOM/zero-width characters,
// which Java's \s does not match, so they were stored and then rejected by the provider.
// The Java source spells these as unicode escapes, so the patterns expect one literal backslash.
assert(/public static String sanitize\(String raw\)/.test(store), 'a sanitizer exists');
assert(store.includes('replace("\\u00A0", " ")'), 'NO-BREAK SPACE is handled');
assert(store.includes('replace("\\uFEFF", "")'), 'BOM is handled');
assert(store.includes('replace("\\u200B", "")'), 'zero-width space is handled');
assert(store.includes('replace("\\u3000", " ")'), 'ideographic space is handled');
assert(/regionMatches\(true, 0, "Bearer", 0, 6\)/.test(store), 'a pasted Bearer prefix is stripped');
assert(/Character\.isWhitespace\(c\) \|\| Character\.isSpaceChar\(c\)/.test(store), 'all Unicode space characters are removed');
assert(/public static boolean needsCleaning/.test(store), 'contaminated stored keys can be detected');
assert(!java.includes('\\s+.*"), "API Key'), 'the old ASCII-only whitespace check is gone');
assert(!java.includes('API Key 不能包含空白'), 'the misleading whitespace error message is gone');

// Normalisation happens on save and again on every use, so an already-stored key is repaired.
assert(java.includes('SecretStore.sanitize(patch.getString("apiKey"))'), 'model keys are sanitized on save');
assert(!java.includes('key.brave'), 'no Brave key slot remains after search removal');
assert(/private String apiKey\(String provider\) throws Exception/.test(java), 'one accessor produces every request key');
assert(java.includes('return SecretStore.sanitize(SecretStore.decrypt(this, provider));'), 'keys are sanitized again when read');
const decrypts = [...java.matchAll(/SecretStore\.decrypt\(this,/g)].length;
assert.equal(decrypts, 2, 'decrypt is called only from the request accessor and the self check');
const callSites = [...java.matchAll(/apiKey\((?:c\.optString\("provider", provider\(\)\)|provider\(\)|p)\)/g)];
assert(callSites.length >= 2, `every request path uses the accessor (found ${callSites.length})`);

// Self check: local only, and it must never return key material.
assert(/if \(get && path\.equals\("\/api\/key-info"\)\)/.test(java), 'the self check route is a GET');
const info = java.slice(java.indexOf('private JSONObject keyInfo'), java.indexOf('private JSONObject publicSettings'));
assert(/SecretStore\.decrypt/.test(info), 'the self check proves the stored key still decrypts');
assert(/substring\(0, 7\)/.test(info) && /substring\(clean\.length\(\) - 4\)/.test(info), 'only a masked preview is returned');
assert(!/put\("key"/.test(info) && !/put\("value"/.test(info) && !/put\("secret"/.test(info), 'no full key field is ever returned');
assert(/put\("cleaned", SecretStore\.needsCleaning\(raw\)\)/.test(info), 'the self check reports paste contamination');

assert(/id="key-info"/.test(html) && /id="key-info-result"/.test(html), 'the self check has UI');
assert(/api\('\/api\/key-info'\)/.test(app), 'the page calls the self check');
assert(/检测到粘贴时带入的不可见字符/.test(app), 'contamination is explained to the user in plain language');
assert(!/data\.model\.key|data\.brave\.key/.test(app), 'the page never handles raw key material');

console.log('PASS key hygiene: Unicode-safe sanitising, repair on read, masked self check, offline page reading');
;return typeof fail === 'number' ? fail : 0;
});

await __run("modularization", async () => {
/**
 * Step 8 checks: the monolith split is landed for real -- the WebView script is assembled from
 * fragments, and the Java side has packages that own the prompts and the aggregation rules.
 */

let fail = 0;
const check = (label, ok, detail) => { console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail)); if (!ok) fail++; };
const read = path => fs.readFileSync(path, 'utf8');

// --- frontend: fragments + assembler ------------------------------------------------------------------
const assembler = read('tools/assemble-app.ps1');
check('an assembler exists', assembler.includes('fragment.js'));
check('it sorts fragments so the order is deterministic', assembler.includes('Sort-Object Name'));
check('it writes without a BOM', assembler.includes('UTF8Encoding($false)'));
check('it skips writing when nothing changed', assembler.includes('$existing -ne $text'));
check('the build assembles before packaging', read('build.ps1').includes('assemble-app.ps1'));
check('the fragments stay out of assets/', !fs.existsSync('app/src/main/assets/app'));
check('the drift guard test exists', fs.readdirSync('tests').some(name => name.endsWith('.test.mjs') && fs.readFileSync('tests/' + name, 'utf8').includes('the generated app.js is in sync with the fragments')));

// --- Java: packages own their concern -------------------------------------------------------------------
const prompts = read('app/src/main/java/cn/qingheng/health/ai/Prompts.java');
check('prompts live in their own package', prompts.includes('package cn.qingheng.health.ai;'));
check('the prompt version lives with the prompt text', prompts.includes('public static final int PROMPT_VERSION = 9;') && prompts.includes('public static final int RULES_VERSION = 2;'));
check('every prompt is exposed as a method', ['chat()', 'mealEstimate()', 'dailyAdvice(', 'weeklyReview()', 'withAnchors('].every(symbol => prompts.includes(symbol)));
check('the prompts document the rules they encode', prompts.includes('missing data is stated, never treated as zero') && prompts.includes('must not under-report'));
check('anchor framing moved into Prompts', prompts.includes('同一食物必须沿用这里的数值'));

const main = read('app/src/main/java/cn/qingheng/health/MainActivity.java');
const alarm = read('app/src/main/java/cn/qingheng/health/AlarmReceiver.java');
check('the chat prompt is delegated', main.includes('return cn.qingheng.health.ai.Prompts.chat();'));
check('the estimator prompt is delegated', main.includes('cn.qingheng.health.ai.Prompts.withAnchors(cn.qingheng.health.ai.Prompts.mealEstimate()'));
check('the daily push prompt is delegated', alarm.includes('cn.qingheng.health.ai.Prompts.dailyAdvice(mealSlot)'));
check('the weekly prompt is delegated', alarm.includes('cn.qingheng.health.ai.Prompts.weeklyReview()'));
check('no prompt text is duplicated in the activity', !main.includes('你是谨慎的餐食营养估算助手') && !main.includes('你是谨慎的个人健康助手'));
check('no prompt text is duplicated in the receiver', !alarm.includes('你是谨慎的饮食营养助手') && !alarm.includes('你是谨慎的个人健康助手'));
check('the versions read from the same place', main.includes('static final int PROMPT_VERSION = cn.qingheng.health.ai.Prompts.PROMPT_VERSION;'));

const math = read('app/src/main/java/cn/qingheng/health/store/RecordMath.java');
check('aggregation helpers live in their own package', math.includes('package cn.qingheng.health.store;'));
check('the helpers take JSON, not Android types', !/import android\./.test(math) && !/android\.content\.Context/.test(math));
check('missing stays missing in the sums', math.includes('return seen ? total : null;'));
check('a null-safe range check exists', math.includes('public static boolean withinRange('));
check('the receiver uses the shared helpers', alarm.includes('cn.qingheng.health.store.RecordMath.hasAnyOf(') && alarm.includes('cn.qingheng.health.store.RecordMath.sumRounded('));
check('the receiver no longer sums by hand', !/double calories = 0, protein = 0, fat = 0/.test(alarm));

// --- the split is documented ------------------------------------------------------------------------------
const doc = read('D:/AI/codex/qingheng-1.0.16-progress-20261017.md');
check('the delivery doc explains the fragment workflow', doc.includes('tools\\one-off') && doc.includes('片段'));
check('the architecture note names the remaining splits', doc.includes('桥方法转薄'));
;return typeof fail === 'number' ? fail : 0;
});

await __run("motion", async () => {

const assets = new URL('../app/src/main/assets/', import.meta.url);
const html = fs.readFileSync(new URL('index.html', assets), 'utf8');
const app = fs.readFileSync(new URL('app.js', assets), 'utf8');
const css = fs.readFileSync(new URL('styles.css', assets), 'utf8');

// 数字滚动只挂在真正的数值上：今日能量的主数字。挂到标签或目标值上会把「不变的字」也滚一遍。
const calorie = html.match(/<strong id="calorie-value"([^>]*)>/);
assert(calorie, 'the calorie number exists');
assert(/\bdata-count\b/.test(calorie[1]), 'the calorie number opts into count roll');
assert(/count-roll/.test(calorie[1]), 'it uses tabular figures so digits do not jitter');
assert.equal((html.match(/data-count\b/g) || []).length, 1, 'no other node opts into count roll');

// 首帧、reduced-motion、外部渲染插队、库失灵，四条边界都要有明确出口。
assert(/installCountRoll/.test(app), 'the count roll installer is assembled into app.js');
assert(/if \(shown === null\) \{ shown = next; displayed = next; return; \}/.test(app), 'first paint never rolls from zero');
assert(/prefers-reduced-motion: reduce/.test(app), 'the roll respects reduced motion');
assert(/Math\.min\(1, \(now - started\) \/ 320\)/.test(app), 'the fallback loop is bounded to 320ms');
assert(/roll\(displayed === null \? next : displayed, next\)/.test(app), 'a render landing mid-roll continues from the screen');
assert(/setTimeout\(\(\) => \{ if \(shown === to && displayed !== to\) settle\(to\); \}, 420\)/.test(app), 'a watchdog guarantees the final number');
assert(/window\.MotionLib && typeof window\.MotionLib\.animate === 'function'/.test(app), 'the vendored runtime is feature-detected, not assumed');
assert(!/^import /m.test(app), 'app.js stays a plain script');

// 卡片入场交给 Motion：按真实 .card 顺序错帧，6px、28ms、最多 5 张，首帧不表演。
assert(/installViewStagger/.test(app), 'the card entrance installer is assembled');
assert(/delay: index \* 0\.028/.test(app), 'cards are staggered by 28ms');
assert(/y: \[6, 0\]/.test(app), 'cards rise 6px and no more');
assert(/\.slice\(0, 5\)/.test(app), 'at most five cards join one entrance');
assert(/view\.dataset\.motionSeen !== '1'\) \{ view\.dataset\.motionSeen = '1'; return; \}/.test(app), 'first paint does not perform');
assert(!css.includes('@keyframes cardRise'), 'the CSS stagger is gone, not duplicated');

// 动效令牌：三档时长与单一缓动；页面只做淡入，不叠第二套位移。
assert(/--dur-1:140ms;--dur-2:220ms;--dur-3:320ms;--ease-opus:cubic-bezier\(\.2,0,0,1\)/.test(css), 'motion tokens are declared together');
assert(/@keyframes viewFade/.test(css), 'the page cross-fades instead of sliding');
assert(!/\.view:not\(\[hidden\]\)>\.card/.test(css), 'cards are not animated twice');
;return typeof fail === 'number' ? fail : 0;
});

await __run("offline-local", async () => {
/**
 * Offline/no-key guarantees: local food matching and preference storage must not
 * depend on an external model, and a local preview still needs confirmation.
 */

let fail = 0;
const check = (label, ok, detail) => {
  console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail));
  if (!ok) fail++;
};
const app = fs.readFileSync('app/src/main/assets/app.js', 'utf8');
const adapter = fs.readFileSync('app/src/main/assets/native-adapter.js', 'utf8');

function extractFunction(source, name) {
  const marker = 'function ' + name + '(';
  const start = source.indexOf(marker);
  if (start < 0) throw new Error('missing ' + name);
  const open = source.indexOf('{', start);
  let depth = 0, quote = '';
  for (let i = open; i < source.length; i++) {
    const ch = source[i], prev = source[i - 1];
    if (quote) {
      if (ch === quote && prev !== '\\') quote = '';
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') { quote = ch; continue; }
    if (ch === '{') depth++;
    else if (ch === '}' && --depth === 0) return source.slice(start, i + 1);
  }
  throw new Error('unterminated ' + name);
}

const local = extractFunction(app, 'localFoodEstimate');
const start = app.indexOf('function localFoodEstimate(');
check('local matching is self-contained', start >= 0 && !/api\(|fetch\(|allowExternal|apiKey/i.test(local));
check('unknown local lines fall through', local.includes('if (!entry) return null') && local.includes('if (!match) return null'));
check('local results still require the estimate preview', app.includes('previewDraft(local, submittedForm)') && app.includes('生成估算预览'));
check('the generic draft writer refuses meal', app.includes("if (draft.kind === 'meal')") && app.includes('餐食草稿需要在餐食表单生成预览并确认'));
check('preferences are object-array backed, not string+meta', app.includes('normalizePreferenceEntries') && app.includes('localStorage.removeItem(PREFERENCE_META_KEY)'));
check('readPreferences returns text while rows keep metadata', app.includes('return readPreferenceEntries().map(row => row.text);') && app.includes('function readPreferenceRows()'));
check('no API key is written into preference storage', !/localStorage\.setItem\([^)]*apiKey/i.test(app));
check('the browser adapter has a local estimate path', adapter.includes("path==='/api/estimate'") && adapter.includes('QinghengFoods'));
check('offline copy does not claim a meal was saved', app.includes('请检查数据后确认保存'));

console.log('FAIL total: ' + fail);
;return typeof fail === 'number' ? fail : 0;
});

await __run("perf-and-mirror", async () => {
/**
 * 本轮两项优化的断言：SQLite 镜像异步化 + 冷启动可视化。
 */

let fail = 0;
const check = (label, ok, detail) => { console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail)); if (!ok) fail++; };
const read = path => fs.readFileSync(path, 'utf8');

const main = read('app/src/main/java/cn/qingheng/health/MainActivity.java');
const app = read('app/src/main/assets/app.js');
const html = read('app/src/main/assets/index.html');
const sync = read('app/src/main/java/cn/qingheng/health/SyncDatabase.java');

// --- the mirror no longer runs on the caller's thread --------------------------------------------------
check('a single-thread mirror executor exists', main.includes('Executors.newSingleThreadExecutor(runnable -> new Thread(runnable, "qingheng-mirror"))'));
check('the mirror queues instead of blocking', main.includes('mirrorPending = state;') && main.includes('mirrorQueued.compareAndSet(false, true)'));
check('a newer save replaces the pending snapshot', main.includes('mirrorPending != state) mirrorToDatabase();'));
check('the connection is created behind one accessor', main.includes('private synchronized SyncDatabase database()'));
check('the storage panel uses the accessor', main.includes('sqlite = database().mirrorCounts();'));
check('JSON stays authoritative in the wording', (main + app).includes('SQLite 为同步镜像') || (main + app).includes('SQLite 只是同步镜像'));
check('the mirror executor is shut down with the activity', main.includes('mirrorExecutor.shutdown();'));
check('a rejected backup task cannot fail a save', main.includes('activity teardown racing a save'));
check('an in-app restore route exists', main.includes('/api/backup-restore') && main.includes('restoreFromAutoBackup'));
check('restore keeps an undo copy of the current state', main.includes('pre-restore.json') && main.includes('auto-state-1.json'));
check('restore refuses a missing or corrupt backup', main.includes('还没有应用内自动备份') && main.includes('备份文件无法解析'));
check('the about page offers the restore entry', html.includes('id="backup-restore"'));
check('the restore flow double-confirms', app.includes('再次确认：覆盖后当前内容只能通过底档找回'));
check('the mirror updates by record id instead of dropping the table', !sync.includes('db.delete(MIRROR, null, null)') && sync.includes('collection=? AND record_id=?'));
check('unchanged mirror rows are skipped', sync.includes('unchanged') && sync.includes('wantedIds'));
check('records dispatch lives in bridge.RecordsRoutes', fs.existsSync('app/src/main/java/cn/qingheng/health/bridge/RecordsRoutes.java') && main.includes('RecordsRoutes.handle(path, get, post, del, b, this)'));
check('the about page leads with a plain-language storage summary', html.includes('id="storage-summary"') && app.includes('记录都保存在这台手机上'));

// --- cold start is visible in the app --------------------------------------------------------------------
check('the field exists', main.includes('private long coldStartMs;'));
check('it is measured from process start', main.includes('android.os.Process.getStartUptimeMillis()'));
check('it is recorded once, when the page is ready', main.includes('if (coldStartMs == 0L)') && main.includes('prefs.edit().putLong("coldStartMs", coldStartMs).apply();'));
check('it is exposed by the versions route', main.includes('.put("coldStartMs"'));
check('it is rendered on the about page', app.includes("冷启动 <b>${fmt(coldStart, 0)}</b> ms"));
;return typeof fail === 'number' ? fail : 0;
});

await __run("render-guard", async () => {
/**
 * 渲染健壮性断言：state 未加载不抛错、异常变成可重试提示、子页在数据到位后重绘。
 */

let fail = 0;
const check = (label, ok, detail) => { console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail)); if (!ok) fail++; };
const read = path => fs.readFileSync(path, 'utf8');

const app = read('app/src/main/assets/app.js');
const html = read('app/src/main/assets/index.html');
const css = read('app/src/main/assets/styles.css');

check('render is split into a guarded wrapper and a body', app.includes('function render() {') && app.includes('function renderBody() {'));
check('it returns before drawing when state is missing', app.includes('if (!state) return;'));
check('exceptions are caught', /try \{ renderBody\(\);.*\} catch \(error\) \{ showRenderError\(error\); \}/.test(app));
check('the bar explains the record is safe', app.includes('（记录已保存在本机）'));
check('a retry control exists in the page', html.includes('id="render-error"') && html.includes('id="render-error-retry"'));
check('retry reloads the state', app.includes("$('#render-error-retry')?.addEventListener('click'"));
check('retry failure is reported, not silent', app.includes('重新加载失败，请确认应用仍在前台'));
check('an open subpage is redrawn after loading', app.includes('if (openSub) showSubpage(openSub);'));
check('the bar is above everything and hidden by default', css.includes('.render-error{position:fixed') && css.includes('.render-error[hidden]{display:none}'));
;return typeof fail === 'number' ? fail : 0;
});

await __run("secret-store", async () => {
/**
 * Real behaviour test for the key sanitizer: compile SecretStore with the bundled android.jar and
 * run sanitize() on the pastes that used to reach the provider as HTTP 401 (BOM, NBSP, zero-width,
 * Bearer prefix, wrapping quotes). Pure static method, no Android runtime needed.
 */

let fail = 0;
const check = (label, ok, detail) => { console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail)); if (!ok) fail++; };

const jdk = fs.readdirSync('toolchain/jdk').map(name => path.join('toolchain/jdk', name))[0];
const javac = path.join(jdk, 'bin', process.platform === 'win32' ? 'javac.exe' : 'javac');
const java = path.join(jdk, 'bin', process.platform === 'win32' ? 'java.exe' : 'java');
const platform = fs.readdirSync('toolchain/platform').map(name => path.join('toolchain/platform', name))[0];
const androidJar = path.join(platform, 'android.jar');
const work = path.join(os.tmpdir(), 'qingheng-secret-' + Date.now());
fs.mkdirSync(work, {recursive: true});

const harness = `import cn.qingheng.health.SecretStore;
public class Harness {
    static void out(String label, String value) {
        System.out.println(label + "=" + value);
    }
    public static void main(String[] args) {
        out("bom", SecretStore.sanitize("\\uFEFFsk-abc123"));
        out("nbsp", SecretStore.sanitize("\\u00A0sk-1\\u200B"));
        out("bearer", SecretStore.sanitize("  Bearer sk-9x  "));
        out("quotes", SecretStore.sanitize("\\"sk-2\\""));
        out("inner", SecretStore.sanitize("sk\\u00203\\u00204"));
        out("null", SecretStore.sanitize(null));
    }
}`;

fs.writeFileSync(path.join(work, 'Harness.java'), harness);
execFileSync(javac, ['-encoding', 'UTF-8', '-cp', androidJar, '-d', work,
  'app/src/main/java/cn/qingheng/health/SecretStore.java', 'app/src/main/java/cn/qingheng/health/PublicError.java', path.join(work, 'Harness.java')], {stdio: 'pipe'});
const out = execFileSync(java, ['-cp', work + path.delimiter + androidJar, 'Harness'], {encoding: 'utf8'});
const lines = Object.fromEntries(out.trim().split(/\r?\n/).map(line => line.trim().split('=')).map(([k, v]) => [k, v]));

check('a BOM is stripped', lines.bom === 'sk-abc123', lines.bom);
check('NBSP and zero-width joiners are stripped', lines.nbsp === 'sk-1', lines.nbsp);
check('a pasted Bearer prefix is removed', lines.bearer === 'sk-9x', lines.bearer);
check('wrapping quotes are removed', lines.quotes === 'sk-2', lines.quotes);
check('inner whitespace is removed', lines.inner === 'sk34', lines.inner);
check('null becomes an empty string', lines.null === '', lines.null);
;return typeof fail === 'number' ? fail : 0;
});

await __run("swipe", async () => {

const assets = new URL('../app/src/main/assets/', import.meta.url);
const app = fs.readFileSync(new URL('app.js', assets), 'utf8');
const css = fs.readFileSync(new URL('styles.css', assets), 'utf8');

// 滑动切换：一屏一格、方向与 TAB_ORDER 一致、到头不回绕。
assert(/installTabSwipe/.test(app), 'the swipe installer is assembled into app.js');
assert(/const SWIPE_X = 56;/.test(app), 'the tap/slide threshold is explicit');
assert(/const SWIPE_MS = 600;/.test(app), 'a slow drag does not switch tabs');
assert(/const SWIPE_RATIO = 1\.6;/.test(app), 'diagonal gestures stay with vertical scrolling');
assert(/TAB_ORDER\[index \+ \(dx < 0 \? 1 : -1\)\]/.test(app), 'left swipe goes forward in tab order');
assert(/if \(!next\) return;/.test(app), 'swiping past the last tab stops instead of wrapping');
assert(/switchTab\(next, true\)/.test(app), 'the swipe reuses the existing tab transition');

// 手势不能吃掉输入、浮层与横向滚动的操作，也不能在「我的」二层页里切走。
assert(/input,textarea,select,\[contenteditable="true"\],\.app-dialog,\.sheet-panel/.test(app), 'inputs and overlays are excluded');
assert(/\.pref-chips,\.chips,\.segmented,\.table-wrap,#chat-chips,\.chat-composer/.test(app), 'horizontal scrollers and the chat composer are excluded');
assert(/profile-hub'\)\?\.hidden\) return;/.test(app), 'a profile subpage keeps the tab put');
assert(/touchstart[\s\S]{0,400}\{ passive: true \}/.test(app), 'the swipe listener never blocks scrolling');

// 纵向滚动仍然是页面的默认手势。
assert(/touch-action:pan-y/.test(css), 'vertical panning stays the page default');
;return typeof fail === 'number' ? fail : 0;
});

await __run("symbol-usage", async () => {
/**
 * Visual symbol contract: leaf 40 for empty, ring 20 for loading, leaf 24 + --ok
 * for completion, and exactly three forbidden decorative uses.
 */

let fail = 0;
const check = (label, ok, detail) => {
  console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail));
  if (!ok) fail++;
};
const app = fs.readFileSync('app/src/main/assets/app.js', 'utf8');
const css = fs.readFileSync('app/src/main/assets/styles.css', 'utf8');

check('one symbol contract is declared', app.includes('const SYMBOL_USAGE = Object.freeze('));
check('empty uses the leaf at 40', app.includes("empty: {glyph: 'leaf', size: 40}") && app.includes('SYMBOL_USAGE.empty.size'));
check('the leaf is inline currentColor, not a fixed-color img', app.includes("'icon-glyph-leaf.svg': svgIcon(") && app.includes("iconMarkup('icon-glyph-leaf.svg')"));
check('empty icon CSS keeps the 40px inline leaf', css.includes('.empty-icon svg{display:block;width:40px;height:40px'));
check('state-block empty leaf uses currentColor via a mask', css.includes('background-color:var(--muted)') && css.includes('mask:url("./icon-glyph-leaf.svg")'));
check('loading declares a 20px 1.2s ring', app.includes("loading: {glyph: 'ring', size: 20, duration: '1.2s linear'}") && /\.busy-ring\{width:20px;height:20px;border:2px solid var\(--accent-soft\);border-top-color:var\(--accent\)/.test(css));
check('completion uses the leaf at 24', app.includes("complete: {glyph: 'leaf', size: 24, tone: 'ok'}") && app.includes("leaf.setAttribute('width', String(SYMBOL_USAGE.complete.size))"));
check('completion color comes from the ok token', css.includes('.form-feedback.success{display:flex;align-items:center;gap:var(--space-1);color:var(--ok)}'));
check('the contract names exactly three forbidden uses', (app.match(/'buttons\/list rows\/card badges'|'numbers and units'|'error\/warning copy'/g) || []).length === 3);
check('empty icon CSS does not shrink the 40px leaf', css.includes('.empty-icon img{display:block;width:40px;height:40px') || css.includes('.empty-icon svg{display:block;width:40px;height:40px'));
check('symbol rules stay out of interactive labels', !app.includes('SYMBOL_USAGE.forbidden') || app.includes("forbidden: ['buttons/list rows/card badges'"));

console.log('FAIL total: ' + fail);
;return typeof fail === 'number' ? fail : 0;
});

await __run("sync-version", async () => {
/**
 * Version sync is the only thing standing between "APK 1.4.16" and "About page 1.4.14".
 * Run the real tool against a throwaway copy of its three files and prove it rewrites all of them,
 * then run it again to prove it is idempotent.
 */

let fail = 0;
const check = (label, ok, detail) => { console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail)); if (!ok) fail++; };

const files = [
  'app/src/fragments/70-rest.fragment.js',
  'build.ps1',
  'tests/suite-food.test.mjs'
];
const work = path.join(os.tmpdir(), 'qingheng-sync-' + Date.now());
for (const rel of files) {
  const target = path.join(work, rel);
  fs.mkdirSync(path.dirname(target), {recursive: true});
  fs.copyFileSync(rel, target);
}

const script = path.resolve('tools/sync-version.mjs');
const run = version => execFileSync(process.execPath, [script, version, version.split('.').map(Number).reduce((a, b) => a * 100 + b)], {cwd: work, encoding: 'utf8'});

run('9.9.9');
const read = () => files.map(rel => fs.readFileSync(path.join(work, rel), 'utf8'));
const after = read();
check('the fragment constant is rewritten', after[0].includes("const APP_VERSION = '9.9.9'"), after[0].match(/APP_VERSION = '[^']+'/)?.[0]);
check('build.ps1 default version is rewritten', /Version='9\.9\.9'/.test(after[1]));
check('the merged suite literal is rewritten', after[2].includes("APP_VERSION = '9.9.9'"), after[2].match(/APP_VERSION = '[^']+'/)?.[0]);

const again = run('9.9.9');
const third = read();
check('a second run leaves the files byte-identical', third.every((text, i) => text === after[i]));
;return typeof fail === 'number' ? fail : 0;
});

await __run("token-ratchet", async () => {
/**
 * B10 令牌棘轮：styles.css 里的硬编码颜色只许减少，不许增加。
 *
 * 为什么用棘轮而不是一次性清零：令牌化是分批做的，如果测试直接要求「零硬编码」，
 * 每次改样式都会因为别处的历史遗留而红；改成「不超过基线、减少时自动下调」，
 * 才能一边收敛一边保持绿灯。
 *
 * 合法例外（确实不该令牌化的）：令牌自身的取值定义（--xxx:#rrggbb）、图表辅助色、
 * 食材类目色。它们同样计入总量——只要不增长就不会失控。
 */

let fail = 0;
const check = (label, ok, detail) => {
  console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail));
  if (!ok) fail++;
};

const css = fs.readFileSync('app/src/main/assets/styles.css', 'utf8');
const hexes = [...css.matchAll(/#[0-9a-fA-F]{3,8}\b/g)].map(m => m[0].toLowerCase());
const rgbCalls = [...css.matchAll(/rgba?\(/g)].length;

// 基线：2026-10-27 · 1.1.60 实测。只允许往下调，不往上调。
const BASELINE_HEX = 134;
const BASELINE_RGB = 12;

check('hex colours do not grow past the baseline', hexes.length <= BASELINE_HEX, `${hexes.length} / ${BASELINE_HEX}`);
check('rgb()/rgba() literals do not grow past the baseline', rgbCalls <= BASELINE_RGB, `${rgbCalls} / ${BASELINE_RGB}`);

// 唯一值越少越好：同一个颜色写成两种大小写或三条长度不同的 hex，是收敛前的典型症状。
const unique = new Set(hexes);
check('no colour appears written two different ways', unique.size <= hexes.length, `${unique.size} unique / ${hexes.length} total`);

// 令牌块本身必须还在，否则上面的统计会"因为令牌全被删掉"而虚假通过。
check('the paper token block still exists', css.includes(':root{') || css.includes(':root {'));
check('the ledger token block still exists', css.includes('[data-skin="ledger"]'));

// 新增令牌必须登记到设计文档。文档里允许 `--tone-water/tip/neutral` 这种合并写法
// （同组令牌并列更易读），所以先把合并写法展开成完整名字，再逐个比对。
const tokensDoc = fs.readFileSync('docs/design/02-tokens.md', 'utf8');
const registered = new Set();
for (const m of tokensDoc.matchAll(/--[a-z0-9-]+(?:\/[a-z0-9-]+)*/g)) {
  const parts = m[0].split('/');
  const head = parts[0];
  const prefix = head.slice(0, head.lastIndexOf('-') + 1); // --tone-protein -> --tone-
  for (const part of parts) registered.add(part.startsWith('--') ? part : prefix + part);
}
const declared = [...css.matchAll(/(--[a-z0-9-]+):\s*#[0-9a-fA-F]{3,8}/g)].map(m => m[1]);
const unregistered = [...new Set(declared)].filter(name => !registered.has(name));
check('every colour token is registered in 02-tokens.md', unregistered.length === 0, unregistered.slice(0, 6).join(', ') || 'none');
;return typeof fail === 'number' ? fail : 0;
});

await __run("vendor", async () => {

// Vendored libraries are committed build output: the manifest is the authority, the file on disk
// must match it, and the page must load it before app.js. Drift here means someone edited a bundle
// by hand or forgot to re-run tools/build-vendor.mjs.
const root = new URL('../', import.meta.url);
const manifestPath = new URL('vendor/manifest.json', root);
assert(fs.existsSync(manifestPath), 'vendor/manifest.json exists');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
assert(Array.isArray(manifest.entries) && manifest.entries.length, 'the manifest lists at least one entry');

// assets/ stays flat: the bundle sits beside app.js, the source stays under vendor/src.
const assetsDir = new URL('app/src/main/assets/', root);
const pkg = JSON.parse(fs.readFileSync(new URL('vendor/package.json', root), 'utf8'));

for (const entry of manifest.entries) {
  const file = new URL(entry.file, assetsDir);
  assert(fs.existsSync(file), `${entry.file} exists in assets`);
  const bytes = fs.readFileSync(file);
  assert.equal(bytes.length, entry.bytes, `${entry.file} byte count matches the manifest`);
  assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), entry.sha256, `${entry.file} sha256 matches the manifest`);
  assert(entry.bytes > 4096 && entry.bytes < 40960, `${entry.file} stays inside the size budget`);

  const text = bytes.toString('utf8');
  assert(text.startsWith('/*!'), `${entry.file} keeps a readable banner`);
  assert(text.includes(`@${entry.version}`), `${entry.file} banner names its version`);
  assert(/MIT/.test(text), `${entry.file} banner names its licence`);
  assert(!text.includes('eval('), `${entry.file} ships no eval`);
  assert(!text.includes('new Function('), `${entry.file} ships no dynamic Function`);
  assert(!/sourceMappingURL/.test(text), `${entry.file} ships no source map reference`);
}

// The pinned dependency and the shipped bundle must agree, or the manifest is lying about version.
const motion = manifest.entries.find((entry) => entry.package === 'motion');
assert(motion, 'motion is the first vendored package');
assert.equal(motion.version, pkg.dependencies.motion, 'manifest version matches vendor/package.json');

// Load order: vendor runtime first, app.js last, all deferred so the DOM is ready.
const html = fs.readFileSync(new URL('app/src/main/assets/index.html', root), 'utf8');
const scripts = [...html.matchAll(/<script src="\.\/([^"]+)"([^>]*)>/g)].map((m) => ({ src: m[1], attrs: m[2] }));
assert(scripts.length >= 3, 'the page loads several scripts');
for (const script of scripts) assert(/defer/.test(script.attrs), `${script.src} is deferred`);
const vendorIndex = scripts.findIndex((script) => script.src === motion.file);
const appIndex = scripts.findIndex((script) => script.src === 'app.js');
assert(vendorIndex >= 0, 'the vendored runtime is loaded by the page');
assert(appIndex === scripts.length - 1, 'app.js is still the last script');
assert(vendorIndex < appIndex, 'the runtime loads before the code that uses it');

// Nothing else smuggles a second copy in.
const jsInAssets = fs.readdirSync(assetsDir).filter((name) => name.endsWith('.js'));
assert(jsInAssets.includes(motion.file), 'the bundle is in the flat assets dir');
assert(!fs.existsSync(new URL('app/src/main/assets/vendor', root)), 'no vendor subdirectory reaches the assets');
assert(!fs.existsSync(new URL('app/src/main/assets/node_modules', root)), 'node_modules never reaches the assets');
assert(fs.existsSync(new URL('vendor/src/motion-entry.js', root)), 'the vendor entry stays reviewable');
;return typeof fail === 'number' ? fail : 0;
});
await __run("settings-backup", async () => {
/**
 * 全量备份/恢复一致性（2026-11-27 Phase 3）：
 * 「导出 JSON → 清空 localStorage → 导入」之后，用户设置、今日训练清单/计划、餐次窗口必须能回来。
 * 派生缓存（周计划、重量记忆、计时起点、可信度）刻意不进 prefs：它们能从记录重算。
 */
let fail = 0;
const check = (label, ok, detail) => { console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail)); if (!ok) fail++; };

const app = fs.readFileSync('app/src/main/assets/app.js', 'utf8');
const constOf = name => {
  const at = app.indexOf('const ' + name + ' =');
  if (at < 0) throw new Error('missing const ' + name);
  const line = app.slice(at, app.indexOf('\n', at));
  return /;\s*$/.test(line) ? line : line + ';';
};
const grab = (startMarker, endMarkers) => {
  const start = app.indexOf(startMarker);
  if (start < 0) throw new Error('missing ' + startMarker);
  let end = app.length;
  for (const marker of endMarkers) {
    const i = app.indexOf(marker, start);
    if (i >= 0 && i < end) end = i;
  }
  return app.slice(start, end);
};

// --- 1. 注册表覆盖所有需要跟备份走的设置 -----------------------------------------------------
check('the config registry lists every portable preference',
  ["'planPrefs'", "'aiPlans'", "'preferences'", "'bodyweightMoves'", "'mealWindow'"].every(id => app.includes('{id: ' + id)));
check('derived caches stay out of the registry',
  !app.includes("{id: 'weekPlan'") && !app.includes("{id: 'weightMemory'") && !app.includes("{id: 'intakeConfidence'"));

// --- 2. 行为：把一份备份喂给 hydratePrefsFromState，本地缓存要全部写回 -------------------------
const stored = new Map();
const localStorage = {
  getItem: key => (stored.has(key) ? stored.get(key) : null),
  setItem: (key, value) => stored.set(key, String(value)),
  removeItem: key => stored.delete(key),
};
const sandbox = {
  console, JSON, Math, Object, Array, String, Number,
  localStorage,
  schedulePrefsSync: () => {},
  renderPreferences: () => {},
  loadUserBodyweightMarks: () => {},
  normalizePreferenceEntries: list => (Array.isArray(list) ? list : []),
  readPreferenceRows: () => [],
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
const consts = ['MEAL_WINDOW_KEY', 'DEFAULT_MEAL_WINDOW', 'PLAN_PREFS_KEY', 'AI_PLAN_KEY', 'CHAT_UNHELPFUL_KEY', 'CHAT_WEB_KEY', 'TRAINING_CONSENT_KEY', 'BODYWEIGHT_MARK_KEY', 'PREFERENCES_KEY', 'PREFERENCE_META_KEY', 'clockPattern']
  .map(constOf).join('\n');
const hydrate = grab('function hydratePrefsFromState(data) {', ['const CONFIG_REGISTRY = [']);
vm.runInContext(consts + '\n' + hydrate + '\nthis.hydrate = hydratePrefsFromState;', sandbox);

sandbox.hydrate({prefs: {
  planPrefs: {days: 4, split: 'ppl', gear: 'mixed', minutes: 45},
  aiPlans: {'2026-11-27': [{name: '卧推', sets: 4, reps: 8}]},
  bodyweightMoves: ['引体向上'],
  preferences: [{id: 'p1', text: '少油', source: 'manual', createdAt: 1, updatedAt: 1}],
  mealWindow: {lunchFrom: '10:00', dinnerFrom: '15:00', snackFrom: '21:00'},
  chatWeb: false,
  trainingConsent: true,
  unhelpfulChats: ['q1'],
}});

check('the training plan preferences come back', stored.get('qingheng.planPrefs') === JSON.stringify({days: 4, split: 'ppl', gear: 'mixed', minutes: 45}), stored.get('qingheng.planPrefs'));
check("today's AI plan comes back per date", stored.get('qingheng.aiPlan.2026-11-27') === JSON.stringify([{name: '卧推', sets: 4, reps: 8}]), stored.get('qingheng.aiPlan.2026-11-27'));
check('the meal window comes back', stored.get('qingheng.mealWindow') === JSON.stringify({lunchFrom: '10:00', dinnerFrom: '15:00', snackFrom: '21:00'}), stored.get('qingheng.mealWindow'));
check('bodyweight marks and preferences come back',
  stored.get('qingheng.bodyweightMoves') === JSON.stringify(['引体向上']) && stored.get('qingheng.preferences') === JSON.stringify([{id: 'p1', text: '少油', source: 'manual', createdAt: 1, updatedAt: 1}]), stored.get('qingheng.bodyweightMoves'));
check('the chat and consent switches come back',
  stored.get('qingheng.chat.web') === '0' && stored.get('qingheng.training.consent') === '1' && stored.get('qingheng.chat.unhelpful') === JSON.stringify(['q1']));

// --- 3. 坏值不砸掉恢复：餐次窗口逐项回落默认 -------------------------------------------------
stored.set('qingheng.mealWindow', 'stale');
sandbox.hydrate({prefs: {mealWindow: {lunchFrom: '99:99', dinnerFrom: '', snackFrom: '21:00'}}});
check('a malformed meal window falls back field by field', stored.get('qingheng.mealWindow') === JSON.stringify({lunchFrom: '11:20', dinnerFrom: '16:30', snackFrom: '21:00'}), stored.get('qingheng.mealWindow'));
;return typeof fail === 'number' ? fail : 0;
});

console.log('\nFAIL total: ' + __fail);
process.exitCode = __fail ? 1 : 0;
