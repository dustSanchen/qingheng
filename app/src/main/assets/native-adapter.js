'use strict';
(() => {
  const originalFetch = window.fetch.bind(window);
  const hasNative = () => !!window.QinghengNative && typeof window.QinghengNative.request === 'function';
  const androidPage = location.protocol === 'file:' || ['appassets.androidplatform.net','app.qingheng.local'].includes(location.hostname);
  const defaults = {
    deepseek: {baseUrl:'https://api.deepseek.com',model:'deepseek-flash',visionModel:'deepseek-flash',visionEnabled:true,apiConfigured:false},
    bai: {baseUrl:'https://api.b.ai/v1',model:'',visionModel:'',visionEnabled:false,apiConfigured:false},
    siliconflow: {baseUrl:'https://api.siliconflow.cn/v1',model:'',visionModel:'',visionEnabled:false,apiConfigured:false}
  };
  const copy = value => JSON.parse(JSON.stringify(value));
  let settings = {provider:'deepseek',...defaults.deepseek,providers:copy(defaults)};
  const pending = new Map(); let sequence = 0;
  window.__nativeReply = reply => {
    if (typeof reply === 'string') {try {reply=JSON.parse(reply);} catch {return;}}
    const item = pending.get(String(reply?.id)); if (!item) return;
    item.finish();
    if (reply.ok) item.resolve(reply.data); else item.reject(new Error(typeof reply.error==='string' ? reply.error : reply.error?.message || '手机本地操作失败。'));
  };
  function nativeRequest(path, method='GET', body, signal) {
    return new Promise((resolve,reject) => {
      if (!hasNative()) {reject(new Error('手机原生桥接未加载；请使用 APK，不会改用浏览器存储。'));return;}
      const id=`web-${Date.now()}-${++sequence}`;
      const finish=()=>{clearTimeout(timer);pending.delete(id);signal?.removeEventListener('abort',abort);};
      const abort=()=>{finish();const error=new Error('操作已取消，保存可能已完成；请检查记录后再重试。');error.name='AbortError';reject(error);};
      const timer=setTimeout(()=>{finish();reject(new Error('手机操作超过 90 秒。保存可能已完成，请重新加载检查，勿重复提交。'));},90000);
      pending.set(id,{resolve,reject,finish});
      if (signal?.aborted) {abort();return;} signal?.addEventListener('abort',abort,{once:true});
      try {window.QinghengNative.request(JSON.stringify({id,path,method,body:body===undefined?null:body}));} catch(error) {finish();reject(error);}
    });
  }
  function safeSettings(data) {
    const provider=['deepseek','bai','siliconflow'].includes(data?.provider)?data.provider:'deepseek', providers={};
    for (const key of ['deepseek','bai','siliconflow']) {
      const source=data?.providers?.[key] || (key===provider?data:{}), base=defaults[key];
      providers[key]={baseUrl:typeof source?.baseUrl==='string'?source.baseUrl:base.baseUrl,model:typeof source?.model==='string'?source.model:base.model,visionModel:typeof source?.visionModel==='string'?source.visionModel:'',visionEnabled:source?.visionEnabled===true,allowExternal:source?.allowExternal===true,apiConfigured:source?.apiConfigured===true};
    }
    return {provider,...providers[provider],providers};
  }
  const storeKey='qingheng-android-browser-demo-v1'; let demoPromise;
  const pushDefaults={enabled:false,morningTime:'07:00',eveningTime:'20:30',analysisEnabled:false};
  let pushSettings={...pushDefaults};
  const HHMM=/^([01]\d|2[0-3]):[0-5]\d$/;
  const localDate=(date=new Date())=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
// /api/chat 与 /api/chat/stream 共用一个字段白名单。白名单漏一个字段，原生侧对应的分支就永远不生效：
// 2026-11-07「用 AI 排今天」报错就是这么来的——focus/tier/library 全被丢掉，清单提示词从未到达模型。
const chatNativeBody=(body,image)=>({
  question:String(body?.question||'').trim(),
  date:body?.date || localDate(),
  ...(body?.photoTakenAt?{photoTakenAt:body.photoTakenAt}:{}),
  ...(body?.photoTimeSource?{photoTimeSource:body.photoTimeSource}:{}),
  history:Array.isArray(body?.history)?body.history.slice(-20):[],
  allowExternal:true,
  ...(typeof body?.anchors==='string'&&body.anchors?{anchors:body.anchors}:{}),
  ...(typeof body?.focus==='string'&&body.focus?{focus:body.focus}:{}),
  ...(body?.tier==='fast'?{tier:'fast'}:{}),
  ...(typeof body?.library==='string'&&body.library?{library:body.library}:{}),
  webSearch:body?.webSearch===true,
  ...(image?{image}:{})
});
  const healthOnly=data=>({profile:data?.profile && typeof data.profile==='object'?copy(data.profile):{},measurements:Array.isArray(data?.measurements)?copy(data.measurements):[],meals:Array.isArray(data?.meals)?copy(data.meals):[],habits:Array.isArray(data?.habits)?copy(data.habits):[],chats:Array.isArray(data?.chats)?copy(data.chats):[],...(Array.isArray(data?.estimateDrafts)?{estimateDrafts:copy(data.estimateDrafts)}:{}),...(Array.isArray(data?.activities)?{activities:copy(data.activities)}:{}),...(Array.isArray(data?.healthConnectRecords)?{healthConnectRecords:copy(data.healthConnectRecords)}:{}),...(data?.healthConnect && typeof data.healthConnect==='object'?{healthConnect:copy(data.healthConnect)}:{}) ,...(data?.temporaryTargets && typeof data.temporaryTargets==='object'?{temporaryTargets:copy(data.temporaryTargets)}:{})});
  function mergePush(data) {
    const enabled=data?.enabled===true;
    pushSettings={enabled,morningTime:HHMM.test(data?.morningTime||'')?data.morningTime:pushSettings.morningTime,eveningTime:HHMM.test(data?.eveningTime||'')?data.eveningTime:pushSettings.eveningTime,analysisEnabled:enabled && data?.analysisEnabled===true,canScheduleExact:data?.canScheduleExact===true,notificationsGranted:data?.notificationsGranted===true};
    return copy(pushSettings);
  }
  // Browser-only demo; never opened in Android and never includes credentials/settings.
  async function demoState() {
    if (!demoPromise) demoPromise=(async()=>{
      const stored=localStorage.getItem(storeKey);
      if(stored) {try{return healthOnly(JSON.parse(stored));}catch{throw new Error('浏览器演示数据损坏，请导出或清理演示存储。');}}
      let seed={}; try {const response=await originalFetch('./seed.json');if(response.ok)seed=await response.json();}catch{/* Empty demo when seed unavailable. */}
      const data=healthOnly(seed);localStorage.setItem(storeKey,JSON.stringify(data));return data;
    })();
    return demoPromise;
  }
  async function demo(path, method, body) {
    const state=await demoState(), save=()=>localStorage.setItem(storeKey,JSON.stringify(healthOnly(state)));
    if(state.temporaryTargets?.status==='active'&&state.temporaryTargets.effectiveDate<localDate()){delete state.temporaryTargets;save();}
    if(path==='/api/settings') {
      if(method!=='GET') {
        if(body?.apiKey) throw new Error('API Key 只能在 APK 中保存；浏览器演示不保存密钥，也不请求外部模型。');
        const provider=['deepseek','bai','siliconflow'].includes(body?.provider)?body.provider:'deepseek';
        settings.providers[provider]={...settings.providers[provider],...Object.fromEntries(['baseUrl','model','visionModel','visionEnabled','allowExternal'].filter(k=>body?.[k]!==undefined).map(k=>[k,body[k]])),apiConfigured:false};
        settings=safeSettings({provider,providers:settings.providers});
      }
      return copy(settings);
    }
    if(path==='/api/push') {
      if(method!=='GET') {
        if(body?.enabled===true) throw new Error('推送需要已安装的 APK；浏览器演示不能设置手机通知。');
        pushSettings={...pushSettings,enabled:false,analysisEnabled:false};
      }
      return copy(pushSettings);
    }
    if(path==='/api/drafts') {
      const drafts=Array.isArray(state.estimateDrafts)?state.estimateDrafts:[];
      if(method==='GET') return {drafts:copy(drafts)};
      if(method==='DELETE') {state.estimateDrafts=[];save();return {drafts:[]};}
      const draft=body?.draft;
      if(!draft || typeof draft.id!=='string' || !draft.id) throw new Error('草稿格式不正确。');
      state.estimateDrafts=[copy(draft),...drafts.filter(row=>row?.id!==draft.id)].slice(0,5);save();
      return {drafts:copy(state.estimateDrafts)};
    }
    if(path.startsWith('/api/drafts/') && method==='DELETE') {
      const id=decodeURIComponent(path.slice('/api/drafts/'.length));
      state.estimateDrafts=(Array.isArray(state.estimateDrafts)?state.estimateDrafts:[]).filter(row=>row?.id!==id);save();
      return {drafts:copy(state.estimateDrafts)};
    }
    if(path==='/api/context-preview') throw new Error('浏览器演示不发送数据到外部模型，无法预览将要发送的内容。');
    if(path==='/api/chat') {
      if(path==='/api/push-history') return {records:[]};
      throw new Error('AI 问答需要已安装的 APK 和你的 API Key；浏览器演示不请求外部模型。');
    }
    if(path==='/api/notification-test') throw new Error('测试通知需要已安装的 APK。');
    if(path==='/api/key-info') return {configured:false};
    if(path==='/api/health-connect/status') return {supported:false,available:false,permissionsGranted:false,databaseRecords:0};
    if(path==='/api/health-connect/sync') throw new Error('Health Connect 同步需要已安装的 APK。');
    if(path==='/api/state')return {...copy(state),settings:copy(settings)};
    if(path==='/api/export')return {...copy(state),version:1};
    if(path==='/api/profile' && method!=='GET') {state.profile={...state.profile,...body};save();return copy(state.profile);}
    if(path==='/api/target-adjustment') {
      if(method==='GET') return state.temporaryTargets ? {...copy(state.temporaryTargets),active:true} : {active:false};
      if(body?.action==='clear') {delete state.temporaryTargets;save();return {active:false,removed:true};}
      const today=localDate(), date=new Date(`${today}T00:00:00`);date.setDate(date.getDate()+1);
      const tomorrow=localDate(date), p=state.profile||{}, target=numeric(p.calorieTarget), fatMin=numeric(p.fatMin), fatMax=numeric(p.fatMax);
      const rows=state.meals.filter(row=>row.date===today), calories=rows.length&&rows.every(row=>numeric(row.calories ?? row.totals?.calories)!==null)?rows.reduce((sum,row)=>sum+Number(row.calories ?? row.totals?.calories),0):null;
      if(calories===null||target===null||fatMin===null||fatMax===null)throw new Error('当天热量记录或个人目标不完整，无法调整明日目标。');
      if(calories<=target+Math.max(50,target*.05))throw new Error('当前摄入尚未明显超过目标，不需要调整明日目标。');
      // The one-day reduction must respect the 口径 floor and must never push the target below it;
      // a target already at or under the floor is a reason to look at the records, not to cut more.
      const safety=numeric(p.intakeFloor) ?? (p.sex==='female'?1200:1500);
      if(target<=safety)throw new Error(`当前热量目标已不高于日摄入硬底线 ${safety} kcal，不应再下调；请先核对口径与当天记录。`);
      const floor=safety, adjustedCalories=Math.max(floor,Math.round((target-Math.min(250,Math.max(100,target*.1)))/50)*50), adjustedFatMax=Math.max(fatMin,Math.round(fatMax*.9));
      state.temporaryTargets={status:'active',triggerDate:today,effectiveDate:tomorrow,createdAt:Date.now(),triggerCalories:calories,original:{calorieTarget:target,fatMin,fatMax},temporary:{calorieTarget:adjustedCalories,fatMin,fatMax:adjustedFatMax}};save();return {...copy(state.temporaryTargets),active:true};
    }
    if(path==='/api/import' && method!=='GET') {
      const input=healthOnly(body); state.profile={...state.profile,...input.profile};
      for(const key of ['measurements','habits','meals'])for(const row of input[key]) {
        const identity=key==='meals'?(row.id || row.estimateId || JSON.stringify(row)):row.date;
        const index=state[key].findIndex(old=>(key==='meals'?(old.id || old.estimateId || JSON.stringify(old)):old.date)===identity);
        if(index>=0)state[key][index]={...state[key][index],...row};else state[key].push(row);
      }
      save();return {ok:true};
    }
    const deleted=path.match(/^\/api\/meals\/([^/]+)$/);
    if(deleted && method==='DELETE') {state.meals=state.meals.filter(row=>String(row.id)!==decodeURIComponent(deleted[1]));save();return {ok:true};}
    for(const key of ['measurements','meals','habits'])if(path===`/api/${key}`) {
      if(method==='GET')return copy(state[key]);
      const previous=key==='meals'?(body.estimateId?state.meals.find(row=>row.estimateId===body.estimateId):null):state[key].find(row=>row.date===body.date);
      if(previous) {if(key!=='meals')Object.assign(previous,body);save();return copy(previous);}
      const row={...body,id:body.id || `demo-${Date.now()}-${++sequence}`};state[key].push(row);save();return copy(row);
    }
    throw new Error('此演示不支持该操作。');
  }
  async function storageRequest(path, method, body, signal) {
    if(hasNative()) {
      const data=await nativeRequest(path,method,body,signal);
      if(path==='/api/settings') {settings=safeSettings(data);return copy(settings);}
      if(path==='/api/push') return mergePush(data);
      if(path==='/api/state') {settings=safeSettings(data?.settings || settings);return {...data,settings:copy(settings)};}
      return data;
    }
    if(androidPage)throw new Error('原生存储未连接。请重新打开 APK；健康数据不会退回 localStorage。');
    return demo(path,method,body);
  }
  // Real APK/demo pages load the shared food reference library before this adapter.
  // Retain the twelve anchors as a compatibility fallback for isolated adapter tests.
  // Values mirror food-models.js: USDA FoodData Central SR Legacy, per 100 g.
  const foods = [
    ['米饭',['米饭','熟米饭'],[130,2.69,.28,28.17]],['鸡胸肉',['鸡胸肉','生鸡胸肉'],[120,22.5,2.62,0]],
    ['西兰花',['西兰花'],[34,2.82,.37,6.64]],['鸡蛋',['鸡蛋'],[143,12.56,9.51,.72]],
    ['燕麦',['燕麦','干燕麦'],[379,13.15,6.52,67.7]],['牛奶',['牛奶','全脂牛奶'],[61,3.15,3.27,4.78]],
    ['香蕉',['香蕉'],[89,1.09,.33,22.84]],['苹果',['苹果'],[52,.26,.17,13.81]],
    ['土豆',['土豆'],[77,2.05,.09,17.49]],['豆腐',['豆腐'],[76,8.08,4.78,1.87]],
    ['橄榄油',['橄榄油'],[884,0,100,0]],['食用油',['食用油'],[884,0,100,0]]
  ];
  function localEstimate(body) {
    if(body?.image)throw new Error('离线不能识别照片。请填写已知食物与克重，或在 APK 配置经验证的视觉模型。');
    const parts=String(body?.text || '').split(/[，,、；;\n+]+/).map(x=>x.trim()).filter(Boolean),items=[];
    if(!parts.length)throw new Error('请填写食物与明确克重，例如：米饭 100g、鸡胸肉 150g。');
    for(const part of parts) {
      let match=part.match(/^(.+?)\s*(\d+(?:\.\d+)?)\s*(?:g|克)\s*$/i),name,grams;
      if(match){name=match[1].trim();grams=Number(match[2]);}
      else {match=part.match(/^(\d+(?:\.\d+)?)\s*(?:g|克)\s*(.+)$/i);if(match){name=match[2].trim();grams=Number(match[1]);}}
      if (window.QinghengFoods) {
        items.push(window.QinghengFoods.estimate(name, grams));
        continue;
      }
      const food=foods.find(row=>row[1].includes(name));
      if(!food || !Number.isFinite(grams) || grams<=0 || grams>20000)throw new Error(`无法离线估算「${part}」：只支持食物表中的明确克重，不会忽略未知食物。请改为手动记录或使用已授权外部模型。`);
      items.push({name:food[0],grams,...Object.fromEntries(['calories','protein','fat','carbs'].map((key,i)=>[key,Math.round(food[2][i]*grams)/100]))});
    }
    const totals=Object.fromEntries(['calories','protein','fat','carbs'].map(key=>[key,Math.round(items.reduce((sum,item)=>sum+item[key],0)*100)/100]));
    return {draftId:`local-${Date.now()}-${++sequence}`,source:'local',items,totals,confidence:'low',needsConfirmation:true,notes:['本地食物表取自 USDA FoodData Central，数值为每 100g 参考，不是检测结果。','米饭按熟重，鸡胸肉按生重；其他按可食部。烹调、品牌和份量会改变数值。','不含未明确列出的油、酱料及配菜；请逐项补全后确认。']};
  }
  const numeric=value=>value!==null && value!==undefined && value!=='' && Number.isFinite(Number(value))?Number(value):null;
  const mealNutrition=(row,key)=>numeric(row?.[key]) ?? numeric(row?.totals?.[key]);
  function nutritionTotals(meals,key) {
    if(!meals.length)return {value:null,complete:false};
    const values=meals.map(row=>mealNutrition(row,key));
    return {value:values.some(value=>value===null)?null:values.reduce((sum,value)=>sum+value,0),complete:values.every(value=>value!==null)};
  }
  function effectiveProfileForDate(state,date) {
    const profile={...(state?.profile||{})}, adjustment=state?.temporaryTargets;
    if(adjustment?.status==='active'&&adjustment.effectiveDate===date&&adjustment.temporary&&typeof adjustment.temporary==='object')Object.assign(profile,adjustment.temporary);
    return profile;
  }
  function localAdvice(state,date) {
    date=validDateForAdvice(date)?date:localDate();
    const meals=(Array.isArray(state?.meals)?state.meals:[]).filter(row=>row.date===date);
    const p=effectiveProfileForDate(state,date),messages=[];
    const totals=Object.fromEntries(['calories','protein','fat','carbs'].map(key=>[key,nutritionTotals(meals,key)]));
    const weights=(Array.isArray(state?.measurements)?state.measurements:[])
      .filter(row=>validDateForAdvice(row.date)&&row.date<=date&&numeric(row.weight)!==null&&Number(row.weight)>0)
      .sort((a,b)=>a.date.localeCompare(b.date));
    const from=new Date(`${date}T00:00:00Z`);from.setUTCDate(from.getUTCDate()-13);
    const cutoff=from.toISOString().slice(0,10),recentWeights=weights.filter(row=>row.date>=cutoff);
    const latestWeight=weights.at(-1),weightChange=recentWeights.length>=2?Number(recentWeights.at(-1).weight)-Number(recentWeights[0].weight):null;
    const height=numeric(p.height),age=numeric(p.age),goal=p.goal;
    const proteinMin=numeric(p.proteinMin),fatMin=numeric(p.fatMin),fatMax=numeric(p.fatMax),calorieTarget=numeric(p.calorieTarget);

    if(!meals.length) {
      messages.push('**先补齐今天每一餐**：把主食、蛋白质食物、蔬菜和烹调油都记下来，补全后才能判断是否需要加餐。');
    } else {
      const missing=['calories','protein','fat'].filter(key=>!totals[key].complete);
      if(missing.length)messages.push(`**补全营养数值**：现有 ${meals.length} 条餐食中仍有${missing.map(key=>({calories:'热量',protein:'蛋白质',fat:'脂肪'})[key]).join('、')}缺失；先改完预览里的克重和营养值。`);
    }

    if(meals.length&&totals.protein.complete&&proteinMin!==null) {
      const gap=proteinMin-totals.protein.value;
      if(gap>2) {
        const option=gap<=9?'1 个鸡蛋（约 6g 蛋白质）':gap<=18?'200g 无糖酸奶加 1 个鸡蛋（合计约 12~16g 蛋白质）':'一份约 20~25g 蛋白质的鱼肉、瘦肉、无糖酸奶或 150g 豆制品';
        messages.push(`**今天补蛋白质**：距离个人下限还差约 ${Math.round(gap)}g，下一餐可以选${option}；按实际包装或可食部重量记录。`);
      } else if(numeric(p.proteinMax)!==null&&totals.protein.value>Number(p.proteinMax)) {
        messages.push('**明天正常安排蛋白质**：今天已高于个人上限，下一餐不必再加蛋白粉或大份肉；按平时份量吃并继续记录。');
      }
    }

    if(meals.length&&totals.fat.complete&&fatMin!==null&&fatMax!==null) {
      if(totals.fat.value>fatMax)messages.push(`**明天减少脂肪**：做菜少放 5~10g 烹调油，优先蒸、煮、烤，避开油炸、肥肉、奶油和高脂零食；今天不必禁食补偿。`);
      else if(totals.fat.value<fatMin)messages.push(`**补一些健康脂肪**：还差约 ${Math.round(fatMin-totals.fat.value)}g，可加约 10g 坚果或 5~10g 植物油，不用油炸食品补。`);
    }

    if(meals.length&&totals.calories.complete&&calorieTarget!==null) {
      const delta=totals.calories.value-calorieTarget;
      if(delta>Math.max(50,calorieTarget*.05))messages.push(`**今天按原节奏收尾**：已记录热量超目标约 ${Math.round(delta)} kcal，不靠禁食或额外加练抵消；明天用少油烹调和较小主食份量自然收回。`);
      else if(-delta>250)messages.push(`**若今天还没结束且仍饥饿**：可以加一份约 200~300 kcal 的正餐组合，例如一份主食配鸡蛋或豆腐；若已饱，不为凑目标继续吃。`);
    }

    if(latestWeight) {
      const body=[age!==null?`${Math.round(age)} 岁`:'年龄未记录',height!==null?`身高 ${Math.round(height)}cm`:null].filter(Boolean).join('、');
      const direction=weightChange===null?'':weightChange>.15?'上升':weightChange<-.15?'下降':'基本稳定';
      const action=weightChange===null?'在相同时间再记录一次体重，至少两次后才比较变化'
        :(goal==='cut'||goal==='recomp')&&weightChange>.5?'接下来 3~5 天先把烹调油和高脂加餐各减一项，再看每日平均体重'
        :goal==='gain'&&weightChange<-.5?'接下来 3~5 天每天多安排一份约 100~200 kcal 的主食或蛋白质餐'
        :'接下来 3~5 天保持相同用餐与称重时间，用每日平均值判断是否继续';
      const change=weightChange===null?'':`，14 天${direction}${Math.abs(weightChange)>=.1?` ${fmtAdviceNumber(Math.abs(weightChange))}kg`:''}`;
      messages.push(`**按身体趋势校准**：${body?body+'的记录显示':''}最近体重 ${fmtAdviceNumber(latestWeight.weight)}kg${change}；${action}。`);
    } else if(meals.length&&height===null) {
      messages.push('**补一次身高和体重**：两项都记录后，建议会结合身高与真实体重趋势调整，不再只看当天热量。');
    }

    return {source:'local',messages:messages.slice(0,6),date};
  }
  const validDateForAdvice=value=>/^\d{4}-\d{2}-\d{2}$/.test(String(value||''))&&Number.isFinite(Date.parse(`${value}T00:00:00Z`));
  const fmtAdviceNumber=value=>Math.abs(Number(value)-Math.round(Number(value)))<.05?String(Math.round(Number(value))):String(Math.round(Number(value)*10)/10);
  function buildMarkdown(state) {
    const p = state?.profile || {};
    const rows = Array.isArray(state?.measurements) ? state.measurements.slice().sort((a, b) => String(a.date).localeCompare(String(b.date))) : [];
    const meals = Array.isArray(state?.meals) ? state.meals.slice().sort((a, b) => String(b.date).localeCompare(String(a.date))) : [];
    const habits = Array.isArray(state?.habits) ? state.habits.slice().sort((a, b) => String(b.date).localeCompare(String(a.date))) : [];
    const show = v => (v === null || v === undefined || v === '' ? '—' : String(v));
    const cell = v => show(v).replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
    const goalMap = {gain: '增肌', cut: '减脂', recomp: '增肌同时减脂', maintain: '保持身材'};
    const sexMap = {male: '男', female: '女'};
    const goals = Array.isArray(state?.goals) ? state.goals : [];
    const out = [];
    out.push('# 轻衡 · 身体数据导出', '');
    out.push(`导出时间：${localDate()}`, '');
    out.push('## 个人档案与目标', '');
    out.push(`- 性别：${sexMap[p.sex] || show(p.sex)}`);
    out.push(`- 身高：${show(p.height)} cm`);
    out.push(`- 年龄：${show(p.age)} 岁`);
    out.push(`- 饮食目标：${goalMap[p.goal] || '未设置'}`);
    out.push(`- 目标热量：${show(p.calorieTarget)} kcal／天`);
    out.push(`- 参考维持热量：${show(p.referenceCalories)} kcal／天`);
    out.push(`- 蛋白质：${show(p.proteinMin)}~${show(p.proteinMax)} g／天`);
    out.push(`- 脂肪：${show(p.fatMin)}~${show(p.fatMax)} g／天`, '');
    out.push('## 身体成分趋势', '');
    if (rows.length) {
      out.push('| 日期 | 体重 kg | 腰围 cm | 体脂率 % | 肌肉量 kg | 内脏脂肪 | 基础代谢 kcal |');
      out.push('| --- | --- | --- | --- | --- | --- | --- |');
      for (const row of rows) out.push(`| ${cell(row.date)} | ${cell(row.weight)} | ${cell(row.waist)} | ${cell(row.bodyFat)} | ${cell(row.muscle)} | ${cell(row.visceralFat)} | ${cell(row.bmr)} |`);
    } else out.push('暂无身体测量记录。');
    out.push('', '## 体重摘要', '');
    const weights = rows.filter(r => Number.isFinite(Number(r.weight)) && Number(r.weight) > 0);
    if (weights.length >= 2) {
      const values = weights.map(r => Number(r.weight));
      const recent = values.slice(-7);
      const avg = Math.round((recent.reduce((a, b) => a + b, 0) / recent.length) * 10) / 10;
      out.push(`- 记录次数：${weights.length}`);
      out.push(`- 首次：${weights[0].date} ${values[0]} kg`);
      out.push(`- 最近：${weights[weights.length - 1].date} ${values[values.length - 1]} kg`);
      out.push(`- 区间：${Math.min(...values)} ~ ${Math.max(...values)} kg`);
      out.push(`- 最近 ${recent.length} 次均值：${avg} kg`);
    } else out.push('数据不足（至少需要 2 次体重记录）。');
    out.push('', '## 饮食记录', '');
    if (meals.length) {
      const capped = meals.slice(0, 60);
      let currentDate = '';
      for (const meal of capped) {
        if (meal.date !== currentDate) {currentDate = meal.date; out.push(`### ${currentDate}`, '');}
        const type = {breakfast: '早餐', lunch: '午餐', dinner: '晚餐', snack: '加餐'}[meal.mealType] || meal.mealType || '餐食';
        out.push(`- **${type}** ${cell(meal.name || '未命名')}：${show(meal.calories)} kcal ｜ 蛋白 ${show(meal.protein)} g ｜ 脂肪 ${show(meal.fat)} g ｜ 碳水 ${show(meal.carbs)} g`);
      }
      out.push('');
      if (meals.length > capped.length) out.push(`（仅导出最近 ${capped.length} 餐，共 ${meals.length} 餐。）`, '');
    } else out.push('暂无饮食记录。', '');
    out.push('## 日常习惯', '');
    if (habits.length) {
      out.push('| 日期 | 训练 | 步数 | 睡眠 h | 饮水 |');
      out.push('| --- | --- | --- | --- | --- |');
      for (const h of habits.slice(0, 30)) {
        const training = h.training === true || h.training === 'true' ? '已训练' : h.training === false || h.training === 'false' ? '休息' : '—';
        out.push(`| ${cell(h.date)} | ${training} | ${cell(h.steps)} | ${cell(h.sleep)} | ${cell(h.water)} |`);
      }
    } else out.push('暂无日常习惯记录。');
    out.push('', '---', '', '本文件由轻衡导出，仅为个人日常记录，不构成医疗诊断或治疗建议。缺失的数据以 — 表示。');
    return out.join('\n') + '\n';
  }
  function markdownPayload(data) {
    return {filename: String(data?.filename || `qingheng-${localDate()}.md`), markdown: String(data?.markdown || '')};
  }
  async function markdownExport() {
    if (hasNative()) {
      try {return markdownPayload(await nativeRequest('/api/export-markdown', 'POST', {}));}
      catch {const state = await storageRequest('/api/state', 'GET'); return markdownPayload({markdown: buildMarkdown(state)});}
    }
    const state = await demoState();
    return markdownPayload({markdown: buildMarkdown(state)});
  }
  function response(data,status=200) {
    const text=JSON.stringify(data);
    return {ok:status>=200 && status<300,status,statusText:status===200?'OK':'Error',headers:new Headers({'Content-Type':'application/json'}),url:'',redirected:false,type:'basic',bodyUsed:false,text:async()=>text,json:async()=>JSON.parse(text),clone:()=>response(data,status)};
  }
  window.fetch=async(input,options={})=>{
    const url=typeof input==='string'?input:input instanceof URL?input.href:input.url;
    let parsed;try{parsed=new URL(url,location.href);}catch{throw new TypeError('无效地址');}
    const path=parsed.pathname;
    if(!path.startsWith('/api/')) {
      if(parsed.origin!==location.origin || !['http:','https:','file:'].includes(parsed.protocol))throw new TypeError('浏览器演示禁止外部网络请求。');
      return originalFetch(input,options);
    }
    const method=String(options.method || input?.method || 'GET').toUpperCase();let body=options.body;
    if(body===undefined && typeof input!=='string' && typeof input?.clone==='function' && method!=='GET')body=await input.clone().text();
    try {
      if(typeof body==='string' && body)body=JSON.parse(body);
      if(path==='/api/estimate') {
        const config=await storageRequest('/api/settings','GET',undefined,options.signal);
        if(config.apiConfigured && body?.allowExternal===true) {
          if(!hasNative())throw new Error('外部模型仅可从 APK 调用。');
          if(body?.image && (!config.visionEnabled || !config.visionModel))throw new Error('照片需要已启用的视觉模型：请到「我的 → 模型连接」为所选服务商填写并启用支持图片的模型。');
          const result = await nativeRequest(path,method,{...body,allowExternal:true},options.signal);
          return response(window.QinghengFoods ? window.QinghengFoods.calibrateDraft(result) : result);
        }
        return response(localEstimate(body));
      }
      if(path==='/api/estimate/stream') {
        // 流式估算：模型还在写 JSON 时就把片段交给页面（显示识别到哪些食物），完成后再解析。
        const config=await storageRequest('/api/settings','GET',undefined,options.signal);
        if(!hasNative() || !config.apiConfigured || body?.allowExternal!==true)throw new Error('外部模型估算需要 APK、已配置的 API 与本次外发同意。');
        if(body?.image && (!config.visionEnabled || !config.visionModel))throw new Error('照片需要已启用的视觉模型：请到「我的 → 模型连接」为所选服务商填写并启用支持图片的模型。');
        const started=await nativeRequest('/api/estimate/stream','POST',{text:body?.text||'',allowExternal:true,anchors:typeof body?.anchors==='string'?body.anchors:'',...(body?.image?{image:body.image}:{})},options.signal);
        const streamId=started?.streamId;
        if(!streamId)throw new Error('流式估算未能启动，请重试。');
        const final=await new Promise((resolve,reject)=>{
          const previous=window.__qinghengEstimate;
          let settled=false;
          const timer=setTimeout(()=>{
            if(settled)return;
            settled=true;window.__qinghengEstimate=previous;
            reject(new Error('估算超时，请重试。'));
          },120000);
          const finish=(fn,value)=>{
            if(settled)return;
            settled=true;clearTimeout(timer);window.__qinghengEstimate=previous;fn(value);
          };
          window.__qinghengEstimate=raw=>{
            let event=null;
            try{event=typeof raw==='string'?JSON.parse(raw):raw;}catch{return true;}
            if(!event||event.streamId!==streamId)return true;
            if(event.kind==='think'){
              const sink=window.QinghengEstimateStream;
              if(sink && typeof sink.onThink==='function'){try{sink.onThink(event.text||'');}catch{}}
              return true;
            }
            if(event.kind==='delta'){
              const sink=window.QinghengEstimateStream;
              if(sink && typeof sink.onDelta==='function'){try{sink.onDelta(event.text||'');}catch{}}
              return true;
            }
            if(event.kind==='done'){
              let draft=null;
              try{draft=JSON.parse(event.text||'');}catch{draft=null;}
              if(!draft)finish(reject,new Error('估算结果无法读取，请重试。'));
              else finish(resolve,draft);
              return true;
            }
            finish(reject,new Error(event.text||'估算失败，请稍后重试。'));
            return true;
          };
        });
        return response(window.QinghengFoods ? window.QinghengFoods.calibrateDraft(final) : final);
      }
      if(path==='/api/advice') {
        if(body?.useAI===true) {
          if(!hasNative() || body.allowExternal!==true)throw new Error('AI 建议需要 APK、已配置 API 和本次外发同意。');
          const config=await storageRequest('/api/settings','GET');if(!config.apiConfigured)throw new Error('请先保存所选服务商的 API Key。');
          return response(await nativeRequest(path,method,{date:body.date,useAI:true,allowExternal:true},options.signal));
        }
        return response(localAdvice(await storageRequest('/api/state','GET',undefined,options.signal),body?.date));
      }
      if(path==='/api/chat/stream') {
        if(body?.allowExternal!==true)throw new Error('发送问题给外部模型前，请先勾选本次发送同意。');
        if(!hasNative())throw new Error('AI 问答需要已安装的 APK 和你的 API Key。');
        const question=String(body?.question||'').trim();
        const image=typeof body?.image==='string'?body.image:'';
        if(!question && !image)throw new Error('请输入你的问题，或拍一张照片。');
        const config=await storageRequest('/api/settings','GET',undefined,options.signal);
        if(!config.apiConfigured)throw new Error('请先在「我的」保存所选服务商的 API Key。');
        if(image && (!config.visionEnabled || !config.visionModel))throw new Error('带照片提问需要已启用的视觉模型：请到「我的 → 模型连接」为所选服务商填写并启用支持图片的模型。');
        const started=await nativeRequest('/api/chat/stream','POST',chatNativeBody(body,image),options.signal);
        const streamId=started?.streamId;
        if(!streamId)throw new Error('流式输出未能启动，请重试。');
        const final=await new Promise((resolve,reject)=>{
          const previous=window.__qinghengChat;
          let settled=false;
          // A dropped delta must not leave the question box waiting forever.
          const timer=setTimeout(()=>{
            if(settled)return;
            settled=true;window.__qinghengChat=previous;
            reject(new Error('流式回答超时，请重试。'));
          },120000);
          const finish=(fn,value)=>{
            if(settled)return;
            settled=true;clearTimeout(timer);window.__qinghengChat=previous;fn(value);
          };
          window.__qinghengChat=raw=>{
            let event=null;
            try{event=typeof raw==='string'?JSON.parse(raw):raw;}catch{return true;}
            if(!event||event.streamId!==streamId)return true;
            if(event.kind==='delta'){
              const sink=window.QinghengStream;
              if(sink && typeof sink.onDelta==='function'){try{sink.onDelta(event.text||'');}catch{}}
              return true;
            }
            if(event.kind==='think'){
              // Reasoning models expose their thinking separately; it is shown, never saved as an answer.
              const sink=window.QinghengStream;
              if(sink && typeof sink.onThink==='function'){try{sink.onThink(event.text||'');}catch{}}
              return true;
            }
            if(event.kind==='done')finish(resolve,{reply:event.text||'',webSearch:event.webSearch});
            else finish(reject,new Error(event.text||'回答失败，请稍后重试。'));
            return true;
          };
        });
        // The save happens here, exactly like the buffered route, so streaming never loses a record.
        await storageRequest('/api/chatlog','POST',{entry:{date:localDate(),question:image?`［含照片］${question}`.slice(0,2000):question,answer:String(final?.reply||''),sources:final?.webSearch?.sources||[]}}).catch(()=>undefined);
        return response(final);
      }
      if(path==='/api/chat') {
      if(path==='/api/push-history') return {records:[]};
        if(body?.allowExternal!==true)throw new Error('发送问题给外部模型前，请先勾选本次发送同意。');
        if(!hasNative())throw new Error('AI 问答需要已安装的 APK 和你的 API Key。');
        const question=String(body?.question||'').trim();
        const image=typeof body?.image==='string'?body.image:'';
        if(!question && !image)throw new Error('请输入你的问题，或拍一张照片。');
        const config=await storageRequest('/api/settings','GET',undefined,options.signal);
        if(!config.apiConfigured)throw new Error('请先在「我的」保存所选服务商的 API Key。');
        if(image && (!config.visionEnabled || !config.visionModel))throw new Error('带照片提问需要已启用的视觉模型：请到「我的 → 模型连接」为所选服务商填写并启用支持图片的模型。');
        const reply=await nativeRequest(path,method,chatNativeBody(body,image),options.signal);
        // Machine-internal calls (AI plan, training advice) pass logToHistory:false, so the Q&A
        // history keeps holding only questions the user actually asked in the chat view.
        if(body?.logToHistory!==false) await storageRequest('/api/chatlog','POST',{entry:{date:localDate(),question:image?`［含照片］${question}`.slice(0,2000):question,answer:String(reply?.reply||''),sources:reply?.sources||[]}}).catch(()=>undefined);
        return response(reply);
      }
      if(path==='/api/export-markdown') return response(await markdownExport());
      if(path==='/api/chatlog') return response(await storageRequest(path,method,body,options.signal));
      if(path.startsWith('/api/chatlog/')) return response(await storageRequest(path,method,body,options.signal));
      return response(await storageRequest(path,method,body,options.signal));
    } catch(error) {if(error.name==='AbortError')throw error;return response({error:error.message || '操作失败'},400);}
  };
  window.QinghengAdapter={hasNative,defaults:copy(defaults),request:nativeRequest,pushDefaults:copy(pushDefaults),currentPush:()=>copy(pushSettings)};
})();
