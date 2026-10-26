/*
 * Page + prompt side of the AI upgrade: reasoning fragments get their own collapsible block, and the
 * prompt gains an answer shape plus 薄肌 guidance that quotes the app's own plan.
 */
import fs from 'node:fs';

function patch(file, edits) {
  let text = fs.readFileSync(file, 'utf8');
  const crlf = text.includes('\r\n');
  for (const [label, fromRaw, toRaw] of edits) {
    const from = crlf ? fromRaw.replace(/\n/g, '\r\n') : fromRaw;
    const to = crlf ? toRaw.replace(/\n/g, '\r\n') : toRaw;
    const count = text.split(from).length - 1;
    if (count === 0 && text.includes(to)) { console.log(`skip (already applied)  ${label}`); continue; }
    if (count !== 1) throw new Error(`${file} :: ${label}: expected 1 anchor, found ${count}`);
    text = text.replace(from, to);
    console.log(`ok  ${label}`);
  }
  fs.writeFileSync(file, text);
}

// --- adapter: forward thinking fragments ----------------------------------------------------------
patch('app/src/main/assets/native-adapter.js', [
  [
    'think event',
    `            if(event.kind==='delta'){
              const sink=window.QinghengStream;
              if(sink && typeof sink.onDelta==='function'){try{sink.onDelta(event.text||'');}catch{}}
              return true;
            }`,
    `            if(event.kind==='delta'){
              const sink=window.QinghengStream;
              if(sink && typeof sink.onDelta==='function'){try{sink.onDelta(event.text||'');}catch{}}
              return true;
            }
            if(event.kind==='think'){
              // Reasoning models expose their thinking separately; it is shown, never saved as an answer.
              const sink=window.QinghengStream;
              if(sink && typeof sink.onThink==='function'){try{sink.onThink(event.text||'');}catch{}}
              return true;
            }`,
  ],
]);

// --- page: thinking block + collapse on first answer fragment --------------------------------------
patch('app/src/fragments/10-rich-answer.fragment.js', [
  [
    'thinking block in the bubble',
    `      + '<div class="answer stream-answer"><span class="stream-text"></span><span class="stream-caret" aria-hidden="true">▍</span></div></div>';`,
    `      + '<div class="answer stream-answer"><div class="stream-think" hidden></div><span class="stream-text"></span><span class="stream-caret" aria-hidden="true">▍</span></div></div>';`,
  ],
  [
    'return the thinking node',
    `    const state = {box, text: '', body: $('.stream-text', box), caret: $('.stream-caret', box), started: false};`,
    `    const state = {box, text: '', thinking: '', body: $('.stream-text', box), caret: $('.stream-caret', box), think: $('.stream-think', box), started: false};`,
  ],
  [
    'onThink handler',
    `  function pushChatStream(box, chunk) {
    if (!box || !chunk) return;
    if (!box.started) {box.started = true; box.text = ''; clearTimeout(box.hint);}
    box.text += chunk;
    box.body.textContent = box.text;
    box.caret.hidden = false;
  }`,
    `  function pushChatStream(box, chunk) {
    if (!box || !chunk) return;
    if (!box.started) {
      box.started = true;
      box.text = '';
      clearTimeout(box.hint);
      // Keep the reasoning visible but small once the answer starts: a one-line summary, tappable.
      if (box.thinking && box.think) {
        box.think.textContent = \`已思考 \${box.thinking.length} 字（点击展开）\`;
        box.think.classList.add('is-summary');
      }
    }
    box.text += chunk;
    box.body.textContent = box.text;
    box.caret.hidden = false;
  }
  /** Reasoning fragments from a reasoning model: shown, never merged into the answer. */
  function pushChatThinking(box, chunk) {
    if (!box || !chunk || !box.think) return;
    if (box.started) return;
    box.thinking += chunk;
    box.think.hidden = false;
    box.think.textContent = box.thinking.length > 600 ? '…' + box.thinking.slice(-600) : box.thinking;
  }`,
  ],
  [
    'wire onThink',
    `    window.QinghengStream = {onDelta: text => pushChatStream(box, text)};`,
    `    window.QinghengStream = {onDelta: text => pushChatStream(box, text), onThink: text => pushChatThinking(box, text)};`,
  ],
]);

// --- prompt: answer shape + 薄肌 guidance ---------------------------------------------------------
patch('app/src/main/java/cn/qingheng/health/ai/Prompts.java', [
  [
    'answer shape + lean guidance',
    `                + "【表格】只有真的在对比多个数值时才用表格，并且必须能在一部手机屏幕上竖着看完："`,
    `                + "【回答形状】把答案放在第一句：先给结论或数字（带单位与区间），第二句给一句依据，第三句给一个具体动作。"
                + "需要计算时只写 1~2 步算式（例如 2,157 − 2,000 = 157 kcal ≈ 7%），不要长篇推导。"
                + "【薄肌问答】问到「薄肌」「线条」「分离度」时：先说清它等于低体脂 + 中等肌肉量（不是不练、也不是只做有氧），"
                + "再给可执行数字：热量缺口 10~15% 维持、蛋白质 2.2~2.4 g/kg、抗阻 3 次/周（每肌群 10~20 组/周）、"
                + "低强度有氧 2~3 次、步数 8000~10000、睡眠 7~9 小时、每周体重下降 0.3~0.5%；"
                + "并明确指出局部减脂不成立、极低碳水只是糖原耗竭造成的暂时视觉变化、纯有氧会掉肌肉。"
                + "如果上下文里有 goal=lean 和 leanPlan，直接引用其中的区间、有效缺口与每周速率，不要另算一套数字。"
                + "【表格】只有真的在对比多个数值时才用表格，并且必须能在一部手机屏幕上竖着看完："`,
  ],
]);

console.log('thinking UI + prompt guidance wired');
