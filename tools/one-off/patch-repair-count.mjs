import fs from 'node:fs';
const file='app/src/fragments/70-rest.fragment.js';
let t=fs.readFileSync(file,'utf8');
const from = "      box.innerHTML = `<span>应用 <b>v${esc(info?.appVersion || APP_VERSION)}</b></span><span>提示词 <b>v${fmt(info?.promptVersion, 0)}</b></span><span>口径 <b>v${fmt(info?.rulesVersion, 0)}</b></span><span>${esc(anchors)}</span><span>上次备份 <b>${esc(backup)}</b></span>`;";
const to = "      const repaired = number(info?.chatAnswersRepaired) ?? 0;\n      box.innerHTML = `<span>应用 <b>v${esc(info?.appVersion || APP_VERSION)}</b></span><span>提示词 <b>v${fmt(info?.promptVersion, 0)}</b></span><span>口径 <b>v${fmt(info?.rulesVersion, 0)}</b></span><span>${esc(anchors)}</span><span>上次备份 <b>${esc(backup)}</b></span>`\n        + (repaired > 0 ? `<span>已修复 <b>${fmt(repaired, 0)}</b> 条无效回答</span>` : '');";
const n=t.split(from).length-1;
if(n!==1) throw new Error(`anchor ${n}x`);
fs.writeFileSync(file, t.replace(from,to));
console.log('version card shows the repair count');
