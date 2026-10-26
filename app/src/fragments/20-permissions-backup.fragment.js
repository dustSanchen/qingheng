/* Fragment of assets/app.js -- assembled by tools/assemble-app.ps1 in filename order.
 * Edit this file, never the generated assets/app.js; tests/app-fragments.test.mjs fails on drift. */
  // ---- The three things that decide whether reminders and watch data actually work --------------
  const PERMISSION_ITEMS = [
    {key: 'notifications', label: '通知权限', why: '没有它，到点的提醒不会出现。', action: '申请通知权限', required: true},
    {key: 'exactAlarm', label: '精确闹钟', why: '系统默认可以把提醒推迟最多 1 小时；开启后按点送达。', action: '去系统设置允许', required: true},
    {key: 'health', label: '健康数据（Health Connect）', why: '读取睡眠、步数、运动、活动热量与距离；不授权时其余功能照常可用。', action: '打开授权页', required: false}
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
    notice(`建议现在导出一次备份：${info.reason}。文件在手机本地，卸载应用会一起删除。`, true);
  }
  async function maybeOfferTargetAdjustment() {
    if (!loaded || activeDate !== localDate() || state?.temporaryTargets?.status === 'active') return;
    const meals = state.meals.filter(meal => meal.date === activeDate), totals = totalsFor(meals), p = state.profile || {};
    const target = number(p.calorieTarget), fatMin = number(p.fatMin), fatMax = number(p.fatMax);
    if (!meals.length || totals.calories === null || target === null || fatMin === null || fatMax === null) return;
    const threshold = target + Math.max(50, target * .05);
    if (totals.calories <= threshold) return;
    const promptKey = `qingheng.target-adjustment.${activeDate}`;
    try {if (localStorage.getItem(promptKey) === '1') return; localStorage.setItem(promptKey, '1');} catch {}
    const floor = p.sex === 'female' ? 1200 : 1500;
    const adjustedCalories = Math.max(floor, Math.round((target - Math.min(250, Math.max(100, target * .10))) / 50) * 50);
    const adjustedFatMax = Math.max(fatMin, Math.round(fatMax * .90));
    const message = `今天已记录 ${fmt(totals.calories, 0)} kcal，超过目标约 ${fmt(totals.calories - target, 0)} kcal。是否仅在明天临时调整为热量 ${fmt(adjustedCalories, 0)} kcal、脂肪不超过 ${fmt(adjustedFatMax, 0)} g？原目标不会改变，明天结束后自动恢复。`;
    if (!await askConfirm(message, {title:'调整明日目标', ok:'调整明日'})) return;
    try {
      await api('/api/target-adjustment', {action:'adjust'});
      await loadState({quiet:true, offerTargetAdjustment:false});
      notice(`明日将临时使用 ${fmt(adjustedCalories, 0)} kcal 与脂肪上限 ${fmt(adjustedFatMax, 0)} g；原目标已保留。`);
    } catch (error) {
      try {localStorage.removeItem(promptKey);} catch {}
      notice(error.message, true);
    }
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
  function installQuickRecordControls() {
    const detail = $('.energy-actions') || $('.energy-detail');
    if (detail && !$('#quick-record')) {
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'button subtle'; button.id = 'quick-record'; button.textContent = '快速记录';
      // 插在主按钮之后：「＋ 记录一餐」是主路径，不能被次按钮挤到屏外。
      detail.appendChild(button);
      button.addEventListener('click', openQuickRecord);
    }
    if (!$('#quick-record-dialog')) {
      const root = document.createElement('div');
      root.className = 'app-dialog'; root.id = 'quick-record-dialog'; root.hidden = true;
      root.innerHTML = `<div class="app-dialog-panel app-dialog-panel--quick" role="dialog" aria-modal="true" aria-labelledby="quick-record-title"><h2 id="quick-record-title">快速记录</h2><form id="quick-record-form"><label>日期<input id="quick-record-date" type="date" required></label><label>餐次<select id="quick-record-type"><option value="breakfast">早餐</option><option value="lunch">午餐</option><option value="dinner">晚餐</option><option value="snack">加餐</option></select></label><label>复制哪一餐<select id="quick-record-source"></select></label><label>份量比例<input id="quick-record-scale" type="number" min="0.1" max="10" step="0.1" value="1"></label><label>进餐时间<input id="quick-record-time" type="time" required></label><label>名称补充<span class="field-with-action"><input id="quick-record-text" maxlength="120" placeholder="可选，也可使用语音输入"><button type="button" class="mic-button" data-voice-target="quick" aria-label="用语音补充名称"><span class="mic-icon" aria-hidden="true"><img src="./icon-mic.svg" alt="" width="20" height="20"></span></button></span></label><p class="form-feedback" id="quick-record-feedback" role="status" aria-live="polite"></p><div class="app-dialog-actions"><button type="button" class="button subtle" id="quick-record-cancel">取消</button><button type="submit" class="button primary">保存</button></div></form></div>`;
      document.body.appendChild(root);
      $('#quick-record-cancel').addEventListener('click', () => {root.hidden = true;});
      root.addEventListener('click', event => {if (event.target === root) root.hidden = true;});
      $('#quick-record-form').addEventListener('submit', submitQuickRecord);
    }
  }
  function openQuickRecord() {
    const root = $('#quick-record-dialog'), select = $('#quick-record-source'), feedback = $('#quick-record-feedback');
    quickRecordSources = state.meals.slice().sort((a, b) => String(b.date || '').localeCompare(String(a.date || ''))).slice(0, 12);
    select.innerHTML = quickRecordSources.length
      ? quickRecordSources.map((meal, index) => `<option value="${index}">${esc(meal.date || '')} · ${esc(meal.name || '未命名餐食')}</option>`).join('')
      : '<option value="">还没有可复制的餐食</option>';
    $('#quick-record-date').value = activeDate;
    const quickTime = $('#quick-record-time'); if (quickTime) quickTime.value = nowClock();
    $('#quick-record-type').value = 'snack';
    $('#quick-record-scale').value = '1';
    $('#quick-record-text').value = '';
    feedback.textContent = quickRecordSources.length ? '' : '先记录一餐后，就可以在这里快速复制。';
    root.hidden = false;
  }
  async function submitQuickRecord(event) {
    event.preventDefault();
    const root = $('#quick-record-dialog'), feedback = $('#quick-record-feedback');
    const source = quickRecordSources[Number($('#quick-record-source').value)];
    if (!source) {feedback.textContent = '请选择要复制的餐食。'; return;}
    const factor = number($('#quick-record-scale').value);
    if (factor === null || factor < .1 || factor > 10) {feedback.textContent = '份量比例要在 0.1 到 10 之间。'; return;}
    const scale = value => value === null || value === undefined ? null : Math.round(Number(value) * factor * 100) / 100;
    const items = Array.isArray(source.items) ? source.items.map(item => ({...item, grams:scale(item.grams), calories:scale(item.calories), protein:scale(item.protein), fat:scale(item.fat), carbs:scale(item.carbs)})) : [];
    const totals = Object.fromEntries(['calories','protein','fat','carbs'].map(key => [key, scale(source[key] ?? source.totals?.[key])]));
    const name = $('#quick-record-text').value.trim() || `${source.name || '未命名餐食'}（快速记录）`;
    const button = $('button[type="submit"]', event.currentTarget);
    button.disabled = true;
    try {
      const quickTime = clockPattern.test($('#quick-record-time').value) ? $('#quick-record-time').value : nowClock();
      await api('/api/meals', {date:$('#quick-record-date').value, mealType:$('#quick-record-type').value, mealTime:quickTime, mealTimeSource:'manual', name, source:'quick-copy', items, ...totals, totals});
      root.hidden = true;
      await loadState({quiet:true});
      notice('快速记录已保存。');
    } catch (error) {feedback.textContent = error.message;}
    finally {button.disabled = false;}
  }
