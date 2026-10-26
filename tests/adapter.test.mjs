import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
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
assert(html.indexOf('native-adapter.js')<html.indexOf('app.js'));assert.match(html,/name="apiKey" type="password"/);assert(!html.includes('login-dialog'));assert.match(app,/control\.type === 'password'/);assert.match(app,/form\.elements\.apiKey\.value=''/);assert.deepEqual([...app.matchAll(/localStorage\.(?:setItem|getItem)\('([^']+)'/g)].map(m=>m[1]),['qingheng.tab','qingheng.tab','qingheng.chat.unhelpful','qingheng.chat.unhelpful','qingheng.training.consent','qingheng.training.consent','qingheng.chat.web','qingheng.chat.web']);assert(!app.includes('state.settings.apiKey'));assert.match(html,/capture="environment"/);
assert.match(html,/id="view-chat"/);assert.match(html,/data-tab="chat"/);assert.match(html,/id="push-form"/);assert.match(app,/'today','records','chat','trends','profile'/);
const navOrder=[...html.matchAll(/data-tab="([a-z]+)"/g)].map(m=>m[1]);assert.deepEqual(navOrder,['today','records','chat','trends','profile'],'chat tab sits in the middle');
console.log('PASS adapter acceptance: browser persistence/seed once, CRUD and local draft confirmation dedup, actionable local advice, strict offline food estimates, provider defaults/switching, key non-readback/storage boundaries, no browser external calls, native routing/vision gate/fail-closed Android host, 90s timeout, UI source privacy invariants.');
console.log('Native Java persistence/import/SAF and actual DOM behavior are NOT exercised by this VM suite.');
