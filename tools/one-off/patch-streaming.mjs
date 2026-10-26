/*
 * Streaming chat: the adapter forwards /api/chat/stream (handling the native save on completion) and
 * the page renders text as it arrives. Falls back to the buffered route on any streaming failure, so
 * a provider without SSE support still answers.
 */
import fs from 'node:fs';

function patch(file, edits) {
  let text = fs.readFileSync(file, 'utf8');
  for (const [label, from, to] of edits) {
    const count = text.split(from).length - 1;
    if (count !== 1) throw new Error(`${file} :: ${label}: expected 1 anchor, found ${count}`);
    text = text.replace(from, to);
    console.log(`ok  ${label}`);
  }
  fs.writeFileSync(file, text);
}

patch('app/src/main/assets/native-adapter.js', [
  [
    'stream route',
    "      if(path==='/api/chat') {",
    `      if(path==='/api/chat/stream') {
        if(body?.allowExternal!==true)throw new Error('发送问题给外部模型前，请先勾选本次发送同意。');
        if(!hasNative())throw new Error('AI 问答需要已安装的 APK 和你的 API Key。');
        const question=String(body?.question||'').trim();
        const image=typeof body?.image==='string'?body.image:'';
        if(!question && !image)throw new Error('请输入你的问题，或拍一张照片。');
        const config=await storageRequest('/api/settings','GET',undefined,options.signal);
        if(!config.apiConfigured)throw new Error('请先在「我的」保存所选服务商的 API Key。');
        if(image && (!config.visionEnabled || !config.visionModel))throw new Error('带照片提问需要已启用的视觉模型：DeepSeek 请使用 deepseek-flash，B.AI 请填写其支持图片的模型。');
        const started=await nativeRequest('/api/chat/stream','POST',{question,date:body.date || localDate(),photoTakenAt:body.photoTakenAt,photoTimeSource:body.photoTimeSource,history:Array.isArray(body.history)?body.history.slice(-20):[],allowExternal:true,anchors:typeof body.anchors==='string'?body.anchors:'',webSearch:body.webSearch===true,...(image?{image}:{})},options.signal);
        const streamId=started?.streamId;
        if(!streamId)throw new Error('流式输出未能启动，请重试。');
        const final=await new Promise((resolve,reject)=>{
          const previous=window.__qinghengChat;
          window.__qinghengChat=raw=>{
            let event=null;
            try{event=typeof raw==='string'?JSON.parse(raw):raw;}catch{return true;}
            if(!event||event.streamId!==streamId)return true;
            if(event.kind==='delta'){
              const sink=window.QinghengStream;
              if(sink && typeof sink.onDelta==='function'){try{sink.onDelta(event.text||'');}catch{}}
              return true;
            }
            window.__qinghengChat=previous;
            if(event.kind==='done')resolve({reply:event.text||'',webSearch:event.webSearch});
            else reject(new Error(event.text||'回答失败，请稍后重试。'));
            return true;
          };
        });
        // The save happens here, exactly like the buffered route, so streaming never loses a record.
        await storageRequest('/api/chatlog','POST',{entry:{date:localDate(),question:image?\`［含照片］\${question}\`.slice(0,2000):question,answer:String(final?.reply||'')}}).catch(()=>undefined);
        return response(final);
      }
      if(path==='/api/chat') {`,
  ],
]);

patch('app/src/main/assets/app.js', [
  [
    'stream helpers',
    '  function renderChat() {',
    `  /** Progressive answer bubble; removed again once the saved record is rendered. */
  function beginChatStream(question, hasImage) {
    const log = $('#chat-log');
    if (!log) return null;
    const box = document.createElement('div');
    box.className = 'meal-row list-row stream-row';
    box.setAttribute('role', 'listitem');
    box.innerHTML = '<div class="row-body"><div class="row-head"><strong></strong>'
      + \`\${hasImage ? '<span class="row-tag">含照片</span>' : ''}<span class="row-tag">正在回答</span></div>\`
      + '<div class="answer stream-answer"><span class="stream-text"></span><span class="stream-caret" aria-hidden="true">▍</span></div></div>';
    $('strong', box).textContent = question || '（照片提问）';
    log.prepend(box);
    return {box, text: '', body: $('.stream-text', box), caret: $('.stream-caret', box)};
  }
  function pushChatStream(box, chunk) {
    if (!box || !chunk) return;
    box.text += chunk;
    box.body.textContent = box.text;
    box.caret.hidden = false;
  }
  function endChatStream(box) {
    if (box?.box?.parentNode) box.box.parentNode.removeChild(box.box);
  }
  /** Streams the answer through the adapter; throws when streaming is unavailable so the caller can fall back. */
  async function streamChat(payload) {
    if (!window.QinghengAdapter?.hasNative?.() || !navigator.onLine) throw new Error('当前环境不支持流式输出');
    const box = beginChatStream(payload.question, Boolean(payload.image));
    window.QinghengStream = {onDelta: text => pushChatStream(box, text)};
    try {
      return await api('/api/chat/stream', payload);
    } finally {
      window.QinghengStream = null;
      endChatStream(box);
    }
  }
  function renderChat() {`,
  ],
  [
    'chat submit streams first',
    "      const data = await api('/api/chat',{question,history,date:submittedDate,allowExternal:true,anchors:anchorSummary(),webSearch:$('#chat-web').checked && navigator.onLine,...(submittedImage?{image:submittedImage,...submittedPhotoMeta}:{})});",
    `      const payload = {question,history,date:submittedDate,allowExternal:true,anchors:anchorSummary(),webSearch:$('#chat-web').checked && navigator.onLine,...(submittedImage?{image:submittedImage,...submittedPhotoMeta}:{})};
      let data = null;
      try {
        data = await streamChat(payload);
      } catch (streamError) {
        // Streaming is a nicety: fall back to the buffered call so the question is still answered.
        if (!/不支持流式|未能启动/.test(String(streamError?.message || ''))) throw streamError;
        feedback(message, '流式输出不可用，已改用一次性返回…');
        data = await api('/api/chat', payload);
      }`,
  ],
]);

console.log('streaming chat wired');
