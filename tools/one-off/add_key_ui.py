from pathlib import Path
r=Path(r'D:\AI\health-android')

p=r/'app/src/main/assets/index.html'; s=p.read_text(encoding='utf-8')
old='<button class="button subtle" id="connection-check" type="button">检查已保存的连接</button><p id="connection-check-feedback" class="form-feedback" role="status" aria-live="polite"></p>'
assert s.count(old)==1
s=s.replace(old,'<div class="button-row"><button class="button subtle" id="connection-check" type="button">检查已保存的连接</button><button class="button subtle" id="key-info" type="button">密钥自检</button></div><p id="connection-check-feedback" class="form-feedback" role="status" aria-live="polite"></p><p id="key-info-result" class="fine-print"></p>',1)

old='<p class="fine-print" id="chat-source">可选：粘贴公开网页地址'
assert s.count(old)==1
s=s.replace(old,'<details id="web-preview" class="advanced" hidden><summary>查看抓取到的正文（本地显示，可先自己阅读）</summary><div id="web-preview-text" class="fine-print"></div></details>'+old,1)
p.write_text(s,encoding='utf-8')

p=r/'app/src/main/assets/app.js'; s=p.read_text(encoding='utf-8')

# Key self check: mask, never the key; warn when the stored value was contaminated.
anchor="  $('#search-test').addEventListener('click', async event => {"
assert s.count(anchor)==1
s=s.replace(anchor,'''  $('#key-info').addEventListener('click', async event => {
    const button = event.currentTarget, box = $('#key-info-result');
    button.disabled = true; box.textContent = '正在读取本机保存的配置…';
    try {
      const data = await api('/api/key-info');
      const describe = (label, info) => {
        if (!info || info.configured !== true) return `${label}：未保存密钥。`;
        if (info.unreadable === true) return `${label}：密钥无法解密，请重新保存（可能是换机或恢复备份导致）。`;
        const mask = info.preview ? `，预览 ${info.preview}` : '';
        const warn = info.cleaned === true ? ' ⚠️ 检测到粘贴时带入的不可见字符（如不间断空格/BOM），已自动清理——这很可能就是之前 401 的原因。' : '';
        return `${label}：长度 ${info.length} 字符${mask}。${warn}`;
      };
      box.textContent = `当前服务商 ${data.provider}。` + describe('模型密钥', data.model) + ' ' + describe('Brave 检索密钥', data.brave);
    } catch (error) {box.textContent = error.message;} finally {button.disabled = false;}
  });

''' + anchor,1)

# Method 1 must be useful even while the model key is broken: show the fetched text locally.
old="""    $('#chat-drop-source').hidden = !webSource;"""
assert s.count(old)==1
s=s.replace(old,"""    $('#chat-drop-source').hidden = !webSource;
    const preview = $('#web-preview'), previewText = $('#web-preview-text');
    if (preview && previewText) {
      preview.hidden = !webSource;
      previewText.textContent = webSource ? (webSource.title ? webSource.title + '\\n\\n' : '') + webSource.text : '';
    }""",1)
p.write_text(s,encoding='utf-8')
print('key self check and local page preview wired')
