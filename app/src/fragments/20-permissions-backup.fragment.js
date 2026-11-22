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
  async function maybeOfferTargetAdjustment() {
    if (!loaded || activeDate !== localDate() || state?.temporaryTargets?.status === 'active') return;
    const meals = state.meals.filter(meal => meal.date === activeDate), totals = totalsFor(meals), p = state.profile || {};
    const target = number(p.calorieTarget), fatMin = number(p.fatMin), fatMax = number(p.fatMax);
    if (!meals.length || totals.calories === null || target === null || fatMin === null || fatMax === null) return;
    const threshold = target + Math.max(50, target * .05);
    if (totals.calories <= threshold) return;
    const promptKey = `qingheng.target-adjustment.${activeDate}`;
    try {if (localStorage.getItem(promptKey) === '1') return; localStorage.setItem(promptKey, '1');} catch {}
    // 下调公式放在 calc.js，与服务端的同一套规则对齐，并能被行为测试直接跑。
    const calc = window.QinghengCalc && typeof window.QinghengCalc.adjustedTargets === 'function'
      ? window.QinghengCalc.adjustedTargets(p) : null;
    const floor = p.sex === 'female' ? 1200 : 1500;
    const adjustedCalories = calc && calc.ok ? calc.calorieTarget
      : Math.max(floor, Math.round((target - Math.min(250, Math.max(100, target * .10))) / 50) * 50);
    const adjustedFatMax = calc && calc.ok && calc.fatMax !== null ? calc.fatMax
      : Math.max(fatMin, Math.round(fatMax * .90));
    const message = `今天已记录 ${fmt(totals.calories, 0)} kcal，超过目标约 ${fmt(totals.calories - target, 0)} kcal。是否仅在明天临时调整为热量 ${fmt(adjustedCalories, 0)} kcal、脂肪不超过 ${fmt(adjustedFatMax, 0)} g？原目标不会改变，明天结束后自动恢复。`;
    if (!await askConfirm(message, {title:'调整明日目标', ok:'调整明日'})) return;
    try {
      const saved = await api('/api/target-adjustment', {action:'adjust'});
      await loadState({quiet:true, offerTargetAdjustment:false});
      // 用服务端存下来的值回话：它可能因为已有生效目标而直接返回旧值，不能拿本地算式冒充。
      const temp = saved && saved.temporary ? saved.temporary : {calorieTarget: adjustedCalories, fatMax: adjustedFatMax};
      notice(`明日将临时使用 ${fmt(temp.calorieTarget, 0)} kcal 与脂肪上限 ${fmt(temp.fatMax, 0)} g；原目标已保留。`);
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
  function installQuickRecordControls() {
    const heading = $('.energy-card .card-heading');
    if (heading && !$('#quick-record')) {
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'text-button quick-record-link'; button.id = 'quick-record';
      button.innerHTML = '复制一餐';
      heading.appendChild(button);
      button.addEventListener('click', openQuickRecord);
    }
    if (!$('#quick-record-dialog')) {
      const root = document.createElement('div');
      root.className = 'app-dialog'; root.id = 'quick-record-dialog'; root.hidden = true;
      root.innerHTML = `<div class="app-dialog-panel app-dialog-panel--quick" role="dialog" aria-modal="true" aria-labelledby="quick-record-title"><h2 id="quick-record-title">快速记录</h2><form id="quick-record-form"><label>日期<input id="quick-record-date" type="date" required></label><div class="quick-type"><span class="quick-type-label">餐次</span><div class="quick-type-row" id="quick-record-type" role="radiogroup" aria-label="餐次">${QUICK_MEAL_TYPES.map(([value, label]) => `<button type="button" class="quick-type-chip" data-meal-type="${value}" role="radio" aria-checked="false">${label}</button>`).join('')}</div></div><div class="quick-source"><span class="quick-source-label">复制哪一餐</span><div class="quick-source-list" id="quick-record-source" role="radiogroup" aria-label="复制哪一餐"></div></div><label>份量比例<input id="quick-record-scale" type="number" min="0.1" max="10" step="0.1" value="1"></label><label>进餐时间<input id="quick-record-time" type="time" required></label><label>名称补充<span class="field-with-action"><input id="quick-record-text" maxlength="120" placeholder="可选，也可使用语音输入"><button type="button" class="mic-button" data-voice-target="quick" aria-label="用语音补充名称"><span class="mic-icon" aria-hidden="true"><img src="./icon-mic.svg" alt="" width="20" height="20"></span></button></span></label><p class="form-feedback" id="quick-record-feedback" role="status" aria-live="polite"></p><div class="app-dialog-actions"><button type="button" class="button subtle" id="quick-record-cancel">取消</button><button type="submit" class="button primary">保存</button></div></form></div>`;
      document.body.appendChild(root);
      $('#quick-record-cancel').addEventListener('click', () => closeQuickRecord());
      root.addEventListener('click', event => {if (event.target === root) closeQuickRecord();});
      // Esc 关闭并归还焦点：弹窗打开后没有出口是触屏用户最常踩的坑之一。
      root.addEventListener('keydown', event => {
        if (event.key === 'Escape') {event.preventDefault(); closeQuickRecord();}
      });
      $('#quick-record-type').addEventListener('click', event => {
        const chip = event.target.closest('[data-meal-type]');
        if (chip) setQuickRecordType(chip.dataset.mealType);
      });
      $('#quick-record-form').addEventListener('submit', submitQuickRecord);
    }
  }
  function closeQuickRecord() {
    const root = $('#quick-record-dialog');
    if (!root || root.hidden) return;
    root.hidden = true;
    if (quickRecordOpener && typeof quickRecordOpener.focus === 'function') quickRecordOpener.focus();
    quickRecordOpener = null;
  }
  function openQuickRecord() {
    const root = $('#quick-record-dialog'), select = $('#quick-record-source'), feedback = $('#quick-record-feedback');
    // 同一天可能有多餐：先按日期倒序，再按进餐时间倒序，否则同日的先后取决于存储顺序。
    const mealOrder = (meal) => String(meal.date || '') + ' ' + String(meal.mealTime || '');
    // 收藏的餐食优先出现在「复制哪一餐」里，再补最近 12 餐；同一条只出现一次。
    const favorites = state.meals.filter(meal => meal && meal.favorite === true)
      .sort((a, b) => mealOrder(b).localeCompare(mealOrder(a)));
    const recent = state.meals.slice().sort((a, b) => mealOrder(b).localeCompare(mealOrder(a))).slice(0, 12);
    const merged = [], seen = new Set();
    for (const meal of [...favorites, ...recent]) {
      const key = meal.id ?? `${meal.date}|${meal.mealTime}|${meal.name}`;
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(meal);
      if (merged.length >= 12) break;
    }
    quickRecordSources = merged;
    // 还没有任何历史餐食时，这个弹窗没有任何可复制的对象：直接带去「记一餐」，
    // 不要留一个点保存只会报「请选择要复制的餐食」的死路。
    if (!merged.length) {
      root.hidden = true;
      switchTab('records', true);
      setTimeout(() => {
        const field = $('#meal-text');
        if (!field) return;
        field.scrollIntoView({block: 'center', behavior: 'smooth'});
        field.focus({preventScroll: true});
      }, 60);
      notice('先记一餐，之后就能在这里快速复制。');
      return;
    }
    const quickTypeLabel = {breakfast: '早餐', lunch: '午餐', dinner: '晚餐', snack: '加餐'};
    const quickShortName = (meal) => {
      const raw = stripQuickTag(String(meal.name || '未命名餐食')).replace(/\s+/g, ' ').trim() || '未命名餐食';
      return raw.length > 14 ? raw.slice(0, 14) + '…' : raw;
    };
    quickRecordSelected = 0;
    // 原生 <select> 在这个弹层里选择体验不稳定，改成弹窗内的单选列表：点一行即选中。
    select.innerHTML = quickRecordSources.length
      ? quickRecordSources.map((meal, index) => {
        const kcal = Math.round(Number(meal.calories ?? meal.totals?.calories ?? 0)) || 0;
        return `<button type="button" class="quick-source-item${index === 0 ? ' is-selected' : ''}" data-index="${index}" role="radio" aria-checked="${index === 0}">`
          + `<span class="quick-source-meta">${esc(meal.date || '')} ${esc(quickTypeLabel[meal.mealType] || '')}${meal.favorite === true ? ' · 收藏' : ''}</span>`
          + `<span class="quick-source-name">${esc(quickShortName(meal))}</span>`
          + (kcal ? `<span class="quick-source-kcal">${kcal} kcal</span>` : '')
          + '</button>';
      }).join('')
      : '<p class="quick-source-empty">先记录一餐后，就可以在这里快速复制。</p>';
    if (!select.dataset.bound) {
      select.dataset.bound = '1';
      select.addEventListener('click', event => {
        const item = event.target.closest('.quick-source-item');
        if (!item) return;
        quickRecordSelected = Number(item.dataset.index) || 0;
        select.querySelectorAll('.quick-source-item').forEach(node => {
          const on = node === item;
          node.classList.toggle('is-selected', on);
          node.setAttribute('aria-checked', on ? 'true' : 'false');
        });
      });
    }
    $('#quick-record-date').value = activeDate;
    const quickTime = $('#quick-record-time'); if (quickTime) quickTime.value = nowClock();
    setQuickRecordType(defaultMealTypeFor(nowClock()));
    $('#quick-record-scale').value = '1';
    $('#quick-record-text').value = '';
    feedback.textContent = quickRecordSources.length ? '' : '先记录一餐后，就可以在这里快速复制。';
    root.hidden = false;
    quickRecordOpener = document.activeElement;
    // 打开时把焦点移进弹窗本体：键盘用户不必再 Tab 一遍页面才能到表单。
    const panel = root.querySelector('.app-dialog-panel');
    if (panel) {panel.tabIndex = -1; panel.focus({preventScroll: true});}
    // 打开时回到顶部并收起键盘：否则表单会停在「份量比例」，日期与餐次被滚出视野。
    if (document.activeElement && typeof document.activeElement.blur === 'function') document.activeElement.blur();
    const quickForm = $('#quick-record-form');
    if (quickForm) quickForm.scrollTop = 0;
  }
  async function submitQuickRecord(event) {
    event.preventDefault();
    const root = $('#quick-record-dialog'), feedback = $('#quick-record-feedback');
    const source = quickRecordSources[quickRecordSelected];
    if (!source) {feedback.textContent = '请选择要复制的餐食。'; return;}
    const factor = number($('#quick-record-scale').value);
    if (factor === null || factor < .1 || factor > 10) {feedback.textContent = '份量比例要在 0.1 到 10 之间。'; return;}
    const scale = value => value === null || value === undefined ? null : Math.round(Number(value) * factor * 100) / 100;
    const items = Array.isArray(source.items) ? source.items.map(item => ({...item, grams:scale(item.grams), calories:scale(item.calories), protein:scale(item.protein), fat:scale(item.fat), carbs:scale(item.carbs)})) : [];
    const totals = Object.fromEntries(['calories','protein','fat','carbs'].map(key => [key, scale(source[key] ?? source.totals?.[key])]));
    // 名称不再补「（快速记录）」：餐食行本来就有「复制」标签，补了会随复制层层叠加。
    const name = $('#quick-record-text').value.trim() || stripQuickTag(source.name) || '未命名餐食';
    const button = $('button[type="submit"]', event.currentTarget);
    button.disabled = true;
    try {
      const quickTime = clockPattern.test($('#quick-record-time').value) ? $('#quick-record-time').value : nowClock();
      await api('/api/meals', {date:$('#quick-record-date').value, mealType:quickRecordType, mealTime:quickTime, mealTimeSource:'manual', name, source:'quick-copy', items, ...totals, totals});
      closeQuickRecord();
      await loadState({quiet:true});
      notice('快速记录已保存。');
    } catch (error) {feedback.textContent = error.message;}
    finally {button.disabled = false;}
  }
