from pathlib import Path
r=Path(r'D:\AI\health-android')
p=r/'app/src/main/assets/app.js'; s=p.read_text(encoding='utf-8')

anchor='  async function sendChat() {'
assert s.count(anchor)==1
s=s.replace(anchor,'''  // Fetched page text is kept locally and only attached to the question the user sends.
  let webSource = null;
  function renderWebSource() {
    const node = $('#chat-source');
    node.classList.toggle('error', false);
    $('#chat-drop-source').hidden = !webSource;
    node.textContent = webSource
      ? `已引用 ${webSource.host}｜${webSource.title || '无标题'}｜正文 ${webSource.characters} 字${webSource.truncated ? '（已截断）' : ''}。发送时会连同问题一起交给模型，并标注为不可信资料。`
      : '可选：粘贴公开网页地址，App 先抓取正文，再连同你的问题一起发送给模型。抓取时只把网址发给该网站，不发送你的健康数据、问题内容或密钥；网页内容会被当作不可信资料。';
  }
  $('#chat-fetch').addEventListener('click', async event => {
    const button = event.currentTarget, raw = $('#chat-url').value.trim();
    const fail = message => {const node = $('#chat-source'); node.textContent = message; node.classList.add('error');};
    if (!/^https:\\/\\/\\S+$/i.test(raw)) {fail('请填写 https:// 开头的完整网址。'); return;}
    let host = '';
    try {host = new URL(raw).host;} catch {fail('网址格式不正确。'); return;}
    if (!confirm(`将向 ${host} 请求这个网页（只发送网址，不发送健康数据、问题或密钥）。继续吗？`)) return;
    button.disabled = true; fail('正在抓取网页…');
    try {
      const page = await api('/api/fetch-page', {url:raw, allowExternal:true});
      const parsed = window.QinghengPageText.extract(page?.html || '');
      if (!parsed.text || parsed.text.length < 80) throw new Error('这个网页几乎没有可读正文，可能是脚本渲染或登录后页面。');
      webSource = {url:page.url, host:page.host, title:parsed.title, text:parsed.text, truncated:parsed.truncated || page.truncated === true, characters:parsed.characters};
      renderWebSource();
    } catch (error) {fail(error.message);} finally {button.disabled = false;}
  });
  $('#chat-drop-source').addEventListener('click',()=>{webSource=null;$('#chat-url').value='';renderWebSource();});
  async function sendChat() {''',1)

anchor="    if (!question && !chatImage) {feedback(message,'请先写下你的问题，或拍一张照片。',true); $('#chat-question').focus(); return;}"
assert s.count(anchor)==1
s=s.replace(anchor,"    if (!question && !chatImage && !webSource) {feedback(message,'请先写下你的问题、拍一张照片，或引用一个网页。',true); $('#chat-question').focus(); return;}",1)

anchor="      const data = await api('/api/chat',{question,history,allowExternal:true,...(submittedImage?{image:submittedImage}:{})});"
assert s.count(anchor)==1
s=s.replace(anchor,"""      const asked = question || (webSource ? '请阅读我引用的网页，说明它和我的目标有什么关系，并指出不确定或不适用的地方。' : '');
      const data = await api('/api/chat',{question:asked,history,allowExternal:true,...(submittedImage?{image:submittedImage}:{}),...(webSource?{webContext:{url:webSource.url,title:webSource.title,text:webSource.text}}:{})});""",1)

anchor="      $('#chat-question').value = ''; $('#chat-consent').checked = false; clearChatImage();"
assert s.count(anchor)==1
s=s.replace(anchor,"      $('#chat-question').value = ''; $('#chat-consent').checked = false; clearChatImage(); webSource = null; $('#chat-url').value = ''; renderWebSource();",1)

anchor='  searchFoods();'
assert s.count(anchor)==1
s=s.replace(anchor,'  searchFoods(); renderWebSource();',1)
p.write_text(s,encoding='utf-8')

# Adapter: the fetch call is an explicit external request and must reach the native layer.
p=r/'app/src/main/assets/native-adapter.js'; s=p.read_text(encoding='utf-8')
anchor="      if(path==='/api/chat') {"
assert s.count(anchor)==1
s=s.replace(anchor,'''      if(path==='/api/fetch-page') {
        if(body?.allowExternal!==true)throw new Error('抓取网页前需要确认。');
        if(!hasNative())throw new Error('抓取网页需要已安装的 APK：浏览器演示不会代你访问外部网站。');
        const url=String(body?.url||'').trim();
        if(!/^https:\\/\\/\\S+$/i.test(url))throw new Error('请填写 https:// 开头的完整网址。');
        return response(await nativeRequest(path,method,{url,allowExternal:true},options.signal));
      }
'''+anchor,1)
p.write_text(s,encoding='utf-8')
print('chat web source wired')
