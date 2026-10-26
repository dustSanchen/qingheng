from pathlib import Path
r=Path(r'D:\AI\health-android')
p=r/'app/src/main/assets/index.html'; s=p.read_text(encoding='utf-8')

anchor='<article class="card"><div class="card-heading"><h2>每日推送</h2>'
assert s.count(anchor)==1
card='''<article class="card"><div class="card-heading"><h2>联网检索</h2><span id="search-status" class="tag">未启用</span></div><p class="fine-print">可选：接入 Brave Search。启用后，问答时模型可自行决定是否检索公开互联网（食品营养、官方指南、产品或研究资料）。检索词会发送给 Brave，<strong>不会</strong>发送你的健康记录、照片或模型密钥；Brave 密钥单独加密保存，与模型密钥分开。</p><form id="search-form" autocomplete="off"><label class="check-label"><input type="checkbox" name="enabled"><span>启用联网检索</span></label><label>Brave API Key<input name="apiKey" type="password" autocomplete="new-password" placeholder="粘贴 Brave Search API Key；留空保留原密钥"></label><label class="check-label"><input type="checkbox" name="clearKey"><span>清除已保存的检索密钥</span></label><button class="button primary" type="submit">保存检索设置</button><p class="form-feedback" role="status" aria-live="polite"></p></form><label>检索测试关键词<input id="search-test-query" maxlength="200" placeholder="例如：燕麦 膳食纤维 每100克"></label><button class="button subtle" type="button" id="search-test">测试检索（不消耗模型 token）</button><div id="search-test-result"></div></article>'''
s=s.replace(anchor,card+anchor,1)
p.write_text(s,encoding='utf-8')

p=r/'app/src/main/assets/app.js'; s=p.read_text(encoding='utf-8')

anchor='  function applySettings(data) {showProvider(data.provider || selectedProvider);}'
assert s.count(anchor)==1
s=s.replace(anchor,'''  /** Web search is optional and independent of the model provider. */
  async function loadSearchSettings() {
    try {
      const data = await api('/api/search-settings');
      const form = $('#search-form');
      form.elements.enabled.checked = data.enabled === true;
      form.elements.apiKey.value = ''; form.elements.clearKey.checked = false;
      $('#search-status').textContent = data.enabled === true ? (data.configured ? '已启用' : '缺密钥') : '未启用';
      return data;
    } catch {return {enabled:false, configured:false};}
  }
  $('#search-form').addEventListener('submit', async event => {
    event.preventDefault();
    const form = event.currentTarget, button = $('button[type=submit]', form), message = $('.form-feedback', form);
    if (button.disabled) return;
    const key = form.elements.apiKey.value.trim(), clear = form.elements.clearKey.checked;
    if (key && clear) {feedback(message,'请不要同时填写新密钥并清除密钥。',true); return;}
    button.disabled = true; feedback(message,'正在保存检索设置…');
    try {
      await api('/api/search-settings', {enabled:form.elements.enabled.checked, clearKey:clear, ...(key?{apiKey:key}:{})});
      form.elements.apiKey.value=''; form.elements.clearKey.checked=false;
      const saved = await loadSearchSettings();
      feedback(message, saved.enabled && !saved.configured ? '已保存，但还没有 Brave 密钥，联网检索不会生效。' : '检索设置已保存。', saved.enabled && !saved.configured);
      renderChatMode();
    } catch (error) {feedback(message,error.message,true);} finally {button.disabled=false;}
  });
  $('#search-test').addEventListener('click', async event => {
    const button = event.currentTarget, query = $('#search-test-query').value.trim(), box = $('#search-test-result');
    if (!query) {box.innerHTML = '<p class="fine-print">请先填写检索关键词。</p>'; return;}
    if (!confirm(`将把检索词「${query}」发送给 Brave Search（不发送健康记录，也不调用模型）。继续吗？`)) return;
    button.disabled = true; box.innerHTML = '<p class="fine-print">正在检索…</p>';
    try {
      const data = await api('/api/search-test', {query, allowExternal:true});
      const rows = Array.isArray(data?.results) ? data.results : [];
      box.innerHTML = rows.length
        ? `<p class="fine-print">返回 ${rows.length} 条结果：</p>` + rows.map(row => `<div class="food-result"><span>${esc(row.title || '(无标题)')}<small>${esc(row.url)}</small></span></div>`).join('')
        : '<p class="fine-print">没有返回结果，请换个关键词。</p>';
    } catch (error) {box.innerHTML = `<p class="fine-print error">${esc(error.message)}</p>`;} finally {button.disabled = false;}
  });

'''+anchor,1)

# Show the searched sources and keep them with the stored answer.
anchor="      const stored = submittedImage ? `［含照片］${question}`.slice(0,2000) : question;"
assert s.count(anchor)==1
s=s.replace(anchor,'''      const sourceUrls = Array.isArray(data?.sources) ? data.sources.map(row => row && row.url).filter(url => typeof url === 'string' && /^https:\\/\\//.test(url)) : [];
      const withSources = sourceUrls.length ? `${reply}\\n\\n来源：${sourceUrls.join(' ')}`.slice(0,8000) : reply;
'''+anchor,1)
s=s.replace("      feedback(message,'已收到回答。');","      feedback(message, sourceUrls.length ? `已收到回答，并引用了 ${sourceUrls.length} 个来源。` : '已收到回答。');",1)
anchor="catch {state.chats = [...(Array.isArray(state.chats) ? state.chats : []),{date:localDate(),question:stored,answer:reply}]; renderChat();"
assert s.count(anchor)==1
s=s.replace(anchor,"catch {state.chats = [...(Array.isArray(state.chats) ? state.chats : []),{date:localDate(),question:stored,answer:withSources}]; renderChat();",1)

# Chat mode hint reflects whether search is available.
anchor="  $('#chat-mode').textContent"
assert s.count(anchor)>=1
s=s.replace('''  searchFoods(); renderWebSource();''','''  searchFoods(); renderWebSource(); loadSearchSettings().then(renderChatMode);''',1)
p.write_text(s,encoding='utf-8')
print('search UI wired')
