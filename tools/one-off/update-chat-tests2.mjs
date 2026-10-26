import fs from 'node:fs';
function once(file, from, to){
  let text = fs.readFileSync(file, 'utf8');
  const n = text.split(from).length - 1;
  if (n === 0 && text.includes(to)) { console.log('skip ' + file); return; }
  if (n !== 1) throw new Error(`${file}: anchor ${n}x`);
  fs.writeFileSync(file, text.replace(from, to));
  console.log('updated ' + file);
}
once('tests/chat-quality.test.mjs',
  "check('both table builders are guarded', app.split('if (!answerTableFits(rows)) return \\'\\';').length - 1 === 2);",
  "check('both table builders are guarded', app.includes('if (!answerTableFits(rows)) return \\'\\';') && app.includes('if (!answerTableFits([head].concat(body))) return \\'\\';'));");
once('tests/chat-streaming.test.mjs',
  "check('the adapter waits for the done event', streamBlock.includes(\"if(event.kind==='done')resolve(\"));",
  "check('the adapter waits for the done event', streamBlock.includes(\"if(event.kind==='done')finish(resolve,\"));");
once('tests/chat-streaming.test.mjs',
  "check('the adapter rejects on a streamed error', streamBlock.includes(\"else reject(new Error(event.text||'回答失败，请稍后重试。'));\"));",
  "check('the adapter rejects on a streamed error', streamBlock.includes(\"else finish(reject,new Error(event.text||'回答失败，请稍后重试。'));\"));");
once('tests/meal-date-context.test.mjs',
  "assert.match(promptsJava, /用 Markdown 管道表格输出/, 'the chat prompt asks for a pipe table when comparing numbers');",
  "assert.match(promptsJava, /管道表格写法：第一行表头/, 'the chat prompt asks for a pipe table when comparing numbers');");
