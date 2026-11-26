/* Fragment of assets/app.js -- assembled by tools/assemble-app.ps1 in filename order.
 * Edit this file, never the generated assets/app.js; tests/app-fragments.test.mjs fails on drift. */
  // ---- The three things that decide whether reminders and watch data actually work --------------
  const PERMISSION_ITEMS = [
    {key: 'notifications', label: '通知权限', why: '没有它，到点的提醒不会出现。', action: '申请通知权限', required: true},
    {key: 'exactAlarm', label: '精确闹钟', why: '系统默认可以把提醒推迟最多 1 小时；开启后按点送达。', action: '去系统设置允许', required: true},
    {key: 'health', label: '健康数据（Health Connect）', why: '读取睡眠、步数、运动、热量与距离；不授权时其余功能照常可用。', action: '打开授权页', required: false}
  ];
  let permissionState = {notifications: null, exactAlarm: null, health: null, healthReason: ''};
  /** Reads all three states from the routes that already own them; a failure stays "unknown". */
  async function readPermissionState() {
    const next = {notifications: null, exactAlarm: null, health: null, healthReason: ''};
    // Each check is capped: a native route that stops answering must not freeze the checklist.
    try {const s = await withTimeout(api('/api/notification-permission'), 3000, 'perm.notifications'); next.notifications = s?.granted === true;} catch {}
    try {const p = await withTimeout(api('/api/push'), 3000, 'perm.push'); next.exactAlarm = p?.canScheduleExact === true;} catch {}
    try {const h = await withTimeout(api('/api/health-connect/status'), 3000, 'perm.health'); next.health = h?.permissionsGranted === true; next.healthReason = h?.reason || '';} catch {}
    permissionState = next;
    console.info('[perm] checklist ready', JSON.stringify(next));
    return next;
  }
  function permissionRow(item, granted) {
    const state = granted === null ? 'unknown' : granted ? 'ok' : 'todo';
    const tag = granted === null ? '状态未知' : granted ? '已开启' : (item.required ? '未开启' : '未授权');
    return `<div class="check-row ${state}" role="listitem" data-check="${item.key}"><div class="row-body">`
      + `<div class="row-head"><strong>${esc(item.label)}</strong><span class="row-tag ${state === 'ok' ? '' : 'subtle-tag'}">${esc(tag)}</span></div>`
      + (item.key === 'notifications' && granted === false
        ? `<div class="permission-denied">${empty('通知权限没有打开', '到系统设置 → 应用 → 轻衡 → 通知开启；否则到点提醒不会出现。', 'denied')}</div>`
        : `<div class="row-meta"><span>${esc(item.why)}</span></div>`)
      + (item.key === 'health' && !granted && permissionState.healthReason ? `<div class="row-meta"><span>${esc(permissionState.healthReason)}</span></div>` : '')
      + `</div><div class="row-side">${granted === true ? '' : `<button type="button" class="button subtle" data-check-fix="${item.key}">${esc(item.action)}</button>`}</div></div>`;
  }
  function renderPermissionChecklist() {
    const html = PERMISSION_ITEMS.map(item => permissionRow(item, permissionState[item.key])).join('');
    for (const id of ['#ob-checks', '#data-checks']) {
      const node = $(id);
      if (node) node.innerHTML = html;
    }
    const done = PERMISSION_ITEMS.filter(item => permissionState[item.key] === true).length;
    const tag = $('#perm-check-tag');
    if (tag) tag.textContent = done === PERMISSION_ITEMS.length ? '全部就绪' : `${done}/${PERMISSION_ITEMS.length} 已开启`;
    for (const id of ['#ob-check-note', '#data-check-note']) {
      const node = $(id);
      if (!node) continue;
      if (permissionState.health === false) node.textContent = '健康数据未授权：提醒与其他记录功能不受影响。';
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
        try {bridge.requestHealthConnectPermissions();} catch {notice('无法发起健康数据授权请求。', true);}
        await waitHealthResult(180000).catch(() => null);
      } else notice('健康数据授权需要已安装的 APK。', true);
    } else return;
    await refreshPermissionChecklist().catch(() => {});
    if (item) notice(`${item.label}：${permissionState[key] === true ? '已开启' : '仍未开启'}`, permissionState[key] !== true);
  }

  // ---- Backup reminder: JSON is the only authoritative store, so an uninstall loses everything ---
  let backupState = null;
  /** Records that an export just happened, then refreshes the panel. */
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
      status.innerHTML = `<span>上次导出：<b>${esc(when)}</b></span><span>当前记录：<b>${fmt(info.records, 0)}</b> 条</span>`
        + (info.reason ? `<span class="warn-text">${esc(info.reason)}</span>` : '');
    }
  }
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
      status.innerHTML = `<span>上次导出：<b>${esc(when)}</b></span><span>当前记录：<b>${fmt(info.records, 0)}</b> 条</span>`
        + (info.reason ? `<span class="warn-text">${esc(info.reason)}</span>` : '');
    }
    return info;
  }
  function maybeRemindBackup(info) {
    if (!info?.due) return;
    const key = `qingheng.backup-reminded.${localDate()}`;
    try {if (localStorage.getItem(key) === '1') return; localStorage.setItem(key, '1');} catch {}
    notice(`建议现在导出一次备份：${info.reason}。文件在手机本地，卸载应用会一起删除。`, true, {label: '去导出', run: () => openSubpage('data')});
  }

  function installExactAlarmControl() {
    const form = $('#push-form');
    if (!form || $('#exact-alarm-settings')) return;
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'button subtle'; button.id = 'exact-alarm-settings'; button.textContent = '允许精确闹钟';
    form.insertBefore(button, $('#push-feedback'));
    button.addEventListener('click', () => {
      const bridge = window.QinghengNative;
      if (bridge && typeof bridge.openExactAlarmSettings === 'function') bridge.openExactAlarmSettings();
      else notice('精确闹钟设置需要已安装的 APK。', true);
    });
  }
  let quickRecordSources = [];
  let quickRecordSelected = 0;
  let quickRecordOpener = null;
  let quickRecordType = 'snack';
  const QUICK_MEAL_TYPES = [['breakfast', '早餐'], ['lunch', '午餐'], ['dinner', '晚餐'], ['snack', '加餐']];
  /** The meal type used to be a native <select>; inside the dialog layer WebView draws its popup
   *  behind the scrim, so only a stray cancel bar showed and the type could not be changed. Same
   *  fix as the source list: four in-dialog chips, 44px targets, aria-checked as the state. */
  function setQuickRecordType(type) {
    quickRecordType = QUICK_MEAL_TYPES.some(([value]) => value === type) ? type : 'snack';
    const row = $('#quick-record-type');
    if (!row) return;
    row.querySelectorAll('[data-meal-type]').forEach(node => {
      const on = node.dataset.mealType === quickRecordType;
      node.classList.toggle('is-selected', on);
      node.setAttribute('aria-checked', on ? 'true' : 'false');
    });
  }
  /**
   * 小习惯卡标题的「显示指标」（2026-11-22 第五轮）：主操作都回到卡内后取消 ⋯ 菜单，
   * 只把低频的指标选择留在小习惯卡上；换一天/复制一餐本来就是可见入口。
   */
  function installTodayMoreMenu() {
    const trigger = $('#habit-metrics');
    if (!trigger || trigger.dataset.wired === '1') return;
    trigger.dataset.wired = '1';
    trigger.addEventListener('click', async () => {
      const current = typeof todayMetrics === 'function' ? todayMetrics() : [];
      const defs = typeof TODAY_METRIC_DEFS !== 'undefined' ? TODAY_METRIC_DEFS : [];
      const picked = await openSheet({title: '显示的指标', options: defs.map(def => ({label: def.label, current: current.includes(def.key)}))});
      if (picked === null || picked === undefined) return;
      const key = defs[picked]?.key;
      if (!key) return;
      const next = current.includes(key) ? current.filter(item => item !== key) : [...current, key];
      saveTodayMetrics(next);
      render();
    });
  }
  function closeQuickRecord() {
    const root = $('#quick-record-dialog');
    if (!root || root.hidden) return;
    root.hidden = true;
    if (quickRecordOpener && typeof quickRecordOpener.focus === 'function') quickRecordOpener.focus();
    quickRecordOpener = null;
  }

