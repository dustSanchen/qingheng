const fs=require('fs');
const p='D:/AI/health-android/app/src/main/assets/app.js';
let s=fs.readFileSync(p,'utf8');
const start=s.indexOf('  /** Web search is optional');
const end=s.indexOf('  function applySettings(data)',start);
if(start>=0&&end>start)s=s.slice(0,start)+s.slice(end);
s=s.replace(/      const search = searchState[\s\S]*?      node\.textContent = base \+ search;/, '      node.textContent = base;');
s=s.replace(/const withSources = sourceUrls[\s\S]*?;(\r?\n)/, 'const withSources = reply;$1');
s=s.replace(/feedback\(message, sourceUrls[\s\S]*?\);/, "feedback(message, '已收到回答。');");
s=s.replace("!$('#chat-consent').checked", "!$('#chat-consent').hidden && !$('#chat-consent').checked");
s=s.replace("!$('#advice-consent').checked", "!$('#advice-consent').hidden && !$('#advice-consent').checked");
s=s.replace("!$('#estimate-consent').checked", "!$('#estimate-consent').hidden && !$('#estimate-consent').checked");
s=s.replace("const allowExternal = $('#ob-allow').checked;", "const allowExternal = $('#ob-allow').hidden || $('#ob-allow').checked;");
s=s.replace("$('#chat-consent').checked = false; clearChatImage();", "$('#chat-consent').checked = false; acceptConsent('chat'); clearChatImage();");
s=s.replace("$('#advice-consent').checked=false;", "if(useAI)acceptConsent('advice');");
s=s.replace("$('#estimate-consent').checked=false;", "if($('#estimate-consent').checked)acceptConsent('estimate');$('#estimate-consent').checked=false;");
s=s.replace('  const providerDrafts = {};', `  const consentStorageKey = 'qingheng.consent.onetime';
  const consentIds = new Set(['advice','estimate','chat','ob-allow']);
  function readConsent(){try{return new Set(JSON.parse(localStorage.getItem(consentStorageKey)||'[]').filter(x=>consentIds.has(x)));}catch{return new Set();}}
  function persistConsent(ids){try{localStorage.setItem(consentStorageKey,JSON.stringify([...ids]));}catch{}}
  function hideConsent(id){const row=document.querySelector('[data-consent-once='+id+']');if(row)row.hidden=true;}
  function restoreConsent(){for(const id of readConsent())hideConsent(id);}
  function acceptConsent(id){const ids=readConsent();ids.add(id);persistConsent(ids);hideConsent(id);}
  const providerDrafts = {};`);
fs.writeFileSync(p,s);
console.log('transformed app.js');