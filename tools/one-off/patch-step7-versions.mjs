/*
 * Step 7 (UI): show the versions that make a record explainable (prompt, 口径, anchors, last backup)
 * in the about subpage, so a stored answer can be traced to the text that produced it.
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

patch('app/src/main/assets/index.html', [
  [
    'version card in about',
    '<h3>本机存储</h3>',
    '<h3>版本与口径</h3><div class="row-meta" id="version-info"><span>正在读取版本…</span></div><p class="fine-print">每条记录都由当时的提示词与口径算出；升级后旧记录不会被重新解释，这里的版本号用于区分。</p><h3>本机存储</h3>',
  ],
]);

patch('app/src/main/assets/app.js', [
  [
    'render versions',
    '  async function loadStorageStatus(remirror = false) {',
    `  /** Shows which prompt/口径/anchors produced the records, and when the last backup was made. */
  async function loadVersions() {
    const box = $('#version-info');
    if (!box) return;
    try {
      const info = await api('/api/versions');
      const backup = info?.backupAt ? new Date(info.backupAt).toLocaleString('zh-CN') : '从未';
      const anchors = info?.anchorsPresent
        ? \`锚点 \${info.anchorsUpdatedAt ? new Date(info.anchorsUpdatedAt).toLocaleDateString('zh-CN') : '已同步'}\`
        : '锚点未同步';
      box.innerHTML = \`<span>应用 <b>v\${esc(info?.appVersion || APP_VERSION)}</b></span><span>提示词 <b>v\${fmt(info?.promptVersion, 0)}</b></span><span>口径 <b>v\${fmt(info?.rulesVersion, 0)}</b></span><span>\${esc(anchors)}</span><span>上次备份 <b>\${esc(backup)}</b></span>\`;
    } catch (error) {
      box.textContent = error.message;
    }
  }
  async function loadStorageStatus(remirror = false) {`,
  ],
  [
    'load versions with the storage panel',
    "    if (sub === 'about') loadStorageStatus(false).catch(() => {});",
    "    if (sub === 'about') {loadStorageStatus(false).catch(() => {}); loadVersions().catch(() => {});}",
  ],
]);

console.log('step 7 version card wired');
