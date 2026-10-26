/*
 * Step 3 logic: the three-item permission checklist (onboarding step 4 + data management card) and
 * the backup reminder. Both read state from existing native routes; nothing is granted silently.
 */
import fs from 'node:fs';

function patch(file, edits) {
  let text = fs.readFileSync(file, 'utf8');
  for (const [label, from, to] of edits) {
    const count = text.split(from).length - 1;
    if (count !== 1) throw new Error(`${file} :: ${label}: expected 1 anchor, found ${count}`);
    text = text.replace(from, to);
    console.log(`ok  ${label}`);
  }
  fs.writeFileSync(file, text);
}

patch('app/src/main/assets/app.js', [
  [
    'onboarding has four steps',
    'const onboarding = {step: 1, total: 3, done: false, result: null, saving: false};',
    'const onboarding = {step: 1, total: 4, done: false, result: null, saving: false};',
  ],
  [
    'checklist + backup helpers',
    '  async function maybeOfferTargetAdjustment() {',
    `  // ---- The three things that decide whether reminders and watch data actually work --------------
  const PERMISSION_ITEMS = [
    {key: 'notifications', label: '通知权限', why: '没有它，到点的提醒不会出现。', action: '申请通知权限', required: true},
    {key: 'exactAlarm', label: '精确闹钟', why: '系统默认可以把提醒推迟最多 1 小时；开启后按点送达。', action: '去系统设置允许', required: true},
    {key: 'health', label: '健康数据（Health Connect）', why: '读取睡眠、步数、运动、活动热量与距离；不授权时其余功能照常可用。', action: '打开授权页', required: false}
  ];
  let permissionState = {notifications: null, exactAlarm: null, health: null, healthReason: ''};
  /** Reads all three states from the routes that already own them; a failure stays "unknown". */
  async function readPermissionState() {
    const next = {notifications: null, exactAlarm: null, health: null, healthReason: ''};
    try {const s = await api('/api/notification-permission'); next.notifications = s?.granted === true;} catch {}
    try {const p = await api('/api/push'); next.exactAlarm = p?.canScheduleExact === true;} catch {}
    try {const h = await api('/api/health-connect/status'); next.health = h?.permissionsGranted === true; next.healthReason = h?.reason || '';} catch {}
    permissionState = next;
    return next;
  }
  function permissionRow(item, granted) {
    const state = granted === null ? 'unknown' : granted ? 'ok' : 'todo';
    const tag = granted === null ? '状态未知' : granted ? '已开启' : (item.required ? '未开启' : '未授权');
    return \`<div class="check-row \${state}" role="listitem" data-check="\${item.key}"><div class="row-body">\`
      + \`<div class="row-head"><strong>\${esc(item.label)}</strong><span class="row-tag \${state === 'ok' ? '' : 'subtle-tag'}">\${esc(tag)}</span></div>\`
      + \`<div class="row-meta"><span>\${esc(item.why)}</span></div>\`
      + (item.key === 'health' && !granted && permissionState.healthReason ? \`<div class="row-meta"><span>\${esc(permissionState.healthReason)}</span></div>\` : '')
      + \`</div><div class="row-side">\${granted === true ? '' : \`<button type="button" class="button subtle" data-check-fix="\${item.key}">\${esc(item.action)}</button>\`}</div></div>\`;
  }
  function renderPermissionChecklist() {
    const html = PERMISSION_ITEMS.map(item => permissionRow(item, permissionState[item.key])).join('');
    for (const id of ['#ob-checks', '#data-checks']) {
      const node = $(id);
      if (node) node.innerHTML = html;
    }
    const done = PERMISSION_ITEMS.filter(item => permissionState[item.key] === true).length;
    const tag = $('#perm-check-tag');
    if (tag) tag.textContent = done === PERMISSION_ITEMS.length ? '全部就绪' : \`\${done}/\${PERMISSION_ITEMS.length} 已开启\`;
    for (const id of ['#ob-check-note', '#data-check-note']) {
      const node = $(id);
      if (!node) continue;
      if (permissionState.health === false) node.textContent = '健康数据未授权：提醒与其他记录功能不受影响；授权方式见上方按钮。';
      else if (done === PERMISSION_ITEMS.length) node.textContent = '三项都已就绪。';
      else node.textContent = '状态会在你回到应用时自动刷新。';
    }
  }
  async function refreshPermissionChecklist() {
    await readPermissionState();
    renderPermissionChecklist();
    return permissionState;
  }
  async function fixPermission(key) {
    const item = PERMISSION_ITEMS.find(entry => entry.key === key);
    if (key === 'notifications') {
      const granted = await ensureNotificationPermission();
      notice(granted ? '通知权限已开启。' : '仍未获得通知权限：请到系统设置 → 应用 → 轻衡 → 通知开启。', !granted);
    } else if (key === 'exactAlarm') {
      const bridge = window.QinghengNative;
      if (bridge && typeof bridge.openExactAlarmSettings === 'function') {bridge.openExactAlarmSettings(); notice('已打开系统设置；允许「闹钟与提醒」后返回应用。');}
      else notice('精确闹钟设置需要已安装的 APK。', true);
    } else if (key === 'health') {
      const bridge = window.QinghengNative;
      if (bridge && typeof bridge.requestHealthConnectPermissions === 'function') {
        notice('请在 Health Connect 中允许这五项读取；返回应用后会自动继续。');
        await waitHealthResult(180000).catch(() => null);
      } else notice('健康数据授权需要已安装的 APK。', true);
    } else return;
    await refreshPermissionChecklist().catch(() => {});
    if (item) notice(\`\${item.label}：\${permissionState[key] === true ? '已开启' : '仍未开启'}\`, permissionState[key] !== true);
  }

  // ---- Backup reminder: JSON is the only authoritative store, so an uninstall loses everything ---
  let backupState = null;
  async function refreshBackupStatus() {
    const tag = $('#backup-tag'), status = $('#backup-status');
    try {
      backupState = await api('/api/backup');
    } catch (error) {
      if (tag) tag.textContent = '读取失败';
      if (status) status.textContent = error.message;
      return null;
    }
    const info = backupState || {};
    if (tag) tag.textContent = info.due ? '建议备份' : '已备份';
    if (status) {
      const when = info.at ? new Date(info.at).toLocaleString('zh-CN') : '从未';
      status.innerHTML = \`<span>上次导出：<b>\${esc(when)}</b></span><span>当前记录：<b>\${fmt(info.records, 0)}</b> 条</span>\`
        + (info.reason ? \`<span class="warn-text">\${esc(info.reason)}</span>\` : '');
    }
    return info;
  }
  function maybeRemindBackup(info) {
    if (!info?.due) return;
    const key = \`qingheng.backup-reminded.\${localDate()}\`;
    try {if (localStorage.getItem(key) === '1') return; localStorage.setItem(key, '1');} catch {}
    notice(\`建议现在导出一次备份：\${info.reason}。文件在手机本地，卸载应用会一起删除。\`, true);
  }
  async function maybeOfferTargetAdjustment() {`,
  ],
  [
    'wire checklist buttons and refresh',
    "  $('#manual-meal-form').addEventListener('submit',",
    `  for (const id of ['#ob-checks', '#data-checks']) {
    const node = $(id);
    if (node) node.addEventListener('click', event => {
      const button = event.target.closest?.('[data-check-fix]');
      if (button) fixPermission(button.dataset.checkFix).catch(() => {});
    });
  }
  for (const id of ['#ob-check-refresh', '#data-check-refresh']) {
    const node = $(id);
    if (node) node.addEventListener('click', () => refreshPermissionChecklist()
      .then(() => notice('权限状态已刷新。'))
      .catch(error => notice(error.message, true)));
  }
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible' || !loaded) return;
    refreshPermissionChecklist().catch(() => {});
    refreshBackupStatus().catch(() => {});
  });
  $('#backup-now').addEventListener('click', event => {
    const button = event.currentTarget;
    button.disabled = true;
    $('#export-data').click();
    setTimeout(() => {button.disabled = false; refreshBackupStatus().catch(() => {});}, 1500);
  });
  $('#manual-meal-form').addEventListener('submit',`,
  ],
  [
    'refresh checks when onboarding reaches step 4',
    '    if (onboarding.step === 2) obSyncTargets();',
    '    if (onboarding.step === 2) obSyncTargets();\n    if (onboarding.step === 4) refreshPermissionChecklist().catch(() => {});',
  ],
  [
    'record the export after a successful backup',
    "window.QinghengNative.exportJson(JSON.stringify(data));feedback(message,'请选择手机文件保存位置。备份包含健康记录，请妥善保管。');return;}",
    "window.QinghengNative.exportJson(JSON.stringify(data));await markBackedUp();feedback(message,'请选择手机文件保存位置。备份包含健康记录，请妥善保管。');return;}",
  ],
  [
    'mark the browser download as a backup too',
    "feedback(message,'备份下载已开始。文件含健康记录，请妥善保管。');setTimeout(()=>URL.revokeObjectURL(url),10000);}",
    "feedback(message,'备份下载已开始。文件含健康记录，请妥善保管。');setTimeout(()=>URL.revokeObjectURL(url),10000);await markBackedUp();}",
  ],
  [
    'markBackedUp helper',
    '  async function refreshBackupStatus() {',
    `  /** Records that an export just happened, then refreshes the panel. */
  async function markBackedUp() {
    try {
      const info = await api('/api/backup', {records: number(backupState?.records) ?? 0});
      backupState = info;
      renderBackupStatus();
    } catch { /* A failed bookkeeping write must not fail the export the user already got. */ }
  }
  function renderBackupStatus() {
    const tag = $('#backup-tag'), status = $('#backup-status'), info = backupState || {};
    if (tag) tag.textContent = info.due ? '建议备份' : '已备份';
    if (status) {
      const when = info.at ? new Date(info.at).toLocaleString('zh-CN') : '从未';
      status.innerHTML = \`<span>上次导出：<b>\${esc(when)}</b></span><span>当前记录：<b>\${fmt(info.records, 0)}</b> 条</span>\`
        + (info.reason ? \`<span class="warn-text">\${esc(info.reason)}</span>\` : '');
    }
  }
  async function refreshBackupStatus() {`,
  ],
  [
    'run the checks at startup',
    '  switchTab(restoreTab());render();connection();syncAnchors().catch(()=>{});',
    '  switchTab(restoreTab());render();connection();syncAnchors().catch(()=>{});\n  readPermissionState().then(renderPermissionChecklist).catch(()=>{});\n  refreshBackupStatus().then(maybeRemindBackup).catch(()=>{});',
  ],
]);

console.log('step 3 logic wired');
