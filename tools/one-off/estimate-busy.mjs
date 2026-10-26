import fs from 'node:fs';

// 估算预览：等待时显示「正在计算热量…」的等待层
const files = ['app/src/fragments/10-rich-answer.fragment.js', 'app/src/fragments/50-onboarding.fragment.js', 'app/src/fragments/70-rest.fragment.js'];
let done = false;

for (const f of files) {
  let t = fs.readFileSync(f, 'utf8');
  const from = "feedback(message,'正在生成预览，不会自动保存…');";
  if (!t.includes(from)) continue;
  const to = from + "\nif (typeof showBusy === 'function') showBusy('正在计算热量…');";
  t = t.replace(from, to);

  // 在 finally 里收掉
  t = t.replace('finally {estimateBusy=false;button.disabled=false;}', "finally {estimateBusy=false;button.disabled=false;if (typeof hideBusy === 'function') hideBusy();}");
  t = t.replace("finally {estimateBusy=false;button.disabled=false;", "finally {estimateBusy=false;button.disabled=false;if (typeof hideBusy === 'function') hideBusy();");
  fs.writeFileSync(f, t);
  done = true;
  console.log('busy wired in', f);
  break;
}
if (!done) console.log('estimate anchor not found');
