/* Fragment of assets/app.js -- assembled by tools/assemble-app.ps1 in filename order.
 * Edit this file, never the generated assets/app.js; tests/app-fragments.test.mjs fails on drift. */
'use strict';
(() => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const number = value => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value)) ? Number(value) : null;
  const fmt = (value, digits = 1) => number(value) === null ? '—' : Number(value).toLocaleString('zh-CN', {maximumFractionDigits:digits});
  const localDate = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
  /** Moves a YYYY-MM-DD key by whole days in local time; returns the input when it is not a date. */
  function shiftDate(day, delta) {
    if (!validDate(day)) return day;
    const [year, month, date] = day.split('-').map(Number);
    const moved = new Date(year, month - 1, date + delta);
    const pad = value => String(value).padStart(2, '0');
    return `${moved.getFullYear()}-${pad(moved.getMonth() + 1)}-${pad(moved.getDate())}`;
  }
  const validDate = value => /^\d{4}-\d{2}-\d{2}$/.test(value || '') && Number.isFinite(Date.parse(`${value}T00:00:00Z`));
  const dayTime = value => validDate(value) ? Date.parse(`${value}T00:00:00Z`) : NaN;
  /** Calendar-day shift used by the copy-a-meal and daily-three helpers. */
  const shiftDay = (value, days) => {const date = new Date(`${value}T12:00:00`); date.setDate(date.getDate() + days); return localDate(date);};
  const mealNames = {breakfast:'早餐',lunch:'午餐',dinner:'晚餐',snack:'加餐'};
  let state = {profile:{},measurements:[],meals:[],habits:[],settings:{}};
  let loaded = false, settingsKnown = false, imageData = null, imageBusy = false, imageVersion = 0, draft = null, estimateBusy = false, savingDraft = false, requestRevision = 0;
  let lastCaptureId = '';
  let mealPhotoMeta = {photoTakenAt:null,photoTimeSource:'unknown'}, chatPhotoMeta = {photoTakenAt:null,photoTimeSource:'unknown'};
  /**
   * Runs a promise with a hard time limit. Used for native permission checks: a route that never
   * returns must not leave a page waiting forever, which is what a frozen wizard looks like.
   */
  function withTimeout(promise, ms, label) {
    return new Promise((resolve, reject) => {
      let settled = false;
      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        (window.__perfLog = window.__perfLog || []).push({label: label || 'timeout', ms, at: Date.now()});
        console.info('[timeout]', label, ms);
        resolve({timeout: true});
      }, ms);
      Promise.resolve(promise).then(value => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(value);
      }, error => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        reject(error);
      });
    });
  }
  function photoMeta(value) {
    const source = ['camera','exif','exif-local'].includes(value?.photoTimeSource) ? value.photoTimeSource : 'unknown';
    const raw = value?.photoTakenAt;
    const time = source !== 'unknown' && typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(raw) && Number.isFinite(Date.parse(raw)) ? raw : null;
    return {photoTakenAt:time,photoTimeSource:time ? source : 'unknown'};
  }
  function photoTimeLabel(meta) {
    return meta?.photoTakenAt ? `拍摄时间：${new Date(meta.photoTakenAt).toLocaleString('zh-CN')}${meta.photoTimeSource === 'exif-local' ? '（原照片未注明时区，按本机时区解释，请核对）' : ''}` : '拍摄时间未知；请手动核对饮食日期，不以导入时间代替拍摄时间。';
  }
  function showPhotoTime(target, meta) {
    const node = $(`#${target}-photo-time`); if (node) node.textContent = photoTimeLabel(meta);
  }
  // ---- Meal time ------------------------------------------------------------------------------
  // The meal time is when the food was eaten, which is not the same as when the photo was taken or
  // when the record was written. Defaults run from strongest evidence to weakest: the photo's own
  // wall clock, then a time mentioned in the description, then the moment of recording.
  const clockPattern = /^([01]\d|2[0-3]):[0-5]\d$/;
  const mealSlotClock = {breakfast:'07:30', lunch:'12:30', dinner:'18:30', snack:'15:30'};
  const nowClock = () => {const d = new Date(); return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;};
  /** The wall clock written on the photo: an offset in the string is the camera's own zone. */
  function photoWallClock(meta) {
    const iso = meta?.photoTakenAt;
    if (typeof iso !== 'string' || iso.length < 16) return null;
    const clock = iso.slice(11, 16);
    return clockPattern.test(clock) ? clock : null;
  }
  /** Spoken Chinese numerals, e.g. 「早上七点」「晚上十点半」. */
  function chineseHour(text) {
    const digits = {一:1,两:2,二:2,三:3,四:4,五:5,六:6,七:7,八:8,九:9,十:10};
    if (!text) return null;
    if (text.includes('十')) {
      const parts = text.split('十');
      const tens = parts[0] === '' ? 1 : (digits[parts[0]] ?? null);
      const ones = parts[1] === '' || parts[1] === undefined ? 0 : (digits[parts[1]] ?? null);
      if (tens === null || ones === null) return null;
      return tens * 10 + ones;
    }
    return digits[text] ?? null;
  }
  /** 上午/下午/晚上/凌晨 around a stated hour. */
  function adjustHour(hour, before) {
    if (/下午|晚上|傍晚|夜/.test(before) && hour < 12) return hour + 12;
    if (/凌晨/.test(before) && hour === 12) return 0;
    return hour;
  }
  /** A time the user wrote in the description, e.g. "12:30 吃了…", "早上七点", "晚上". */
  function clockFromText(text) {
    const value = String(text || '');
    const explicit = value.match(/(\d{1,2})\s*[:：点时]\s*(\d{1,2})?/);
    if (explicit) {
      const before = value.slice(Math.max(0, explicit.index - 4), explicit.index);
      const hour = adjustHour(Number(explicit[1]), before);
      const minute = explicit[2] === undefined || explicit[2] === '' ? 0 : Number(explicit[2]);
      if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) return `${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')}`;
    }
    const spoken = value.match(/([一二两三四五六七八九十]{1,3})\s*[点时]/);
    if (spoken) {
      const before = value.slice(Math.max(0, spoken.index - 4), spoken.index);
      const hour = chineseHour(spoken[1]);
      if (hour !== null && hour <= 23) {
        const adjusted = adjustHour(hour, before);
        if (adjusted >= 0 && adjusted <= 23) return `${String(adjusted).padStart(2,'0')}:00`;
      }
    }
    if (/凌晨/.test(value)) return '05:00';
    if (/早上|早晨|早餐/.test(value)) return '07:30';
    if (/上午/.test(value)) return '10:00';
    if (/中午|午餐|午饭/.test(value)) return '12:30';
    if (/下午/.test(value)) return '15:30';
    if (/夜宵|宵夜|深夜/.test(value)) return '22:00';
    if (/晚上|晚餐|晚饭|傍晚/.test(value)) return '18:30';
    return null;
  }
  function defaultMealTime(photo, text, mealType) {
    const fromPhoto = photoWallClock(photo);
    if (fromPhoto) return {mealTime:fromPhoto, mealTimeSource:'photo'};
    const fromText = clockFromText(text);
    if (fromText) return {mealTime:fromText, mealTimeSource:'text'};
    return {mealTime:nowClock(), mealTimeSource:'now', typical:mealSlotClock[mealType] || null};
  }
  function mealTimeNote(meal) {
    const source = meal?.mealTimeSource;
    if (source === 'photo') return '默认取照片的拍摄时刻；如果实际进餐时间不同，请在这里改。';
    if (source === 'text') return '按描述里提到的时间填写；如果不对，请在这里改。';
    if (source === 'manual') return '已手动确认的进餐时间。';
    if (source === 'typical') return '没有拍摄时间，先按餐次的常见时段填写；请确认真实进餐时间。';
    return '没有拍摄时间，也没有描述里的时间，先按记录时刻填写；请确认后保存。';
  }

  let activeDate = localDate();
  let lastObservedToday = activeDate;
  function syncCalendarDay() {
    const today = localDate();
    if (today === lastObservedToday) return;
    // Follow the clock only while viewing the former today; intentional history selections stay put.
    if (activeDate === lastObservedToday) {activeDate = today; $('#active-date').value = today; setDefaultDates(); if (loaded) render();}
    lastObservedToday = today;
  }
  let noticeTimer = null;
  /** Hides the notice and lets the page flow back up (it sits in the document flow, not as an overlay). */
  function hideNotice() {
    const node = $('#global-notice'), text = $('#global-notice-text');
    if (noticeTimer) { clearTimeout(noticeTimer); noticeTimer = null; }
    if (text) text.textContent = '';
    if (node) node.hidden = true;
  }
  const notice = (message, error = false) => {
    const node = $('#global-notice'), text = $('#global-notice-text');
    if (!node || !text) return;
    text.textContent = message;
    node.classList.toggle('error', error);
    node.hidden = !message;
    if (noticeTimer) { clearTimeout(noticeTimer); noticeTimer = null; }
    // A notice used to stay until the next action, pushing the page down the whole time.
    if (message) noticeTimer = setTimeout(hideNotice, 10000);
  };
  const feedback = (node, message, error = false) => {if (!node) return; node.textContent = message; node.className = `form-feedback ${error ? 'error' : 'success'}`;};
  let fieldErrorSequence = 0;
  function clearFieldError(field) {
    if (!field?.removeAttribute) return;
    const errorId = field.dataset?.validationErrorId;
    if (errorId) {
      document.getElementById(errorId)?.remove();
      delete field.dataset.validationErrorId;
      const ids = (field.getAttribute('aria-describedby') || '').split(/\s+/).filter(id => id && id !== errorId);
      if (ids.length) field.setAttribute('aria-describedby', ids.join(' '));
      else field.removeAttribute('aria-describedby');
    }
    field.removeAttribute('aria-invalid');
  }
  /** 把浏览器的 validity 状态译成中文：validationMessage 跟系统语言走，不可靠。 */
  function fieldMessage(field) {
    const v = (field && field.validity) || {};
    if (v.valueMissing) return field.type === 'checkbox' ? '这一项需要先勾选。' : '这一项还没填。';
    if (v.badInput) return '这个值不是有效的数字。';
    if (v.rangeUnderflow) return field.min !== '' ? '不能小于 ' + field.min + '。' : '这个值偏小。';
    if (v.rangeOverflow) return field.max !== '' ? '不能大于 ' + field.max + '。' : '这个值偏大。';
    if (v.stepMismatch) return '请按 ' + field.step + ' 的步长填写。';
    if (v.tooShort) return '至少需要 ' + field.minLength + ' 个字。';
    if (v.tooLong) return '最多 ' + field.maxLength + ' 个字。';
    if (v.patternMismatch || v.typeMismatch) return '格式不对，请检查一下。';
    return '请检查这一项。';
  }
  function markFieldInvalid(field, message) {
    if (!field || field.disabled) return;
    clearFieldError(field);
    if (!field.id) field.id = `validation-field-${++fieldErrorSequence}`;
    const errorId = `${field.id}-error-${++fieldErrorSequence}`;
    const error = document.createElement('span');
    error.id = errorId;
    error.className = 'field-error';
    error.textContent = message || fieldMessage(field);
    const label = field.closest('label');
    if (label) label.append(error);
    else field.insertAdjacentElement('afterend', error);
    const ids = (field.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
    field.setAttribute('aria-describedby', [...new Set([...ids, errorId])].join(' '));
    field.setAttribute('aria-invalid', 'true');
    field.dataset.validationErrorId = errorId;
  }
  document.addEventListener('invalid', event => {
    const field = event.target;
    if (!field?.matches?.('input,select,textarea')) return;
    // reportValidity() 会同时弹系统气泡；留下我们自己的行内提示就够了。
    event.preventDefault();
    markFieldInvalid(field, fieldMessage(field));
  }, true);
  for (const type of ['input', 'change']) document.addEventListener(type, event => {
    const field = event.target;
    if (field?.matches?.('input,select,textarea') && field.getAttribute('aria-invalid') === 'true') clearFieldError(field);
  });
  // In-app replacement for window.confirm(): the WebView would show a browser-style prompt.
  let dialogResolve = null;
  function askConfirm(text, options = {}) {
    const root = $('#app-dialog');
    if (!root) return Promise.resolve(false);
    if (dialogResolve) dialogResolve(false);
    $('#app-dialog-title').textContent = options.title || '请确认';
    $('#app-dialog-text').textContent = text;
    $('#app-dialog-ok').textContent = options.ok || '确定';
    $('#app-dialog-cancel').textContent = options.cancel || '取消';
    $('.app-dialog-panel', root).classList.toggle('danger', options.danger === true);
    root.hidden = false;
    $('#app-dialog-cancel').focus();
    return new Promise(resolve => {dialogResolve = resolve;});
  }
  function closeDialog(result) {
    const root = $('#app-dialog'); if (root) root.hidden = true;
    const resolve = dialogResolve; dialogResolve = null;
    if (resolve) resolve(result);
  }
  async function api(path, body, method) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 90000);
    try {
      const response = await fetch(path, {method:method || (body === undefined ? 'GET' : 'POST'), headers:body === undefined ? {'Accept':'application/json'} : {'Accept':'application/json','Content-Type':'application/json'}, body:body === undefined ? undefined : JSON.stringify(body), cache:'no-store', signal:controller.signal});
      let data = null;
      if (response.status !== 204) {
        const text = await response.text();
        if (text) { try {data = JSON.parse(text);} catch {if (response.ok) throw new Error('手机返回的数据无法读取，请重新打开应用。');} }
      }
      if (!response.ok) throw new Error(data?.error || `请求未成功（${response.status}）。请检查输入或手机本地存储后重试。`);
      return data;
    } catch (error) {
      if (error.name === 'AbortError') throw new Error('请求超时。保存操作可能已写入手机，请先刷新检查记录，避免重复提交。');
      if (error instanceof TypeError) throw new Error('无法读取手机存储。请重新打开应用；本地记录不需要网络。');
      throw error;
    } finally {clearTimeout(timer);}
  }
  // ---- Bottom sheet ---------------------------------------------------------------------------
  // The platform draws <select> as a plain white dialog with system radio buttons, which clashes
  // with this app, and a long-press needs a place for its actions. Both use one sheet built from
  // the app's own tokens: same radii, same mint accents, same list rows.
  let sheetResolve = null;
  // Inline SVG copies of the semantic icons (currentColor). Loaded via <img> an SVG cannot inherit
  // the page colour and renders black; inline markup follows the surrounding CSS colour instead.
  const svgIcon = paths => `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><g stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths}</g></svg>`;
  const SVG_ICONS = {
    'icon-copy.svg': svgIcon('<rect x="8.5" y="8.5" width="11" height="12" rx="2.5"/><path d="M15.5 5.5H7A2.5 2.5 0 0 0 4.5 8v9"/>'),
    'icon-select.svg': svgIcon('<path d="M12 5v14M9.5 5h5M9.5 19h5"/>'),
    'icon-bookmark.svg': svgIcon('<path d="M7 4.5h10a1 1 0 0 1 1 1V20l-6-4-6 4V5.5a1 1 0 0 1 1-1Z"/>'),
    'icon-trash.svg': svgIcon('<path d="M4.5 7h15"/><path d="M9 7V4.5h6V7"/><path d="M6.5 7l1 12.5h9L17.5 7"/><path d="M10.5 10.5v6M13.5 10.5v6"/>'),
    'icon-check.svg': svgIcon('<path d="m5 12.5 4.5 4.5L19 7"/>'),
    'icon-nutrient-protein.svg': svgIcon('<ellipse cx="12" cy="12.5" rx="6" ry="8"/>'),
    'icon-nutrient-fat.svg': svgIcon('<path d="M12 3c4.5 4.9 6.5 8.5 6.5 11a6.5 6.5 0 0 1-13 0c0-2.5 2-6.1 6.5-11Z"/>'),
    'icon-nutrient-carb.svg': svgIcon('<path d="M4.5 11.5h15a7.5 7.5 0 0 1-15 0Z"/><path d="M8 19.5h8"/><path d="M15.5 9.5l5-5.5"/>'),
    'icon-energy.svg': svgIcon('<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5Z"/>'),
    'icon-weight.svg': svgIcon('<path d="M8 3h8a5 5 0 0 1 5 5v8a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5V8a5 5 0 0 1 5-5Z"/><path d="M8 15.5a4.5 4.5 0 0 1 8 0"/><path d="M12 12.5V9.5"/>'),
    'icon-training.svg': svgIcon('<path d="M7 6v12M4 8.5v7M17 6v12M20 8.5v7M7 12h10"/>'),
    'icon-sleep.svg': svgIcon('<path d="M20 14.7A8.4 8.4 0 0 1 9.3 4a8.6 8.6 0 1 0 10.7 10.7Z"/>'),
    'icon-water.svg': svgIcon('<path d="M6 3.5h12l-1.5 15a1.5 1.5 0 0 1-1.5 1.5h-6a1.5 1.5 0 0 1-1.5-1.5Z"/><path d="M6.8 12.5h10.4"/>'),
    'icon-warn.svg': svgIcon('<path d="M10.2 4.1a2.1 2.1 0 0 1 3.6 0l6.3 11a2.1 2.1 0 0 1-1.8 3.1H5.7a2.1 2.1 0 0 1-1.8-3.1Z"/><path d="M12 9v4"/><path d="M12 16.4h.01"/>'),
    'icon-tip.svg': svgIcon('<circle cx="12" cy="10" r="5.5"/><path d="M9.5 18h5M10.5 21h3"/><path d="M12 3v2"/>'),
    'icon-sparkle.svg': svgIcon('<path d="M12 3c.8 5.2 3 7.4 8.2 8.2-5.2.8-7.4 3-8.2 8.2-.8-5.2-3-7.4-8.2-8.2C9 10.4 11.2 8.2 12 3Z"/>'),
    'icon-habit-training.svg': svgIcon('<path d="M4 9v6M20 9v6M7 12h10M7 8v8M17 8v8"/>'),
    'icon-habit-steps.svg': svgIcon('<path d="M7 19.5c-1.6 0-2.4-1.2-2.4-3 0-2.1 1-3.5 2.1-4.4.9-.8 1.5-1.5 1.7-2.8.1-.9.6-1.4 1.3-1.4 1 0 1.5.8 1.3 2-.2 1.4-.8 2.3-.8 3.3 0 .9.5 1.4 1.4 1.9 1.1.6 1.7 1.5 1.7 2.7 0 1.5-1 2.7-2.7 2.7"/><path d="M5.2 16.8h4.2"/>'),
    'icon-habit-sleep.svg': svgIcon('<path d="M19.5 14.3A8 8 0 0 1 9.7 4.5a8.2 8.2 0 1 0 9.8 9.8z"/>'),
    'icon-habit-water.svg': svgIcon('<path d="M12 4s5 5.2 5 8.8A5 5 0 0 1 12 17.8a5 5 0 0 1-5-5C7 9.2 12 4 12 4z"/><path d="M9.8 13c0 1.5 1 2.4 2.2 2.4"/>'),
    'icon-meal.svg': svgIcon('<path d="M9.5 4.5c.9.9.9 1.9 0 2.8M14.5 4.5c.9.9.9 1.9 0 2.8"/><path d="M4.5 11h15a7.5 7.5 0 0 1-15 0Z"/><path d="M9.5 19.5h5"/>'),
    'icon-camera-flat.svg': svgIcon('<path d="M4.5 8.5a2 2 0 0 1 2-2h1.6l1.3-2h5.2l1.3 2h1.6a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-11a2 2 0 0 1-2-2Z"/><circle cx="12" cy="12.4" r="3.4"/>'),
  };
  /** Inline markup for a named icon; falls back to the <img> tag for skeleton icons. */
  const iconMarkup = name => SVG_ICONS[name] || `<img src="./${esc(name)}" alt="" width="19" height="19">`;
  function sheetOpen() {const root = $('#action-sheet'); return !!root && !root.hidden;}
  function openSheet(config) {
    const root = $('#action-sheet');
    if (!root) return Promise.resolve(null);
    clearSelectionMode();
    if (sheetResolve) {const previous = sheetResolve; sheetResolve = null; previous(null);}
    $('#action-sheet-title').textContent = config?.title || '';
    $('#action-sheet-list').innerHTML = (config?.options || []).map((option, index) =>
      `<button type="button" class="sheet-option${option.current ? ' is-current' : ''}${option.danger ? ' is-danger' : ''}" data-sheet-index="${index}" role="menuitem">`
      + `<span class="sheet-option-icon" aria-hidden="true">${option.icon ? iconMarkup(option.icon) : ''}</span>`
      + `<span class="sheet-option-label">${esc(option.label)}</span>`
      + `${option.current ? `<span class="inline-icon" aria-hidden="true">${SVG_ICONS['icon-check.svg']}</span>` : ''}</button>`).join('');
    root.hidden = false;
    return new Promise(resolve => {sheetResolve = resolve;});
  }
  function closeSheet(result) {
    const root = $('#action-sheet');
    if (root) root.hidden = true;
    const resolve = sheetResolve; sheetResolve = null;
    if (resolve) resolve(result === undefined ? null : result);
  }
  $('#action-sheet').addEventListener('click', event => {
    if (event.target === $('#action-sheet')) {closeSheet(null); return;}
    const option = event.target.closest('[data-sheet-index]');
    if (!option) return;
    closeSheet(Number(option.dataset.sheetIndex));
  });
  $('#action-sheet-cancel').addEventListener('click', () => closeSheet(null));
  document.addEventListener('keydown', event => {if (event.key === 'Escape' && sheetOpen()) closeSheet(null);});

  // ---- Custom dropdown -------------------------------------------------------------------------
  /** The label text that belongs to a control, taken from its own label's text node. */
  function fieldLabelFor(control) {
    const label = control.closest('label');
    if (!label) return '请选择';
    const text = [...label.childNodes].find(node => node.nodeType === 3 && node.textContent.trim());
    return text ? text.textContent.trim().replace(/[·：:]$/, '') : '请选择';
  }
  async function chooseFromSelect(select) {
    if (sheetOpen()) return;
    const options = [...select.options].map((option, index) => ({
      label: option.textContent.trim(), current: option.value === select.value, disabled: option.disabled, index,
    }));
    const choice = await openSheet({title: fieldLabelFor(select), options});
    if (choice === null) return;
    const option = select.options[choice];
    if (!option || option.disabled) return;
    if (option.value === select.value) return;
    select.value = option.value;
    // Existing handlers (provider switch, trend range, goal) all listen for change.
    select.dispatchEvent(new Event('change', {bubbles: true}));
  }
  // touchstart is what reliably suppresses the platform popup on Android; mousedown covers mice.
  document.addEventListener('touchstart', event => {
    const select = event.target.closest?.('select');
    if (!select) return;
    event.preventDefault();
    chooseFromSelect(select).catch(() => {});
  }, {passive: false});
  document.addEventListener('mousedown', event => {
    const select = event.target.closest?.('select');
    if (!select) return;
    event.preventDefault();
    chooseFromSelect(select).catch(() => {});
  });
  document.addEventListener('keydown', event => {
    if (!['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(event.key)) return;
    const select = event.target.closest?.('select');
    if (!select) return;
    event.preventDefault();
    chooseFromSelect(select).catch(() => {});
  });

  // ---- Long-press actions ----------------------------------------------------------------------
  const LONG_PRESS_MS = 520;
  let pressTimer = null, pressRow = null, pressMoved = false;

  function copyText(text) {
    const value = String(text || '');
    if (!value) return false;
    try {
      const bridge = window.QinghengNative;
      if (bridge && typeof bridge.copyText === 'function' && bridge.copyText(value) === true) {notice('已复制到剪贴板。'); return true;}
    } catch {}
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(value).then(() => notice('已复制到剪贴板。')).catch(() => notice('复制失败，可用「选择文字」后手动复制。', true));
        return true;
      }
    } catch {}
    notice('当前环境不能直接复制，可用「选择文字」后手动复制。', true);
    return false;
  }
  // Chromium still starts its own word selection on a long press even with user-select:none, which
  // puts a system toolbar on top of the sheet. A selection that starts inside a long-pressable row
  // is therefore collapsed at once, unless the user explicitly asked for "选择文字".
  let allowSelection = false;
  document.addEventListener('selectionchange', () => {
    if (allowSelection) return;
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;
    const node = selection.anchorNode;
    const element = node && (node.nodeType === 1 ? node : node.parentElement);
    if (element && element.closest && element.closest('[data-long-press]')) {
      try {selection.removeAllRanges();} catch {}
    }
  });
  function clearSelectionMode() {
    allowSelection = false;
    if (typeof $$ === 'function') $$('.is-selecting').forEach(row => row.classList.remove('is-selecting'));
    stopCollapse();
  }
  /**
   * Chromium's long-press gesture selects a word even where user-select is none, and the system
   * toolbar then floats above the sheet. Collapsing that selection for a short, bounded window
   * keeps the popup away and never touches a selection the user explicitly asked for.
   */
  let collapseTimer = null;
  function stopCollapse() {if (collapseTimer) {clearInterval(collapseTimer); collapseTimer = null;}}
  function collapseRowSelectionSoon(windowMs) {
    if (collapseTimer) return;
    const until = Date.now() + (windowMs || 1500);
    collapseTimer = setInterval(() => {
      if (allowSelection || Date.now() > until) {stopCollapse(); return;}
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) return;
      const node = selection.anchorNode;
      const element = node && (node.nodeType === 1 ? node : node.parentElement);
      if (element && element.closest && element.closest('[data-long-press]')) {
        try {selection.removeAllRanges();} catch {}
      }
    }, 40);
  }
  /** Hands the row over to the platform's own selection handles, which is what "选择文字" means here. */
  function selectRowText(row) {
    try {
      clearSelectionMode();
      allowSelection = true;
      row.classList.add('is-selecting');
      const body = row.querySelector('.row-body') || row;
      if (!body.hasAttribute('tabindex')) body.setAttribute('tabindex', '-1');
      body.focus({preventScroll: true});
      const range = document.createRange();
      range.selectNodeContents(body);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      notice('已选中内容，可用系统菜单复制。');
    } catch {notice('无法进入选择模式，请改用「复制文本」。', true);}
  }
  const chatRecordText = row => `问：${row.question || ''}\n答：${row.answer || ''}\n（${row.date || ''}）`;
  const mealRecordText = row => {
    const parts = [row.name || '未命名餐食', row.date || '', clockPattern.test(String(row.mealTime || '')) ? row.mealTime : '', mealNames[row.mealType] || '']
      .filter(Boolean).join(' · ');
    return `${parts}\n热量 ${fmt(row.calories, 0)} kcal · 蛋白 ${fmt(row.protein)}g · 脂肪 ${fmt(row.fat)}g · 碳水 ${fmt(row.carbs)}g`;
  };
  async function toggleFavorite(kind, record) {
    const next = {...record, favorite: record.favorite !== true};
    try {
      await api(kind === 'chat' ? '/api/chats' : '/api/meals', next);
      await loadState({quiet: true});
      notice(next.favorite ? '已收藏，可用「只看收藏」筛选。' : '已取消收藏。');
    } catch (error) {notice(error.message, true);}
  }
  async function showRowActions(row) {
    const [kind, id] = String(row.dataset.longPress || '').split(':');
    const record = kind === 'chat'
      ? (state.chats || []).find(item => String(item.id) === id)
      : (state.meals || []).find(item => String(item.id) === id);
    if (!record) return;
    const favorite = record.favorite === true;
    const choice = await openSheet({
      title: kind === 'chat' ? '问答记录' : (record.name || '餐食记录'),
      options: [
        {label: '复制文本', icon: 'icon-copy.svg'},
        {label: '选择文字', icon: 'icon-select.svg'},
        {label: favorite ? '取消收藏' : '收藏', icon: 'icon-bookmark.svg'},
        {label: '删除', icon: 'icon-trash.svg', danger: true},
      ],
    });
    if (choice === null) return;
    if (choice === 0) {copyText(kind === 'chat' ? chatRecordText(record) : mealRecordText(record)); return;}
    if (choice === 1) {selectRowText(row); return;}
    if (choice === 2) {await toggleFavorite(kind, record); return;}
    if (choice === 3) {
      const label = kind === 'chat' ? '这条问答记录' : (record.name || '这条餐食记录');
      if (!await askConfirm(`删除${label}？此操作无法撤销。`, {title: '删除记录', ok: '删除', danger: true})) return;
      try {
        await api(`/api/${kind === 'chat' ? 'chatlog' : 'meals'}/${encodeURIComponent(id)}`, undefined, 'DELETE');
        await loadState({quiet: true});
        notice('已删除。');
      } catch (error) {notice(error.message, true);}
    }
  }
  function cancelPress() {if (pressTimer) {clearTimeout(pressTimer); pressTimer = null;} pressRow = null;}
  document.addEventListener('touchstart', event => {
    const row = event.target.closest?.('[data-long-press]');
    if (!row) return;
    pressMoved = false; pressRow = row;
    cancelPress();
    pressRow = row;
    pressTimer = setTimeout(() => {pressTimer = null; if (!pressMoved && pressRow) {collapseRowSelectionSoon(); showRowActions(pressRow).catch(() => {});}}, LONG_PRESS_MS);
  }, {passive: true});
  document.addEventListener('touchmove', () => {pressMoved = true; cancelPress();}, {passive: true});
  ['touchend', 'touchcancel'].forEach(type => document.addEventListener(type, () => cancelPress(), {passive: true}));
  // Long-pressing a link or a selection would otherwise show the browser's own menu.
  document.addEventListener('contextmenu', event => {
    const row = event.target.closest?.('[data-long-press]');
    if (!row) return;
    event.preventDefault();
    collapseRowSelectionSoon();
    showRowActions(row).catch(() => {});
  });

  function connection() {
    const node = $('#connection-status');
    if (!node) return;
    const offline = !loaded;
    const demo = loaded && !window.QinghengAdapter.hasNative();
    node.classList.toggle('offline', offline);
    // 常驻的「已保存到手机」没信息量（数据本来就在本机），刚好还会被误读成已备份到云。
    // 只在「还没加载完」与「浏览器演示」这两种真需要说明的情况下才显示。
    node.hidden = !offline && !demo;
    node.textContent = offline ? '正在加载本地记录' : demo ? '浏览器本地演示' : '';
  }
  function populate(form, values) {for (const [key, value] of Object.entries(values || {})) {const control = form.elements.namedItem(key); if (!control || control.type === 'password' || control.type === 'checkbox') continue; control.value = value ?? '';}}
  let selectedProvider = 'deepseek';
  const consentStorageKey = 'qingheng.consent.onetime';
  const consentIds = new Set(['advice','estimate','chat','ob-allow']);
  function readConsent(){try{return new Set(JSON.parse(localStorage.getItem(consentStorageKey)||'[]').filter(x=>consentIds.has(x)));}catch{return new Set();}}
  function persistConsent(ids){try{localStorage.setItem(consentStorageKey,JSON.stringify([...ids]));}catch{}}
  // Consent rows stay visible: a remembered consent shows as a ticked box and unticking revokes it.
  const consentBox=id=>document.getElementById(id==='ob-allow'?'ob-allow':id+'-consent');
  function restoreConsent(){const ids=readConsent();for(const id of consentIds){const box=consentBox(id);if(!box)continue;box.checked=ids.has(id);const row=box.closest('[data-consent-once]');if(row)row.hidden=false;box.addEventListener('change',()=>{const next=readConsent();if(box.checked)next.add(id);else next.delete(id);persistConsent(next);});}}
  function acceptConsent(id){const ids=readConsent();ids.add(id);persistConsent(ids);const box=consentBox(id);if(box)box.checked=true;}
  const providerDrafts = {};
  function captureProvider() {
    const form=$('#settings-form');
    providerDrafts[selectedProvider]={baseUrl:form.elements.baseUrl.value,model:form.elements.model.value,visionModel:form.elements.visionModel.value,visionEnabled:form.elements.visionEnabled.checked,allowExternal:form.elements.allowExternal.checked};
  }
  function showProvider(provider) {
    selectedProvider=['deepseek','bai','siliconflow'].includes(provider)?provider:'deepseek';
    const form=$('#settings-form'), config={...window.QinghengAdapter.defaults[selectedProvider],...(state.settings.providers?.[selectedProvider] || {}),...(providerDrafts[selectedProvider] || {})};
    form.elements.provider.value=selectedProvider;
    populate(form,config);form.elements.visionEnabled.checked=config.visionEnabled===true;
    form.elements.allowExternal.checked=config.allowExternal===true;
    form.elements.apiKey.value='';form.elements.clearKey.checked=false;
    form.elements.model.placeholder=selectedProvider==='deepseek'?'deepseek-flash':'填写所选服务商的文字模型';
    $('#settings-status').textContent=config.apiConfigured ? '已配置 · 密钥不回传' : '此服务商未配置密钥';
  }
  function applySettings(data) {showProvider(data.provider || selectedProvider);}
  /** Re-read the stored model config. Separate from loadState so records never clear it. */
  async function refreshSettings() {
    try {
      const data = await api('/api/settings');
      if (!data || typeof data !== 'object') return;
      state.settings = {...(state.settings || {}), ...data};
      if (typeof data.apiConfigured === 'boolean') settingsKnown = true;
      applySettings(data); render();
    // A subpage opened while data was still loading would otherwise keep its empty form.
    const openSub = SUBPAGES.find(id => {const node = $('#subpage-' + id); return node && !node.hidden;});
    if (openSub) showSubpage(openSub);
    } catch { /* offline: keep the last known config */ }
  }
  $('#api-provider').addEventListener('change',event=>{captureProvider();showProvider(event.target.value);});
  $('#connection-check').addEventListener('click', async event => {
    if (!await askConfirm('检查已保存的服务商连接：仅发送 API Key 到已配置的 HTTPS 服务商，不发送图片或健康记录，不生成收费回答。请先保存连接设置。继续吗？', {title:'检查连接'})) return;
    const button = event.currentTarget, message = $('#connection-check-feedback');
    button.disabled = true; feedback(message,'正在检查 /models…');
    try {
      const result = await api('/api/connection-check',{allowExternal:true});
      feedback(message, result.message + (result.visionModelListed ? ' 当前视觉模型在列表中。' : ' 当前视觉模型未在列表中，请核对名称。'));
    } catch (error) {feedback(message,error.message,true);} finally {button.disabled = false;}
  });
  $('#key-info').addEventListener('click', async event => {
    const button = event.currentTarget, box = $('#key-info-result');
    button.disabled = true; box.textContent = '正在本机检查…';
    try {
      const data = await api('/api/key-info');
      if (data?.configured !== true) {box.textContent = '当前服务商尚未保存 API Key。'; return;}
      if (data?.unreadable === true) {box.textContent = '已保存的密钥无法由本机密钥库读取，请重新保存。'; return;}
      const preview = typeof data.preview === 'string' && data.preview ? `预览 ${data.preview}` : '未显示内容预览';
      box.textContent = `已保存 · 长度 ${number(data.length) ?? '—'} · ${preview}${data.cleaned === true ? '。检测到粘贴时带入的不可见字符，读取时已自动清理；建议重新复制完整密钥并保存。' : '。仅在本机检查，不发送也不显示完整密钥。'}`;
    } catch (error) {box.textContent = error.message;}
    finally {button.disabled = false;}
  });
  function searchFoods() {
    const query = $('#food-search').value.trim(), library = window.QinghengFoods;
    const matches = library ? library.search(query,8) : [];
    $('#food-search-results').innerHTML = matches.map(row=>`<button type="button" class="food-result list-row" data-food-name="${esc(row.name)}"><span>${esc(row.name)}<small>${esc(row.category)} · ${esc(row.basis)} · 每100g</small></span><strong>${fmt(row.per100.calories,0)} kcal</strong></button>`).join('') || '<p class="fine-print">未找到匹配项，请使用食品包装信息或手动记录，不会擅自猜测。</p>';
  }
  $('#food-search').addEventListener('input',searchFoods);
  $('#food-search-results').addEventListener('click',event=>{
    const button = event.target.closest('[data-food-name]'); if(!button) return;
    const name = button.dataset.foodName;
    $('#meal-text').value = ($('#meal-text').value.trim() ? $('#meal-text').value.trim() + '、' : '') + name + ' 100g';
    switchTab('records'); $('#meal-text').focus();
    notice('已填入 '+name+' 100g 作为占位量，请替换成实际克重后估算。');
  });
  const offCell = value => (typeof value === 'number' && Number.isFinite(value)) ? String(Math.round(value * 10) / 10) : '—';
  $('#off-search').addEventListener('click', async event => {
    const button = event.currentTarget, query = $('#off-query').value.trim(), box = $('#off-results');
    if (!query) {box.innerHTML = '<p class="fine-print">请先填写要搜索的食品或品牌。</p>'; return;}
    if (!await askConfirm(`将把「${query}」发送给 Open Food Facts 查询包装食品营养（不发送你的健康记录）。继续吗？`, {title:'在线搜索'})) return;
    button.disabled = true; box.innerHTML = '<p class="fine-print">正在查询…</p>';
    try {
      const data = await api('/api/food-search', {query, count:8, allowExternal:true});
      const rows = Array.isArray(data?.results) ? data.results : [];
      box.innerHTML = rows.length
        ? `<p class="fine-print">找到 ${rows.length} 条（${esc(data.source || 'Open Food Facts')}，每 100g）：</p>` + rows.map(row => {
            const p = row.per100 || {};
            const kcal = offCell(p.calories);
            const detail = `${esc(row.brand || '未标注品牌')}${row.quantity ? ' · ' + esc(row.quantity) : ''} · 蛋白 ${offCell(p.protein)}g · 脂肪 ${offCell(p.fat)}g · 碳水 ${offCell(p.carbs)}g`;
            return `<button type="button" class="food-result list-row" data-off-name="${esc(row.name)}"><span>${esc(row.name)}<small>${detail}</small></span><strong>${kcal} kcal</strong></button>`;
          }).join('')
        : empty('没有匹配结果', '换个说法，或直接在描述里写明食物与克重。');
      box.dataset.licence = data?.licence || '';
    } catch (error) {box.innerHTML = `<p class="fine-print error">${esc(error.message)}</p>`;} finally {button.disabled = false;}
  });
  $('#off-results').addEventListener('click', event => {
    const button = event.target.closest('[data-off-name]'); if (!button) return;
    const name = button.dataset.offName;
    $('#meal-text').value = ($('#meal-text').value.trim() ? $('#meal-text').value.trim() + '、' : '') + name + ' 100g';
    $('#meal-text').focus();
    notice('已填入「' + name + '」100g 作为占位量，请改成实际克重；营养值请以包装标签为准。');
  });
  $('#calibrate-foods').addEventListener('click',()=>{
    if (!window.QinghengFoods) return;
    try {
      const data = window.QinghengFoods.calibrateDraft({items:readItems(true),notes:[]});
      data.items.forEach((item,i)=>{
        const row = $$('.estimate-item')[i];
        for(const key of ['calories','protein','fat','carbs']) $('[data-item-field="'+key+'"]',row).value = item[key];
        row.dataset.baseGrams = number(item.grams) ?? number($('[data-item-field="grams"]', row)?.value);
        for(const key of nutritionKeys) {
          const input = $('[data-item-field="'+key+'"]', row);
          if (input) input.dataset.baseValue = number(input.value);
        }
      });
      $('#estimate-notes').innerHTML = data.notes.map(note=>`<li>${esc(note)}</li>`).join('');
      updatePreviewTotals(); feedback($('#preview-feedback'),'已按本地模型校核。菜品配方、油量和图片估计克重仍需人工确认。');
    } catch(error){feedback($('#preview-feedback'),error.message,true);}
  });
  function setDefaultDates() { $$('[data-default-date]').forEach(input => input.value = activeDate); }
  // 这三个键也跟随备份走（换手机零丢失）；localStorage 只作为即时缓存。
  const CHAT_UNHELPFUL_KEY = 'qingheng.chat.unhelpful';
  const CHAT_WEB_KEY = 'qingheng.chat.web';
  const TRAINING_CONSENT_KEY = 'qingheng.training.consent';
  // ---- 用户偏好收编进 state.json：localStorage 保持即时缓存，导出/换机随之携带 ----------------------
  let prefsSyncTimer = 0;
  /** Collects the per-date AI plans (newest 10) from localStorage into one portable object. */
  function collectedAiPlans() {
    const plans = {};
    try {
      const prefix = 'qingheng.aiPlan.';
      const keys = Object.keys(localStorage).filter(key => key.startsWith(prefix)).sort().slice(-10);
      for (const key of keys) { try { plans[key.slice(prefix.length)] = JSON.parse(localStorage.getItem(key)); } catch { } }
    } catch { }
    return plans;
  }
  /** Debounced fire-and-forget write; a failed sync must never interrupt the user's action. */
  function schedulePrefsSync(patch) {
    try { clearTimeout(prefsSyncTimer); } catch { }
    prefsSyncTimer = setTimeout(() => { api('/api/prefs', {prefs: patch}).catch(() => { }); }, 400);
  }
  /** Restores localStorage from state.prefs on load, so a fresh phone regains its preferences.
   *  Uses the shared key constants (PLAN_PREFS_KEY / AI_PLAN_KEY) instead of new literals. */
  function hydratePrefsFromState(data) {
    const prefs = data && typeof data.prefs === 'object' && data.prefs !== null ? data.prefs : null;
    if (!prefs) return;
    try { if (prefs.planPrefs !== undefined && prefs.planPrefs !== null) localStorage.setItem(PLAN_PREFS_KEY, JSON.stringify(prefs.planPrefs)); } catch { }
    try {
      if (prefs.aiPlans && typeof prefs.aiPlans === 'object') {
        for (const [date, plan] of Object.entries(prefs.aiPlans)) localStorage.setItem(AI_PLAN_KEY(date), JSON.stringify(plan));
      }
    } catch { }
    try {
      if (Array.isArray(prefs.unhelpfulChats)) localStorage.setItem(CHAT_UNHELPFUL_KEY, JSON.stringify(prefs.unhelpfulChats));
      if (typeof prefs.chatWeb === 'boolean') localStorage.setItem(CHAT_WEB_KEY, prefs.chatWeb ? '1' : '0');
      if (prefs.trainingConsent === true) localStorage.setItem(TRAINING_CONSENT_KEY, '1');
    } catch { }
  }
  async function loadState(options = {}) {
    const revision = ++requestRevision;
    try {
      const data = await api('/api/state');
      if (!data || !data.profile || !Array.isArray(data.measurements) || !Array.isArray(data.meals) || !Array.isArray(data.habits)) throw new Error('手机本地数据结构不完整，请检查备份或重新打开应用。');
      if (revision !== requestRevision) return;
      // /api/state carries records only. Replacing settings with {} here used to erase the
      // saved model config, which silently disabled photo analysis until the app restarted.
      const keptSettings = (state && typeof state.settings === 'object' && state.settings) || {};
      state = {...data, settings: (data.settings && typeof data.settings === 'object') ? data.settings : keptSettings}; loaded = true;
      settingsKnown = typeof state.settings.apiConfigured === 'boolean';
      hydratePrefsFromState(state);
      if (options.populate !== false) {populate($('#profile-form'), state.profile); applySettings(state.settings);
        const weightField = $('#profile-form').elements.weight;
        if (weightField && !weightField.value) weightField.value = latestWeight() || '';
      }
      render(); connection();
      renderUndatedMeals();
      if (!options.quiet) notice('');
      const repair = state.mealDateRepair;
      if (repair && number(repair.count) > 0) {
        const key = `qingheng.mealdate.${repair.at || repair.count}`;
        let seen = false;
        try {seen = localStorage.getItem(key) === '1';} catch {}
        if (!seen) {
          try {localStorage.setItem(key, '1');} catch {}
          notice(`已为 ${fmt(repair.count, 0)} 条缺少日期的餐食按拍摄时间或记录时间补上日期，请核对记录。`);
        }
      }
      if (!state.onboardingDone && number((state.profile || {}).height) === null && !options.skipOnboarding) showOnboarding(true);
      if (options.offerTargetAdjustment !== false) setTimeout(() => {maybeOfferTargetAdjustment().catch(() => {});}, 0);
    } catch (error) {loaded = false; connection(); notice(error.message,true); throw error;}
  }
  // ---- Profile hub and its sub-pages -----------------------------------------------------------
  // "我的" is a list of entries; each one opens a sub-page under #profile/<name>. Everything stays
  // in the document, so forms, validation, collapse state and existing test anchors are untouched.
  const SUBPAGES = ['targets', 'model', 'push', 'data', 'about'];
  function parseHash() {
    const parts = String(location.hash || '').replace(/^#/, '').split('/');
    const tab = ['today','records','chat','trends','profile'].includes(parts[0]) ? parts[0] : '';
    const sub = SUBPAGES.includes(parts[1]) ? parts[1] : '';
    return {tab, sub};
  }
  function showSubpage(sub) {
    const hub = $('#profile-hub');
    if (hub) hub.hidden = !!sub;
    SUBPAGES.forEach(id => {const node = $('#subpage-' + id); if (node) node.hidden = id !== sub;});
    // The storage panel is the only card that needs a read when it appears.
    if (sub === 'about') {loadStorageStatus(false).catch(() => {}); loadVersions().catch(() => {});}
    // 每日推送与建议 must open on today's advice, not on an empty query form.
    if (sub === 'push') {loadTodayAdvice().catch(() => {});}
    if (sub) window.scrollTo({top:0, behavior:'auto'});
  }
  function openSubpage(id) {
    if (!SUBPAGES.includes(id)) return;
    // pushState gives the system back button something to return to.
    try {history.pushState(null, '', `#profile/${id}`);} catch {location.hash = `profile/${id}`;}
    switchTab('profile', false, id);
  }
  const TAB_ORDER = ['today','records','chat','trends','profile'];
  let lastShownTab = '';
  function switchTab(tab, moveFocus = false, sub = '') {
  document.documentElement.dataset.tab = tab;
  if (typeof applySkin === 'function') applySkin(document.documentElement.dataset.skinChoice || 'paper', false);
    if (!TAB_ORDER.includes(tab)) tab = 'today';
    const dir = lastShownTab ? TAB_ORDER.indexOf(tab) - TAB_ORDER.indexOf(lastShownTab) : 0;
    $$('.view').forEach(view => {
      const active = view.id === `view-${tab}`;
      view.hidden = !active;
      view.classList.remove('from-left','from-right');
      if (active && dir) view.classList.add(dir > 0 ? 'from-right' : 'from-left');
    });
    $$('[data-tab]').forEach(button => {if (button.dataset.tab === tab) button.setAttribute('aria-current','page'); else button.removeAttribute('aria-current');});
    history.replaceState(null,'',`#${tab}${tab === 'profile' && sub ? '/' + sub : ''}`);
    if (tab === 'profile') showSubpage(sub);
    // Survives an Android activity recreation (for example while the camera is open).
    try {localStorage.setItem('qingheng.tab', tab);} catch {}
    if (tab === 'trends') renderTrends();
    if (moveFocus) {window.scrollTo({top:0,behavior:'auto'}); $('#main').focus({preventScroll:true});}
    lastShownTab = tab;
  }
  function restoreTab() {
    const fromHash = parseHash().tab;
    if (fromHash) return fromHash;
    try {const saved = localStorage.getItem('qingheng.tab') || ''; if (['today','records','chat','trends','profile'].includes(saved)) return saved;} catch {}
    return 'today';
  }
  function sumMeals(meals, key) {return meals.length && meals.every(meal => number(meal[key]) !== null) ? meals.reduce((sum, meal) => sum + Number(meal[key]),0) : null;}
  function totalsFor(meals) {return Object.fromEntries(['calories','protein','fat','carbs'].map(key => [key,sumMeals(meals,key)]));}
  function empty(text, hint = "", kind = "empty") {
    // 三态空状态：empty=还没有数据 / denied=没有权限 / error=加载失败；图标与语气随状态变化。
    // 空态改用图像语言里的「叶」符号（24 网格 / 1.5px 圆头），与其它态共用一套几何；
    // denied / error 仍用文字符号：它们是例外态，不该被当成常规空态被反复看到（2026-10-29）。
    const glyph = kind === "denied" ? "⊘" : kind === "error" ? "!"
      : '<img src="./icon-glyph-leaf.svg" alt="" width="40" height="40">';
    const role = kind === "error" ? ' role="alert"' : "";
    return `<div class="empty-state is-${esc(kind)}"${role}><span class="empty-icon" aria-hidden="true">${glyph}</span><p class="empty-title">${esc(text)}</p>${hint ? `<p class="empty-hint">${esc(hint)}</p>` : ""}</div>`;
  }
  function latestField(records, key) {return records.find(record => number(record[key]) !== null);}
  function targetAdjustmentForDate(date = activeDate) {
    const adjustment = state?.temporaryTargets;
    return adjustment?.status === 'active' && adjustment.effectiveDate === date && adjustment.temporary && typeof adjustment.temporary === 'object' ? adjustment : null;
  }
  /**
   * The intake range that applies to a date, and where the answer came from.
   *
   * A goal that derives its own plan (薄肌) wins over the 口径 ranges, because those were written for
   * the recomp phase; showing both would leave the daily page and the plan disagreeing.
   */
  /**
   * Continuous "how close to the target" colour: ratio 0 = on target (green), 1 = far off (red),
   * passing through amber. Used instead of hard good/bad buckets so a near miss still looks near.
   */
  function goalColor(ratio) {
    const t = Math.max(0, Math.min(1, Number.isFinite(ratio) ? ratio : 1));
    const hue = t < 0.5 ? 142 - (142 - 42) * (t / 0.5) : 42 - (42 - 6) * ((t - 0.5) / 0.5);
    const saturation = 34 + 30 * t;
    const lightness = 42 + 5 * t;
    return `hsl(${Math.round(hue)} ${Math.round(saturation)}% ${Math.round(lightness)}%)`;
  }
  /** 健身术语表：含义 + 注意事项。点一下词就出解释，不跳页。 */
  const TERMS = {
    "RPE": {full: "Rate of Perceived Exertion，自觉用力程度", meaning: "用 1~10 描述这一组有多难。RPE 8 = 还能再做约 2 次，RPE 10 = 力竭。", caution: "它靠自我感受，不同动作的体感不一样；第一次用建议对照「停下来还能做几次」校准。"},
    "RM": {full: "Repetition Maximum，最大重复次数", meaning: "12RM 指某个重量最多只能做 12 次。计划里写「12 次」通常不是 12RM，而是留了余量的 12 次。", caution: "把「12 次」当 12RM 做，会让每组都变成力竭，恢复跟不上。"},
    "ACWR": {full: "Acute:Chronic Workload Ratio，急慢性负荷比", meaning: "最近 7 天训练量 ÷ 最近 28 天周均训练量。1.0 左右是维持，超过 1.5 通常提示负荷涨太快。", caution: "它只是提示，不是判决；换动作、换计划都会让它短暂失真。"},
    "TDEE": {full: "Total Daily Energy Expenditure，每日总消耗", meaning: "基础代谢 + 日常活动 + 训练 + 食物热效应。本 App 用公式估算，再用两周体重均值校准。", caution: "公式天生有 10%~20% 误差，别把估算值当精确值。"},
    "减载": {full: "Deload", meaning: "主动安排一周降低负荷（负重 ×0.9、组数 −1），让神经与关节恢复。", caution: "减载不是休息，动作照做，只是量降下来。"},
    "渐进超负荷": {full: "Progressive Overload", meaning: "让训练刺激逐步变大：加重、加次数、加组，一次只动一个变量。", caution: "同时加重又加量是最常见的过载方式，也是最先崩的方式。"},
    "力竭": {full: "Muscular Failure", meaning: "这一组再也做不出一次标准动作。单关节动作可以接近力竭，复合主项不建议。", caution: "大重量复合动作做到力竭，恢复成本很高，容易影响接下来几天。"},
    "负重": {full: "Training Load，这一组用的重量", meaning: "按总重量记：杠铃 = 杆重 + 两侧片重（15 kg/侧 + 20 kg 杆 = 50 kg）；哑铃按单只记；器械按配重片标示。", caution: "同一动作前后口径必须一致，否则容量、ACWR 与进步曲线都会失真。"},
    "离心": {full: "Eccentric，下放阶段", meaning: "肌肉被拉长的阶段，比如卧推下放。离心能承受更大张力，也更容易酸痛。", caution: "离心放慢到 3 秒以上会显著增加酸痛，训练日之间要留够间隔。"}
  };
  /** 把已知术语包成可点击的按钮；只处理纯文本，避免破坏已有标签。 */
  function annotateTerms(html) {
    let out = String(html || "");
    for (const term of Object.keys(TERMS)) {
      if (out.includes("data-term=\"" + term + "\"")) continue;
      const safe = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const re = new RegExp("(?<![A-Za-z0-9-])" + safe + "(?![A-Za-z0-9-])");
      if (!re.test(out)) continue;
      out = out.replace(re, "<button type=\"button\" class=\"term\" data-term=\"" + term + "\">" + term + "</button>");
    }
    return out;
  }
  function openTerm(name) {
    const sheet = $("#term-sheet");
    const term = TERMS[name];
    if (!sheet || !term) return;
    $("#term-title").textContent = name;
    $("#term-full").textContent = term.full;
    $("#term-meaning").textContent = term.meaning;
    $("#term-caution").textContent = term.caution;
    sheet.hidden = false;
    sheet.dataset.term = name;
  }
  function closeTerm() { const sheet = $("#term-sheet"); if (sheet) sheet.hidden = true; }
  /** 三条关闭路径：按钮、遮罩、Esc。之前只绑了「点外部」。 */
  function installTermSheet() {
    const sheet = $("#term-sheet"), close = $("#term-close");
    if (close && !close.dataset.wired) {
      close.dataset.wired = "1";
      close.addEventListener("click", event => { event.preventDefault(); event.stopPropagation(); closeTerm(); });
    }
    if (sheet && !sheet.dataset.wired) {
      sheet.dataset.wired = "1";
      sheet.addEventListener("click", event => { if (event.target === sheet) closeTerm(); });
      document.addEventListener("keydown", event => { if (event.keyCode === 27) closeTerm(); });
    }
    const weightClose = $("#weight-close");
    if (weightClose && !weightClose.dataset.wired) {
      weightClose.dataset.wired = "1";
      weightClose.addEventListener("click", () => { const box = $("#weight-sheet"); if (box) box.hidden = true; });
    }
  }
  installTermSheet();
  document.addEventListener("click", event => {
    const trigger = event.target.closest && event.target.closest("[data-term]");
    if (trigger) { event.preventDefault(); openTerm(trigger.dataset.term); return; }
    const sheet = $("#term-sheet");
    if (sheet && !sheet.hidden && !event.target.closest("#term-sheet")) closeTerm();
  });
  /** 一天里的时段：决定「现在最该记什么」，而不是让用户面对 9 张卡自己找。 */
  function daySlot(now = new Date()) {
    const hour = now.getHours();
    if (hour >= 5 && hour < 10) return {key: "morning", label: "早上", hint: "记体重、睡眠，顺手看一眼今天目标"};
    if (hour >= 10 && hour < 14) return {key: "noon", label: "中午", hint: "记午餐；早上没记的话，趁现在补上体重"};
    if (hour >= 14 && hour < 17) return {key: "afternoon", label: "下午", hint: "有加餐或训练就记一笔，晚上会轻松很多"};
    if (hour >= 17 && hour < 22) return {key: "evening", label: "晚上", hint: "记晚餐 + 训练，再看一眼今天还差多少"};
    return {key: "night", label: "夜里", hint: "只补记录，不追额度；睡够比凑数字重要"};
  }
  /** 17 点后没记午餐、21 点后没记晚餐 —— 提示「补一下」，并允许一键跳去记录。 */
  function missingMealSlots(date, now = new Date()) {
    const rows = (Array.isArray(state.meals) ? state.meals : []).filter(row => row && row.date === date);
    const minutes = row => {
      const m = /^(\d{1,2}):(\d{2})$/.exec(String(row.mealTime || ""));
      return m ? Number(m[1]) * 60 + Number(m[2]) : null;
    };
    const inWindow = (from, to) => rows.some(row => { const m = minutes(row); return m !== null && m >= from && m < to; });
    const hour = now.getHours();
    const missing = [];
    if (hour >= 17 && !inWindow(630, 900)) missing.push({key: "lunch", label: "午餐"});
    if (hour >= 21 && !inWindow(1020, 1380)) missing.push({key: "dinner", label: "晚餐"});
    return missing;
  }
  function renderSlotHint() {
    const node = $("#slot-hint");
    if (!node) return;
    const now = new Date();
    const slot = daySlot(now);
    const clock = String(now.getHours()).padStart(2, "0") + ":" + String(now.getMinutes()).padStart(2, "0");
    const missing = missingMealSlots(activeDate, now);
    const suffix = missing.length ? "；" + missing.map(item => item.label).join("、") + "好像还没记，点一下去补" : "";
    const timeNode = $("#slot-time"), textNode = $("#slot-text");
    if (timeNode) timeNode.textContent = clock;
    if (textNode) textNode.textContent = slot.label + "：" + slot.hint + suffix;
    node.style.cursor = missing.length ? "pointer" : "";
    node.dataset.missing = missing.length ? missing.map(item => item.key).join(",") : "";
    if (!node.dataset.wired) {
      node.dataset.wired = "1";
      node.addEventListener("click", () => {
        if (!node.dataset.missing) return;
        switchTab("records");
        const field = $("#meal-text"); if (field) { field.focus(); }
      });
    }
    node.dataset.slot = slot.key;
    for (const button of $$("[data-go]")) {
      const target = button.dataset.go;
      const spotlight = (slot.key === "evening" || slot.key === "noon") && target === "records";
      button.classList.toggle("is-now", spotlight);
    }
  }
  /** Inside the range: clean greens, deeper near the centre. */
  function rangeColor(kcal, min, max) {
    const mid = (min + max) / 2, half = Math.max(1, (max - min) / 2);
    const t = Math.abs(kcal - mid) / half; // 0 centre .. 1 edge
    return `hsl(${Math.round(132 + 8 * t)} ${Math.round(26 - 6 * t)}% ${Math.round(63 + 5 * t)}%)`;
  }
  /** Below the floor turns amber, far below turns orange. */
  function underColor(kcal, min) {
    const t = Math.min(1, (min - kcal) / Math.max(200, min * 0.2));
    return `hsl(${Math.round(46 - 10 * t)} ${Math.round(38 + 8 * t)}% ${Math.round(70 - 4 * t)}%)`;
  }
  /** Above the cap turns warm immediately; 8% over is already full red. */
  function overColor(kcal, max) {
    const t = Math.min(1, (kcal - max) / Math.max(60, max * 0.08));
    return `hsl(${Math.round(20 - 12 * t)} ${Math.round(44 + 10 * t)}% ${Math.round(66 - 4 * t)}%)`;
  }
  function dietBarColor(kcal, min, max) {
    if (kcal > max) return overColor(kcal, max);
    if (kcal < min) return underColor(kcal, min);
    return rangeColor(kcal, min, max);
  }
  /** Training volume: growth is green (bigger = deeper), a drop warms up quickly. */
  function volumeColor(delta, previous) {
    const pct = previous > 0 ? delta / previous : 0;
    if (pct >= 0) return `hsl(${Math.round(134 - 10 * Math.min(1, pct / 0.15))} ${Math.round(36 - 8 * Math.min(1, pct / 0.15))}% ${Math.round(36 + 4 * Math.min(1, pct / 0.15))}%)`;
    const t = Math.min(1, -pct / 0.15);
    return `hsl(${Math.round(38 - 30 * t)} ${Math.round(60 + 6 * t)}% ${Math.round(48 - 4 * t)}%)`;
  }
  /** Observed weekly change vs the rate the plan implies. */
  function rateGoalColor(observed, planned) {
    const deviation = Math.abs(observed - planned) / Math.max(0.15, Math.abs(planned));
    if (deviation <= 0.6) return `hsl(${Math.round(140 - 26 * (deviation / 0.6))} 34% ${Math.round(38 + 3 * (deviation / 0.6))}%)`;
    const t = Math.min(1, (deviation - 0.6) / 1.4);
    return `hsl(${Math.round(40 - 34 * t)} ${Math.round(60 + 6 * t)}% ${Math.round(48 - 4 * t)}%)`;
  }
  /** True when the user told us they do not train, so training UI should not be shown at all. */
  function trainingEnabled() {
    const raw = state && state.profile ? String(state.profile.training ?? '') : '';
    return raw !== 'none';
  }
  /** Hides every training-only block when the profile says 不健身. Idempotent. */
  /** 分段控件键盘可达：←/→ 在 [role=tablist] 内移动并激活，Home/End 跳首尾。 */
  function installSegmentKeys() {
    if (document.body.dataset.segmentKeys === "1") return;
    document.body.dataset.segmentKeys = "1";
    document.addEventListener("keydown", event => {
      const key = event.key;
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(key)) return;
      const bar = event.target.closest && event.target.closest('[role="tablist"]');
      if (!bar) return;
      const items = [...bar.querySelectorAll("[role=\"tab\"]:not([hidden])")];
      if (items.length < 2) return;
      const current = items.indexOf(document.activeElement);
      if (current < 0) return;
      event.preventDefault();
      let next = current;
      if (key === "ArrowRight") next = (current + 1) % items.length;
      else if (key === "ArrowLeft") next = (current - 1 + items.length) % items.length;
      else if (key === "Home") next = 0;
      else next = items.length - 1;
      items[next].focus();
      items[next].click();
    });
  }
  function hideTrainingTabs(on) {
    // 状态类留给 CSS：即使分段按钮被 JS 重建，display:none 依然生效。
    if (document.body) document.body.classList.toggle("no-training", !on);
    const selector = '[data-records-panel="training"], [data-trends-panel="training"], [data-go="training"], [data-focus="training"]';
    for (const node of document.querySelectorAll(selector)) node.hidden = !on;
    for (const id of ['record-panel-training', 'trend-panel-training']) {
      const node = document.getElementById(id);
      if (!node) continue;
      if (!on) { node.hidden = true; continue; }
      // 开启训练时不要强制显示：可见性归 switchRecordPanel / switchTrendPanel。
      // 旧写法 node.hidden = false 会在每次 applyTrainingVisibility 时把训练面板揭开，
      // 导致「身体」分段下也能看到训练计划（2026-10-29 修）。
      const isRecord = id === 'record-panel-training';
      const switcher = isRecord ? (typeof switchRecordPanel === 'function' ? switchRecordPanel : null)
                               : (typeof switchTrendPanel === 'function' ? switchTrendPanel : null);
      const active = document.querySelector((isRecord ? '[data-records-panel]' : '[data-trends-panel]') + '.active');
      if (switcher && active) switcher(active.dataset[isRecord ? 'recordsPanel' : 'trendsPanel']);
    }
  }
