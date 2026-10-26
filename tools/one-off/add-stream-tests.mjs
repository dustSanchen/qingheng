import fs from 'node:fs';
const file='tests/chat-streaming.test.mjs';
let t=fs.readFileSync(file,'utf8');
if(!t.includes('buffers a fragment it could not deliver')){
  const add = [
    "",
    "// Robustness added after confirming the streaming chain end to end.",
    "check('a fragment that could not be delivered is buffered', main.includes('private final StringBuilder streamPending') && main.includes('streamPending.append(body)'));",
    "check('the buffer is prepended to the next event', main.includes('payloadText = streamPending + body;') && main.includes('streamPending.setLength(0);'));",
    "check('the buffer is per stream', main.includes('streamPendingId'));",
    "check('the page says the model is thinking', app.includes('模型正在思考…'));",
    "check('the hint is dropped when the first fragment arrives', app.includes('if (!box.started) {box.started = true; box.text = \\'\\'; clearTimeout(box.hint);}'));",
    "check('the hint timer is cleared on both paths', app.includes('if (box?.hint) clearTimeout(box.hint);'));",
    "",
  ].join('\n');
  t = t.replace("console.log('\\nFAIL total: '", add + "console.log('\\nFAIL total: '");
  fs.writeFileSync(file, t);
  console.log('added streaming robustness assertions');
}
