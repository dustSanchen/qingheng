/*
 * Step 3 markup: onboarding gains a fourth step with the three permission checks, and the data
 * management subpage gains the same checklist plus a backup-status line so both can be re-checked
 * at any time. Fails loudly when an anchor is missing.
 */
import fs from 'node:fs';

const file = 'app/src/main/assets/index.html';
let html = fs.readFileSync(file, 'utf8');

function once(from, to, label) {
  const count = html.split(from).length - 1;
  if (count !== 1) throw new Error(`${label}: expected 1 anchor, found ${count}`);
  html = html.replace(from, to);
  console.log(`ok  ${label}`);
}

once(
  '<p class="muted" id="onboarding-lead">三步完成设置，之后就能记录饮食与身体数据。所有数据只保存在这台手机上。</p>',
  '<p class="muted" id="onboarding-lead">四步完成设置，之后就能记录饮食与身体数据。所有数据只保存在这台手机上。</p>',
  'lead text',
);

once(
  '<div class="steps" id="onboarding-dots" aria-hidden="true"><span class="step-dot" data-step="1"></span><span class="step-dot" data-step="2"></span><span class="step-dot" data-step="3"></span></div>',
  '<div class="steps" id="onboarding-dots" aria-hidden="true"><span class="step-dot" data-step="1"></span><span class="step-dot" data-step="2"></span><span class="step-dot" data-step="3"></span><span class="step-dot" data-step="4"></span></div>',
  'step dots',
);

const step4 = `
    <section class="onboarding-step" data-step="4" hidden>
      <h2>最后三件事</h2>
      <p class="muted">这三项都是可选的，但开了体验才完整：提醒才能准时到，手表数据才能读进来。</p>
      <div class="check-list" id="ob-checks" role="list"></div>
      <div class="button-row"><button type="button" class="button subtle" id="ob-check-refresh">重新检查</button></div>
      <p class="fine-print" id="ob-check-note">状态会在你回到应用时自动刷新。</p>
    </section>
`;

once(
  '    <div class="onboarding-actions">',
  step4 + '    <div class="onboarding-actions">',
  'onboarding step 4',
);

once(
  '<p class="fine-print">手机 APK 可离线读取、保存与使用本地规则建议 / 明确克重食物估算。只有你同意的外部 AI 调用需要网络。浏览器演示仅将健康记录保存在当前浏览器，不保存密钥。导入按日期或记录 ID 合并；请先备份。</p></article></div>',
  '<p class="fine-print">手机 APK 可离线读取、保存与使用本地规则建议 / 明确克重食物估算。只有你同意的外部 AI 调用需要网络。浏览器演示仅将健康记录保存在当前浏览器，不保存密钥。导入按日期或记录 ID 合并；请先备份。</p></article>'
    + '<article class="card"><div class="card-heading"><h2>权限检查</h2><span class="tag" id="perm-check-tag">检查中</span></div><div class="check-list" id="data-checks" role="list"></div><div class="button-row"><button type="button" class="button subtle" id="data-check-refresh">重新检查</button></div><p class="fine-print" id="data-check-note">通知与精确闹钟影响提醒能否准时；健康数据未授权时，其余功能不受影响。</p></article>'
    + '<article class="card"><div class="card-heading"><h2>备份</h2><span class="tag" id="backup-tag">检查中</span></div><div class="row-meta" id="backup-status"><span>正在读取备份状态…</span></div><div class="button-row"><button type="button" class="button subtle" id="backup-now">立即导出备份</button></div><p class="fine-print" id="backup-note">JSON 是唯一权威数据；卸载应用会一起删除，建议每 7 天或新增 20 条记录后导出一次。</p></article>'
    + '</div>',
  'data subpage checks',
);

fs.writeFileSync(file, html);
for (const id of ['ob-checks', 'ob-check-refresh', 'data-checks', 'data-check-refresh', 'backup-tag', 'backup-now', 'backup-status']) {
  if (!html.includes(`id="${id}"`)) throw new Error(`missing new node: ${id}`);
}
console.log(`index.html patched for step 3 (${html.length} bytes)`);
