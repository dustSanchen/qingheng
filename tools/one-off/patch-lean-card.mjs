import fs from 'node:fs';
const html='app/src/main/assets/index.html';
let h=fs.readFileSync(html,'utf8');
if(h.includes('value="lean"')){ console.log('skip'); }
else {
  const anchor = '<label class="goal-card"><input type="radio" name="goal" value="maintain">';
  const n = h.split(anchor).length-1;
  if(n!==1) throw new Error(`anchor ${n}x`);
  const card = '<label class="goal-card"><input type="radio" name="goal" value="lean"><span><strong>薄肌（线条）</strong><small>小缺口 + 蛋白拉满，追求低体脂下的肌肉分离度</small></span></label>\n         ';
  h = h.replace(anchor, card + anchor);
  fs.writeFileSync(html, h);
  console.log('goal card 薄肌 added');
}
// Java label so the profile summary and the AI context name the mode.
const java='app/src/main/java/cn/qingheng/health/MainActivity.java';
let j=fs.readFileSync(java,'utf8');
const from='        else if (raw.equals("maintain")) label = "保持身材";';
const to='        else if (raw.equals("maintain")) label = "保持身材";\n        else if (raw.equals("lean")) label = "薄肌（线条）";';
if(!j.includes('raw.equals("lean")')){
  if(j.split(from).length-1 !== 1) throw new Error('java label anchor missing');
  fs.writeFileSync(java, j.replace(from, to));
  console.log('java lean label added');
} else console.log('skip java label');
