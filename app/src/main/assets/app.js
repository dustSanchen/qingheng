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
  // ---- Default meal slot ----------------------------------------------------------------
  // Which meal a new record starts on, by the clock: before lunchFrom breakfast, then lunch,
  // from dinnerFrom dinner, from snackFrom a snack. Three thresholds, editable in
  // 我的 → 数据、外观与说明.
  const MEAL_WINDOW_KEY = 'qingheng.mealWindow';
  /** 今日三样当天是否已保存过（保存后收成摘要，要改先点「修改」）。 */
  const DAILY_THREE_KEY = date => `qingheng.dailyThree.${date}`;
  /** 长期偏好：一句话一条，最多 20 条，注入估算/建议/训练的提示词。 */
  const PREFERENCES_KEY = 'qingheng.preferences';
  function readPreferences() {
    try {const raw = localStorage.getItem(PREFERENCES_KEY); const list = raw ? JSON.parse(raw) : []; return Array.isArray(list) ? list.filter(item => typeof item === 'string' && item.trim()).slice(0, 20) : [];} catch {return [];}
  }
  function writePreferences(list) {
    const clean = (Array.isArray(list) ? list : []).map(item => String(item || '').trim()).filter(Boolean).slice(0, 20);
    try {localStorage.setItem(PREFERENCES_KEY, JSON.stringify(clean));} catch {}
    return clean;
  }
  const DEFAULT_MEAL_WINDOW = {lunchFrom:'11:20', dinnerFrom:'16:30', snackFrom:'22:00'};
  const MEAL_TYPE_LABEL = {breakfast:'早餐', lunch:'午餐', dinner:'晚餐', snack:'加餐'};
  function readMealWindow() {
    let raw = {};
    try { raw = JSON.parse(localStorage.getItem(MEAL_WINDOW_KEY) || '{}') || {}; } catch { raw = {}; }
    return {
      lunchFrom: clockPattern.test(raw.lunchFrom) ? raw.lunchFrom : DEFAULT_MEAL_WINDOW.lunchFrom,
      dinnerFrom: clockPattern.test(raw.dinnerFrom) ? raw.dinnerFrom : DEFAULT_MEAL_WINDOW.dinnerFrom,
      snackFrom: clockPattern.test(raw.snackFrom) ? raw.snackFrom : DEFAULT_MEAL_WINDOW.snackFrom
    };
  }
  function saveMealWindow(spec) {
    const next = {
      lunchFrom: clockPattern.test(spec?.lunchFrom) ? spec.lunchFrom : DEFAULT_MEAL_WINDOW.lunchFrom,
      dinnerFrom: clockPattern.test(spec?.dinnerFrom) ? spec.dinnerFrom : DEFAULT_MEAL_WINDOW.dinnerFrom,
      snackFrom: clockPattern.test(spec?.snackFrom) ? spec.snackFrom : DEFAULT_MEAL_WINDOW.snackFrom
    };
    try { localStorage.setItem(MEAL_WINDOW_KEY, JSON.stringify(next)); } catch {}
    return next;
  }
  /** `clock` defaults to now. Both thresholds are inclusive lower bounds. */
  function defaultMealTypeFor(clock) {
    const value = clockPattern.test(clock) ? clock : nowClock();
    const {lunchFrom, dinnerFrom, snackFrom} = readMealWindow();
    if (value >= snackFrom) return 'snack';
    if (value >= dinnerFrom) return 'dinner';
    if (value >= lunchFrom) return 'lunch';
    return 'breakfast';
  }
  const nowClock = () => {const d = new Date(); return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;};
  // 浏览器/WebView 有 rAF；node 里的片段测试没有，退回 setTimeout 才跑得起来。
  const nextFrame = fn => (typeof requestAnimationFrame === 'function' ? requestAnimationFrame(fn) : setTimeout(fn, 16));
  const cancelFrame = id => {if (!id) return; if (typeof cancelAnimationFrame === 'function') cancelAnimationFrame(id); else clearTimeout(id);};
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
    if (activeDate === lastObservedToday) {activeDate = today; $('#active-date').value = today; syncActiveDateLabel(); setDefaultDates(); if (loaded) render();}
    lastObservedToday = today;
  }
  function syncActiveDateLabel() {
    const label = $('#active-date-label');
    const parts = String(activeDate || '').match(/^\d{4}-(\d{2})-(\d{2})$/);
    if (!label || !parts) return;
    label.dateTime = activeDate;
    label.textContent = `${Number(parts[1])}/${Number(parts[2])}`;
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
  const feedback = (node, message, error = false) => {
    if (!node) return;
    const value = String(message ?? '');
    const pending = !error && (value.startsWith('正在') || value.startsWith('流式输出不可用'));
    node.className = `form-feedback ${error ? 'error' : pending ? 'pending' : 'success'}`;
    if (error || pending || !value) {node.textContent = value; return;}
    const svgNS = 'http://www.w3.org/2000/svg';
    const leaf = document.createElementNS(svgNS, 'svg');
    leaf.setAttribute('viewBox', '0 0 24 24');
    leaf.setAttribute('fill', 'none');
    leaf.setAttribute('stroke', 'currentColor');
    leaf.setAttribute('stroke-width', '1.5');
    leaf.setAttribute('stroke-linecap', 'round');
    leaf.setAttribute('stroke-linejoin', 'round');
    leaf.setAttribute('aria-hidden', 'true');
    const outline = document.createElementNS(svgNS, 'path');
    outline.setAttribute('d', 'M5 19c0-8 5-13 14-14 0 9-5 14-13 14H5z');
    const vein = document.createElementNS(svgNS, 'path');
    vein.setAttribute('d', 'M5 19c4-4 7-6 11-8');
    leaf.append(outline, vein);
    const label = document.createElement('span');
    label.textContent = value;
    node.replaceChildren(leaf, label);
  };
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
  const svgIcon = paths => `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><g stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${paths}</g></svg>`;
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
    'icon-meal.svg': svgIcon('<path d="M3.5 12h17a7 7 0 0 1-7 7h-3a7 7 0 0 1-7-7Z"/><path d="M6 4v4M8 4v4M10 4v4M6 8a2 2 0 0 0 4 0M8 10v2"/><path d="M17 4v7M17 7c2 0 3-1 3-3"/>'),
    'icon-glyph-balance.svg': svgIcon('<path d="M12 4v16"/><path d="M4 8h16"/><path d="M7 8l-3 6h6z"/><path d="M17 8l-3 6h6z"/><path d="M8 20h8"/>'),
    'icon-glyph-training.svg': svgIcon('<path d="M4 10v4M7 7v10M17 7v10M20 10v4M7 12h10"/>'),
    'icon-habit-sleep.svg': svgIcon('<path d="M19.5 14.3A8 8 0 0 1 9.7 4.5a8.2 8.2 0 1 0 9.8 9.8z"/>'),
    'icon-water.svg': svgIcon('<path d="M6 3.5h12l-1.5 15a1.5 1.5 0 0 1-1.5 1.5h-6a1.5 1.5 0 0 1-1.5-1.5Z"/><path d="M6.8 12.5h10.4"/>'),
    'icon-warn.svg': svgIcon('<path d="M10.2 4.1a2.1 2.1 0 0 1 3.6 0l6.3 11a2.1 2.1 0 0 1-1.8 3.1H5.7a2.1 2.1 0 0 1-1.8-3.1Z"/><path d="M12 9v4"/><path d="M12 16.4h.01"/>'),
    'icon-tip.svg': svgIcon('<circle cx="12" cy="10" r="5.5"/><path d="M9.5 18h5M10.5 21h3"/><path d="M12 3v2"/>'),
    'icon-habit-steps.svg': svgIcon('<path d="M7 19.5c-1.6 0-2.4-1.2-2.4-3 0-2.1 1-3.5 2.1-4.4.9-.8 1.5-1.5 1.7-2.8.1-.9.6-1.4 1.3-1.4 1 0 1.5.8 1.3 2-.2 1.4-.8 2.3-.8 3.3 0 .9.5 1.4 1.4 1.9 1.1.6 1.7 1.5 1.7 2.7 0 1.5-1 2.7-2.7 2.7"/><path d="M5.2 16.8h4.2"/>'),
  };
  /** Inline markup for tinted symbols; other icons use their single-color SVG asset. */
  const iconMarkup = name => SVG_ICONS[name] || `<img src="./${esc(name)}" alt="" width="24" height="24">`;
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
    // 问答的两个动作原本常驻在每条记录下面，一屏六颗按钮；现在只在长按菜单里出现一次。
    const chatExtras = kind === 'chat'
      ? [
        {label: '重新生成', icon: 'icon-refresh.svg'},
        {label: unhelpfulChats.has(id) ? '已标记没用' : '这条没用', icon: 'icon-warn.svg'},
        {label: '记为偏好', icon: 'icon-bookmark.svg'},
      ]
      : [];
    const options = [
      {label: '复制文本', icon: 'icon-copy.svg'},
      {label: '选择文字', icon: 'icon-select.svg'},
      {label: favorite ? '取消收藏' : '收藏', icon: 'icon-bookmark.svg'},
      ...chatExtras,
      {label: '删除', icon: 'icon-trash.svg', danger: true},
    ];
    const deleteIndex = options.length - 1;
    const choice = await openSheet({
      title: kind === 'chat' ? '问答记录' : (record.name || '餐食记录'),
      options,
    });
    if (choice === null) return;
    if (choice === 0) {copyText(kind === 'chat' ? chatRecordText(record) : mealRecordText(record)); return;}
    if (choice === 1) {selectRowText(row); return;}
    if (choice === 2) {await toggleFavorite(kind, record); return;}
    if (kind === 'chat' && choice === 3) {regenerateChat(id).catch(error => notice(error.message, true)); return;}
    if (kind === 'chat' && choice === 4) {markUnhelpful(id); return;}
    if (kind === 'chat' && choice === 5) {addPreferenceFromChat(record); return;}
    if (choice === deleteIndex) {
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
  const consentIds = new Set(['advice','estimate','chat']);
  function readConsent(){try{return new Set(JSON.parse(localStorage.getItem(consentStorageKey)||'[]').filter(x=>consentIds.has(x)));}catch{return new Set();}}
  function persistConsent(ids){try{localStorage.setItem(consentStorageKey,JSON.stringify([...ids]));}catch{}}
  // Consent rows stay visible: a remembered consent shows as a ticked box and unticking revokes it.
  const consentBox=id=>document.getElementById(id==='ob-allow'?'ob-allow':id+'-consent');
  function restoreConsent(){const ids=readConsent();for(const id of consentIds){const box=consentBox(id);if(!box)continue;box.checked=ids.has(id);const row=box.closest('[data-consent-once]');if(row)row.hidden=false;box.addEventListener('change',()=>{const next=readConsent();if(box.checked)next.add(id);else next.delete(id);persistConsent(next);});}}
  function acceptConsent(id){const ids=readConsent();ids.add(id);persistConsent(ids);const box=consentBox(id);if(box)box.checked=true;setExternalConsent(true);}
  // 外发授权只问一次：向导里勾过，之后开关在「我的 → 数据、外观与说明」。
  const EXTERNAL_CONSENT_KEY = 'qingheng.consent.external';
  function externalConsent() {
    try {
      const saved = localStorage.getItem(EXTERNAL_CONSENT_KEY);
      if (saved === '1') return true;
      if (saved === '0') return false;
      // 旧版本把同意拆成几处，迁移时任何一处勾过都视为已同意。
      let legacy = [];
      try { legacy = JSON.parse(localStorage.getItem(consentStorageKey) || '[]'); } catch { legacy = []; }
      if (['advice','estimate','chat','ob-allow'].some(id => Array.isArray(legacy) && legacy.includes(id))) return true;
      try { if (localStorage.getItem(TRAINING_CONSENT_KEY) === '1') return true; } catch {}
      const legacyBox = document.getElementById('ob-allow');
      if (legacyBox && legacyBox.checked) return true;
    } catch {}
    return false;
  }
  function setExternalConsent(on) {
    try { localStorage.setItem(EXTERNAL_CONSENT_KEY, on ? '1' : '0'); } catch {}
    syncExternalConsentBoxes();
  }
  function syncExternalConsentBoxes() {
    const on = externalConsent();
    for (const id of ['settings-consent','ob-allow']) {
      const box = document.getElementById(id);
      if (box) box.checked = on;
    }
  }
  function installExternalConsent() {
    for (const id of ['settings-consent','ob-allow']) {
      const box = document.getElementById(id);
      if (!box || box.dataset.externalWired) continue;
      box.dataset.externalWired = '1';
      box.addEventListener('change', () => setExternalConsent(box.checked));
    }
    syncExternalConsentBoxes();
  }
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
  /**
   * 配置注册表：localStorage 的即时缓存与 state.prefs 的对应关系只写在这一处。
   * 新增一项配置时，先登记再读写，避免「只存了 localStorage、换机就丢」。
   */
  const CONFIG_REGISTRY = [
    {id: 'planPrefs', read: () => { try { return JSON.parse(localStorage.getItem(PLAN_PREFS_KEY) || 'null'); } catch { return null; } }, fromState: prefs => prefs.planPrefs ?? null},
    {id: 'aiPlans', read: () => collectedAiPlans(), fromState: prefs => prefs.aiPlans || {}},
  ];
  /** 启动时对齐一次：本地缓存是当前事实，state.prefs 是随备份走的那份；漂移时以本地为准回写。 */
  function verifyConfigSync() {
    const stored = state && state.prefs && typeof state.prefs === 'object' ? state.prefs : {};
    const patch = {};
    for (const entry of CONFIG_REGISTRY) {
      if (JSON.stringify(entry.read()) === JSON.stringify(entry.fromState(stored))) continue;
      patch[entry.id] = entry.read();
    }
    if (Object.keys(patch).length) schedulePrefsSync(patch);
    return Object.keys(patch);
  }
  /**
   * 旧版本的流式问答在 logToHistory:false 时仍会写问答历史，于是「AI 排今天」的工具提示
   * 被当成用户提问存了下来。只清理这个固定开头的机器提示，不动用户自己问的问题。
   */
  async function cleanupPlanChatEntries() {
    const flag = 'qingheng.cleanup.planChat.v1';
    try { if (localStorage.getItem(flag)) return; } catch { return; }
    const rows = (state?.chats || []).filter(row => row && String(row.question || '').startsWith('请为今天排一个按顺序执行的训练清单'));
    try { localStorage.setItem(flag, '1'); } catch { }
    if (!rows.length) return;
    let removed = 0;
    for (const row of rows) {
      if (!row.id) continue;
      try { await api(`/api/chatlog/${encodeURIComponent(row.id)}`, undefined, 'DELETE'); removed++; } catch { }
    }
    if (removed) {
      notice(`已清理 ${removed} 条误存进问答的排课记录。`);
      await loadState({quiet: true});
    }
  }
  async function loadState(options = {}) {    const revision = ++requestRevision;
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
      // 每次加载对齐一次本地缓存与 state.prefs，避免新增配置只存了一半。
      try { verifyConfigSync(); } catch { }
      // 一次性清掉旧版本把「AI 排今天」工具调用误存成问答的条目；只删这个固定开头的机器提示。
      setTimeout(() => { cleanupPlanChatEntries().catch(() => {}); }, 800);
      if (options.offerTargetAdjustment !== false) setTimeout(() => {maybeOfferTargetAdjustment().catch(() => {});}, 0);
    } catch (error) {loaded = false; connection(); notice(error.message,true); throw error;}
  }
  // ---- Profile hub and its sub-pages -----------------------------------------------------------
  // "我的" is a list of entries; each one opens a sub-page under #profile/<name>. Everything stays
  // in the document, so forms, validation, collapse state and existing test anchors are untouched.
  const SUBPAGES = ['targets', 'model', 'push', 'appearance', 'prefs', 'more', 'data', 'about'];
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
    const currentTab = $('[data-tab][aria-current="page"]')?.dataset.tab || '';
    if (tab === 'records' && currentTab !== 'records' && !sub && typeof switchRecordPanel === 'function') switchRecordPanel('food');
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
  // 未迁移（保留 empty()）：餐食列表 renderMeals、搜索无结果、生活建议与推送建议空态、通知权限 denied。新的空态请用 stateBlock()。
  function empty(text, hint = "", kind = "empty") {
    // 三态空状态：empty=还没有数据 / denied=没有权限 / error=加载失败；图标与语气随状态变化。
    // 空态改用图像语言里的「叶」符号（24 网格 / 1.5px 圆头），与其它态共用一套几何；
    // denied / error 仍用文字符号：它们是例外态，不该被当成常规空态被反复看到（2026-10-29）。
    const glyph = kind === "denied" ? "⊘" : kind === "error" ? "!"
      : '<img src="./icon-glyph-leaf.svg" alt="" width="40" height="40">';
    const role = kind === "error" ? ' role="alert"' : "";
    return `<div class="empty-state is-${esc(kind)}"${role}><span class="empty-icon" aria-hidden="true">${glyph}</span><p class="empty-title">${esc(text)}</p>${hint ? `<p class="empty-hint">${esc(hint)}</p>` : ""}</div>`;
  }
  /**
   * 五态统一模板：kind ∈ empty / loading / error / overflow / edge。
   * 结构固定：图标位（可省）→ 标题（缺什么）→ 一句说明（下一步做什么）→ 一个可选操作。
   * action = {label, go?, focus?}：go 是标签页名，由 70-rest 的委托处理点击。
   */
  const STATE_BLOCK_KINDS = ['empty', 'loading', 'error', 'overflow', 'edge'];
  const STATE_BLOCK_GLYPH = {error: '!', overflow: '…', edge: '~'};
  function stateBlock({kind = 'empty', title = '', body = '', action = null} = {}) {
    const k = STATE_BLOCK_KINDS.includes(kind) ? kind : 'empty';
    const role = k === 'error' ? ' role="alert"' : k === 'loading' ? ' role="status" aria-live="polite"' : '';
    const glyph = STATE_BLOCK_GLYPH[k] ? `<span class="state-block-icon" aria-hidden="true">${STATE_BLOCK_GLYPH[k]}</span>` : '';
    const button = action && action.label
      ? `<button type="button" class="text-button state-block-action"${action.go ? ` data-go="${esc(action.go)}"` : ''}${action.focus ? ` data-focus="${esc(action.focus)}"` : ''}>${esc(action.label)}</button>`
      : '';
    return `<div class="state-block" data-kind="${k}"${role}>${glyph}${title ? `<p class="state-block-title">${esc(title)}</p>` : ''}${body ? `<p class="state-block-body">${esc(body)}</p>` : ''}${button}</div>`;
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
    "离心": {full: "Eccentric，下放阶段", meaning: "肌肉被拉长的阶段，比如卧推下放。离心能承受更大张力，也更容易酸痛。", caution: "离心放慢到 3 秒以上会显著增加酸痛，训练日之间要留够间隔。"},
    "分化": {full: "Training Split，训练分化", meaning: "把一周的训练拆成不同部位或模式，比如推拉腿、上下肢、全身。", caution: "分化不是越细越好；每个部位一周能练到几次，比花样更重要。"},
    "推拉腿": {full: "Push / Pull / Legs", meaning: "按动作方向分三天：推（胸肩三头）、拉（背二头）、腿（下肢核心）。", caution: "漏练一天就少一个部位，先保证每周都轮得到。"},
    "急慢性负荷比": {full: "Acute:Chronic Workload Ratio", meaning: "最近 7 天训练量 ÷ 最近 28 天周均训练量，用来看负荷涨得快不快。", caution: "它只是提示，不是判决；换动作、换计划都会让它短暂失真。"},
    "复合动作": {full: "Compound Movement", meaning: "一次带动多个关节与肌群的动作，比如深蹲、卧推、硬拉、划船。", caution: "复合动作恢复成本高，别每天都练到力竭。"},
    "孤立动作": {full: "Isolation Movement", meaning: "只针对一个关节或肌群的动作，比如弯举、侧平举、腿屈伸。", caution: "孤立动作放在复合动作之后，别把顺序倒过来。"},
    "容量": {full: "Training Volume", meaning: "训练容量 = 组数 × 次数 × 负重（或总次数），用来衡量一次训练做了多少。", caution: "容量涨得比重量快，更容易累积疲劳。"},
    "组间休息": {full: "Rest Interval", meaning: "两组之间的休息时间：复合大重量 2~3 分钟，孤立动作 60~90 秒。", caution: "休息太短，下一组的动作容易变形。"}
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
function intakeRangeForDate(date = activeDate, profileOverride = null) {
    const profile = profileOverride || state?.profile || {}, rules = targetRules(profile);
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
          training: plannedSessions(),
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
    // 临时目标要先并进 profile 再算区间：区间是最终口径，只改 calorieTarget 会被区间覆盖掉，
    // 「弹窗说调低了、第二天却没变」就是这么来的。
    if (adjustment) Object.assign(profile, adjustment.temporary);
    const baseRange = intakeRangeForDate(date, profile);
    // 覆盖逻辑放在 calc.js（可单测）；没有该文件时退回原区间。
    const range = adjustment && window.QinghengCalc && typeof window.QinghengCalc.applyTemporaryRange === 'function'
      ? window.QinghengCalc.applyTemporaryRange(baseRange, adjustment.temporary)
      : baseRange;
    // 区间与当日上限都以目标预设算出的结果为准，手填字段不再参与。
    profile.calorieTarget = range.max;
    profile.trainingDayMin = range.trainingDay.min;
    profile.trainingDayMax = range.trainingDay.max;
    profile.restDayMin = range.restDay.min;
    profile.restDayMax = range.restDay.max;
    profile.intakeRange = {min: range.min, max: range.max, basis: range.basis};
    return profile;
  }
/* Fragment of assets/app.js -- assembled by tools/assemble-app.ps1 in filename order.
 * Edit this file, never the generated assets/app.js; tests/app-fragments.test.mjs fails on drift. */
  // ---- Rich answers ---------------------------------------------------------------------------
  // The model writes plain Chinese text. A small, explicit subset is understood so a reply can
  // carry a heading with a coloured icon, a bullet list, an uppercase label and a real table,
  // without ever trusting the text as markup: everything is escaped first, then re-assembled.
  const answerIconRules = [
    {tone:'protein', icon:'icon-nutrient-protein.svg', words:['蛋白质','蛋白']},
    {tone:'fat', icon:'icon-nutrient-fat.svg', words:['脂肪','油']},
    {tone:'carb', icon:'icon-nutrient-carb.svg', words:['碳水','主食','米饭','面条']},
    {tone:'energy', icon:'icon-energy.svg', words:['热量','卡路里','kcal','千卡']},
    {tone:'weight', icon:'icon-glyph-balance.svg', words:['体重','体脂','BMI','腰围','体重变化']},
    {tone:'training', icon:'icon-glyph-training.svg', words:['训练','力量','运动','健身']},
    {tone:'sleep', icon:'icon-habit-sleep.svg', words:['睡眠','休息','入睡']},
    {tone:'water', icon:'icon-water.svg', words:['饮水','喝水','水分']},
    {tone:'warn', icon:'icon-warn.svg', words:['注意','警告','风险','偏高','超标','不足']},
    {tone:'ok', icon:'icon-check.svg', words:['完成','达标','很好','不错','已经']},
    {tone:'tip', icon:'icon-tip.svg', words:['建议','明天','调整','可以','优先']},
  ];
  function answerIcon(text) {
    const value = String(text || '');
    for (const rule of answerIconRules) if (rule.words.some(word => value.includes(word))) return rule;
    return {tone:'neutral', icon:'', words:[]};
  }
  /** Latin runs that were written in capitals are kept as an uppercase label above the heading. */
  function answerEyebrow(text) {
    const latin = String(text || '').match(/[A-Za-z][A-Za-z0-9 .,%/+-]{2,}/g);
    if (!latin) return '';
    const upper = latin.filter(run => run === run.toUpperCase() && /[A-Z]/.test(run));
    return upper.length ? upper.join(' · ').slice(0, 40) : '';
  }
  const answerInline = text => esc(text)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/[`]{1}([^`]+)[`]{1}/g, '<code>$1</code>');
  function answerSection(title) {
    const clean = String(title || '').replace(/^[#\s【\[（(]+|[\s】\]）)】]+$/g, '').replace(/\*\*/g, '').trim();
    if (!clean) return '';
    const rule = answerIcon(clean);
    const eyebrow = answerEyebrow(clean);
    return `<div class="answer-section tone-${rule.tone}">${rule.icon ? `<span class="inline-icon" aria-hidden="true">${iconMarkup(rule.icon)}</span>` : ''}`
      + `<div>${eyebrow ? `<p class="answer-eyebrow">${esc(eyebrow)}</p>` : ''}<p class="answer-heading">${answerInline(clean)}</p></div></div>`;
  }
  /** Renders a pipe table when the block looks like one; returns '' otherwise. */
  /** Widest table that still reads on a phone: 4 columns, 8 body rows, short cells. */
  const ANSWER_TABLE_COLUMNS = 4, ANSWER_TABLE_ROWS = 8, ANSWER_TABLE_CELL = 12;
  /** False when a parsed block would overflow a phone screen, so it is shown as prose instead. */
  function answerTableFits(rows) {
    if (!Array.isArray(rows) || rows.length < 2) return false;
    if (rows[0].length > ANSWER_TABLE_COLUMNS || rows.length - 1 > ANSWER_TABLE_ROWS) return false;
    return rows.every(cells => cells.every(cell => String(cell).length <= ANSWER_TABLE_CELL));
  }
  function answerTable(rows) {
    const cells = row => row.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').map(cell => cell.trim());
    const head = cells(rows[0]);
    const body = rows.slice(1).filter(row => !/^[\s|:-]+$/.test(row)).map(cells);
    if (!head.length || !body.length) return '';
    // A table wider or longer than a phone screen reads worse than prose, so it is not drawn as one.
    if (!answerTableFits([head].concat(body))) return '';
    const numbers = new Set(body.map(row => row.length));
    const numeric = new Set();
    body.forEach(row => row.forEach((cell, i) => {if (cell && number(cell.replace(/[^\d.-]/g, '')) !== null && /^[\d.,%\s\-+]+$/.test(cell)) numeric.add(i);}));
    const headHtml = head.map(cell => `<th scope="col">${answerInline(cell)}</th>`).join('');
    const bodyHtml = body.map(row => `<tr>${head.map((_, i) => `<td${numeric.has(i) ? ' class="num"' : ''}>${answerInline(row[i] ?? '')}</td>`).join('')}</tr>`).join('');
    return `<div class="answer-table-wrap"><table class="answer-table"><thead><tr>${headHtml}</tr></thead><tbody>${bodyHtml}</tbody></table></div>`;
  }
  /** Plain text (or a light subset of it) rendered as safe, readable answer HTML. */
  const answerNumericCell = token => /^[-−+]?[\d.,%]+$/.test(String(token || '').trim());
  /**
   * Models often answer a "make a table" request with whitespace-separated columns instead of
   * Markdown pipes. That shape is recognised here — a short header row plus rows whose remaining
   * columns are all numbers — so a real table still comes out, while ordinary prose never matches.
   */
  function answerSpaceTable(rows) {
    if (!Array.isArray(rows) || rows.length < 2 || rows.length > 30) return '';
    const split = row => String(row).trim().split(/\s+/).filter(Boolean);
    const head = split(rows[0]);
    if (head.length < 3 || head.length > 8) return '';
    if (head.some(answerNumericCell)) return '';
    const body = rows.slice(1).map(split);
    if (!body.every(cells => cells.length === head.length)) return '';
    if (!body.every(cells => cells.slice(1).every(answerNumericCell))) return '';
    if (!body.some(cells => cells.slice(1).some(cell => /\d/.test(cell)))) return '';
    // The phone-width guard applies to the split cells, not to the raw lines: checking the lines
    // rejected every whitespace table, because a whole line is longer than four "columns".
    if (!answerTableFits([head].concat(body))) return '';
    const headHtml = head.map(cell => `<th scope="col">${answerInline(cell)}</th>`).join('');
    const bodyHtml = body.map(cells => `<tr><td>${answerInline(cells[0])}</td>${cells.slice(1).map(cell => `<td class="num">${answerInline(cell)}</td>`).join('')}</tr>`).join('');
    return `<div class="answer-table-wrap"><table class="answer-table"><thead><tr>${headHtml}</tr></thead><tbody>${bodyHtml}</tbody></table></div>`;
  }
  /** Plain text (or a light subset of it) rendered as safe, readable answer HTML. */
  function answerHtml(text) {
    const blocks = String(text ?? '').replace(/\r/g, '').split(/\n\s*\n/);
    const out = [];
    for (const block of blocks) {
      const lines = block.split('\n').map(line => line.trim()).filter(Boolean);
      if (!lines.length) continue;
      // A pipe table, a whitespace table, or plain prose/bullets — decided per block.
      if (lines.every(line => /^\|.*\|$/.test(line))) {const html = answerTable(lines); out.push(html || lines.map(line => `<p>${answerInline(line)}</p>`).join('')); continue;}
      const space = answerSpaceTable(lines);
      if (space) {out.push(space); continue;}
      let bullets = [];
      const flushBullets = () => {if (bullets.length) {out.push(`<ul class="answer-list">${bullets.map(item => `<li>${item}</li>`).join('')}</ul>`); bullets = [];}};
      for (const line of lines) {
        const heading = line.match(/^#{1,6}\s*(.+)$/) || line.match(/^【(.+)】$/) || line.match(/^\*\*([^*]+)\*\*$/) || (/^(?:[一二三四五六七八九十]+[、.]|\d+[、.])/.test(line) && line.length <= 26 ? [null, line.replace(/^(?:[一二三四五六七八九十]+[、.]|\d+[、.])/, '')] : null);
        if (heading) {flushBullets(); out.push(answerSection(heading[1])); continue;}
        const bullet = line.match(/^[-*•·]\s*(.+)$/) || line.match(/^\d+[.)]\s*(.+)$/);
        if (bullet) {bullets.push(answerInline(bullet[1])); continue;}
        flushBullets();
        out.push(`<p>${answerInline(line)}</p>`);
      }
      flushBullets();
    }
    return out.join('') || empty('暂无内容。');
  }
  function adviceHtml(value) {
    return esc(value).replace(/\*\*([^*\n]{1,160})\*\*/g, '<strong>$1</strong>');
  }
  /** Identity of one day's records: any change makes previously generated advice stale. */
  function mealsFingerprint(date) {
    const rows = (state.meals || []).filter(row => row.date === date)
      .map(row => [row.mealType || '', row.mealTime || '', number(row.calories), number(row.protein), number(row.fat), number(row.carbs)].join(','));
    return `${date}|${rows.length}|${rows.sort().join(';')}`;
  }
  function renderAdvice(messages, date) {
    const container = $('#advice-content');
    const rows = Array.isArray(messages) ? messages.map(value => String(value || '').trim()).filter(Boolean) : [];
    const rich = messages.some(message => /\n|^\s*\||^#{1,6}\s|^【/.test(String(message || '')));
    const prefCount = typeof readPreferences === 'function' ? readPreferences().length : 0;
    const prefNote = prefCount ? `<p class="fine-print advice-pref-note">已带上 ${prefCount} 条偏好</p>` : '';
    if (!rows.length) {
      container.innerHTML = empty('目前记录不足，暂不作判断', '先记两三天，建议会自己长出来。');
    } else if (rich) {
      container.innerHTML = `<div class="answer">${rows.map(message => answerHtml(message)).join('')}</div>${prefNote}`;
    } else {
      // 第一句是评价，单独成行、加重；后面的动作保持列表，避免两句糊成一段。
      // 模型常把「评价 + 动作」塞进一条消息，这里按句号再拆一次，只为显示分层，不改内容。
      let verdict = rows[0];
      let actions = rows.slice(1);
      if (!actions.length) {
        const parts = rows[0].split(/(?<=[。！？])/).map(part => part.trim()).filter(Boolean);
        if (parts.length > 1) { verdict = parts[0]; actions = parts.slice(1); }
      }
      container.innerHTML = `<div class="answer advice-answer"><p class="advice-verdict">${adviceHtml(verdict)}</p>`
        + (actions.length ? `<ul class="answer-list advice-actions">${actions.map(message => `<li>${adviceHtml(message)}</li>`).join('')}</ul>` : '')
        + `</div>${prefNote}`;
    }
    container.dataset.date = date || '';
    container.dataset.fingerprint = validDate(date) ? mealsFingerprint(date) : '';
  }
  // Carbohydrate headroom left after protein and fat targets; null when targets are incomplete.
  function carbCap(p, range) {
    // calorieTarget can be empty on a temporary-target day; fall back to the day's range max so the
    // carbohydrate limit still renders instead of showing a dash.
    const kcal = number(p.calorieTarget) ?? number(range && range.max), protein = number(p.proteinMax), fat = number(p.fatMax);
    if (kcal === null || kcal <= 0) return null;
    const rest = kcal - (protein === null ? 0 : protein * 4) - (fat === null ? 0 : fat * 9);
    return rest > 0 ? Math.round(rest / 4) : null;
  }
  /** Shows a retryable bar instead of leaving the page half-drawn. */
  function showRenderError(error) {
    const bar = $('#render-error'), text = $('#render-error-text');
    if (text) { text.textContent = ''; text.innerHTML = empty('这一屏没能画出来', '点「重新加载」通常就好（记录已保存在本机）。错误：' + (error && error.message ? error.message : '未知错误'), 'error'); }
    if (bar) bar.hidden = false;
  }
  function render() {
    if (!state) return; // nothing to draw yet; loadState() calls render() again
    try { renderBody(); if (typeof renderTrainingOverview === "function") renderTrainingOverview(); } catch (error) { showRenderError(error); }
  }
  function arrangeEnergyCard() {
    const card = $('.energy-card');
    if (!card) return;
    const body = $('.energy-body', card);
    const ring = $('#energy-ring', card);
    const detail = $('.energy-detail', card);
    if (!body || !ring || !detail || (body.contains(ring) && body.contains(detail))) return;
    body.replaceChildren(ring, detail);
  }
  function renderBody() {
    arrangeEnergyCard();
    const count=state.meals.filter(row=>row.date===activeDate).length;
    const hint=$('#chat-data-context'); if(hint)hint.textContent=`分析日期：${activeDate} · 已保存 ${count} 条餐食（未确认预览和问答照片不计入饮食）`;
    const dateLabel=$('#chat-date-label'); if(dateLabel) dateLabel.textContent = activeDate === localDate() ? '今天' : activeDate.slice(5);
    const adviceHint=$('#advice-data-context'); if(adviceHint)adviceHint.textContent=`分析日期：${activeDate} · 已保存 ${count} 条餐食`;
    const adviceNode=$('#advice-content'), stale=$('#advice-stale');
    if (stale) {
      const baked=adviceNode?.dataset?.fingerprint, shown=adviceNode?.dataset?.date;
      const isStale=!!baked && shown===activeDate && baked!==mealsFingerprint(activeDate);
      stale.hidden=!isStale;
      if (isStale) stale.textContent='这条建议是按当时的记录生成的，之后记录有变化。请点「获取建议」重新生成。';
    }
    const meals = state.meals.filter(meal => meal.date === activeDate);
    const totals = totalsFor(meals), p = effectiveProfileForDate(activeDate);
    // 饮食页也要看得到训练：一行「今天练了什么 / 多少容量」，点进去就是训练面板。
    const trainingLine = $('#today-training-line');
    if (trainingLine) {
      const habit = (state.habits || []).find(row => row && row.date === activeDate);
      const rows = habit && Array.isArray(habit.exercises) ? habit.exercises : [];
      const volume = typeof trainingVolumeOf === 'function' ? trainingVolumeOf(rows) : 0;
      trainingLine.hidden = !rows.length;
      trainingLine.textContent = rows.length ? `今天训练 ${rows.length} 个动作 · 容量 ${fmt(volume, 0)} kg` : '';
    }
    $('#calorie-value').textContent = fmt(totals.calories,0);
    const range = p.intakeRange;
    // C 节：目标只给一个数，误差用 ±2% 说明，依据与数字同屏同步更新。
    const target = number(range ? range.max : p.calorieTarget);
    $('#calorie-target').textContent = target === null ? '—' : fmt(target, 0);
    const basisNode = $('#calorie-basis');
    if (basisNode) {
      const basisWord = range ? (String(range.basis).indexOf('训练') >= 0 ? '按训练日' : '按休息日') : '按默认';
      basisNode.textContent = target === null ? '' : basisWord + ' · ±2%';
    }
    // 不截断：超出目标的部分要能被环和下方差额行看到。
    const rawRatio = totals.calories !== null && number(p.calorieTarget) > 0 ? totals.calories / p.calorieTarget : 0;
    const ratio = Math.min(1, Math.max(0, rawRatio));
    // 达到目标时填满一圈；超出量从同一起点叠加警示色，最多再覆盖一圈。
    const overRatio = Math.max(0, rawRatio - 1);
    $('#energy-ring').style.setProperty('--progress',`${(ratio*360).toFixed(1)}deg`);
    $('#energy-ring').style.setProperty('--over',`${(Math.min(overRatio, 1) * 360).toFixed(1)}deg`);
    // 差值必须跟屏幕上显示的上下限同一口径：以前用 calorieTarget 算「超出区间上限」会多算。
    const floor = number(range ? range.min : p.calorieTarget);
    const cap = number(range ? range.max : p.calorieTarget);
    $('#calorie-caption').textContent = !meals.length ? '还没有餐食记录，摄入量未知。' : totals.calories === null ? '部分餐食缺少热量，无法计算完整汇总。' : number(p.calorieTarget) === null ? '尚未设置每日热量目标。' : `${range ? `按${range.basis.startsWith('当天标记为训练') ? '训练日' : '休息日'}区间：` : ''}${totals.calories < floor ? `距区间下限还差 ${fmt(floor-totals.calories,0)} kcal` : totals.calories <= cap ? `在区间内，距上限 ${fmt(cap-totals.calories,0)} kcal` : `超出区间上限 ${fmt(totals.calories-cap,0)} kcal`}。`;
    // What to do next, not just how far off the target is: a number without an action is useless.
    const actionBox = $('#calorie-action');
    if (actionBox) {
      const parts = [];
      const protein = number(totals.protein), proteinMin = number(p.proteinMin);
      const fat = number(totals.fat), fatMax = number(p.fatMax);
      const kcal = number(totals.calories), actionCap = range ? number(range.max) : number(p.calorieTarget);
      if (protein !== null && proteinMin !== null && protein < proteinMin) {
        const gap = proteinMin - protein;
        // 只说方向、不点名具体食物：以前按缺口给「一掌心大小的鸡胸」这类健身语境例子，
        // 对普通用户是额外门槛；1.1.37 也删过克数等价换算，这里不回到「吃什么、吃多少」的清单。
        if (gap > 30) parts.push(`优先补蛋白：还差 ${fmt(gap,0)} g，接下来两餐各补一份蛋白质（蛋、豆制品、奶或瘦肉）`);
        else parts.push(`优先补蛋白：还差 ${fmt(gap,0)} g，下一餐补一份蛋白质（蛋、豆制品、奶或瘦肉）`);
      }
      if (fat !== null && fatMax !== null && fat > fatMax) parts.push(`脂肪超 ${fmt(fat - fatMax,0)} g：剩下的菜改白灼或清蒸，别再额外加油`);
      if (kcal !== null && actionCap !== null && kcal > actionCap) parts.push(`热量已超上限 ${fmt(kcal - actionCap,0)} kcal：不再加餐，晚餐只吃蛋白加蔬菜`);
      if (!parts.length && protein !== null && proteinMin !== null && protein >= proteinMin) parts.push('蛋白质已达标，剩下的额度分给主食与蔬菜即可。');
      // 能量卡曾经一口气列出三条提示，把「＋ 记录一餐」挤到了屏幕外。
      // 现在只留最该做的一条，其余收进 details。
      const note = parts.length > 1
        ? '<details class="energy-more"><summary>另外 ' + (parts.length - 1) + ' 条提示</summary>'
          + parts.slice(1).map(text => '<p>' + esc(text) + '</p>').join('') + '</details>'
        : '';
      actionBox.innerHTML = parts.length ? '<p class="energy-hint">' + esc(parts[0]) + '</p>' + note : '';
    }
    $('#macro-summary').innerHTML = [['protein','蛋白质',p.proteinMin,p.proteinMax],['fat','脂肪',p.fatMin,p.fatMax],['carbs','碳水',null,carbCap(p, range)]].map(([key,label,min,max]) => {const value = totals[key], progress = value !== null && number(max)>0 ? Math.min(100,value/max*100) : 0; return `<div><span class="macro-label">${label}</span><div class="macro-value">${fmt(value)} <small>g</small></div><div class="progress-track"><span data-progress="${progress}"></span></div><span class="macro-target">${min !== null && number(min)!==null && number(max)!==null ? `目标 ${fmt(min)}–${fmt(max)} g` : key === 'carbs' ? (number(max)>0 ? `参考上限约 ${fmt(max,0)} g（热量目标扣除蛋白质与脂肪）` : '设置热量目标后显示进度') : '目标未设置'}</span></div>`;}).join('');
    $$('#macro-summary [data-progress]').forEach(node => {node.style.width=`${Number(node.dataset.progress)}%`;});
    const measurements = state.measurements.filter(item => validDate(item.date) && item.date <= activeDate).sort((a,b) => b.date.localeCompare(a.date));
    const weight = latestField(measurements,'weight'), waist = latestField(measurements,'waist'), bodyFat = latestField(measurements,'bodyFat');
    const bmi = weight && number(p.height)>0 ? weight.weight / ((p.height/100)**2) : null;
    // 身体近况：数值 + 较上次的变化，日期只写一次（原来四格各贴一个 ISO 日期）。
    const prevField = (key, date) => {
      const older = measurements.find(item => item.date < date && number(item[key]) !== null);
      return older ? number(older[key]) : null;
    };
    const daysBetween = (from, to) => {
      try { return Math.round((new Date(to + 'T00:00:00') - new Date(from + 'T00:00:00')) / 86400000); } catch { return null; }
    };
    const deltaLine = (value, prev, unit) => {
      if (value === null || value === undefined) return '';
      if (prev === null) return '首次记录';
      const diff = Number(value) - prev;
      if (!Number.isFinite(diff) || Math.abs(diff) < 0.05) return '与上次持平';
      return `较上次 ${diff > 0 ? '＋' : '－'}${fmt(Math.abs(diff), 1)} ${unit}`.trim();
    };
    const bodyCells = [['体重', weight?.weight, 'kg', weight?.date, 'weight'], ['BMI', bmi, '', '', null], ['腰围', waist?.waist, 'cm', waist?.date, 'waist'], ['体脂率', bodyFat?.bodyFat, '%', bodyFat?.date, 'bodyFat']];
    const measured = weight?.date || waist?.date || bodyFat?.date || '';
    const ago = measured ? daysBetween(measured, activeDate) : null;
    $('#latest-measurement').innerHTML = bodyCells.map(([label, value, unit, date, key]) => {
      const delta = key && date ? deltaLine(value, prevField(key, date), unit) : '';
      const shown = value === null || value === undefined ? '—' : fmt(value);
      return `<div class="stat-cell"><span class="stat-label">${label}</span><div class="stat-number${shown === '—' ? ' is-empty' : ''}">${shown}<small>${shown === '—' ? '' : unit}</small></div>${delta ? `<span class="stat-delta">${esc(delta)}</span>` : ''}</div>`;
    }).join('') + `<p class="stat-when fine-print">${measured ? `最近测量 ${esc(measured)}${ago !== null && ago > 0 ? `（${ago} 天前）` : '（今天）'}` : '还没有身体测量'}</p>`;
    const habit = state.habits.find(item => item.date === activeDate) || {};
    const training = habit.training === true || habit.training === 'true' ? '已训练' : habit.training === false || habit.training === 'false' ? '休息日' : habit.training ? String(habit.training) : '未记录';
    // SVG icons instead of ↗ ♧ ☾ ◇: those characters rendered differently on every ROM.
    const tiles = [
      ...(trainingEnabled() ? [['icon-glyph-training.svg', training, '训练']] : []),
      ['icon-habit-steps.svg', number(habit.steps) === null ? '未记录' : `${fmt(habit.steps,0)} 步`, '日常活动'],
      ['icon-habit-sleep.svg', number(habit.sleep) === null ? '未记录' : `${fmt(habit.sleep)} 小时`, '睡眠'],
      ['icon-water.svg', number(habit.water) === null ? '未记录' : `${fmt(habit.water,0)} ml`, '饮水']
    ];
    // 四个格子改成一行：今天页只交代「记了什么」，改去记录页改，且进去不弹输入法。
    $('#habit-summary').innerHTML = '<button type="button" class="hub-row habit-jump" data-habit-jump>'
      + '<span class="hub-text"><span class="hub-title">日常习惯</span><span class="hub-summary">'
      + esc((() => {
        const parts = tiles.filter(([, value]) => !String(value).includes('未记录')).map(([, value, label]) => `${label} ${value}`);
        return parts.length ? parts.join(' · ') : '点这里补步数、睡眠、饮水';
      })())
      + '</span></span><span class="hub-arrow" aria-hidden="true">›</span></button>';
    const recordMeals=[...state.meals].sort((a,b) => String(b.date).localeCompare(String(a.date)));
    renderTodayTimeline($('#today-meals'), meals);
    renderRecordMeals(favoriteOnlyMeals ? recordMeals.filter(row => row.favorite === true) : recordMeals);
    $('#settings-status').textContent = state.settings.apiConfigured === true ? '已配置 · 密钥不回传' : settingsKnown ? '未配置外部 API' : '配置状态未知';
    $('#estimate-mode').textContent = state.settings.apiConfigured === true ? '照片还需已启用视觉模型。' : settingsKnown ? '当前使用本地估算，不发送给外部模型；结果仍需手动检查确认。' : '尚未加载手机配置，请稍后重试。';
    renderChat();
    renderTrainingInsights();
    renderDailyCheck();
    renderWeekPlan();
    renderTrendWarnings();
    if (typeof renderDietTrend === 'function') renderDietTrend();
    applyTrainingVisibility();
    if (typeof renderAiPlan === "function") renderAiPlan();
    if (typeof renderAdviceOrder === "function") renderAdviceOrder();
    if (typeof renderSlotHint === "function") renderSlotHint();
    if (typeof renderLastChat === "function") renderLastChat();
    renderTargetStatus();
    renderTrends();
    renderUndatedMeals();
    renderHub();
  }
  /** Creates the live row once; complete answer blocks keep their DOM nodes as later text arrives. */
  function beginChatStream(question, hasImage, date) {
    const log = $('#chat-log');
    if (!log) return null;
    const dayHeader = document.createElement('p');
    dayHeader.className = 'chat-day stream-chat-day';
    dayHeader.textContent = String(date || '');
    const dayCount = document.createElement('span'); dayCount.textContent = '正在回答';
    dayHeader.appendChild(dayCount);
    const box = document.createElement('div');
    box.className = 'meal-row list-row stream-row';
    box.setAttribute('role', 'listitem');
    box.innerHTML = '<div class="row-body"><div class="row-head"><strong></strong>'
      + `${hasImage ? '<span class="row-tag">含照片</span>' : ''}<span class="row-tag">正在回答</span></div>`
      + '<div class="answer stream-answer"><div class="stream-think" hidden></div>'
      + '<div class="stream-status">模型正在思考…</div><div class="stream-text"></div>'
      + '<span class="stream-caret" aria-hidden="true">▍</span></div></div>';
    $('strong', box).textContent = question || '（照片提问）';
    log.prepend(box);
    log.prepend(dayHeader);
    // 回答长在页面下方：把日期行和气泡滚进视野，否则点了「提问」像没反应。
    nextFrame(() => {if (dayHeader.isConnected) dayHeader.scrollIntoView({block: 'start', behavior: 'smooth'});});
    const state = {box, dayHeader, text: '', renderedLength: 0, thinking: '', body: $('.stream-text', box),
      status: $('.stream-status', box), caret: $('.stream-caret', box), think: $('.stream-think', box),
      activeBlock: null, activeKind: '', started: false, frame: 0};
    if (state.status) state.status.textContent = '模型正在思考…';
    state.hint = setTimeout(() => {
      if (!state.started && state.status) state.status.textContent = '推理模型正在整理思路…';
    }, 4000);
    return state;
  }
  function streamBlockKind(value) {
    const block = String(value || '').trimStart();
    if (/^\|/.test(block)) return 'table';
    if (/^(?:#{1,6}\s|【|\*\*|[一二三四五六七八九十]+[、.]\s)/.test(block)) return 'section';
    if (/^(?:[-*•·]\s+|\d+[.)]\s+)/.test(block)) return 'list';
    return 'text';
  }
  function renderStreamBlock(box, value, complete) {
    const raw = String(value || '');
    if (!raw.trim()) return;
    let node = box.activeBlock;
    if (!node) {
      node = document.createElement('div');
      box.body.appendChild(node);
      box.activeBlock = node;
      box.activeKind = '';
    }
    const kind = streamBlockKind(raw);
    if (kind !== 'text' && box.activeKind !== kind) {
      node.className = `stream-block stream-block-pending stream-block-pending--${kind}`;
      node.innerHTML = kind === 'table'
        ? '<span class="stream-placeholder-line"></span><span class="stream-placeholder-line"></span><span class="stream-placeholder-line"></span>'
        : '<span class="stream-placeholder-line stream-placeholder-line--heading"></span>';
      box.activeKind = kind;
      box.activePlaceholderCount = kind === 'table' ? 3 : 1;
    }
    if (kind === 'text' && !box.activeKind) box.activeKind = 'text';
    if (kind === 'table' || kind === 'list') {
      const lines = raw.split('\n').filter(line => line.trim()).length;
      const rows = kind === 'table' ? Math.max(3, Math.min(lines, 9)) : Math.max(1, Math.min(lines, 8));
      while (box.activePlaceholderCount < rows) {
        const skeleton = document.createElement('span'); skeleton.className = 'stream-placeholder-line';
        node.appendChild(skeleton); box.activePlaceholderCount++;
      }
    }
    if (!complete) {
      if (box.activeKind === 'text') {node.className = 'stream-block'; node.textContent = raw;}
      return;
    }
    node.innerHTML = answerHtml(raw);
    node.className = 'stream-block stream-block-ready';
    box.activeBlock = null; box.activeKind = ''; box.activePlaceholderCount = 0;
  }
  function flushChatStream(box, complete = false) {
    if (!box?.body) return;
    let rest = box.text.slice(box.renderedLength);
    let boundary;
    while ((boundary = /\n[ \t]*\n/.exec(rest))) {
      renderStreamBlock(box, rest.slice(0, boundary.index), true);
      box.renderedLength += boundary.index + boundary[0].length;
      rest = box.text.slice(box.renderedLength);
    }
    renderStreamBlock(box, rest, complete);
    if (complete) box.renderedLength = box.text.length;
  }
  function pushChatStream(box, chunk) {
    if (!box || !chunk) return;
    if (!box.started) {
      box.started = true;
      clearTimeout(box.hint);
      if (box.status) box.status.hidden = true;
      // Keep the reasoning visible but small once the answer starts: a one-line summary, tappable.
      if (box.thinking && box.think) {
        box.think.textContent = `已思考 ${box.thinking.length} 字（点击展开）`;
        box.think.classList.add('is-summary');
      }
    }
    box.text += chunk;
    // 每个 token 写一次 DOM 会让长回答在 WebView 上抖；合批到一帧只写一次。
    if (!box.frame) {
      box.frame = nextFrame(() => {
        box.frame = 0;
        flushChatStream(box);
        box.caret.hidden = false;
      });
    }
  }
  /** Reasoning fragments from a reasoning model: shown, never merged into the answer. */
  function pushChatThinking(box, chunk) {
    if (!box || !chunk || !box.think) return;
    if (box.started) return;
    box.thinking += chunk;
    box.think.hidden = false;
    box.think.textContent = box.thinking.length > 600 ? '…' + box.thinking.slice(-600) : box.thinking;
  }
  function endChatStream(box) {
    if (box?.hint) clearTimeout(box.hint);
    if (box?.frame) {cancelFrame(box.frame); box.frame = 0;}
    if (!box?.adopted && box?.box?.parentNode) box.box.parentNode.removeChild(box.box);
    if (!box?.adopted && box?.dayHeader?.parentNode) box.dayHeader.parentNode.removeChild(box.dayHeader);
  }
  function finishChatStream(box, answer) {
    if (!box) return;
    const final = String(answer || '').trim(), received = box.text.trimEnd();
    if (!final.startsWith(received)) {
      if (!received || !final.endsWith(received)) throw new Error('流式内容与最终回答不一致，请重试。');
      if (box.frame) {cancelFrame(box.frame); box.frame = 0;}
      flushChatStream(box, true);
      const prefix = final.slice(0, final.length - received.length);
      if (prefix.trim()) {
        const node = document.createElement('div');
        node.className = 'stream-block stream-block-ready';
        node.innerHTML = answerHtml(prefix);
        box.body.insertBefore(node, box.body.firstChild);
      }
    } else {
      if (box.frame) {cancelFrame(box.frame); box.frame = 0;}
      box.text = final;
      flushChatStream(box, true);
    }
    clearTimeout(box.hint);
    if (box.status) box.status.hidden = true;
    if (box.caret) box.caret.hidden = true;
    box.finished = true;
  }
  /**
   * 把流式回答写进任意容器（今天页的训练建议卡也要有「正在思考」这一段）。
   * 返回 /api/chat/stream 的最终 data；不支持流式时抛错，交给调用方退回一次性接口。
   */
  async function streamInto(container, payload, placeholder = '模型正在思考…') {
    if (!container) throw new Error('缺少输出位置');
    if (!window.QinghengAdapter?.hasNative?.() || !navigator.onLine) throw new Error('当前环境不支持流式输出');
    container.hidden = false;
    container.innerHTML = '<div class="stream-think" hidden></div><span class="stream-text"></span><span class="stream-caret" aria-hidden="true">▍</span>';
    const think = $('.stream-think', container), text = $('.stream-text', container), caret = $('.stream-caret', container);
    text.textContent = placeholder;
    let thinking = '', buffer = '', pending = '', frame = 0, started = false;
    const flush = () => {frame = 0; if (text) text.textContent = pending; if (caret) caret.hidden = false;};
    window.QinghengStream = {
      onThink: chunk => {
        if (started || !chunk || !think) return;
        thinking += chunk;
        think.hidden = false;
        think.textContent = thinking.length > 600 ? '…' + thinking.slice(-600) : thinking;
      },
      onDelta: chunk => {
        if (!chunk) return;
        if (!started) {
          started = true;
          if (think) {
            think.hidden = !thinking;
            if (thinking) {think.textContent = `已思考 ${thinking.length} 字（点击展开）`; think.classList.add('is-summary');}
          }
        }
        buffer += chunk; pending = buffer;
        if (!frame) frame = nextFrame(flush);
      },
    };
    try {
      return await api('/api/chat/stream', payload);
    } finally {
      window.QinghengStream = null;
      if (frame) cancelFrame(frame);
      if (caret) caret.remove();
    }
  }
  /** Streams the answer through the adapter; throws when streaming is unavailable so the caller can fall back. */
  async function streamChat(payload) {
    if (!window.QinghengAdapter?.hasNative?.() || !navigator.onLine) throw new Error('当前环境不支持流式输出');
    const box = beginChatStream(payload.question, Boolean(payload.image), payload.date);
    if (!box) throw new Error('问答记录区域不可用，请重新打开页面后重试。');
    window.QinghengStream = {onDelta: text => pushChatStream(box, text), onThink: text => pushChatThinking(box, text)};
    try {
      const data = await api('/api/chat/stream', payload);
      finishChatStream(box, data?.reply);
      return {data, box};
    } catch (error) {
      endChatStream(box);
      throw error;
    } finally {
      window.QinghengStream = null;
    }
  }
  /** Citations for a saved answer: real https links only, collapsed by default. */
  function citationBlock(row) {
    const sources = Array.isArray(row && row.sources) ? row.sources.filter(item => item && typeof item.url === 'string' && /^https:\/\//.test(item.url)) : [];
    if (!sources.length) return '';
    const items = sources.map((item, index) => `<li><a href="${esc(item.url)}" target="_blank" rel="noreferrer">[${index + 1}] ${esc(String(item.title || item.url).slice(0, 90))}</a></li>`).join('');
    return `<details class="row-sources"><summary>来源 ${sources.length} 条</summary><ol>${items}</ol></details>`;
  }
  /** Rows the user marked as unhelpful; mirrored into /api/prefs so a new phone keeps them. */
  const unhelpfulChats = (() => {
    try {const saved = JSON.parse(localStorage.getItem(CHAT_UNHELPFUL_KEY) || '[]'); return new Set(Array.isArray(saved) ? saved.map(String) : []);} catch {return new Set();}
  })();
  function markUnhelpful(id) {
    if (!id) return;
    unhelpfulChats.add(id);
    try {localStorage.setItem(CHAT_UNHELPFUL_KEY, JSON.stringify([...unhelpfulChats]));} catch {}
    if (typeof schedulePrefsSync === 'function') schedulePrefsSync({unhelpfulChats: [...unhelpfulChats]});
    renderChat();
  }
  /** Refills the question box and, when consent is already given, asks again. */
  async function regenerateChat(id) {
    const row = (state.chats || []).find(item => String(item && item.id) === String(id));
    if (!row) {notice('找不到这条记录，可能已被清除。', true); return;}
    const box = $('#chat-question');
    if (box) {box.value = String(row.question || ''); box.focus();}
    window.scrollTo({top: 0, behavior: 'smooth'});
    if (typeof externalConsent === 'function' && externalConsent()) {await sendChat();}
    else notice('问题已填回输入框；到「我的 → 数据、外观与说明」开启外部模型授权后点「提问」即可重新生成。');
  }
  let chatQuery = "";
  /** 按日期分组，组内保持倒序（最新在前）。 */
  function groupChatsByDate(rows) {
    const groups = [];
    for (const row of rows) {
      const date = String(row.date || "未标注日期");
      let group = groups.find(item => item.date === date);
      if (!group) { group = {date, rows: []}; groups.push(group); }
      group.rows.push(row);
    }
    return groups;
  }
  function chatMatches(row, query) {
    if (!query) return true;
    const hay = (String(row.question || "") + " " + String(row.answer || "")).toLowerCase();
    return hay.includes(query.toLowerCase());
  }
  /** 问答记录分页：默认只渲染最新 30 条，历史长了也不卡。 */
  let chatShownCount = 30;
  const CHAT_PAGE_SIZE = 30;
  let streamExpandedAnswer = null;
  function resetChatPaging() { chatShownCount = CHAT_PAGE_SIZE; }
  function showEarlierChats() { chatShownCount += CHAT_PAGE_SIZE; renderChat(); }
  // ---- 按天查看 ------------------------------------------------------------------------------
  // 历史越长，"更早的记录"越像抽奖。日期 chip 直接筛出某一天，两侧箭头只在有记录的日期之间走，
  // 到最新一天再按一次就回到全部——翻页和按天查询是同一个动作。
  let chatDayFilter = '';
  function chatRowsInScope() {
    const chats = Array.isArray(state.chats) ? state.chats : [];
    const base = favoriteOnlyChats ? chats.filter(row => row.favorite === true) : chats;
    return base.filter(row => chatMatches(row, chatQuery));
  }
  /** 有记录的日期，从新到旧；箭头按这个列表走，不会停在空白的一天。 */
  function chatDates() {
    const dates = [];
    for (const row of chatRowsInScope()) {
      const date = String(row.date || '');
      if (date && !dates.includes(date)) dates.push(date);
    }
    return dates.sort((a, b) => b.localeCompare(a));
  }
  function setChatDayFilter(date) {chatDayFilter = date || ''; resetChatPaging(); renderChat();}
  /** dir=-1 更早，dir=1 更晚。dates 是「从新到旧」，所以更早 = 索引 +1。 */
  function stepChatDay(dir) {
    const dates = chatDates();
    if (!dates.length) return;
    if (!chatDayFilter) { if (dir < 0) setChatDayFilter(dates[0]); return; }
    const index = dates.indexOf(chatDayFilter);
    if (index < 0) {setChatDayFilter(''); return;}
    const target = index - dir;
    if (target < 0) {setChatDayFilter(''); return;}
    setChatDayFilter(dates[Math.min(target, dates.length - 1)]);
  }
  function renderChatDayBar() {
    const toggle = $('#chat-day-toggle'), prev = $('#chat-day-prev'), next = $('#chat-day-next');
    if (!toggle) return;
    const dates = chatDates();
    const index = chatDayFilter ? dates.indexOf(chatDayFilter) : -1;
    toggle.textContent = chatDayFilter ? chatDayFilter.slice(5) : '全部日期';
    toggle.setAttribute('aria-pressed', chatDayFilter ? 'true' : 'false');
    toggle.setAttribute('aria-label', chatDayFilter ? `正在看 ${chatDayFilter}，点开换一天` : '按天查看问答记录');
    if (prev) prev.disabled = !dates.length || (index === dates.length - 1);
    // 「全部日期」已经在最新一端，再往后没有更晚的了。
    if (next) next.disabled = !dates.length || index < 0;
  }
  function adoptStreamChatRow(stream, row) {
    const live = stream?.box;
    if (!live || !row) return false;
    const id = String(row.id ?? ''), question = String(row.question || ''), answerText = String(row.answer || '');
    live.className = 'meal-row list-row';
    live.setAttribute('data-long-press', `chat:${id}`);
    const head = $('.row-head', live), title = $('strong', live), answer = $('.stream-answer', live);
    if (!head || !title || !answer) return false;
    title.textContent = question;
    Array.from(head.querySelectorAll('.row-tag,.fav-badge')).forEach(tag => tag.remove());
    const addTag = text => {const tag = document.createElement('span'); tag.className = 'row-tag'; tag.textContent = text; head.appendChild(tag);};
    if (question.includes('含照片')) addTag('含照片');
    if (/联网检索|参考来源|来源（联网/.test(answerText)) addTag('联网检索');
    if (row.favorite === true) {
      const badge = document.createElement('span'); badge.className = 'fav-badge'; badge.setAttribute('aria-label', '已收藏');
      const icon = document.createElement('span'); icon.className = 'inline-icon'; icon.setAttribute('aria-hidden', 'true');
      icon.innerHTML = SVG_ICONS['icon-bookmark.svg']; badge.appendChild(icon); head.appendChild(badge);
    }
    answer.className = 'answer';
    for (const selector of ['.stream-think','.stream-status','.stream-caret']) {
      const child = $(selector, answer); if (child?.parentNode) child.parentNode.removeChild(child);
    }
    if (answerText.length > 140) {
      const toggle = document.createElement('button'); toggle.type = 'button'; toggle.className = 'row-toggle-inline';
      toggle.dataset.chatToggle = id; toggle.setAttribute('aria-expanded', 'true'); toggle.textContent = '收起';
      answer.parentNode.insertBefore(toggle, answer.nextSibling);
      expandedChats.add(id);
    }
    const sources = citationBlock(row);
    if (sources) {
      const holder = document.createElement('div'); holder.innerHTML = sources;
      while (holder.firstChild) answer.parentNode.appendChild(holder.firstChild);
    }
    stream.adopted = true;
    return true;
  }
  function renderChat() {
    const log = $('#chat-log');
    const shown = chatRowsInScope();
    const dayRows = chatDayFilter ? shown.filter(row => String(row.date || '') === chatDayFilter) : shown;
    // No inline delete here: a long press opens copy / select / favourite / delete instead, so the
    // row keeps its width for the question, its tags, the date and a readable answer preview.
    const ordered = [...dayRows].reverse();
    const visible = ordered.slice(0, chatShownCount);
    const earlier = ordered.length - visible.length;
    const groups = groupChatsByDate(visible);
    const moreButton = earlier > 0
      ? `<button type="button" class="button subtle full-width" data-chat-more>更早的记录（还有 ${earlier} 条）</button>`
      : '';
    if (log) log.innerHTML = shown.length ? groups.map(group => "<p class=\"chat-day\">" + esc(group.date) + "<span>" + group.rows.length + " 条</span></p>" + group.rows.map(row => {
      // An answer that is nothing but JSON nulls ("nullnull…") is not an answer: say what happened
      // instead of showing the raw text, even if the stored record was never repaired.
      const raw = String(row.answer || '');
      const answer = /^(?:[\s\u200b-\u200f\u2060\ufeff]*null){3,}/i.test(raw)
        ? '这次回答没有正确返回（模型只返回了思考过程，没有输出内容）。请重新提问；如果反复出现，请在「我的 → 模型连接」换一个非推理模型。'
        : raw;
      if (streamExpandedAnswer && row.question === streamExpandedAnswer.question && answer === streamExpandedAnswer.answer) {
        streamExpandedAnswer.row = row;
        return '<div class="stream-slot" aria-hidden="true"></div>';
      }
      const id = String(row.id ?? '');
      const expanded = expandedChats.has(id);
      const long = answer.length > 140;
      const tags = []
        .concat(String(row.question || '').includes('含照片') ? ['含照片'] : [])
        .concat(/联网检索|参考来源|来源（联网/.test(answer) ? ['联网检索'] : [])
        .concat(row.source === 'api' ? [] : [])
        .join('');
      // 日期只在分组标题出现一次；行内不再重复。操作收进长按菜单，行里只留「展开全文」这个
      // 读的动作，所以一屏能多看一条记录。
      return `<div class="meal-row list-row" role="listitem" data-long-press="chat:${esc(id)}"><div class="row-body">`
        + `<div class="row-head"><strong>${esc(row.question || '')}</strong>`
        + `${row.favorite === true ? `<span class="fav-badge" aria-label="已收藏"><span class="inline-icon" aria-hidden="true">${SVG_ICONS['icon-bookmark.svg']}</span></span>` : ''}`
        + `${tags ? `<span class="row-tag">${esc(tags)}</span>` : ''}`
        + `</div>`
        + `<div class="answer${long && !expanded ? ' is-clamped' : ''}">${answerHtml(answer)}</div>`
        + `${long ? `<button type="button" class="row-toggle-inline" data-chat-toggle="${esc(id)}" aria-expanded="${expanded ? 'true' : 'false'}">${expanded ? '收起' : '展开全文'}</button>` : ''}`
        + citationBlock(row)
        + `</div></div>`;
    }).join("")).join("") + moreButton : empty(chatQuery ? "没有匹配「" + chatQuery + "」的记录。" : (favoriteOnlyChats ? "还没有收藏的问答记录。长按一条记录即可收藏。" : (chatDayFilter ? chatDayFilter + " 没有问答记录。" : "还没有问答记录。有疑问时，问一句。")));
    if (log && streamExpandedAnswer?.row) {
      const slot = $('.stream-slot', log);
      if (slot && adoptStreamChatRow(streamExpandedAnswer.box, streamExpandedAnswer.row)) slot.replaceWith(streamExpandedAnswer.box.box);
      streamExpandedAnswer = null;
    }
    renderChatDayBar();
    const node = $('#chat-mode');
    if (node) {
      const base = state.settings.apiConfigured === true
        ? '已配置模型：确认上方已勾选同意即可提问；问题与部分健康数据会发送给该服务商，按 token 计费。'
        : '尚未配置 API Key：请先到「我的 → 模型连接」保存密钥；本地记录功能不受影响。';
      node.textContent = base;
    }
  }
  // ---- 上次训练建议（今天页训练卡的入口行）--------------------------------------------------------
  // 训练问答故意不写进全局问答历史（logToHistory:false），所以单独存一份，只在这里回看；
  // 这样训练卡不会再把饮食类问答当成「上次回答」。
  const LAST_TRAINING_KEY = 'qingheng.lastTrainingAdvice';
  function readLastTrainingAdvice() {
    try {
      const raw = localStorage.getItem(LAST_TRAINING_KEY);
      const saved = raw ? JSON.parse(raw) : null;
      return saved && saved.answer ? saved : null;
    } catch { return null; }
  }
  function saveLastTrainingAdvice(question, answer) {
    if (!answer) return;
    try {
      localStorage.setItem(LAST_TRAINING_KEY, JSON.stringify({
        date: localDate(), question: String(question || '').slice(0, 200),
        answer: String(answer).slice(0, 8000)
      }));
    } catch { }
  }
  /** Fills the "上次训练建议" row; stays hidden until a training question has been answered. */
  function renderLastChat() {
    const open = $('#last-chat-open');
    if (!open) return;
    const last = readLastTrainingAdvice();
    open.hidden = !last;
    if (!last) return;
    const question = $('#last-chat-question'), preview = $('#last-chat-preview');
    if (question) question.textContent = String(last.question || '（未记录问题）').slice(0, 42);
    if (preview) {
      const text = String(last.answer || '').replace(/\s+/g, ' ').trim();
      preview.textContent = text ? text.slice(0, 48) : '点开看上次训练建议的完整回答';
    }
  }
  $('#last-chat-open')?.addEventListener('click', () => {
    const last = readLastTrainingAdvice();
    const box = $('#training-advice-answer');
    if (!last || !box) return;
    box.hidden = false;
    box.innerHTML = answerHtml(last.answer);
    box.scrollIntoView({block: 'start', behavior: 'smooth'});
  });
  function renderPush(push) {
    const p = push || (window.QinghengAdapter.currentPush ? window.QinghengAdapter.currentPush() : (window.QinghengAdapter.pushDefaults || {}));
    const form = $('#push-form');
    if (form) {form.elements.enabled.checked = p.enabled === true; form.elements.analysisEnabled.checked = p.analysisEnabled === true; if (p.morningTime) form.elements.morningTime.value = p.morningTime; if (p.eveningTime) form.elements.eveningTime.value = p.eveningTime;}
    const exactButton = $('#exact-alarm-settings');
    if (exactButton) {exactButton.disabled = p.canScheduleExact === true; exactButton.textContent = p.canScheduleExact === true ? '精确闹钟已允许' : '允许精确闹钟';}
    const status = $('#push-status');
    if (status) status.textContent = p.enabled === true ? (p.analysisEnabled === true ? '已开启 · 后台自动分析' : '已开启 · 仅提醒') : '未开启';
    const detail = $('#push-detail');
    const weeklyEnabled = $('#weekly-enabled'), weeklyDay = $('#weekly-day'), weeklyTime = form?.elements?.weeklyTime;
    if (weeklyEnabled) weeklyEnabled.checked = p.weeklyEnabled !== false;
    if (weeklyDay) weeklyDay.value = String(number(p.weeklyDay) ?? 7);
    if (weeklyTime && p.weeklyTime) weeklyTime.value = p.weeklyTime;
    if (detail) detail.textContent = p.enabled !== true ? '开启后到点会收到本地通知；需要允许通知权限。' : `已设置 ${p.morningTime || '07:00'} 与 ${p.eveningTime || '20:30'}。每天最多 2 条（白天与晚间各一条），两次之间至少间隔 3 小时，不会在同一时段连发两条；周报${p.weeklyEnabled === false ? '已关闭' : `每周${['','一','二','三','四','五','六','日'][number(p.weeklyDay) ?? 7] || '日'} ${p.weeklyTime || '20:00'} 一条`}。精确时间${p.canScheduleExact ? '已就绪' : '可能被系统延迟，建议在系统设置允许「闹钟与提醒」'}；通知权限${p.notificationsGranted ? '已允许' : '未允许，请到系统设置开启'}。通知正文会自动精简到一行，展开可看全文；记录后还会有一次即时反馈（同样计入每日上限）。`;
    const summary = $('#hub-summary-push');
    if (summary) summary.textContent = p.enabled === true
      ? `${p.morningTime || '07:00'} / ${p.eveningTime || '20:30'} · ${p.analysisEnabled === true ? '后台自动分析' : '仅提醒'}`
      : '未开启 · 到点提醒与建议';
    return p;
  }
  async function loadPush() {
    try {renderPush(await api('/api/push'));}
    catch (error) {const detail = $('#push-detail'); if (detail) detail.textContent = error.message;}
  }
  let chatImage = null, chatImageVersion = 0, chatImageBusy = false;
  function clearChatImage() {lastCaptureId='';chatPhotoMeta=photoMeta(null);chatImageVersion++;chatImage=null;chatImageBusy=false;$('#chat-image').value='';$('#chat-gallery').value='';$('#chat-image-preview').hidden=true;$('#chat-image-view').removeAttribute('src');}
  $('#chat-image').addEventListener('change', async event => {
    const file = event.target.files[0], message = $('#chat-feedback');
    if (!file) {clearChatImage(); return;}
    const revision = ++chatImageVersion;
    chatImage = null; chatImageBusy = true;
    feedback(message,'正在本地压缩照片…');
    try {
      const result = await compressImage(file);
      if (revision !== chatImageVersion) return;
      chatImage = result; chatPhotoMeta=photoMeta(null); showPhotoTime('chat',chatPhotoMeta);
      $('#chat-image-view').src = result;
      $('#chat-image-preview').hidden = false;
      feedback(message,'照片已压缩为 JPEG，原始元数据不会上传。');
    } catch (error) {
      if (revision === chatImageVersion) {clearChatImage(); feedback(message,error.message,true);}
    } finally {if (revision === chatImageVersion) chatImageBusy = false;}
  });
  $('#chat-image-remove').addEventListener('click',()=>{clearChatImage();feedback($('#chat-feedback'),'已移除照片。');});
  // Tell the native layer which field opened the camera, so a recovered capture lands in the right place.
  const declareImageTarget = target => {try {const bridge = window.QinghengNative; if (bridge && typeof bridge.imageTarget === 'function') bridge.imageTarget(target);} catch {}};
  ['#meal-image','#meal-gallery'].forEach(id=>$(id).addEventListener('click',()=>declareImageTarget('meal')));
  ['#chat-image','#chat-gallery'].forEach(id=>$(id).addEventListener('click',()=>declareImageTarget('chat')));
  // The Android layer hands a capture back here when the page had to reload while the camera was open.
  window.__qinghengPendingImage = payload => {
    let parsed;
    try {parsed = typeof payload === 'string' ? JSON.parse(payload) : payload;} catch {return false;}
    if (!parsed || !['chat','meal'].includes(parsed.target) || typeof parsed.data !== 'string' || !/^data:image\/(jpeg|png|webp);base64,/.test(parsed.data)) return false;
    if (parsed.id && parsed.id === lastCaptureId) return true;
    if (parsed.target === 'chat') {
      chatImageVersion++; chatImageBusy = false; chatImage = parsed.data; chatPhotoMeta=photoMeta(parsed); showPhotoTime('chat',chatPhotoMeta);
      $('#chat-image-view').src = parsed.data; $('#chat-image-preview').hidden = false;
      switchTab('chat');
      feedback($('#chat-feedback'),'照片已就绪，已压缩并移除元数据。');
      $('#chat-image-preview').scrollIntoView({block:'nearest',behavior:'auto'});
    } else {
      syncCalendarDay(); imageVersion++; imageBusy = false; imageData = parsed.data; mealPhotoMeta=photoMeta(parsed); showPhotoTime('meal',mealPhotoMeta);
      $('#meal-image-preview').src = parsed.data; $('#image-preview').hidden = false;
      switchTab('records');
      feedback($('#estimate-feedback'),'照片已就绪，已压缩并移除元数据。确认同意后可生成估算预览。');
      $('#image-preview').scrollIntoView({block:'nearest',behavior:'auto'});
    }
    lastCaptureId = parsed.id || '';
    return true;
  };
  window.__qinghengImageError = message => notice(String(message), true);
  async function sendChat() {
    const button = $('#chat-send'), message = $('#chat-feedback'), question = $('#chat-question').value.trim();
    if (button.disabled) return;
    if (chatImageBusy) {feedback(message,'照片还在压缩，请稍等一下。',true); return;}
    if (!question && !chatImage) {feedback(message,'请先写下你的问题，或拍一张照片。',true); $('#chat-question').focus(); return;}
    if (!externalConsent()) {feedback(message,'请先到「我的 → 数据、外观与说明」开启外部模型授权。',true); return;}
    if (question.length > 2000) {feedback(message,'问题请控制在 2000 字以内。',true); return;}
    // A sentence describing finished training becomes a draft card; nothing is written until confirmed.
    if (typeof parseTrainingDraft === 'function') {
      const draft = parseTrainingDraft(question, activeDate);
      if (draft) showTrainingDraft(draft); else renderTrainingDraft(null);
    }
    if (chatImage && (state.settings.apiConfigured !== true || state.settings.visionEnabled !== true || !state.settings.visionModel)) {feedback(message,'带照片提问需要已启用的视觉模型：DeepSeek 请使用 deepseek-flash，B.AI 请填写其支持图片的模型。',true); return;}
    if (!navigator.onLine) {feedback(message,'当前离线；可先记录数据，联网后再问。',true); return;}
    syncCalendarDay();
    const submittedImage = chatImage, submittedPhotoMeta = photoMeta(chatPhotoMeta), submittedDate = activeDate;
    button.disabled = true; feedback(message, submittedImage ? '正在上传照片并思考，请稍候…' : '正在思考，请稍候…');
    let liveStream = null;
    try {
      const history = (Array.isArray(state.chats) ? state.chats : []).slice(-5).flatMap(row => [{role:'user',content:String(row.question || '').slice(0,4000)},{role:'assistant',content:String(row.answer || '').slice(0,4000)}]);
      // Routing rule: a short question with no lookup intent is answered in the fast tier.
      const deepIntent = /(检索|搜索|查一下|最新|研究|证据|为什么|原理|对比|论文|指南|训练|练了|练什么|动作|组数|体重|体脂|蛋白|热量|吃了|睡眠|数据)/.test(question);
      const tier = !submittedImage && !deepIntent && question.length <= 24 ? 'fast' : 'deep';
      const payload = {question,history,date:submittedDate,allowExternal:true,anchors:anchorSummary(),tier,library:(libraryLookup(question, 8) || librarySummary(6)),webSearch:$('#chat-web').checked && navigator.onLine && tier === 'deep',...(submittedImage?{image:submittedImage,...submittedPhotoMeta}:{})};
      let data = null;
      try {
        const streamed = await streamChat(payload);
        data = streamed.data; liveStream = streamed.box;
      } catch (streamError) {
        // Streaming is only a nicety: whatever went wrong (a provider without SSE support, a proxy that
        // buffers, a mid-stream error, a timeout), the question still gets answered through the normal
        // route. Only if that also fails does the user see an error.
        try {
          data = await api('/api/chat', payload);
          feedback(message, '流式输出不可用，已改用一次性返回…');
        } catch (bufferedError) {
          throw new Error(`${bufferedError?.message || '回答失败'}（流式尝试：${streamError?.message || '失败'}）`);
        }
      }
      const reply = typeof data?.reply === 'string' ? data.reply.trim() : '';
      if (!reply) throw new Error('模型没有返回可读取的回答，请重试。');
      const sourceUrls = Array.isArray(data?.sources) ? data.sources.map(row => row && row.url).filter(url => typeof url === 'string' && /^https:\/\//.test(url)) : [];
      const withSources = reply;
      const stored = submittedImage ? `［含照片］${question}`.slice(0,2000) : question;
      let receivedMessage = data?.webSearch
        ? (data.webSearch.connected ? '已收到回答，已联网检索（' + data.webSearch.via + '，检索词：' + (data.webSearch.query || '') + '）。' : '已收到回答，但本次未能联网检索。')
        : (tier === 'fast' ? '已收到回答（快速档：不联网、只带最近三天数据）。' : '已收到回答。');
      if (data?.webSearch?.authorityLimited) receivedMessage += ' 未找到高权威来源，具体数值请核对。';
      feedback(message, receivedMessage);
      $('#chat-question').value = ''; acceptConsent('chat'); clearChatImage();
      if (liveStream) streamExpandedAnswer={question:stored,answer:withSources,box:liveStream};
      try {await loadState({quiet:true});} catch {state.chats = [...(Array.isArray(state.chats) ? state.chats : []),{date:localDate(),question:stored,answer:withSources}]; renderChat(); notice('回答已显示，但保存到手机失败，请勿重复提问。',true);}
      if (streamExpandedAnswer) streamExpandedAnswer=null;
    } catch (error) {
      if (liveStream) endChatStream(liveStream);
      streamExpandedAnswer=null;
      feedback(message,error.message,true);
    } finally {if(liveStream)endChatStream(liveStream);button.disabled = false;}
  }
  async function savePush(form) {
    const button = $('button[type=submit]',form), message = $('#push-feedback');
    if (button.disabled || !form.reportValidity()) return;
    button.disabled = true; feedback(message,'正在保存推送设置…');
    const body = {enabled:form.elements.enabled.checked, morningTime:form.elements.morningTime.value, eveningTime:form.elements.eveningTime.value, weeklyEnabled:form.elements.weeklyEnabled.checked, weeklyDay:Number(form.elements.weeklyDay.value) || 7, weeklyTime:form.elements.weeklyTime.value, analysisEnabled:form.elements.analysisEnabled.checked};
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(body.morningTime) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(body.eveningTime)) {feedback(message,'请输入 24 小时制时间，例如 07:00 与 20:30。',true); button.disabled = false; return;}
    if (body.analysisEnabled && state.settings.apiConfigured !== true) {feedback(message,'后台自动分析需要先在「我的 → 模型连接」保存 API Key。',true); button.disabled = false; return;}
    if (body.enabled) {
      const granted = await ensureNotificationPermission();
      if (!granted) feedback(message,'已保存设置，但系统通知权限未允许：请到手机「设置 → 应用 → 轻衡 → 通知」开启，否则到点不会有提醒。',true);
      try {renderPush(await api('/api/push',body)); feedback(message, granted ? '推送设置已保存。' : '推送设置已保存，但还需要在系统设置里允许通知。', !granted);}
      catch (error) {feedback(message,error.message,true);}
      button.disabled = false; return;
    }
    try {renderPush(await api('/api/push',body)); feedback(message,'推送设置已保存。');}
    catch (error) {feedback(message,error.message,true);} finally {button.disabled = false;}
  }
  async function ensureNotificationPermission() {
    try {
      const state = await api('/api/notification-permission');
      if (state?.granted === true) return true;
      if (state?.requestable !== true) return false;
      const result = await api('/api/notification-permission',{});
      return result?.granted === true;
    } catch {return false;}
  }

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
      button.type = 'button'; button.className = 'button subtle quick-record-action'; button.id = 'quick-record';
      button.innerHTML = `<span class="quick-record-icon" aria-hidden="true">${iconMarkup('icon-copy.svg')}</span><span>快速记录</span>`;
      heading.appendChild(button);
      button.addEventListener('click', openQuickRecord);
    }
    if (!$('#quick-record-dialog')) {
      const root = document.createElement('div');
      root.className = 'app-dialog'; root.id = 'quick-record-dialog'; root.hidden = true;
      root.innerHTML = `<div class="app-dialog-panel app-dialog-panel--quick" role="dialog" aria-modal="true" aria-labelledby="quick-record-title"><h2 id="quick-record-title">快速记录</h2><form id="quick-record-form"><label>日期<input id="quick-record-date" type="date" required></label><div class="quick-type"><span class="quick-type-label">餐次</span><div class="quick-type-row" id="quick-record-type" role="radiogroup" aria-label="餐次">${QUICK_MEAL_TYPES.map(([value, label]) => `<button type="button" class="quick-type-chip" data-meal-type="${value}" role="radio" aria-checked="false">${label}</button>`).join('')}</div></div><div class="quick-source"><span class="quick-source-label">复制哪一餐</span><div class="quick-source-list" id="quick-record-source" role="radiogroup" aria-label="复制哪一餐"></div></div><label>份量比例<input id="quick-record-scale" type="number" min="0.1" max="10" step="0.1" value="1"></label><label>进餐时间<input id="quick-record-time" type="time" required></label><label>名称补充<span class="field-with-action"><input id="quick-record-text" maxlength="120" placeholder="可选，也可使用语音输入"><button type="button" class="mic-button" data-voice-target="quick" aria-label="用语音补充名称"><span class="mic-icon" aria-hidden="true"><img src="./icon-mic.svg" alt="" width="20" height="20"></span></button></span></label><p class="form-feedback" id="quick-record-feedback" role="status" aria-live="polite"></p><div class="app-dialog-actions"><button type="button" class="button subtle" id="quick-record-cancel">取消</button><button type="submit" class="button primary">保存</button></div></form></div>`;
      document.body.appendChild(root);
      $('#quick-record-cancel').addEventListener('click', () => {root.hidden = true;});
      root.addEventListener('click', event => {if (event.target === root) root.hidden = true;});
      $('#quick-record-type').addEventListener('click', event => {
        const chip = event.target.closest('[data-meal-type]');
        if (chip) setQuickRecordType(chip.dataset.mealType);
      });
      $('#quick-record-form').addEventListener('submit', submitQuickRecord);
    }
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
    const quickTypeLabel = {breakfast: '早餐', lunch: '午餐', dinner: '晚餐', snack: '加餐'};
    const quickShortName = (meal) => {
      const raw = String(meal.name || '未命名餐食').replace(/\s+/g, ' ').trim();
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
    const name = $('#quick-record-text').value.trim() || `${source.name || '未命名餐食'}（快速记录）`;
    const button = $('button[type="submit"]', event.currentTarget);
    button.disabled = true;
    try {
      const quickTime = clockPattern.test($('#quick-record-time').value) ? $('#quick-record-time').value : nowClock();
      await api('/api/meals', {date:$('#quick-record-date').value, mealType:quickRecordType, mealTime:quickTime, mealTimeSource:'manual', name, source:'quick-copy', items, ...totals, totals});
      root.hidden = true;
      await loadState({quiet:true});
      notice('快速记录已保存。');
    } catch (error) {feedback.textContent = error.message;}
    finally {button.disabled = false;}
  }
/* Fragment of assets/app.js -- assembled by tools/assemble-app.ps1 in filename order.
 * Edit this file, never the generated assets/app.js; tests/app-fragments.test.mjs fails on drift. */
  // ---- Voice input ----------------------------------------------------------------------------
  // Mainstream health apps keep the microphone inside the field and show a listening sheet with the
  // text appearing as it is recognised, plus explicit stop and cancel. The system recogniser screen
  // cannot be styled, so the app runs SpeechRecognizer itself and falls back to that screen only
  // when the platform has no in-app recogniser.
  const voice = {target:null, partial:'', active:false, retry:false, timer:null};
  const voiceBridge = () => window.QinghengNative || null;
  const voiceInputFor = target => target === 'quick' ? $('#quick-record-text') : $('#meal-text');
  function insertVoiceText(target, text) {
    const input = voiceInputFor(target), value = String(text || '').trim();
    if (!input || !value) return false;
    input.value = input.value.trim() ? `${input.value.trim()}、${value}` : value;
    input.focus();
    return true;
  }
  function setVoiceStatus(text) {const node = $('#voice-status'); if (node) node.textContent = text;}
  function voiceButton(primary) {
    const button = $('#voice-done');
    if (!button) return;
    button.textContent = primary ? '重试' : '完成';
  }
  function closeVoiceSheet() {
    const sheet = $('#voice-sheet'); if (sheet) sheet.hidden = true;
    if (voice.timer) {clearTimeout(voice.timer); voice.timer = null;}
    voice.active = false; voice.retry = false; voice.partial = '';
    const text = $('#voice-text'); if (text) text.textContent = '';
  }
  function systemVoiceFallback(bridge) {
    if (!bridge || typeof bridge.startVoiceInput !== 'function') {
      setVoiceStatus('这台设备没有可用的语音识别；可以直接输入食物与克重。');
      return;
    }
    closeVoiceSheet();
    try {bridge.startVoiceInput(voice.target || 'meal');}
    catch {notice('无法启动语音输入，可以直接输入食物与克重。', true);}
  }
  function beginListening() {
    const bridge = voiceBridge();
    if (!bridge) {setVoiceStatus('语音输入需要已安装的 APK；浏览器演示里可以直接打字。'); return;}
    setVoiceStatus('正在聆听…');
    voiceButton(false);
    $('#voice-text').textContent = '';
    // The in-app recogniser is tried first; "unavailable" comes back through the state callback
    // and hands over to the system screen, so the microphone never becomes a dead end.
    try {bridge.startVoice(voice.target || 'meal');}
    catch {systemVoiceFallback(bridge); return;}
    if (voice.timer) clearTimeout(voice.timer);
    voice.timer = setTimeout(() => {if (voice.active) setVoiceStatus('还在听…说完点「完成」，或点「取消」。');}, 12000);
  }
  function openVoiceSheet(target) {
    const sheet = $('#voice-sheet');
    if (!sheet) return;
    voice.target = target === 'quick' ? 'quick' : 'meal';
    voice.active = true; voice.partial = ''; voice.retry = false;
    sheet.hidden = false;
    beginListening();
  }
  $('#voice-cancel').addEventListener('click', () => {
    const bridge = voiceBridge();
    if (bridge && typeof bridge.cancelVoice === 'function') {try {bridge.cancelVoice();} catch {}}
    closeVoiceSheet();
  });
  $('#voice-done').addEventListener('click', () => {
    if (voice.retry) {voice.retry = false; beginListening(); return;}
    const text = voice.partial.trim();
    if (text) {insertVoiceText(voice.target, text); closeVoiceSheet(); notice('已把语音识别结果填入输入框，可再修改。'); return;}
    const bridge = voiceBridge();
    setVoiceStatus('正在识别…');
    if (bridge && typeof bridge.stopVoice === 'function') {try {bridge.stopVoice();} catch {}}
  });
  window.__qinghengVoicePartial = payload => {
    try {
      const data = typeof payload === 'string' ? JSON.parse(payload) : payload;
      const text = String(data?.text || '').trim();
      if (!text) return false;
      voice.partial = text;
      const node = $('#voice-text'); if (node) node.textContent = text;
      setVoiceStatus('正在识别…');
      return true;
    } catch {return false;}
  };
  window.__qinghengVoiceState = payload => {
    try {
      const data = typeof payload === 'string' ? JSON.parse(payload) : payload;
      const state = String(data?.state || '');
      if (state === 'listening') setVoiceStatus('正在聆听…');
      else if (state === 'ready') setVoiceStatus('请开始说，例如「米饭 100 克、鸡胸肉 150 克」。');
      else if (state === 'speaking') setVoiceStatus('听到了，继续说…');
      else if (state === 'processing') setVoiceStatus('正在识别…');
      else if (state === 'unavailable') systemVoiceFallback(voiceBridge());
      else if (state === 'empty' || state === 'error') {
        if (voice.timer) {clearTimeout(voice.timer); voice.timer = null;}
        setVoiceStatus(String(data?.message || '没有听清，可以再说一次或直接输入。'));
        voice.retry = true; voiceButton(true);
      }
      return true;
    } catch {return false;}
  };
  window.__qinghengVoiceInput = payload => {
    try {
      const data = typeof payload === 'string' ? JSON.parse(payload) : payload;
      const inserted = insertVoiceText(data?.target, data?.text);
      if (!inserted) return false;
      closeVoiceSheet();
      return true;
    } catch {return false;}
  };
  // One delegated handler covers the static mic buttons and anything built later.
  document.addEventListener('click', event => {
    const button = event.target.closest('[data-voice-target]');
    if (!button || button.disabled) return;
    openVoiceSheet(button.dataset.voiceTarget);
  });
  function installHealthConnectControls() {
    const row = $('#export-data')?.parentElement;
    if (!row || $('#health-connect-sync')) return;
    const sync = document.createElement('button');
    sync.type = 'button'; sync.className = 'button subtle'; sync.id = 'health-connect-sync'; sync.textContent = '同步手表数据';
    const settings = document.createElement('button');
    settings.type = 'button'; settings.className = 'button subtle'; settings.id = 'health-connect-settings'; settings.textContent = 'Health Connect 权限';
    row.prepend(settings); row.prepend(sync);
    settings.addEventListener('click', () => {
      const bridge = window.QinghengNative;
      if (bridge && typeof bridge.openHealthConnectSettings === 'function') bridge.openHealthConnectSettings();
      else notice('Health Connect 权限设置需要已安装的 APK。', true);
    });
    const typeNames = {steps:'步数', sleep:'睡眠', exercise:'运动', activeCalories:'活动热量', distance:'距离'};
    const countText = counts => Object.keys(typeNames)
      .filter(key => counts && Number(counts[key]) > 0)
      .map(key => `${typeNames[key]} ${Number(counts[key])}`).join('、');
    sync.addEventListener('click', async event => {
      const button = event.currentTarget, message = $('#data-feedback');
      button.disabled = true;
      try {
        // Health Connect read permission is a user decision: ask for it here instead of sending the
        // user to a settings screen and leaving the sync button as a dead end.
        const status = await api('/api/health-connect/status');
        if (status?.permissionsGranted !== true) {
          const bridge = window.QinghengNative;
          if (!bridge || typeof bridge.requestHealthConnectPermissions !== 'function') {
            feedback(message, '手表数据读取需要已安装的 APK。', true);
            return;
          }
          feedback(message, '正在请求健康数据读取权限，请在系统弹窗中允许…');
          // The native side decides between the framework request and Health Connect's own screen;
          // without this call the promise below would wait for an answer nobody asked for.
          try {bridge.requestHealthConnectPermissions();}
          catch {feedback(message, '无法发起健康数据授权请求。', true); return;}
          const answer = await waitHealthResult();
          if (answer?.granted !== true) {
            feedback(message, `仍未获得授权：${answer?.message || '需要睡眠、步数、运动、活动热量与距离的读取权限'}。`
              + '如果 Health Connect 的「应用权限」里根本没有列出轻衡，说明系统没有把这个侧载安装识别为健康数据应用：'
              + '可先打开「Health Connect 权限」查看列表，或改用应用商店安装的版本；手表数据本身仍可在小米运动健康里查看。', true);
            return;
          }
        }
        feedback(message, '正在同步手表数据…');
        const result = await api('/api/health-connect/sync', {days:30});
        if (result?.permissionsGranted !== true) {
          feedback(message, `未能读取：${result?.reason || '权限不足'}。`, true);
          return;
        }
        await loadState({quiet:true});
        const total = Number(result.count || 0), detail = countText(result.counts);
        if (total === 0) {
          feedback(message, '权限已就绪，但最近 30 天 Health Connect 里没有这五类记录。请确认小米运动健康已开启向 Health Connect 写入（小米运动健康 → 我的 → 设置 → 第三方数据/Health Connect），并戴着手表同步过一次。', true);
          return;
        }
        feedback(message, `已同步 ${total} 条手表记录到手机${detail ? `（${detail}）` : ''}。`);
      } catch (error) {feedback(message, error.message, true);}
      finally {button.disabled = false;}
    });
  }
  /** Resolves with the native answer to the Health Connect permission prompt. */
  function waitHealthResult(timeoutMs = 120000) {
    return new Promise(resolve => {
      let done = false;
      const finish = value => {if (done) return; done = true; window.__qinghengHealthResult = previous; resolve(value);};
      const previous = window.__qinghengHealthResult;
      window.__qinghengHealthResult = payload => {
        try {finish(typeof payload === 'string' ? JSON.parse(payload) : payload);}
        catch {finish(null);}
        return true;
      };
      setTimeout(() => finish(null), timeoutMs);
    });
  }
  function setupCollapsibleSections() {
    const specs = [
      {anchor:'#food-search', collapsed:true},
      {anchor:'#manual-meal-form', collapsed:true},
      {anchor:'#settings-form', collapsed:true},
      {anchor:'#push-history', collapsed:true},
      {anchor:'#export-data', collapsed:true}
    ];
    specs.forEach((spec, index) => {
      const anchor = $(spec.anchor), card = anchor?.closest('.card');
      if (!card || card.dataset.collapsibleReady === 'true') return;
      let heading = card.querySelector(':scope > .card-heading');
      if (!heading) {
        const title = card.querySelector(':scope > h2');
        if (!title) return;
        heading = document.createElement('div');
        heading.className = 'card-heading collapse-heading-row';
        card.insertBefore(heading, title);
        heading.appendChild(title);
      }
      const body = document.createElement('div');
      body.className = 'collapsible-body';
      body.id = `collapsible-body-${index}`;
      while (heading.nextSibling) body.appendChild(heading.nextSibling);
      card.appendChild(body);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'collapse-toggle';
      button.dataset.collapseTarget = body.id;
      const label = heading.querySelector('h2,h3')?.textContent.trim() || '这部分';
      const storageKey = `qingheng.collapse.${body.id}`;
      let collapsed = spec.collapsed;
      try {const saved = localStorage.getItem(storageKey); if (saved === '1' || saved === '0') collapsed = saved === '1';} catch {}
      button.setAttribute('aria-expanded', String(!collapsed));
      button.title = collapsed ? `展开${label}` : `收起${label}`;
      button.setAttribute('aria-label', button.title);
      button.innerHTML = `<span class="collapse-icon" aria-hidden="true">${collapsed ? '▾' : '▴'}</span>`;
      heading.appendChild(button);
      body.hidden = collapsed;
      button.addEventListener('click', () => {
        body.hidden = !body.hidden;
        const expanded = !body.hidden;
        button.setAttribute('aria-expanded', String(expanded));
        button.title = expanded ? `收起${label}` : `展开${label}`;
        button.setAttribute('aria-label', button.title);
        button.querySelector('.collapse-icon').textContent = expanded ? '▴' : '▾';
        try {localStorage.setItem(storageKey, body.hidden ? '1' : '0');} catch {}
      });
      card.dataset.collapsibleReady = 'true';
    });
  }
  /**
   * Intake 口径 (defaults mirror D:\AI\health\rules.md and are editable in the profile form).
   * Every number the app hands back is derived from these, so the app and the written rules can
   * never drift apart silently.
   */
/* Fragment of assets/app.js -- assembled by tools/assemble-app.ps1 in filename order.
 * Edit this file, never the generated assets/app.js; tests/app-fragments.test.mjs fails on drift. */
  const TARGET_RULES = {
    deficitCapPercent: 20,    // 缺口不超过维持热量的 20%
    fatFloorG: 50,            // 脂肪下限：低于此影响激素水平
    fatIdealMinG: 55,
    fatIdealMaxG: 70,
    trainingDayMin: 2150,     // 未测算时的占位区间，不再充当任何目标的固定地板
    trainingDayMax: 2350,
    restDayMin: 2000,
    restDayMax: 2150
  };
  /**
   * Goal presets: the deficit each goal plans (negative = surplus) and the protein band it needs.
   * 蛋白带由目标直接决定；缺口上限仍是唯一硬约束，不再有 2000 kcal 的统一地板。
   */
  const GOAL_PRESETS = {
    gain:     {deficitPercent: -8, proteinPerKgMin: 2.0, proteinPerKgMax: 2.2},
    recomp:   {deficitPercent: 8,  proteinPerKgMin: 2.0, proteinPerKgMax: 2.2},
    cut:      {deficitPercent: 18, proteinPerKgMin: 2.3, proteinPerKgMax: 2.5},
    maintain: {deficitPercent: 0,  proteinPerKgMin: 1.6, proteinPerKgMax: 2.0},
    lean:     {deficitPercent: 12, proteinPerKgMin: 2.2, proteinPerKgMax: 2.4}
  };
  // 只有这四个仍允许口径覆盖；训练日/休息日区间永远由目标预设算，避免第二套口径。
  const RULE_KEYS = ['deficitCapPercent', 'fatFloorG', 'fatIdealMinG', 'fatIdealMaxG'];
  /** 每周训练天数只认「记录→训练计划」的偏好；老档案里的 training 仅作兜底。 */
  function plannedSessions() {
    try {
      const raw = localStorage.getItem("qingheng.planPrefs");
      const prefs = raw ? JSON.parse(raw) : null;
      const days = number(prefs && prefs.days);
      if (days !== null && days > 0) return days;
    } catch { }
    const legacy = number(state && state.profile ? state.profile.training : null);
    return legacy !== null && legacy > 0 ? legacy : null;
  }

  /** Weekly strength sessions -> activity factor. Unset is NOT the same as sedentary. */
  function activityFactorFor(sessions) {
    const s = Number(sessions);
    if (!Number.isFinite(s) || s <= 0) return 1.2;
    return s >= 6 ? 1.725 : s >= 4 ? 1.55 : s >= 2 ? 1.375 : 1.2;
  }
  function targetRules(overrides) {
    const rules = {...TARGET_RULES};
    for (const key of RULE_KEYS) {
      const value = number(overrides && overrides[key]);
      if (value !== null && value > 0) rules[key] = value;
    }
    return rules;
  }
  /**
   * Mifflin-St Jeor BMR -> activity TDEE -> intake ranges straight from the user's own 口径.
   *
   * Two things this deliberately does NOT do: pick a silent default for a missing age, or treat an
   * unanswered training frequency as sedentary. Missing input is reported instead of guessed, and an
   * unset training frequency yields a provisional result that says which factor it assumed.
   */
  function computeTargets(input) {
    const {sex = '', weight, height, age, goal = ''} = input;
    const rules = targetRules(input.rules);
    const w = number(weight), h = number(height), a = number(age);
    const missing = [];
    if (!(w > 0)) missing.push('体重');
    if (!(h > 0)) missing.push('身高');
    if (!(a > 0)) missing.push('年龄');
    if (missing.length) {
      return {
        incomplete: true, missing, goal: goal,
        lines: [`还缺 ${missing.join('、')}，补齐后才能测算目标（不猜默认值）。`]
      };
    }
    const rawTraining = input.training;
    // "不健身" is an answer, not a missing value: it means sedentary, and it must not be called unset.
    const trainingOff = String(rawTraining) === 'none';
    const trainingUnset = !trainingOff && (rawTraining === null || rawTraining === undefined || rawTraining === '');
    const sessions = trainingUnset || trainingOff ? 0 : Number(rawTraining);
    const factor = activityFactorFor(sessions);
    const bmr = Math.round(10 * w + 6.25 * h - 5 * a + (sex === 'female' ? -161 : 5));
    const tdee = Math.round(bmr * factor);
    // 2000 kcal 的统一地板已删除：区间只由目标预设、缺口上限与用户自定义区间决定。
    if (!GOAL_PRESETS[goal]) { return { incomplete: true, missing: [...missing, '饮食目标'], lines: ['还缺 饮食目标，补齐后才能测算目标（不猜默认值）。'] }; }
    const preset = GOAL_PRESETS[goal];
    const cap = rules.deficitCapPercent;
    const deficitOf = value => Math.round((tdee - value) / tdee * 1000) / 10;

    let trainingDay = {min: rules.trainingDayMin, max: rules.trainingDayMax};
    let restDay = {min: rules.restDayMin, max: rules.restDayMax};
    let leanPlan = null;
    if (goal === 'lean') {
      // 薄肌走碳循环：训练日贴近维持，缺口放在休息日。
      const centre = tdee * (1 - Math.min(preset.deficitPercent, cap) / 100);
      const trainMid = Math.round(centre * 1.03);
      const restMid = Math.round(centre * 0.96);
      trainingDay = {min: Math.round(trainMid * 0.98), max: Math.round(trainMid * 1.05)};
      restDay = {min: Math.round(restMid * 0.97), max: Math.round(restMid * 1.02)};
      leanPlan = {plannedPercent: preset.deficitPercent};
    }
    // non-lean goal ranges：区间只按目标预设算，不再接受手填的日区间覆盖。
    if (goal !== 'lean') {
      const gap = goal === 'gain' ? -8 : preset.deficitPercent;
      const centre = Math.round(tdee * (1 - Math.min(gap, cap) / 100));
      trainingDay = {min: Math.round(centre * 0.98), max: Math.round(centre * 1.04)};
      restDay = {min: Math.round(centre * 0.95), max: Math.round(centre * 1.01)};
    }
    const proteinPerKgMin = preset.proteinPerKgMin;
    const proteinPerKgMax = preset.proteinPerKgMax;
    const proteinMin = Math.round(w * proteinPerKgMin);
    const proteinMax = Math.round(w * proteinPerKgMax);
    const proteinMid = Math.round(w * (proteinPerKgMin + proteinPerKgMax) / 2);
    const fatMin = Math.round(Math.max(rules.fatFloorG, rules.fatIdealMinG));
    const fatMax = Math.round(Math.max(fatMin, rules.fatIdealMaxG));
    const fatMid = Math.round((fatMin + fatMax) / 2);
    const budget = trainingDay.max;
    const carbs = Math.max(0, Math.round((budget - proteinMid * 4 - fatMid * 9) / 4));
    const trainingDeficit = deficitOf(trainingDay.max);
    const restDeficit = deficitOf(restDay.max);
    // 周均与预期速率按区间中值算：薄肌的「有效缺口」与周均不再出现两个口径。
    const weeklyAverage = Math.round((((trainingDay.min + trainingDay.max) / 2) * 4 + ((restDay.min + restDay.max) / 2) * 3) / 7);
    const weeklyAverageDeficit = deficitOf(weeklyAverage);
    if (leanPlan) {
      leanPlan.effectivePercent = Math.max(0, weeklyAverageDeficit);
      leanPlan.weeklyLoss = Math.round(leanPlan.effectivePercent / 100 * tdee * 7 / 7700 * 100) / 100;
      leanPlan.lossRatePercent = w > 0 ? Math.round(leanPlan.weeklyLoss / w * 1000) / 10 : null;
      leanPlan.fatPerMonth = Math.round(leanPlan.weeklyLoss * 4.3 * 10) / 10;
    }
    const warnings = [];
    // 不再把低目标抬到 2000：低于常见安全区间只提示，不改用户的目标数字。
    const safety = sex === 'female' ? 1200 : 1500;
    if (trainingDay.max < safety) warnings.push(`训练日目标上限 ${trainingDay.max} kcal 低于常见安全下限 ${safety} kcal：请复核体重、目标与缺口；App 不再自动抬到 2000`);
    if (trainingDeficit > cap) warnings.push(`训练日缺口 ${trainingDeficit}% 超过口径上限 ${cap}%；要么降目标，要么把缺口上限调高并说明理由`);
    if (restDeficit > cap) warnings.push(`休息日缺口 ${restDeficit}% 超过口径上限 ${cap}%`);
    if (trainingDeficit < 0) warnings.push(`训练日目标上限比维持热量高 ${Math.abs(trainingDeficit)}%（盈余）`);
    if (goal === 'cut' && trainingDeficit <= 0) warnings.push('目标是减脂，但当前区间不低于维持热量，减脂期不会有效果');
    if (goal === 'gain' && trainingDeficit > 10) warnings.push('目标是增肌，但当前缺口偏大，增肌原料可能不足');
    if (fatMin < 40) warnings.push('脂肪下限低于 40 g 会影响激素水平（口径：≥ 50 g，理想 55~70 g）');
    if (trainingUnset) warnings.push('还没有训练计划：暂按久坐（系数 1.2）估算；到「记录→训练计划」保存每周天数后重新测算更准');
    if (leanPlan) {
      if (leanPlan.effectivePercent < 8) warnings.push(`有效缺口只有 ${leanPlan.effectivePercent}%，线条变化会很慢（每月约 -${leanPlan.fatPerMonth} kg 脂肪）；可以延长周期或提高维持热量`);
      if (leanPlan.lossRatePercent !== null && leanPlan.lossRatePercent > 0.7) warnings.push(`每周减重 ${leanPlan.lossRatePercent}% 体重，超过保肌的安全上限 0.5~0.7%/周；薄肌要慢，快减必掉肌肉`);
    }
    const lines = [
      `维持热量（TDEE）：约 ${tdee} kcal／天（基础代谢 ${bmr} × 活动系数 ${factor}${trainingOff ? '（不健身）' : trainingUnset ? '（没有训练计划，按久坐）' : `，按每周 ${sessions} 次训练`}）`,
      `目标摄入：训练日 ${trainingDay.min}~${trainingDay.max} kcal／天；休息日 ${restDay.min}~${restDay.max} kcal／天（周均 ${weeklyAverage}，相当于缺口 ${weeklyAverageDeficit}%）`,
      `与维持热量相比：训练日缺口 ${trainingDeficit}%，休息日缺口 ${restDeficit}%（口径：缺口 ≤ 维持的 ${cap}%）`,
      `蛋白质：${proteinMin}~${proteinMax} g（${proteinPerKgMin}~${proteinPerKgMax} g/kg，按目标）· 脂肪：${fatMin}~${fatMax} g（不低于 ${rules.fatFloorG} g）`,
      `碳水：约 ${carbs} g（按训练日上限 ${budget} kcal 推算剩余热量）`
    ];
    if (leanPlan) {
      // 提高维持热量是唯一不碰口径的加速杠杆。
      const altFactor = activityFactorFor(4);
      const altTdee = Math.round(bmr * altFactor);
      const altTarget = Math.round(altTdee * (1 - Math.min(preset.deficitPercent, cap) / 100));
      lines.push(
        `训练频率杠杆：3 次/周（系数 ${activityFactorFor(3)}）→ 维持 ${Math.round(bmr * activityFactorFor(3))}；4 次/周（系数 ${altFactor}）→ 维持约 ${altTdee}，12% 缺口目标约 ${altTarget} kcal`
      );
      lines.push(
        `薄肌（线条）路径：计划缺口 ${leanPlan.plannedPercent}%，实际按 ${leanPlan.effectivePercent}% 执行 → 预计每周 -${leanPlan.weeklyLoss} kg（约 ${leanPlan.fatPerMonth} kg 脂肪/月，占体重 ${leanPlan.lossRatePercent}%）`,
        `体脂跑道：媒体常给男性 10~15% 可见腹肌，但缺少可靠实证阈值（受脂肪分布、腹肌厚度、光线与水合影响），只当参考；按当前速度每减 1 kg 脂肪约 ${leanPlan.weeklyLoss > 0 ? Math.round(1 / leanPlan.weeklyLoss) : '—'} 周，2 kg 约 ${leanPlan.weeklyLoss > 0 ? Math.round(2 / leanPlan.weeklyLoss) : '—'} 周`
      );
    }
    return {
      incomplete: false, goal, rules, preset,
      bmr, factor, tdee, sessions, trainingUnset,
      trainingDay, restDay, cap,
      proteinMin, proteinMax, proteinMid, proteinPerKgMin, proteinPerKgMax,
      fatMin, fatMax, fatMid, carbs, budget,
      trainingDeficit, restDeficit, weeklyAverage, weeklyAverageDeficit,
      // 1 kg of fat is ~7700 kcal, so the weekly gap converts to a rate the trend can grade against.
      expectedWeeklyKg: Math.round(((tdee - weeklyAverage) * 7 / 7700) * 100) / 100,
      leanPlan,
      warnings,
      provisional: trainingUnset,
      trainingOff,
      lines
    };
  }
  const GOAL_LABEL = {gain: '增肌', cut: '减脂', recomp: '增肌同时减脂', maintain: '保持身材', lean: '薄肌（线条）'};
  /** 每个目标的实际口径：缺口/盈余、蛋白带与节奏，和 computeTargets 使用同一组数字。 */
  const GOAL_HINTS = {
    gain: '热量比维持高 8%，蛋白 2.0~2.2 g/kg；体重常见 +0.25~0.5%/周，涨秤会带一点脂肪。',
    recomp: '小幅缺口 8%，蛋白 2.0~2.2 g/kg；体重可能缓降或不动，围度变化更慢。',
    cut: '缺口 18%，蛋白 2.3~2.5 g/kg；常见 −0.4~0.7%/周，降太快容易掉肌肉。',
    lean: '缺口 12% 碳循环：训练日接近维持、休息日吃缺口；蛋白 2.2~2.4 g/kg，8~12 周一阶段。',
    maintain: '按维持热量吃，蛋白 1.6~2.0 g/kg；体重目标稳定在 ±0.2%/周。'
  };
  /** Onboarding values -> computeTargets input. 训练天数统一取「记录→训练计划」的偏好。 */
  function targetInputFrom(values) {
    return {
      sex: values.sex,
      weight: values.weight,
      height: values.height,
      age: values.age,
      goal: values.goal,
      training: plannedSessions(),
      rules: values.rules
    };
  }
  function latestWeight() {
    const rows = (state.measurements || []).filter(row => number(row.weight) !== null && validDate(row.date)).sort((a, b) => a.date.localeCompare(b.date));
    return rows.length ? rows[rows.length - 1].weight : null;
  }
  /** Reads the 口径 overrides currently typed into the profile form. */
  function ruleOverridesFrom(form) {
    const rules = {};
    for (const key of RULE_KEYS) {
      const field = form.elements[key];
      if (!field) continue;
      const value = number(field.value);
      if (value !== null && value > 0) rules[key] = value;
    }
    return rules;
  }
  /** Reads the profile form into the raw input computeTargets expects (no silent defaults). */
  function profileTargetInput(form, options = {}) {
    const weightField = number(form.elements.weight.value);
    return {
      sex: form.elements.sex.value,
      height: form.elements.height.value,
      weight: weightField !== null ? weightField : latestWeight(),
      age: form.elements.age.value,
      goal: form.elements.goal.value,
      training: plannedSessions(),
      rules: ruleOverridesFrom(form)
    };
  }
  /**
   * Real maintenance calories from the user's own log: mean intake minus the energy implied by the
   * weight change over the same window. This is the only maintenance number that is not an estimate.
   *
   * Deliberately works on dates that actually have records (no "today minus N days" arithmetic), so a
   * timezone or a gap in logging cannot silently shift the window.
   */
  function calibratedTdee(maxDays = 21) {
    const meals = Array.isArray(state.meals) ? state.meals : [];
    const byDay = new Map();
    for (const meal of meals) {
      const date = String(meal.date || '');
      if (!validDate(date)) continue;
      const kcal = number(meal.calories);
      if (kcal === null) continue;
      byDay.set(date, (byDay.get(date) || 0) + kcal);
    }
    const intakeDays = [...byDay.keys()].sort().slice(-maxDays);
    if (intakeDays.length < 14) {
      return {ok: false, reason: `有热量的记录只有 ${intakeDays.length} 天，至少需要 14 天`};
    }
    const from = intakeDays[0], to = intakeDays[intakeDays.length - 1];
    const points = (Array.isArray(state.measurements) ? state.measurements : [])
      .filter(row => validDate(String(row.date)) && number(row.weight) !== null && String(row.date) >= from && String(row.date) <= to)
      .map(row => ({date: String(row.date), weight: number(row.weight)}))
      .sort((a, b) => a.date.localeCompare(b.date));
    if (points.length < 2) {
      return {ok: false, reason: `窗口内只有 ${points.length} 次体重记录，至少需要 2 次`};
    }
    const spanDays = Math.max(1, Math.round((Date.parse(points[points.length - 1].date) - Date.parse(points[0].date)) / 86400000));
    const deltaKg = points[points.length - 1].weight - points[0].weight;
    const meanIntake = [...byDay.entries()].filter(([date]) => date >= from && date <= to).reduce((sum, [, kcal]) => sum + kcal, 0) / intakeDays.length;
    const tdee = Math.round(meanIntake - deltaKg * 7700 / spanDays);
    return {
      ok: true,
      tdee,
      meanIntake: Math.round(meanIntake),
      deltaKg: Math.round(deltaKg * 10) / 10,
      spanDays,
      days: intakeDays.length,
      from, to
    };
  }
  /**
   * 薄肌 is an 8~12 week block, not a permanent setting. The start date is stamped when the goal is
   * saved, and the plan says which week it is and when to review.
   */
  function leanPhase(goal, startedAt) {
    if (goal !== 'lean') return null;
    const start = validDate(String(startedAt || '')) ? String(startedAt) : '';
    if (!start) return {weeks: 0, start: null, due: false, text: '薄肌是 8~12 周一个阶段：保存档案后开始计时。'};
    const days = Math.max(0, Math.round((Date.parse(localDate()) - Date.parse(start)) / 86400000));
    const weeks = Math.floor(days / 7) + 1;
    return {
      weeks, start, due: weeks >= 8,
      text: weeks >= 8
        ? `薄肌阶段第 ${weeks} 周（起点 ${start}），已满 8 周：用实测维持热量重算，并考虑安排 1~2 周维持或换阶段`
        : `薄肌阶段第 ${weeks} 周（起点 ${start}），第 8~12 周复盘`
    };
  }
  /** Writes computed targets back into the profile form and reports the basis. */
  async function recalcProfileTargets(options = {}) {
    const form = $('#profile-form');
    const status = $('#profile-target-status');
    const input = profileTargetInput(form, options);
    const result = computeTargets(input);
    if (result.incomplete) {
      status.className = 'target-status empty';
      status.textContent = result.lines.join('\n');
      return result;
    }
    // The saved number is the rest-day ceiling; the training-day range is shown alongside it so a
    // single figure is never mistaken for "the" target.
    form.elements.calorieTarget.value = result.trainingDay.max;
    form.elements.referenceCalories.value = result.tdee;
    form.elements.proteinMin.value = result.proteinMin;
    form.elements.proteinMax.value = result.proteinMax;
    form.elements.fatMin.value = result.fatMin;
    form.elements.fatMax.value = result.fatMax;
    // The formula TDEE is a starting point; the log-derived one is what the plan should trust.
    const calibration = calibratedTdee();
    const calibrationLine = calibration.ok
      ? `实测维持热量：约 ${calibration.tdee} kcal（${calibration.days} 天记录，平均摄入 ${calibration.meanIntake}，${calibration.spanDays} 天体重变化 ${calibration.deltaKg} kg）`
        + (Math.abs(calibration.tdee - result.tdee) >= 120 ? `；与公式值 ${result.tdee} 相差 ${calibration.tdee - result.tdee > 0 ? '+' : ''}${calibration.tdee - result.tdee} kcal，以实测为准` : '；与公式值一致')
      : `还测不出实测维持热量：${calibration.reason}（记录满 2~3 周再回来看）`;
    status.className = 'target-status';
    const phase = leanPhase(result.goal, state.profile && state.profile.leanPhaseStartedAt);
    status.textContent = [options.auto ? '已按当前选择自动重算（未保存，点「保存档案」生效）：' : '已按「' + (GOAL_LABEL[result.goal] || '增肌同时减脂') + '」与你的口径测算：']
      .concat(result.lines)
      .concat(phase ? [phase.text] : [])
      .concat([calibrationLine])
      .concat(result.warnings.map(text => '⚠ ' + text))
      .concat(['这是起点而非结论，用 2~4 周真实记录校准更可靠。'])
      .join('\n');
    // Weight doubles as the first measurement so the trend chart has a starting point.
    if (options.saveMeasurement !== false && number(input.weight) !== null) {
      const today = localDate();
      const exists = (state.measurements || []).some(row => row.date === today && number(row.weight) !== null);
      if (!exists) {
        try {await api('/api/measurements', {date: today, weight: number(input.weight)});}
        catch {notice('目标已测算，但体重起始记录保存失败；可稍后手动补记。', true);}
      }
    }
    return result;
  }
  /**
   * Changing weekly training frequency (or the goal) changes TDEE, so every derived target is
   * recalculated at once: calorie ranges, protein, fat, carbs and the weekly average. Nothing is
   * written until 保存档案, and the status line says so.
   */
  function installProfileAutoRecalc() {
    const form = $('#profile-form');
    if (!form) return;
    const fields = ['goal', 'weight', 'height', 'age'];
    form.addEventListener('change', event => {
      const name = event.target && event.target.name;
      if (!fields.includes(name)) return;
      recalcProfileTargets({saveMeasurement: false, auto: true}).catch(() => {});
    });
  }
  async function persistProfile(extra) {
    const form = $('#profile-form');
    const goal = form.elements.goal.value;
    // 区间随档案一起落库，原生层的问答/推送上下文才能拿到同一套目标。
    const plan = computeTargets(profileTargetInput(form));
    const payload = {
      sex: form.elements.sex.value,
      height: number(form.elements.height.value),
      age: number(form.elements.age.value),
      goal,
      // Stamping the start date here is what makes the 8~12 week review possible at all.
      ...(goal === 'lean' && !(state.profile && state.profile.leanPhaseStartedAt) ? {leanPhaseStartedAt: localDate()} : {}),
      training: plannedSessions(),
      ...(plan && !plan.incomplete ? {
        trainingDayMin: plan.trainingDay.min, trainingDayMax: plan.trainingDay.max,
        restDayMin: plan.restDay.min, restDayMax: plan.restDay.max
      } : {}),
      ...ruleOverridesFrom(form),
      ...extra
    };
    for (const key of ['calorieTarget', 'referenceCalories', 'proteinMin', 'proteinMax', 'fatMin', 'fatMax']) {
      const value = number(form.elements[key].value);
      if (value !== null) payload[key] = value;
    }
    return api('/api/profile', payload);
  }
/* Fragment of assets/app.js -- assembled by tools/assemble-app.ps1 in filename order.
 * Edit this file, never the generated assets/app.js; tests/app-fragments.test.mjs fails on drift. */
  const onboarding = {step: 1, total: 4, done: false, result: null, saving: false};
  function onboardingStep(step) {
    const started = (window.performance && performance.now ? performance.now() : Date.now());
    onboarding.step = Math.min(onboarding.total, Math.max(1, step));
    $$('.onboarding-step').forEach(node => {node.hidden = Number(node.dataset.step) !== onboarding.step;});
    $$('#onboarding-dots .step-dot').forEach(dot => dot.classList.toggle('done', Number(dot.dataset.step) <= onboarding.step));
    $('#ob-back').hidden = onboarding.step === 1;
    $('#ob-next').hidden = onboarding.step === onboarding.total;
    $('#ob-finish').hidden = onboarding.step !== onboarding.total;
    const spent = ((window.performance && performance.now ? performance.now() : Date.now()) - started);
    (window.__perfLog = window.__perfLog || []).push({label: 'onboardingStep', step: onboarding.step, ms: Math.round(spent)});
    console.info('[ob] step', onboarding.step, 'in', Math.round(spent), 'ms');
  }
  function showOnboarding(show) {
    const node = $('#onboarding');
    if (!node) return;
    node.hidden = !show;
    document.body.style.overflow = show ? 'hidden' : '';
    if (show) onboardingStep(1);
  }
  function obValues() {
    const g = name => {const checked = document.querySelector(`#ob-goals input[name=${name}]:checked`); return checked ? checked.value : '';};
    return {
      sex: $('#ob-sex').value,
      height: number($('#ob-height').value),
      weight: number($('#ob-weight').value),
      age: number($('#ob-age').value),
      goal: g('goal'),
      training: plannedSessions()
    };
  }
  function paintGoalHints() {
    const form = $('#profile-form');
    const goal = form ? form.elements.goal.value : '';
    const profileHint = $('#profile-goal-hint');
    if (profileHint) profileHint.textContent = GOAL_HINTS[goal] || '选择一个饮食目标后，这里会说明热量与蛋白口径。';
    const checked = document.querySelector('#ob-goals input[name=goal]:checked');
    const obHint = $('#ob-goal-hint');
    if (obHint) obHint.textContent = checked ? (GOAL_HINTS[checked.value] || '') : '五个目标的缺口、蛋白带与节奏都不一样；选一个再测算。';
  }
  function obSyncTargets() {
    const values = obValues();
    paintGoalHints();
    const node = $('#ob-result');
    // 不预选目标：没有明确选择前，这里只提示，不偷偷按某个默认目标测算。
    if (!document.querySelector('#ob-goals input[name=goal]:checked')) {
      onboarding.result = null;
      node.className = 'target-status empty';
      node.textContent = '选择一个饮食目标后，这里会按你的口径给出测算结果。';
      return null;
    }
    const result = computeTargets(targetInputFrom(values));
    onboarding.result = result;
    if (result.incomplete) {
      node.className = 'target-status empty';
      node.textContent = result.lines.join('\n');
      return result;
    }
    node.className = 'target-status';
    node.textContent = ['按「' + (GOAL_LABEL[result.goal] || '') + '」与你的口径测算：'].concat(result.lines)
      .concat(result.warnings.map(text => '⚠ ' + text)).join('\n');
    return result;
  }
  function obNext() {
    const message = $('#ob-feedback');
    if (onboarding.step === 1) {
      const v = obValues();
      // 校验只做行内提示（markFieldInvalid + aria），不再往底部状态行重复同一句话。
      if (!v.sex) {markFieldInvalid($('#ob-sex'), '请选择性别，用于测算基础代谢。'); $('#ob-sex').focus(); return;}
      if (!(v.height > 0)) {markFieldInvalid($('#ob-height'), '请填写身高，例如 166。'); $('#ob-height').focus(); return;}
      if (!(v.weight > 0)) {markFieldInvalid($('#ob-weight'), '请填写当前体重，例如 64.3。'); $('#ob-weight').focus(); return;}
      // Age is required: guessing it silently changes the whole target.
      if (!(v.age > 0)) {markFieldInvalid($('#ob-age'), '请填写年龄，测算热量需要它（不会用默认值代替）。'); $('#ob-age').focus(); return;}
    }
    if (onboarding.step === 2 && !document.querySelector('#ob-goals input[name=goal]:checked')) {feedback(message, '请先选择饮食目标。', true); return;}
    if (onboarding.step === 2 && (!onboarding.result || onboarding.result.incomplete)) {feedback(message, '请先补齐基本信息，再选择饮食目标。', true); return;}
    feedback(message, '');
    onboardingStep(onboarding.step + 1);
    if (onboarding.step === 2) obSyncTargets();
    // Show step 4 first, then do the checks: a slow native route must not hold the transition.
    if (onboarding.step === 4) setTimeout(() => refreshPermissionChecklist().catch(() => {}), 30);
    if (onboarding.step === 3) {
      const provider = $('#ob-provider').value;
      const defaults = (window.QinghengAdapter.defaults || {})[provider] || {};
      const current = (state.settings.providers || {})[provider] || {};
      if (!$('#ob-baseurl').value) $('#ob-baseurl').value = current.baseUrl || defaults.baseUrl || '';
      if (!$('#ob-model').value) $('#ob-model').value = current.model || defaults.model || '';
    }
  }
  async function obFinish() {
    if (onboarding.saving) return;
    const message = $('#ob-feedback');
    const values = obValues();
    const result = onboarding.result || computeTargets(targetInputFrom(values));
    if (result.incomplete) {feedback(message, result.lines.join(' '), true); return;}
    onboarding.saving = true;
    $('#ob-finish').disabled = true;
    feedback(message, '正在保存并测算…');
    try {
      $('#profile-form').elements.sex.value = values.sex || '';
      $('#profile-form').elements.height.value = values.height;
      $('#profile-form').elements.age.value = values.age ?? '';
      $('#profile-form').elements.goal.value = values.goal;
      $('#profile-form').elements.weight.value = values.weight;
      $('#profile-form').elements.calorieTarget.value = result.trainingDay.max;
      $('#profile-form').elements.referenceCalories.value = result.tdee;
      $('#profile-form').elements.proteinMin.value = result.proteinMin;
      $('#profile-form').elements.proteinMax.value = result.proteinMax;
      $('#profile-form').elements.fatMin.value = result.fatMin;
      $('#profile-form').elements.fatMax.value = result.fatMax;
      await persistProfile({onboardingDone: true});
      // First weight becomes the trend baseline.
      const today = localDate();
      if (!(state.measurements || []).some(row => row.date === today && number(row.weight) !== null)) {
        await api('/api/measurements', {date: today, weight: values.weight}).catch(() => undefined);
      }
      const provider = $('#ob-provider').value;
      const key = $('#ob-apikey').value.trim();
      const baseUrl = $('#ob-baseurl').value.trim();
      const model = $('#ob-model').value.trim();
      const allowExternal = $('#ob-allow').hidden || $('#ob-allow').checked;
      if (baseUrl && model && (key || allowExternal)) {
        await api('/api/settings', {provider, baseUrl, model, allowExternal, ...(key ? {apiKey: key} : {})});
      }
      obSyncTargets();
      feedback(message, '已保存，开始记录吧。');
      await loadState({quiet: true}).catch(() => undefined);
      onboarding.done = true;
      showOnboarding(false);
      notice('设置完成。已按你的目标写入热量与蛋白质、脂肪区间。');
      switchTab('today');
    } catch (error) {
      feedback(message, error.message, true);
    } finally {
      onboarding.saving = false;
      $('#ob-finish').disabled = false;
    }
  }
  function renderTargetStatus() {
    const node = $('#profile-target-status');
    paintGoalHints();
    const p = state.profile || {};
    if (number(p.calorieTarget) === null) {
      node.className = 'target-status empty';
      node.textContent = '尚未测算。填写身高、体重与年龄后点「按目标重新测算」；训练天数取自「记录 → 训练计划」。';
      return;
    }
    node.className = 'target-status';
    const goal = GOAL_LABEL[p.goal] || '未设置目标';
    const temporary = targetAdjustmentForDate(localDate());
    // 展示与「今天」页同一套计算：目标预设算出的训练日/休息日区间，不再读手填字段。
    const range = intakeRangeForDate(localDate());
    const missing = [];
    if (number(p.age) === null) missing.push('年龄');
    if (plannedSessions() === null) missing.push('训练计划');
    const trainingToday = (state.habits || []).some(row => row.date === localDate() && (row.training === true || row.training === 'true'));
    node.textContent = [
      `当前目标：${goal}`,
      `维持热量 ${number(p.referenceCalories) !== null ? fmt(p.referenceCalories, 0) + ' kcal' : '未测算'} · 训练日 ${fmt(range.trainingDay.min, 0)}~${fmt(range.trainingDay.max, 0)} kcal · 休息日 ${fmt(range.restDay.min, 0)}~${fmt(range.restDay.max, 0)} kcal`,
      `今日按${trainingToday ? '训练日' : '休息日'}：${trainingToday ? fmt(range.trainingDay.min, 0) + '~' + fmt(range.trainingDay.max, 0) : fmt(range.restDay.min, 0) + '~' + fmt(range.restDay.max, 0)} kcal（在记录页把当天标为「已训练」后自动切换）`,
      `蛋白质 ${fmt(p.proteinMin, 0)}~${fmt(p.proteinMax, 0)} g · 脂肪 ${fmt(p.fatMin, 0)}~${fmt(p.fatMax, 0)} g`,
      ...(missing.length ? [`⚠ 还缺 ${missing.join('、')}：训练计划为空时按久坐估算，到「记录→训练计划」保存后点「按目标重新测算」。`] : []),
      ...(temporary ? [`今日临时目标：热量 ${fmt(temporary.temporary.calorieTarget, 0)} kcal · 脂肪上限 ${fmt(temporary.temporary.fatMax, 0)} g；原目标不变，明日结束后恢复。`] : []),
      '口径与阈值可在下方「口径与手动调整」中修改，改完点「按目标重新测算」。'
    ].join('\n');
  }
  $('#profile-goal').addEventListener('change', () => {
    const form = $('#profile-form');
    form.elements.weight.value = form.elements.weight.value || latestWeight() || '';
    paintGoalHints();
    recalcProfileTargets();
  });
  $('#recalc-target').addEventListener('click', async event => {
    const button = event.currentTarget, message = $('.form-feedback', $('#profile-form'));
    button.disabled = true;
    feedback(message, '正在测算…');
    try {
      const result = await recalcProfileTargets();
      if (result) {await persistProfile({}); await loadState({quiet: true}); feedback(message, '已按目标测算并保存。');}
      else feedback(message, '请先填写身高和体重。', true);
    } catch (error) {feedback(message, error.message, true);} finally {button.disabled = false;}
  });
  $('#restart-onboarding').addEventListener('click', async () => {
    if (!await askConfirm('将重新走一遍四步向导（目标、身体数据、训练、连接）。档案可以重新填写，已有的饮食、训练和体重记录都不会删除。继续吗？', {title: '重新设置档案', ok: '开始设置'})) return;
    const form = $('#profile-form');
    $('#ob-sex').value = form.elements.sex.value || '';
    $('#ob-height').value = form.elements.height.value || '';
    $('#ob-age').value = form.elements.age.value || '';
    $('#ob-weight').value = form.elements.weight.value || latestWeight() || '';
    const goal = form.elements.goal.value || '';
    const radio = document.querySelector(`#ob-goals input[value="${goal}"]`);
    if (radio) radio.checked = true;
    showOnboarding(true);
  });
  $('#ob-next').addEventListener('click', obNext);
  $('#ob-back').addEventListener('click', () => {feedback($('#ob-feedback'), ''); onboardingStep(onboarding.step - 1);});
  $('#ob-finish').addEventListener('click', obFinish);
  $('#ob-skip').addEventListener('click', async () => {
    showOnboarding(false);
    try {await api('/api/profile', {onboardingDone: true}); await loadState({quiet: true});}
    catch {notice('已跳过引导；可随时在「我的」重新填写。', true);}
  });
  $$('#ob-goals input').forEach(input => input.addEventListener('change', obSyncTargets));
  $('#ob-height').addEventListener('input', obSyncTargets);
  $('#ob-weight').addEventListener('input', obSyncTargets);
  $('#export-markdown').addEventListener('click', async event => {
    const button = event.currentTarget, message = $('#data-feedback');
    button.disabled = true;
    feedback(message, '正在生成 Markdown…');
    try {
      const data = await api('/api/export-markdown', {});
      if (!data || typeof data.markdown !== 'string' || !data.markdown.length) throw new Error('生成的内容为空，请检查是否有记录。');
      const filename = String(data.filename || `qingheng-${localDate()}.md`);
      if (window.QinghengAdapter.hasNative() && typeof window.QinghengNative.exportText === 'function') {
        window.QinghengNative.exportText(filename, data.markdown);
        feedback(message, '请选择手机保存位置，即可得到 Markdown 文件。');
      } else {
        const url = URL.createObjectURL(new Blob([data.markdown], {type: 'text/markdown;charset=utf-8'}));
        const link = document.createElement('a');
        link.href = url; link.download = filename; document.body.append(link); link.click(); link.remove();
        feedback(message, 'Markdown 已开始下载。');
        setTimeout(() => URL.revokeObjectURL(url), 10000);
      }
    } catch (error) {feedback(message, error.message, true);} finally {button.disabled = false;}
  });
  $('#chat-send').addEventListener('click',sendChat);
  $('#app-dialog-ok').addEventListener('click',()=>closeDialog(true));
  $('#app-dialog-cancel').addEventListener('click',()=>closeDialog(false));
  $('#app-dialog').addEventListener('click',event=>{if(event.target.id==='app-dialog')closeDialog(false);});
  document.addEventListener('keydown',event=>{if(event.key!=='Escape')return;if(!$('#item-recalc-dialog').hidden)closeItemRecalc();else if(!$('#app-dialog').hidden)closeDialog(false);});
  // Deleting one Q&A record now happens from its long-press sheet, so this list only clears all.
  $('#chat-clear').addEventListener('click',async event=>{if(!await askConfirm('确定清空本机问答记录吗？此操作无法撤销。',{title:'清空问答记录',ok:'清空',danger:true}))return;const button=event.currentTarget;button.disabled=true;try{await api('/api/chatlog',undefined,'DELETE');await loadState({quiet:true});notice('问答记录已清空。');}catch(error){notice(error.message,true);}finally{button.disabled=false;}});
  $('#push-form').addEventListener('submit',event=>{event.preventDefault();savePush(event.currentTarget);});
  $('#push-test').addEventListener('click',async event=>{const message=$('#push-feedback'),button=event.currentTarget;button.disabled=true;feedback(message,'正在发送测试通知…');try{await api('/api/notification-test',{});feedback(message,'已发送；若没看到通知，请检查系统通知权限。');}catch(error){feedback(message,error.message,true);}finally{button.disabled=false;}});
  $('#chat-question').addEventListener('keydown',event=>{if((event.ctrlKey||event.metaKey)&&event.key==='Enter')sendChat();});
  /** "用油 1 勺" when the record carries an explicit oil amount; empty otherwise. */
  function oilLabel(meal) {
    const grams = number(meal?.oilGrams);
    if (grams === null || grams <= 0) return '';
    const spoons = number(meal?.oilSpoons);
    return `<span>用油 <b>${spoons !== null ? fmt(spoons, 1) + ' 勺/' : ''}${fmt(grams, 0)} g</b></span>`;
  }
  /** Row markup for one meal; split out so day-grouped lists can reuse it. */
  function mealRowsHtml(meals, showDate) {
    return meals.map(meal => {
      const type = esc(mealNames[meal.mealType] || meal.mealType || '餐食');
      const clock = clockPattern.test(String(meal.mealTime||'')) ? esc(meal.mealTime) : '';
      const source = ({manual:'手动',local:'本地估算',api:'模型估算','quick-copy':'复制','import':'导入'})[meal.source] || '';
      const items = Array.isArray(meal.items) && meal.items.length ? `共 ${meal.items.length} 项` : '';
      const photo = meal.photoTakenAt ? '有照片' : '';
      return `<div class="meal-row list-row" role="listitem" data-long-press="meal:${esc(meal.id ?? '')}"><div class="row-body"><div class="row-head"><strong>${esc(meal.name || '未命名餐食')}</strong>`
        + `${meal.favorite === true ? `<span class="fav-badge" aria-label="已收藏"><span class="inline-icon" aria-hidden="true">${SVG_ICONS['icon-bookmark.svg']}</span></span>` : ''}`
        + `${type ? `<span class="row-tag">${type}</span>` : ''}`
        + `${source ? `<span class="row-tag subtle-tag">${esc(source)}</span>` : ''}`
        + `${items ? `<span class="row-tag subtle-tag">${esc(items)}</span>` : ''}`
        + `${showDate ? `<span class="row-date">${esc(meal.date)}</span>` : ''}`
        + `${meal.id !== undefined ? `<button type="button" class="icon-button danger row-delete" data-delete-meal="${esc(meal.id)}" aria-label="删除${esc(meal.name || '餐食')}" title="删除这条餐食"><span class="inline-icon" aria-hidden="true">${SVG_ICONS['icon-trash.svg']}</span></button>` : ''}</div>`
        + `${Array.isArray(meal.items) && meal.items.length ? `<div class="meal-items-wrap"><button type="button" class="meal-items-toggle" data-meal-items="${esc(meal.id ?? '')}" aria-expanded="false">共 ${meal.items.length} 项 · 查看每项热量</button><div class="meal-items" hidden>${[...meal.items].sort((a, b) => (number(b.calories) ?? 0) - (number(a.calories) ?? 0)).map(item => `<div class="meal-item"><span>${esc(item.name || '未命名')}</span><b>${number(item.grams) !== null ? `${fmt(item.grams, 0)} g · ` : ''}${fmt(number(item.calories) ?? 0, 0)} kcal</b></div>`).join('')}</div></div>` : ''}`
        + `<div class="meal-numbers" aria-label="营养数值">`
        + `<span><small>蛋白</small><b>${fmt(meal.protein)} g</b></span><span><small>脂肪</small><b>${fmt(meal.fat)} g</b></span><span><small>碳水</small><b>${fmt(meal.carbs)} g</b></span></div>`
        + `<div class="row-meta">${clock ? `<span>${clock}</span>` : ''}`
        + `${oilLabel(meal)}`
        + `${photo ? `<span>${photo}</span>` : ''}</div></div>`
        + `<div class="row-side"><span class="row-kcal">${fmt(meal.calories,0)} <small>kcal</small></span></div></div>`;
    }).join('');
  }
  // 未迁移到 stateBlock：仍用 empty()，待后续统一（五态模板只替换了今日时间轴、记录列表、体重趋势三处）。
  function renderMeals(container, meals, showDate) {
    container.innerHTML = meals.length ? mealRowsHtml(meals, showDate) : empty('还没有餐食记录。记下第一餐，从了解自己开始。');
  }
  function renderTodayTimeline(container, meals) {
    if (!container) return;
    // 只列餐食。睡眠/体重/训练曾经被当成「事件」塞在末尾，看起来像误记进今日记录；
    // 它们在「今日三样」的摘要和「身体近况」里各自有位置，这里不再重复。
    const entries = meals.map((meal, index) => {
      const time = String(meal.mealTime || '');
      const timed = clockPattern.test(time);
      return {priority: timed ? 0 : 1, time: timed ? time : '', order: index, html: mealRowsHtml([meal], false)};
    });
    entries.sort((a, b) => a.priority - b.priority || a.time.localeCompare(b.time) || a.order - b.order);
    $('#today-record-count').textContent = meals.length ? `${meals.length} 餐` : '暂无';
    container.innerHTML = entries.length
      ? entries.map(entry => entry.html).join('')
      : stateBlock({kind: 'empty', title: '今天还没有记录', body: '记一餐，时间轴就会出现在这里。'});
  }
  /**
   * The record list is grouped by day (the way 薄荷健康 shows 按天卡片) and capped at five meals until
   * the user asks for everything. Both keep the page short without hiding data.
   */
  const RECORD_MEALS_COLLAPSED = 5;
  let recordMealsExpanded = false;
  function renderRecordMeals(rows) {
    const container = $('#record-meals');
    if (!container) return;
    if (!rows.length) { container.innerHTML = stateBlock({kind: 'empty', title: '还没有餐食记录', body: '记下第一餐，从了解自己开始。'}); return; }
    const shown = recordMealsExpanded ? rows : rows.slice(0, RECORD_MEALS_COLLAPSED);
    const groups = new Map();
    for (const row of shown) {
      const day = String(row.date || '');
      if (!groups.has(day)) groups.set(day, []);
      groups.get(day).push(row);
    }
    const html = [...groups].map(([day, list]) => {
      const kcal = Math.round(totalsFor(list).calories ?? 0);
      return `<div class="meal-day"><div class="meal-day-head"><strong>${esc(dayLabel(day))}</strong><span>${list.length} 餐 · ${fmt(kcal, 0)} kcal</span></div>${mealRowsHtml(list, false)}</div>`;
    }).join('');
    const toggle = rows.length > RECORD_MEALS_COLLAPSED
      ? `<button type="button" class="button subtle" id="record-meals-toggle">${recordMealsExpanded ? '收起' : `显示全部 ${rows.length} 条`}</button>`
      : '';
    container.innerHTML = html + toggle;
    $('#record-meals-toggle')?.addEventListener('click', () => {recordMealsExpanded = !recordMealsExpanded; renderRecordMeals(rows);});
  }
  /** 10-18 for this year, 2025-10-18 otherwise. */
  function dayLabel(day) {
    if (!validDate(day)) return '未标日期';
    const today = localDate();
    const sameYear = day.slice(0, 4) === today.slice(0, 4);
    return sameYear ? day.slice(5) : day;
  }
  /** Median of the finite values, or null when there is nothing to summarise. */
  function median(values) {
    const clean = values.filter(value => number(value) !== null).map(Number).sort((a, b) => a - b);
    if (!clean.length) return null;
    const middle = Math.floor(clean.length / 2);
    return clean.length % 2 ? clean[middle] : (clean[middle - 1] + clean[middle]) / 2;
  }
  /**
   * Two 30-day windows compared with medians: robust to a single unusual reading, and honest about
   * its own limits — it reports the direction of the numbers, not a judgement about health.
   */
  function statsTableHtml() {
    const rows = [];
    const window = (fromDays, toDays) => {
      const end = dayTime(activeDate) - toDays * 86400000;
      const start = dayTime(activeDate) - fromDays * 86400000;
      return (state.measurements || []).filter(record => validDate(record.date) && record.date <= activeDate
        && dayTime(record.date) > start && dayTime(record.date) <= end);
    };
    const previous = window(60, 30), current = window(30, 0);
    if (!previous.length || !current.length)
      return `<p class="fine-print">需要前后各至少一个 30 天窗口的测量才能对照，目前${previous.length ? '' : '缺少 30~60 天前的记录'}${(!previous.length && !current.length) ? '，也' : ''}${current.length ? '' : '缺少最近 30 天的记录'}。</p>`;
    const height = number(state.profile.height);
    const specs = [
      {label:'体重', unit:'kg', key:'weight', direction:'down', digits:2},
      {label:'BMI', unit:'', key:'bmi', direction:'down', digits:2},
      {label:'体脂率', unit:'%', key:'bodyFat', direction:'down', digits:1},
      {label:'肌肉量', unit:'kg', key:'muscle', direction:'up', digits:2},
      {label:'腰围', unit:'cm', key:'waist', direction:'down', digits:1},
      {label:'基础代谢', unit:'kcal', key:'bmr', direction:'up', digits:0},
    ];
    const value = (record, spec) => spec.key === 'bmi'
      ? (number(record.weight) !== null && height > 0 ? Number(record.weight) / ((height / 100) ** 2) : null)
      : number(record[spec.key]);
    const goal = (state.profile || {}).goal;
    // Which direction of the scale is "towards the goal" is a user choice, not a health claim.
    const lighterIsGoal = goal !== 'gain';
    for (const spec of specs) {
      const before = median(previous.map(record => value(record, spec)));
      const after = median(current.map(record => value(record, spec)));
      if (before === null || after === null) continue;
      const diff = after - before;
      const flat = Math.abs(diff) < Math.max(0.05, Math.abs(before) * 0.005);
      const wants = spec.key === 'muscle' || spec.key === 'bmr' ? 'up' : (lighterIsGoal ? 'down' : 'up');
      const tone = flat ? 'flat' : ((diff > 0 ? 'up' : 'down') === wants ? 'good' : 'bad');
      const arrow = flat ? '' : `<span class="inline-icon" aria-hidden="true"><img src="./icon-glyph-trends.svg" alt="" width="15" height="15" style="transform:${diff > 0 ? 'none' : 'scale(-1,-1)'}"></span>`;
      const label = flat ? '基本持平' : `${diff > 0 ? '+' : '−'}${fmt(Math.abs(diff), spec.digits)}${spec.unit}`;
      rows.push(`<tr><td>${esc(spec.label)}</td><td class="num">${fmt(before, spec.digits)}${spec.unit ? ` <small>${esc(spec.unit)}</small>` : ''}</td>`
        + `<td class="num">${fmt(after, spec.digits)}${spec.unit ? ` <small>${esc(spec.unit)}</small>` : ''}</td>`
        + `<td><span class="stats-trend stats-${tone}">${arrow}${esc(label)}</span></td></tr>`);
    }
    if (!rows.length) return '<p class="fine-print">前后两个窗口里可对照的指标不足。</p>';
    return `<table class="stats-table"><caption class="fine-print">按中位数比较「30~60 天前」与「最近 30 天」，只描述数字方向，不是健康或医疗结论。</caption>`
      + `<thead><tr><th scope="col">指标</th><th scope="col">30~60 天前</th><th scope="col">最近 30 天</th><th scope="col">变化</th></tr></thead>`
      + `<tbody>${rows.join('')}</tbody></table>`;
  }
  let trendTooltipTimer = null;
  function renderTrends() {
    if (trendTooltipTimer) {clearTimeout(trendTooltipTimer); trendTooltipTimer = null;}
    const range = $('#trend-range').value;
    const cutoff = range === 'all' ? -Infinity : dayTime(activeDate)-(Number(range)-1)*86400000;
    const records = state.measurements.filter(record => validDate(record.date) && record.date <= activeDate && dayTime(record.date)>=cutoff).sort((a,b) => a.date.localeCompare(b.date));
    const points = records.filter(record => number(record.weight)!==null && Number(record.weight)>0);
    const height = number(state.profile.height);
    $('#measurement-history').innerHTML = records.length ? [...records].reverse().map(item => `<tr><td>${esc(item.date)}</td><td class="num">${fmt(item.weight)}</td><td class="num">${fmt(item.waist)}</td><td class="num">${fmt(item.bodyFat)}</td><td class="num">${fmt(item.muscle)}</td><td class="num">${fmt(number(item.weight)!==null && height>0 ? item.weight / ((height/100)**2) : null)}</td></tr>`).join('') : '<tr><td colspan="6">这个范围内尚无测量记录。缺失数值显示为 —。</td></tr>';
    // Body-composition comparison, computed locally: the previous 30-day window versus the last
    // 30 days. It reports direction only, never a medical verdict, and shows — for missing values.
    $('#stats-table').innerHTML = statsTableHtml();
    if (!points.length) {
      $('#weight-chart').innerHTML = stateBlock({kind: 'empty', title: '记录第一笔体重', body: '趋势从这里开始；之后每次记录都会画进折线。', action: {label: '记录体重', go: 'records', focus: 'measurement-weight'}});
      $('#trend-stats').innerHTML = '';
      return;
    }
    const first = points[0], last = points[points.length-1];
    // View-box sized close to the rendered phone width so axis text stays legible after scaling.
    const W=330,H=215,L=46,R=16,T=18,B=36,plotW=W-L-R,plotH=H-T-B;
    const weights = points.map(item => Number(item.weight));
    // Weekly means are what the written rules use for weight judgement, so they are drawn on top
    // of the raw points instead of being left to the eye.
    const weeklyMeans = (() => {
      const byWeek = new Map();
      for (const row of points) {
        const date = new Date(`${row.date}T00:00:00`);
        if (Number.isNaN(date.getTime())) continue;
        const monday = new Date(date);
        const iso = (date.getDay() + 6) % 7;
        monday.setDate(date.getDate() - iso);
        const key = localDate(monday);
        if (!byWeek.has(key)) byWeek.set(key, []);
        byWeek.get(key).push(number(row.weight));
      }
      return [...byWeek.entries()].map(([week, values]) => ({week, mean: values.reduce((sum, v) => sum + v, 0) / values.length}))
        .sort((a, b) => a.week.localeCompare(b.week));
    })();
    const lastTwo = weeklyMeans.slice(-2);
    const weeklyNote = lastTwo.length === 2
      ? `本周均值 ${fmt(lastTwo[1].mean)} kg（${lastTwo[1].week} 起）· 上周均值 ${fmt(lastTwo[0].mean)} kg · 变化 ${lastTwo[1].mean - lastTwo[0].mean >= 0 ? '+' : ''}${fmt(lastTwo[1].mean - lastTwo[0].mean)} kg`
      : lastTwo.length === 1 ? `本周均值 ${fmt(lastTwo[0].mean)} kg · 还缺上一周的数据，暂时无法对比` : '';
    const minWeight=Math.min(...weights),maxWeight=Math.max(...weights), pad=Math.max(.6,(maxWeight-minWeight)*.22);
    // nice ticks：把 4 条网格线对齐到 0.1/0.2/0.25/0.5/1 这类整步长，
    // 否则刻度会读出 63.3 / 63.9 / 64.4 这种由数据极值插值出来的假精度（2026-10-29）。
    const rawStep = (maxWeight + pad - Math.max(0, minWeight - pad)) / 4;
    const tickStep = [0.1,0.2,0.25,0.5,1,2,5].find(step => step >= rawStep) || 5;
    const low = Math.max(0, Math.floor(Math.max(0, minWeight - pad) / tickStep) * tickStep);
    const high = Math.ceil((maxWeight + pad) / tickStep) * tickStep;
    const start = dayTime(first.date), end=dayTime(last.date);
    const x = date => end===start ? L+plotW/2 : L+(dayTime(date)-start)/(end-start)*plotW;
    const y = value => T+(high-value)/(high-low)*plotH;
    const coords=points.map(item => [x(item.date),y(item.weight)]);
    const path=coords.map(([px,py],index) => `${index?'L':'M'}${px.toFixed(2)},${py.toFixed(2)}`).join(' ');
    const grid=Array.from({length:5},(_,i) => {const value=low+(high-low)*i/4,py=y(value);return `<line class="chart-grid" x1="${L}" x2="${W-R}" y1="${py}" y2="${py}"/><text class="chart-text" x="${L-8}" y="${py+4.5}" text-anchor="end">${fmt(value)}</text>`;}).join('');
    const labels = end===start ? `<text class="chart-text" x="${x(first.date)}" y="${H-10}" text-anchor="middle">${esc(first.date)}</text>` : `<text class="chart-text" x="${L}" y="${H-10}" text-anchor="start">${esc(first.date)}</text><text class="chart-text" x="${W-R}" y="${H-10}" text-anchor="end">${esc(last.date)}</text>`;
    // Few points are readable individually; many would collide, so only label short ranges.
    // 相邻同值只标一次（内联判定，不引入外部函数）：连续几天体重相同会把标签叠成一团。
const values = points.length<=7 ? points.map((item,i) => {
  const prev = i > 0 ? fmt(points[i-1].weight) : '';
  if (prev === fmt(item.weight)) return '';
  return `<text class="chart-value" x="${coords[i][0]}" y="${coords[i][1]-12}" text-anchor="middle">${fmt(item.weight)}</text>`;
}).join('') : '';
    // The weekly mean is the line the written rules judge by, drawn dashed over the raw points.
    const meanCoords = weeklyMeans
      .filter(entry => entry.mean > 0 && (end === start || (dayTime(entry.week) >= start - 6 * 86400000 && dayTime(entry.week) <= end)))
      .map(entry => [Math.max(L, x(entry.week)), y(entry.mean)]);
    const meanPath = meanCoords.length > 1 ? `<path class="chart-line chart-mean" d="${meanCoords.map(([px,py],index) => `${index?'L':'M'}${px.toFixed(2)},${py.toFixed(2)}`).join(' ')}"/>` : '';
    const hitAreas = points.map((item, index) => {
      const previous = index ? Number(points[index - 1].weight) : null;
      const difference = previous === null ? '首笔记录' : `${Number(item.weight) - previous > 0 ? '+' : ''}${fmt(Number(item.weight) - previous)} kg`;
      return `<circle class="chart-hit-area" cx="${coords[index][0]}" cy="${coords[index][1]}" r="22" fill="currentColor" fill-opacity="0.001" data-trend-point="${index}" data-date="${esc(item.date)}" data-weight="${fmt(item.weight)}" data-delta="${esc(difference)}" tabindex="0" role="button" aria-label="查看 ${esc(item.date)} 体重 ${fmt(item.weight)} kg"/>`;
    }).join('');
    $('#weight-chart').innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="group" aria-labelledby="chart-title chart-desc"><title id="chart-title">按真实日期绘制的体重趋势</title><desc id="chart-desc">${esc(points.map(item => `${item.date}：${fmt(item.weight)}公斤`).join('；'))}${weeklyNote ? `；${esc(weeklyNote)}` : ''}</desc><defs><linearGradient id="weight-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#a7c2a3" stop-opacity=".3"/><stop offset="100%" stop-color="#a7c2a3" stop-opacity=".015"/></linearGradient></defs>${grid}${points.length>1 ? `<path class="chart-area" d="${path} L${coords[coords.length-1][0]},${H-B} L${coords[0][0]},${H-B} Z"/><path class="chart-line" d="${path}"/>` : ''}${meanPath}${points.map((item,i) => `<circle class="chart-point" cx="${coords[i][0]}" cy="${coords[i][1]}" r="5"><title>${esc(item.date)} · ${fmt(item.weight)} kg</title></circle>`).join('')}${hitAreas}${values}${labels}</svg><p class="trend-point-tip" id="trend-point-tip" role="status" aria-live="polite" hidden></p>`;
    $('#weight-chart').querySelectorAll('.chart-hit-area').forEach(hit => {
      hit.addEventListener('pointerup', () => showTrendPoint(hit));
      hit.addEventListener('keydown', event => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        showTrendPoint(hit);
      });
    });
    const delta = Number(last.weight)-Number(first.weight);
    // Observed weekly rate vs the rate the current plan implies; the closer they are, the greener.
    const spanDays = Math.max(1, Math.round((dayTime(last.date) - dayTime(first.date)) / 86400000));
    const plannedRate = intakeRangeForDate(last.date).expectedWeeklyKg;
    const observedRate = spanDays >= 7 ? (delta / spanDays) * 7 : null;
    const rateRatio = plannedRate === null || observedRate === null || plannedRate === 0
      ? null
      : Math.min(1, Math.abs(observedRate - plannedRate) / Math.max(0.2, Math.abs(plannedRate) * 1.5));
    const rateColor = rateRatio === null ? '' : rateGoalColor(observedRate, plannedRate);
    $('#trend-stats').innerHTML = `<div><small>最新已测体重</small><strong>${fmt(last.weight)} <small>kg</small></strong></div><div><small>范围内首末变化</small><strong>${points.length<2?'—':`${delta>0?'+':''}${fmt(delta)}`} <small>${points.length<2?'需至少两次测量':'kg'}</small></strong></div><div><small>真实测量次数</small><strong>${points.length} <small>次</small></strong></div>`;
    // The delta is the second <strong> in the stats row; colour it by distance from the planned rate.
    if (rateColor) {
      const stats = $$('#trend-stats strong');
      if (stats[1]) {
        stats[1].style.color = rateColor;
        stats[1].title = `计划每周 ${plannedRate > 0 ? '+' : ''}${fmt(plannedRate, 2)} kg，实际每周 ${observedRate > 0 ? '+' : ''}${fmt(observedRate, 2)} kg`;
      }
    }
    renderDailyThree();
    renderCopyMeals();
    renderTrainingLog();
    renderVolumeTable();
    const weeklyNode = $('#trend-weekly');
    if (weeklyNode) {
      weeklyNode.textContent = weeklyNote || '';
      weeklyNode.hidden = !weeklyNote;
    }
  }
  function showTrendPoint(hit) {
    const tooltip = $('#trend-point-tip');
    if (!hit || !hit.hasAttribute('data-trend-point') || !tooltip) return;
    tooltip.textContent = `${hit.dataset.date} / ${hit.dataset.weight} kg / 差值 ${hit.dataset.delta}`;
    tooltip.hidden = false;
    if (trendTooltipTimer) clearTimeout(trendTooltipTimer);
    trendTooltipTimer = setTimeout(() => {
      tooltip.hidden = true;
      trendTooltipTimer = null;
    }, 3000);
  }
  /** The habit row for a date; older builds could append duplicates, so keep the fullest one. */
  function habitRowFor(date) {
    const rows = (state.habits || []).filter(row => row && row.date === date);
    if (rows.length <= 1) return rows[0] || null;
    return rows.slice().sort((a, b) => JSON.stringify(b).length - JSON.stringify(a).length)[0];
  }
  const TRAINING_TEMPLATES = {push: '推', pull: '拉', legs: '腿', other: '其他'};
  /** Normalised exercise list of one day: [{name, sets, reps, weight}]. */
  function exercisesFor(date) {
    const row = habitRowFor(date);
    const list = Array.isArray(row?.exercises) ? row.exercises : [];
    return list.map(item => ({
      id: item && item.id ? String(item.id) : '',
      name: String(item?.name ?? '').slice(0, 60),
      sets: number(item?.sets), reps: number(item?.reps), weight: number(item?.weight),
      distanceKm: number(item?.distanceKm), durationMin: number(item?.durationMin)
    })).filter(item => item.name || item.sets !== null || item.reps !== null || item.weight !== null);
  }
  /** Volume = sets × reps × weight; null when any factor is missing, so nothing is invented. */
  function exerciseVolume(item) {
    const sets = number(item?.sets), reps = number(item?.reps), weight = number(item?.weight);
    if (sets === null || reps === null || weight === null) return null;
    return sets * reps * weight;
  }
  /** Common lifts per template, ordered the way most people train them. */
  const EXERCISE_PRESETS = {
    push: ['卧推', '上斜哑铃卧推', '哑铃肩推', '侧平举', '绳索下压', '双杠臂屈伸'],
    pull: ['引体向上', '杠铃划船', '高位下拉', '面拉', '哑铃弯举', '直臂下压'],
    legs: ['深蹲', '硬拉', '腿举', '保加利亚分腿蹲', '罗马尼亚硬拉', '提踵', '卷腹', '平板支撑'],
    other: ['农夫行走', '壶铃摇摆', '有氧 20 分钟', '拉伸 10 分钟']
  };
  /** Most recent recorded values for one exercise, so a repeat is one tap instead of retyping. */
  function latestExerciseValues(name) {
    const wanted = String(name || '').trim();
    if (!wanted) return null;
    const rows = (state.habits || []).filter(row => row && Array.isArray(row.exercises) && validDate(row.date))
      .sort((a, b) => String(b.date).localeCompare(String(a.date)));
    for (const row of rows) {
      for (const item of row.exercises) {
        if (!item || String(item.name || '').trim() !== wanted) continue;
        const sets = number(item.sets), reps = number(item.reps), weight = number(item.weight);
        if (sets === null || reps === null || weight === null) continue;
        return {sets, reps, weight, date: row.date};
      }
    }
    return null;
  }
  /** 一组一条：旧记录没有 setDetails 时，用 sets/次/负重复制出同样多组。 */
  function trainingSetDetails(item) {
    const details = Array.isArray(item && item.setDetails) ? item.setDetails : null;
    if (details && details.length) return details.slice(0, 30).map(set => ({reps: number(set.reps), weight: number(set.weight)}));
    const count = Math.max(1, Math.min(30, Math.round(number(item && item.sets) || 1)));
    return Array.from({length: count}, () => ({reps: number(item && item.reps), weight: number(item && item.weight)}));
  }
  function setRowHtml(set, index) {
    const n = index + 1;
    const value = v => v === null || v === undefined ? '' : ` value="${Number(v)}"`;
    // 2026-11-11 晚：这里不再是一张表（表头 + 两个输入框），而是一行手账：
    // 「◯ 1  10 次 × 60 kg   ×」，数字本身就是主角，单位只跟一次，改数时只有一条下划线出现。
    return `<div class="set-row" data-set-row><button type="button" class="set-check" data-set-done aria-pressed="false" aria-label="标记第 ${n} 组完成">✓</button>`
      + `<span class="set-no" aria-hidden="true">${n}</span>`
      + `<span class="set-values">`
      + `<label class="set-value"><input data-set="reps" type="number" inputmode="numeric" min="0" max="200" step="1" aria-label="第 ${n} 组次数" placeholder="—"${value(set.reps)}><small>次</small></label>`
      + `<span class="set-times" aria-hidden="true">×</span>`
      + `<label class="set-value is-kg"><input data-set="weight" type="number" inputmode="decimal" min="0" max="500" step="0.5" aria-label="第 ${n} 组负重公斤" placeholder="—"${value(set.weight)}><small>kg</small></label>`
      + `</span>`
      + `<button type="button" class="set-remove" data-set-remove aria-label="移除第 ${n} 组">×</button></div>`;
  }
  /**
   * 一个动作 = 一张手账：编号 + 动作名（行标题，不套框）→ 每一组一行「次 × kg」→ 加一组 / 容量。
   * 删除放在动作名行右端与组行末尾，避免 44px 危险按钮压在标题行上方。
   */
  /** 有氧动作（跑步 / 骑行 / 椭圆…）：没有组次负重，记距离与时长。只认前缀，别把「杠铃划船」当下肢有氧。 */
  function isCardioName(name) {
    const text = String(name || '').trim();
    return /^(跑步|慢跑|快跑|快走|走路|散步|骑行|单车|椭圆|划船机|跳绳|爬楼|爬坡|有氧)/.test(text);
  }
  function isCardioItem(item) {
    return isCardioName(item && item.name) || number(item && item.distanceKm) !== null || number(item && item.durationMin) !== null;
  }
  /** 配速按「分钟 / 公里」算，显示成 6'00"。 */
  function fmtPace(minutesPerKm) {
    const total = Math.round(minutesPerKm * 60);
    return Math.floor(total / 60) + "'" + String(total % 60).padStart(2, '0') + '"';
  }
  function cardioRowHtml(item) {
    const value = v => v === null || v === undefined ? '' : ` value="${Number(v)}"`;
    return `<div class="cardio-row" data-cardio-row><span class="cardio-mark" aria-hidden="true">跑</span>`
      + `<span class="set-values"><label class="set-value"><input data-cardio="distance" type="number" inputmode="decimal" min="0" max="200" step="0.1" placeholder="—" aria-label="距离公里"${value(item.distanceKm)}><small>km</small></label>`
      + `<span class="set-times" aria-hidden="true">×</span>`
      + `<label class="set-value is-kg"><input data-cardio="minutes" type="number" inputmode="numeric" min="0" max="600" step="1" placeholder="—" aria-label="时长分钟"${value(item.durationMin)}><small>分钟</small></label></span>`
      + `<span class="cardio-pace" data-cardio-pace>配速 —</span></div>`;
  }
  /** 有氧行右侧的配速跟着两个输入走；容器可以是整行也可以是有氧行本身。 */
  function refreshCardioPace(container) {
    if (!container) return;
    const row = container.matches?.('[data-cardio-row]') ? container : $('[data-cardio-row]', container);
    if (!row) return;
    const out = $('[data-cardio-pace]', row);
    if (!out) return;
    const km = number($('[data-cardio="distance"]', row)?.value);
    const min = number($('[data-cardio="minutes"]', row)?.value);
    out.textContent = km && min ? '配速 ' + fmtPace(min / km) : '配速 —';
  }
  /** 动作名改成「跑步」时当场换成有氧表单，改回力量动作再换回来。 */
  function syncExerciseMode(row) {
    if (!row) return;
    const want = isCardioName($('[data-exercise="name"]', row)?.value) ? '1' : '0';
    if ((row.dataset.cardio || '0') === want) return;
    row.dataset.cardio = want;
    const list = $('[data-set-list]', row), foot = $('.set-foot', row);
    if (want === '1') {
      if (list) list.innerHTML = cardioRowHtml({name: $('[data-exercise="name"]', row)?.value});
      if (foot) foot.innerHTML = '<span class="row-meta">有氧记录</span>';
    } else {
      if (list) list.innerHTML = setRowHtml({reps: null, weight: null}, 0);
      if (foot) foot.innerHTML = '<button type="button" class="text-button" data-set-add>＋ 加一组</button><span class="row-meta">容量 <b data-set-volume>—</b></span>';
      refreshSetRow(row);
    }
    refreshCardioPace(row);
  }
  function exerciseRowHtml(item, index) {
    const n = index + 1;
    const cardio = isCardioItem(item);
    const body = cardio ? cardioRowHtml(item) : trainingSetDetails(item).map(setRowHtml).join('');
    const foot = cardio
      ? '<span class="row-meta">有氧记录</span>'
      : '<button type="button" class="text-button" data-set-add>＋ 加一组</button><span class="row-meta">容量 <b data-set-volume>—</b></span>';
    return `<div class="training-row" data-exercise-row="${index}" data-exercise-id="${esc(item.id || '')}" data-cardio="${cardio ? 1 : 0}">`
      + `<div class="exercise-row-head"><span class="exercise-no" aria-hidden="true">${n}</span>`
      + `<label class="exercise-name"><input data-exercise="name" value="${esc(item.name || '')}" maxlength="60" placeholder="动作名，例如卧推" aria-label="第 ${n} 个动作名称"></label>`
      + `<button type="button" class="text-button exercise-remove" data-exercise-remove="${index}" aria-label="移除这个动作">移除</button></div>`
      + `<div class="set-list" data-set-list>${body}</div>`
      + `<div class="set-foot">${foot}</div></div>`;
  }
  /** 一组增删后重排序号、重算该动作容量；只改 UI，保存时才落库。 */
  function refreshSetRow(row) {
    const sets = $$('[data-set-row]', row);
    sets.forEach((set, index) => {
      const n = index + 1;
      const no = $('.set-no', set); if (no) no.textContent = String(n);
      const remove = $('[data-set-remove]', set);
      if (remove) { remove.disabled = sets.length <= 1; remove.setAttribute('aria-label', '移除第 ' + n + ' 组'); }
      const done = $('[data-set-done]', set);
      if (done) done.setAttribute('aria-label', '标记第 ' + n + ' 组完成');
      const reps = $('[data-set="reps"]', set);
      if (reps) reps.setAttribute('aria-label', '第 ' + n + ' 组次数');
      const weight = $('[data-set="weight"]', set);
      if (weight) weight.setAttribute('aria-label', '第 ' + n + ' 组负重公斤');
    });
    const volume = sets.reduce((sum, set) => {
      const reps = number($('[data-set="reps"]', set)?.value), weight = number($('[data-set="weight"]', set)?.value);
      return reps !== null && weight !== null ? sum + reps * weight : sum;
    }, 0);
    const out = $('[data-set-volume]', row); if (out) out.textContent = volume > 0 ? fmt(volume, 0) + ' kg' : '—';
  }
  /** 增删动作后统一重排序号：行前的数字、移除按钮与输入框的 aria-label 都跟着行序走。 */
  function renumberExerciseRows() {
    const box = $('#training-exercises');
    if (!box) return;
    $$('[data-exercise-row]', box).forEach((row, index) => {
      row.dataset.exerciseRow = String(index);
      const no = $('.exercise-no', row);
      if (no) no.textContent = String(index + 1);
      const remove = $('[data-exercise-remove]', row);
      if (remove) { remove.dataset.exerciseRemove = String(index); remove.setAttribute('aria-label', '移除第 ' + (index + 1) + ' 个动作'); }
      const name = $('[data-exercise="name"]', row);
      if (name) name.setAttribute('aria-label', '第 ' + (index + 1) + ' 个动作名称');
    });
  }
  /** Adds one exercise row, optionally pre-filled; shared by the 添加动作 button and the preset chips. */
  function appendExerciseRow(name, values) {
    const box = $('#training-exercises');
    if (!box) return null;
    const index = box.querySelectorAll('[data-exercise-row]').length;
    if (index >= 12) {notice('一次最多记录 12 个动作。', true); return null;}
    // exerciseRowHtml 自己就带 .training-row 外壳：这里只做临时容器，取出那一行再加进列表。
    // （1.3.44 起这里多包了一层 .training-row，导致每加一个动作多出一行空白、编号跳号。）
    const holder = document.createElement('div');
    holder.innerHTML = exerciseRowHtml({
      name: name || '',
      id: '',
      sets: values && values.sets,
      reps: values && values.reps,
      weight: values && values.weight
    }, index);
    const row = holder.firstElementChild;
    if (!row) return null;
    box.append(row);
    renumberExerciseRows();
    return row;
  }
  /** Chips for the selected template. 小号胶囊：它们是「快捷方式」，不该和主行动一样重。 */
  function renderTrainingPresets() {
    const box = $('#training-presets'), form = $('#training-form');
    if (!box || !form) return;
    const template = TRAINING_TEMPLATES[form.elements.template.value] ? form.elements.template.value : 'push';
    box.innerHTML = (EXERCISE_PRESETS[template] || []).map(name => `<button type="button" class="preset-chip" data-training-preset="${esc(name)}">${esc(name)}</button>`).join('');
    box.dataset.template = template;
  }
  function renderTrainingLog(rowsOverride = null) {
    const form = $('#training-form');
    if (!form) return;
    const row = habitRowFor(activeDate);
    const exercises = exercisesFor(activeDate);
    const template = TRAINING_TEMPLATES[row?.template] ? row.template : 'push';
    if (document.activeElement !== form.elements.template) form.elements.template.value = template;
    const box = $('#training-exercises');
    const rows = Array.isArray(rowsOverride) ? rowsOverride : (exercises.length ? exercises : [{name: '', sets: 1, reps: null, weight: null}]);
    box.innerHTML = rows.map(exerciseRowHtml).join('');
    $$('[data-exercise-row]', box).forEach(refreshSetRow);
    $$('[data-exercise-row]', box).filter(node => node.dataset.cardio === '1').forEach(node => refreshCardioPace(node));
    renderTrainingPresets();
    const tag = $('#training-tag');
    if (tag) tag.textContent = exercises.length ? `${TRAINING_TEMPLATES[template]} · ${exercises.length} 个动作` : row?.training === true ? '已练 · 动作未填' : '未记录';
  }
  /** 照上一次训练预填表单（只改草稿，不落库）；主流健身 App 都靠这一下省掉重复输入。 */
  function repeatLastTraining() {
    const sessions = (state.habits || [])
      .filter(row => row && row.date < activeDate && Array.isArray(row.exercises) && row.exercises.length)
      .sort((a, b) => String(b.date).localeCompare(String(a.date)));
    if (!sessions.length) { notice('还没有可照抄的训练记录，先记一次。'); return; }
    const last = sessions[0];
    renderTrainingLog(last.exercises.map(item => ({name: item.name, sets: item.sets, reps: item.reps, weight: item.weight, distanceKm: item.distanceKm, durationMin: item.durationMin})));
    notice(`已照 ${last.date.slice(5)} 的训练填好；核对实际组次后点「保存训练」。`);
    $('#training-form')?.scrollIntoView({block: 'start', behavior: 'smooth'});
  }
  function readTrainingExercises() {
    const box = $('#training-exercises');
    // 2026-11-17：有氧动作终于有输入框了（距离 / 时长），不再靠「与上次记录对位继承」。
    return [...box.querySelectorAll('[data-exercise-row]')].map(row => {
      const name = $('[data-exercise="name"]', row).value.trim().slice(0, 60);
      // 没有 id 说明是新加的一行，给它一个，后续对位就靠它。
      const id = row.dataset.exerciseId || ((typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : 'ex-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8));
      if (row.dataset.cardio === '1') {
        return {id, name, cardio: true, distanceKm: number($('[data-cardio="distance"]', row)?.value), durationMin: number($('[data-cardio="minutes"]', row)?.value), sets: 0, reps: null, weight: null, setDetails: []};
      }
      const setDetails = $$('[data-set-row]', row).map(set => ({
        reps: number($('[data-set="reps"]', set).value),
        weight: number($('[data-set="weight"]', set).value)
      }));
      const weights = setDetails.map(set => set.weight).filter(value => value !== null);
      return {id, name, setDetails, sets: setDetails.length, reps: setDetails[0] ? setDetails[0].reps : null, weight: weights.length ? Math.max(...weights) : null};
    }).filter(item => item.name || item.distanceKm !== null || item.durationMin !== null || item.setDetails.some(set => set.reps !== null || set.weight !== null));
  }
  function trainingVolumeOf(items) {
    let volume = 0;
    for (const item of (items || [])) {
      if (Array.isArray(item.setDetails) && item.setDetails.length) {
        for (const set of item.setDetails) {
          const reps = number(set.reps), weight = number(set.weight);
          if (reps !== null && weight !== null && weight > 0) volume += reps * weight;
        }
      } else {
        const sets = number(item.sets), reps = number(item.reps), weight = number(item.weight);
        if (sets !== null && reps !== null && weight !== null && weight > 0) volume += sets * reps * weight;
      }
    }
    return Math.round(volume);
  }
  /** 保存后的课后总结：容量、组数、和上次比、下次怎么做；不打断操作，放在表单下方。 */
  function renderTrainingSummary(items) {
    const box = $('#training-summary');
    if (!box) return;
    const volume = trainingVolumeOf(items);
    const sets = (items || []).reduce((sum, item) => sum + (Array.isArray(item.setDetails) ? item.setDetails.length : (number(item.sets) || 0)), 0);
    const previous = (state.habits || [])
      .filter(row => row && row.date < activeDate && Array.isArray(row.exercises) && row.exercises.length)
      .sort((a, b) => String(b.date).localeCompare(String(a.date)))[0];
    const before = previous ? trainingVolumeOf(previous.exercises) : null;
    const delta = before === null ? null : volume - before;
    const next = delta === null ? '下次同动作先持平，把每组次数做满。'
      : delta >= 0 ? '下次同动作试 +2.5 kg，或最后一组 +1 次。'
      : '这次容量低于上次；下次先把动作做满，不急着加重。';
    const runs = (items || []).filter(item => item && item.cardio);
    const runKm = runs.reduce((sum, item) => sum + (number(item.distanceKm) || 0), 0);
    const runMin = runs.reduce((sum, item) => sum + (number(item.durationMin) || 0), 0);
    box.innerHTML = `<p class="plan-label">本次训练</p><div class="overview-grid"><div class="overview-stat"><small>容量</small><strong>${fmt(volume, 0)}<span> kg</span></strong></div>`
      + `<div class="overview-stat"><small>组数</small><strong>${sets}<span> 组</span></strong></div>`
      + `<div class="overview-stat"><small>对比上次</small><strong>${delta === null ? '首次' : (delta >= 0 ? '+' : '') + fmt(delta, 0)}<span>${delta === null ? '' : ' kg'}</span></strong></div></div>`
      + (runs.length ? `<p class="fine-print">有氧：${runKm ? fmt(runKm, 1) + ' km' : ''}${runKm && runMin ? ' · ' : ''}${runMin ? fmt(runMin, 0) + ' 分钟' : ''}</p>` : '')
      + `<p class="fine-print">${next}</p>`;
    box.hidden = false;
  }
  /** Saves the log onto the day's habit row, preserving every other field it already carries. */
  async function saveTrainingLog() {
    const form = $('#training-form'), message = $('.form-feedback', form), button = $('button[type=submit]', form);
    const exercises = readTrainingExercises();
    // 力量行仍要求每组次数与负重；有氧行只要距离或时长（2026-11-17 起跑步能单独记）。
    const invalid = exercises.find(item => {
      if (!item.name) return true;
      if (item.cardio) return !(number(item.distanceKm) > 0 || number(item.durationMin) > 0);
      return !item.setDetails.length || item.setDetails.some(set => set.reps === null || set.weight === null);
    });
    if (invalid) {
      const row = $$('[data-exercise-row]', form).find(node => {
        const name = $('[data-exercise="name"]', node).value.trim();
        if (!name) return true;
        if (node.dataset.cardio === '1') {
          return !(number($('[data-cardio="distance"]', node)?.value) > 0 || number($('[data-cardio="minutes"]', node)?.value) > 0);
        }
        const sets = $$('[data-set-row]', node);
        return !sets.length || sets.some(set => number($('[data-set="reps"]', set).value) === null || number($('[data-set="weight"]', set).value) === null);
      });
      const cardio = row?.dataset.cardio === '1';
      const missing = !row ? []
        : cardio
          ? $$('[data-cardio="distance"], [data-cardio="minutes"]', row).filter(field => !(number(field.value) > 0))
          : $$('[data-set="reps"], [data-set="weight"]', row).filter(field => number(field.value) === null);
      if (cardio) missing.forEach(field => markFieldInvalid(field, '至少填距离或时长。'));
      else missing.forEach(field => markFieldInvalid(field, '请补全这一组。'));
      feedback(message, cardio
        ? '有氧动作至少填距离或时长；不想记的动作请先移除。'
        : '每个动作至少一组，每组都要填次数与负重；自重动作负重填 0，不想记的动作请先移除。', true);
      missing[0]?.focus();
      return;
    }
    if (!exercises.length) {feedback(message, '还没有动作可保存；可以先用「清空今天的训练」。', true); return;}
    if (button.disabled) return;
    button.disabled = true;
    feedback(message, '正在保存训练…');
    try {
      const existing = habitRowFor(activeDate) || {};
      await api('/api/habits', {...existing, date: activeDate, training: true, template: form.elements.template.value, exercises,
        ...(exerciseVolume(exercises[0]) === null ? {} : {})});
      await loadState({quiet: true});
      feedback(message, `已保存 ${exercises.length} 个动作。`);
      renderTrainingLog();
      renderTrainingSummary(exercises);
    } catch (error) {feedback(message, error.message, true);}
    finally {button.disabled = false;}
  }
  /** Weekly volume per exercise, newest week first, using ISO weeks (Monday start). */
  function weeklyVolume() {
    const byExercise = new Map();
    for (const row of (state.habits || [])) {
      if (!row || !Array.isArray(row.exercises) || !validDate(row.date)) continue;
      const date = new Date(`${row.date}T00:00:00`);
      if (Number.isNaN(date.getTime())) continue;
      const monday = new Date(date);
      monday.setDate(date.getDate() - ((date.getDay() + 6) % 7));
      const week = localDate(monday);
      for (const item of row.exercises) {
        const name = String(item?.name ?? '').trim();
        // 2026-11-17：与训练概览同口径——有 setDetails 按逐组算，旧记录退回 sets×reps×weight。
        const volume = trainingVolumeOf([item]);
        if (!name || volume === null) continue;
        if (!byExercise.has(name)) byExercise.set(name, new Map());
        const weeks = byExercise.get(name);
        weeks.set(week, (weeks.get(week) || 0) + volume);
      }
    }
    const out = [];
    for (const [name, weeks] of byExercise) {
      const ordered = [...weeks.entries()].sort((a, b) => a[0].localeCompare(b[0]));
      if (ordered.length < 2) continue;
      const [lastWeek, lastVolume] = ordered[ordered.length - 1];
      const [prevWeek, prevVolume] = ordered[ordered.length - 2];
      out.push({name, lastWeek, lastVolume, prevWeek, prevVolume, delta: lastVolume - prevVolume});
    }
    return out.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta) || b.lastVolume - a.lastVolume).slice(0, 6);
  }
  function renderVolumeTable() {
    const box = $('#volume-table');
    if (!box) return;
    const rows = weeklyVolume();
    if (!rows.length) {
      box.innerHTML = '<p class="fine-print">还不足以比较：同一动作至少需要两周的训练记录（趋势页按周一为一周起点）。</p>';
      return;
    }
    box.innerHTML = '<table class="stats-table"><caption class="fine-print">容量 = 组数 × 次数 × 负重；只比较你自己记录过的同一动作。</caption>'
      + '<thead><tr><th scope="col">动作</th><th scope="col">' + esc(String(rows[0].prevWeek).slice(5)) + ' 周</th><th scope="col">' + esc(String(rows[0].lastWeek).slice(5)) + ' 周</th><th scope="col">变化</th></tr></thead><tbody>'
      + rows.map(row => `<tr><td>${esc(row.name)}</td><td class="num">${fmt(row.prevVolume, 0)} <small>kg</small></td><td class="num">${fmt(row.lastVolume, 0)} <small>kg</small></td><td><span class="stats-trend" style="color:${volumeColor(row.delta, row.prevVolume)}">${row.delta >= 0 ? '+' : ''}${fmt(row.delta, 0)} <small>kg</small></span></td></tr>`).join('')
      + '</tbody></table>';
  }
/**
 * 用量与余额：只统计 token，不记录问题与回答。
 *
 * 账本由原生侧在每次调用后追加（/api/usage），金额在这里按可改单价估算；
 * 余额走 /api/balance（目前只实现 DeepSeek），充值只打开服务商控制台，不在应用内收款。
 */
  const USAGE_PRICE_KEY = 'qingheng.usagePrice';
  function usagePrice() {
    try {
      const raw = JSON.parse(localStorage.getItem(USAGE_PRICE_KEY) || 'null');
      return {in: Number(raw && raw.in) >= 0 ? Number(raw.in) : 2, out: Number(raw && raw.out) >= 0 ? Number(raw.out) : 8};
    } catch { return {in: 2, out: 8}; }
  }
  function saveUsagePrice(price) {
    try { localStorage.setItem(USAGE_PRICE_KEY, JSON.stringify(price)); } catch { }
  }
  function usageDayKey(time) {
    const d = new Date(Number(time) || Date.now());
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function usageTokens(n) {
    const value = Number(n) || 0;
    if (value >= 1000000) return (value / 1000000).toFixed(2) + 'M';
    if (value >= 1000) return (value / 1000).toFixed(1) + 'k';
    return String(Math.round(value));
  }
  function usageMoney(rows, price) {
    const tokensIn = rows.reduce((sum, row) => sum + (Number(row.in) || 0), 0);
    const tokensOut = rows.reduce((sum, row) => sum + (Number(row.out) || 0), 0);
    const cost = tokensIn / 1e6 * price.in + tokensOut / 1e6 * price.out;
    return {tokensIn, tokensOut, tokens: tokensIn + tokensOut, cost};
  }
  function usageMoneyText(cost) {
    if (!(cost > 0)) return '¥0.00';
    return '¥' + (cost < 0.01 ? cost.toFixed(4) : cost.toFixed(2));
  }
  function renderUsagePanel(data) {
    const rows = Array.isArray(data && data.log) ? data.log : [];
    const price = usagePrice();
    const today = usageDayKey(Date.now());
    const month = today.slice(0, 7);
    const todayRows = rows.filter(row => usageDayKey(row.t) === today);
    const monthRows = rows.filter(row => usageDayKey(row.t).slice(0, 7) === month);
    const d1 = usageMoney(todayRows, price), d2 = usageMoney(monthRows, price);
    const set = (id, text) => { const node = $('#' + id); if (node) node.textContent = text; };
    set('usage-today', usageTokens(d1.tokens) + ' tokens');
    set('usage-today-cost', usageMoneyText(d1.cost) + ' · ' + todayRows.length + ' 次');
    set('usage-month', usageTokens(d2.tokens) + ' tokens');
    set('usage-month-cost', usageMoneyText(d2.cost) + ' · ' + monthRows.length + ' 次');
    const tag = $('#usage-tag');
    if (tag) tag.textContent = (data && data.provider) === 'deepseek' ? 'DeepSeek' : (data && data.provider) || '本机';
  }
  async function refreshUsage() {
    try {
      const data = await api('/api/usage');
      renderUsagePanel(data);
    } catch (error) {
      const note = $('#usage-note');
      if (note) note.textContent = '用量账本暂时读不到：' + (error && error.message ? error.message : '未知错误');
    }
  }
  async function refreshBalance() {
    const node = $('#usage-balance'), note = $('#usage-balance-note');
    if (node) node.textContent = '查询中…';
    try {
      const data = await api('/api/balance');
      const money = data && data.total ? String(data.total) : '—';
      if (node) node.textContent = money;
      if (note) note.textContent = data && data.total
        ? ((data.currency || '') + ' · 可用余额，服务商为准') : '没有返回余额字段';
    } catch (error) {
      if (node) node.textContent = '—';
      if (note) note.textContent = (error && error.message ? error.message : '余额查询失败');
    }
  }
  function installUsagePanel() {
    const card = $('#usage-card');
    if (!card || card.dataset.wired) return;
    card.dataset.wired = '1';
    const price = usagePrice();
    const pin = $('#price-in'), pout = $('#price-out');
    if (pin) pin.value = String(price.in);
    if (pout) pout.value = String(price.out);
    const savePrice = () => {
      const next = {in: Math.max(0, Number(pin && pin.value) || 0), out: Math.max(0, Number(pout && pout.value) || 0)};
      saveUsagePrice(next);
      refreshUsage();
    };
    if (pin) pin.addEventListener('change', savePrice);
    if (pout) pout.addEventListener('change', savePrice);
    const refresh = $('#usage-refresh');
    if (refresh) refresh.addEventListener('click', () => { refreshBalance(); refreshUsage(); });
    const topup = $('#usage-topup');
    if (topup) topup.addEventListener('click', () => {
      const url = 'https://platform.deepseek.com/top_up';
      if (window.QinghengNative && typeof window.QinghengNative.openExternal === 'function') {
        if (!window.QinghengNative.openExternal(url)) notice('打不开浏览器，请手动访问 platform.deepseek.com', true);
      } else {
        window.open(url, '_blank');
      }
    });
    const clear = $('#usage-clear');
    if (clear) clear.addEventListener('click', async () => {
      const go = await askConfirm('清空本机的用量账本？只删 token 记录，不影响任何饮食或训练数据。', {title: '清空用量', ok: '清空', cancel: '先不清'});
      if (!go) return;
      try { await api('/api/usage', {}); } catch (error) { notice('清空失败：' + (error && error.message ? error.message : '未知错误'), true); return; }
      refreshUsage();
      notice('已清空用量账本。');
    });
    document.addEventListener('click', event => {
      if (event.target.closest && event.target.closest('[data-subpage-open="model"]')) {
        setTimeout(() => { refreshUsage(); refreshBalance(); }, 50);
      }
    });
    refreshUsage();
  }
/* Fragment of assets/app.js -- assembled by tools/assemble-app.ps1 in filename order.
 * Edit this file, never the generated assets/app.js; tests/app-fragments.test.mjs fails on drift. */
  /** "Today's three things" card: training, cooking oil and weight in one submit. */
  /** Strength movements worth recognising without a model. */
  const DRAFT_MOVES = ['卧推', '上斜卧推', '哑铃卧推', '深蹲', '硬拉', '罗马尼亚硬拉', '腿举', '划船', '杠铃划船', '哑铃划船',
    '引体向上', '高位下拉', '肩推', '推举', '侧平举', '弯举', '面拉', '绳索下压', '双杠臂屈伸', '腿弯举', '腿屈伸', '提踵', '卷腹', '平板支撑'];
  /** Training drafts are parsed by parseDraft + the parseTrainingDraft wrapper further down this fragment. */

  function renderTrainingDraft(draft) {
    const box = $('#chat-training-draft');
    if (!box) return;
    if (!draft) { box.hidden = true; box.innerHTML = ''; return; }
    const missing = draft.missing.length
      ? '<p class="fine-print">还缺：' + esc(draft.missing.join('、')) + '。可以先写入，稍后在训练日志里补；也可以点「补充信息」再改这句描述。</p>'
      : '<p class="fine-print">信息齐全，确认后会写入当天的训练记录。</p>';
    box.hidden = false;
    box.innerHTML = `<div class="card training-draft"><div class="card-heading"><h2>识别到训练草稿</h2><span class="tag">待确认</span></div>`
      + `<p><strong>${esc(draft.date)}</strong> · ${esc(draftSummary(draft))}</p>` + missing
      + `<div class="button-row"><button type="button" class="button primary" data-draft-confirm="1">写入记录</button>`
      + `<button type="button" class="button subtle" data-draft-cancel="1">取消</button></div></div>`;
  }

  // ---------------------------------------------------------------------------------------------
  // 纯函数：通用草稿、每日体检、负荷与平台期、周计划
  // ---------------------------------------------------------------------------------------------

  const DRAFT_KINDS = {training: '训练', weight: '体重', sleep: '睡眠', steps: '步数', water: '饮水', plan: '计划'};

  /**
   * One sentence -> one draft. Recognises training, weight, sleep, steps and water.
   * Returns {kind, date, rows, missing, payload} or null. Pure: no DOM, no state.
   */
  function parseDraft(text, baseDate) {
    const raw = String(text || '').trim();
    if (!raw) return null;
    const pad2 = n => String(n).padStart(2, '0');
    const shift = (day, delta) => {
      const [y, m, d] = String(day).split('-').map(Number);
      const date = new Date(y, m - 1, d + delta);
      return date.getFullYear() + '-' + pad2(date.getMonth() + 1) + '-' + pad2(date.getDate());
    };
    const today = /^\d{4}-\d{2}-\d{2}$/.test(String(baseDate || '')) ? baseDate : new Date().toISOString().slice(0, 10);
    let date = today;
    const explicit = raw.match(/(\d{4})[\-\/](\d{1,2})[\-\/](\d{1,2})/) || raw.match(/(\d{1,2})月(\d{1,2})[日号]?/);
    if (explicit) {
      const year = explicit[3] ? Number(explicit[1]) : Number(today.slice(0, 4));
      const month = explicit[3] ? Number(explicit[2]) : Number(explicit[1]);
      const day = explicit[3] ? Number(explicit[3]) : Number(explicit[2]);
      if (month >= 1 && month <= 12 && day >= 1 && day <= 31) date = year + '-' + pad2(month) + '-' + pad2(day);
    } else if (/大前天/.test(raw)) date = shift(today, -3);
    else if (/前天/.test(raw)) date = shift(today, -2);
    else if (/昨天|昨晚|昨日/.test(raw)) date = shift(today, -1);

    const planned = /(打算|计划|准备|明天|后天|下周|要不要|该不该|想做)/.test(raw);

    // --- plain measurements ---------------------------------------------------------------------
    const weight = raw.match(/(\d{2,3}(?:\.\d)?)\s*(?:kg|公斤|千克)/);
    if (weight && /(体重|称了|称重|重量)/.test(raw) && !/(跑了|跑步|卧推|深蹲|硬拉|引体)/.test(raw)) {
      const value = Number(weight[1]);
      if (value >= 20 && value <= 400) return {kind: 'weight', date, rows: [{label: '体重', value: value + ' kg'}], missing: [], payload: {weight: value}};
    }
    const sleep = raw.match(/(\d+(?:\.\d+)?)\s*(?:个)?(?:小时|h|H)/);
    if (sleep && /(睡|睡眠)/.test(raw)) {
      const value = Number(sleep[1]);
      if (value > 0 && value <= 24) return {kind: 'sleep', date, rows: [{label: '睡眠', value: value + ' 小时'}], missing: [], payload: {sleep: value}};
    }
    const steps = raw.match(/(\d{3,6})\s*步/);
    if (steps) return {kind: 'steps', date, rows: [{label: '步数', value: Number(steps[1]).toLocaleString() + ' 步'}], missing: [], payload: {steps: Number(steps[1])}};
    const water = raw.match(/(\d+(?:\.\d+)?)\s*(?:升|L|l|毫升|ml|ML)/);
    if (water && /(喝|饮水|水)/.test(raw)) {
      const isMl = /毫升|ml|ML/.test(water[0]);
      const value = isMl ? Number(water[1]) / 1000 : Number(water[1]);
      if (value > 0 && value <= 10) return {kind: 'water', date, rows: [{label: '饮水', value: value.toFixed(1) + ' L'}], missing: [], payload: {water: Math.round(value * 1000)}};
    }

    // --- training -------------------------------------------------------------------------------
    const runWord = /(跑步|慢跑|跑了|晨跑|夜跑|快走|跑完)/.test(raw);
    const moveHit = DRAFT_MOVES.find(name => raw.includes(name)) || '';
    const strengthWord = /(组|次|kg|公斤|千克|举|推|拉|蹲)/.test(raw);
    if (!runWord && !moveHit && !/(练了|训练了|做了)/.test(raw)) {
      if (!(strengthWord && /组|kg|公斤/.test(raw))) return null;
    }
    const exercises = [];
    const rows = [];
    const missing = [];
    if (runWord) {
      const distance = raw.match(/(\d+(?:\.\d+)?)\s*(?:km|KM|Km|公里|千米)/);
      const minutes = raw.match(/(\d+)\s*(?:分钟|min)/);
      const clock = raw.match(/(\d{1,2}):(\d{2})/);
      const item = {name: '跑步', sets: null, reps: null, weight: null, distanceKm: distance ? Number(distance[1]) : null,
        durationMin: minutes ? Number(minutes[1]) : clock ? Number(clock[1]) * 60 + Number(clock[2]) : null};
      exercises.push(item);
      if (item.distanceKm === null) missing.push('距离（km）');
      if (item.durationMin === null) missing.push('时长（分钟）');
      rows.push({label: '跑步', value: [item.distanceKm !== null ? item.distanceKm + ' km' : '待补距离', item.durationMin !== null ? item.durationMin + ' 分钟' : '待补时长'].join(' · ')});
    }
    if (moveHit) {
      const clauses = raw.split(/[，,；;。、]/).filter(Boolean);
      for (const clause of clauses) {
        const name = DRAFT_MOVES.find(move => clause.includes(move));
        if (!name) continue;
        const sets = clause.match(/(\d+)\s*组/);
        const reps = clause.match(/(\d+)\s*[次下个]/);
        const weightHit = clause.match(/(\d+(?:\.\d+)?)\s*(?:kg|KG|Kg|公斤|千克)/);
        const item = {name, sets: sets ? Number(sets[1]) : null, reps: reps ? Number(reps[1]) : null,
          weight: weightHit ? Number(weightHit[1]) : null, distanceKm: null, durationMin: null};
        exercises.push(item);
        if (!sets || !reps) missing.push(name + ' 的组数/次数');
        rows.push({label: name, value: [item.sets !== null ? item.sets + ' 组' : '待补组数', item.reps !== null ? '× ' + item.reps + ' 次' : '待补次数', item.weight !== null ? item.weight + ' kg' : ''].filter(Boolean).join(' ')});
      }
    }
    if (!exercises.length) return null;
    if (planned && !/今天|昨天|前天|\d/.test(raw)) return null;
    const template = /(腿|深蹲|硬拉|提踵|腿举)/.test(raw) ? 'legs' : /(拉|划船|引体|下拉|弯举)/.test(raw) ? 'pull' : /(推|卧推|肩推|侧平举)/.test(raw) ? 'push' : 'other';
    return {kind: 'training', date, rows, missing, payload: {template, exercises}};
  }

  /** The one live parser: a training-only view over parseDraft; call sites and tests rely on the {payload:{exercises}} shape. */
  function parseTrainingDraft(text, baseDate) {
    const draft = parseDraft(text, baseDate);
    return draft && draft.kind === 'training' ? draft : null;
  }

  function draftSummary(draft) {
    if (!draft) return '';
    return (draft.rows || []).map(row => row.label + ' ' + row.value).join('；');
  }

  /**
   * 每日体检评分（2026-11-03 重构）：训练不再计分，按证据强度给四项加权。
   * 热量 30（总摄入是体重管理的主变量）、蛋白质 30（保肌的第一优先级）、
   * 脂肪 20（最容易超的一项）、睡眠 20（恢复与食欲调节）。
   * 未记录的项不计入分母——缺数据不等于差，只报「已评 n/4」，避免半天空表也算低分。
   * Inputs are passed in so the rule engine can be tested without the app.
   */
  const DAILY_CHECK_WEIGHTS = {calories: 30, protein: 30, fat: 20, sleep: 20};
  /**
   * 放松日判定（不落库，纯推导）：
   * 热量超区间上限 12% 或脂肪超上限 20%，且当天至少两餐、不是吃太少；
   * 同一自然周只认一天——更早已经有放松日，今天就算第二次超量，不再享受。
   */
  const RELAX_TAG = 'qingheng.relaxDay';
  function relaxDayInfoFor(date) {
    const meals = (state.meals || []).filter(row => row && row.date === date);
    const range = intakeRangeForDate(date);
    const profile = effectiveProfileForDate(date);
    const fatMax = number(profile.fatMax);
    let calories = 0, fat = 0;
    for (const meal of meals) {
      const totals = meal && meal.totals ? meal.totals : meal;
      calories += Number(totals?.calories ?? 0) || 0;
      fat += Number(totals?.fat ?? 0) || 0;
    }
    const overKcal = range && number(range.max) ? calories - Number(range.max) : 0;
    const overFat = fatMax ? fat - fatMax : 0;
    const bigKcal = range && number(range.max) && calories >= Number(range.max) * 1.12;
    const bigFat = fatMax && fat >= fatMax * 1.2;
    const qualifies = meals.length >= 2 && !!(bigKcal || bigFat) && !(range && calories < Number(range.min || 0));
    if (!qualifies) return {relax: false, calories, fat, overKcal: Math.max(0, overKcal), overFat: Math.max(0, overFat)};
    // 本周（周一~周日）里比这天更早的符合条件日：有则说明本周额度已用掉。
    const start = shiftDay(date, -((weekdayIndex(date) + 6) % 7));
    const earlier = [];
    for (let i = 0; i < 7; i++) {
      const day = shiftDay(start, i);
      if (day >= date) break;
      const rows = (state.meals || []).filter(row => row && row.date === day);
      if (rows.length < 2) continue;
      const r = intakeRangeForDate(day);
      const pf = effectiveProfileForDate(day);
      const fm = number(pf.fatMax);
      let c = 0, f = 0;
      for (const meal of rows) {
        const t = meal && meal.totals ? meal.totals : meal;
        c += Number(t?.calories ?? 0) || 0;
        f += Number(t?.fat ?? 0) || 0;
      }
      if (r && number(r.max) && c >= Number(r.max) * 1.12 && c >= Number(r.min || 0)) earlier.push(day);
      else if (fm && f >= fm * 1.2 && r && number(r.max) && c >= Number(r.min || 0)) earlier.push(day);
    }
    const used = earlier.length > 0;
    return {relax: !used, used, earlier, calories, fat, overKcal: Math.max(0, overKcal), overFat: Math.max(0, overFat)};
  }
  function dailyCheck(input) {
    const src = input || {};
    const meals = src.meals || [], habit = src.habit || {}, range = src.range || null;
    const relax = src.relax === true;
    const sum = meals.reduce((acc, meal) => {
      const totals = meal && meal.totals ? meal.totals : (meal || {});
      for (const key of ['calories', 'protein', 'fat', 'carbs']) acc[key] += Number(totals[key] ?? 0) || 0;
      return acc;
    }, {calories: 0, protein: 0, fat: 0, carbs: 0});
    const items = [];
    const clamp01 = value => Math.max(0, Math.min(1, value));
    const hasMeals = sum.calories > 0;
    if (range && Number.isFinite(range.min) && Number.isFinite(range.max)) {
      const distance = sum.calories < range.min ? range.min - sum.calories : sum.calories > range.max ? sum.calories - range.max : 0;
      // 按偏离目标的百分比给分：≤3% 满分，5% 0.9，10% 0.75，20% 0.5，35% 0.25，再远 0。
      const reference = Math.max(1, sum.calories > range.max ? range.max : range.min);
      const deviation = distance / reference;
      const calScore = deviation === 0 ? 1 : deviation <= 0.03 ? 1 : deviation <= 0.05 ? 0.9 : deviation <= 0.1 ? 0.75 : deviation <= 0.2 ? 0.5 : deviation <= 0.35 ? 0.25 : 0;
      items.push({key: 'calories', label: '热量', value: Math.round(sum.calories), target: range.min + '~' + range.max,
        weight: DAILY_CHECK_WEIGHTS.calories, evaluated: hasMeals,
        ok: distance === 0, score: calScore,
        state: relax || !hasMeals ? 'idle' : (sum.calories < range.min ? 'low' : sum.calories > range.max ? 'high' : undefined)});
    }
    if (Number.isFinite(src.proteinMin) && src.proteinMin > 0) {
      items.push({key: 'protein', label: '蛋白质', value: Math.round(sum.protein), target: Math.round(src.proteinMin) + 'g 起',
        weight: DAILY_CHECK_WEIGHTS.protein, evaluated: hasMeals,
        ok: sum.protein >= src.proteinMin, score: clamp01(sum.protein / src.proteinMin),
        state: !hasMeals ? 'idle' : (sum.protein < src.proteinMin ? 'low' : undefined)});
    }
    if (Number.isFinite(src.fatMin) && Number.isFinite(src.fatMax)) {
      const distance = sum.fat < src.fatMin ? src.fatMin - sum.fat : sum.fat > src.fatMax ? sum.fat - src.fatMax : 0;
      const span = sum.fat > src.fatMax ? Math.max(10, src.fatMax) : Math.max(10, src.fatMin || 10);
      items.push({key: 'fat', label: '脂肪', value: Math.round(sum.fat), target: Math.round(src.fatMin) + '~' + Math.round(src.fatMax) + 'g',
        weight: DAILY_CHECK_WEIGHTS.fat, evaluated: hasMeals,
        ok: distance === 0, score: distance === 0 ? 1 : clamp01(1 - distance / span),
        state: relax || !hasMeals ? 'idle' : (sum.fat > src.fatMax ? 'high' : sum.fat < src.fatMin ? 'low' : undefined)});
    }
    // 睡眠：7 小时满档；6–7 线性 0.7→1；4–6 线性 0.25→0.7；4 以下 0.1。未记录不计分。
    const sleep = Number(habit.sleep);
    const sleepKnown = Number.isFinite(sleep) && sleep > 0;
    const sleepScore = !sleepKnown ? 0 : sleep >= 7 ? 1 : sleep >= 6 ? 0.7 + (sleep - 6) * 0.3 : sleep >= 4 ? 0.25 + (sleep - 4) * 0.225 : 0.1;
    items.push({key: 'sleep', label: '睡眠', value: sleepKnown ? sleep + ' 小时' : '未记录', target: '7 小时起',
      weight: DAILY_CHECK_WEIGHTS.sleep, evaluated: sleepKnown,
      ok: sleepKnown && sleep >= 7, score: sleepScore, state: sleepKnown ? undefined : 'idle'});

    const scored = items.filter(item => item.evaluated);
    const weightSum = scored.reduce((acc, item) => acc + item.weight, 0);
    const score = weightSum > 0 ? Math.round(scored.reduce((acc, item) => acc + item.score * item.weight, 0) / weightSum * 100) : null;
    const coverage = Math.round(weightSum / Object.values(DAILY_CHECK_WEIGHTS).reduce((a, b) => a + b, 0) * 100);

    let worst = null, best = null;
    for (const item of scored) {
      if (!worst || item.score < worst.score) worst = item;
      if (!best || item.score > best.score) best = item;
    }
    // 一句评价：先给结论，再说哪一项差多少，最后给一句人话。不用「明显偏了」这类判断词。
    let verdict = '还没有可评的记录：先记一餐和睡眠，我再帮你算。';
    if (score !== null) {
      const band = score >= 85 ? '今天整体到位' : score >= 70 ? '今天整体还不错' : score >= 50 ? '今天有几项没跟上' : '今天缺口比较大';
      const gapOf = item => {
        if (item.key === 'calories' && range) return item.value < range.min
          ? `热量还差 ${Math.round(range.min - item.value)} kcal`
          : `热量超了 ${Math.round(item.value - range.max)} kcal`;
        if (item.key === 'protein') return `蛋白还差 ${Math.max(0, Math.round((src.proteinMin || 0) - item.value))} g`;
        if (item.key === 'fat') return item.value > (src.fatMax || 0)
          ? `脂肪超了 ${Math.round(item.value - (src.fatMax || 0))} g`
          : `脂肪少了 ${Math.round((src.fatMin || 0) - item.value)} g`;
        if (item.key === 'sleep') return `睡眠只有 ${item.value}（建议 7 小时以上）`;
        return `${item.label}还差一点`;
      };
      const good = scored.filter(item => item.ok).map(item => item.label);
      const goodPart = good.length ? `${good.slice(0, 2).join('和')}在区间内` : '还没有一项完全在区间内';
      const worstPart = worst && !worst.ok ? gapOf(worst) : '';
      verdict = worstPart
        ? `${band}：${goodPart}，${worstPart}，先补这一项。`
        : `${band}：${goodPart}。`;
      const missing = items.length - scored.length;
      if (missing > 0) verdict += `还有 ${missing} 项没记录，记了才评得准。`;
    }
    let action = '今天的记录都在区间内，保持就好。';
    if (worst) {
      const proteinGap = Math.max(0, Math.round((src.proteinMin || 0) - sum.protein));
      if (worst.key === 'calories' && range && sum.calories > range.max) action = '热量超上限 ' + Math.round(sum.calories - range.max) + ' kcal：晚餐只吃蛋白 + 蔬菜，不再加主食。';
      else if (worst.key === 'calories' && range && sum.calories < range.min) action = '还差 ' + Math.round(range.min - sum.calories) + ' kcal：加一份主食配一个蛋白来源。';
      else if (worst.key === 'protein') action = '优先补蛋白：还差 ' + proteinGap + ' g，下一餐先吃蛋白质。';
      else if (worst.key === 'fat' && src.fatMax) action = '脂肪超 ' + Math.round(Math.max(0, sum.fat - src.fatMax)) + ' g：之后改白灼/清蒸，少油。';
      else if (worst.key === 'sleep') action = '睡眠 ' + (worst.value === '未记录' ? '没记录' : worst.value) + '：今天训练强度降 10%，别加组。';
    }
    if (relax) {
      verdict = '今天是本周的放松日：吃得比目标多一些，属于计划内，不算失败。';
      action = '明后两天照常吃就行，不要用少吃或加练去「补回来」——那样更容易在周末反弹。';
    }
    return {items, worst, best, action, verdict, score, coverage, relax, weights: DAILY_CHECK_WEIGHTS, totals: {calories: Math.round(sum.calories), protein: Math.round(sum.protein), fat: Math.round(sum.fat), carbs: Math.round(sum.carbs)}};
  }
  /**
   * Acute:chronic workload ratio from daily loads. ratio > 1.5 = spike, < 0.8 = detraining.
   * loads: [{date:'YYYY-MM-DD', load:number}] (load = 组×次×负重, or run minutes×6).
   */
  function acwrFromDailyLoads(loads, today) {
    const rows = (loads || []).filter(row => row && Number.isFinite(Number(row.load)));
    if (!rows.length || !/^\d{4}-\d{2}-\d{2}$/.test(String(today || ''))) return null;
    const dayTime = day => new Date(day + 'T00:00:00').getTime();
    const base = dayTime(today);
    const within = days => rows.filter(row => base - dayTime(row.date) < days * 86400000 && dayTime(row.date) <= base);
    const acute = within(7).reduce((acc, row) => acc + Number(row.load), 0);
    const chronicTotal = within(28).reduce((acc, row) => acc + Number(row.load), 0);
    const chronic = chronicTotal / 4;
    if (chronic <= 0) return {acute, chronic, ratio: null, flag: 'none', days: within(7).length};
    const ratio = acute / chronic;
    const flag = ratio > 1.5 ? 'high' : ratio < 0.8 ? 'low' : 'ok';
    return {acute, chronic, ratio: Math.round(ratio * 100) / 100, flag, days: within(7).length};
  }

  /**
   * Plateau: three weekly means and the last two barely differ.
   * weekly: [{week:'YYYY-MM-DD', mean:number}] sorted oldest first.
   */
  function plateauFromWeekly(weekly) {
    const rows = (weekly || []).filter(row => row && Number.isFinite(Number(row.mean)));
    if (rows.length < 3) return null;
    const last3 = rows.slice(-3);
    const span = Math.abs(last3[2].mean - last3[0].mean);
    return {weeks: 3, span: Math.round(span * 100) / 100, plateau: span < 0.2,
      from: last3[0].week, to: last3[2].week, mean: last3[2].mean};
  }

  /**
   * 把建议重量落到健身房里装得出来的数：杠铃按 20 kg 空杆 + 每侧 2.5 kg 的整数倍，
   * 哑铃按 2 kg、器械按 5 kg 递增。装不出的数字（如 62.5 kg）比偏轻更伤执行。
   */
  function loadableWeightKg(name, desired) {
    const kg = Number(desired);
    const text = String(name || '');
    if (!Number.isFinite(kg) || kg <= 0) return null;
    if (/(负重)?(引体向上|俯卧撑|平板支撑|卷腹|悬垂举腿|双杠臂屈伸)/.test(text) && !/负重/.test(text)) return null;
    const barbell = /杠铃/.test(text) || (!/(哑铃|器械|绳索|史密斯|龙门)/.test(text)
      && /(卧推|深蹲|硬拉|划船|推举|肩推|罗马尼亚|臀推|臀桥|早安|箭步|实力举|借力推)/.test(text));
    if (barbell) {
      if (kg <= 20) return 20;
      return 20 + Math.max(5, Math.round((kg - 20) / 5) * 5);
    }
    if (/(哑铃|飞鸟|侧平举|前平举|锤式|弯举|保加利亚)/.test(text)) return Math.max(2, Math.round(kg / 2) * 2);
    if (/(器械|绳索|下拉|腿举|腿屈伸|腿弯举|夹胸|史密斯|龙门)/.test(text)) return Math.max(5, Math.round(kg / 5) * 5);
    return Math.round(kg * 2) / 2;
  }

  /**
   * Next week's sessions from the last two weeks per exercise, with a graded progression.
   * lastByExercise: {name: {sets, reps, weight, date}}; acwr flag decides a deload.
   */
  function generateWeekPlan(input) {
    const src = input || {};
    const start = String(src.startDate || '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(start)) return null;
    const pad2 = n => String(n).padStart(2, '0');
    const sessions = Math.max(1, Math.min(6, Number(src.sessions) || 3));
    const templates = ['push', 'pull', 'legs'];
    const rotation = s => {
      const plan = [];
      for (let i = 0; i < s; i++) plan.push(templates[i % 3]);
      return plan;
    };
    // Spread the sessions over the week: Mon/Tue/Thu/Fri/Sat pattern.
    const slots = [[0], [0, 3], [0, 2, 4], [0, 1, 3, 5], [0, 1, 2, 4, 5], [0, 1, 2, 3, 4, 6]][sessions - 1];
    const deload = src.acwrFlag === 'high';
    const lastByExercise = src.lastByExercise || {};
    const byTemplate = {push: [], pull: [], legs: [], other: []};
    for (const [name, row] of Object.entries(lastByExercise)) {
      // A run has duration/distance instead of sets: it is not a lift and must not be scheduled as one.
      if (!row || !Number.isFinite(Number(row.sets)) || row.sets === null) continue;
      if (Number.isFinite(Number(row.durationMin)) || Number.isFinite(Number(row.distanceKm))) continue;
      const template = /(深蹲|硬拉|腿|提踵)/.test(name) ? 'legs' : /(划船|引体|下拉|弯举|面拉)/.test(name) ? 'pull' : /(卧推|肩推|侧平举|下压|臂屈伸)/.test(name) ? 'push' : 'other';
      const weight = Number(row.weight);
      let suggested = Number.isFinite(weight) && weight > 0
        ? Math.round((deload ? weight * 0.9 : weight * 1.025) * 2) / 2
        : null;
      if (suggested !== null) {
        suggested = loadableWeightKg(name, suggested);
        // +2.5% 对轻重量可能落回同一档（60 kg → 61.5 → 装不出 → 60），这时至少进一档，不能原地不动。
        if (!deload && suggested !== null && suggested <= weight) suggested = loadableWeightKg(name, weight + 2.5);
      }
      byTemplate[template].push({name, sets: Math.max(2, Number(row.sets) - (deload ? 1 : 0)), reps: Number(row.reps) || 8, weight: suggested});
    }
    const days = [];
    rotation(sessions).forEach((template, index) => {
      const date = new Date(start + 'T00:00:00');
      date.setDate(date.getDate() + slots[index]);
      // Only that template's own movements: borrowing 跑步 into a 推 day was a real bug.
      let exercises = ((byTemplate[template] || []).slice(0, 5));
      let suggested = false;
      if (!exercises.length) {
        // No history yet: use the community-verified day template (sets / reps / RPE from the digest image),
        // falling back to the plain movement list if the template is missing.
        const day = typeof libraryDayTemplate === 'function' ? libraryDayTemplate(template) : null;
        if (day && day.exercises.length) {
          exercises = day.exercises.map(item => ({name: item.name, sets: item.sets || 3, reps: item.reps || 8,
            weight: null, role: item.role || '', rpe: item.rpe || null}));
          suggested = true;
        } else if (typeof libraryMoves === 'function') {
          exercises = libraryMoves(template).slice(0, 5).map(item => ({name: item.name, sets: item.sets || 3,
            reps: item.reps || 8, weight: null, role: item.role || ''}));
          suggested = exercises.length > 0;
        }
      }
      days.push({date: date.getFullYear() + '-' + pad2(date.getMonth() + 1) + '-' + pad2(date.getDate()),
        template, deload, exercises, suggested});
    });
    // The analysis layer is optional: the generator still works without the library loaded.
    const reasons = typeof planWhy === 'function' ? planWhy({deload, suggested: days.some(day => day.suggested),
      templateId: 'push-day-template'}) : [];
    return {startDate: start, sessions, deload, days, reasons,
      note: deload ? '本周负荷偏高（ACWR > 1.5），按减载周安排：负重 ×0.9、组数 −1。'
        : '按上周重量 +2.5% 安排，重量留空的动作表示上周没记到负重。'};
  }

  /** The model-free one-liner used when a request does not need an LLM at all. */
  function localCoachLine(check) {
    if (!check) return '';
    return check.action || '';
  }

  /** The local library, if present. Everything degrades gracefully without it. */
  /** Every meal: does its stated kcal match its own macros? Plus the daily averages. */
  function dietAudit(days) {
    const rows = [];
    let meals = 0, mismatched = 0, worstGap = 0;
    for (const day of days || []) {
      const list = (state.meals || []).filter(row => row && row.date === day);
      if (!list.length) continue;
      let stated = 0, derived = 0;
      for (const meal of list) {
        meals++;
        const p = number(meal.protein) ?? 0, c = number(meal.carbs) ?? 0, f = number(meal.fat) ?? 0;
        const kcal = number(meal.calories) ?? 0;
        const fromMacros = p * 4 + c * 4 + f * 9;
        stated += kcal; derived += fromMacros;
        const gap = Math.abs(kcal - fromMacros);
        if (gap > Math.max(30, fromMacros * 0.12)) { mismatched++; worstGap = Math.max(worstGap, gap); }
      }
      const totals = totalsFor(list);
      rows.push({date: day, meals: list.length, kcal: Math.round(totals.calories), protein: Math.round(totals.protein),
        fat: Math.round(totals.fat), carbs: Math.round(totals.carbs), statedKcal: Math.round(stated), macroKcal: Math.round(derived)});
    }
    // Per-meal tolerance (12% / 30 kcal) hides a systematic bias: 25 meals each 15 kcal high is
    // 375 kcal a week but never trips the per-meal rule. Compare the weekly totals as well.
    const totalStated = rows.reduce((sum, row) => sum + row.statedKcal, 0);
    const totalMacro = rows.reduce((sum, row) => sum + row.macroKcal, 0);
    const totalGap = totalStated - totalMacro;
    const gapPercent = totalMacro > 0 ? Math.round(totalGap / totalMacro * 1000) / 10 : 0;
    const biased = totalMacro > 0 && Math.abs(totalGap) > Math.max(80, totalMacro * 0.05);
    const average = key => rows.length ? Math.round(rows.reduce((sum, row) => sum + row[key], 0) / rows.length) : 0;
    return {rows, meals, mismatched, worstGap: Math.round(worstGap), days: rows.length,
      totalStated, totalMacro, totalGap: Math.round(totalGap), gapPercent, biased,
      avg: {kcal: average('kcal'), protein: average('protein'), fat: average('fat'), carbs: average('carbs')}};
  }
  function trainingLibrary() {
    const lib = window.TRAINING_PRINCIPLES;
    return lib && Array.isArray(lib.rules) ? lib : null;
  }
  function libraryRule(id) {
    const lib = trainingLibrary();
    return lib ? lib.rules.find(rule => rule.id === id) || null : null;
  }
  function libraryDayTemplate(template) {
    const lib = trainingLibrary();
    const day = lib && lib.dayTemplates ? lib.dayTemplates[template] : null;
    return day && Array.isArray(day.exercises) ? day : null;
  }
  function libraryMoves(template) {
    const lib = trainingLibrary();
    return lib && lib.moves && Array.isArray(lib.moves[template]) ? lib.moves[template] : [];
  }
  function librarySourceLabel(sourceId) {
    const lib = trainingLibrary();
    const source = lib && lib.sources ? lib.sources.find(row => row.id === sourceId) : null;
    return source ? source.label + (source.level ? '（' + source.level + ' 级）' : '') : sourceId;
  }
  /** Why this week looks like this: the rules actually used, each carrying its source. */
  function planWhy(input) {
    const src = input || {};
    const reasons = [];
    const push = (id, text) => {
      const rule = libraryRule(id);
      reasons.push({id, text, source: rule ? librarySourceLabel(rule.source) : '', confidence: rule ? rule.confidence : ''});
    };
    if (src.deload) push('deload-rule', '本周按减载周排：负荷偏高时负重 ×0.9、组数 −1');
    else if (src.templateId) push(src.templateId, '动作顺序与组次来自三分化整理图（推/拉/腿各 5 个动作）');
    else push('split-3-rationale', '按三分化排：每部位每周约 1.5~2 次刺激，单次 6~10 组正式组');
    push('main-lift-rpe8', '主项守 RPE 8（留约 2 次余量），不做到力竭');
    push('isolation-failure', '单关节动作接近力竭，复合主项不追求力竭');
    if (src.suggested) push('volume-cap', '没有历史动作时用训练库建议动作，先按 3 组建立基线');
    return reasons;
  }
  /** Keyword → tag routing, so a question about 腹肌 gets the abs rules instead of the top 6 by priority. */
  const LIBRARY_ROUTES = [
    {match: /腹肌|核心|举腿|卷腹/, tags: ['abs']},
    {match: /肩|侧平举|后束|飞鸟/, tags: ['shoulder']},
    {match: /腿|深蹲|硬拉|保加利亚/, tags: ['legs']},
    {match: /背|划船|下拉|引体/, tags: ['pull']},
    {match: /胸|卧推|推日|上斜/, tags: ['push']},
    {match: /热身|激活|拉伸|放松|泡沫轴/, tags: ['warmup', 'stretch']},
    {match: /力竭|RPE|组数|次数|强度/, tags: ['intensity', 'main']},
    {match: /减脂|减肥|缺口|平台|体重不降/, tags: ['fatloss', 'deficit']},
    {match: /蛋白|蛋白质|吃多少/, tags: ['protein']},
    {match: /睡眠|熬夜|累|疲劳|恢复/, tags: ['sleep', 'recovery']},
    {match: /增肌|肌肉|围度/, tags: ['main', 'volume']}
  ];
  function libraryLookup(question, max = 8) {
    const lib = trainingLibrary();
    if (!lib) return '';
    const text = String(question || '');
    const wanted = new Set();
    for (const route of LIBRARY_ROUTES) if (route.match.test(text)) route.tags.forEach(tag => wanted.add(tag));
    if (!wanted.size) return '';
    const order = Array.isArray(lib.priority) ? lib.priority : [];
    const rank = source => {
      const index = order.indexOf(source);
      return index >= 0 ? index : 9;
    };
    const hits = lib.rules
      .filter(rule => (rule.tags || []).some(tag => wanted.has(tag)))
      .sort((a, b) => rank(a.source) - rank(b.source))
      .slice(0, max);
    // 只给规则本身，不带出处：模型不该在回答里报 BV 号或「口述 02:08」。
    return hits.map(rule => '[' + rule.topic + '] ' + rule.claim).join('\n');
  }
  /** Two short cues for today's template, taken from the transcript-level rules. */
  function libraryCues(template) {
    const lib = trainingLibrary();
    if (!lib) return [];
    const byTemplate = {
      push: ['lateral-raise-partial', 'rpe8-is-not-rm'],
      pull: ['rear-delt-neutral-grip', 'compound-deload-not-failure'],
      legs: ['leg-warmup-six-moves', 'rest-by-signal-not-calendar']
    };
    return (byTemplate[template] || [])
      .map(id => lib.rules.find(rule => rule.id === id))
      .filter(Boolean)
      .map(rule => rule.claim.split('；')[0]);
  }
  /** 去掉器械/姿态前缀，留下动作本体（卧推 / 硬拉 / 划船…），用来和训练库对名。 */
  function exerciseCore(name) {
    let text = String(name || '').replace(/\s+/g, '');
    const prefix = /^(杠铃|哑铃|器械|固定器械|固定|坐姿|站姿|俯身|仰卧|上斜|下斜|单臂|单手|双臂|绳索|钢线|高位|颈前|对握|平板|斜板|反握|正握|罗马尼亚|保加利亚|双杠)/;
    for (let i = 0; i < 2; i += 1) text = text.replace(prefix, '');
    return text.length >= 2 ? text : String(name || '').replace(/\s+/g, '');
  }
  /** 对名用的候选词：全名、逐层去掉器械/姿态前缀后的形态，以及被去掉的修饰词本身
   *  （哑铃上斜卧推 → 上斜卧推 / 卧推 / 上斜 / 哑铃），这样「上斜」这类线索也能命中。 */
  function cueTokens(name) {
    const raw = String(name || '').replace(/\s+/g, '');
    const prefix = /^(杠铃|哑铃|器械|固定器械|固定|坐姿|站姿|俯身|仰卧|上斜|下斜|单臂|单手|双臂|绳索|钢线|高位|颈前|对握|平板|斜板|反握|正握|罗马尼亚|保加利亚|双杠)/;
    const tokens = new Set([raw]);
    let text = raw;
    for (let i = 0; i < 3; i += 1) {
      const head = (text.match(prefix) || [])[0];
      if (!head || text.length - head.length < 2) break;
      tokens.add(head);
      text = text.slice(head.length);
      tokens.add(text);
    }
    return [...tokens].filter(token => token.length >= 2);
  }
  /** 一条要点别超过两行：到句号或 46 字为止。 */
  function trimCue(text) {
    const clean = String(text || '').replace(/\s+/g, ' ').trim();
    const first = clean.split('。')[0].split('；')[0].trim();
    if (first.length <= 46) return first;
    return first.slice(0, 46).replace(/[，、：]$/, '') + '…';
  }
  /** 从一条规则里挑「能照做」的那半句：先挑提到这个动作的分句，再挑有动作要求的，最后用第一句。 */
  function pickCueClause(text, tokens) {
    const parts = String(text || '').split(/[；。]/).map(part => part.trim()).filter(Boolean);
    const named = (tokens || []).length
      ? parts.find(part => tokens.some(token => part.indexOf(token) >= 0))
      : null;
    if (named) return named;
    const actionable = parts.find(part => /(要|别|先|可以|守|留|建议|每组|每次|次数|组数|RPE|激活|热身|握距|开肘|幅度|退阶|曲肘)/.test(part));
    return actionable || parts[0] || '';
  }
  /**
   * 动作要点跟着「那天实际要做的动作」走，命中顺序按「说得有多准」排：
   * ⓪ 带修饰的动作（上斜哑铃卧推）先用「上斜/上斜哑铃」这类词找，免得回落到泛泛的「卧推」；
   * ① 以这个动作开头的规则（「划船时过度肩胛后缩…」）；
   * ② 模板要点里点名这个动作的那条（上斜/深蹲/引体都覆盖得到）；
   * ③ 规则里提到它、且标签与今天的分化对得上；
   * ④ 都没有就返回 null，由调用方补通用提醒。
   */
  function cueForExercise(name, family) {
    const lib = trainingLibrary();
    if (!lib) return null;
    const raw = String(name || '').trim();
    if (!raw) return null;
    const core = exerciseCore(raw);
    const tokens = cueTokens(raw);
    const specific = raw.replace(/\s+/g, '') !== core ? tokens.filter(token => token !== core && token.indexOf(core) < 0) : [];
    const order = Array.isArray(lib.priority) ? lib.priority : [];
    const rank = source => { const index = order.indexOf(source); return index < 0 ? 9 : index; };
    const rules = lib.rules || [];
    const startsWith = (rule, list) => list.some(token => String(rule.claim || '').indexOf(token) === 0);
    const mentions = (rule, list) => list.some(token => String(rule.claim || '').indexOf(token) >= 0);
    const bodyText = rule => trimCue(pickCueClause(rule.claim, [raw].concat(tokens)));
    // ⓪ 修饰词优先：长的先试（上斜卧推 > 上斜 > 哑铃），免得回落到泛泛的「卧推」
    if (specific.length) {
      const ordered = specific.slice().sort((a, b) => b.length - a.length);
      for (const token of ordered) {
        const head = rules
          .filter(rule => String(rule.claim || '').indexOf(token) === 0)
          .sort((a, b) => rank(a.source) - rank(b.source));
        if (head.length) {
          const text = bodyText(head[0]);
          if (text) return {name: raw, text};
        }
      }
      for (const token of ordered) {
        for (const key of Object.keys(lib.dayTemplates || {})) {
          const hit = (lib.dayTemplates[key].cues || []).find(cue => String(cue).indexOf(token) >= 0);
          if (hit) {
            const text = trimCue(hit);
            if (text) return {name: raw, text};
          }
        }
      }
    }
    // ① 以动作本体/全名开头的规则
    const heads = rules.filter(rule => startsWith(rule, tokens)).sort((a, b) => rank(a.source) - rank(b.source));
    if (heads.length) {
      const text = bodyText(heads[0]);
      if (text) return {name: raw, text};
    }
    // ② 模板要点里点名这个动作的
    const templates = lib.dayTemplates || {};
    for (const key of Object.keys(templates)) {
      const hit = (templates[key].cues || []).find(cue => mentions({claim: cue}, tokens));
      if (hit) {
        const text = trimCue(hit);
        if (text) return {name: raw, text};
      }
    }
    // ③ 规则里提到它、且标签与分化对得上
    const tagged = rules
      .filter(rule => (family || []).some(tag => (rule.tags || []).indexOf(tag) >= 0) && mentions(rule, tokens))
      .sort((a, b) => rank(a.source) - rank(b.source));
    if (tagged.length) {
      const text = bodyText(tagged[0]);
      if (text) return {name: raw, text};
    }
    return null;
  }
  /** 计划某一天的要点：最多 3 条，每条点名对应的动作；命中不足时补通用提醒。 */
  function libraryCuesFor(day) {
    if (!day) return [];
    const family = {push: ['push', 'shoulder', 'main', 'intensity'], pull: ['pull', 'shoulder', 'main', 'intensity'], legs: ['legs', 'warmup', 'main', 'intensity']}[day.template] || [];
    const out = [];
    const seen = new Set();
    for (const item of (day.exercises || [])) {
      const cue = cueForExercise(item && item.name, family);
      if (!cue || !cue.text || seen.has(cue.text)) continue;
      seen.add(cue.text);
      out.push(cue);
      if (out.length >= 3) break;
    }
    if (out.length < 3) {
      for (const item of (day.exercises || [])) {
        if (out.length >= 3) break;
        const name = String(item && item.name || '').trim();
        if (!name || out.some(cue => cue.name === name)) continue;
        out.push({name, text: '做到接近力竭前停；动作变形就结束这一组'});
      }
    }
    return out;
  }
  /** 某一天用户用 AI 排的那份清单（含它给的理由）。 */
  function aiPlanEntries(day) {
    if (!day) return [];
    try {
      const list = typeof aiPlanStore === 'function' ? aiPlanStore(day) : null;
      return Array.isArray(list) ? list.filter(item => item && item.name) : [];
    } catch (error) { return []; }
  }
  /** Which library rule answers the weakest metric of the day. */
  function libraryRuleForMetric(key) {
    const map = {calories: 'weekly-rate', protein: 'protein-preserve', fat: 'protein-preserve',
      training: 'split-3-rationale', sleep: 'sleep-deficit'};
    return libraryRule(map[key] || '');
  }
  /** Compact digest for the question payload: priority order, one line per rule. */
  function librarySummary(max = 6) {
    const lib = trainingLibrary();
    if (!lib) return '';
    const order = Array.isArray(lib.priority) ? lib.priority : [];
    const rank = source => {
      const row = lib.sources.find(item => item.id === source);
      const index = order.indexOf(source);
      return index >= 0 ? index : (row && Number.isFinite(row.priority) ? row.priority : 9);
    };
    return lib.rules.slice()
      .sort((a, b) => rank(a.source) - rank(b.source))
      .slice(0, max)
      .map(rule => '[' + rule.topic + '·P' + (rank(rule.source) + 1) + '] ' + rule.claim
        + (rule.video ? '（视频 ' + rule.video.bvid + '，' + Math.round(rule.video.seconds / 60) + ' 分钟：' + rule.video.title + '）' : ''))
      .join('\n');
  }
  /** Daily training load (sets × reps × weight; runs count as minutes × 6). */
  function dailyLoads(days) {
    const out = [];
    for (let offset = 0; offset < days; offset++) {
      const day = shiftDay(activeDate, -offset);
      let load = 0;
      for (const item of exercisesFor(day)) {
        const volume = exerciseVolume(item);
        if (volume !== null) load += volume;
        const minutes = number(item.durationMin);
        if (minutes !== null) load += minutes * 6;
      }
      out.push({date: day, load});
    }
    return out;
  }
  /** Weekly mean weights, oldest first, for plateau detection. */
  function weeklyWeightMeans() {
    const byWeek = new Map();
    for (const row of (state.measurements || [])) {
      if (!row || !validDate(row.date)) continue;
      const weight = number(row.weight);
      if (weight === null || weight <= 0) continue;
      const date = new Date(row.date + 'T00:00:00');
      if (Number.isNaN(date.getTime())) continue;
      const monday = new Date(date);
      monday.setDate(date.getDate() - ((date.getDay() + 6) % 7));
      const week = localDate(monday);
      if (!byWeek.has(week)) byWeek.set(week, []);
      byWeek.get(week).push(weight);
    }
    return [...byWeek.entries()].sort((a, b) => a[0].localeCompare(b[0]))
      .map(([week, values]) => ({week, mean: Math.round(values.reduce((sum, v) => sum + v, 0) / values.length * 10) / 10}));
  }
  /** 0 = Monday … 6 = Sunday. */
  function weekdayIndex(day) {
    const date = new Date(day + 'T00:00:00');
    return Number.isNaN(date.getTime()) ? 0 : (date.getDay() + 6) % 7;
  }

  /** The plan currently on screen; the schedule button writes exactly this. */
  let lastWeekPlan = null;
  /** 周条上被点开的那一天；空着就默认今天。 */
  let weekDetailDay = null;

  /** 周条下方的一行详情：那天记录了什么、计划是什么。 */
  function weekDetailHtml(day, plan) {
    if (!day) return '';
    const prefix = (day === activeDate ? '今天' : day.slice(5)) + ' · ';
    const items = exercisesFor(day).filter(item => item && item.name);
    const planDay = (plan && Array.isArray(plan.days) ? plan.days : []).find(item => item.date === day) || null;
    if (items.length) {
      return prefix + '已记录 ' + items.length + ' 个动作 · '
        + items.slice(0, 3).map(item => item.name).join('、') + (items.length > 3 ? ' 等' : '');
    }
    if (planDay) {
      const label = TRAINING_TEMPLATES[planDay.template] || planDay.template;
      const all = planDay.exercises || [];
      const names = all.slice(0, 3).map(item => item.name).join('、');
      return prefix + label + (names ? ' · ' + names + (all.length > 3 ? ' 等 ' + all.length + ' 个' : '') : ' · 动作待定');
    }
    return prefix + '休息';
  }

  /** Five-metric check for the selected day, plus the single action to take. */
  function renderDailyCheck() {
    const box = $('#daily-check'), tag = $('#daily-check-tag');
    if (!box) return;
    const meals = (state.meals || []).filter(row => row && row.date === activeDate);
    const habit = habitRowFor(activeDate) || {};
    const profile = effectiveProfileForDate(activeDate);
    const range = intakeRangeForDate(activeDate);
    const check = dailyCheck({meals, habit, range,
      proteinMin: number(profile.proteinMin), proteinMax: number(profile.proteinMax),
      fatMin: number(profile.fatMin), fatMax: number(profile.fatMax)});
    if (tag) {
      tag.textContent = check.relax ? '放松日 · 本周 1/1' : check.score === null ? '待记录' : '达标 ' + check.score + '/100 · 已评 ' + check.items.filter(item => item.evaluated).length + '/' + check.items.length;
      tag.classList.toggle('is-relax', !!check.relax);
    }
    box.innerHTML = '<div class="check-grid">' + check.items.map(item => {
      // 区间内绿、接近青、差得多淡红；没记录的保持中性。
      const level = check.relax ? 'idle' : !item.evaluated ? 'idle' : item.ok || item.score >= 0.95 ? 'ok' : item.score >= 0.6 ? 'near' : 'off';
      return `<div class="check-item ${level}"><span class="check-icon" aria-hidden="true">${metricIcon(item.label)}</span><small>${esc(item.label)}</small><strong>${esc(String(item.value))}</strong><em>${esc(item.target)}</em></div>`;
    }).join('') + '</div>'
      + `<p class="check-verdict">${esc(check.verdict)}</p>`
      + `<p class="check-action"><strong>今天优先：</strong>${esc(check.action)}</p>`
      + (() => {const rule = libraryRuleForMetric(check.worst && check.worst.key); return rule
        ? '' : '';})();
  }

  /** Two weeks of history -> next week's sessions, with a deload when the load ran hot. */
  const PLAN_PREFS_KEY = "qingheng.planPrefs";
  /** 器械偏好的中文名；直接把 barbell 丢给模型它会不确定。mixed = 综合。 */
  const GEAR_LABELS = {mixed: "综合（杠铃、哑铃、固定器械、自重都可用）", barbell: "杠铃为主", dumbbell: "哑铃为主", machine: "固定器械", body: "自重"};
  /** 用户偏好：没有设置就不生成方案。 */
  function planPrefs() {
    try { const raw = localStorage.getItem(PLAN_PREFS_KEY); return raw ? JSON.parse(raw) : null; } catch { return null; }
  }
  function savePlanPrefs(prefs) {
    try { localStorage.setItem(PLAN_PREFS_KEY, JSON.stringify(prefs)); } catch { }
    // 收进 state.json：换新手机导入备份后周计划偏好还在；localStorage 此时是空的。
    if (typeof schedulePrefsSync === 'function') schedulePrefsSync({planPrefs: prefs ?? null, aiPlans: collectedAiPlans()});
  }
  /** 每周练几天 -> 落在周几（0=周一）。 */
  function trainingDays(count) {
    const map = {3: [0, 2, 4], 4: [0, 1, 3, 5], 5: [0, 1, 3, 4, 5], 6: [0, 1, 2, 3, 4, 5]};
    return map[Math.max(3, Math.min(6, Number(count) || 3))] || map[3];
  }
  function splitLabels(split) {
    if (split === "ul") return ["上肢", "下肢"];
    if (split === "fb") return ["全身"];
    return ["推", "拉", "腿"];
  }

  /** 已保存的训练安排压成一行：折叠后仍要知道「每周几天、怎么分、用什么器械、每次多久」。 */
  const PLAN_SPLIT_LABELS = {ppl: "推拉腿", ul: "上下肢", fb: "全身"};
  const PLAN_GEAR_LABELS = {mixed: "综合", barbell: "杠铃", dumbbell: "哑铃", machine: "固定器械", body: "自重"};
  function planPrefsSummary(prefs) {
    if (!prefs) return "";
    const days = Number(prefs.days) > 0 ? Number(prefs.days) : 3;
    const split = PLAN_SPLIT_LABELS[prefs.split] || "推拉腿";
    const gear = PLAN_GEAR_LABELS[prefs.gear] || "综合";
    const minutes = Number(prefs.minutes) > 0 ? Number(prefs.minutes) : 45;
    return "每周 " + days + " 练 · " + split + " · " + gear + " · " + minutes + " 分钟";
  }

  function installPlanPrefs() {
    const box = $("#plan-prefs");
    if (!box) return;
    const chipsOf = name => $$(`[data-pref="${name}"] .pref-chip`);
    const mark = (name, value) => chipsOf(name).forEach(chip => {
      chip.setAttribute("aria-pressed", String(chip.dataset.value) === String(value) ? "true" : "false");
    });
    const read = name => {
      const on = chipsOf(name).find(chip => chip.getAttribute("aria-pressed") === "true");
      return on ? on.dataset.value : null;
    };
    const prefs = planPrefs();
    // 器械默认「综合」：不限单一器材，交给模型混用。
    mark("days", prefs && prefs.days ? prefs.days : 3);
    mark("split", (prefs && prefs.split) || "ppl");
    mark("gear", (prefs && prefs.gear) || "mixed");
    mark("minutes", (prefs && prefs.minutes) || 45);
    for (const name of ["days", "split", "gear", "minutes"]) {
      chipsOf(name).forEach(chip => {
        if (chip.dataset.wired) return;
        chip.dataset.wired = "1";
        chip.addEventListener("click", () => mark(name, chip.dataset.value));
      });
    }
    // 已经定过的安排默认收起：首屏只留一行摘要，要看或改再展开。
    const summary = $("#plan-prefs-summary"), edit = $("#pref-edit");
    const setCollapsed = collapsed => {
      box.hidden = collapsed;
      if (summary) {
        summary.hidden = !collapsed;
        if (collapsed) summary.textContent = planPrefsSummary(planPrefs());
      }
      if (edit) {
        edit.hidden = !collapsed;
        edit.setAttribute("aria-expanded", String(!collapsed));
      }
    };
    setCollapsed(!!prefs);
    if (edit && !edit.dataset.wired) {
      edit.dataset.wired = "1";
      edit.addEventListener("click", () => {
        setCollapsed(false);
        const first = $("#plan-prefs .pref-chip");
        if (first) first.focus();
      });
    }
    const regen = $("#pref-regen");
    if (regen) {
      regen.hidden = !prefs;
      if (!regen.dataset.wired) {
        regen.dataset.wired = "1";
        regen.addEventListener("click", () => {
          regenerateWeekPlan();
          notice("已按当前偏好重新生成本周安排（偏好没改也能换一版）。");
        });
      }
    }
    const save = $("#pref-save");
    if (save && !save.dataset.wired) {
      save.dataset.wired = "1";
      save.addEventListener("click", () => {
        savePlanPrefs({
          days: Number(read("days")) || 3,
          split: read("split") || "ppl",
          gear: read("gear") || "mixed",
          minutes: Number(read("minutes")) || 45
        });
        // 保存偏好与生成本周安排是同一次动作：以前指纹没变就复用缓存，看起来像「点了没反应」。
        regenerateWeekPlan();
        setCollapsed(true);
        notice("已保存训练偏好，并按新偏好重新生成本周安排。");
      });
    }
  }

  /**
   * 今天页的「今日训练清单」：计划语义的唯一入口。三态——
   * 有 AI 清单：可勾选的镜像 + 完成度 + 一键加入训练记录；
   * 无清单但有记录：列出已记录动作（只报记录，不伪装成排好的顺序）；
   * 都没有：给「用 AI 排今天 / 看本周安排」两个入口。
   */
  /** 本周计划整体是否存在、今天那一节是什么——休息日与「还没排」是两件事，不能混成一句话。 */
  function weekPlanToday() {
    const weekStart = shiftDay(activeDate, 7 - weekdayIndex(activeDate));
    let plan = (lastWeekPlan && lastWeekPlan.days) ? lastWeekPlan : null;
    if (!plan) {
      const cached = readWeekPlanCache(weekStart);
      plan = cached && cached.plan ? cached.plan : null;
    }
    if (!plan) {
      try {
        const baselines = recentExerciseBaselines(14);
        const sessions = Math.max(1, Math.min(6, Math.round(number(effectiveProfileForDate(activeDate).training) || 3)));
        const flag = (acwrFromDailyLoads(dailyLoads(28), activeDate) || {}).flag || "ok";
        plan = generateWeekPlan({startDate: weekStart, sessions, lastByExercise: baselines, acwrFlag: flag});
        if (plan) writeWeekPlanCache(weekStart, {plan, fingerprint: weekPlanFingerprint(prefsForPlan(), baselines, sessions), savedAt: Date.now()});
      } catch { plan = null; }
    }
    return {hasPlan: !!(plan && plan.days), day: plan && plan.days ? plan.days.find(item => item.date === activeDate) || null : null};
  }
  /** 本周计划里「今天」那一节：与 weekPlanToday 共用同一个来源，不再各算一遍。 */
  function weekTodaySession() {
    return weekPlanToday().day;
  }
  /** 把周计划今天那一节写进今日清单，两处入口（今日页 / 记录页）共用。 */
  async function adoptWeekDay() {
    const day = weekTodaySession();
    if (!day || !day.exercises.length) { notice("今天的安排是空的，没有可采纳的动作。"); return; }
    // 覆盖前先问：用户可能刚用 AI 排过一份，替换掉要他自己点头。
    const existing = aiPlanStore(activeDate) || [];
    if (existing.length) {
      const go = await askConfirm("今天已有一份清单（" + existing.length + " 个动作）。要用本周安排替换它吗？",
        {title: "替换今日清单", ok: "替换", cancel: "保留原来的"});
      if (!go) return;
    }
    const plan = day.exercises.map(item => ({
      name: String(item.name || "").slice(0, 24),
      sets: number(item.sets) > 0 ? number(item.sets) : 0,
      reps: number(item.reps) > 0 ? number(item.reps) : 0,
      weight: number(item.weight) > 0 ? number(item.weight) : null,
      reason: "",
      source: "week",
      done: false
    })).filter(item => item.name);
    if (!plan.length) { notice("今天的安排是空的，没有可采纳的动作。"); return; }
    aiPlanStore(activeDate, plan);
    if (typeof renderAiPlan === "function") renderAiPlan();
    renderAdviceOrder();
    renderWeekPlan();
    notice("已把今天这节采纳到今日清单，可以逐项勾选执行。");
  }
  function renderAdviceOrder() {
    const box = $("#training-advice-order");
    if (!box) return;
    if (!box.dataset.todayWired) {
      box.dataset.todayWired = "1";
      box.addEventListener("click", event => {
        const log = event.target.closest("[data-today-log]");
        if (log) {
          event.preventDefault();
          const plan = typeof aiPlanStore === "function" ? (aiPlanStore(activeDate) || []) : [];
          if (typeof startLoggingFromPlan === "function") startLoggingFromPlan(plan[Number(log.dataset.todayLog)]).catch(() => {});
          return;
        }
        const done = event.target.closest("[data-today-done]");
        if (done) {
          const plan = typeof aiPlanStore === "function" ? (aiPlanStore(activeDate) || []) : [];
          const index = Number(done.dataset.todayDone);
          if (plan[index]) { plan[index].done = done.checked; aiPlanStore(activeDate, plan); }
          renderAdviceOrder();
          if (typeof renderAiPlan === "function") renderAiPlan();
          return;
        }
        const adopt = event.target.closest("[data-today-adopt]");
        if (adopt) { event.preventDefault(); adoptWeekDay(); return; }
        const addAll = event.target.closest("[data-today-add-all]");
        if (addAll) {
          const pending = (typeof aiPlanStore === "function" ? (aiPlanStore(activeDate) || []) : []).filter(item => !item.done);
          if (typeof addExercisesToToday === "function") addExercisesToToday(pending).catch(() => {});
          return;
        }
        const jump = event.target.closest("[data-today-plan]");
        if (jump) {
          // 「用 AI 排今天」就地排：跳页再让用户点第二次，是最伤直觉的一步。
          if (jump.dataset.todayPlan === "ai" && typeof askAiPlan === "function") {
            if (!externalConsent()) { notice("请先到「我的 → 数据、外观与说明」开启外部模型授权。"); return; }
            askAiPlan(jump);
            return;
          }
          // 本周安排长在「训练」分段里：先切分段，再等卡片真的渲染出来再滚。
          // 原来只 switchTab + 80ms 后 scrollIntoView，记录页此刻还停在饮食分段，滚动打空。
          const wantAi = jump.dataset.todayPlan === "ai";
          switchTab("records", true);
          const jumpToPlan = (attempt = 0) => {
            if (!wantAi && typeof switchRecordPanel === "function") switchRecordPanel("training");
            const target = $(wantAi ? "#ai-plan" : "#week-plan-card");
            if (target) {
              target.scrollIntoView({block: "start", behavior: "smooth"});
              if (typeof flashTarget === "function") flashTarget(target);
              return;
            }
            if (attempt < 12) setTimeout(() => jumpToPlan(attempt + 1), 100);
          };
          setTimeout(() => jumpToPlan(), 60);
        }
      });
    }
    const plan = typeof aiPlanStore === "function" ? aiPlanStore(activeDate) : null;
    const items = exercisesFor(activeDate).filter(item => item && item.name);
    if (plan && plan.length) {
      const doneCount = plan.filter(item => item.done).length;
      const pending = plan.length - doneCount;
      const rows = plan.map((item, index) => {
        const dose = [item.sets ? item.sets + " 组" : "", item.reps ? item.reps + " 次" : "", item.weight ? item.weight + " kg" : ""].filter(Boolean).join(" × ");
        return "<li class=\"adv-plan-li\"><label class=\"adv-plan-item\"><input type=\"checkbox\" data-today-done=\"" + index + "\"" + (item.done ? " checked" : "") + ">"
          + "<span class=\"adv-name\">" + esc(item.name) + "</span>" + (dose ? "<span class=\"adv-dose\">" + esc(dose) + "</span>" : "") + "</label>"
          + "<button type=\"button\" class=\"text-button adv-plan-log\" data-today-log=\"" + index + "\" aria-label=\"记录" + esc(item.name) + "\">记录</button></li>";
      }).join("");
      box.hidden = false;
      box.innerHTML = "<h3 class=\"plan-sub\">今日清单 · " + doneCount + "/" + plan.length + " 完成</h3><ol class=\"adv-order-list\">" + rows + "</ol>"
        + (pending ? "<div class=\"button-row\"><button type=\"button\" class=\"button subtle\" data-today-add-all>把未完成的加入训练记录</button></div>" : "<p class=\"fine-print\">清单已全部完成。</p>")
        + "<p class=\"fine-print\">编辑清单请到「记录 → 训练计划」。</p>";
      return;
    }
    if (!items.length) {
      const weekInfo = weekPlanToday();
      const weekDay = weekInfo.day;
      if (weekInfo.hasPlan && (!weekDay || !weekDay.exercises.length)) {
        // 排过周计划、今天就是休息日——直说休息，别用「还没有训练清单」这种暗示漏排的说法。
        box.hidden = false;
        box.innerHTML = "<h3 class=\"plan-sub\">今天按本周安排是休息日</h3>"
          + "<p class=\"fine-print\">想练也可以临时排一份，不会改动本周安排。</p>"
          + "<div class=\"button-row\"><button type=\"button\" class=\"button subtle\" data-today-plan=\"ai\">临时用 AI 排今天</button>"
          + "<button type=\"button\" class=\"button subtle\" data-today-plan=\"week\">看本周安排</button></div>";
        return;
      }
      if (weekDay && weekDay.exercises.length) {
        const names = weekDay.exercises.map(item => item.name).slice(0, 4).join("、");
        box.hidden = false;
        box.innerHTML = "<h3 class=\"plan-sub\">本周计划今天 · " + esc(TRAINING_TEMPLATES[weekDay.template] || weekDay.template) + "</h3>"
          + "<p class=\"fine-print\">" + esc(names) + (weekDay.exercises.length > 4 ? " 等 " + weekDay.exercises.length + " 个动作" : "") + "</p>"
          + "<div class=\"button-row\"><button type=\"button\" class=\"button primary\" data-today-adopt>采纳到今日清单</button>"
          + "<button type=\"button\" class=\"button subtle\" data-today-plan=\"ai\">改用 AI 排今天</button></div>";
        return;
      }
      box.hidden = false;
      box.innerHTML = "<p class=\"muted\">今天还没有训练清单；想练的时候再排也来得及。</p>"
        + "<div class=\"button-row\"><button type=\"button\" class=\"button subtle\" data-today-plan=\"ai\">用 AI 排今天</button>"
        + "<button type=\"button\" class=\"button subtle\" data-today-plan=\"week\">看本周安排</button></div>";
      return;
    }
    const rows = items.map((item, index) => {
      const dose = [item.sets && item.sets + " 组", item.reps && item.reps + " 次", item.weight && item.weight + " kg"].filter(Boolean).join(" × ");
      return "<li><span class=\"adv-order\">" + (index + 1) + "</span><span class=\"adv-name\">" + esc(item.name) + "</span>" + (dose ? "<span class=\"adv-dose\">" + esc(dose) + "</span>" : "") + "</li>";
    }).join("");
    box.hidden = false;
    box.innerHTML = "<h3 class=\"plan-sub\">已记录 " + items.length + " 个动作</h3><ol class=\"adv-order-list\">" + rows + "</ol>"
      + "<p class=\"fine-print\">想要一份按顺序的清单？用 AI 排今天，或按本周安排练。</p>";
  }

  /** 14 天内每个动作最近一次的组/次/负重，供渐进参考；跑步与计时类不参与排课。 */
  function recentExerciseBaselines(days = 14) {
    const lastByExercise = {};
    for (let offset = 0; offset < days; offset++) {
      const day = shiftDay(activeDate, -offset);
      for (const item of exercisesFor(day)) {
        if (!item.name || lastByExercise[item.name]) continue;
        if (item.sets === null || item.reps === null) continue; // runs and timed work are not scheduled
        lastByExercise[item.name] = {sets: item.sets, reps: item.reps, weight: item.weight, date: day};
      }
    }
    return lastByExercise;
  }

  const WEEK_PLAN_KEY = week => "qingheng.weekPlan." + week;
  /** 指纹 = 偏好 + 每个动作最近一次的组/次/重量；任一项变才重算，避免回看时清单悄悄变。 */
  /** 指纹只关心影响排课的那几个输入；没有偏好时留空，仍能稳定比较。 */
  function prefsForPlan() {
    return typeof planPrefs === "function" ? planPrefs() : null;
  }
  function weekPlanFingerprint(prefs, lastByExercise, sessions) {
    const parts = [sessions, prefs ? prefs.days : "", prefs ? prefs.split : "", prefs ? prefs.gear : "", prefs ? prefs.minutes : ""];
    for (const name of Object.keys(lastByExercise || {}).sort()) {
      const row = lastByExercise[name];
      parts.push(name + ":" + row.sets + "x" + row.reps + "x" + row.weight);
    }
    const text = parts.join("|");
    let hash = 5381;
    for (let i = 0; i < text.length; i++) hash = ((hash << 5) + hash + text.charCodeAt(i)) | 0;
    return String(hash >>> 0);
  }
  function readWeekPlanCache(week) {
    try { const raw = localStorage.getItem(WEEK_PLAN_KEY(week)); return raw ? JSON.parse(raw) : null; } catch { return null; }
  }
  function writeWeekPlanCache(week, value) {
    try { localStorage.setItem(WEEK_PLAN_KEY(week), JSON.stringify(value)); } catch {}
  }
  let forceWeekPlan = false;
  /** 明确「重新生成」：清掉本周缓存并强制重算，偏好不变也能换一版。 */
  function regenerateWeekPlan() {
    const startDate = shiftDay(activeDate, 7 - weekdayIndex(activeDate));
    try { localStorage.removeItem(WEEK_PLAN_KEY(startDate)); } catch { }
    lastWeekPlan = null;
    forceWeekPlan = true;
    renderWeekPlan();
  }
  function renderWeekPlan() {
    const box = $('#week-plan'), tag = $('#week-plan-tag');
    if (!box) return;
    const loads = dailyLoads(28);
    const stats = acwrFromDailyLoads(loads, activeDate);
    const lastByExercise = recentExerciseBaselines(14);
    const sessions = Math.max(1, Math.min(6, Math.round(number(effectiveProfileForDate(activeDate).training) || 3)));
    const startDate = shiftDay(activeDate, 7 - weekdayIndex(activeDate));
    const fingerprint = weekPlanFingerprint(prefsForPlan(), lastByExercise, sessions);
    const cached = forceWeekPlan ? null : readWeekPlanCache(startDate);
    let plan, drifted = false;
    if (cached && cached.plan && cached.fingerprint === fingerprint) {
      plan = cached.plan; // 指纹没变：照用上次的结果，计划是被「约定」过的
    } else {
      plan = generateWeekPlan({startDate, sessions, lastByExercise, acwrFlag: stats ? stats.flag : 'ok'});
      drifted = !!(cached && cached.plan);
      if (plan) writeWeekPlanCache(startDate, {plan, fingerprint, savedAt: Date.now()});
    }
    forceWeekPlan = false;
    lastWeekPlan = plan;
    if (!plan) { box.innerHTML = empty('还没有足够的训练记录', '先记两周训练，计划会自动出来。', 'empty'); return; }
    if (tag) tag.textContent = plan.deload ? '减载周' : '负重 +2.5%';
    // "What do I train today": today's planned day, the next one, or what was already logged.
    const todayPlan = plan.days.find(day => day.date === activeDate);
    // 负荷：标签 + 数值 + 判定，不写成一句话。「急慢性比」第一次看不知道是谁比谁，改成「负荷比」+ 一行口径。
    const acwrHtml = (() => {
      if (!stats || !Number.isFinite(stats.ratio)) return '';
      const level = stats.flag === 'high' ? 'high' : stats.flag === 'low' ? 'low' : 'ok';
      const verdict = level === 'high' ? '偏高 · 本周减载' : level === 'low' ? '偏低 · 按记录安排' : '维持';
      return '<p class="plan-label">训练负荷</p><div class="plan-load is-' + level + '"><span class="plan-load-label">负荷比</span>'
        + '<span class="plan-load-value">' + stats.ratio.toFixed(2) + '</span>'
        + '<span class="plan-load-verdict">' + verdict + '</span></div>'
        + '<p class="fine-print">负荷比 = 近 7 天 ÷ 近 4 周平均负荷；0.8–1.3 为维持区。</p>';
    })();
    const suggestedNote = plan.days.some(day => day.suggested) ? '<p class="fine-print">带「建议」的动作来自训练库（该模板你还没有记录），先按 3 组建立基线。</p>' : '';
    // 依据与说明沉到默认折叠的 details 里：首屏只留数据。
    // 要点与理由都跟着「今天或下一个训练日」走：周计划第一天是周一，直接用 days[0] 会在休息日
    // 弹出与今天无关的提示，读起来像凭空冒出来的警告。
    const cueDay = plan.days.find(day => day.date === activeDate)
      || plan.days.find(day => day.date > activeDate)
      || plan.days[0];
    // 先回答「你排的那份清单为什么这么排」：AI 排的顺序带着它自己给的理由；
    // 没有 AI 清单时，才解释这一周按规则是怎么来的。
    const aiEntries = (() => {
      const wanted = [cueDay && cueDay.date, activeDate].filter(Boolean);
      for (const day of wanted) {
        const list = aiPlanEntries(day);
        if (list.length) return {day, list};
      }
      return null;
    })();
    const aiWhy = aiEntries
      ? '<p class="plan-why-lead">' + esc(aiEntries.day === activeDate ? '今天这份顺序' : aiEntries.day.slice(5) + ' 这份顺序')
        + '是用 AI 排的，它给的理由：</p>'
        + '<ol class="plan-why-ai">' + aiEntries.list.slice(0, 6).map(item =>
          '<li><b>' + esc(item.name) + '</b><span>' + esc(item.reason || '按训练库安排') + '</span></li>').join('') + '</ol>'
      : '';
    // 2026-11-17：要点与依据合成一块「这份计划怎么来的」，不再让用户读两处。
    const whyBody = aiWhy
      + '<p class="plan-why-lead">为什么这样排：' + (aiWhy ? '这一周的框架按训练库与你最近两周的记录生成。' : '这一周按训练库与你最近两周的记录生成。') + '</p>'
      + '<p>' + esc(plan.note) + '</p>'
      + (Array.isArray(plan.reasons) ? plan.reasons.map(reason =>
        '<p>' + esc(reason.text) + '</p>').join('') : '');
    // 要点跟着「今天或下一个训练日」走：优先按那天实际要做的动作点名给要点。
    const cues = (typeof libraryCuesFor === 'function' && cueDay) ? libraryCuesFor(cueDay) : [];
    const templateCues = !cues.length && (typeof libraryCues === 'function' && cueDay) ? libraryCues(cueDay.template) : [];
    const cueToday = !!(cueDay && cueDay.date === activeDate);
    const cueLabel = esc((cueToday ? "今天" : "下一个训练日") + "（" + (TRAINING_TEMPLATES[cueDay.template] || cueDay.template) + "）的动作要点");
    const cueBody = cues.length
      ? '<ul class="plan-cue-list">' + cues.map(cue =>
        '<li><b>' + esc(cue.name) + '</b><span class="plan-cue-text">' + annotateTerms(esc(cue.text)) + '</span></li>').join('') + '</ul>'
      : (templateCues.length
        ? annotateTerms('<p class="plan-cue">' + templateCues.map(cue => esc(cue)).join('；') + '</p>')
        : '');
    const explainHtml = '<details class="plan-why plan-cue-block"' + (cueToday ? ' open' : '') + '><summary>' + (cueBody ? cueLabel : '这份计划怎么来的') + '</summary>'
      + cueBody + whyBody + '</details>';
    // 本周安排：完全按用户偏好生成；没有偏好就不出方案。
    const planBox = $("#week-plan");
    if (planBox && !planBox.dataset.adoptWired) {
      planBox.dataset.adoptWired = "1";
      planBox.addEventListener("click", event => {
        const cell = event.target.closest("[data-week-day]");
        if (cell) {
          weekDetailDay = cell.dataset.weekDay || null;
          for (const node of planBox.querySelectorAll("[data-week-day]")) {
            const on = node.dataset.weekDay === weekDetailDay;
            node.classList.toggle("is-selected", on);
            node.setAttribute("aria-pressed", String(on));
          }
          const detail = $("#week-detail");
          if (detail) detail.textContent = weekDetailHtml(weekDetailDay, lastWeekPlan);
          return;
        }
        const button = event.target.closest("[data-adopt-today]");
        if (!button) return;
        adoptWeekDay();
      });
    }
    const prefs = planPrefs();
    // 收起/展开由 installPlanPrefs 统一管：这里别再强行显示，否则「修改」刚收起又会被撑开。
    let thisWeekHtml;
    if (!prefs) {
      thisWeekHtml = "<p class=\"muted\">先选一下训练偏好（频率 / 分化 / 器械 / 时长），再按它安排本周。</p>";
    } else {
      // 2026-11-11 晚（用户：美术效果优先于表格结构）：本周安排不再是一张 7 行表格，
      // 而是一条 7 格周条——训练日一根绿短线、已练实心、今天加深；点某格在下面换一行详情。
      // 周条画「计划所在的那一周」（startDate = 下一个周一），而不是今天所在的日历周：
      // 以前标题写「本周安排」、内容却是下周的计划，所以计划日一根线都画不出来。
      const weekStartPlan = startDate;
      const weekEndPlan = shiftDay(weekStartPlan, 7);
      const firstPlanDay = plan.days.length ? plan.days[0].date : activeDate;
      if (!weekDetailDay || weekDetailDay < weekStartPlan || weekDetailDay >= weekEndPlan) weekDetailDay = firstPlanDay;
      const cells = [];
      for (let offset = 0; offset < 7; offset++) {
        const day = shiftDay(weekStartPlan, offset);
        const planDay = plan.days.find(item => item.date === day) || null;
        const logged = exercisesFor(day).filter(item => item && item.name).length > 0;
        const isToday = day === activeDate;
        const selected = day === weekDetailDay;
        const dow = "日一二三四五六"[new Date(day + "T00:00:00").getDay()];
        const label = planDay ? (TRAINING_TEMPLATES[planDay.template] || planDay.template) : "休息";
        cells.push('<button type="button" class="week-cell'
          + (planDay ? " is-plan" : "") + (logged ? " is-done" : "") + (isToday ? " is-today" : "") + (selected ? " is-selected" : "")
          + '" data-week-day="' + day + '" aria-pressed="' + (selected ? "true" : "false") + '" aria-label="' + esc(day.slice(5)) + " " + esc(label) + '">'
          + '<span class="week-dow">' + dow + '</span>'
          + '<span class="week-num">' + esc(day.slice(8)) + '</span>'
          + '<span class="week-bar" aria-hidden="true"></span></button>');
      }
      thisWeekHtml = '<h3 class="plan-sub">下周安排 · ' + esc(weekStartPlan.slice(5)) + ' 起</h3>'
        + '<div class="week-strip" role="group" aria-label="下周训练安排，点一天看安排">' + cells.join("") + '</div>'
        + '<p class="week-detail" id="week-detail">' + weekDetailHtml(weekDetailDay, plan) + '</p>';
    }
    const driftHtml = drifted ? '<p class="fine-print">记录有更新，本周安排已按最新数据重算。</p>' : '';
    // 采纳入口：今天有安排且今日清单还空着时，一键把它变成今日清单——否则用户要自己把
    // 数据层里的安排重录一遍。已有 AI 清单时不出现：AI 排的优先级高于周计划。
    const hasTodayList = (() => { try { const raw = localStorage.getItem(AI_PLAN_KEY(activeDate)); const list = raw ? JSON.parse(raw) : null; return Array.isArray(list) && list.length > 0; } catch { return false; } })();
    const adoptHtml = (!hasTodayList && todayPlan && todayPlan.exercises.length)
      ? '<button type="button" class="button subtle full-width" data-adopt-today>把今天这节采纳到今日清单</button>'
      : '';
    box.innerHTML = annotateTerms(thisWeekHtml + explainHtml + acwrHtml + driftHtml + adoptHtml + suggestedNote);
      + '<div class="plan-days">' + plan.days.map(day =>
        `<div class="plan-day"><div class="plan-day-head"><strong>${esc(day.date.slice(5))}</strong><span>${esc(TRAINING_TEMPLATES[day.template] || day.template)}</span></div>`
        + (day.exercises.length ? day.exercises.map(item =>
          `<div class="plan-item"><span>${esc(item.name)}${day.suggested ? ' <small class="plan-suggest">建议</small>' : ''}</span><b>${item.sets} × ${item.reps}${item.rpe ? ' · RPE ' + item.rpe : ''}${item.weight !== null ? ' · ' + item.weight + ' kg' : ''}</b></div>`).join('')
          : '<div class="plan-item"><span>还没有可安排的动作</span><b>—</b></div>') + '</div>').join('') + '</div>'
      + `<div class="button-row"><button type="button" class="button primary" data-plan-schedule="1">一键排课</button></div>`;
  }

  /** Load and plateau warnings shown above the weight chart. */
  function renderTrendWarnings() {
    const box = $('#trend-warnings');
    if (!box) return;
    const notes = [];
    const stats = acwrFromDailyLoads(dailyLoads(28), activeDate);
    if (stats && stats.flag === 'high') notes.push('训练负荷急增：近 7 天是近 4 周均值的 ' + stats.ratio + ' 倍，建议本周减载或休息一天。');
    if (stats && stats.flag === 'low' && stats.days >= 3) notes.push('训练量偏低：近 7 天只有均值的 ' + stats.ratio + ' 倍，若在减脂期注意保住肌肉量。');
    const weekly = weeklyWeightMeans();
    const plateau = plateauFromWeekly(weekly);
    if (plateau && plateau.plateau) notes.push('体重平台期：最近三周周均在 ' + plateau.mean + ' kg 上下浮动不到 0.2 kg，可以重算维持热量或调整缺口。');
    if (!notes.length) { box.hidden = true; box.innerHTML = ''; return; }
    box.hidden = false;
    box.innerHTML = annotateTerms(notes.map(note => `<p class="warn-line">${esc(note)}</p>`).join(''));
  }

  let dailyThreeEditing = '';
  function renderDailyThree() {
    const form = $('#daily-three-form');
    if (!form) return;
    const tag = $('#daily-three-tag');
    const habit = (state.habits || []).find(row => row && row.date === activeDate) || {};
    const measurement = (state.measurements || []).find(row => row && row.date === activeDate) || {};
    const training = habit.training === true || habit.training === 'true' ? 'true' : habit.training === false || habit.training === 'false' ? 'false' : '';
    if (document.activeElement !== form.elements.training) form.elements.training.value = training;
    if (document.activeElement !== form.elements.sleep) form.elements.sleep.value = number(habit.sleep) ?? '';
    if (document.activeElement !== form.elements.weight) form.elements.weight.value = number(measurement.weight) ?? '';
    const sleep = number(habit.sleep), weight = number(measurement.weight);
    const filled = [training !== '', sleep !== null, weight !== null].filter(Boolean).length;
    // 三样都记过就收成一列只读摘要：这张卡在首屏占地大，展开态最容易误触。
    let savedThisDay = false;
    try {savedThisDay = localStorage.getItem(DAILY_THREE_KEY(activeDate)) === '1';} catch {}
    const collapsed = (savedThisDay || filled === 3) && dailyThreeEditing !== activeDate;
    const body = $('#daily-three-body'), summary = $('#daily-three-summary');
    if (body) body.hidden = collapsed;
    if (summary) {
      summary.hidden = !collapsed;
      if (collapsed) {
        const rows = [
          ['训练', training === 'true' ? '已训练' : training === 'false' ? '休息' : '未记录'],
          ['睡眠', sleep === null ? '—' : `${fmt(sleep)} 小时`],
          ['体重', weight === null ? '—' : `${fmt(weight)} kg`]
        ];
        summary.innerHTML = rows.map(([label, value]) => `<div class="daily-three-row"><span>${label}</span><b>${esc(value)}</b></div>`).join('')
          + '<button type="button" class="text-button" data-daily-three-edit>修改</button>';
      }
    }
    if (tag) tag.textContent = filled === 0 ? '待记录' : filled === 3 ? '已记录三样' : `已记录 ${filled}/3`;
  }
  document.addEventListener('click', event => {
    const edit = event.target.closest?.('[data-daily-three-edit]');
    if (!edit) return;
    dailyThreeEditing = activeDate;
    renderDailyThree();
  });
  /** One-tap copies: yesterday's meals first, then the most recent ones. */
  function copyCandidates() {
    const rows = (state.meals || []).filter(row => row && validDate(row.date) && !row.needsDate);
    const yesterday = shiftDay(activeDate,-1);
    const rank = row => (row.date === yesterday ? 0 : 1);
    const key = row => `${row.date}|${row.mealType || ''}|${row.name || ''}|${fmt(row.calories, 0)}`;
    const seen = new Set();
    return rows.slice().sort((a, b) => rank(a) - rank(b) || String(b.date).localeCompare(String(a.date)))
      .filter(row => {
        const id = key(row);
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
      })
      .slice(0, 5);
  }
  function renderCopyMeals() {
    const box = $('#copy-meal-buttons');
    if (!box) return;
    const rows = copyCandidates();
    const tag = $('#copy-meal-tag');
    if (tag) tag.textContent = rows.length ? `最近 ${rows.length} 餐` : '暂无可复制记录';
    box.innerHTML = rows.length ? rows.map(row => {
      const label = `${row.date === shiftDay(activeDate,-1) ? '昨天' : String(row.date).slice(5)} · ${mealNames[row.mealType] || '餐食'} · ${row.name || '未命名'}`;
      return `<button type="button" class="button subtle" data-copy-meal="${esc(row.id ?? '')}">${esc(label)}</button>`;
    }).join('') : empty('还没有可复制的餐食记录', '记下一餐后，这里会列出来供一键复制。');
  }
  /** Copies one meal to the viewed date with a fresh id; totals and items are carried over as-is. */
  async function copyMeal(id) {
    const source = (state.meals || []).find(row => row && String(row.id ?? '') === String(id));
    if (!source) {notice('这条记录已经不存在了。', true); renderCopyMeals(); return;}
    const copy = {...source};
    delete copy.id;
    copy.date = activeDate;
    copy.source = 'quick-copy';
    copy.mealTime = nowClock();
    copy.mealTimeSource = 'manual';
    delete copy.estimateId;
    delete copy.draftId;
    if (!await askConfirm(`把「${source.name || '这一餐'}」复制到 ${activeDate}？复制后可以再改份量。`, {title: '复制这一餐', ok: '复制'})) return;
    try {
      await api('/api/meals', copy);
      await loadState({quiet: true});
      notice(`已复制到 ${activeDate}，请核对份量。`);
    } catch (error) {notice(error.message, true);}
  }
  function numericForm(form, fields) {return Object.fromEntries(fields.map(key => [key, number(form.elements.namedItem(key).value)]));}
  async function submitForm(form, path, build) {
    const button=$('button[type=submit]',form), message=$('.form-feedback',form);
    if (button.disabled || !form.reportValidity()) return;
    button.disabled=true; feedback(message,'正在保存…');
    try {
      const payload=build(form); if (payload===null) return;
      await api(path,payload);
      feedback(message,'已保存。');
      if (path === '/api/meals') {form.reset();setDefaultDates();}
      if (path === '/api/settings') {delete providerDrafts[selectedProvider];form.elements.apiKey.value='';form.elements.clearKey.checked=false;}
      try {await loadState({quiet:true});} catch {feedback(message,'保存成功，但刷新失败。请检查连接后重新加载；不要重复提交。',true);}
      if (path === '/api/settings') await refreshSettings();
    } catch (error) {feedback(message,error.message,true);} finally {button.disabled=false;}
  }
  let adviceTicker = 0, adviceStartedAt = 0;
  function adviceBusy(container) {
    const count = readPreferences().length;
    container.innerHTML = '<div class="inline-busy"><span class="busy-ring" aria-hidden="true"></span>'
      + '<span class="inline-busy-text" data-advice-wait>正在读今天的记录…</span></div>'
      + `<p class="fine-print advice-pref-note">${count ? `已带上 ${count} 条偏好` : '在「我的 → 偏好与记忆」写一条，建议会更贴合你的习惯'}</p>`;
  }
  async function refreshAdvice() {
    const button=$('#refresh-advice'), container=$('#advice-content');
    button.disabled=true; container.removeAttribute('data-date');
    syncCalendarDay();
    const date=activeDate,useAI=externalConsent();
    adviceBusy(container);
    adviceStartedAt=Date.now();
    clearInterval(adviceTicker);
    adviceTicker=setInterval(() => {
      const line=container.querySelector('[data-advice-wait]');
      if (line) line.textContent=`正在读今天的记录…已等 ${Math.round((Date.now()-adviceStartedAt)/1000)}s`;
    },800);
    try {const relax=relaxDayInfoFor(date); const data=await api('/api/advice',{date,relaxDay:!!relax.relax,preferences:readPreferences(),...(useAI?{useAI:true,allowExternal:true}:{})}); if(date!==activeDate) return; if(!Array.isArray(data?.messages)) throw new Error('建议数据格式不正确。'); renderAdvice(data.messages,date);}
    catch(error) {
      // 模型不可用时退回本地建议：这张卡空着比给一条本地结论更糟。
      try {
        const local=await api('/api/advice',{date});
        if(date!==activeDate) return;
        if(Array.isArray(local?.messages) && local.messages.length) {renderAdvice(local.messages,date); container.dataset.fallback='1'; container.setAttribute('data-note','模型暂时不可用，以下是本地建议。'); return;}
      } catch {}
      container.textContent=error.message;
    }
    finally {clearInterval(adviceTicker); button.disabled=false;}
  }
  function clearImage() {lastCaptureId='';mealPhotoMeta=photoMeta(null);imageVersion++;imageData=null;imageBusy=false;$('#meal-image').value='';$('#meal-gallery').value='';$('#image-preview').hidden=true;$('#meal-image-preview').removeAttribute('src');}
  async function compressImage(file) {
    if (/\.hei[cf]$/i.test(file.name) || /hei[cf]/i.test(file.type)) throw new Error('暂不支持 HEIC / HEIF。请先在相册导出为 JPEG，再上传。');
    if (!['image/jpeg','image/png','image/webp'].includes(file.type)) throw new Error('请选择 JPEG、PNG 或 WebP 图片；暂不支持此格式。');
    if (file.size>20*1024*1024) throw new Error('图片过大，请选择小于 20MB 的图片。');
    const url=URL.createObjectURL(file);
    try {
      const image=await new Promise((resolve,reject) => {const node=new Image();node.onload=()=>resolve(node);node.onerror=()=>reject(new Error('无法解码这张图片，请换一张 JPEG / PNG 图片。'));node.src=url;});
      if (!image.naturalWidth || !image.naturalHeight) throw new Error('图片尺寸无效。');
      const scale=Math.min(1,1280/Math.max(image.naturalWidth,image.naturalHeight));
      const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
      const context=canvas.getContext('2d');if(!context) throw new Error('此浏览器不支持图片压缩，请使用餐食文字描述。');
      context.fillStyle='#ffffff';context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(image,0,0,canvas.width,canvas.height);
      return canvas.toDataURL('image/jpeg',.82);
    } finally {URL.revokeObjectURL(url);}
  }
  const nutritionKeys = ['calories','protein','fat','carbs'];
  const nutritionPrecision = value => Math.max(0, Math.round(Number(value) * 100) / 100);
  function scaleEstimateItem(row, grams) {
    const baseGrams = number(row.dataset.baseGrams);
    if (!(grams > 0) || !(baseGrams > 0)) return;
    const ratio = grams / baseGrams;
    for (const key of nutritionKeys) {
      const input = $(`[data-item-field="${key}"]`, row), base = number(input?.dataset.baseValue);
      if (input && base !== null) input.value = nutritionPrecision(base * ratio);
    }
    updatePreviewTotals();
  }
  function openItemRecalc(row) {
    if (!row) return;
    const root = $('#item-recalc-dialog'), grams = number($('[data-item-field="grams"]', row)?.value), baseGrams = number(row.dataset.baseGrams);
    if (!(grams > 0) || !(baseGrams > 0)) return;
    $('#item-recalc-summary').textContent = `${$('[data-item-field="name"]', row)?.value || '这项食品'}：当前 ${fmt(grams)}g。`;
    $('#item-recalc-name').value = $('[data-item-field="name"]', row)?.value || '';
    $('#item-recalc-grams').value = grams;
    for (const key of nutritionKeys) {
      const input = $(`[data-item-field="${key}"]`, row), base = number(input?.dataset.baseValue);
    // 默认动作是按「名称 + 克重」请模型重算，所以每 100g 一律留空；只有用户主动填四项才走手算。
      $(`#item-recalc-${key}`).value = '';
    }
    $('#item-recalc-feedback').textContent = '';
    root.dataset.itemIndex = String($$('.estimate-item').indexOf(row));
    root.hidden = false;
    $('#item-recalc-name').focus();
    $('#item-recalc-name').select();
  }
  function closeItemRecalc() {
    const root = $('#item-recalc-dialog');
    root.hidden = true; delete root.dataset.itemIndex;
    $('#item-recalc-form').reset();
    $('#item-recalc-feedback').textContent = '';
  }
  /** The user's own anchor table, sent along so the model reuses the same numbers (rules.md 第五节). */
  function anchorSummary() {
    try {return window.QinghengAnchors?.summary?.() || '';} catch {return '';}
  }
  /** Stores the anchor block natively once per session so push/advice prompts can reuse it too. */
  async function syncAnchors() {
    const summary = anchorSummary();
    if (!summary) return;
    try {
      const current = await api('/api/anchors');
      if (current?.summary === summary) return;
      await api('/api/anchors', {summary});
    } catch { /* Anchors are an optimisation; never block the app on them. */ }
  }
  function previewDraft(data, form) {
    if (!data?.draftId || !Array.isArray(data.items) || !data.items.length || !['api','local'].includes(data.source)) throw new Error('未返回有效估算预览，请重试。');
    if (data.items.some(item => ['grams','calories','protein','fat','carbs'].some(key => number(item[key])===null || Number(item[key])<0))) throw new Error('估算中有无效营养数值，请重新生成。');
    const suggested = defaultMealTime(form.photo, form.text, form.elements.mealType.value);
    const view = {id:data.draftId,date:form.elements.date.value,mealType:form.elements.mealType.value,source:data.source,
      confidence:data.confidence,notes:Array.isArray(data.notes)?data.notes:[],items:data.items,name:'',
      oilGrams:number(data.oilGrams) ?? 0,uncertaintyPercent:number(data.uncertaintyPercent) ?? 15,
      ...photoMeta(form.photo), mealTime:suggested.mealTime, mealTimeSource:suggested.mealTimeSource};
    renderPreview(view, false);
    saveToDraftBox(view);
  }
  /** Renders a stored or fresh estimate preview; a restored draft is labelled as such. */
  function renderPreview(view, restored) {
    if (!view?.id || !Array.isArray(view.items) || !view.items.length) throw new Error('这份草稿不完整，请重新估算。');
    const mealTime = clockPattern.test(String(view.mealTime||'')) ? view.mealTime : nowClock();
    const source = ['photo','text','now','manual','typical'].includes(view.mealTimeSource) ? view.mealTimeSource : 'now';
    draft={id:view.id,date:view.date,mealType:view.mealType,source:view.source,mealTime,mealTimeSource:source,...photoMeta(view)};
    $('#estimate-date').value=draft.date; $('#estimate-meal-type').value=draft.mealType;
    $('#estimate-meal-time').value=mealTime;
    $('#estimate-meal-time-note').textContent=mealTimeNote(draft);
    $('#estimate-photo-time').textContent=photoTimeLabel(draft);
    const fields=[['grams','克重 · g'],['calories','热量 · kcal'],['protein','蛋白质 · g'],['fat','脂肪 · g'],['carbs','碳水 · g']];
    const modelNote = item => {
      const model = item?.model, per100 = model?.per100;
      if (!model || !per100 || number(per100.calories) === null) return '';
      const basis = ({raw:'生重',cooked:'熟重',as_served:'食用状态'})[model.basis] || model.basis || '口径未标注';
      const range = Array.isArray(model.calorieRangePer100) && model.calorieRangePer100.length === 2 && number(item.grams) !== null
        ? ` · 此配方热量约 ${fmt(model.calorieRangePer100[0]*item.grams/100,0)}–${fmt(model.calorieRangePer100[1]*item.grams/100,0)} kcal` : '';
      return `<p class="fine-print">本地参考：${fmt(per100.calories,0)} kcal/100g · ${esc(basis)}${range}。${esc(model.note || '')}</p>`;
    };
    // Each row keeps its original estimate as a ratio baseline, so repeated gram edits never accumulate rounding drift.
    $('#estimate-items').innerHTML=view.items.map(item => `<div class="estimate-item" data-base-grams="${Number(item.grams)}" data-oil="${Number(item.oilGrams)||0}"><div class="estimate-item-head"><label>食物名称<input data-item-field="name" value="${esc(item.name)}" maxlength="120" required></label><div class="estimate-item-actions"><button type="button" class="recalc-item" title="按克重和每 100g 数据重算" aria-label="按克重重算${esc(item.name)}"><span class="inline-icon" aria-hidden="true"><img src="./icon-refresh.svg" alt="" width="17" height="17"></span></button><button type="button" class="remove-item" title="移除这项" aria-label="移除${esc(item.name)}">×</button></div></div>${modelNote(item)}${number(item.oilGrams)>0?`<p class="fine-print estimate-item-oil">这道菜的用油 ${fmt(item.oilGrams,0)} g，已含在热量与脂肪里。</p>`:''}<div class="form-grid">${fields.map(([key,label]) => `<label>${label}<input data-item-field="${key}" type="number" value="${Number(item[key])}" ${key === 'grams' ? '' : `data-base-value="${Number(item[key])}"`} min="0" max="20000" step="0.01" required></label>`).join('')}</div></div>`).join('');
    $('#estimate-source').textContent=`${view.source==='api'?'外部模型':'本地估算'} · ${view.confidence==='medium'?'中等':'低'}置信度${restored?' · 已恢复未确认草稿':''}`;
    const uncertainty=number(view.uncertaintyPercent) ?? 15;
    draft.uncertaintyPercent=uncertainty; draft.oilGrams=number(view.oilGrams) ?? 0;
    // 用油按菜归属：模型的每道菜自己带 oilGrams，且已算进那道菜的热量；顶层数只用于展示。
    const itemsOil=(view.items||[]).reduce((sum,item)=>sum+(number(item.oilGrams)||0),0);
    const totalCalories=totalsFor(view.items).calories;
    const interval=`估算区间：约 ${fmt(totalCalories*(1-uncertainty/100),0)}–${fmt(totalCalories*(1+uncertainty/100),0)} kcal（±${fmt(uncertainty,0)}%）`;
    const oilNote=itemsOil>0
      ? `用油已按菜计入 ${fmt(itemsOil,0)} g（约 ${fmt(itemsOil*9,0)} kcal），已含在各菜的热量与脂肪里，不用再单独加`
      : draft.oilGrams>0
        ? `已计入烹调用油 ${fmt(draft.oilGrams,0)} g（约 ${fmt(draft.oilGrams*9,0)} kcal）`
        : '照片看不到锅底积油；红烧、干煸这类已按方法取中位值，清蒸白灼按 0 计';
    const lowNote='识别结果可能有偏差，请核对份量与克重；不确定的项按常见份量取中位值即可，不必刻意往高报。';
    $('#estimate-notes').innerHTML=[interval,oilNote,lowNote].concat(Array.isArray(view.notes)?view.notes:[]).map(note=>`<li>${esc(note)}</li>`).join('');
    $('#estimate-name').value=view.name || view.items.map(item=>item.name).join('、').slice(0,120);
    $('#estimate-preview').hidden=false;
    feedback($('#preview-feedback'), restored?'已恢复未确认的估算，请核对日期与克重后确认保存。':'请检查数据后确认保存。');
    updatePreviewTotals();
    $('#estimate-preview').scrollIntoView({block:'nearest',behavior:'auto'});
  }

/**
 * 体检格图标：文字已经够多，用图标替代那个无意义的灰点（2026-10-29）。
 * 只映射已有资源，不新增文件；未知指标回退成空，保持排版不塌。
 */
function metricIcon(label) {
  // 取自 Lucide（MIT）：蛋白用鸡腿、脂肪用水滴，两类轮廓差异最大；其余同样 24 网格、1.7 描边。
  const glyphs = {
    热量: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3q1 4 4 6.5t3 5.5a1 1 0 0 1-14 0 5 5 0 0 1 1-3 1 1 0 0 0 5 0c0-2-1.5-3-1.5-5q0-2 2.5-4" /><circle cx="12" cy="16.6" r="1" fill="currentColor" stroke="none" /></svg>',
    蛋白质: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15.4 15.63a7.875 6 135 1 1 6.23-6.23 4.5 3.43 135 0 0-6.23 6.23" /><path d="m8.29 12.71-2.6 2.6a2.5 2.5 0 1 0-1.65 4.65A2.5 2.5 0 1 0 8.7 18.3l2.59-2.59" /><circle cx="18.2" cy="6.4" r="1" fill="currentColor" stroke="none" /></svg>',
    脂肪: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z" /><circle cx="10.6" cy="16.2" r="1" fill="currentColor" stroke="none" /></svg>',
    碳水: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 22 16 8" /><path d="M3.47 12.53 5 11l1.53 1.53a3.5 3.5 0 0 1 0 4.94L5 19l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z" /><path d="M7.47 8.53 9 7l1.53 1.53a3.5 3.5 0 0 1 0 4.94L9 15l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z" /><path d="M11.47 4.53 13 3l1.53 1.53a3.5 3.5 0 0 1 0 4.94L13 11l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z" /><path d="M20 2h2v2a4 4 0 0 1-4 4h-2V6a4 4 0 0 1 4-4Z" /><path d="M11.47 17.47 13 19l-1.53 1.53a3.5 3.5 0 0 1-4.94 0L5 19l1.53-1.53a3.5 3.5 0 0 1 4.94 0Z" /><path d="M15.47 13.47 17 15l-1.53 1.53a3.5 3.5 0 0 1-4.94 0L9 15l1.53-1.53a3.5 3.5 0 0 1 4.94 0Z" /><path d="M19.47 9.47 21 11l-1.53 1.53a3.5 3.5 0 0 1-4.94 0L13 11l1.53-1.53a3.5 3.5 0 0 1 4.94 0Z" /></svg>',
    训练: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17.596 12.768a2 2 0 1 0 2.829-2.829l-1.768-1.767a2 2 0 0 0 2.828-2.829l-2.828-2.828a2 2 0 0 0-2.829 2.828l-1.767-1.768a2 2 0 1 0-2.829 2.829z" /><path d="m2.5 21.5 1.4-1.4" /><path d="m20.1 3.9 1.4-1.4" /><path d="M5.343 21.485a2 2 0 1 0 2.829-2.828l1.767 1.768a2 2 0 1 0 2.829-2.829l-6.364-6.364a2 2 0 1 0-2.829 2.829l1.768 1.767a2 2 0 0 0-2.828 2.829z" /><path d="m9.6 14.4 4.8-4.8" /></svg>',
    睡眠: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 5h4" /><circle cx="16.6" cy="16.4" r="1" fill="currentColor" stroke="none" /><path d="M20 3v4" /><path d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401" /></svg>',
    饮水: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5.116 4.104A1 1 0 0 1 6.11 3h11.78a1 1 0 0 1 .994 1.105L17.19 20.21A2 2 0 0 1 15.2 22H8.8a2 2 0 0 1-2-1.79z" /><path d="M6 12a5 5 0 0 1 6 0 5 5 0 0 0 6 0" /></svg>'
  };
  const markup = glyphs[label];
  return markup ? `<span class="metric-glyph">${markup}</span>` : '';
}
/**
 * 动作说明：AI 排出的动作点开名字要能看懂「练什么、注意什么」。
 *
 * 这里只放通用要点（公开训练常识），不做个性化处方，也不判断能不能练；
 * 名字匹配不上时明确说没收录，不拿别的动作糊弄。
 */
  const EXERCISE_GUIDES = [
    {keys: ['颈前深蹲', '前蹲'], name: '颈前深蹲', role: '股四头为主 · 躯干更直立',
      points: ['杠贴锁骨与前束，肘高抬，别让杠往下滑。', '全程躯干直立，膝盖前移是正常的。', '核心收紧，起身不要先抬臀。']},
    {keys: ['高脚杯深蹲', '高脚杯'], name: '高脚杯深蹲', role: '学深蹲模式 · 股四头与核心',
      points: ['抱铃贴胸，手肘在膝盖内侧。', '脚跟不离地，蹲到大腿低于水平（量力而行）。', '起身时胸口先起，别先撅臀。']},
    {keys: ['保加利亚', '分腿蹲'], name: '保加利亚分腿蹲', role: '单腿 · 股四头与臀',
      points: ['后脚搭凳，前脚踩稳，重心留在前脚。', '垂直下蹲，膝盖跟脚尖同向。', '躯干微前倾更偏臀，直立更偏股四头。']},
    {keys: ['深蹲', '背蹲'], name: '深蹲', role: '下肢整体 · 股四头、臀、髋伸链',
      points: ['脚掌三点踩实，膝盖方向跟脚尖一致，不内扣。', '蹲到蹲得住背中立的深度即可，活动度不够不必硬压。', '起身先顶髋再伸膝，腰不塌不弓。']},
    {keys: ['罗马尼亚硬拉', '直腿硬拉', 'RDL'], name: '罗马尼亚硬拉', role: '腘绳与臀',
      points: ['膝盖微屈并固定，靠髋往后移下放。', '杠贴腿走，感到腘绳被拉长就返回。', '背保持中立，别用腰往下压。']},
    {keys: ['硬拉'], name: '硬拉', role: '后链 · 臀、腘绳、竖脊',
      points: ['杠贴小腿，肩在杠正上方，背保持中立。', '先蹬地再顶髋，杠贴身走直线。', '顶端站直即可，不后仰、不耸肩。']},
    {keys: ['腿举', '倒蹬'], name: '腿举', role: '股四头与臀',
      points: ['脚掌全踩踏板，腰臀贴住靠垫。', '下放到膝约 90°，别让腰离开靠垫。', '顶端不锁死膝盖。']},
    {keys: ['提踵'], name: '提踵', role: '小腿',
      points: ['全幅度：脚跟降到最低，再顶到最高。', '顶端停 1 秒，回落要慢。', '别用弹震借力。']},
    {keys: ['上斜哑铃卧推', '上斜卧推', '上斜杠铃卧推'], name: '上斜卧推', role: '上胸',
      points: ['凳面 30~45°，角度太高会变成肩推。', '肘约 45° 打开，下放到底再推。', '肩胛始终后收，别耸肩。']},
    {keys: ['哑铃卧推'], name: '哑铃卧推', role: '胸 · 两侧独立发力',
      points: ['两只哑铃同步，别一高一低。', '下放到胸侧，肘不外翻。', '推起时想象把哑铃往中间合。']},
    {keys: ['卧推', '平板卧推'], name: '卧推', role: '胸、三头、前束',
      points: ['肩胛后收下沉，脚踩实，臀不离凳。', '杠落到乳线附近，前臂接近垂直。', '手腕保持中立，别向后折。']},
    {keys: ['哑铃肩推', '肩上推举', '推举'], name: '哑铃肩推', role: '三角肌前中束',
      points: ['核心收紧，肋骨不外翻，别塌腰。', '从耳侧推到头顶上方，肘微屈。', '下放到上臂约与地面平行。']},
    {keys: ['侧平举'], name: '侧平举', role: '三角肌中束',
      points: ['重量小一点，肘略屈并固定角度。', '抬到肩高即可，别耸肩、别甩。', '下放比上举更值得控制。']},
    {keys: ['绳索下压', '三头下压'], name: '绳索下压', role: '三头',
      points: ['肘固定在身体两侧，只动前臂。', '底端稍停，感受三头收紧。', '别用体重往下压。']},
    {keys: ['臂屈伸', '双杠'], name: '双杠臂屈伸', role: '下胸与三头',
      points: ['身体前倾偏胸，直立更偏三头。', '肩别耸，下放到肩略低于肘。', '有肩痛就缩小幅度或换动作。']},
    {keys: ['俯卧撑'], name: '俯卧撑', role: '胸、三头、核心',
      points: ['身体成一条线，臀不塌不翘。', '手略宽于肩，肘朝后约 45°。', '撑不起来先做跪姿或上斜版本。']},
    {keys: ['引体'], name: '引体向上', role: '背阔与二头',
      points: ['先沉肩再拉，别一上来就屈肘。', '胸往杠上找，腿别甩。', '拉不上去用弹力带或辅助器械。']},
    {keys: ['高位下拉', '下拉'], name: '高位下拉', role: '背阔',
      points: ['先做肩胛下沉，再拉向锁骨。', '躯干微后仰即可，不后倒。', '回放控制，别让重量把手臂拽直。']},
    {keys: ['杠铃划船'], name: '杠铃划船', role: '中背与背阔',
      points: ['髋屈背平，别弓腰。', '杠拉向肚脐，肘贴近身体。', '别用身体起伏甩重量。']},
    {keys: ['坐姿划船', '器械划船', '划船'], name: '坐姿划船', role: '中背',
      points: ['胸挺起来，肩胛先收再拉。', '肘贴着身体往后。', '别用腰前后晃。']},
    {keys: ['面拉'], name: '面拉', role: '后束、中下斜方、肩袖',
      points: ['绳拉到眉心高度，肘高于手。', '末端做一点外旋，掌心朝上。', '重量轻、次数多，别甩。']},
    {keys: ['弯举'], name: '哑铃弯举', role: '二头',
      points: ['肘固定在身体两侧，别往前送。', '下放慢，别靠甩起来。', '手腕保持中立。']},
    {keys: ['直臂下压'], name: '直臂下压', role: '背阔 · 孤立',
      points: ['手臂接近伸直，以肩为轴往下压。', '肩胛下沉，别耸肩。', '躯干别前后晃。']},
    {keys: ['平板支撑', '平板'], name: '平板支撑', role: '核心抗伸展',
      points: ['肘在肩正下方，身体一条线。', '臀不塌不翘，正常呼吸。', '撑不住就缩短时间，别塌腰硬撑。']},
    {keys: ['卷腹'], name: '卷腹', role: '腹直肌',
      points: ['下巴微收，肩胛离地就够。', '别用手拉头，也别用惯性甩。', '呼气时卷起，回落控制。']},
    {keys: ['农夫行走', '农夫'], name: '农夫行走', role: '握力、核心、斜方',
      points: ['肩下沉，身体直立，别歪。', '小步快走，别憋气。', '重量以能走稳为准。']},
    {keys: ['壶铃'], name: '壶铃摇摆', role: '髋铰链 · 爆发',
      points: ['发力来自顶髋，不是手臂往上抬。', '顶端臀收紧，背保持中立。', '摆到胸口高度即可。']},
    {keys: ['跑步', '慢跑'], name: '跑步', role: '心肺训练',
      points: ['落地在重心正下方，别跨大步。', '步频偏快、身体微前倾。', '加跑量先慢后快，别一上来冲。']},
    {keys: ['有氧', '快走', '骑车', '骑行', '椭圆机', '跳绳'], name: '有氧', role: '心肺训练',
      points: ['强度以能说短句但唱不了歌为准。', '从 15~20 分钟起步，每周加 5 分钟左右。', '膝踝不适时优先低冲击的快走或椭圆机。']},
    {keys: ['拉伸'], name: '拉伸', role: '放松与活动度',
      points: ['拉到有牵拉感即可，不要疼。', '每个位置停 20~30 秒，正常呼吸。', '训练后做，别在冷身时硬压。']},
    {keys: ['杠铃肩推', '站姿推举', '站姿杠铃推举'], name: '杠铃肩推', role: '三角肌前中束与三头',
      points: ['杠从锁骨前推到头顶，肘在手腕正下方。', '核心与臀收紧，别靠后仰把杠推起来。', '下放到下巴附近即可，不追求触胸。']},
    {keys: ['阿诺德推举'], name: '阿诺德推举', role: '三角肌前中束',
      points: ['从掌心朝自己开始，推到顶时转成掌心朝前。', '重量比常规肩推轻一档。', '腰别塌，肘别完全锁死。']},
    {keys: ['俯身飞鸟', '俯身哑铃飞鸟'], name: '俯身飞鸟', role: '三角肌后束与中背',
      points: ['髋屈背平，胸口接近与地面平行。', '肘微屈固定，用肩把手肘往两侧抬。', '重量轻、次数多，别甩。']},
    {keys: ['前平举'], name: '前平举', role: '三角肌前束',
      points: ['抬到肩高即可，别超过眼睛。', '躯干别后仰借力。', '掌心朝下或相对都行，一次只选一种。']},
    {keys: ['绳索夹胸', '龙门架夹胸'], name: '绳索夹胸', role: '胸（内侧收缩）',
      points: ['肘微屈固定，双手在胸前合拢。', '身体前倾一小步，重心稳住。', '末端停一下再回放，别让配重拉着走。']},
    {keys: ['坐姿推胸', '器械推胸'], name: '坐姿推胸', role: '胸与三头（器械）',
      points: ['座椅高度让握把与胸线齐平。', '肩胛后收贴住靠背。', '推到肘微屈即可，不要锁死。']},
    {keys: ['哑铃划船', '单臂哑铃划船'], name: '单臂哑铃划船', role: '背阔与中背',
      points: ['一手一膝撑凳，背保持平直。', '肘贴着身体往后拉向髋部。', '别用躯干旋转借力。']},
    {keys: ['T杠划船', 'T 杠划船'], name: 'T 杠划船', role: '中背与背阔',
      points: ['髋屈背平，胸口朝下。', '杠拉向肚脐下方，肘贴近身体。', '顶端挤一下肩胛，回落控制。']},
    {keys: ['直腿硬拉'], name: '直腿硬拉', role: '腘绳与臀',
      points: ['膝几乎伸直但不锁死，靠髋后移。', '杠贴腿走，感到腘绳拉长就返回。', '背保持中立，别用手臂去够地面。']},
    {keys: ['臀桥', '臀推'], name: '臀桥 / 臀推', role: '臀大肌',
      points: ['顶端髋伸到躯干与大腿成一条线，别过度顶腰。', '脚跟发力，臀先收紧再起。', '停 1 秒再落，别用腰代偿。']},
    {keys: ['腿弯举'], name: '腿弯举', role: '腘绳',
      points: ['膝盖对准转轴，垫子压住脚踝上方。', '只动小腿，别抬臀借力。', '回落慢，别让配重把腿拽直。']},
    {keys: ['腿屈伸'], name: '腿屈伸', role: '股四头',
      points: ['背贴靠背，膝盖对准转轴。', '伸到接近直即可，别猛踢。', '顶端停一下，回落控制。']},
    {keys: ['箭步蹲', '弓步蹲'], name: '箭步蹲', role: '下肢单腿',
      points: ['前脚踩稳，后膝垂直下落到接近地面。', '膝盖跟脚尖同向，别内扣。', '起身用前脚发力，别靠后脚蹬。']},
    {keys: ['侧弓步'], name: '侧弓步', role: '内收肌与股四头',
      points: ['向侧跨一大步，屈髋向后坐。', '支撑脚全掌踩地，膝盖跟脚尖同向。', '幅度以能保持背中立为准。']},
    {keys: ['台阶'], name: '台阶', role: '下肢单腿与臀',
      points: ['台阶高度以踩上去膝盖不超过 90° 为准。', '整只脚踩实，别只用前脚掌。', '起身靠踩台阶那条腿，不靠后脚蹬地。']},
    {keys: ['悬垂举腿'], name: '悬垂举腿', role: '下腹与髋屈肌',
      points: ['先沉肩再抬腿，别晃。', '骨盆后倾把腿卷起来，不是单纯抬腿。', '控制下落，别摆荡。']},
    {keys: ['俄罗斯转体'], name: '俄罗斯转体', role: '腹斜肌',
      points: ['转的是胸廓，不是手臂左右甩。', '背保持中立，别弓腰。', '有腰不适就改成双脚踩地。']},
    {keys: ['死虫'], name: '死虫', role: '核心抗伸展',
      points: ['腰始终贴地，肋骨收住。', '对侧手脚缓慢伸出，呼气。', '腰离地就缩小幅度。']},
    {keys: ['鸟狗', '鸟狗式'], name: '鸟狗', role: '核心稳定与背部',
      points: ['对侧手脚伸直，骨盆保持水平。', '别抬手抬腿过高导致塌腰。', '慢起慢落，配合呼吸。']},
    {keys: ['侧平板', '侧支撑'], name: '侧平板', role: '腹斜肌与髋外侧',
      points: ['肘在肩正下方，身体一条线。', '髋别下沉，也别向上顶。', '撑不住就改成屈膝版本。']},
    {keys: ['山羊挺身', '背屈伸'], name: '山羊挺身', role: '竖脊与臀',
      points: ['髋部支点在垫子边缘，别压在腰上。', '下到躯干接近垂直即可，别过度后仰。', '用臀和竖脊发力，不是甩起来。']},
    {keys: ['锤式弯举'], name: '锤式弯举', role: '二头与肱肌',
      points: ['掌心相对，肘固定在体侧。', '别用肩前后晃。', '下放慢，手腕保持中立。']},
    {keys: ['窄距卧推'], name: '窄距卧推', role: '三头与胸内侧',
      points: ['握距略窄于肩，肘贴近身体。', '杠落到下胸，前臂接近垂直。', '推起时别让肘外翻。']},
    {keys: ['上斜飞鸟', '哑铃飞鸟'], name: '上斜飞鸟', role: '上胸（拉伸位）',
      points: ['肘微屈固定，像抱树一样打开。', '下放到胸侧有牵拉感即可，别过深。', '重量轻，肩不适就换成夹胸。']},
    {keys: ['波比跳'], name: '波比跳', role: '全身心肺',
      points: ['撑地时肩在手腕上方，背别塌。', '落地屈膝缓冲，别直腿砸地。', '累了就改成走步版，别硬追次数。']},
    {keys: ['开合跳'], name: '开合跳', role: '心肺热身',
      points: ['落地轻，膝盖微屈缓冲。', '手臂到头顶即可，别耸肩。', '膝踝不适改做低冲击版本。']},
    {keys: ['跳绳'], name: '跳绳', role: '心肺与小腿',
      points: ['手腕摇绳，跳起 2~3 cm 即可。', '落地前脚掌，膝盖微屈。', '从 30 秒一组起步，别一上来猛跳。']},
    {keys: ['划船机'], name: '划船机', role: '心肺与全身后链',
      points: ['顺序是腿 → 髋 → 手，回来反过来。', '背保持中立，别弓腰拉。', '阻力和桨频先稳，再谈速度。']},
    {keys: ['椭圆机'], name: '椭圆机', role: '低冲击心肺',
      points: ['脚掌全踩踏板，别踮脚。', '手推拉与腿同步，躯干别晃。', '阻力以能说短句为准。']},
    {keys: ['动感单车', '单车', '骑行台'], name: '动感单车', role: '心肺与股四头',
      points: ['座椅高度让踩到底膝盖微屈。', '踏频 70~90 转/分，别只靠重阻力。', '腰别弓，肩放松。']},
    {keys: ['游泳'], name: '游泳', role: '全身低冲击心肺',
      points: ['先热身肩与踝，再下水。', '呼吸节奏比速度重要。', '抽筋或耳不适就停，不硬撑。']},
    {keys: ['史密斯机深蹲', '史密斯深蹲'], name: '史密斯机深蹲', role: '股四头与臀 · 固定轨迹',
      points: ['脚位比自由深蹲略前一点，膝盖仍在脚尖上方。', '起身沿轨道走，别把重量全压在膝上。', '活动度不够就先减小幅度。']},
    {keys: ['史密斯机卧推', '史密斯卧推'], name: '史密斯机卧推', role: '胸与三头',
      points: ['凳位调到杠落到乳线附近。', '肩胛后收下沉，别为了触胸而耸肩。', '轨迹固定，推起时肘别外翻。']},
    {keys: ['髋内收', '内收肌'], name: '髋内收', role: '大腿内收肌',
      points: ['坐稳贴住靠垫，双腿在挡板内合拢。', '幅度以不疼为准，别硬压。', '回落慢，别让配重把腿弹开。']},
    {keys: ['坐姿绳索划船', '坐姿划船机'], name: '坐姿绳索划船', role: '中背与背阔',
      points: ['胸挺直，膝微屈，脚踩稳。', '先收肩胛，再把手拉向腹部。', '回放慢，别让配重把背拉弯。']},
    {keys: ['反手引体', '反手引体向上', 'chin-up'], name: '反手引体向上', role: '背阔与二头',
      points: ['反握与肩同宽，先沉肩再拉。', '胸往杠上找，腿别甩。', '下放控制，拉不上去用辅助带。']},
    {keys: ['坐姿提踵'], name: '坐姿提踵', role: '小腿（比目鱼肌）',
      points: ['膝上压住垫子，脚跟降到最低再顶起。', '顶端停 1 秒，回落要慢。', '别用弹震借力。']},
    {keys: ['早安式', '早安式体前屈'], name: '早安式', role: '腘绳与竖脊',
      points: ['杠放斜方，膝微屈固定。', '髋往后移，背保持中立。', '下到躯干接近水平即可，别弓腰。']},
    {keys: ['集中弯举'], name: '集中弯举', role: '二头（单侧）',
      points: ['肘抵住大腿内侧固定。', '只动前臂，别抬肩。', '下放慢，顶端略停。']},
    {keys: ['斜托弯举', '牧师凳弯举', 'preacher'], name: '斜托弯举', role: '二头',
      points: ['腋下贴住斜托，肩别前移。', '下放到手臂接近伸直但不锁死。', '别用肩把重量抬起来。']},
    {keys: ['仰卧臂屈伸', '碎颅者', 'skullcrusher'], name: '仰卧臂屈伸', role: '三头',
      points: ['肘指向天花板，只动前臂。', '杠落到额头上方即可，别砸头。', '肘别向外张。']},
    {keys: ['反向飞鸟'], name: '反向飞鸟', role: '三角肌后束',
      points: ['俯身或坐姿前倾，肘微屈固定。', '用肩把手肘往两侧抬，不是用手甩。', '重量轻、次数多。']},
    {keys: ['耸肩'], name: '耸肩', role: '斜方肌上部',
      points: ['只做上下，不要绕圈。', '顶端停一下再放。', '别用屈膝或甩身体借力。']},
    {keys: ['腕弯举'], name: '腕弯举', role: '前臂屈肌',
      points: ['前臂贴凳或大腿，只动手腕。', '全幅度慢速，顶端停一下。', '重量小一点，手腕别酸到发麻。']},
    {keys: ['仰卧举腿'], name: '仰卧举腿', role: '下腹与髋屈肌',
      points: ['腰始终贴地，腿伸到接近地面再收回。', '别用惯性摆腿。', '腰一离地就缩小幅度。']},
    {keys: ['空中自行车', '自行车卷腹'], name: '空中自行车', role: '腹直肌与腹斜肌',
      points: ['对侧肘膝相触，转的是胸廓。', '腰贴地，别把脖子拉起来。', '慢比快更有效。']},
    {keys: ['反向卷腹'], name: '反向卷腹', role: '下腹',
      points: ['骨盆后倾，把膝盖卷向胸口。', '别用腿甩起来。', '回落控制，腰别离地太多。']},
    {keys: ['绳索卷腹', '跪姿绳索卷腹'], name: '绳索卷腹', role: '腹直肌',
      points: ['跪姿，绳在头侧。', '用腹肌把胸廓卷向骨盆。', '髋别前后晃。']},
    {keys: ['登山跑', '登山者'], name: '登山跑', role: '核心与心肺',
      points: ['手在肩正下方，背保持平。', '膝盖交替向胸口收。', '臀别抬高，别塌腰。']},
    {keys: ['跳箱'], name: '跳箱', role: '下肢爆发',
      points: ['箱高以落地能稳住为准。', '轻落地、屈膝缓冲。', '跳不上去就走上去，别硬冲。']},
    {keys: ['药球砸地', '药球'], name: '药球砸地', role: '核心爆发',
      points: ['举过头顶，用核心往下砸。', '砸完接住或让球弹一次。', '别弓腰去够地面。']},
    {keys: ['器械夹胸', '蝴蝶机', '夹胸机'], name: '器械夹胸', role: '胸（内侧收缩）',
      points: ['背贴靠垫，肘微屈。', '双手在胸前合拢，停一下。', '回放别过深，肩别前移。']},
    {keys: ['绳索弯举'], name: '绳索弯举', role: '二头',
      points: ['肘固定在体侧，别往前送。', '底端不放松，顶端挤一下。', '别后仰借力。']},
    {keys: ['直臂下拉'], name: '直臂下拉', role: '背阔（孤立）',
      points: ['手臂接近伸直，以肩为轴往下压。', '肩胛下沉，别耸肩。', '躯干别前后晃。']},
    {keys: ['相扑硬拉', '相扑式硬拉'], name: '相扑硬拉', role: '臀与大腿内侧',
      points: ['站距宽、脚尖外展，膝对着脚尖。', '杠贴腿，先蹬地再顶髋。', '背保持中立，别弓。']},
    {keys: ['泽奇深蹲'], name: '泽奇深蹲', role: '股四头与核心',
      points: ['杠抱在肘弯里，贴紧躯干。', '肘抬高防滑，核心绷紧。', '躯干更直立，别前倾。']},
    {keys: ['单腿臀桥'], name: '单腿臀桥', role: '臀大肌（单侧）',
      points: ['一腿伸直抬起，另一脚踩地。', '顶端臀收紧，髋伸到一条线。', '别用顶腰代替伸髋。']},
    {keys: ['反向划船', 'inverted row'], name: '反向划船', role: '中背与背阔',
      points: ['杠在腰高，身体保持一条线。', '先收肩胛，再拉胸向杠。', '脚越往前越难，量力调整。']},
    {keys: ['杠铃臀推'], name: '杠铃臀推', role: '臀大肌',
      points: ['上背靠凳，杠压在髋部（垫个护垫）。', '顶端臀收紧停 1 秒。', '下巴微收，别用顶腰代替伸髋。']},
    {keys: ['器械推肩', '坐姿推肩'], name: '器械推肩', role: '三角肌与三头',
      points: ['座椅让握把与肩同高。', '肩胛下沉，背贴靠垫。', '推到肘微屈即可，别锁死。']},
    {keys: ['绳索拉臀', 'pull through'], name: '绳索拉臀', role: '臀与腘绳',
      points: ['背对绳索，绳从胯下穿过。', '先髋后移，再顶髋站直。', '别用手臂拉，也别弓腰。']}
  ];

  /** 新手向的一句话「怎么做」：只描述动作过程，不讲训练安排。 */
  const EXERCISE_HOW = {
    '颈前深蹲': '杠放锁骨前、肘抬高，直上直下蹲起。',
    '高脚杯深蹲': '抱哑铃贴胸，屈髋下蹲再站起。',
    '保加利亚分腿蹲': '后脚搭凳，前腿屈膝下蹲再站起。',
    '深蹲': '双脚与肩同宽，屈髋下蹲再站起。',
    '罗马尼亚硬拉': '膝微屈，髋后移把杠下放再顶髋。',
    '硬拉': '杠贴小腿，蹬地顶髋把杠拉起。',
    '腿举': '坐靠垫，双脚蹬板伸腿再屈膝。',
    '提踵': '前脚掌踩高，脚跟抬起再落下。',
    '上斜卧推': '凳调 30~45°，把杠从胸上方推起。',
    '哑铃卧推': '仰卧，两只哑铃从胸侧推起。',
    '卧推': '仰卧，杠从乳线推到手臂伸直。',
    '哑铃肩推': '坐姿，哑铃从耳侧推到头顶。',
    '侧平举': '双臂微屈，从体侧抬到肩高。',
    '绳索下压': '站绳索前，肘固定，把绳往下压到伸直。',
    '双杠臂屈伸': '撑双杠，屈肘下放再撑起。',
    '俯卧撑': '手撑地，身体一条线，屈肘下放再撑起。',
    '引体向上': '握杠悬垂，把身体拉到下巴过杠。',
    '高位下拉': '坐姿，把横杆拉到锁骨前。',
    '杠铃划船': '俯身握杠，把杠拉向肚脐。',
    '坐姿划船': '坐姿拉把手到腹部，先收肩胛。',
    '面拉': '把绳拉向眉心，肘高于手。',
    '哑铃弯举': '站姿，屈肘把哑铃举到肩前。',
    '直臂下压': '手臂近直，以肩为轴把杆压向大腿。',
    '平板支撑': '肘撑地，身体一条线保持不动。',
    '卷腹': '仰卧屈膝，肩胛离地卷起上背。',
    '农夫行走': '两手提重物，小步走稳。',
    '壶铃摇摆': '屈髋后摆，再顶髋把壶铃甩到胸前。',
    '跑步': '保持步频，落地在重心下方。',
    '有氧': '快走、骑车或椭圆机，持续 15~30 分钟。',
    '拉伸': '把肌肉拉到有牵拉感，停 20~30 秒。',
    '杠铃肩推': '站姿把杠从锁骨推到头顶。',
    '阿诺德推举': '掌心朝内起推，推到顶转成掌心朝前。',
    '俯身飞鸟': '俯身，双臂向两侧打开再合。',
    '前平举': '手臂伸直，把哑铃抬到肩高。',
    '绳索夹胸': '站龙门架中间，双臂向前合拢。',
    '坐姿推胸': '坐器械前，把把手推到手臂近直。',
    '单臂哑铃划船': '一手撑凳，另一手把哑铃拉向髋。',
    'T 杠划船': '俯身握 T 杠，拉向胸腹。',
    '直腿硬拉': '膝近直，髋后移把杠下放。',
    '臀桥 / 臀推': '上背靠地或凳，顶髋把臀收紧。',
    '腿弯举': '俯卧或坐姿，屈膝把垫子勾起。',
    '腿屈伸': '坐器械，伸膝把小腿抬起。',
    '箭步蹲': '向前跨一步，双膝弯曲下蹲再起。',
    '侧弓步': '向侧跨大步，屈髋下蹲再回。',
    '台阶': '单脚踩上台阶，蹬起再退下。',
    '悬垂举腿': '悬垂，屈髋把腿抬向胸口。',
    '俄罗斯转体': '坐姿后仰，胸廓左右转。',
    '死虫': '仰卧，对侧手脚缓慢伸直再收回。',
    '鸟狗': '四点支撑，对侧手脚伸直保持。',
    '侧平板': '侧撑，髋抬起让身体成一条线。',
    '山羊挺身': '俯卧器械，屈髋下放再挺身。',
    '锤式弯举': '掌心相对，屈肘举起哑铃。',
    '窄距卧推': '窄握杠，屈肘下放到下胸再推起。',
    '上斜飞鸟': '上斜凳，双臂打开再合拢。',
    '波比跳': '下蹲撑地跳成平板，再收腿跳起。',
    '开合跳': '跳起分腿同时双手上举，再并回。',
    '跳绳': '手腕摇绳，前脚掌轻跳。',
    '划船机': '腿蹬、髋伸、手拉，回程反过来。',
    '椭圆机': '双脚踩踏板，手脚同步前后摆。',
    '动感单车': '坐稳蹬踏，保持 70~90 转/分。',
    '游泳': '在水中用自由泳或蛙泳连续游。',
    '史密斯机深蹲': '杠在轨道上，屈髋下蹲再站起。',
    '史密斯机卧推': '仰卧，把杠沿轨道推到顶。',
    '髋内收': '坐器械，双腿从外向内合拢。',
    '坐姿绳索划船': '坐姿把绳索把手拉向腹部。',
    '反手引体向上': '反握杠，把身体拉到下巴过杠。',
    '坐姿提踵': '坐姿膝上压垫，脚跟抬起再落下。',
    '早安式': '杠放斜方，屈髋前倾再起身。',
    '集中弯举': '肘抵大腿，单手屈肘举起。',
    '斜托弯举': '腋下贴斜托，屈肘举起再放下。',
    '仰卧臂屈伸': '仰卧，屈肘把杠下放到额头再伸直。',
    '反向飞鸟': '俯身，双臂向两侧打开。',
    '耸肩': '站直，把肩膀耸到耳旁再落下。',
    '腕弯举': '前臂固定，只动手腕卷起重量。',
    '仰卧举腿': '仰卧，双腿伸直抬到垂直再慢落。',
    '空中自行车': '仰卧，对侧肘膝相碰，交替蹬腿。',
    '反向卷腹': '仰卧，屈膝把骨盆卷向胸口。',
    '绳索卷腹': '跪姿握绳，卷腹把肘拉向膝。',
    '登山跑': '平板撑，双膝交替向胸口收。',
    '跳箱': '屈膝摆臂跳上箱，再轻落。',
    '药球砸地': '举球过顶，用力向地面砸。',
    '器械夹胸': '坐蝴蝶机，双臂向中间合拢。',
    '绳索弯举': '站绳索前，屈肘把绳拉起。',
    '直臂下拉': '站高位下拉前，手臂伸直往下压。',
    '相扑硬拉': '宽站距，蹬地顶髋拉起杠。',
    '泽奇深蹲': '杠抱肘弯，屈髋下蹲再站起。',
    '单腿臀桥': '单脚踩地，顶髋把臀抬起。',
    '反向划船': '握低杠，身体后仰把胸拉向杠。',
    '杠铃臀推': '上背靠凳，杠压髋部顶起。',
    '器械推肩': '坐器械，把把手从肩高推到头顶。',
    '绳索拉臀': '背对绳索，髋后移再顶髋。'
  };
  /** 去掉空白与括号补充，名字里常见的「（器械版）」不影响匹配。 */
  function normalizeExerciseName(value) {
    return String(value || '').replace(/\s+/g, '').replace(/[（(][^）)]*[）)]/g, '');
  }
  /** 精确优先、其次取最长关键词：这样「颈前深蹲」不会被「深蹲」抢走。 */
  function exerciseGuideFor(name) {
    const raw = String(name || '').trim();
    const text = normalizeExerciseName(raw);
    let best = null, bestLen = 0;
    if (text) {
      for (const guide of EXERCISE_GUIDES) {
        for (const key of guide.keys) {
          if (text.includes(key) && key.length > bestLen) { best = guide; bestLen = key.length; }
        }
      }
    }
    if (best) return best;
    return {
      name: raw || '这个动作',
      role: '本地还没有收录这个动作',
      points: ['先把动作名记准；下次记录沿用同一个名字，才能对上次的组次与负重。',
        '不确定器械或发力位置时，先问教练或看一遍示范，不要直接上大重量。']
    };
  }
  function closeExerciseGuide() {
    const root = $('#exercise-guide');
    if (root) root.hidden = true;
  }
  function showExerciseGuide(name) {
    const root = $('#exercise-guide');
    if (!root) { notice('动作说明暂时打不开。', true); return; }
    const guide = exerciseGuideFor(name);
    $('#exercise-guide-title').textContent = guide.name;
    $('#exercise-guide-role').textContent = guide.role;
    // 新手先看「怎么做」，再看要点；没有收录时这行不出现，不留空白。
    const how = EXERCISE_HOW[guide.name] || '';
    const howNode = $('#exercise-guide-how');
    if (howNode) { howNode.hidden = !how; howNode.textContent = how ? '怎么做：' + how : ''; }
    $('#exercise-guide-points').innerHTML = guide.points.map(point => '<li>' + esc(point) + '</li>').join('');
    root.hidden = false;
    const ok = $('#exercise-guide-ok');
    if (ok) ok.focus();
  }
  function installExerciseGuide() {
    const root = $('#exercise-guide');
    if (!root || root.dataset.wired) return;
    root.dataset.wired = '1';
    const ok = $('#exercise-guide-ok');
    if (ok) ok.addEventListener('click', closeExerciseGuide);
    root.addEventListener('click', event => { if (event.target === root) closeExerciseGuide(); });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && !root.hidden) closeExerciseGuide();
    });
  }
/* Fragment of assets/app.js -- assembled by tools/assemble-app.ps1 in filename order.
 * Edit this file, never the generated assets/app.js; tests/app-fragments.test.mjs fails on drift. */
  // ---- Unconfirmed draft box -------------------------------------------------------------------
  // A photo estimate is expensive to redo, so the preview is stored on the phone until it is either
  // confirmed or dropped. The image itself is never stored.
  let favoriteOnlyChats = false, favoriteOnlyMeals = false;
  // Long answers are clamped to one readable block; expanding is remembered per record id.
  const expandedChats = new Set();
  function bindFavoriteFilter(buttonId, apply) {
    const button = $('#' + buttonId);
    if (!button) return;
    button.addEventListener('click', () => {
      const next = button.getAttribute('aria-pressed') !== 'true';
      button.setAttribute('aria-pressed', next ? 'true' : 'false');
      apply(next);
    });
  }
  bindFavoriteFilter('chat-favorites-only', value => {favoriteOnlyChats = value; resetChatPaging(); renderChat();});
  bindFavoriteFilter('meal-favorites-only', value => {favoriteOnlyMeals = value; render();});
  let storedDrafts = [];
  async function loadDrafts() {
    try {const data = await api('/api/drafts'); storedDrafts = Array.isArray(data?.drafts) ? data.drafts : [];}
    catch {storedDrafts = [];}
    renderDraftBox();
  }
  function renderDraftBox() {
    const box = $('#draft-box'); if (!box) return;
    box.hidden = !storedDrafts.length;
    if (!storedDrafts.length) {const list = $('#draft-list'); if (list) list.replaceChildren(); return;}
    $('#draft-box-text').textContent = `有 ${storedDrafts.length} 份未确认的估算，确认前不会计入当天。`;
    const list = $('#draft-list');
    if (!list) return;
    list.innerHTML = storedDrafts.map(row => {
      const when = number(row.savedAt) !== null ? new Date(Number(row.savedAt)).toLocaleString('zh-CN',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'}) : '时间未知';
      const count = Array.isArray(row.items) ? row.items.length : 0;
      const clock = clockPattern.test(String(row.mealTime||'')) ? row.mealTime : '时间未定';
      return `<div class="list-row" role="listitem"><div class="list-main"><p class="list-title">${esc(row.name || '未命名估算')}</p>`
        + `<p class="list-meta">${esc(row.date || '日期未知')} · ${esc(mealNames[row.mealType] || row.mealType || '餐食')} · ${esc(clock)} · ${count} 项食品 · ${esc(when)}</p></div>`
        + `<div class="list-actions"><button type="button" class="button subtle" data-draft-restore="${esc(row.id)}">恢复</button>`
        + `<button type="button" class="text-button danger-text" data-draft-drop="${esc(row.id)}" aria-label="丢弃这份估算草稿">丢弃</button></div></div>`;
    }).join('');
  }
  async function saveToDraftBox(view) {
    const stored = {id:view.id,date:view.date,mealType:view.mealType,source:view.source,confidence:view.confidence,
      notes:view.notes,items:view.items,name:view.name,mealTime:view.mealTime,mealTimeSource:view.mealTimeSource,...photoMeta(view)};
    try {await api('/api/drafts',{draft:stored}); await loadDrafts();} catch {/* the preview still works without the draft box */}
  }
  async function dropDraft(id) {
    if (!id) return;
    try {await api(`/api/drafts/${encodeURIComponent(id)}`,undefined,'DELETE');} catch {}
    await loadDrafts();
  }
  function readItems(validate=false) {
    const rows=$$('.estimate-item'); if(!rows.length) {if(validate) throw new Error('请至少保留一项食物。');return [];}
    return rows.map(row => {const item={};$$('[data-item-field]',row).forEach(input=>{if(validate && !input.reportValidity()) throw new Error('请补全食物名称并填写有效的非负数值。');item[input.dataset.itemField]=input.dataset.itemField==='name'?input.value.trim():number(input.value);});const oil=number(row.dataset.oil);if(oil>0)item.oilGrams=oil;if(validate && !item.name) {markFieldInvalid($('[data-item-field="name"]', row), '请填写食物名称。'); throw new Error('请填写食物名称。');}return item;});
  }
  /** Canonical totals for the draft: line items plus the cooking oil that was estimated separately. */
  /** Carbs a row does not state but its calories imply; mirrors NutritionMath.inferredCarbs on the client. */
  function carbOfItem(item) {
    const carbs = number(item.carbs);
    if (carbs !== null && carbs > 0) return carbs;
    const kcal = number(item.calories), protein = number(item.protein) ?? 0, fat = number(item.fat) ?? 0;
    if (kcal === null) return carbs ?? 0;
    const rest = kcal - protein * 4 - fat * 9;
    return rest > 60 ? Math.round(rest / 4 * 10) / 10 : (carbs ?? 0);
  }
  function estimateTotals(items) {
    // A row can arrive with calories, protein and fat but no carbs; the preview must not show 0 carbs
    // for a 261 kcal bowl of rice. The saved record applies the same rule server-side.
    const patched = (items || []).map(item => ({...item, carbs: carbOfItem(item)}));
    const totals = totalsFor(patched);
    // 用油按菜归属后，油已经算在各菜的 calories/fat 里；只有旧草稿（菜里没有 oilGrams）才把整餐油再加一次。
    const itemsOil = (patched || []).reduce((sum, item) => sum + (number(item.oilGrams) || 0), 0);
    const oil = itemsOil > 0 ? 0 : (number(draft?.oilGrams) ?? 0);
    if (oil > 0) {
      totals.calories = (totals.calories ?? 0) + oil * 9;
      totals.fat = (totals.fat ?? 0) + oil;
    }
    return totals;
  }
  function updatePreviewTotals() {const totals=estimateTotals(readItems());$('#estimate-totals').textContent=`合计：${fmt(totals.calories)} kcal · 蛋白质 ${fmt(totals.protein)}g · 脂肪 ${fmt(totals.fat)}g · 碳水 ${fmt(totals.carbs)}g`;}
  function discardDraft() {if(savingDraft) return;const id=draft?.id;draft=null;$('#estimate-preview').hidden=true;$('#estimate-items').replaceChildren();dropDraft(id);}
  async function confirmDraft() {
    if(!draft || savingDraft) return;
    const button=$('#confirm-estimate'),message=$('#preview-feedback');
    try {
      const items=readItems(true),name=$('#estimate-name').value.trim(); if(!name || !$('#estimate-name').reportValidity()) {if(!name) markFieldInvalid($('#estimate-name'), '请填写餐食名称。'); throw new Error('请填写餐食名称。');}
      const totals=estimateTotals(items);if(Object.values(totals).some(value=>value===null || !Number.isFinite(value))) throw new Error('请填写全部营养数值。');
      const date=$('#estimate-date').value, mealType=$('#estimate-meal-type').value, mealTime=$('#estimate-meal-time').value;
      if(!validDate(date) || !$('#estimate-date').reportValidity()) {if(!validDate(date)) markFieldInvalid($('#estimate-date'), '请核对有效的饮食日期。'); throw new Error('请核对有效的饮食日期。');}
      if(!clockPattern.test(mealTime) || !$('#estimate-meal-time').reportValidity()) {if(!clockPattern.test(mealTime)) markFieldInvalid($('#estimate-meal-time'), '请填写有效的进餐时间（HH:mm）。'); throw new Error('请填写有效的进餐时间（HH:mm）。');}
      draft.date=date; draft.mealType=mealType;
      // The user just confirmed it, so it is no longer a guess.
      draft.mealTime=mealTime; draft.mealTimeSource='manual';
      savingDraft=true;button.disabled=true;$('#cancel-estimate').disabled=true;feedback(message,'正在保存确认后的餐食…');
      await api('/api/meals',{estimateId:draft.id,date:draft.date,mealType:draft.mealType,mealTime:draft.mealTime,name,source:draft.source,...photoMeta(draft),items,...totals,totals,
        // The oil amount the estimate already counted stays on the record, so the numbers remain explainable.
        ...(number(draft.oilGrams)>0?{oilGrams:number(draft.oilGrams),oilIncluded:true}:{}),
        ...(number(draft.uncertaintyPercent)!==null?{uncertaintyPercent:number(draft.uncertaintyPercent)}:{})});
      // Keep draftId on failures so native idempotency prevents duplicate confirmations.
      const savedDate=draft.date; activeDate=savedDate; $('#active-date').value=savedDate; syncActiveDateLabel();
       draft=null;$('#estimate-preview').hidden=true;$('#estimate-form').reset();setDefaultDates();clearImage();feedback($('#estimate-feedback'),`餐食已确认保存到 ${savedDate}，已切换到该日汇总。`);
      try {await loadState({quiet:true});} catch {feedback($('#estimate-feedback'),'已保存，但刷新失败。请重新加载检查记录，不要再次估算保存。',true);}
      loadDrafts().catch(() => {});
    } catch(error) {feedback(message,error.message,true);} finally {savingDraft=false;button.disabled=false;$('#cancel-estimate').disabled=false;}
  }
  function setActiveDate(value) {
    if(!validDate(value)) return false;
    activeDate=value; $('#active-date').value=value; syncActiveDateLabel(); setDefaultDates(); render();
    const content=$('#advice-content'); content.textContent=''; content.removeAttribute('data-date');
    return true;
  }
  // ---- Meals that carry no usable date ----------------------------------------------------------
  // They belong to no day, so they are invisible in every day view, in the advice and in the chat
  // context. Rather than guessing, the app says how many there are and asks for the date.
  function undatedMeals() {return (state.meals || []).filter(row => row && (row.needsDate === true || !validDate(row.date)));}
  function renderUndatedMeals() {
    const box = $('#undated-meals'); if (!box) return;
    const rows = undatedMeals();
    box.hidden = !rows.length;
    if (!rows.length) return;
    $('#undated-meals-text').textContent = `有 ${rows.length} 条餐食记录缺少日期，不会出现在任何一天，也不会进入建议和问答。请选择它们所属的日期。`;
    const input = $('#undated-meals-date');
    if (input && !input.value) input.value = activeDate;
  }
  async function applyUndatedDate() {
    const rows = undatedMeals(), input = $('#undated-meals-date'), value = input ? input.value : '';
    if (!rows.length) return;
    if (!validDate(value)) {notice('请先选择有效日期。', true); return;}
    const button = $('#undated-meals-apply');
    if (button) button.disabled = true;
    try {
      for (const row of rows) {const {needsDate, ...rest} = row; await api('/api/meals', {...rest, date:value});}
      await loadState({quiet:true});
      notice(`已把 ${rows.length} 条记录归入 ${value}。`);
    } catch (error) {notice(error.message, true);}
    finally {if (button) button.disabled = false;}
  }
  // ---- What would be sent, shown before anything is sent ----------------------------------------
  async function showContextPreview(kind, node, date) {
    if (!node) return;
    if (!window.QinghengAdapter.hasNative()) {node.textContent = '浏览器演示不发送数据到外部模型，因此这里没有可预览的内容。'; return;}
    if (node.dataset.loaded === date) return;
    node.textContent = '正在整理本次将发送的数据…';
    try {
      const data = await api('/api/context-preview', {date, kind});
      node.textContent = `【系统提示词】\n${data?.system || ''}\n\n【本次数据】\n${JSON.stringify(data?.user ?? null, null, 2)}`;
      node.dataset.loaded = date;
    } catch (error) {node.textContent = error.message;}
  }
  function installContextPreview(panelId, nodeId, kind) {
    const panel = $('#' + panelId);
    if (!panel) return;
    panel.addEventListener('toggle', () => {if (panel.open) showContextPreview(kind, $('#' + nodeId), activeDate).catch(() => {});});
  }
  // ---- Hub entries and sub-page navigation -------------------------------------------------------
  const APP_VERSION = '1.3.70';
  document.addEventListener('click', event => {
    const entry = event.target.closest('[data-subpage-open]');
    if (entry) {openSubpage(entry.dataset.subpageOpen); return;}
    const back = event.target.closest('[data-subpage-back]');
    if (back) {
      // Prefer real history so the system back button and this button do the same thing.
      const {sub} = parseHash();
      if (sub) {try {history.back();} catch {switchTab('profile', false, '');}}
    }
  });
  function renderHub() {
    const version = $('#about-version');
    if (version) version.textContent = `v${APP_VERSION}`;
    const profile = state.profile || {};
    const targets = $('#hub-summary-targets');
    if (targets) {
      const height = number(profile.height), age = number(profile.age), calorie = number(profile.calorieTarget);
      const training = plannedSessions();
      // Same source as the 今天 page: a lean plan must not be summarised with the recomp ranges.
      const range = intakeRangeForDate();
      const bits = [
        GOAL_LABEL[profile.goal] || '未设置目标',
        height !== null ? `${fmt(height,0)} cm` : '身高未填',
        age !== null ? `${fmt(age,0)} 岁` : '年龄未填',
        training !== null ? `每周 ${fmt(training,0)} 练` : '训练次数未填',
        calorie !== null ? `训练日 ${fmt(range.trainingDay.min,0)}~${fmt(range.trainingDay.max,0)} / 休息日 ${fmt(range.restDay.min,0)}~${fmt(range.restDay.max,0)} kcal` : '目标未测算'
      ];
      targets.textContent = bits.join(' · ');
    }
    const model = $('#hub-summary-model');
    if (model) {
      const settings = state.settings || {};
      const provider = ({deepseek: 'DeepSeek', bai: 'B.AI', siliconflow: '硅基流动'})[settings.provider] || 'DeepSeek';
      model.textContent = settings.apiConfigured === true ? `${provider} · 已配置${settings.visionEnabled === true ? '（含图片）' : ''}` : `${provider} · 未配置`;
    }
    const about = $('#hub-summary-about');
    if (about) about.textContent = `v${APP_VERSION} · 本机存储`;
  }
  /** Shows which prompt/口径/anchors produced the records, and when the last backup was made. */
  async function loadVersions() {
    const box = $('#version-info');
    if (!box) return;
    try {
      const info = await api('/api/versions');
      const backup = info?.backupAt ? new Date(info.backupAt).toLocaleString('zh-CN') : '从未';
      const anchors = info?.anchorsPresent
        ? `锚点 ${info.anchorsUpdatedAt ? new Date(info.anchorsUpdatedAt).toLocaleDateString('zh-CN') : '已同步'}`
        : '锚点未同步';
      const repaired = number(info?.chatAnswersRepaired) ?? 0;
      // Privacy-safe histogram of stored answers; shows what a broken answer actually looks like.
      const audit = Array.isArray(info?.answerAudit) ? info.answerAudit.join(' · ') : '';
      const coldStart = number(info?.coldStartMs) ?? 0;
      box.innerHTML = `<span>应用 <b>v${esc(info?.appVersion || APP_VERSION)}</b></span><span>提示词 <b>v${fmt(info?.promptVersion, 0)}</b></span><span>口径 <b>v${fmt(info?.rulesVersion, 0)}</b></span><span>${esc(anchors)}</span><span>上次备份 <b>${esc(backup)}</b></span>`
        + (repaired > 0 ? `<span>已修复 <b>${fmt(repaired, 0)}</b> 条无效回答</span>` : '')
        + (audit ? `<span>问答体检 <b>${esc(audit)}</b></span>` : '')
        + (coldStart > 0 ? `<span>冷启动 <b>${fmt(coldStart, 0)}</b> ms</span>` : '')
        + (window.TRAINING_PRINCIPLES
          ? `<span>建议库 <b>${esc(window.TRAINING_PRINCIPLES.version)}</b> · ${window.TRAINING_PRINCIPLES.rules.length} 条 · ${window.TRAINING_PRINCIPLES.sources.length} 来源</span>`
          : '')
        + bodyPartHints();
    } catch (error) {
      box.textContent = error.message;
    }
  }
  /** 「按部位查解剖要点」：每个部位取 2~3 条最相关的规则，带口述时间戳。 */
  function bodyPartHints() {
    const lib = window.TRAINING_PRINCIPLES;
    if (!lib || !Array.isArray(lib.rules)) return '';
    const parts = [
      {label: '关节活动度', tags: ['anatomy', 'warmup']},
      {label: '胸', tags: ['push']},
      {label: '肩', tags: ['shoulder']},
      {label: '背', tags: ['pull']},
      {label: '手臂', tags: ['isolation', 'arm']},
      {label: '腹肌 / 核心', tags: ['abs']},
      {label: '腿 / 臀', tags: ['legs']},
      {label: '减脂与恢复', tags: ['fatloss', 'recovery', 'sleep']}
    ];
    const order = Array.isArray(lib.priority) ? lib.priority : [];
    const rank = source => { const index = order.indexOf(source); return index >= 0 ? index : 9; };
    const rows = parts.map(part => {
      const hits = lib.rules
        .filter(rule => (rule.tags || []).some(tag => part.tags.includes(tag)))
        .sort((a, b) => rank(a.source) - rank(b.source))
        .slice(0, 3);
      if (!hits.length) return '';
      const items = hits.map(rule => '<p>' + esc(rule.claim.split('；')[0]) + '</p>').join('');
      return '<p class="part-title">' + esc(part.label) + '</p>' + items;
    }).join('');
    return rows ? '<details class="body-parts"><summary>按部位查解剖要点</summary>' + rows + '</details>' : '';
  }
  /**
   * 拍照与相册收进一个入口：页面只占一行，选择放进底部弹层。
   * 弹层里的「拍照」「从相册选」是 <label for>，由浏览器原生打开文件选择器；
   * 这里不给 label 绑 input.click()（会弹两次），只负责开合、焦点与键盘。
   */
  function installPhotoEntry() {
    const open = $("#photo-add"), sheet = $("#photo-sheet");
    if (!open || !sheet || sheet.dataset.wired) return;
    sheet.dataset.wired = "1";
    const addIcon = open.querySelector(".photo-add-icon");
    if (addIcon) addIcon.setAttribute("src", "./icon-glyph-camera.svg");
    const takeIcon = $("#photo-take img", sheet);
    if (takeIcon) takeIcon.setAttribute("src", "./icon-glyph-camera.svg");
    const hide = restoreFocus => {
      sheet.hidden = true;
      open.setAttribute("aria-expanded", "false");
      if (restoreFocus) open.focus();
    };
    open.addEventListener("click", () => {
      sheet.hidden = false;
      open.setAttribute("aria-expanded", "true");
      const first = $("#photo-take");
      if (first) first.focus();
    });
    const close = $("#photo-close");
    if (close) close.addEventListener("click", () => hide(true));
    sheet.addEventListener("click", event => {
      if (event.target === sheet) hide(true);
      else if (event.target.closest(".sheet-option")) hide(false); // 选择器由 label 原生打开，这里只收起弹层
    });
    sheet.addEventListener("keydown", event => {
      if (event.key === "Escape") { hide(true); return; }
      const option = event.target.closest && event.target.closest(".sheet-option");
      if (option && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); option.click(); }
    });
  }

  /** 等待动画：任何需要等模型的地方都复用它。 */
  let busyTimer = null;
  /** 等待提示：默认全局遮罩；传 target 时显示在该元素里（行内，不挡操作）。 */
  let busyButton = null;
  function markBusyButton(on) {
    const active = document.activeElement;
    if (on) {
      if (active && active.tagName === "BUTTON") { busyButton = active; busyButton.setAttribute("aria-busy", "true"); }
    } else if (busyButton) {
      busyButton.removeAttribute("aria-busy");
      busyButton = null;
    }
  }
  function showBusy(text, target) {
    markBusyButton(true);
    hideBusy();
    const label = text || "正在计算…";
    // 等待反馈只留两种：目标容器内的行内提示，以及一次性 notice。全屏遮罩已删除。
    if (target) {
      const node = document.getElementById(target);
      if (node) { node.hidden = false; const t2 = node.querySelector(".inline-busy-text"); if (t2) t2.textContent = label; }
    }
    // 兜底：任何异常都不该让等待提示常驻。
    busyTimer = setTimeout(() => hideBusy(), 25000);
  }
  function hideBusy() {
    markBusyButton(false);
    if (busyTimer) { clearTimeout(busyTimer); busyTimer = null; }
    const inline = document.getElementById("estimate-busy"); if (inline) inline.hidden = true;
    const planInline = document.getElementById("plan-busy"); if (planInline) planInline.hidden = true;
  }

  /** 用模型按顺序排今天的训练：需要勾选同意，失败就明确报错，不伪造计划。 */
  const AI_PLAN_KEY = date => "qingheng.aiPlan." + date;
  function aiPlanStore(date, value) {
    try {
      if (value === undefined) return JSON.parse(localStorage.getItem(AI_PLAN_KEY(date)) || "null");
      localStorage.setItem(AI_PLAN_KEY(date), JSON.stringify(value));
      // 收进 state.json：备份/迁移带着走（保存时立即同步，清除时同样落库）。
      if (typeof schedulePrefsSync === 'function') schedulePrefsSync({aiPlans: collectedAiPlans()});
    } catch { return null; }
  }
  /** 总组数：新计划直接用 sets，旧数据从 dose 里读回。 */
  function aiPlanSets(item) {
    const n = Number(item && item.sets);
    if (Number.isFinite(n) && n > 0) return n;
    const hit = /(\d+)\s*组/.exec(String((item && item.dose) || ""));
    return hit ? Number(hit[1]) : 0;
  }
  /**
   * 单组占用的时间：执行约 45 秒 + 组间休息约 90 秒 + 换动作摊销，取 2.5 分钟。
   * 时长先由组数决定，再向上取到偏好里的档位，不留缺口。
   */
  const AI_PLAN_MINUTES_PER_SET = 2.5;
  const AI_PLAN_MINUTE_STEPS = [30, 45, 60, 75, 90];
  function aiPlanMinutes(sets) {
    if (!sets) return 0;
    const raw = Math.ceil(sets * AI_PLAN_MINUTES_PER_SET / 5) * 5;
    return AI_PLAN_MINUTE_STEPS.find(step => step >= raw) || AI_PLAN_MINUTE_STEPS[AI_PLAN_MINUTE_STEPS.length - 1];
  }
  /**
   * 把一批动作并入当天训练记录：同名跳过，只追加不覆盖。
   * 训练日志与 AI 计划是两份数据，这里是唯一把它们接起来的入口。
   */
  async function addExercisesToToday(items) {
    const wanted = (items || []).filter(item => item && String(item.name || "").trim());
    if (!wanted.length) { notice("没有可加入的动作。"); return; }
    const existing = habitRowFor(activeDate) || {};
    const current = Array.isArray(existing.exercises) ? existing.exercises.map(item => ({...item})) : [];
    const names = new Set(current.map(item => String(item && item.name || "").trim()));
    const added = [];
    for (const item of wanted) {
      const name = String(item.name).trim().slice(0, 60);
      if (names.has(name)) continue;
      const record = {
        id: (typeof crypto !== "undefined" && crypto.randomUUID) ? crypto.randomUUID() : "ex-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8),
        name,
        sets: number(item.sets) === null ? null : number(item.sets),
        reps: number(item.reps) === null ? null : number(item.reps),
        weight: number(item.weight) === null ? null : number(item.weight)
      };
      // 有氧项没有组次重量，改记距离与时长，训练日志那边才有东西可显示。
      if (number(item.distanceKm) !== null) record.distanceKm = number(item.distanceKm);
      if (number(item.durationMin) !== null) record.durationMin = number(item.durationMin);
      current.push(record);
      names.add(name);
      added.push(name);
    }
    if (!added.length) { notice("这些动作已经在今天的训练记录里了。"); return; }
    try {
      await api("/api/habits", {...existing, date: activeDate, exercises: current});
      await loadState({quiet: true});
      notice("已加入今天的训练记录：" + added.join("、") + "。");
    } catch (error) {
      notice("加入训练记录失败：" + (error && error.message ? error.message : "未知错误"), true);
    }
  }
  /**
   * 从「今日清单」直接进入记录：把动作并进今天，跳到训练日志并聚焦负重。
   * 主流健身 App 的路径都是「看清单 → 点这个动作 → 记实际组次」，不要求重新打字。
   */
  async function startLoggingFromPlan(item) {
    const name = String(item && item.name || "").trim();
    if (!name) return;
    const already = exercisesFor(activeDate).some(row => String(row && row.name || "").trim() === name);
    if (!already) await addExercisesToToday([item]);
    switchTab("records", true);
    if (typeof switchRecordPanel === "function") switchRecordPanel("training");
    setTimeout(() => {
      const row = [...document.querySelectorAll("#training-exercises [data-exercise-row]")]
        .find(node => String(($('[data-exercise="name"]', node) || {}).value || "").trim() === name);
      (row || $("#training-form"))?.scrollIntoView({block: "center", behavior: "smooth"});
      const target = row ? (row.querySelector('[data-cardio="distance"]') || row.querySelector('[data-exercise="weight"]')) : null;
      target?.focus();
    }, 220);
  }

  /** 从 AI 回答的纯文本里挑出「动作名 3组×8次 60kg」这类片段；认不出就返回空。 */
  function parseExercisesFromText(text) {
    const cleaned = String(text || "").replace(/<[^>]+>/g, "\n");
    const pattern = /([\u4e00-\u9fa5A-Za-z][\u4e00-\u9fa5A-Za-z0-9·\- ]{1,19}?)\s*[:：]?\s*(\d{1,2})\s*组?\s*[×xX*]\s*(\d{1,3})\s*次?\s*(?:[×xX*]\s*)?(\d{1,3}(?:\.\d)?)?\s*(?:kg|公斤)?/g;
    const out = [];
    let hit;
    while ((hit = pattern.exec(cleaned))) {
      const name = hit[1].trim().replace(/[：:，,。]$/, "");
      if (!name || name.length < 2) continue;
      out.push({
        name: name.slice(0, 24),
        sets: Number(hit[2]) || null,
        reps: Number(hit[3]) || null,
        weight: hit[4] ? Number(hit[4]) : null
      });
    }
    return out;
  }
  /** 剂量由字段派生；编辑后重算，不会与旧字符串脱节。 */
  function aiPlanDose(item) {
    if (item && item.dose) return item.dose; // 旧数据只存了 dose 字符串
    const run = [];
    if (item && Number(item.distanceKm) > 0) run.push(item.distanceKm + " km");
    if (item && Number(item.durationMin) > 0) run.push(item.durationMin + " 分钟");
    if (run.length) return run.join(" · ");
    return [
      item && item.sets ? item.sets + " 组" : "",
      item && item.reps ? item.reps + " 次" : "",
      item && item.weight ? item.weight + " kg" : ""
    ].filter(Boolean).join(" × ");
  }
  /** 把编辑态的输入读回存储；名称被清空的行视为删除。 */
  function collectAiPlanEdits() {
    const box = $("#ai-plan-list");
    const plan = aiPlanStore(activeDate) || [];
    if (!box) return 0;
    $$("[data-ai-row]", box).forEach(row => {
      const item = plan[Number(row.dataset.aiRow)];
      if (!item) return;
      const field = name => row.querySelector(`[data-ai-field="${name}"]`);
      const name = (field("name")?.value || "").trim();
      item.name = name ? name.slice(0, 24) : "";
      const sets = Number(field("sets")?.value), reps = Number(field("reps")?.value), weight = Number(field("weight")?.value);
      item.sets = sets > 0 ? sets : 0;
      item.reps = reps > 0 ? reps : 0;
      item.weight = weight > 0 ? weight : null;
      delete item.dose;
    });
    aiPlanStore(activeDate, plan.filter(item => item && item.name));
    return plan.length - plan.filter(item => item && item.name).length;
  }
  /** 一行一个动作；编辑态把名称、组、次、负重换成输入框。 */
  function aiPlanRowHtml(item, index, editing) {
    if (!editing) {
      const dose = aiPlanDose(item);
      // 三行读一行：① 编号 + 勾选 + 动作名；② 组次重量 + 记录/换一个；③ 一句为什么。
      // 以前 dose 和两个按钮挤在同一条基线上，会随理由长短上下错位，读起来像散落的四列。
      // 名字本身是按钮：点开看这个动作练什么、要点是什么；勾选框仍是「已做完」。
      return "<div class=\"ai-plan-row\" role=\"listitem\"><label class=\"ai-plan-main\"><input type=\"checkbox\" data-ai-done=\"" + index + "\"" + (item.done ? " checked" : "") + "><span class=\"ai-plan-text\"><span class=\"ai-plan-head\"><button type=\"button\" class=\"ai-plan-name\" data-ai-guide=\"" + index + "\" aria-haspopup=\"dialog\" aria-label=\"查看动作说明：" + esc(item.name) + "\">" + esc(item.name) + "<span class=\"ai-plan-name-mark\" aria-hidden=\"true\">?</span></button></span></span></label>"
        + "<span class=\"ai-plan-meta\">" + (dose ? "<span class=\"ai-plan-dose\">" + esc(dose) + "</span>" : "")
        + "<button type=\"button\" class=\"text-button ai-plan-swap\" data-ai-swap=\"" + index + "\" aria-label=\"换一个动作\">换一个</button>"
        + "<button type=\"button\" class=\"text-button ai-plan-log\" data-ai-log=\"" + index + "\" aria-label=\"记录" + esc(item.name) + "\">记录</button></span>"
        + (item.reason ? "<span class=\"ai-plan-reason\">" + esc(item.reason) + "</span>" : "")
        + "</div>";
    }
    const num = (name, value, attrs, label) => "<input class=\"ai-plan-input\" data-ai-field=\"" + name + "\" type=\"number\" inputmode=\"decimal\" " + attrs + " value=\"" + (value == null ? "" : value) + "\" aria-label=\"" + label + "\">";
    // 编辑态留一行原建议：改名字/组数时还看得见「为什么排它」，不用退出编辑再回忆。
    return "<div class=\"ai-plan-row is-editing\" role=\"listitem\" data-ai-row=\"" + index + "\">"
      + "<span class=\"ai-plan-no\">" + (index + 1) + "</span>"
      + "<input class=\"ai-plan-input is-name\" data-ai-field=\"name\" maxlength=\"24\" enterkeyhint=\"done\" value=\"" + esc(item.name) + "\" aria-label=\"动作名\">"
      + "<button type=\"button\" class=\"ai-plan-remove\" data-ai-remove=\"" + index + "\" aria-label=\"删除这个动作\">×</button>"
      + (item.reason ? "<p class=\"ai-plan-edit-reason\">" + esc(item.reason) + "</p>" : "")
      + "<div class=\"ai-plan-nums\"><label class=\"ai-plan-num\"><span>组</span>" + num("sets", item.sets, 'min=\"0\" max=\"30\" step=\"1\"', "组数") + "</label>"
      + "<label class=\"ai-plan-num\"><span>次</span>" + num("reps", item.reps, 'min=\"0\" max=\"200\" step=\"1\"', "次数") + "</label>"
      + "<label class=\"ai-plan-num\"><span>kg</span>" + num("weight", item.weight, 'min=\"0\" max=\"500\" step=\"0.5\"', "负重公斤") + "</label></div>"
      + "</div>";
  }
  function renderAiPlan() {
    const box = $("#ai-plan-list"), tag = $("#ai-plan-tag"), clear = $("#ai-plan-clear"), summary = $("#ai-plan-summary");
    if (!box) return;
    const plan = aiPlanStore(activeDate);
    // 已经有清单时，「用 AI 排今天」不再是主行动：主行动是把清单落成记录。
    // 同一个按钮两种状态，文案也分开（排 / 重排），避免「已经排好了却还在喊排」。
    const ask = $("#ai-plan-ask"), hasPlan = !!(plan && plan.length);
    if (ask) {
      ask.textContent = hasPlan ? "重排今天" : "用 AI 排今天";
      ask.classList.toggle("primary", !hasPlan);
      ask.classList.toggle("subtle", hasPlan);
      ask.setAttribute("aria-label", hasPlan ? "让 AI 重新排今天的动作顺序" : "让 AI 排今天的动作顺序");
    }
    const allToggle = $("#ai-plan-all");
    if (allToggle) {
      allToggle.classList.toggle("primary", hasPlan);
      allToggle.classList.toggle("subtle", !hasPlan);
    }
    if (clear) clear.hidden = !plan;
    const edit = $("#ai-plan-edit");
    if (edit) edit.hidden = !(plan && plan.length);
    const postpone = $("#ai-plan-postpone");
    if (postpone) postpone.hidden = !(plan && plan.length);
    if (!plan || !plan.length) {
      if (tag) tag.textContent = "未生成";
      if (summary) { summary.hidden = true; summary.textContent = ""; }
      box.innerHTML = stateBlock({kind: 'empty', title: '今天还没有排训练顺序', body: '勾选同意后点「用 AI 排今天」，结果会出现在这里。'});
      const allBox = $("#ai-plan-all"); if (allBox) allBox.hidden = true;
      return;
    }
    if (tag) tag.textContent = plan.length + " 个动作";
    const allButtonEl = $("#ai-plan-all"); if (allButtonEl) allButtonEl.hidden = false;
    if (summary) {
      const prefs = typeof planPrefs === "function" ? planPrefs() : null;
      const setMinutes = Number(prefs && prefs.minutes) > 0 ? Number(prefs.minutes) : 45;
      const totalSets = plan.reduce((sum, item) => sum + aiPlanSets(item), 0);
      const need = aiPlanMinutes(totalSets);
      summary.hidden = false;
      if (!need) {
        summary.textContent = "共 " + plan.length + " 个动作";
      } else if (Math.abs(need - setMinutes) >= 10) {
        // 差异够大就给一个入口，点了才弹窗，不主动打断。
        summary.innerHTML = '<span class="ai-plan-summary-text">共 ' + totalSets + " 组 · 按组数约需 " + need + ' 分钟</span>'
          + '<button type="button" class="text-button" data-plan-minutes="' + need + '">改单次时长</button>';
      } else {
        summary.innerHTML = '<span class="ai-plan-summary-text">共 ' + totalSets + " 组 · 约需 " + need + ' 分钟</span>'
          + '<span class="ai-plan-summary-note">你设的是 ' + setMinutes + ' 分钟</span>';
      }
    }
    box.innerHTML = plan.map((item, index) =>
      aiPlanRowHtml(item, index, box.classList.contains("editing"))
    ).join("") + (box.classList.contains("editing")
      ? '<div class="ai-plan-append"><button type="button" class="button subtle" data-ai-append>添加一个动作</button></div>'
      : "");
  }
  /** 一行模型返回 → 计划条目；完整解析与流式预览共用同一套字段裁剪。 */
  function planItemFromRow(row) {
    return {
      name: String(row.name).trim().slice(0, 24),
      sets: Number(row.sets) > 0 ? Math.round(Number(row.sets)) : 0,
      reps: Number(row.reps) > 0 ? Math.round(Number(row.reps)) : 0,
      weight: typeof loadableWeightKg === "function" ? loadableWeightKg(row.name, Number(row.weight)) : (Number(row.weight) > 0 ? Number(row.weight) : null),
      distanceKm: Number(row.distanceKm) > 0 ? Number(row.distanceKm) : null,
      durationMin: Number(row.durationMin) > 0 ? Number(row.durationMin) : null,
      reason: String(row.reason || "").slice(0, 60),
      source: "ai",
      done: false
    };
  }
  /** 流式期间只认已经闭合的 {...}，先画出来；最后仍以完整数组为准。 */
  function partialPlanRows(text) {
    const source = String(text || "");
    const start = source.indexOf("[");
    if (start < 0) return [];
    const rows = [];
    let depth = 0, objStart = -1, inString = false, escaped = false;
    for (let i = start; i < source.length; i++) {
      const ch = source.charAt(i);
      if (inString) {
        if (escaped) escaped = false;
        else if (ch === "\\") escaped = true;
        else if (ch === '"') inString = false;
        continue;
      }
      if (ch === '"') { inString = true; continue; }
      if (ch === "{") { if (depth === 0) objStart = i; depth += 1; }
      else if (ch === "}") {
        depth -= 1;
        if (depth === 0 && objStart >= 0) {
          try {
            const row = JSON.parse(source.slice(objStart, i + 1));
            if (row && String(row.name || "").trim()) rows.push(row);
          } catch { }
          objStart = -1;
        }
      }
    }
    return rows;
  }
  /** 模型偶尔会裹 ```json、末尾多一个逗号、或先寒暄两句：按括号配对取数组，再宽松解析。 */
  function parseAiPlanReply(reply) {
    const text = String(reply || "").replace(/```[a-zA-Z]*/g, "").trim();
    const start = text.indexOf("[");
    if (start < 0) return [];
    let depth = 0, end = -1, inString = false, escaped = false;
    for (let i = start; i < text.length; i++) {
      const ch = text.charAt(i);
      if (inString) {
        if (escaped) escaped = false;
        else if (ch === "\\") escaped = true;
        else if (ch === '"') inString = false;
        continue;
      }
      if (ch === '"') { inString = true; continue; }
      if (ch === "[") depth += 1;
      else if (ch === "]") { depth -= 1; if (!depth) { end = i; break; } }
    }
    if (end < 0) return [];
    const slice = text.slice(start, end + 1).replace(/,\s*([\]}])/g, "$1");
    let rows;
    try { rows = JSON.parse(slice); } catch { return []; }
    if (!Array.isArray(rows)) return [];
    // 组数与有氧距离都为空的行仍是合法动作（用户随后自己填），不在这里删。
    return rows.filter(row => row && String(row.name || "").trim()).slice(0, 12).map(planItemFromRow);
  }
  async function askAiPlan(button) {
    if (!button) return;
    if (!externalConsent()) { notice("请先到「我的 → 数据、外观与说明」开启外部模型授权。"); return; }
    button.disabled = true;
    const original = button.textContent;
    button.textContent = "正在排…";
    showBusy("正在排今天的动作顺序…", "plan-busy");
    // 慢的时候要说清还在等模型，别让按钮无声地停在「正在排…」。
    const slowTimer = setTimeout(() => showBusy("模型还在排，一般要半分钟左右，请再等一会儿…", "plan-busy"), 12000);
    const planBefore = aiPlanStore(activeDate) || [];
    try {
      // 素材也放在 try 里：任何一步抛错都要落进 catch，不能让按钮卡死在「正在排…」。
      const prefs = typeof planPrefs === "function" ? planPrefs() : null;
      const profile = state.profile || {};
      const done = exercisesFor(activeDate).filter(item => item && item.name).map(item => item.name + " " + (item.sets || "") + "x" + (item.reps || ""));
      // 喂给模型与本地规则引擎同一份素材：上周基线 + 训练库规则，输出质量才对得起「渐进」。
      const baselines = typeof recentExerciseBaselines === "function" ? recentExerciseBaselines(14) : {};
      const baselineText = Object.entries(baselines).slice(0, 6).map(([name, row]) =>
        name + " " + row.sets + "x" + row.reps + (row.weight ? " " + row.weight + "kg" : "")).join("；");
      const library = typeof librarySummary === "function" ? librarySummary(4) : "";
      const prompt = [
        "请为今天排一个按顺序执行的训练清单。",
        "信息：目标=" + (GOAL_LABEL[profile.goal] || "未填") + "；体重=" + (profile.weight || "未填") + "kg；每周练=" + (prefs && prefs.days ? prefs.days : (plannedSessions() || "未填")) + "；分化=" + (prefs ? prefs.split : "未填") + "；器械=" + (prefs ? (typeof GEAR_LABELS === "object" && GEAR_LABELS[prefs.gear] ? GEAR_LABELS[prefs.gear] : prefs.gear) : "未填")
          + "；时长=" + (prefs ? prefs.minutes : 45) + " 分钟。"
          + (prefs && prefs.gear === "mixed" ? "器械不限：请在同一份清单里混用杠铃、哑铃、固定器械与自重，不要全部用同一种器械。" : ""),
        baselineText ? "上周最近记录（供渐进参考，不要盲目加量）：" + baselineText + "。" : "",
        library ? "训练规则（必须遵守）：\n" + library : "",
        done.length ? ("今天已记录：" + done.join("；") + "。") : "今天还没有训练记录。",
        "每个动作的 reason 只写一句、不超过 12 个字，写为什么排它。",
        "负重必须是健身房里装得出来的数：杠铃 = 20 kg 空杆 + 每侧 2.5 kg 的整数倍（如 60、65、70），不要给 62.5 这种装不出的重量；哑铃按 2 kg、器械按 5 kg 递增；不确定就留空。",
        "只输出 JSON 数组，第一个字符是 [，不要解释、不要代码块标记。"
      ].filter(Boolean).join("\n");
      // focus:"plan" 走后端专用的「只出 JSON」提示词；tier:"fast" 会追加「最多 3 句」，与 JSON 直接冲突。
      const payload = {question: prompt, date: activeDate, webSearch: false, focus: "plan", allowExternal: true, logToHistory: false};
      let data;
      try {
        // 边流边画：模型每吐完一个动作就先出现在列表里，不用盯着空列表等整段结束。
        let streamed = "", shown = 0;
        window.QinghengStream = {onDelta: chunk => {
          if (!chunk) return;
          streamed += chunk;
          const rows = partialPlanRows(streamed);
          if (rows.length > shown) {
            shown = rows.length;
            aiPlanStore(activeDate, rows.slice(0, 12).map(planItemFromRow));
            renderAiPlan();
            showBusy("已排好 " + shown + " 个动作，继续中…", "plan-busy");
          }
        }};
        data = await api("/api/chat/stream", payload);
      } catch (streamError) {
        // 流式不可用（浏览器演示、断网、服务商不支持）：退回一次性接口，行为与旧版一致。
        aiPlanStore(activeDate, planBefore);
        renderAiPlan();
        showBusy("模型还在排，请再等一会儿…", "plan-busy");
        data = await api("/api/chat", payload);
      } finally {
        window.QinghengStream = null;
      }
      const plan = parseAiPlanReply(String(data && data.reply ? data.reply : ""));
      if (!plan.length) {
        // 一份都没解析出来：把原来的清单放回去，别让用户白等还丢计划。
        aiPlanStore(activeDate, planBefore);
        renderAiPlan();
        throw new Error("模型这次没有给出清单，原清单已保留；请再点一次重试。");
      }
      aiPlanStore(activeDate, plan);
      renderAiPlan();
      // 今日页的「今日清单」读的是同一份数据，排完必须一起刷，否则两个页面各说各话。
      if (typeof renderAdviceOrder === "function") renderAdviceOrder();
      // 模型偶尔只回一两个动作：留着重排的入口，但要说清"这次偏少"，别让用户以为本该如此。
      const wantMinutes = Number(prefs && prefs.minutes ? prefs.minutes : 45) || 45;
      if (plan.length < 3 && wantMinutes >= 30) {
        notice("模型这次只排了 " + plan.length + " 个动作，比 " + wantMinutes + " 分钟的量少；可以点「修改」补动作，或再点一次重排。");
      } else {
        notice("已按顺序排好今天的 " + plan.length + " 个动作。");
      }
    } catch (error) {
      notice("排训练顺序失败：" + (error && error.message ? error.message : "未知错误"));
    } finally {
      clearTimeout(slowTimer);
      button.disabled = false;
      button.textContent = original;
      hideBusy();
    }
  }
  function installAiPlan() {
    const ask = $("#ai-plan-ask"), clear = $("#ai-plan-clear"), list = $("#ai-plan-list");
    if (!ask || ask.dataset.wired) return;
    ask.dataset.wired = "1";
    ask.addEventListener("click", () => askAiPlan(ask));
    const postpone = $("#ai-plan-postpone");
    if (postpone && !postpone.dataset.wired) {
      postpone.dataset.wired = "1";
      postpone.addEventListener("click", () => {
        const plan = aiPlanStore(activeDate) || [];
        if (!plan.length) return;
        const tomorrow = shiftDay(activeDate, 1);
        aiPlanStore(tomorrow, plan.map(item => ({...item, done: false})));
        aiPlanStore(activeDate, []);
        renderAiPlan();
        notice("已把这份清单顺延到 " + tomorrow.slice(5) + "，今天不再安排。");
      });
    }
    if (clear) clear.addEventListener("click", () => { aiPlanStore(activeDate, []); renderAiPlan(); });
    const edit = $("#ai-plan-edit");
    if (list && !list.dataset.aiRemoveWired) {
      list.dataset.aiRemoveWired = "data-ai-remove-wired";
      list.addEventListener("click", event => {
        // 名字是「看说明」的第二入口：先拦下，别让 label 把点击顺带给勾选框。
        const guideButton = event.target.closest("[data-ai-guide]");
        if (guideButton) {
          event.preventDefault();
          event.stopPropagation();
          const plan = aiPlanStore(activeDate) || [];
          const item = plan[Number(guideButton.dataset.aiGuide)];
          if (item && typeof showExerciseGuide === "function") showExerciseGuide(item.name);
          return;
        }
        const appendButton = event.target.closest("[data-ai-append]");
        if (appendButton) {
          event.preventDefault();
          collectAiPlanEdits();
          const plan = aiPlanStore(activeDate) || [];
          if (plan.length >= 12) { notice("一份清单最多 12 个动作。"); return; }
          // 先落成可编辑的一行，名字让用户自己改；不默认叫「动作 N」，避免带着占位词保存。
          plan.push({name: "新动作", sets: 3, reps: 10, weight: null, reason: "", done: false});
          aiPlanStore(activeDate, plan);
          renderAiPlan();
          const names = $$(".ai-plan-row.is-editing .ai-plan-input.is-name", list);
          const last = names[names.length - 1];
          if (last) { last.focus(); last.select(); }
          return;
        }
        const logButton = event.target.closest("[data-ai-log]");
        if (logButton) {
          event.preventDefault();
          const plan = aiPlanStore(activeDate) || [];
          startLoggingFromPlan(plan[Number(logButton.dataset.aiLog)]).catch(() => {});
          return;
        }
        const swapButton = event.target.closest("[data-ai-swap]");
        if (swapButton) {
          event.preventDefault();
          const plan = aiPlanStore(activeDate) || [];
          const index = Number(swapButton.dataset.aiSwap);
          const item = plan[index];
          if (!item) return;
          const presets = typeof EXERCISE_PRESETS === "object" ? Object.values(EXERCISE_PRESETS).flat() : [];
          const taken = new Set(plan.map(row => String(row.name || "")));
          const pool = [...new Set(presets)].filter(name => name !== item.name && !taken.has(name));
          if (!pool.length) { notice("训练库里没有可替换的动作。"); return; }
          item.name = pool[index % pool.length];
          if (typeof loadableWeightKg === "function" && number(item.weight) !== null) {
            item.weight = loadableWeightKg(item.name, number(item.weight));
          }
          aiPlanStore(activeDate, plan);
          renderAiPlan();
          notice("已换成「" + item.name + "」，组次沿用原动作，可再点「换」继续。");
          return;
        }
        const removeButton = event.target.closest("[data-ai-remove]");
        if (!removeButton) return;
        const row = event.target.closest(".ai-plan-row");
        if (!row) return;
        event.preventDefault();
        const rows = [...list.querySelectorAll(".ai-plan-row")];
        const index = Number(removeButton.dataset.aiRemove);
        if (!Number.isFinite(index)) return;
        const plan = aiPlanStore(activeDate) || [];
        if (index < 0 || !plan[index]) return;
        plan.splice(index, 1);
        aiPlanStore(activeDate, plan);
        renderAiPlan();
        if (!plan.length) list.classList.remove("editing");
        // 编辑态的名字在输入框里，非编辑态在 .ai-plan-name；两处都要能拿到，提示才不会变成 undefined。
        const nameField = row.querySelector(".ai-plan-name") || row.querySelector("[data-ai-field=\"name\"]");
        const removedName = nameField ? (nameField.value || nameField.textContent || "").trim() : "";
        notice(removedName ? "已移除「" + removedName + "」。" : "已移除这个动作。");
      });
    }
    if (edit && !edit.dataset.editWired) {
      edit.dataset.editWired = "1";
      edit.addEventListener("click", () => {
        const box = $("#ai-plan-list");
        if (!box) return;
        if (box.classList.contains("editing")) {
          const dropped = collectAiPlanEdits();
          box.classList.remove("editing");
          edit.textContent = "修改";
          notice(dropped ? "已保存修改，移除了 " + dropped + " 个没有名字的动作。" : "已保存修改。");
        } else {
          box.classList.add("editing");
          edit.textContent = "完成";
        }
        renderAiPlan();
      });
    }
    const allButton = $("#ai-plan-all");
    if (allButton && !allButton.dataset.wired) {
      allButton.dataset.wired = "1";
      allButton.addEventListener("click", () => {
        const plan = aiPlanStore(activeDate) || [];
        addExercisesToToday(plan).catch(() => {});
      });
    }
    const summaryBox = $("#ai-plan-summary");
    if (summaryBox && !summaryBox.dataset.wired) {
      summaryBox.dataset.wired = "1";
      summaryBox.addEventListener("click", async event => {
        const button = event.target.closest("[data-plan-minutes]");
        if (!button) return;
        const minutes = Number(button.dataset.planMinutes);
        if (!minutes) return;
        const go = await askConfirm("按现在的组数，单次大约需要 " + minutes
          + " 分钟。要把「单次时长」改成 " + minutes + " 分钟吗？",
          {title: "单次时长", ok: "改成 " + minutes + " 分钟", cancel: "先不改"});
        if (!go) return;
        const now = (typeof planPrefs === "function" ? planPrefs() : null) || {};
        if (typeof savePlanPrefs === "function") savePlanPrefs(Object.assign({}, now, {minutes: minutes}));
        const picker = $("#pref-minutes"); if (picker) picker.value = String(minutes); // 偏好表单跟着改，免得回头存回旧值
        renderAiPlan();
        if (typeof renderWeekPlan === "function") renderWeekPlan();
      });
    }
    if (list) list.addEventListener("change", event => {
      const box = event.target.closest("[data-ai-done]");
      if (!box) return;
      const plan = aiPlanStore(activeDate) || [];
      const index = Number(box.dataset.aiDone);
      if (plan[index]) plan[index].done = box.checked;
      aiPlanStore(activeDate, plan);
    });
    renderAiPlan();
  }

  /** 杠铃总重计算器：杆重 + 2 × 每侧片重。 */
  function installWeightCalc() {
    const open = $("#weight-calc"), sheet = $("#weight-sheet");
    if (!open || !sheet) return;
    const bar = $("#bar-weight"), plate = $("#plate-weight"), perSide = $("#weight-per-side"), out = $("#weight-result");
    const savedBar = Number(localStorage.getItem("qingheng.barWeight") || 0);
    if (savedBar > 0) bar.value = String(savedBar);
    const total = () => {
      const b = Number(bar.value) || 0, p = Number(plate.value) || 0;
      return Math.round((b + (perSide.checked ? 2 * p : p)) * 10) / 10;
    };
    const update = () => {
      const b = Number(bar.value) || 0, p = Number(plate.value) || 0;
      const sum = total();
      out.textContent = perSide.checked
        ? "总重 " + sum + " kg（杆 " + b + " + " + p + " × 2）——这个数填进负重。"
        : "总重 " + sum + " kg（杆 " + b + " + " + p + "）——这个数填进负重。";
    };
    open.addEventListener("click", () => { sheet.hidden = false; update(); });
    $("#weight-close").addEventListener("click", () => { sheet.hidden = true; });
    bar.addEventListener("input", () => { update(); localStorage.setItem("qingheng.barWeight", String(Number(bar.value) || 0)); });
    plate.addEventListener("input", update);
    perSide.addEventListener("change", update);
    const fill = $("#weight-fill");
    if (fill && !fill.dataset.wired) {
      fill.dataset.wired = "1";
      fill.addEventListener("click", () => {
        const inputs = $$("#training-exercises input[name=\"weight\"]");
        const target = inputs.find(input => !input.value) || inputs[inputs.length - 1];
        if (!target) { notice("先添加一个动作，再回填负重。"); return; }
        target.value = String(total());
        target.dispatchEvent(new Event("input", {bubbles: true}));
        sheet.hidden = true;
        notice("已填入 " + total() + " kg。");
      });
    }
  }

  /** 皮肤：attribute + localStorage；不写进 state，避免一次换肤触发整份数据同步。 */
  const SKINS = ['paper', 'ledger', 'night'];
  const DATA_PAGES = ['trends'];
  /** 系统是否处于深色；取不到时按浅色处理。 */
  function darkScheme() {
    try { return window.matchMedia('(prefers-color-scheme: dark)').matches === true; } catch (error) { return false; }
  }
  /** 夜间是显式选择：全程账本 + 暗色令牌，不再看系统深浅色。 */
  function skinForPage(base, tab) {
    if (base === 'night') return 'ledger';
    if (base !== 'paper' && base !== 'ledger') base = 'paper';
    return base;
  }
  const SKIN_KEY = 'qingheng.skin';
  function currentSkin() {
    // 默认纸感；历史存过 auto 的用户按「夜间」处理，因为自动模式已移除（不再依赖系统深浅色）。
    try {
      const saved = localStorage.getItem(SKIN_KEY);
      if (saved === 'auto') return 'night';
      return SKINS.includes(saved) ? saved : 'paper';
    } catch (error) { return 'paper'; }
  }
  function applySkin(name, persist = true) {
    const choice = SKINS.includes(name) ? name : 'paper';
    const skin = skinForPage(choice, document.documentElement.dataset.tab || 'today');
    // 暗色不再跟系统走：[data-theme="dark"] 是唯一的暗色开关，由「夜间」这个显式选择驱动。
    const night = choice === 'night';
    document.documentElement.dataset.skin = skin;
    document.documentElement.dataset.skinChoice = choice;
    document.documentElement.dataset.theme = night ? 'dark' : 'light';
    if (persist) { try { localStorage.setItem(SKIN_KEY, choice); } catch (error) {} }
    const tag = $('#skin-tag'); if (tag) tag.textContent = night ? '夜间 · ledger' : skin;
    // 系统状态栏颜色跟随皮肤：夜间用暗底，其余保持浅绿。
    const theme = document.querySelector('meta[name="theme-color"]');
    if (theme) theme.setAttribute('content', night ? '#141719' : '#eaf4ed');
    for (const button of $$('[data-skin-pick]')) button.setAttribute('aria-pressed', String(button.dataset.skinPick === choice));
    return skin;
  }
  let chatSearchTimer = 0;
  /** 输入区一聚焦，把「提问」滚进可视区：键盘弹起后按钮不会被压在键盘下面。 */
  function installChatFocusReveal() {
    const box = $('#chat-question'), bar = $('.chat-send-bar'), trainingInput = $('#training-advice-input');
    if (!box || !bar || bar.dataset.wired) return;
    bar.dataset.wired = '1';
    box.addEventListener('focus', () => setTimeout(() => {
      if (bar.isConnected) bar.scrollIntoView({block: 'nearest', behavior: 'smooth'});
    }, 320));
    if (trainingInput) trainingInput.addEventListener('focus', () => {
      const submit = trainingInput.closest('form')?.querySelector('button[type="submit"]');
      if (submit) setTimeout(() => submit.scrollIntoView({block: 'nearest', behavior: 'smooth'}), 320);
    });
  }
  /** 问答记录的按天浏览：日期 chip 打开原生日历，两侧箭头在「有记录的日期」之间翻页。 */
  function installChatDayFilter() {
    const toggle = $('#chat-day-toggle'), input = $('#chat-day-input');
    if (!toggle || toggle.dataset.wired) return;
    toggle.dataset.wired = '1';
    toggle.addEventListener('click', () => {
      if (!input) return;
      if (typeof input.showPicker === 'function') { try { input.showPicker(); return; } catch {} }
      input.focus(); input.click();
    });
    input?.addEventListener('change', () => {
      const value = /^\d{4}-\d{2}-\d{2}$/.test(input.value) ? input.value : '';
      if (value) setChatDayFilter(value);
      input.value = '';
    });
    $('#chat-day-prev')?.addEventListener('click', () => stepChatDay(-1));
    $('#chat-day-next')?.addEventListener('click', () => stepChatDay(1));
  }
  function installSkinPicker() {
    const chatSearch = $("#chat-search");
    if (chatSearch && !chatSearch.dataset.wired) {
      chatSearch.dataset.wired = "1";
      chatSearch.addEventListener("input", () => {
        // 每个按键都整段重建问答记录，长历史下会卡；停顿 180ms 后只渲染一次。
        chatQuery = chatSearch.value.trim();
        clearTimeout(chatSearchTimer);
        chatSearchTimer = setTimeout(() => {resetChatPaging(); renderChat();}, 180);
      });
    }
    if (typeof renderLastChat === "function") renderLastChat();
    if (typeof installWeightCalc === "function") installWeightCalc();
    if (typeof installPlanPrefs === "function") installPlanPrefs();
    if (typeof installExerciseGuide === "function") installExerciseGuide();
    if (typeof installUsagePanel === "function") installUsagePanel();
    if (typeof installAiPlan === "function") installAiPlan();
    if (typeof installSegmentKeys === "function") installSegmentKeys();
    if (typeof installPhotoEntry === "function") installPhotoEntry();
    applySkin(currentSkin(), false);
    // 系统深浅色不再影响皮肤：夜间是用户显式选择的开关。
    for (const button of $$('[data-skin-pick]')) {
      button.addEventListener('click', () => { applySkin(button.dataset.skinPick); notice('外观已切换为「' + ({paper: '纸感', ledger: '账本', night: '夜间'}[button.dataset.skinPick] || '纸感') + '」。'); });
    }
  }

  async function loadStorageStatus(remirror = false) {
    const node = $('#storage-status');
    if (node) node.textContent = remirror ? '正在重新镜像…' : '正在读取存储状态…';
    try {
      const data = await api(remirror ? '/api/storage-remirror' : '/api/storage-status', remirror ? {} : undefined);
      if (!node) return data;
      const json = data?.json || {}, sqlite = data?.sqlite || {};
      // 用户语言的主行：只说「记录在哪、有多少、备份了没」；JSON/SQLite 细节留在技术细节折叠里。
      const summaryNode = $('#storage-summary');
      if (summaryNode) {
        const label = {meals:'餐食', measurements:'身体', habits:'习惯', chats:'问答'};
        const plain = Object.keys(json).map(key => `${label[key] || key} ${json[key]}`);
        const autoAt = number(data?.autoBackup?.at) !== null ? new Date(Number(data.autoBackup.at)).toLocaleString('zh-CN') : '';
        const files = number(data?.autoBackup?.files);
        summaryNode.textContent = `记录都保存在这台手机上：${plain.join('、')}`
          + (files ? `；应用内自动备份 ${files} 份${autoAt ? `（最近 ${autoAt}）` : ''}，每 12 小时更新` : '')
          + '。';
      }
      const when = number(data?.lastMirroredAt) !== null ? new Date(Number(data.lastMirroredAt)).toLocaleString('zh-CN') : '尚未镜像';
      const parts = Object.keys(json).map(key => `${({meals:'餐食',measurements:'身体',habits:'习惯',chats:'问答'})[key] || key} ${json[key]}`);
      // 应用内自动备份：只存在私有目录，最多 3 份；导出 SAF 文件仍是正式备份。
      const autoAt = number(data?.autoBackup?.at) !== null ? new Date(Number(data.autoBackup.at)).toLocaleString('zh-CN') : '尚无';
      node.textContent = `${data?.parity === true ? '一致' : '不一致'}｜JSON：${parts.join('、')}`
        + `｜SQLite：${Object.keys(sqlite).map(key => `${({meals:'餐食',measurements:'身体',habits:'习惯',chats:'问答'})[key] || key} ${sqlite[key]}`).join('、')}`
        + `｜最近镜像：${when}${data?.lastError ? `｜最近错误：${data.lastError}` : ''}`
        + `｜应用内备份：${autoAt}（${number(data?.autoBackup?.files) ?? 0} 份，每 12 小时轮换）`
        + `｜${data?.mode || ''}`;
      return data;
    } catch (error) {
      if (node) node.textContent = error.message;
      return null;
    }
  }
  const storageRefresh = $('#storage-refresh');
  if (storageRefresh) storageRefresh.addEventListener('click', () => {loadStorageStatus(false).catch(() => {});});
  const storageRemirror = $('#storage-remirror');
  if (storageRemirror) storageRemirror.addEventListener('click', async () => {
    storageRemirror.disabled = true;
    const data = await loadStorageStatus(true);
    notice(data?.parity === true ? '已重新镜像，JSON 与 SQLite 记录一致。' : '镜像完成，但两边数量仍不一致，请查看关于页说明。', data?.parity !== true);
    storageRemirror.disabled = false;
  });
  // 应用内自动备份的恢复入口：双重确认；native 侧恢复前会把当前状态另存为 pre-restore 底档。
  const backupRestore = $('#backup-restore');
  if (backupRestore) backupRestore.addEventListener('click', async () => {
    if (!await askConfirm('将用最近一次应用内自动备份覆盖手机上的全部记录（餐食、身体、习惯、问答与偏好）。覆盖前会把当前记录另存为底档。', {title: '从应用内备份恢复', ok: '下一步'})) return;
    if (!await askConfirm('再次确认：覆盖后当前内容只能通过底档找回。确定恢复吗？', {title: '确认覆盖', ok: '覆盖恢复', danger: true})) return;
    backupRestore.disabled = true;
    try {
      await api('/api/backup-restore', {});
      await loadState({quiet: true});
      await loadStorageStatus(false);
      notice('已从应用内备份恢复；恢复前的记录已另存为底档。');
    } catch (error) { notice(error.message, true); }
    finally { backupRestore.disabled = false; }
  });

  $('#active-date').value=activeDate;setDefaultDates();
  window.addEventListener('focus',syncCalendarDay);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)syncCalendarDay();});
  $('#active-date').addEventListener('change',event=>{setActiveDate(event.target.value);});
  $('#chat-date-toggle')?.addEventListener('click', () => {
    const input = $('#chat-date-input'); if (!input) return;
    input.value = activeDate;
    try { if (typeof input.showPicker === 'function') { input.showPicker(); return; } } catch {}
    input.click();
  });
  $('#chat-date-input')?.addEventListener('change', event => {
    if (!setActiveDate(event.target.value)) event.target.value = activeDate;
    if (document.activeElement && typeof document.activeElement.blur === 'function') document.activeElement.blur();
  });
  document.addEventListener('click', event => {
    const more = event.target.closest('[data-chat-more]');
    if (more) {event.preventDefault(); showEarlierChats(); return;}
    const toggle = event.target.closest('[data-chat-toggle]');
    if (!toggle) return;
    const id = toggle.dataset.chatToggle;
    const answer = toggle.closest('.row-body')?.querySelector('.answer');
    const expanding = !expandedChats.has(id);
    if (expanding) expandedChats.add(id); else expandedChats.delete(id);
    toggle.textContent = expanding ? '收起' : '展开全文';
    toggle.setAttribute('aria-expanded', expanding ? 'true' : 'false');
    if (!answer) return;
    // 先把当前高度写成内联值，max-height 才有起点可过渡；展开后放开为 none，收起再回落。
    answer.style.maxHeight = answer.scrollHeight + 'px';
    nextFrame(() => {
      if (expanding) {answer.classList.remove('is-clamped'); answer.style.maxHeight = 'none';}
      else {answer.classList.add('is-clamped'); answer.style.maxHeight = '';}
    });
  });
  document.addEventListener('click',async event=>{
    const restore=event.target.closest('[data-draft-restore]');
    if(restore){const row=storedDrafts.find(item=>item.id===restore.dataset.draftRestore);if(!row)return;try{renderPreview(row,true);}catch(error){notice(error.message,true);}return;}
    const drop=event.target.closest('[data-draft-drop]');
    if(drop){const row=storedDrafts.find(item=>item.id===drop.dataset.draftDrop);if(!row)return;
      if(!await askConfirm('丢弃这份未确认的估算？丢弃后需要重新拍照或描述。',{title:'丢弃估算草稿',ok:'丢弃',danger:true}))return;
      await dropDraft(row.id);notice('已丢弃未确认的估算草稿。');}
  });
  $('#undated-meals-apply').addEventListener('click',()=>{applyUndatedDate().catch(error=>notice(error.message,true));});
  installContextPreview('chat-data-preview-panel','chat-data-preview','chat');
  installContextPreview('advice-data-preview-panel','advice-data-preview','advice');
  $$('[data-tab]').forEach(button=>button.addEventListener('click',()=>switchTab(button.dataset.tab,true)));
  function prependHeadingKicker(heading, text) {
    const titleBox = heading?.querySelector('div');
    if (!titleBox || titleBox.querySelector('.heading-kicker')) return;
    const kicker = document.createElement('p');
    kicker.className = 'eyebrow heading-kicker';
    kicker.textContent = text;
    titleBox.prepend(kicker);
  }
  function installPageHeadingStructures() {
    const todayHeading = $('.page-heading', $('#view-today'));
    const datePicker = todayHeading?.querySelector('.date-picker');
    const dateInput = $('#active-date');
    if (todayHeading && datePicker && dateInput) {
      todayHeading.classList.add('page-heading--today');
      prependHeadingKicker(todayHeading, '今日手札');
      const currentDate = document.createElement('time');
      currentDate.id = 'active-date-label';
      currentDate.className = 'date-picker-value';
      currentDate.setAttribute('aria-hidden', 'true');
      dateInput.setAttribute('aria-label', '查看日期');
      datePicker.replaceChildren(currentDate, dateInput);
    }
    const recordHeading = $('.page-heading', $('#view-records'));
    if (recordHeading) {
      recordHeading.classList.add('page-heading--records');
      prependHeadingKicker(recordHeading, '日常记录 · 三栏台账');
    }
    const trendsHeading = $('.page-heading', $('#view-trends'));
    const rangeLabel = trendsHeading?.querySelector('label');
    const rangeSelect = $('#trend-range');
    if (trendsHeading && rangeLabel && rangeSelect) {
      trendsHeading.classList.add('page-heading--trends');
      prependHeadingKicker(trendsHeading, '周期观察');
      rangeLabel.className = 'range-picker';
      rangeSelect.setAttribute('aria-label', '观察范围');
      const accessibleLabel = document.createElement('span');
      accessibleLabel.className = 'sr-only';
      accessibleLabel.textContent = '观察范围';
      rangeLabel.replaceChildren(accessibleLabel, rangeSelect);
    }
  }
  /** Place common actions below the calorie summary, in reach without covering page content. */
  function installTodayQuickActions() {
    const view = $('#view-today');
    if (!view || $('#today-quick-actions')) return;
    const energyBody = $('.energy-body', $('.energy-card', view));
    if (!energyBody) return;
    const row = document.createElement('div');
    row.className = 'quick-actions';
    row.id = 'today-quick-actions';
    row.setAttribute('role', 'group');
    row.setAttribute('aria-label', '今日快捷操作');
    row.innerHTML = [
      ['icon-meal.svg', '记一餐', 'meal-text', 'quick-chip-primary'],
      ['icon-glyph-training.svg', '训练', 'training-form', ''],
      ['icon-glyph-balance.svg', '身体', 'measurement-weight', ''],
      ['icon-glyph-camera.svg', '拍照', 'photo']
    ].map(([icon, label, focus, className = '']) => `<button type="button" class="quick-chip ${className}" data-quick-focus="${focus}" data-quick-icon="${icon}"><span class="quick-chip-icon" aria-hidden="true">${iconMarkup(icon)}</span>${label}</button>`).join('');
    energyBody.after(row);
    row.addEventListener('click', event => {
      const chip = event.target.closest('[data-quick-focus]');
      if (!chip) return;
      const focus = chip.dataset.quickFocus;
      switchTab('records', true);
      switchRecordPanel(recordPanelForField(focus === 'photo' ? 'meal-text' : focus));
      setTimeout(() => {
        if (focus === 'photo') {
          // The camera tile is a label bound to the file input; clicking it opens the camera.
          $('#view-records label[for="meal-image"]')?.click();
          return;
        }
        if (focus === 'training-form') {
          const form = $('#training-form');
          if (form) { form.closest('.card')?.scrollIntoView({block: 'start', behavior: 'smooth'}); flashTarget(form.closest('.card')); }
          return;
        }
        // No focus: the keyboard used to cover the very form the user wanted to see.
        revealField(focus, {focus: false, block: 'start'});
      }, 80);
    });
  }
  function installChatTaskOrder() {
    const card = $('#view-chat')?.querySelector('article.card');
    const question = $('#chat-question')?.closest('label');
    const chips = $('#chat-chips');
    const draft = $('#chat-training-draft');
    if (!card || !question || !chips) return;
    question.after(chips);
    if (draft) chips.after(draft);
  }
  /**
   * 我的 is a list of entries, so the low-frequency block is one too: 数据、外观与说明 opens its own
   * sub-page exactly like 模型连接 (same .subpage shell, same 21px hub icon, same back header)
   * instead of unfolding a second-level details inside the list.
   */
  function installProfileMore() {
    const hub = $('#profile-hub');
    if (!hub) return;
    // 每个入口一枚专属图标：人像+靶心、AI 火花、铃铛、便签、皮肤半明暗、齿轮、数据库、叶子。
    // 图标取自 Lucide（MIT），统一 24 网格 / 1.8 描边 / currentColor，八个入口各司其职。
    // 轻衡自有图形语言：1.7 圆头描边 + 每枚一块实心墨块 + 右下角品牌小墨点（账本里的「已记录」点）。
    // 轻衡自有图形语言：1.7 圆头描边 + 每枚一块实心墨块 + 右下角品牌小墨点（账本里的「已记录」点）。
    // 图标规格：24 网格 / 1.5 描边 / 圆头 / 以线为主；实心只留一个微型记号（≤1.1r），圆角统一 2.5。
    // 以 24px 实际显示为准：主体撑满 16–17 单位，内部细节 ≤2 条线，实心只做小记号。
    const PROFILE_ICONS = {
      targets: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="7.9" r="3.6"/><path d="M3.9 20.6v-.7a4.9 4.9 0 0 1 4.9-4.9h4.6a4.9 4.9 0 0 1 4.9 4.9v.7"/><circle cx="18.9" cy="5.7" r="1.2" fill="currentColor" stroke="none"/></svg>',
      model: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3.2" y="8.8" width="11.2" height="11.2" rx="2.6"/><path d="M18.4 3.4v5M15.9 5.9h5"/><path d="M8.8 11.6v4.8M6.4 14.4h4.8" stroke-width="1.2" opacity=".5"/></svg>',
      push: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5.4 16.8c1.5-1.6 2.4-3.5 2.4-5.9a4.2 4.2 0 0 1 8.4 0c0 2.4.9 4.3 2.4 5.9Z"/><path d="M9.9 19.6a2.1 2.1 0 0 0 4.2 0"/><circle cx="12" cy="16.8" r="1.25" fill="currentColor" stroke="none"/></svg>',
      prefs: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4.6" y="3.6" width="12.4" height="16.8" rx="2.6"/><path d="M8.2 8.4h5.4M8.2 12.4h5.4"/><path d="M17 6.4v11.2" stroke-width="1.2" opacity=".45"/></svg>',
      appearance: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="8.2"/><path d="M12 8.4v3.9l2.8 2"/><path d="M12 3.8a8.2 8.2 0 0 1 0 16.4Z" fill="currentColor" stroke="none"/></svg>',
      more: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3.1"/><path d="M12 3.4v3M12 17.6v3M3.4 12h3M17.6 12h3M5.9 5.9l2.1 2.1M16 16l2.1 2.1M18.1 5.9L16 8M8 16l-2.1 2.1"/><circle cx="12" cy="12" r="1.15" fill="currentColor" stroke="none"/></svg>',
      data: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3.8" y="7.6" width="16.4" height="13" rx="2.6"/><path d="M3.8 11.8h16.4"/><path d="M12 14.4v3.4M9.9 16.2l2.1 2 2.1-2" stroke-width="1.4"/></svg>',
      about: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.4 9.2c0-3.6-3.8-5.9-8.3-4.9-4 1-6.3 4.2-6.1 8.2.2 3.7 3.1 6.4 6.9 6.4 3.9 0 7.5-4.6 7.5-9.7Z"/><path d="M6.4 19.4c1-4.4 4-7.6 8.4-9.6"/></svg>'
    };
    Object.entries(PROFILE_ICONS).forEach(([id, markup]) => {
      const node = hub.querySelector(`[data-subpage-open="${id}"] .hub-icon`);
      if (node && markup) node.innerHTML = markup;
    });
    const appearance = $("#subpage-appearance"), more = $("#subpage-more");
    if (!appearance || !more) return;
    // 外观页只留「查看相关」的东西：外观皮肤 + 默认餐次 + 问答说明。
    const anchor = $('#meal-window-card');
    const skin = $('#skin-card');
    if (skin && anchor) appearance.insertBefore(skin, anchor);
    // 不常用的三件事合并到「更多」：数据管理、关于轻衡、重新设置档案。
    const list = $('#more-hub');
    const restart = $('#targets-restart-slot');
    const notes = $('#about-notes-slot');
    [hub.querySelector('[data-subpage-open="data"]'), hub.querySelector('[data-subpage-open="about"]')]
      .filter(Boolean).forEach(node => {if (list) list.append(node);});
    const restartButton = $('#restart-onboarding');
    if (restartButton && restart) restart.append(restartButton);
    const chatNotes = $('#view-chat .card-notes');
    if (chatNotes && notes) {
      // 关于页里已经有一个「说明」，搬过来的问答说明要自己标明是哪一份。
      const summary = chatNotes.querySelector('summary');
      if (summary) summary.textContent = '问答说明';
      notes.append(chatNotes);
    }
  }
  function mealWindowSummaryText(spec) {
    return `早于 ${spec.lunchFrom} 记早餐，${spec.lunchFrom} 起记午餐，${spec.dinnerFrom} 起记晚餐，${spec.snackFrom} 起记加餐。`;
  }
  function renderMealWindow() {
    const spec = readMealWindow();
    const lunch = $('#meal-window-lunch'), dinner = $('#meal-window-dinner'), snack = $('#meal-window-snack');
    if (lunch) lunch.value = spec.lunchFrom;
    if (dinner) dinner.value = spec.dinnerFrom;
    if (snack) snack.value = spec.snackFrom;
    const summary = $('#meal-window-summary');
    if (summary) summary.textContent = mealWindowSummaryText(spec);
    const tag = $('#meal-window-tag');
    if (tag) tag.textContent = `现在默认${MEAL_TYPE_LABEL[defaultMealTypeFor(nowClock())] || '加餐'}`;
    const hubSummary = $('#hub-summary-appearance');
    if (hubSummary) hubSummary.textContent = `${spec.lunchFrom} 午餐 · ${spec.dinnerFrom} 晚餐 · ${spec.snackFrom} 加餐`;
  }
  let mealTypeTouched = false;
  /** The estimate form starts on the slot the clock implies, unless the user already picked one. */
  function applyMealTypeDefault() {
    const form = $('#estimate-form');
    if (!form || mealTypeTouched) return;
    const select = form.querySelector('select[name="mealType"]');
    if (select) select.value = defaultMealTypeFor(nowClock());
  }
  function installMealWindow() {
    const card = $('#meal-window-card');
    if (!card || card.dataset.bound) return;
    card.dataset.bound = '1';
    renderMealWindow();
    $('#meal-window-save').addEventListener('click', () => {
      const feedback = $('#meal-window-feedback');
      const lunch = $('#meal-window-lunch').value, dinner = $('#meal-window-dinner').value, snack = $('#meal-window-snack').value;
      if (!clockPattern.test(lunch) || !clockPattern.test(dinner) || !clockPattern.test(snack)) {feedback.textContent = '请填写 24 小时制的时间。'; return;}
      if (!(lunch < dinner && dinner < snack)) {feedback.textContent = '午餐起、晚餐起、加餐起要依次更晚。'; return;}
      feedback.textContent = '';
      saveMealWindow({lunchFrom:lunch, dinnerFrom:dinner, snackFrom:snack});
      renderMealWindow();
      applyMealTypeDefault();
      notice('默认餐次已更新。');
    });
    $('#meal-window-reset').addEventListener('click', () => {
      saveMealWindow(DEFAULT_MEAL_WINDOW);
      renderMealWindow();
      applyMealTypeDefault();
      $('#meal-window-feedback').textContent = '';
      notice('已恢复 11:20 / 16:30 / 22:00。');
    });
    $('#estimate-form select[name="mealType"]')?.addEventListener('change', () => {mealTypeTouched = true;});
    applyMealTypeDefault();
  }
  /**
   * Trends also grew into one long column. Same segmented treatment, plus a diet card that the page
   * never had (it only showed weight, volume and body composition).
   */
  function installTrendPanels() {
    const view = $('#view-trends');
    if (!view || $('#trends-tabs')) return;
    const cards = [...view.querySelectorAll('article.card')];
    const cardFor = heading => cards.find(card => $('h2', card)?.textContent.trim() === heading);
    const host = $('.record-grid', view) || view;
    const panels = [
      {key: 'weight', label: '体重', headings: ['体重变化', '身体记录明细'], foldedHeadings: ['身体记录明细']},
      {key: 'diet', label: '饮食', headings: [], extra: true},
      {key: 'training', label: '训练', headings: ['训练容量（渐进超负荷）']}
    ];
    const bar = document.createElement('div');
    bar.className = 'segment-bar';
    bar.id = 'trends-tabs';
    bar.setAttribute('role', 'tablist');
    bar.setAttribute('aria-label', '趋势分类');
    bar.innerHTML = panels.map(panel => `<button type="button" class="segment" role="tab" data-trends-panel="${panel.key}">${panel.label}</button>`).join('');
    // The trends view has no .record-grid wrapper, so the bar goes inside the view itself; inserting it
    // beside the section put a stray segmented bar at the bottom of the records page.
    const heading = $('.page-heading', view);
    if (heading) heading.after(bar); else view.prepend(bar);
    for (const panel of panels) {
      const container = document.createElement('div');
      container.className = 'record-panel';
      container.id = 'trend-panel-' + panel.key;
      container.dataset.panel = panel.key;
      let more = null;
      for (const heading of panel.headings) {
        const card = cardFor(heading);
        if (!card) continue;
        if (panel.foldedHeadings?.includes(heading)) {
          if (!more) {
            more = document.createElement('details');
            more.className = 'panel-more';
            const summary = document.createElement('summary');
            summary.textContent = panel.key === 'weight' ? '更多身体数据' : '更多趋势';
            more.append(summary);
            container.append(more);
          }
          more.append(card);
        } else {
          container.append(card);
        }
      }
      if (panel.extra) container.append(dietTrendCard());
      host.append(container);
    }
    switchTrendPanel('weight');
    bar.addEventListener('click', event => {
      const button = event.target.closest('[data-trends-panel]');
      if (button) switchTrendPanel(button.dataset.trendsPanel);
    });
  }
  function switchTrendPanel(key) {
    for (const panel of ['weight', 'diet', 'training']) {
      const node = $('#trend-panel-' + panel);
      if (node) node.hidden = panel !== key;
    }
    for (const button of $$('[data-trends-panel]')) {
      const active = button.dataset.trendsPanel === key;
      button.setAttribute('aria-selected', active ? 'true' : 'false');
      button.classList.toggle('active', active);
      if (button.dataset.trendsPanel === 'training') button.hidden = !trainingEnabled();
    }
    if ($('#trend-panel-training')?.hidden !== false) { /* no-op, keeps the guard explicit */ }
  }
  /** The diet trend the page was missing: last 7 days of intake against that day's range. */
  function dietTrendCard() {
    const card = document.createElement('article');
    card.className = 'card';
    card.id = 'diet-trend-card';
    card.innerHTML = '<div class="card-heading"><h2>饮食趋势</h2><span class="tag">近 7 天</span></div><p class="muted">每根条相对当天的目标区间；超出上限会标红。</p><div class="diet-bars"></div>';
    return card;
  }
  /**
   * Fills the card from whatever state is current. It used to be rendered once at boot, while state was
   * still an empty skeleton, so it always claimed "0/7 days" no matter how much was recorded.
   */
  function renderDietTrend() {
    const card = $('#diet-trend-card');
    if (!card) return;
    const days = [];
    for (let offset = 6; offset >= 0; offset--) days.push(shiftDate(activeDate, -offset));
    const rows = days.map(day => {
      const meals = (state.meals || []).filter(row => row.date === day);
      const totals = totalsFor(meals);
      const range = intakeRangeForDate(day);
      const kcal = Math.round(totals.calories ?? 0);
      const recorded = meals.length > 0;
      // Width is the share of the day's upper bound, so a day below the range still shows how far it got.
      // Scale a little past the cap so the acceptable band sits inside the track rather than against its edge.
      const scaleMax = Math.max(range.max * 1.08, 1);
      const percent = recorded ? Math.max(4, Math.min(100, Math.round((kcal / scaleMax) * 100))) : 0;
      const bandLeft = Math.max(0, Math.min(100, (range.min / scaleMax) * 100));
      const bandWidth = Math.max(2, Math.min(100 - bandLeft, ((range.max - range.min) / scaleMax) * 100));
      const stateKey = !recorded ? 'empty' : kcal > range.max ? 'over' : kcal < range.min ? 'low' : 'in';
      // Inside the range stays green; below turns amber, above turns red as it passes the cap.
      const barColor = recorded ? dietBarColor(kcal, range.min, range.max) : 'transparent';
      const label = recorded
        ? `${kcal} kcal，占上限 ${percent}%，目标区间 ${range.min}~${range.max} kcal（${{in: '区间内', low: '不足', over: '超上限'}[stateKey]}）`
        : `未记录，目标 ${range.min}~${range.max} kcal`;
      return `<div class="diet-day"><span class="diet-day-label">${day.slice(5)}</span><span class="diet-bar" role="img" aria-label="${label}"><span class="diet-band" style="left:${bandLeft.toFixed(1)}%;width:${bandWidth.toFixed(1)}%"></span><i class="${stateKey}" style="width:${percent}%;background:${barColor}"></i></span><span class="diet-day-value">${recorded ? `${kcal} kcal` : '—'}</span></div>`;
    }).join('');
    const logged = days.filter(day => (state.meals || []).some(row => row.date === day)).length;
    const audit = dietAudit(days);
    const profileForAudit = effectiveProfileForDate(activeDate);
    const proteinTarget = number(profileForAudit.proteinMin);
    const fatTarget = number(profileForAudit.fatMax);
    const auditLines = [];
    if (audit.days) {
      auditLines.push('记录 ' + audit.days + '/7 天 · ' + audit.meals + ' 餐');
      auditLines.push(audit.mismatched
        ? audit.mismatched + ' 餐的热量与三大营养素对不上（最大差 ' + audit.worstGap + ' kcal），已按 4/4/9 校正'
        : '所有餐次的热量与 4/4/9 推算一致');
      if (audit.biased) {
        auditLines.push('7 天合计热量 ' + audit.totalStated + ' · 宏量推算 ' + audit.totalMacro + '（差 ' + (audit.totalGap > 0 ? '+' : '') + audit.totalGap + ' kcal，' + (audit.gapPercent > 0 ? '+' : '') + audit.gapPercent + '%）→ 热量被系统性' + (audit.totalGap > 0 ? '高估' : '低估') + '，以宏量为准');
      } else {
        auditLines.push('7 天合计热量与宏量推算相差 ' + (audit.totalGap > 0 ? '+' : '') + audit.totalGap + ' kcal，在容差内');
      }
      auditLines.push('日均 蛋白 ' + audit.avg.protein + (proteinTarget ? ' / 目标 ' + proteinTarget : '') + ' g · 脂肪 ' + audit.avg.fat + (fatTarget ? ' / 上限 ' + Math.round(fatTarget) : '') + ' g · 碳水 ' + audit.avg.carbs + ' g');
    } else {
      auditLines.push('这 7 天还没有记录，先记一餐再看检查结果');
    }
    card.innerHTML = `<div class="diet-audit">${auditLines.map(line => '<p>' + esc(line) + '</p>').join('')}</div>` + `<div class="card-heading"><h2>饮食趋势</h2><span class="tag">近 7 天 · 有记录 ${logged}/7</span></div>`
      + `<p class="muted">条形长度 = 占当天目标上限的百分比 · 浅绿带 = 当天目标区间 · <span class="diet-key in">区间内</span> <span class="diet-key low">不足</span> <span class="diet-key over">超上限</span></p>`
      + `<div class="diet-bars">${rows}</div>`;
  }
  /**
   * The records page had eight cards in one column — a very long scroll where the primary action
   * (log a meal) competed with rarely-used utilities. It is now split into three segments, ordered so
   * the common action comes first in each. Layout matches what fitness apps converged on: a segmented
   * bar on top, one short screen per intent.
   */
  /** 训练概览：本周练了几次、总容量、今天蛋白放在同一屏，训练与饮食不再是两页。 */
  let lastOverviewSig = '';
  /**
   * 训练周统计的唯一口径（概览卡复用）：容量按 kg 逐日取整后求和；有 setDetails 用逐组 reps×weight，
   * 没有 setDetails 的旧记录用 sets×reps×weight；有氧（只有距离/时长）不计容量。次数 = 当周有动作的天数。
   */
  function weekTrainingStats(weekStart) {
    const days = [];
    for (let offset = 0; offset < 7; offset++) {
      const date = shiftDay(weekStart, offset);
      const rows = exercisesFor(date);
      const raw = habitRowFor(date);
      const volume = trainingVolumeOf(Array.isArray(raw?.exercises) ? raw.exercises : []);
      const km = rows.reduce((sum, item) => sum + (Number(item.distanceKm) || 0), 0);
      const min = rows.reduce((sum, item) => sum + (Number(item.durationMin) || 0), 0);
      days.push({date, count: rows.length, volume, km, min});
    }
    return {
      days,
      sessions: days.filter(day => day.count > 0).length,
      totalVolume: Math.round(days.reduce((sum, day) => sum + day.volume, 0)),
      totalKm: days.reduce((sum, day) => sum + day.km, 0),
      totalMin: days.reduce((sum, day) => sum + day.min, 0)
    };
  }
  function renderTrainingOverview() {
    const grid = $('#training-overview-grid');
    if (!grid) return;
    const weekStart = shiftDay(activeDate, -((new Date(activeDate + 'T00:00:00').getDay() + 6) % 7));
    const {days, sessions, totalVolume, totalKm, totalMin} = weekTrainingStats(weekStart);
    // 上周同口径的容量：说明文字给「比上周」一个真参照，而不是只列数字。
    const prevVolume = weekTrainingStats(shiftDay(weekStart, -7)).totalVolume;
    const meals = (state.meals || []).filter(row => row && row.date === activeDate);
    const totals = totalsFor(meals), p = effectiveProfileForDate(activeDate);
    const kcal = number(totals.calories), protein = number(totals.protein);
    const target = number(p.intakeRange ? p.intakeRange.max : p.calorieTarget);
    const proteinMin = number(p.proteinMin);
    // 三个数不再同字号：容量是这张卡的主数字，次数是注脚，蛋白是跨域的副指标。
    // 节点只建一次，之后只改数字：这样 data-count 能把旧值缓到新值（首帧仍是直接落值）。
    if (!grid.dataset.wired) {
      grid.dataset.wired = '1';
      grid.innerHTML = '<div class="overview-stat is-lead"><small>本周容量</small><strong><b class="ov-num" data-count>—</b><span data-unit></span></strong></div>'
        + '<div class="overview-stat"><small>本周训练</small><strong><b class="ov-num" data-count>—</b><span data-unit></span></strong></div>'
        + '<div class="overview-stat is-cross"><small>今日蛋白</small><strong><b class="ov-num" data-count>—</b><span data-unit></span></strong></div>';
      if (typeof installCountRoll === 'function') installCountRoll(grid);
    }
    const setStat = (index, value, unit) => {
      const stat = grid.children[index];
      if (!stat) return;
      const number = stat.querySelector('b.ov-num'), label = stat.querySelector('[data-unit]');
      if (label) label.textContent = unit || '';
      if (number) number.textContent = value === null ? '—' : fmt(value, 0);
    };
    setStat(0, totalVolume > 0 ? totalVolume : null, totalVolume > 0 ? ' kg' : '');
    setStat(1, sessions, ' 次');
    setStat(2, protein, protein === null
      ? (proteinMin ? '目标 ' + fmt(proteinMin, 0) + ' g' : '')
      : (proteinMin ? ' / ' + fmt(proteinMin, 0) + ' g' : ''));
    const peak = Math.max(1, ...days.map(day => day.volume));
    const bars = $('#training-overview-bars');
    // 只有这一周的训练数据真的变了才重播：切 tab、存一餐都重播一遍会显得吵。
    const motionReduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    const barsSig = days.map(day => Math.round(day.volume)).join(',') + '|' + sessions;
    const animateBars = barsSig !== lastOverviewSig && !motionReduced;
    lastOverviewSig = barsSig;
    if (bars) {
      // 柱子只画「练了的天」，空天留一条基线；有容量的柱子头顶标数，图才读得出信息而不只是装饰。
      // 起手 0 高度、逐根 40ms 归位，让「这一周的形状」是长出来的，不是刷出来的。
      const pctOf = day => day.volume ? Math.max(8, Math.round(day.volume / peak * 100)) : 2;
      bars.innerHTML = days.map(day => '<div class="ov-bar' + (day.date === activeDate ? ' is-today' : '') + (day.count ? ' has-data' : '') + '">'
        + '<b class="ov-bar-value">' + (day.volume > 0 ? fmt(day.volume, 0) : '') + '</b>'
        + '<span data-h="' + pctOf(day) + '" style="height:' + (animateBars ? 0 : pctOf(day)) + '%"></span>'
        + '<small>' + '日一二三四五六'[new Date(day.date + 'T00:00:00').getDay()] + '</small></div>').join('');
      if (animateBars) {
        requestAnimationFrame(() => requestAnimationFrame(() => {
          Array.prototype.forEach.call(bars.querySelectorAll('.ov-bar span'), (bar, index) => {
            bar.style.transitionDelay = (index * 40) + 'ms';
            bar.style.height = bar.dataset.h + '%';
          });
        }));
      }
    }
    // 说明分两行：第一行讲训练与对照，第二行讲饮食——不再把两件事挤成一句。
    const note = $('#training-overview-note');
    if (note) {
      const lines = [];
      if (sessions > 0) {
        let line = '本周 ' + sessions + ' 练';
        if (totalVolume > 0) line += ' · 容量 ' + fmt(totalVolume, 0) + ' kg';
        if (totalKm > 0 || totalMin > 0) {
          line += ' · 有氧 ' + [totalKm > 0 ? fmt(totalKm, 1) + ' km' : '', totalMin > 0 ? fmt(totalMin, 0) + ' 分钟' : ''].filter(Boolean).join(' · ');
        }
        if (prevVolume > 0 && totalVolume > 0) {
          const delta = totalVolume - prevVolume;
          const pct = Math.round(Math.abs(delta) / prevVolume * 100);
          line += '，比上周 ' + (delta >= 0 ? '+' : '−') + pct + '%';
        }
        lines.push(line);
      } else {
        lines.push(prevVolume > 0 ? '本周还没训练（上周 ' + fmt(prevVolume, 0) + ' kg）' : '本周还没训练');
      }
      lines.push(kcal === null
        ? '今天还没记饮食 · <button type="button" class="text-button inline-link" data-panel-go="food">去记一餐</button>'
        : '今天摄入 ' + fmt(kcal, 0) + (target ? ' / ' + fmt(target, 0) : '') + ' kcal · 蛋白 ' + fmt(protein || 0, 0) + (proteinMin ? ' / ' + fmt(proteinMin, 0) + ' g' : ' g'));
      note.innerHTML = lines.map((line, index) => '<span class="overview-note-line' + (index ? ' is-muted' : '') + '">' + line + '</span>').join('');
      if (!note.dataset.wired) {
        note.dataset.wired = '1';
        note.addEventListener('click', event => {
          const go = event.target.closest?.('[data-panel-go]');
          if (go && typeof switchRecordPanel === 'function') switchRecordPanel(go.dataset.panelGo);
        });
      }
    }
  }

  const RECORD_PANELS = [
    {key: 'food', label: '饮食', headings: ['轻松记一餐', '最近的餐食记录', '复制一餐', '食品热量参考库', '手动记录餐食'], foldedHeadings: ['食品热量参考库', '手动记录餐食']},
    {key: 'training', label: '训练', headings: ['训练概览', '训练计划', '今日顺序', '训练日志', '下周计划'], trainingOnly: true},
    {key: 'body', label: '身体', headings: ['身体数据', '日常习惯']}
  ];
  const RECORD_PANEL_STORAGE = 'qingheng.recordsPanel';
  function installRecordPanels() {
    const view = $('#view-records');
    if (!view || $('#records-tabs')) return;
    const cards = [...view.querySelectorAll('article.card')];
    const cardFor = heading => cards.find(card => $('h2', card)?.textContent.trim() === heading);
    const host = $('.record-grid', view) || view;
    const bar = document.createElement('div');
    bar.className = 'segment-bar';
    bar.id = 'records-tabs';
    bar.setAttribute('role', 'tablist');
    bar.setAttribute('aria-label', '记录分类');
    bar.innerHTML = RECORD_PANELS.map(panel =>
      `<button type="button" class="segment" role="tab" data-records-panel="${panel.key}">${panel.label}</button>`).join('');
    host.parentNode.insertBefore(bar, host);
    const panels = {};
    for (const panel of RECORD_PANELS) {
      const container = document.createElement('div');
      container.className = 'record-panel';
      container.id = 'record-panel-' + panel.key;
      container.dataset.panel = panel.key;
      let more = null;
      for (const heading of panel.headings) {
        const card = cardFor(heading);
        if (!card) continue;
        if (panel.foldedHeadings?.includes(heading)) {
          if (!more) {
            more = document.createElement('details');
            more.className = 'panel-more';
            const summary = document.createElement('summary');
            summary.textContent = panel.key === 'food' ? '更多记录工具' : '更多记录';
            more.append(summary);
            container.append(more);
          }
          more.append(card);
        } else {
          container.append(card);
        }
      }
      host.append(container);
      panels[panel.key] = container;
    }
    // Nothing left in the original grid: keep the element for its layout, it is now just a wrapper.
    const saved = (() => {try {return localStorage.getItem(RECORD_PANEL_STORAGE);} catch {return null;}})();
    switchRecordPanel(RECORD_PANELS.some(p => p.key === saved) ? saved : 'food');
    bar.addEventListener('click', event => {
      const button = event.target.closest('[data-records-panel]');
      if (button) switchRecordPanel(button.dataset.recordsPanel);
    });
  }
  /** Shows one segment; remembers the choice, and hides 训练 entirely for a no-training profile. */
  function switchRecordPanel(key) {
    const target = RECORD_PANELS.some(panel => panel.key === key) ? key : 'food';
    for (const panel of RECORD_PANELS) {
      const node = $('#record-panel-' + panel.key);
      if (node) node.hidden = panel.key !== target || (panel.trainingOnly && !trainingEnabled());
    }
    for (const button of $$('[data-records-panel]')) {
      const active = button.dataset.recordsPanel === target;
      button.setAttribute('aria-selected', active ? 'true' : 'false');
      button.classList.toggle('active', active);
      if (button.dataset.recordsPanel === 'training') button.hidden = !trainingEnabled();
    }
    try {localStorage.setItem(RECORD_PANEL_STORAGE, target);} catch {}
    window.scrollTo({top: 0, behavior: 'auto'});
    return target;
  }
  /** Which segment owns a field, so a jump from 今天 can open the right one first. */
  function recordPanelForField(id) {
    if (!id) return null;
    if (['habit-steps', 'measurement-weight', 'habit-form'].includes(id)) return 'body';
    if (['training-form', 'training-exercises'].includes(id)) return 'training';
    return 'food';
  }
  /**
   * Jumps to a form field that may live inside a collapsed card: open the details, scroll it into view,
   * then focus. Without the open() step the tap looks like nothing happened.
   */
  /** Briefly outline the card so the eye lands there even when we do not focus a field. */
  function flashTarget(node) {
    if (!node) return;
    node.classList.add('quick-target');
    setTimeout(() => node.classList.remove('quick-target'), 1600);
  }
  /**
   * Scrolls to a form field. focus:false keeps the soft keyboard closed, which is what a quick-entry
   * chip wants — the user should see the form, not be pushed into typing.
   */
  function revealField(id, options = {}) {
    const field = id ? document.getElementById(id) : null;
    if (!field) return;
    switchRecordPanel(recordPanelForField(id));
    const details = field.closest('details');
    if (details && !details.open) details.open = true;
    const block = options.block || 'center';
    if (options.focus === false) {
      // Show the whole card (title included) instead of landing mid-form.
      const card = field.closest('.card') || field;
      card.scrollIntoView({block: 'start', behavior: 'smooth'});
      flashTarget(card);
      return;
    }
    field.scrollIntoView({block, behavior: 'smooth'});
    field.focus({preventScroll: true});
  }
  $$('[data-go]').forEach(button=>button.addEventListener('click',()=>{switchTab(button.dataset.go,true);if(button.dataset.focus) setTimeout(() => revealField(button.dataset.focus), 60);}));
  // stateBlock 的操作按钮是运行时渲染的，初始绑定抓不到，这里统一委托（2026-11-17）。
  document.addEventListener('click', event => {
    const action = event.target.closest?.('.state-block-action[data-go]');
    if (!action) return;
    switchTab(action.dataset.go, true);
    if (action.dataset.focus) setTimeout(() => revealField(action.dataset.focus), 60);
  });
  // 运行时渲染的「日常习惯」行不在初始 [data-go] 绑定里；进记录页只滚动、不聚焦（不弹键盘）。
  document.addEventListener('click', event => {
    const jump = event.target.closest?.('[data-habit-jump]');
    if (!jump) return;
    switchTab('records', true);
    setTimeout(() => revealField('habit-steps', {focus: false}), 60);
  });
  window.addEventListener('hashchange',()=>{const {tab,sub}=parseHash();switchTab(tab||'today',false,sub);});
  $('#trend-range').addEventListener('change',renderTrends);$('#refresh-advice').addEventListener('click',refreshAdvice);
  $('#measurement-form').addEventListener('submit',event=>{event.preventDefault();submitForm(event.currentTarget,'/api/measurements',form=>{const values=numericForm(form,['weight','waist','bodyFat','muscle','visceralFat','bmr']);if(Object.values(values).every(value=>value===null)) throw new Error('请至少填写一项测量数据。');return {date:form.elements.date.value,...values};});});
  $('#habit-form').addEventListener('submit',event=>{event.preventDefault();submitForm(event.currentTarget,'/api/habits',form=>{const values=numericForm(form,['steps','sleep','water']);const training=form.elements.training.value===''?null:form.elements.training.value==='true';if(training===null && Object.values(values).every(value=>value===null)) throw new Error('请至少填写一项日常习惯。');return {date:form.elements.date.value,training,...values};});});
  // 记录页三种表单统一成「日期在最前、保存在最后」；训练日志原来没有日期输入，只能靠页面顶部的全局日期。
  $('#training-date')?.addEventListener('change', event => {
    const value = event.target.value;
    if (validDate(value)) setActiveDate(value);
    else event.target.value = activeDate;
  });
  $('#training-add')?.addEventListener('click', () => {
    // 以前这里手写了一套「组数 / 每组次数 / 负重」旧字段，与逐组模型不兼容——
    // 点「添加动作」加出来的行没有 [data-set-row]，保存时会被判为「每组都要填次数与负重」。
    // 现在与预设 chip 走同一个构造函数，加出来的行立刻就有第 1 组。
    const row = appendExerciseRow('');
    if (!row) return;
    $('[data-exercise="name"]', row)?.focus();
  });
  document.addEventListener('click', event => {
    const toggle = event.target.closest('[data-meal-items]');
    if (!toggle) return;
    const panel = toggle.parentElement?.querySelector('.meal-items');
    if (!panel) return;
    const open = panel.hidden;
    panel.hidden = !open;
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
  $('#training-presets')?.addEventListener('click', event => {
    const chip = event.target.closest('[data-training-preset]');
    if (!chip) return;
    const name = chip.dataset.trainingPreset;
    const previous = latestExerciseValues(name);
    const row = appendExerciseRow(name, previous);
    if (!row) return;
    notice(previous
      ? `已添加 ${name}：沿用 ${previous.date} 的 ${previous.sets}×${previous.reps}×${previous.weight} kg，可修改。`
      : `已添加 ${name}，填好组次与负重后保存。`);
    $('[data-set="reps"]', row)?.focus();
  });
  $('#training-template')?.addEventListener('change', () => renderTrainingPresets());
  $('#training-repeat')?.addEventListener('click', () => repeatLastTraining());
  // 组间休息从卡片底部的工具行挪到「训练动作视野内」：固定小药丸，上下滚动都看得见，
  // 键盘弹起时也随布局视口上移；只有训练日志在视野里或计时进行中才出现（2026-11-17）。
  let restTick = 0, restEnd = 0, restExercisesInView = false, restActionsInView = false, restDockWired = false;
  const REST_SECONDS = 90;
  const REST_RING_C = 2 * Math.PI * 11.5;
  function syncRestDock() {
    const dock = $('#rest-dock');
    if (!dock) return;
    // 计时中常驻；空转时只在「正在记组」的视野里出现——滚到预设/保存按钮时不挡点击。
    dock.classList.toggle('is-in', !!restTick || (restExercisesInView && !restActionsInView));
  }
  /** 计时与药丸一起画：剩余时间、环形进度、aria-label 同源。 */
  function paintRest(left) {
    const button = $('#rest-timer');
    if (!button) return;
    const label = $('[data-rest-label]');
    const text = left > 0 ? `休息 ${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}` : '休息 90s';
    if (label && label.textContent !== text) {
      label.textContent = text;
      // 每秒一次的小归位：只动秒数那一行，不做整块闪动；reduced-motion 下动画被媒体查询关掉。
      if (left > 0) {
        label.removeAttribute('data-tick');
        void label.offsetWidth;
        label.setAttribute('data-tick', '');
      }
    }
    button.classList.toggle('is-running', left > 0);
    button.setAttribute('aria-label', left > 0
      ? `组间休息还剩 ${Math.floor(left / 60)} 分 ${left % 60} 秒，点一下结束`
      : '开始 90 秒组间休息');
    const ring = $('#rest-timer .rest-ring-fill');
    if (ring) ring.style.strokeDashoffset = String(REST_RING_C * Math.max(0, Math.min(1, 1 - left / REST_SECONDS)));
    button.dataset.left = String(left);
    syncRestDock();
  }
  /** 组间休息：标记一组完成后自动开 90s；再点按钮取消。 */
  function startRestTimer(restart = false) {
    const button = $('#rest-timer');
    if (!button) return;
    if (restTick) {
      if (!restart) { clearInterval(restTick); restTick = 0; paintRest(0); return; }
      clearInterval(restTick); restTick = 0;
    }
    restEnd = Date.now() + 90000;
    const paint = () => {
      const left = Math.max(0, Math.ceil((restEnd - Date.now()) / 1000));
      paintRest(left);
      if (!left) { clearInterval(restTick); restTick = 0; }
    };
    paint();
    restTick = setInterval(paint, 1000);
  }
  function installRestDock() {
    const exercises = $('#training-exercises');
    const actions = $('#training-form .log-actions');
    const dock = $('#rest-dock');
    if (!exercises || !actions || !dock || restDockWired) return;
    restDockWired = true;
    paintRest(0);
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          const on = entry.isIntersecting;
          if (entry.target === exercises) restExercisesInView = on;
          if (entry.target === actions) restActionsInView = on;
          syncRestDock();
        });
      }, {threshold: 0.01, rootMargin: '0px 0px -96px 0px'});
      io.observe(exercises);
      io.observe(actions);
    } else {
      restExercisesInView = true;
      syncRestDock();
    }
  }
  installRestDock();
  $('#rest-timer')?.addEventListener('click', () => startRestTimer(false));
  // 容量必须跟着输入走：以前只在增删组时重算，填完 10 次 × 60 kg 还挂着「—」，像没记上。
  // 有氧行跟着距离/时长算配速；动作名改成「跑步」时整行切到有氧表单（2026-11-17）。
  $('#training-exercises')?.addEventListener('input', event => {
    const field = event.target;
    if (field.matches?.('[data-exercise="name"]')) {
      if (typeof syncExerciseMode === 'function') syncExerciseMode(field.closest?.('[data-exercise-row]'));
      return;
    }
    if (field.matches?.('[data-cardio="distance"],[data-cardio="minutes"]')) {
      if (typeof refreshCardioPace === 'function') refreshCardioPace(field.closest?.('[data-cardio-row]'));
      return;
    }
    if (!field.matches?.('[data-set="reps"],[data-set="weight"]')) return;
    const row = field.closest?.('[data-exercise-row]');
    if (row) refreshSetRow(row);
  });
  $('#training-exercises')?.addEventListener('click', event => {
    const done = event.target.closest?.('[data-set-done]');
    if (done) {
      const set = done.closest('[data-set-row]');
      const on = set.classList.toggle('is-done');
      done.setAttribute('aria-pressed', String(on));
      if (on) startRestTimer(true);
      return;
    }
    const addSet = event.target.closest?.('[data-set-add]');
    if (addSet) {
      const row = addSet.closest('[data-exercise-row]');
      const list = $('[data-set-list]', row);
      const last = list ? list.lastElementChild : null;
      list?.insertAdjacentHTML('beforeend', setRowHtml({
        reps: last ? number($('[data-set="reps"]', last).value) : null,
        weight: last ? number($('[data-set="weight"]', last).value) : null
      }, list.children.length));
      refreshSetRow(row);
      return;
    }
    const removeSet = event.target.closest?.('[data-set-remove]');
    if (removeSet) {
      const row = removeSet.closest('[data-exercise-row]');
      if ($$('[data-set-row]', row).length <= 1) return;
      removeSet.closest('[data-set-row]')?.remove();
      refreshSetRow(row);
      return;
    }
    const button = event.target.closest?.('[data-exercise-remove]');
    if (!button) return;
    button.closest('[data-exercise-row]')?.remove();
    if (typeof renumberExerciseRows === 'function') renumberExerciseRows();
  });
  $('#training-form')?.addEventListener('submit', event => {event.preventDefault(); saveTrainingLog().catch(error => notice(error.message, true));});
  $('#training-clear')?.addEventListener('click', async () => {
    if (!await askConfirm('清空今天的训练记录？习惯行的其他数据（步数、睡眠、饮水、用油）会保留。', {title: '清空训练', ok: '清空', danger: true})) return;
    const existing = habitRowFor(activeDate);
    if (!existing) {renderTrainingLog(); return;}
    const next = {...existing};
    delete next.exercises;
    delete next.template;
    try {await api('/api/habits', next); await loadState({quiet: true}); renderTrainingLog(); notice('已清空今天的训练记录。');}
    catch (error) {notice(error.message, true);}
  });
  $('#today-training-line')?.addEventListener('click', () => {
    switchTab('records', true);
    if (typeof switchRecordPanel === 'function') switchRecordPanel('training');
  });
  $('#copy-meal-buttons')?.addEventListener('click', event => {
    const button = event.target.closest?.('[data-copy-meal]');
    if (button) copyMeal(button.dataset.copyMeal).catch(error => notice(error.message, true));
  });
  $('#daily-three-form')?.addEventListener('submit', async event => {
    event.preventDefault();
    const form = event.currentTarget, message = $('.form-feedback', form), button = $('button[type=submit]', form);
    if (button.disabled) return;
    const trainingValue = form.elements.training.value;
    const sleep = number(form.elements.sleep.value);
    const weight = number(form.elements.weight.value);
    if (trainingValue === '' && sleep === null && weight === null) {feedback(message, '三样都空着，没有可保存的内容。', true); return;}
    button.disabled = true;
    feedback(message, '正在保存…');
    const saved = [];
    try {
      if (trainingValue !== '' || sleep !== null) {
        // Merge into the day's row so training, oil and the training log never split into duplicates.
        await api('/api/habits', {...(habitRowFor(activeDate) || {}), date: activeDate, ...(trainingValue === '' ? {} : {training: trainingValue === 'true'}), ...(sleep === null ? {} : {sleep})});
        saved.push(trainingValue === '' ? '睡眠' : '训练');
      }
      if (weight !== null) {
        await api('/api/measurements', {date: activeDate, weight});
        saved.push('体重');
      }
      // 记过一次就收起来：这张卡在首屏占地大，展开态最容易误触。
      try {localStorage.setItem(DAILY_THREE_KEY(activeDate), '1');} catch {}
      await loadState({quiet: true});
      feedback(message, `已记录：${saved.join('、')}。`);
    } catch (error) {feedback(message, error.message, true);}
    finally {button.disabled = false;}
  });
  for (const id of ['#ob-checks', '#data-checks']) {
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
  $('#manual-meal-form').addEventListener('submit',event=>{event.preventDefault();submitForm(event.currentTarget,'/api/meals',form=>{if(!form.elements.name.value.trim()) {markFieldInvalid(form.elements.name, '请填写餐食名称。'); throw new Error('请填写餐食名称。');}const manualTime=form.elements.mealTime.value;
      if(!clockPattern.test(manualTime)) {markFieldInvalid(form.elements.mealTime, '请填写有效的进餐时间（HH:mm）。'); throw new Error('请填写有效的进餐时间（HH:mm）。');}
      const values=numericForm(form,['calories','protein','fat','carbs']);
      // Cooking oil is its own line: 1 spoon = 10 g = 90 kcal and 10 g fat. It is added exactly once,
      // at creation, and the amount is stored so the record stays explainable (and re-editable).
      const spoons=number(form.elements.oilSpoons.value) ?? 0;
      const oilGrams=Math.round(spoons*10);
      const oilKcal=Math.round(oilGrams*9);
      const extra=oilGrams>0?{oilGrams,oilSpoons:spoons,oilAddedKcal:oilKcal,oilAddedFat:oilGrams,
        calories:(values.calories ?? 0)+oilKcal, fat:(values.fat ?? 0)+oilGrams}:{};
      return {date:form.elements.date.value,mealType:form.elements.mealType.value,mealTime:manualTime,name:form.elements.name.value.trim(),mealTimeSource:'manual',...values,...extra,source:'manual',items:[]};});});
  $('#profile-form').addEventListener('submit',event=>{event.preventDefault();submitForm(event.currentTarget,'/api/profile',form=>{
    const values=numericForm(form,['height','age','calorieTarget','referenceCalories','proteinMin','proteinMax','fatMin','fatMax']);
    if(values.proteinMin>values.proteinMax || values.fatMin>values.fatMax) {if(values.proteinMin>values.proteinMax) {markFieldInvalid(form.elements.proteinMin, '蛋白质下限不能高于上限。'); markFieldInvalid(form.elements.proteinMax, '蛋白质上限不能低于下限。');} if(values.fatMin>values.fatMax) {markFieldInvalid(form.elements.fatMin, '脂肪下限不能高于上限。'); markFieldInvalid(form.elements.fatMax, '脂肪上限不能低于下限。');} throw new Error('目标下限不能高于上限。');}
    // 训练天数统一来自「记录→训练计划」；档案表单里不再有第二个入口。
    const training = plannedSessions();
    const goal=form.elements.goal.value;
    const payload={sex:form.elements.sex.value,goal,...values,...ruleOverridesFrom(form)};
    if(training!==null) payload.training=training;
    if(goal==='lean' && !(state.profile && state.profile.leanPhaseStartedAt)) payload.leanPhaseStartedAt=localDate();
    return payload;
  });});
  $('#settings-form').addEventListener('submit',event=>{event.preventDefault();submitForm(event.currentTarget,'/api/settings',form=>{const provider=form.elements.provider.value,baseUrl=form.elements.baseUrl.value.trim(),model=form.elements.model.value.trim(),visionModel=form.elements.visionModel.value.trim(),visionEnabled=form.elements.visionEnabled.checked,key=form.elements.apiKey.value.trim(),clear=form.elements.clearKey.checked;if(key && clear)throw new Error('请不要同时填写新密钥并清除密钥。');if(key && !window.QinghengAdapter.hasNative()){form.elements.apiKey.value='';throw new Error('浏览器演示不保存 API Key；请在 APK 中配置。');}if(!/^https:\/\//i.test(baseUrl))throw new Error('API 地址必须使用 https://。');if(visionEnabled && !visionModel)throw new Error('启用图片需要填写已验证支持图片的视觉模型。');return {provider,baseUrl,model,visionModel,visionEnabled,allowExternal:form.elements.allowExternal.checked,...(key?{apiKey:key}:{}),...(clear?{clearKey:true}:{})};});});
  $('#meal-image').addEventListener('change',async event=>{const file=event.target.files[0];if(!file){feedback($('#estimate-feedback'),'没有选择照片，原来的内容没动。');return;}const revision=++imageVersion;imageData=null;imageBusy=true;feedback($('#estimate-feedback'),'正在本地压缩图片…');try{const result=await compressImage(file);if(revision!==imageVersion)return;imageData=result;mealPhotoMeta=photoMeta(null);showPhotoTime('meal',mealPhotoMeta);$('#meal-image-preview').src=result;$('#image-preview').hidden=false;feedback($('#estimate-feedback'),'图片已压缩为 JPEG，原始元数据不会上传。');}catch(error){if(revision===imageVersion){clearImage();feedback($('#estimate-feedback'),error.message,true);}}finally{if(revision===imageVersion)imageBusy=false;}});
  $('#remove-image').addEventListener('click',clearImage);
  function estimateInputNames(value) {
    return String(value||'').split(/[，,、；;\n+]+/).map(part=>part.trim()).filter(Boolean).map(part=>part
      .replace(/(?:约|大约)?\s*\d+(?:\.\d+)?\s*(?:千克|公斤|kg|克|g|毫升|ml|个|碗|份|片|根|块|勺|杯)\s*$/i,'')
      .replace(/^\d+(?:\.\d+)?\s*(?:千克|公斤|kg|克|g|毫升|ml|个|碗|份|片|根|块|勺|杯)\s*/i,'')
      .replace(/^(?:吃了|还有|另外|加了)\s*/,'').trim())
      .filter(name=>name && name.length<=48);
  }
  function estimateStreamNames(value) {
    const names=[];
    for(const match of String(value||'').matchAll(/"name"\s*:\s*"((?:\\.|[^"\\]){1,240})"/g)){
      try{const name=JSON.parse(`"${match[1]}"`).trim();if(name)names.push(name);}catch{}
    }
    return names;
  }
  const estimateRetry=document.createElement('button');
  estimateRetry.id='estimate-retry';estimateRetry.type='button';estimateRetry.className='button subtle full-width';
  estimateRetry.textContent='重试估算';estimateRetry.hidden=true;
  $('#estimate-feedback').after(estimateRetry);
  estimateRetry.addEventListener('click',()=>$('#estimate-form').requestSubmit());
  $('#estimate-form').addEventListener('input',()=>{estimateRetry.hidden=true;});
  $('#estimate-form').addEventListener('submit',async event=>{
    event.preventDefault();const form=event.currentTarget,button=$('button[type=submit]',form),message=$('#estimate-feedback');if(estimateBusy || savingDraft || !form.reportValidity())return;
    if(imageBusy){feedback(message,'图片仍在压缩，请稍等。',true);return;}
    if(!loaded || !settingsKnown){feedback(message,'尚未加载手机模型配置，请重新打开应用后再估算。',true);return;}
    if(imageData && (!state.settings.apiConfigured || !state.settings.visionEnabled || !state.settings.visionModel)){feedback(message,'照片需要已启用的视觉模型：请到「我的 → 模型连接」为所选服务商填写并启用支持图片的模型。',true);return;}
    if(imageData && !externalConsent()){feedback(message,'照片估算需要外部模型：请到「我的 → 数据、外观与说明」开启授权。',true);return;}
    if(imageData && !navigator.onLine){feedback(message,'当前离线，照片无法识别；请移除照片并用明确克重文字做本地估算。',true);return;}
    const text=form.elements.text.value.trim();if(!text && !imageData){feedback(message,'请描述餐食或添加一张图片。',true);return;}
    if(draft && !await askConfirm('新估算会替换当前未保存的预览，继续吗？', {title:'替换预览'}))return;
    const submittedForm={elements:{date:{value:form.elements.date.value},mealType:{value:form.elements.mealType.value}},
      text, photo:photoMeta(imageData?mealPhotoMeta:null)};
    estimateBusy=true;button.disabled=true;feedback(message,'正在准备估算…');
    const payload={text,allowExternal:externalConsent() && navigator.onLine,anchors:anchorSummary(),preferences:readPreferences(),...(imageData?{image:imageData}:{})};
    // Render the first useful frame before settings, transport, or model latency can delay it.
    const busy=$('#estimate-busy'),busyText=$('.inline-busy-text',busy);
    const retry=$('#estimate-retry');retry.hidden=true;
    busy.hidden=false;busy.classList.add('estimate-progress');
    let progressList=$('.estimate-progress-list',busy);
    if(!progressList){
      progressList=document.createElement('div');progressList.className='estimate-progress-list';
      for(let i=0;i<3;i++){
        const row=document.createElement('div');row.className='estimate-progress-row';
        const name=document.createElement('span');name.className='estimate-progress-name';
        const skeleton=document.createElement('span');skeleton.className='estimate-progress-skeleton';
        row.append(name,skeleton);progressList.appendChild(row);
      }
      busy.appendChild(progressList);
    }
    const paintProgress=(names,index)=>{
      const visible=Math.max(3,Math.min(names.length,4));
      while(progressList.children.length<visible){
        const row=document.createElement('div');row.className='estimate-progress-row';
        const name=document.createElement('span');name.className='estimate-progress-name';
        const skeleton=document.createElement('span');skeleton.className='estimate-progress-skeleton';
        row.append(name,skeleton);progressList.appendChild(row);
      }
      Array.from(progressList.children).forEach((row,i)=>{
        row.hidden=i>=visible;
        row.classList.toggle('is-active',i===index);
        $('.estimate-progress-name',row).textContent=names[i]||'';
      });
    };
    let progressNames=estimateInputNames(text);
    // 状态只写「正在 + 动词 + 名词」，不显示模型的信息流正文：用户要的是进度，不是推理草稿。
    const setBusyLine=()=>{
      busyText.textContent='正在分析食品营养…';
      paintProgress(progressNames,-1);
    };
    setBusyLine();
    let seen='';
    window.QinghengEstimateStream={
      onThink:()=>{ busyText.textContent='正在分析食品营养…'; },
      onDelta:chunk=>{
        seen+=String(chunk||'');
        const names=estimateStreamNames(seen);
        if(names.length>progressNames.length){
          progressNames=names;
          paintProgress(progressNames,-1);
          busyText.textContent='正在核算份量与热量…';
        }
      }
    };
    try {
      let data;
      try {data=await api('/api/estimate/stream',payload);}
      catch(streamError){data=await api('/api/estimate',payload);}
      previewDraft(data,submittedForm);feedback(message,'估算完成。请在下方修改并确认，才会保存。');
    }
    catch(error){feedback(message,error.message,true);retry.hidden=false;}
    finally{window.QinghengEstimateStream=null;busy.hidden=true;busy.classList.remove('estimate-progress');estimateBusy=false;button.disabled=false;}
  });
  $('#estimate-items').addEventListener('input',event=>{
    const input=event.target.closest('[data-item-field]');if(!input)return;
    if(input.dataset.itemField==='grams'){const grams=number(input.value);if(grams>0)scaleEstimateItem(input.closest('.estimate-item'),grams);}
    updatePreviewTotals();
  });
  $('#estimate-items').addEventListener('click',event=>{
    const recalc=event.target.closest('.recalc-item');
    if(recalc && !savingDraft){openItemRecalc(recalc.closest('.estimate-item'));return;}
    const button=event.target.closest('.remove-item');
    if(button && !savingDraft){button.closest('.estimate-item').remove();updatePreviewTotals();}
  });
  $('#item-recalc-cancel').addEventListener('click',closeItemRecalc);
  $('#item-recalc-dialog').addEventListener('click',event=>{if(event.target.id==='item-recalc-dialog')closeItemRecalc();});
  $('#item-recalc-form').addEventListener('submit',async event=>{
    event.preventDefault();
    const root=$('#item-recalc-dialog'),rows=$$('.estimate-item'),row=rows[Number(root.dataset.itemIndex)],message=$('#item-recalc-feedback');
    const button=event.currentTarget.querySelector('button[type=submit]');
    if(!row){message.textContent='找不到对应食品，请关闭后重试。';return;}
    const name=$('#item-recalc-name').value.trim();
    if(!name){message.textContent='请填写食品名称。';return;}
    const grams=number($('#item-recalc-grams').value);
    if(grams===null||grams<=0){message.textContent='请输入大于 0 的克重。';return;}
    const per100=Object.fromEntries(nutritionKeys.map(key=>[key,number($(`#item-recalc-${key}`).value)]));
    const filled=nutritionKeys.filter(key=>per100[key]!==null);
    if(filled.length && filled.length!==nutritionKeys.length){message.textContent='每 100g 的热量、蛋白质、脂肪和碳水要一起填写，或全部留空。';return;}
    if(filled.some(key=>per100[key]<0)){message.textContent='每 100g 营养值不能为负数。';return;}
    $('[data-item-field="name"]',row).value=name;
    $('[data-item-field="grams"]',row).value=grams;
    const apply=values=>{
      for(const key of nutritionKeys){$(`[data-item-field="${key}"]`,row).value=values[key];}
      row.dataset.baseGrams=grams;
      for(const key of nutritionKeys){const input=$(`[data-item-field="${key}"]`,row);input.dataset.baseValue=number(input.value);}
      updatePreviewTotals();
    };
    if(filled.length===nutritionKeys.length){
      apply(Object.fromEntries(nutritionKeys.map(key=>[key,nutritionPrecision(per100[key]*grams/100)])));
      feedback(message,'已按补充的每 100g 数值换算。');
      setTimeout(closeItemRecalc,350);
      return;
    }
    // 没填每 100g：按「名称 + 克重」让模型重算这一项，而不是拿旧比例缩放。
    if(!externalConsent() || !navigator.onLine){
      message.textContent='离线或未授权外部模型：请填上每 100g 四项数值，或保留原值。';
      return;
    }
    if(button) button.disabled=true;
    feedback(message,'正在按名称与克重重算这一项…');
    try {
      const data=await api('/api/estimate',{text:`${name} ${grams} g`,allowExternal:true,anchors:anchorSummary(),noDraft:true,preferences:readPreferences()});
      const item=(Array.isArray(data?.items)?data.items:[])[0];
      if(!item) throw new Error('模型没有返回这一项的数据，请稍后再试。');
      const returned=number(item.grams);
      const ratio=returned>0?grams/returned:1;
      apply(Object.fromEntries(nutritionKeys.map(key=>[key,nutritionPrecision((number(item[key])||0)*ratio)])));
      feedback(message,'已按名称与克重重算，核对后再保存。');
      setTimeout(closeItemRecalc,450);
    } catch(error) { message.textContent=error.message; }
    finally { if(button) button.disabled=false; }
  });
  $('#confirm-estimate').addEventListener('click',confirmDraft);$('#cancel-estimate').addEventListener('click',discardDraft);
  document.addEventListener('click',async event=>{const button=event.target.closest('[data-delete-meal]');if(!button || button.disabled)return;if(!await askConfirm('确定删除这条餐食记录吗？此操作无法撤销。',{title:'删除餐食',ok:'删除',danger:true}))return;button.disabled=true;try{await api(`/api/meals/${encodeURIComponent(button.dataset.deleteMeal)}`,undefined,'DELETE');try{await loadState({quiet:true});notice('餐食已删除。');}catch{notice('删除成功，但刷新失败。请重新加载检查记录。',true);}}catch(error){notice(error.message,true);button.disabled=false;}});
  // ---- 迁移到新手机：导出附带计数与校验和，导入时自动核对 ---------------------------------------
  /** Key-sorted JSON，校验和不受 org.json 与 JS 之间键序差异影响。 */
  function stableStringify(value) {
    if (value === undefined) return 'null';
    if (value === null || typeof value !== 'object') return JSON.stringify(value);
    if (Array.isArray(value)) return '[' + value.map(stableStringify).join(',') + ']';
    const keys = Object.keys(value).sort();
    return '{' + keys.map(key => JSON.stringify(key) + ':' + stableStringify(value[key])).join(',') + '}';
  }
  function fnv1a(text) {
    let hash = 0x811c9dc5;
    for (let i = 0; i < text.length; i++) { hash ^= text.charCodeAt(i); hash = Math.imul(hash, 0x01000193) >>> 0; }
    return ('0000000' + hash.toString(16)).slice(-8);
  }
  function migrationPayload(data) {
    return stableStringify({profile: data.profile ?? null, measurements: data.measurements ?? [],
      meals: data.meals ?? [], habits: data.habits ?? [], chats: data.chats ?? []});
  }
  function buildMigrationMeta(data) {
    return {app: 'qingheng', kind: 'migration', appVersion: APP_VERSION, exportedAt: new Date().toISOString(),
      counts: {measurements: (data.measurements || []).length, meals: (data.meals || []).length,
        habits: (data.habits || []).length, chats: (data.chats || []).length},
      checksum: fnv1a(migrationPayload(data))};
  }
  const MIGRATION_LABELS = {measurements: '身体', meals: '餐食', habits: '习惯', chats: '问答'};
  function migrationCounts(data) {
    return {measurements: (data.measurements || []).length, meals: (data.meals || []).length,
      habits: (data.habits || []).length, chats: (data.chats || []).length};
  }
  $('#export-data').addEventListener('click',async()=>{const button=$('#export-data'),message=$('#data-feedback');button.disabled=true;feedback(message,'正在生成备份…');let url;try{const data=await api('/api/export');data.meta=buildMigrationMeta(data);if(window.QinghengAdapter.hasNative()){if(typeof window.QinghengNative.exportJson!=='function')throw new Error('手机导出功能未连接。');window.QinghengNative.exportJson(JSON.stringify(data));await markBackedUp();feedback(message,'请选择手机文件保存位置。备份包含健康记录，请妥善保管；导入新手机时会自动核对。');return;}url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const link=document.createElement('a');link.href=url;link.download=`qingheng-backup-${localDate()}.json`;document.body.append(link);link.click();link.remove();feedback(message,'备份下载已开始。文件含健康记录，请妥善保管。');setTimeout(()=>URL.revokeObjectURL(url),10000);await markBackedUp();}catch(error){feedback(message,error.message,true);}finally{button.disabled=false;}});
  $('#import-data').addEventListener('change',async event=>{const input=event.currentTarget,file=input.files[0],message=$('#data-feedback');if(!file)return;input.disabled=true;try{if(file.size>10*1024*1024)throw new Error('导入文件不能大于 10MB。');let data;try{data=JSON.parse(await file.text());}catch{throw new Error('文件不是有效 JSON，请选择轻衡备份。');}if(!data || typeof data.profile!=='object' || data.profile===null || !['measurements','meals','habits'].every(key=>Array.isArray(data[key])))throw new Error('备份必须包含 profile、measurements、meals 和 habits。');const chats=Array.isArray(data.chats)?data.chats:[];const meta=(data.meta && typeof data.meta==='object')?data.meta:null;let integrity='';
if(meta && meta.kind==='migration'){const countsOk=!meta.counts || Object.keys(MIGRATION_LABELS).every(key=>Number(meta.counts[key])===migrationCounts(data)[key]);integrity=(meta.checksum===fnv1a(migrationPayload(data)) && countsOk)?'迁移包校验一致，文件完整。':'注意：校验和不一致，文件可能被改动或不完整。';}
if(!await askConfirm(`将向手机本地导入 ${data.measurements.length} 条测量、${data.meals.length} 条餐食、${data.habits.length} 条习惯和 ${chats.length} 条问答。导入按记录 ID 合并，不会删除现有数据；建议先导出备份。${integrity?' '+integrity:''}是否继续？`,{title:'导入备份',ok:'导入'}))return;feedback(message,'正在导入…');await api('/api/import',{profile:data.profile,measurements:data.measurements,meals:data.meals,habits:data.habits,chats});try{await loadState({quiet:true});
let report='';
if(meta && meta.counts){const now=migrationCounts({measurements:state.measurements,meals:state.meals,habits:state.habits,chats:state.chats});const rows=Object.keys(MIGRATION_LABELS).map(key=>{const expect=Number(meta.counts[key]);if(!Number.isFinite(expect))return null;return `${MIGRATION_LABELS[key]} ${now[key]}/${expect}${now[key]<expect?'（少于迁移包标注）':''}`;}).filter(Boolean);const matched=Object.keys(MIGRATION_LABELS).every(key=>{const expect=Number(meta.counts[key]);return !Number.isFinite(expect)||now[key]>=expect;});if(rows.length)report='核对：'+rows.join('、')+(matched?'，与迁移包一致。':'；请抽查关键记录是否都在。');}
feedback(message,'数据已导入。'+report);
}catch{feedback(message,'导入成功，但刷新失败。请重新加载，不要重复导入。',true);}}catch(error){feedback(message,error.message,true);}finally{input.value='';input.disabled=false;}});
  window.addEventListener('offline',()=>{connection();notice('当前离线：手机本地记录仍可读取和保存，本地食物估算与规则建议可用；外部 AI 暂不可用。');});
  window.addEventListener('online',()=>{connection();loadState({populate:false}).catch(()=>{});});
  window.addEventListener('beforeunload',event=>{if(draft || savingDraft){event.preventDefault();event.returnValue='';}});
  // Daily push advice history is written by AlarmReceiver; the UI only reads it back.
  async function queryPushHistory(useRange = false) {
    const box = $('#push-history'); if (!box) return;
    const start = $('#push-history-start').value, end = $('#push-history-end').value;
    const data = await api('/api/push-history');
    const slotNames = {morning:'白天', evening:'晚上', manual:'手动获取'};
    const rows = (Array.isArray(data && data.records) ? data.records : [])
      .filter(row => row && (!useRange || ((!validDate(start) || String(row.date) >= start) && (!validDate(end) || String(row.date) <= end))))
      .sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));
    box.innerHTML = rows.length
      ? rows.map(row => `<div class="meal-row list-row" role="listitem"><div class="row-body"><div class="row-head"><strong>${esc(row.date || '')}</strong><span class="row-tag">${esc(slotNames[row.slot] || row.slot || '')}</span>${row.source === 'api' ? '<span class="row-tag">外部模型</span>' : row.source === 'skipped' ? '<span class="row-tag">已跳过</span>' : '<span class="row-tag">提醒</span>'}</div><div class="answer">${answerHtml(row.message || '')}</div></div></div>`).join('')
      : empty(useRange ? '这个日期范围内没有保存的生活建议。' : '还没有保存的推送建议。开启每日推送后，早晚建议会保存在这里。');
  }
  /**
   * Today's advice, grouped by slot. The page used to open on an empty query form, which read as
   * "there is no advice" even when this morning's push had already written one.
   */
  async function loadTodayAdvice() {
    const box = $('#push-today'); if (!box) return;
    const tag = $('#push-today-tag');
    const today = localDate();
    if (tag) tag.textContent = today;
    try {
      const data = await api('/api/push-history');
      const order = {morning: 0, meal: 1, evening: 2, weekly: 3};
      const slotNames = {morning: '白天建议', meal: '餐后反馈', evening: '晚间复盘', weekly: '每周复盘'};
      const rows = (Array.isArray(data && data.records) ? data.records : [])
        .filter(row => row && String(row.date) === today)
        .sort((a, b) => (order[a.slot] ?? 9) - (order[b.slot] ?? 9) || Number(a.createdAt || 0) - Number(b.createdAt || 0));
      box.innerHTML = rows.length
        ? rows.map(row => `<div class="meal-row list-row" role="listitem"><div class="row-body"><div class="row-head"><strong>${esc(slotNames[row.slot] || row.slot || '建议')}</strong><span class="row-tag">${row.source === 'api' ? '外部模型' : row.source === 'skipped' ? '已跳过' : '提醒'}</span><span class="row-date">${esc(String(row.date || ''))}</span></div><div class="answer">${answerHtml(row.message || '')}</div></div></div>`).join('')
        : empty('今天还没有生成建议。开启每日推送后，07:30 与 20:30 的分析会出现在这里；也可以直接在问答页问一句。');
    } catch (error) {
      box.textContent = error.message;
    }
  }
  /**
   * Three things the log can answer without any model call: which lift stopped moving, what to swap it
   * for, and whether this week's volume is a deload candidate. Reuses weeklyVolume() so the Monday
   * boundary and the volume formula stay in one place.
   */
  function trainingInsights() {
    const rows = typeof weeklyVolume === 'function' ? weeklyVolume() : [];
    const swaps = {'深蹲': '腿举', '卧推': '上斜哑铃卧推', '硬拉': '罗马尼亚硬拉', '划船': '引体向上', '肩推': '侧平举', '腿举': '保加利亚分腿蹲', '推举': '哑铃肩推'};
    const insights = [];
    // 负荷判定与趋势页共用 acwrFromDailyLoads，不再各算一套：卡片说「偏高」而趋势页说「正常」是最伤信任的那种不一致。
    const load = typeof acwrFromDailyLoads === 'function' && typeof dailyLoads === 'function'
      ? acwrFromDailyLoads(dailyLoads(28), activeDate) : null;
    if (load && Number.isFinite(load.ratio)) {
      if (load.flag === 'high') insights.push({tag: '负荷', text: `近 7 天训练负荷是近 4 周周均的 ${load.ratio} 倍，偏高；本周减载或安排一天完全休息`});
      else if (load.flag === 'low' && load.ratio > 0) insights.push({tag: '负荷', text: `近 7 天负荷只有平时的 ${load.ratio} 倍，偏低；停练或减量时优先保住蛋白摄入与睡眠`});
    }
    for (const row of rows) {
      if (!(row.prevVolume > 0) || row.lastVolume > row.prevVolume * 1.02) continue;
      const swap = swaps[row.name];
      insights.push({tag: '停滞', text: `${row.name} 连续两周没有进步（${fmt(row.prevVolume,0)} → ${fmt(row.lastVolume,0)} kg 容量）${swap ? `，可以换成 ${swap} 练 4~6 周` : ''}`});
    }
    let last = 0, prev = 0;
    for (const row of rows) {last += row.lastVolume; prev += row.prevVolume;}
    if (prev > 0 && last > prev * 1.25) insights.push({tag: '容量', text: `本周总容量比上周高 ${fmt((last / prev - 1) * 100, 0)}%；如果连着两周都这样，下周减量 40% 当 deload`});
    if (!insights.length) {
      const trained = (state.habits || []).some(row => row && row.date === localDate() && (row.training === true || row.training === 'true'));
      insights.push({tag: '状态', text: trained ? '今天已训练；容量连续两周上升，说明渐进超负荷在生效。' : '今天还没记录训练；练完记一条，下周就能看出哪个动作停了。'});
    }
    return insights.slice(0, 3);
  }
  /** Renders those insights into the 今天-page training card. */
  function renderTrainingInsights() {
    const box = $('#training-advice-insights');
    if (!box) return;
    box.innerHTML = trainingInsights().map(item =>
      `<div class="adv-insight"><span class="adv-insight-tag">${esc(item.tag)}</span><p>${esc(item.text)}</p></div>`
    ).join('');
  }
  /** The 今天-page window: training questions only; external sending uses the one-time consent. */
  let lastTrainingReply = "";
  function installTrainingAdvice() {
    const form = $('#training-advice-form'), input = $('#training-advice-input');
    const answerBox = $('#training-advice-answer'), feedbackBox = $('#training-advice-feedback'), chips = $('#training-advice-chips');
    if (!form || !input) return;
    const presets = ['今天练什么最划算？', '只有 40 分钟，怎么排？', '昨晚没睡好，今天强度怎么调？'];
    if (chips) chips.innerHTML = presets.map((text, index) => `<button type="button" class="button subtle" data-training-preset="${index}">${esc(text)}</button>`).join('');
    if (chips) chips.addEventListener('click', event => {
      const button = event.target.closest('[data-training-preset]');
      if (!button) return;
      input.value = presets[Number(button.dataset.trainingPreset)] || '';
      input.focus();
    });
    form.addEventListener('submit', async event => {
      event.preventDefault();
      const question = input.value.trim();
      if (!question) {feedback(feedbackBox, '先写一句要问的训练问题。', true); return;}
      if (!externalConsent()) {feedback(feedbackBox, '请先到「我的 → 数据、外观与说明」开启外部模型授权。', true); return;}
      feedback(feedbackBox, '正在生成…');
      const button = form.querySelector('button[type="submit"]');
      if (button) button.disabled = true;
      // 训练建议走流式，和问答页一样能看到「正在思考…」与逐字输出；不支持时退回一次性接口。
      const payload = {question, focus: 'training', date: localDate(), allowExternal: true, anchors: anchorSummary(), preferences: readPreferences(), webSearch: false, logToHistory: false};
      try {
        let data = null;
        if (answerBox) {answerBox.hidden = false; answerBox.innerHTML = '';}
        try {
          data = await streamInto(answerBox, payload);
        } catch (streamError) {
          feedback(feedbackBox, '流式输出不可用，正在一次性生成…');
          data = await api('/api/chat', payload);
        }
        const reply = String(data && data.reply || '').trim();
        if (!reply) throw new Error('模型没有返回可读的回答，请重试。');
        if (answerBox) {
          answerBox.hidden = false;
          answerBox.innerHTML = answerHtml(reply)
            + '<div class="button-row" id="training-advice-addrow"><button type="button" class="button subtle" id="training-advice-add">把回答里的动作加入今天的训练</button></div>';
          lastTrainingReply = reply;
          if (typeof saveLastTrainingAdvice === 'function') saveLastTrainingAdvice(question, reply);
          if (typeof renderLastChat === 'function') renderLastChat();
          nextFrame(() => {if (answerBox.isConnected) answerBox.scrollIntoView({block: 'start', behavior: 'smooth'});});
          const addButton = $("#training-advice-add");
          if (addButton) addButton.addEventListener("click", async () => {
            const parsed = parseExercisesFromText(lastTrainingReply);
            if (!parsed.length) { notice("这段回答里没有识别到「动作 + 组×次 + 重量」的写法，可以在下面的训练日志里手动记。", true); return; }
            // 从散文里猜出来的动作要先给人看一眼，确认后再写库——猜错比不做更糟。
            const lines = parsed.map(item => "· " + item.name
              + (item.sets ? " " + item.sets + "组" : "")
              + (item.reps ? " × " + item.reps + "次" : "")
              + (item.weight ? " " + item.weight + " kg" : "")).join("\n");
            const go = await askConfirm("识别到 " + parsed.length + " 个动作：\n" + lines
              + "\n\n要把它们加入今天的训练记录吗？",
              {title: "加入训练记录", ok: "加入", cancel: "先不加"});
            if (!go) return;
            addExercisesToToday(parsed).catch(() => {});
          });
        }
        feedback(feedbackBox, '');
      } catch (error) {
        feedback(feedbackBox, error.message, true);
      } finally {
        if (button) button.disabled = false;
      }
    });
  }
  /**
   * 记录页有九张卡片，低频的几张占了半屏。把它们收进默认折叠的 details，卡片内部的渲染逻辑不动。
   */
  function installCardCollapse() {
    const groups = [
      ['#food-search', '食品热量参考库（本地，不消耗 token）'],
      ['#manual-meal-form', '手动记录餐食（已知营养数据）']
    ];
    for (const [selector, label] of groups) {
      const anchor = document.querySelector(selector);
      const card = anchor && anchor.closest('article.card');
      if (!card || card.dataset.collapsed === '1') continue;
      const details = document.createElement('details');
      details.className = 'card-collapse';
      const summary = document.createElement('summary');
      summary.textContent = label;
      const body = document.createElement('div');
      body.className = 'card-collapse-body';
      while (card.firstChild) body.appendChild(card.removeChild(card.firstChild));
      details.appendChild(summary);
      details.appendChild(body);
      details.open = false;
      card.appendChild(details);
      card.dataset.collapsed = '1';
    }
  }
  /** One-tap habit values: the form asks for six fields, most days only three matter. */
  function installHabitChips() {
    const row = $('#habit-chips'), form = $('#habit-form');
    if (!row || !form) return;
    const presets = [
      ['步数 6k', 'steps', 6000], ['步数 8k', 'steps', 8000], ['步数 10k', 'steps', 10000],
      ['睡眠 6.5h', 'sleep', 6.5], ['睡眠 7.5h', 'sleep', 7.5], ['睡眠 8.5h', 'sleep', 8.5],
      ['饮水 1.5L', 'water', 1500], ['饮水 2L', 'water', 2000], ['饮水 2.5L', 'water', 2500]
    ];
    row.innerHTML = presets.map(([label, key, value], index) => `<button type="button" class="button subtle" data-habit-preset="${index}">${esc(label)}</button>`).join('')
      ;
    const copyRow = $('#habit-copy-row');
    if (copyRow) copyRow.innerHTML = '<button type="button" class="button subtle" data-habit-copy="1">复制昨天</button>';
    row.addEventListener('click', event => {
      const copy = event.target.closest('[data-habit-copy]');
      if (copy) {
        const yesterday = shiftDay(localDate(), -1);
        const rowData = (state.habits || []).find(item => item && item.date === yesterday);
        if (!rowData) {notice('昨天没有习惯记录可复制。', true); return;}
        for (const key of ['steps', 'sleep', 'water']) {
          const field = form.elements[key];
          if (field && number(rowData[key]) !== null) field.value = rowData[key];
        }
        notice('已填入昨天的数值，可修改后保存。');
        return;
      }
      const button = event.target.closest('[data-habit-preset]');
      if (!button) return;
      const [label, key, value] = presets[Number(button.dataset.habitPreset)];
      const field = form.elements[key];
      // 不抢焦点：这里只是代入默认值，弹起键盘会挡住下面的字段和保存按钮。
      if (field) field.value = value;
      button.classList.add('is-used');
      setTimeout(() => button.classList.remove('is-used'), 900);
    });
  }
  /** Suggested questions: an empty box is the main reason people do not ask anything. */
  function installChatChips() {
    const row = $('#chat-chips'), box = $('#chat-question');
    if (!row || !box) return;
    const presets = ['我今天蛋白够吗？', '今天训练日该怎么吃？', '本周体重趋势怎么样？'];
    row.innerHTML = presets.map((text, index) => `<button type="button" class="button subtle" data-chat-chip="${index}">${esc(text)}</button>`).join('')
      + `<button type="button" class="button subtle" data-chat-train="1">＋ 记一条训练</button>`;
    row.addEventListener('click', event => {
      const train = event.target.closest('[data-chat-train]');
      if (train) {
        // Fills a sentence template and immediately shows the draft card, so the flow is one tap in.
        const sample = '昨天跑步 5 公里，用了 30 分钟';
        box.value = sample;
        showTrainingDraft(parseTrainingDraft(sample, activeDate));
        box.focus();
        return;
      }
      const button = event.target.closest('[data-chat-chip]');
      if (!button) return;
      box.value = presets[Number(button.dataset.chatChip)] || '';
      box.focus();
    });
  }
  const runPushHistory = (useRange, button) => {
    if (button) button.disabled = true;
    return queryPushHistory(useRange).catch(error => {const box = $('#push-history'); if (box) box.textContent = error.message;}).finally(() => {if (button) button.disabled = false;});
  };
  $('#refresh-push-history').addEventListener('click', event => runPushHistory(false, event.currentTarget));
  $('#query-push-history').addEventListener('click', event => runPushHistory(true, event.currentTarget));
  (function(){
    const box=$('#chat-web'), toggle=$('#chat-web-toggle');
    if(!box) return;
    const paint=()=>{ if(toggle) toggle.setAttribute('aria-pressed', box.checked ? 'true' : 'false'); };
    try{const saved=localStorage.getItem(CHAT_WEB_KEY);if(saved!==null)box.checked=saved==='1';}catch{}
    paint();
    if(toggle) toggle.addEventListener('click',()=>{box.checked=!box.checked;paint();try{localStorage.setItem(CHAT_WEB_KEY,box.checked?'1':'0');}catch{}if (typeof schedulePrefsSync === 'function') schedulePrefsSync({chatWeb: box.checked});});
    box.addEventListener('change',()=>{paint();try{localStorage.setItem(CHAT_WEB_KEY,box.checked?'1':'0');}catch{}
      if (typeof schedulePrefsSync === 'function') schedulePrefsSync({chatWeb: box.checked});
    });
  })();
  // ---- Generic draft: recognise -> confirm -> write -> undo ----------------------------------------
  let pendingDraft = null, draftUndo = null;
  function showTrainingDraft(draft) {
    pendingDraft = draft;
    renderTrainingDraft(draft);
  }
  /**
   * Applies one confirmed draft. Training merges into the day's exercise list; the simple metrics
   * merge into the same habit row; weight goes to measurements. Returns what undo has to restore.
   */
  async function applyDraft(draft) {
    const habit = habitRowFor(draft.date) || {date: draft.date};
    const existing = Array.isArray(habit.exercises) ? habit.exercises : [];
    if (draft.kind === 'weight') {
      const before = (state.measurements || []).find(row => row && row.date === draft.date) || null;
      await api('/api/measurements', {date: draft.date, weight: draft.payload.weight});
      return {kind: 'weight', date: draft.date, before};
    }
    if (draft.kind === 'training') {
      await api('/api/habits', {...habit, date: draft.date, training: true,
        exercises: [...existing, ...(draft.payload.exercises || [])]});
      return {kind: 'habits', date: draft.date, before: {...habit, date: draft.date, exercises: existing}};
    }
    const key = draft.payload && Object.keys(draft.payload)[0];
    if (!key) throw new Error('这条草稿没有可写入的字段');
    await api('/api/habits', {...habit, date: draft.date, [key]: draft.payload[key]});
    return {kind: 'habits', date: draft.date, before: {...habit, date: draft.date}};
  }
  $('#chat-training-draft')?.addEventListener('click', async event => {
    if (event.target.closest('[data-draft-cancel]')) { pendingDraft = null; draftUndo = null; renderTrainingDraft(null); return; }
    if (event.target.closest('[data-draft-undo]')) {
      if (!draftUndo) return;
      try {
        if (draftUndo.kind === 'weight') {
          if (draftUndo.before) await api('/api/measurements', {date: draftUndo.date, weight: draftUndo.before.weight});
        } else {
          await api('/api/habits', {...draftUndo.before, date: draftUndo.date});
        }
        draftUndo = null;
        renderTrainingDraft(null);
        await loadState({quiet: true});
        notice('已撤销刚才写入的记录。');
      } catch (error) { notice(error.message, true); }
      return;
    }
    const confirm = event.target.closest('[data-draft-confirm]');
    if (!confirm || !pendingDraft) return;
    const draft = pendingDraft;
    try {
      confirm.disabled = true;
      draftUndo = await applyDraft(draft);
      pendingDraft = null;
      const box = $('#chat-training-draft');
      if (box) {
        box.hidden = false;
        box.innerHTML = `<div class="card training-draft"><div class="card-heading"><h2>已写入${esc(DRAFT_KINDS[draft.kind] || '记录')}</h2><span class="tag">${esc(draft.date)}</span></div>`
          + `<p>${esc(draftSummary(draft))}</p><p class="fine-print">30 秒内可撤销。</p>`
          + `<div class="button-row"><button type="button" class="button subtle" data-draft-undo="1">撤销</button></div></div>`;
      }
      await loadState({quiet: true});
      notice('已写入 ' + draft.date + ' 的' + (DRAFT_KINDS[draft.kind] || '记录') + '。');
      setTimeout(() => {draftUndo = null;}, 30000);
    } catch (error) {
      confirm.disabled = false;
      notice(error.message, true);
    }
  });
  // ---- One-tap scheduling of the generated week ------------------------------------------------
  $('#week-plan')?.addEventListener('click', async event => {
    const button = event.target.closest('[data-plan-schedule]');
    if (!button) return;
    const plan = lastWeekPlan;
    if (!plan) return;
    const ok = await askConfirm('将把 ' + plan.days.length + ' 次训练写入 ' + plan.startDate + ' 起的一周（每天一条训练记录），继续？', {title: '一键排课'});
    if (!ok) return;
    button.disabled = true;
    try {
      for (const day of plan.days) {
        const habit = habitRowFor(day.date) || {date: day.date};
        const existing = Array.isArray(habit.exercises) ? habit.exercises : [];
        await api('/api/habits', {...habit, date: day.date, training: true,
          exercises: [...existing, ...day.exercises.map(item => ({name: item.name, sets: item.sets, reps: item.reps, weight: item.weight}))]});
      }
      await loadState({quiet: true});
      notice('已排好 ' + plan.days.length + ' 次训练，可在「记录 · 训练」逐日调整。');
    } catch (error) {
      notice(error.message, true);
    } finally {
      button.disabled = false;
    }
  });
  $('#global-notice-close')?.addEventListener('click', () => hideNotice());
  $('#render-error-retry')?.addEventListener('click', () => {
    const bar = $('#render-error');
    if (bar) bar.hidden = true;
    loadState({quiet: false}).catch(() => showRenderError(new Error('重新加载失败，请确认应用仍在前台')));
  });
  installPageHeadingStructures();
  syncActiveDateLabel();
  installTodayQuickActions();
  installChatTaskOrder();
  installProfileMore();
  function renderPreferences() {
    const list = readPreferences();
    const box = $('#preference-list'), tag = $('#preference-count'), hub = $('#hub-summary-prefs');
    if (tag) tag.textContent = list.length + ' 条';
    if (hub) hub.textContent = list.length ? list.slice(0, 2).join(' · ') + (list.length > 2 ? '…' : '') : '让建议记住你的习惯';
    if (!box) return;
    box.innerHTML = list.length
      ? list.map((item, index) => `<div class="hub-row preference-row" role="listitem"><span class="hub-text"><span class="hub-title">${esc(item)}</span></span><button type="button" class="icon-button danger" data-preference-remove="${index}" aria-label="删除这条偏好">×</button></div>`).join('')
      : '<p class="empty-note">还没有偏好。写一句「不吃香菜」或「早餐固定两个鸡蛋加豆浆」，之后的估算与建议都会避开它。</p>';
  }
  function installPreferences() {
    const add = $('#preference-add'), input = $('#preference-input'), feedback = $('#preference-feedback');
    if (!add || !input || add.dataset.bound) return;
    add.dataset.bound = '1';
    const submit = () => {
      const text = input.value.trim();
      if (!text) {feedback.textContent = '写一句再记。'; return;}
      const list = readPreferences();
      if (list.includes(text)) {feedback.textContent = '这条已经记过了。'; return;}
      if (list.length >= 20) {feedback.textContent = '最多 20 条，先删掉旧的再记。'; return;}
      writePreferences([...list, text]);
      input.value = '';
      feedback.textContent = '已记住。';
      renderPreferences();
    };
    add.addEventListener('click', submit);
    input.addEventListener('keydown', event => {if (event.key === 'Enter') {event.preventDefault(); submit();}});
    $('#preference-list')?.addEventListener('click', event => {
      const remove = event.target.closest('[data-preference-remove]');
      if (!remove) return;
      const index = Number(remove.dataset.preferenceRemove);
      const list = readPreferences();
      list.splice(index, 1);
      writePreferences(list);
      renderPreferences();
    });
  }
  function addPreferenceFromChat(record) {
    const text = String(record?.question || record?.prompt || record?.answer || '').trim().slice(0, 80);
    if (!text) {notice('这条记录没有可记的内容。', true); return;}
    const list = readPreferences();
    if (list.includes(text)) {notice('这条已经记过了。'); return;}
    if (list.length >= 20) {notice('最多 20 条，先到「我的 → 偏好与记忆」删掉旧的。', true); return;}
    writePreferences([...list, text]);
    renderPreferences();
    notice('已记为偏好，之后的估算与建议会带上它。');
  }
  renderPreferences();
  installPreferences();
  /** 展开/收起：把内容包进 grid 容器，0fr→1fr 过渡 0.28s（真机验证过，不依赖新 CSS 特性）。 */
  function installDisclosureAnimation() {
    const wrap = details => {
      if (!details || details.tagName !== 'DETAILS') return;
      if (details.querySelector(':scope > .disclosure-body')) return;
      const summary = details.querySelector(':scope > summary');
      if (!summary) return;
      const body = document.createElement('div');
      body.className = 'disclosure-body';
      const inner = document.createElement('div');
      inner.className = 'disclosure-inner';
      while (details.lastChild && details.lastChild !== summary) inner.insertBefore(details.lastChild, inner.firstChild);
      body.append(inner);
      details.append(body);
    };
    document.querySelectorAll('details').forEach(wrap);
    new MutationObserver(records => {
      for (const record of records) {
        // 内容被 innerHTML 重写时，包裹层会被冲掉：从变更目标往上找 details 再包一次。
        const owner = record.target?.closest?.('details');
        if (owner) wrap(owner);
        for (const node of record.addedNodes) {
          if (node.nodeType !== 1) continue;
          if (node.tagName === 'DETAILS') wrap(node);
          node.querySelectorAll?.('details').forEach(wrap);
        }
      }
    }).observe(document.body, {childList: true, subtree: true});
  }
  installDisclosureAnimation();
  installMealWindow();
  installRecordPanels();
  installTrendPanels();
  installProfileAutoRecalc();
  applyTrainingVisibility();
  installCardCollapse(); installTrainingAdvice(); installHabitChips(); installChatChips();
  setupCollapsibleSections(); installQuickRecordControls(); installHealthConnectControls(); searchFoods(); restoreConsent(); installExternalConsent(); installExactAlarmControl();
/* 问答页分段：问答 / 训练建议（2026-11-17：今日训练建议从今天页迁到问答页）。
   面板显隐沿用记录页的 .record-panel[hidden] 约定，选择记在 localStorage。 */
(function () {
  const KEY = 'qingheng.chatPanel';
  const panels = () => [...document.querySelectorAll('#view-chat [data-chat-panel].record-panel')];
  const buttons = () => [...document.querySelectorAll('#chat-tabs [data-chat-panel]')];
  function apply(panel) {
    const want = panel === 'training' ? 'training' : 'chat';
    for (const node of panels()) node.hidden = node.dataset.chatPanel !== want;
    for (const button of buttons()) {
      const on = button.dataset.chatPanel === want;
      button.setAttribute('aria-selected', on ? 'true' : 'false');
      if (on) button.setAttribute('aria-current', 'page'); else button.removeAttribute('aria-current');
    }
  }
  function installChatPanels() {
    const bar = document.querySelector('#chat-tabs');
    if (!bar || bar.dataset.wired === '1') return;
    bar.dataset.wired = '1';
    let saved = 'chat';
    try { saved = localStorage.getItem(KEY) || 'chat'; } catch (error) { saved = 'chat'; }
    apply(saved);
    bar.addEventListener('click', event => {
      const button = event.target.closest('[data-chat-panel]');
      if (!button) return;
      const panel = button.dataset.chatPanel;
      apply(panel);
      try { localStorage.setItem(KEY, panel); } catch (error) { /* 隐私模式写不进去就算了 */ }
      if (panel === 'training' && typeof renderTrainingInsights === 'function') renderTrainingInsights();
    });
  }
  if (typeof window !== 'undefined') window.installChatPanels = installChatPanels;
  installChatPanels();
})();
/* Fragment of assets/app.js -- assembled by tools/assemble-app.ps1 in filename order.
 * Edit this file, never the generated assets/app.js; tests/app-fragments.test.mjs fails on drift. */
  // ---- Motion layer ----------------------------------------------------------------------------
  // Numbers land, they do not perform. A value change eases from the number that was on screen to
  // the new one in 320ms, then stops being a moving number. Everything else in the app already
  // animates through styles.css tokens; this file only covers what CSS cannot: a text node whose
  // value is replaced by render code.
  //
  // Rules worth keeping:
  //  - never roll on first paint (— to 0 is not a transition, it is noise);
  //  - a reduced-motion user gets the final number immediately, never a shortened roll;
  //  - tabular figures, so the ring does not jitter while digits change width;
  //  - a render that lands mid-roll continues from what is on screen, and a watchdog guarantees the
  //    final number even if the vendored runtime misbehaves.
  function installCountRoll(root){
    const scope = root && root.querySelectorAll ? root : document;
    const nodes = Array.prototype.slice.call(scope.querySelectorAll('[data-count]'));
    if (!nodes.length) return;
    const lib = window.MotionLib && typeof window.MotionLib.animate === 'function' ? window.MotionLib : null;
    const reduced = () => !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    const easings = (t) => 1 - Math.pow(1 - t, 3);
    const read = (node) => {
      const text = (node.textContent || '').trim();
      if (!text || text === '—') return null;
      const value = Number(text.replace(/[^\d.\-]/g, ''));
      return Number.isFinite(value) ? value : null;
    };
    const format = (value) => Math.round(value).toLocaleString('zh-CN');

    nodes.forEach((node) => {
      // 重新调用时只挂新节点：训练概览每次渲染都会换掉自己的数字节点。
      if (node.dataset.countWired === '1') return;
      node.dataset.countWired = '1';
      let shown = read(node);       // 最后一次渲染写入的目标值
      let displayed = shown;        // 屏幕此刻的值（滚动途中会落后于目标）
      let writing = 0;              // 自己写入的次数，用来把外部渲染的写入摘出来
      let controls = null;
      let fallbackFrame = 0;
      let watchdog = 0;

      const paint = (value) => { displayed = value; writing += 1; node.textContent = format(value); };
      const stop = () => {
        if (controls) { try { controls.stop(); } catch (error) { /* 停不掉就等下一次写入覆盖 */ } controls = null; }
        if (fallbackFrame) { cancelAnimationFrame(fallbackFrame); fallbackFrame = 0; }
        if (watchdog) { clearTimeout(watchdog); watchdog = 0; }
      };
      const settle = (target) => { stop(); shown = target; paint(target); };
      const frameLoop = (from, to) => {
        const started = performance.now();
        const tick = (now) => {
          const t = Math.min(1, (now - started) / 320);
          paint(from + (to - from) * easings(t));
          if (t < 1) { fallbackFrame = requestAnimationFrame(tick); return; }
          fallbackFrame = 0;
          settle(to);
        };
        fallbackFrame = requestAnimationFrame(tick);
      };

      const roll = (from, to) => {
        shown = to;
        if (reduced()) { settle(to); return; }
        stop();
        if (lib) {
          const state = { value: from };
          try {
            controls = lib.animate(state, { value: to }, {
              duration: 0.32,
              easing: easings,
              onUpdate: () => paint(state.value),
            });
            if (controls && typeof controls.then === 'function') {
              controls.then(() => settle(to)).catch(() => settle(to));
            }
            watchdog = setTimeout(() => { if (shown === to && displayed !== to) settle(to); }, 420);
            return;
          } catch (error) {
            controls = null;
          }
        }
        frameLoop(from, to);
      };

      new MutationObserver(() => {
        if (writing > 0) { writing -= 1; return; }
        const next = read(node);
        if (next === null) { stop(); shown = null; displayed = null; return; }
        if (shown === null) { shown = next; displayed = next; return; }
        if (next === shown) return;
        roll(displayed === null ? next : displayed, next);
      }).observe(node, { childList: true, characterData: true, subtree: true });
    });
  }
  installCountRoll(document);

  // ---- Card entrance ---------------------------------------------------------------------------
  // 首帧不表演：切到某个 tab 时才让这个 tab 的卡片按真实顺序依次归位 6px。
  // 之所以交给 motion.min.js 而不是 nth-child 的 CSS：错帧跟着 .card 的实际顺序走，卡片外面再包一层
  // 或中间插一个空态块都不会错位；快速连点 tab 时每次切换都是独立的一次入场，不会叠加。
  (function installViewStagger(){
    const lib = window.MotionLib && typeof window.MotionLib.animate === 'function' ? window.MotionLib : null;
    if (!lib) return;
    const reduced = () => !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    const entrance = (t) => 1 - Math.pow(1 - t, 3);
    const stagger = (view) => {
      const cards = Array.prototype.slice.call(view.children)
        .filter((child) => child.classList && child.classList.contains('card'))
        .slice(0, 5);
      cards.forEach((card, index) => {
        try {
          lib.animate(card, { opacity: [0, 1], y: [6, 0] }, {
            duration: 0.26,
            delay: index * 0.028,
            easing: entrance,
          });
        } catch (error) {
          // 入场失败就让它静止：不动是可接受的降级，卡在半透明不可接受。
          card.style.opacity = '';
          card.style.transform = '';
        }
      });
    };
    const views = Array.prototype.slice.call(document.querySelectorAll('.view'));
    views.forEach((view) => {
      // 首屏已显示的页面记一笔，之后切回来才做入场。
      if (!view.hidden) view.dataset.motionSeen = '1';
      new MutationObserver(() => {
        if (view.hidden || reduced()) return;
        if (view.dataset.motionSeen !== '1') { view.dataset.motionSeen = '1'; return; }
        stagger(view);
      }).observe(view, { attributes: true, attributeFilter: ['hidden'] });
    });
  })();
/* Fragment of assets/app.js -- assembled by tools/assemble-app.ps1 in filename order.
 * Edit this file, never the generated assets/app.js; tests/app-fragments.test.mjs fails on drift. */
  // ---- 左右滑动切换 tab ------------------------------------------------------------------------
  // 一屏一次滑动只换一格，方向和 TAB_ORDER 一致：手指向左 = 下一屏，向右 = 上一屏，到头不回绕。
  // 不跟手：跟手要常驻 transform 与滚动锁，和内置滚动、下拉刷新、输入焦点抢手势；判定放在松手时，
  // 复用 switchTab 已有的 from-left/from-right 滑入，手感一致且不新增一套位移。
  (function installTabSwipe(){
    const SWIPE_X = 56;        // 小于这个位移算点击，不算滑动
    const SWIPE_MS = 600;      // 慢慢拖过去不算一次切换
    const SWIPE_RATIO = 1.6;   // 斜着划以纵向滚动为准
    let start = null;
    const blocked = (target) => !!(target && target.closest && target.closest(
      'input,textarea,select,[contenteditable="true"],.app-dialog,.sheet-panel,.pref-chips,.chips,.segmented,.table-wrap,[data-swipe-ignore]'));
    const currentTab = () => document.querySelector('[data-tab][aria-current="page"]')?.dataset.tab || 'today';
    document.addEventListener('touchstart', (event) => {
      if (event.touches.length !== 1) { start = null; return; }
      const touch = event.touches[0];
      start = { x: touch.clientX, y: touch.clientY, at: performance.now(), ignore: blocked(event.target) };
    }, { passive: true });
    document.addEventListener('touchend', (event) => {
      const from = start; start = null;
      if (!from || from.ignore || event.changedTouches.length !== 1) return;
      const touch = event.changedTouches[0];
      const dx = touch.clientX - from.x;
      const dy = touch.clientY - from.y;
      if (performance.now() - from.at > SWIPE_MS) return;
      if (Math.abs(dx) < SWIPE_X) return;
      if (Math.abs(dx) < Math.abs(dy) * SWIPE_RATIO) return;
      // 「我的」的二层页是叠加态，滑走会把没保存的编辑留在背后，先不切。
      if (document.getElementById('profile-hub')?.hidden) return;
      const index = TAB_ORDER.indexOf(currentTab());
      const next = TAB_ORDER[index + (dx < 0 ? 1 : -1)];
      if (!next) return;
      switchTab(next, true);
    }, { passive: true });
    document.addEventListener('touchcancel', () => { start = null; }, { passive: true });
  })();
/* Fragment of assets/app.js -- assembled by tools/assemble-app.ps1 in filename order.
 * Edit this file, never the generated assets/app.js; tests/app-fragments.test.mjs fails on drift. */
  installSkinPicker();
  installChatDayFilter();
  installChatFocusReveal();
switchTab(restoreTab());render();connection();syncAnchors().catch(()=>{});
  readPermissionState().then(renderPermissionChecklist).catch(()=>{});
  refreshBackupStatus().then(maybeRemindBackup).catch(()=>{});
  loadState().then(()=>{renderChat();loadPush();queryPushHistory().catch(()=>{});loadDrafts().catch(()=>{});}).catch(()=>{renderChat();loadPush();loadDrafts().catch(()=>{});});
  // A push notification opens the app with #chat (or ?tab=chat) so the user lands on today's analysis.
  (function openFromNotification(){
    const param=new URLSearchParams(location.search||'').get('tab');
    const target=param==='chat'||location.hash==='#chat'?'chat':null;
    if(!target) return;
    const run=()=>{switchTab('chat',true);const box=$('#chat-question');if(box){activeDate=localDate();box.focus({preventScroll:true});}};
    if(loaded) run(); else setTimeout(run,600);
  })();
  // Explicit settings endpoint; no key is requested, echoed, or stored in browser storage.
  refreshSettings();
})();