function applyTrainingVisibility() {
    const on = trainingEnabled();
    for (const id of ['training-log', 'training-advice', 'training-volume-card', 'week-plan-card', 'training-advice-order']) {
      const node = document.getElementById(id);
      if (node) node.hidden = !on;
    }
    hideTrainingTabs(on);
    // 分段按钮由 JS 在渲染后创建，这里再补一次，避免第一次调用时还找不到节点。
    if (typeof setTimeout === "function") setTimeout(() => hideTrainingTabs(trainingEnabled()), 0);
    if (!on) {
      const recordActive = document.querySelector('[data-records-panel].active');
      if (recordActive && recordActive.dataset.recordsPanel === "training") {
        const food = document.querySelector('[data-records-panel="food"]');
        if (food) food.click();
      }
      const trendActive = document.querySelector('[data-trends-panel].active');
      if (trendActive && trendActive.dataset.trendsPanel === "training") {
        const weight = document.querySelector('[data-trends-panel="weight"]');
        if (weight) weight.click();
      }
      const prefs = document.getElementById("plan-prefs");
      if (prefs) prefs.hidden = true;
    }
  }
  function rateCalibration(goal) {
    // 目标速率：减脂 0.4~0.7%/周、增肌 0.25~0.5%/周、维持 ±0.2%/周（知识库：可持续区间）
    const want = goal === 'gain' ? {min: 0.25, max: 0.5} : (goal === 'maintain' ? {min: -0.2, max: 0.2} : {min: 0.4, max: 0.7});
    const weights = (Array.isArray(state && state.habits) ? state.habits : [])
      .filter(row => row && /^\d{4}-\d{2}-\d{2}$/.test(String(row.date)) && Number(row.weight) > 0)
      .sort((a, b) => String(a.date).localeCompare(String(b.date)));
    if (weights.length < 2) return null;
    const last = weights[weights.length - 1];
    const cutoff = shiftDay(last.date, -14);
    const window = weights.filter(row => String(row.date) >= cutoff);
    if (window.length < 2) return null;
    const first = window[0], base = Number(first.weight), now = Number(last.weight);
    if (!(base > 0)) return null;
    const days = Math.max(1, Math.round((new Date(last.date + "T00:00:00") - new Date(first.date + "T00:00:00")) / 86400000));
    const weeklyPercent = Math.round(((now - base) / base) * (7 / days) * 1000) / 10;
    const loss = -weeklyPercent;
    if (goal === 'gain') {
      if (weeklyPercent < want.min) return {text: "近 " + days + " 天体重每周变化 " + weeklyPercent + "%，低于增肌区间 " + want.min + "~" + want.max + "%，可考虑把盈余上调约 3%。"};
      if (weeklyPercent > want.max) return {text: "近 " + days + " 天每周涨 " + weeklyPercent + "%，高于增肌区间，建议把盈余下调约 3%。"};
      return {text: "增肌速率 " + weeklyPercent + "%/周，在 " + want.min + "~" + want.max + "% 区间内。"};
    }
    if (goal === 'maintain') return {text: "近 " + days + " 天体重每周变化 " + weeklyPercent + "%，维持目标看趋势不看单点。"};
    if (loss < want.min) return {text: "近 " + days + " 天每周降 " + loss + "%，低于 " + want.min + "~" + want.max + "% 区间，可考虑把缺口上调约 3%。"};
    if (loss > want.max) return {text: "近 " + days + " 天每周降 " + loss + "%，高于 " + want.max + "%，建议把缺口下调约 3%，别掉肌肉。"};
    return {text: "减脂速率 " + loss + "%/周，落在 " + want.min + "~" + want.max + "% 的可持续区间内。"};
  }
  function goalLabel(goal) {
    const map = {gain: '增肌', cut: '减脂', recomp: '增肌同时减脂', lean: '薄肌', maintain: '保持身材'};
    return map[String(goal || 'recomp')] || '饮食';
  }
