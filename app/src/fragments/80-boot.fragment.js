/* Fragment of assets/app.js -- assembled by tools/assemble-app.ps1 in filename order.
 * Edit this file, never the generated assets/app.js; tests/app-fragments.test.mjs fails on drift. */
  installSkinPicker();
  installChatDayFilter();
  installChatFocusReveal();
  // 问答页外围接线的唯一入口（幂等）：分段、快捷胶囊、上下文预览开关都在 80-ai-chat 里。
  if (typeof installAiChatModule === 'function') installAiChatModule();
switchTab(restoreTab());render();connection();syncAnchors().catch(()=>{});
  readPermissionState().then(renderPermissionChecklist).catch(()=>{});
  refreshBackupStatus().then(maybeRemindBackup).catch(()=>{});
  loadState().then(()=>{renderChat();loadPush();queryPushHistory().catch(()=>{});loadDrafts().catch(()=>{});}).catch(()=>{renderChat();loadPush();loadDrafts().catch(()=>{});});
  // A push notification opens the app with #chat (or ?tab=chat) so the user lands on today's analysis.
  (function openFromNotification(){
    const param=new URLSearchParams(location.search||'').get('tab');
    const target=param==='chat'||location.hash==='#chat'?'chat':null;
    if(!target) return;
    const run=()=>{switchTab('chat',true);const box=$('#chat-question');if(box){activeDate=localDate();box.focus({preventScroll:true});}};
    if(loaded) run(); else setTimeout(run,600);
  })();
  // Explicit settings endpoint; no key is requested, echoed, or stored in browser storage.
  refreshSettings();
})();
