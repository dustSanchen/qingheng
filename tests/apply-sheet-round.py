from pathlib import Path
p = Path(r'D:\AI\health-android\app\src\main\assets\app.js')
s = p.read_text(encoding='utf-8')

def rep(a, b, count=1):
    global s
    assert s.count(a) == count, (s.count(a), a[:90])
    s = s.replace(a, b)

# ---- 1. One sheet component: it replaces the platform select dialog and hosts long-press actions --
rep("""  function connection() {""",
"""  // ---- Bottom sheet ---------------------------------------------------------------------------
  // The platform draws <select> as a plain white dialog with system radio buttons, which clashes
  // with this app, and a long-press needs a place for its actions. Both use one sheet built from
  // the app's own tokens: same radii, same mint accents, same list rows.
  let sheetResolve = null;
  function sheetOpen() {const root = $('#action-sheet'); return !!root && !root.hidden;}
  function openSheet(config) {
    const root = $('#action-sheet');
    if (!root) return Promise.resolve(null);
    if (sheetResolve) {const previous = sheetResolve; sheetResolve = null; previous(null);}
    $('#action-sheet-title').textContent = config?.title || '';
    $('#action-sheet-list').innerHTML = (config?.options || []).map((option, index) =>
      `<button type="button" class="sheet-option${option.current ? ' is-current' : ''}${option.danger ? ' is-danger' : ''}" data-sheet-index="${index}" role="menuitem">`
      + `<span class="sheet-option-icon" aria-hidden="true">${option.icon ? `<img src="./${option.icon}" alt="" width="19" height="19">` : ''}</span>`
      + `<span class="sheet-option-label">${esc(option.label)}</span>`
      + `${option.current ? '<span class="inline-icon" aria-hidden="true"><img src="./icon-check.svg" alt="" width="18" height="18"></span>' : ''}</button>`).join('');
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
  /** Hands the row over to the platform's own selection handles, which is what "选择文字" means here. */
  function selectRowText(row) {
    try {
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
  const chatRecordText = row => `问：${row.question || ''}\\n答：${row.answer || ''}\\n（${row.date || ''}）`;
  const mealRecordText = row => {
    const parts = [row.name || '未命名餐食', row.date || '', clockPattern.test(String(row.mealTime || '')) ? row.mealTime : '', mealNames[row.mealType] || '']
      .filter(Boolean).join(' · ');
    return `${parts}\\n热量 ${fmt(row.calories, 0)} kcal · 蛋白 ${fmt(row.protein)}g · 脂肪 ${fmt(row.fat)}g · 碳水 ${fmt(row.carbs)}g`;
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
    pressTimer = setTimeout(() => {pressTimer = null; if (!pressMoved && pressRow) showRowActions(pressRow).catch(() => {});}, LONG_PRESS_MS);
  }, {passive: true});
  document.addEventListener('touchmove', () => {pressMoved = true; cancelPress();}, {passive: true});
  ['touchend', 'touchcancel'].forEach(type => document.addEventListener(type, () => cancelPress(), {passive: true}));
  // Long-pressing a link or a selection would otherwise show the browser's own menu.
  document.addEventListener('contextmenu', event => {
    const row = event.target.closest?.('[data-long-press]');
    if (!row) return;
    event.preventDefault();
    showRowActions(row).catch(() => {});
  });

  function connection() {""")

# ---- 2. Rows become long-pressable and show a favourite badge ----------------------------------
rep("""      return `<div class="meal-row list-row" role="listitem"><div class="row-body"><div class="row-head"><strong>${esc(meal.name || '未命名餐食')}</strong>`
        + `${type ? `<span class="row-tag">${type}</span>` : ''}</div>`""",
"""      return `<div class="meal-row list-row" role="listitem" data-long-press="meal:${esc(meal.id ?? '')}"><div class="row-body"><div class="row-head"><strong>${esc(meal.name || '未命名餐食')}</strong>`
        + `${meal.favorite === true ? '<span class="fav-badge" aria-label="已收藏"><span class="inline-icon" aria-hidden="true"><img src="./icon-bookmark.svg" alt="" width="14" height="14"></span></span>' : ''}`
        + `${type ? `<span class="row-tag">${type}</span>` : ''}</div>`""")

rep("""    if (log) log.innerHTML = chats.length ? [...chats].reverse().map(row => `<div class="meal-row list-row" role="listitem"><div class="row-body"><div class="row-head"><strong>${esc(row.question || "")}</strong></div>""",
"""    const shown = favoriteOnlyChats ? chats.filter(row => row.favorite === true) : chats;
    if (log) log.innerHTML = shown.length ? [...shown].reverse().map(row => `<div class="meal-row list-row" role="listitem" data-long-press="chat:${esc(row.id ?? '')}"><div class="row-body"><div class="row-head"><strong>${esc(row.question || "")}</strong>`
      + `${row.favorite === true ? '<span class="fav-badge" aria-label="已收藏"><span class="inline-icon" aria-hidden="true"><img src="./icon-bookmark.svg" alt="" width="14" height="14"></span></span>' : ''}</div>""")

rep(""" : empty("还没有问答记录。有疑问时，问一句。");""",
""" : empty(favoriteOnlyChats ? '还没有收藏的问答记录。长按一条记录即可收藏。' : "还没有问答记录。有疑问时，问一句。");""")

# ---- 3. The records list respects the favourite filter -----------------------------------------
rep("""    renderMeals($('#today-meals'),meals,false); renderMeals($('#record-meals'),[...state.meals].sort((a,b) => String(b.date).localeCompare(String(a.date))).slice(0,30),true);""",
"""    const recordMeals=[...state.meals].sort((a,b) => String(b.date).localeCompare(String(a.date)));
    renderMeals($('#today-meals'),meals,false);
    renderMeals($('#record-meals'),(favoriteOnlyMeals?recordMeals.filter(row => row.favorite === true):recordMeals).slice(0,30),true);""")

# ---- 4. Filters and their buttons --------------------------------------------------------------
rep("""  let storedDrafts = [];""",
"""  let favoriteOnlyChats = false, favoriteOnlyMeals = false;
  function bindFavoriteFilter(buttonId, apply) {
    const button = $('#' + buttonId);
    if (!button) return;
    button.addEventListener('click', () => {
      const next = button.getAttribute('aria-pressed') !== 'true';
      button.setAttribute('aria-pressed', next ? 'true' : 'false');
      apply(next);
    });
  }
  bindFavoriteFilter('chat-favorites-only', value => {favoriteOnlyChats = value; renderChat();});
  bindFavoriteFilter('meal-favorites-only', value => {favoriteOnlyMeals = value; render();});
  let storedDrafts = [];""")

p.write_text(s, encoding='utf-8')
print('app.js patched: sheet component, custom dropdown, long-press actions, favourites, selection')
