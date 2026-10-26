import fs from 'node:fs';
const buf = fs.readFileSync('dist/qingheng-1.0.18.apk');
const text = buf.toString('latin1');
const markers = ['这次回答没有正确返回', 'repairChatAnswers', 'chatAnswersRepaired'];
for (const m of markers) {
  const ascii = Buffer.from(m, 'utf8').toString('latin1');
  console.log(m, '->', text.includes(ascii) || text.includes(m) ? 'FOUND' : 'missing');
}
const utf8 = Buffer.from('这次回答没有正确返回','utf8').toString('latin1');
console.log('utf8 probe ->', text.includes(utf8) ? 'FOUND' : 'missing');
