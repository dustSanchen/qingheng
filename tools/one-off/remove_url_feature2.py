from pathlib import Path
r=Path(r'D:\AI\health-android')

def sub(text, old, new, label, count=1):
    assert text.count(old) == count, 'anchor %s expected %d, found %d' % (label, count, text.count(old))
    return text.replace(old, new)

# ---- app.js ----
p=r/'app/src/main/assets/app.js'; s=p.read_text(encoding='utf-8')
s=sub(s,"  // Fetched page text is kept locally and only attached to the question the user sends.\n  let webSource = null;\n",'','state decl')
s=sub(s,"    if (!question && !chatImage && !webSource) {feedback(message,'请先写下你的问题、拍一张照片，或引用一个网页。',true); $('#chat-question').focus(); return;}",
      "    if (!question && !chatImage) {feedback(message,'请先写下你的问题，或拍一张照片。',true); $('#chat-question').focus(); return;}",'empty check')
s=sub(s,"""      const asked = question || (webSource ? '请阅读我引用的网页，说明它和我的目标有什么关系，并指出不确定或不适用的地方。' : '');
      const data = await api('/api/chat',{question:asked,history,allowExternal:true,...(submittedImage?{image:submittedImage}:{}),...(webSource?{webContext:{url:webSource.url,title:webSource.title,text:webSource.text}}:{})});""",
      "      const data = await api('/api/chat',{question,history,allowExternal:true,...(submittedImage?{image:submittedImage}:{})});",'chat call')
s=sub(s,"clearChatImage(); webSource = null; $('#chat-url').value = ''; renderWebSource();","clearChatImage();",'reset')
i=s.index('  function renderWebSource() {')
j=s.index('  async function savePush(form) {')
s=s[:i]+s[j:]
s=sub(s,'  searchFoods(); renderWebSource(); loadSearchSettings();','  searchFoods(); loadSearchSettings();','bootstrap')
for token in ('webSource','renderWebSource','chat-url','web-preview','chat-fetch','chat-drop-source','QinghengPageText'):
    assert token not in s, 'leftover in app.js: '+token
p.write_text(s,encoding='utf-8')

# ---- index.html ----
p=r/'app/src/main/assets/index.html'; s=p.read_text(encoding='utf-8')
s=sub(s,'<script src="./page-text.js" defer></script>','','script tag')
i=s.index('<label>引用网页（可选）')
j=s.index('<label class="check-label"><input type="checkbox" id="chat-consent">')
s=s[:i]+s[j:]
for token in ('chat-url','web-preview','chat-fetch','page-text','chat-source'):
    assert token not in s, 'leftover in index.html: '+token
p.write_text(s,encoding='utf-8')

# ---- native-adapter.js ----
p=r/'app/src/main/assets/native-adapter.js'; s=p.read_text(encoding='utf-8')
lines=s.split('\n'); start=None
for idx,line in enumerate(lines):
    if "if(path==='/api/fetch-page') {" in line: start=idx; break
assert start is not None
end=start
while "nativeRequest(path,method,{url,allowExternal:true}" not in lines[end]: end+=1
end+=1                                    # the closing brace line
assert lines[end].strip()=='}', 'unexpected block end: '+lines[end]
del lines[start:end+1]
s='\n'.join(lines)
assert 'fetch-page' not in s
p.write_text(s,encoding='utf-8')

# ---- tests ----
p=r/'tests/web-search.test.mjs'; s=p.read_text(encoding='utf-8')
s=sub(s,"assert(/path\\.equals\\(\"\\/api\\/fetch-page\"\\)/.test(java), 'page fetch route still present');\n",'','web-search fetch line')
p.write_text(s,encoding='utf-8')

p=r/'tests/verify-web-apk.mjs'; s=p.read_text(encoding='utf-8')
for old in ["  'assets/page-text.js ships': names.includes('assets/page-text.js'),\n",
            "  'WebPageFetch class in dex': has('WebPageFetch'),\n",
            "  'fetch route in dex': ascii('/api/fetch-page'),\n",
            "  'private-range guard text': has('不抓取本机、内网或保留地址'),\n",
            "  'untrusted-web guard text': has('不可信的外部数据'),\n",
            "  'redirect refused text': has('该网址发生跳转'),\n",
            "  'consent required text': has('只发送网址，不发送健康数据'),\n",
            "  'chat url control in page': has('chat-fetch') && has('chat-url'),\n",
            "  'page text module referenced': has('page-text.js'),\n"]:
    assert old in s, 'verify anchor missing: '+old[:44]
    s=s.replace(old,'')
p.write_text(s,encoding='utf-8')

p=r/'tests/key-hygiene.test.mjs'; s=p.read_text(encoding='utf-8')
i=s.index("// Method 1 must be useful while the model key is unusable")
j=s.index("console.log('PASS key hygiene")
s=s[:i]+s[j:]
assert 'web-preview' not in s
p.write_text(s,encoding='utf-8')

print('URL-reference feature fully removed')
