const fs=require('fs');
const p='D:/AI/health-android/app/src/main/assets/app.js';
let s=fs.readFileSync(p,'utf8');
const lines=s.split(/\n/);
const oldLine=lines.find(x=>x.trim().startsWith('if (log) log.innerHTML = chats.length'));
if(!oldLine) throw new Error('renderChat line');
const q=String.fromCharCode(39);
const repl='    if (log) log.innerHTML = chats.length ? [...chats].reverse().map(row => `<div class="meal-row"><div><strong>${esc(row.question || '+q+q+')}</strong><p>${esc(row.answer || '+q+q+')}</p><p class="fine-print">${esc(row.date || '+q+q+')}</p></div><div class="meal-actions"><button type="button" class="delete-meal" data-delete-chat="${esc(row.id || '+q+q+')}" aria-label="删除这条问答记录">删除</button></div></div>`).join('+q+q+') : empty('+q+'还没有问答记录。有疑问时，问一句。'+q+');';
s=s.split(oldLine).join(repl);
const marker="  $('#chat-send').addEventListener('click',sendChat);";
const insert=`  function renderPushHistory(records) {
    const node = $('#push-history'); if (!node) return;
    const rows = Array.isArray(records) ? records : [];
    node.innerHTML = rows.length ? [...rows].reverse().map(row => `<div class="meal-row"><div><strong>${esc(row.slot === 'evening' ? '晚间建议' : row.slot === 'morning' ? '早间建议' : '测试建议')}</strong><p>${esc(row.message || '')}</p><p class="fine-print">${esc(row.date || '')} · ${esc(row.source === 'api' ? '外部 AI' : '本地/兜底')}</p></div></div>`).join('') : empty('还没有已保存的推送生活建议。');
  }
  async function queryPushHistory() {
    const button = $('#query-push-history') || $('#refresh-push-history'), node = $('#push-history');
    if (button) button.disabled = true;
    if (node) node.textContent = '正在查询推送生活建议…';
    try { const data = await api('/api/push-history'); renderPushHistory(data?.records); }
    catch (error) { if (node) node.textContent = error.message; }
    finally { if (button) button.disabled = false; }
  }
`;
s=s.replace(marker,insert+marker);
const clear="  $('#chat-clear').addEventListener('click'";
s=s.replace(clear,`  document.addEventListener('click',async event=>{const button=event.target.closest('[data-delete-chat]');if(!button || button.disabled)return;const id=button.dataset.deleteChat;if(!id){notice('这条问答记录还没有本地 id，无法删除。',true);return;}if(!confirm('确定删除这条问答记录吗？此操作无法撤销。'))return;button.disabled=true;try{await api(\`/api/chatlog/\${encodeURIComponent(id)}\`,undefined,'DELETE');await loadState({quiet:true});notice('问答记录已删除。');}catch(error){notice(error.message,true);button.disabled=false;}});\n  $('#query-push-history').addEventListener('click',queryPushHistory);\n  $('#refresh-push-history').addEventListener('click',queryPushHistory);\n`+clear);
s=s.replace('  searchFoods();','  searchFoods(); restoreConsent();');
s=s.replace('loadState().then(()=>{renderChat();loadPush();})','loadState().then(()=>{renderChat();loadPush();queryPushHistory().catch(()=>{});})');
s=s.replace(/const sourceUrls = Array.isArray\([^\n]+\n/, 'const sourceUrls = [];\n');
s=s.replace(/feedback\(message, sourceUrls[\s\S]*?\);/, "feedback(message, '已收到回答。');");
fs.writeFileSync(p,s);console.log('frontend features transformed');