function intakeRangeForDate(date = activeDate) {
    const profile = state?.profile || {}, rules = targetRules(profile);
    const habit = (state?.habits || []).find(row => row && row.date === date);
    const trained = habit ? (habit.training === true || habit.training === 'true' ? true : habit.training === false || habit.training === 'false' ? false : null) : null;
    const useTraining = trained === true;
    const plan = computeTargets({
          sex: profile.sex,
          weight: number(profile.weight) ?? latestWeight(),
          height: profile.height,
          age: profile.age,
          goal: profile.goal,
          applyGoalPresets: true,
          training: profile.training,
          rules: profile
        });
    const active = plan && !plan.incomplete ? plan : null;
    const trainingDay = active ? active.trainingDay : {min: rules.trainingDayMin, max: rules.trainingDayMax};
    const restDay = active ? active.restDay : {min: rules.restDayMin, max: rules.restDayMax};
    const basis = active
      ? `${goalLabel(profile.goal)}（按维持 ${active.tdee}${active.leanPlan ? ' 与有效缺口 ' + active.leanPlan.effectivePercent + '%' : ''}）`
      : trained === null ? '当天未记录是否训练，按休息日区间' : useTraining ? '当天标记为训练日' : '当天标记为休息日';
    return {
      min: useTraining ? trainingDay.min : restDay.min,
      max: useTraining ? trainingDay.max : restDay.max,
      trained,
      basis,
      trainingDay,
      restDay,
      floor: rules.intakeFloor,
      expectedWeeklyKg: active && Number.isFinite(active.expectedWeeklyKg) ? active.expectedWeeklyKg : null
    };
  }
  /**
   * Profile for a given date with the day's own budget applied: a training day uses the training-day
   * ceiling, a rest day (or an unrecorded day) uses the rest-day ceiling. The 口径 range is never
   * replaced by a single number — `intakeRange` is carried along for the UI to show.
   */
  function effectiveProfileForDate(date = activeDate) {
    const profile = {...(state?.profile || {})}, adjustment = targetAdjustmentForDate(date);
    const range = intakeRangeForDate(date);
    // The stored ceiling only wins when the 口径 has nothing to say (older data without rules).
    const hasRules = number(state?.profile?.trainingDayMax) !== null || number(state?.profile?.restDayMax) !== null;
    if (hasRules) profile.calorieTarget = range.max;
    if (adjustment) Object.assign(profile, adjustment.temporary);
    profile.intakeRange = {min: range.min, max: range.max, basis: range.basis};
    profile.intakeFloor = range.floor;
    return profile;
  }
