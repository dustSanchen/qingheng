import fs from 'node:fs';
const edits = {
 'tests/chat-quality.test.mjs': [
  ["check('both table builders are guarded', app.split(\"if (!answerTableFits(rows)) return '';\").length - 1 === 2);",
   "check('both table builders are guarded', app.includes(\"if (!answerTableFits(rows)) return '';\") && app.includes('if (!answerTableFits([head].concat(body))) return \\'\\';'));"],
 ],
 'tests/chat-streaming.test.mjs': [
  ["check('the adapter waits for the done event', streamBlock.includes(\"if(event.kind==='done')resolve(\"));",
   "check('the adapter waits for the done event', streamBlock.includes(\"if(event.kind==='done')finish(resolve,\"));"],
  ["check('the adapter rejects on a streamed error', streamBlock.includes(\"else reject(new Error(event.text||'回答失败，请稍后重试。'));\"));",
   "check('the adapter rejects on a streamed error', streamBlock.includes(\"else finish(reject,new Error(event.text||'回答失败，请稍后重试。'));\"));"],
 ],
 'tests/meal-date-context.test.mjs': [
  ["assert.match(promptsJava, /用 Markdown 管道表格输出/, 'the chat prompt asks for a pipe table when comparing numbers');",
   "assert.match(promptsJava, /管道表格写法：第一行表头/, 'the chat prompt asks for a pipe table when comparing numbers');"],
 ],
};
for (const [file, pairs] of Object.entries(edits)) {
  let text = fs.readFileSync(file, 'utf8');
  for (const [from, to] of pairs) {
    const n = text.split(from).length - 1;
    if (n === 0 && text.includes(to)) continue;
    if (n !== 1) throw new Error(`${file}: anchor ${n}x -> ${from.slice(0, 60)}`);
    text = text.replace(from, to);
  }
  fs.writeFileSync(file, text);
  console.log('updated ' + file);
}
