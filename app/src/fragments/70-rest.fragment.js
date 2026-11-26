/* Fragment of assets/app.js -- assembled by tools/assemble-app.ps1 in filename order.
 * Edit this file, never the generated assets/app.js; tests/app-fragments.test.mjs fails on drift. */
  // ---- Unconfirmed draft box -------------------------------------------------------------------
  // A photo estimate is expensive to redo, so the preview is stored on the phone until it is either
  // confirmed or dropped. The image itself is never stored.
  let favoriteOnlyChats = false, favoriteOnlyMeals = false;
  // Long answers are clamped to one readable block; expanding is remembered per record id.
  const expandedChats = new Set();
  bindFavoriteFilter('chat-favorites-only', value => {favoriteOnlyChats = value; resetChatPaging(); renderChat();});
  bindFavoriteFilter('meal-favorites-only', value => {favoriteOnlyMeals = value; render();});
  let storedDrafts = [];
  // ---- What would be sent, shown before anything is sent ----------------------------------------


  // ---- Hub entries and sub-page navigation -------------------------------------------------------
  const APP_VERSION = '1.5.42';
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

  /** 等待动画：任何需要等模型的地方都复用它。 */
  let busyTimer = null;
  /** 等待提示：默认全局遮罩；传 target 时显示在该元素里（行内，不挡操作）。 */
  let busyButton = null;

  /** 用模型按顺序排今天的训练：需要勾选同意，失败就明确报错，不伪造计划。 */
  const AI_PLAN_KEY = date => "qingheng.aiPlan." + date;
  /**
   * 一次课的时间：每组执行约 45 秒 + 该动作的组间休息（restSecondsFor 的同一档位），
   * 有氧按它自己的时长算。以前用固定的 2.5 分钟/组，复合动作休 120~150 秒时低估近一半。
   */
  const AI_PLAN_WORK_SECONDS = 45;
  const AI_PLAN_MINUTE_STEPS = [30, 45, 60, 75, 90];

  /** 剂量由字段派生；编辑后重算，不会与旧字符串脱节。 */
  /* ── 训练强度反馈与「今天的要求」（2026-11-19，1.4.45）────────────────────
     练完点一下「太轻 / 刚好 / 有点累 / 太累」，写进当天 habit 行的 effort 字段；
     下一次排课据此降一档或加一档。用户对今天的要求写在同一张卡的折叠输入框里，
     交给模型按教练的角色判断要不要照办，并把一句原因放进第一个动作的 note。 */



  /** 皮肤：attribute + localStorage；不写进 state，避免一次换肤触发整份数据同步。 */
  const SKINS = ['paper', 'ledger', 'night'];
  const SKIN_KEY = 'qingheng.skin';
  let chatSearchTimer = 0;
  /** 输入区一聚焦，把「提问」滚进可视区：键盘弹起后按钮不会被压在键盘下面。 */

  /** 问答记录的按天浏览：日期 chip 打开原生日历，两侧箭头在「有记录的日期」之间翻页。 */


  const storageRefresh = $('#storage-refresh');
  // 1.4.68：项目主页与外链统一交给系统浏览器；WebView 内不开外站。
  const openExternalUrl = (url) => {
    if (window.QinghengNative && typeof window.QinghengNative.openExternal === 'function') {
      return window.QinghengNative.openExternal(url);
    }
    return false;
  };
  $('#open-project-page')?.addEventListener('click', () => {
    if (!openExternalUrl('https://github.com/dustSanchen/qingheng')) notice('打不开浏览器，请手动访问 github.com/dustSanchen/qingheng', true);
  });
  document.addEventListener('click', event => {
    const link = event.target && event.target.closest ? event.target.closest('a[href^="http"]') : null;
    if (!link) return;
    event.preventDefault();
    if (!openExternalUrl(link.href)) notice('打不开浏览器，请手动访问 ' + link.href, true);
  });
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
    if (!await askConfirm('将用最近一次应用内自动备份覆盖全部记录。覆盖前会把当前记录另存为底档。', {title: '从应用内备份恢复', ok: '下一步'})) return;
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
  $('#view-chat')?.addEventListener('click', event => {
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

  let mealTypeTouched = false;
  /**
   * The records page had eight cards in one column — a very long scroll where the primary action
   * (log a meal) competed with rarely-used utilities. It is now split into three segments, ordered so
   * the common action comes first in each. Layout matches what fitness apps converged on: a segmented
   * bar on top, one short screen per intent.
   */
  /** 训练概览：本周练了几次、总容量、今天蛋白放在同一屏，训练与饮食不再是两页。 */
  let lastOverviewSig = '';

  const RECORD_PANELS = [
    {key: 'food', label: '饮食', headings: ['轻松记一餐', '最近的餐食记录']},
    {key: 'training', label: '训练', headings: ['训练计划', '今日顺序', '训练日志'], trainingOnly: true},
    {key: 'body', label: '身体', headings: ['今天体重', '身体数据', '日常习惯']}
  ];
  const RECORD_PANEL_STORAGE = 'qingheng.recordsPanel';
  const TREND_PANEL_STORAGE = 'qingheng.trendsPanel';
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
    // 训练概览只属于训练段：以前它留在 .record-grid 里，饮食 / 身体两段也会看到（2026-11-23 用户要求收回训练下）。
    const overview = $('#training-overview'), logCard = $('#training-log');
    if (overview && logCard && panels.training) panels.training.insertBefore(overview, logCard);
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
    let target = RECORD_PANELS.some(panel => panel.key === key) ? key : 'food';
    // 不健身用户没有训练段：任何入口（旧链接、快捷芯片）落到 training 时都退回饮食，
    // 否则隐藏训练面板后三段一起 hidden，记录页变成一片空白。
    if (target === 'training' && !trainingEnabled()) target = 'food';
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
    // 今天两样（体重 + 睡眠）、身体数据与日常习惯都在「身体」段：漏掉 habit-sleep 会让「补睡眠」
    // 停在饮食段，输入框不可见，看起来像没跳转。
    if (['habit-sleep', 'habit-steps', 'habit-form', 'measurement-weight', 'measurement-form'].includes(id)) return 'body';
    if (['training-form', 'training-exercises'].includes(id)) return 'training';
    return 'food';
  }
  /** One jump contract shared by today's hint, quick chips and advice buttons. */
  function openRecordTarget(target, options = {}) {
    const focus = String(target || '');
    if (!focus) return;
    switchTab('records', true);
    if (focus === 'ai-plan') {
      switchRecordPanel('training');
      setTimeout(() => {
        const card = $('#ai-plan');
        if (card) {card.scrollIntoView({block: 'start', behavior: 'smooth'}); flashTarget(card);}
      }, 80);
      return;
    }
    if (focus === 'training-form') {
      switchRecordPanel('training');
      setTimeout(() => {
        const form = $('#training-form');
        if (form) {form.closest('.card')?.scrollIntoView({block: 'start', behavior: 'smooth'}); flashTarget(form.closest('.card'));}
      }, 80);
      return;
    }
    if (focus === 'meal-text' && ['breakfast', 'lunch', 'dinner', 'snack'].includes(options.mealSlot)) {
      const select = $('#estimate-form [name="mealType"]');
      if (select) select.value = options.mealSlot;
      const date = $('#estimate-form [name="date"]');
      if (date && !date.value) date.value = activeDate;
    }
    revealField(focus, {focus: false, block: 'start'});
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
  $$('[data-go]').forEach(button => {button.dataset.goBound = '1'; button.addEventListener('click', () => {switchTab(button.dataset.go, true); if (button.dataset.focus) setTimeout(() => revealField(button.dataset.focus), 60);});});
  // 运行时渲染的 [data-go]（stateBlock 操作、体检补记胶囊等）初始绑定抓不到，统一委托；
  // 初始已绑定的按钮打上 goBound 标记，避免双触发（2026-11-18）。
  document.addEventListener('click', event => {
    const action = event.target.closest?.('[data-go]');
    if (!action || action.dataset.goBound === '1') return;
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
  $('#measurement-form').addEventListener('submit', event => {
    event.preventDefault();
    const form = event.currentTarget;
    const save = () => submitForm(form, '/api/measurements', f => {
      const date = f.elements.date.value;
      const {values, cleared} = readRecordedForm(f, ['weight', 'waist', 'bodyFat', 'muscle', 'visceralFat', 'bmr']);
      if (!Object.keys(values).length) throw new Error('请至少填写一项测量数据。');
      return {...withClearedRecord(measurementRowFor(date), values, cleared), date};
    });
    const outliers = bodyOutlierLines(form);
    if (!outliers.length) { save(); return; }
    askConfirm(`和上次比，${outliers.join('、')}。数值没错就保存；若是换秤或刚运动完，改天再记更准。`, {title: '数值变化较大', ok: '确认保存'})
      .then(ok => { if (ok) save(); });
  });
  // 2026-11-22：睡眠从「今天两样」迁回这一行——步数/饮水/睡眠同属日常习惯，一次保存。
  $('#habit-form').addEventListener('submit',event=>{event.preventDefault();submitForm(event.currentTarget,'/api/habits',form=>{const {values,cleared}=readRecordedForm(form,['steps','water','sleep']);if(!Object.keys(values).length) throw new Error('请至少填写一项日常习惯。');const date=form.elements.date.value;return {...withClearedRecord(habitRowFor(date),values,cleared),date};});});
  // 组间休息从卡片底部的工具行挪到「训练动作视野内」：固定小药丸，上下滚动都看得见，
  // 键盘弹起时也随布局视口上移；只有训练日志在视野里或计时进行中才出现（2026-11-17）。
  let restTick = 0, restEnd = 0, restExercisesInView = false, restActionsInView = false, restDockWired = false;
  // 「哪一组在等」比「还剩几秒」更难看清：药丸在屏幕边上，用户不知道是第几组。
  // 所以在勾完的那一组下面挂一根 2px 的线，随休息走完而收干；线负责归属，药丸负责控制（2026-11-22）。
  let restLine = null;
  function clearRestLine() {
    if (restLine) { restLine.remove(); restLine = null; }
  }
  /**
   * 组间休息就长在那一组上：一条走完的线 + 就地倒计时（2026-11-22 第三轮）。
   * 点倒计时即取消；线滚出视野后由底部药丸接手，两处同一份 restEnd。
   */
  function attachRestLine(exerciseRow) {
    clearRestLine();
    if (!exerciseRow) return;
    const line = document.createElement('div');
    line.className = 'rest-line';
    line.innerHTML = '<span class="rest-line-bar"><span></span></span>'
      + '<button type="button" class="rest-line-label" data-rest-inline aria-label="取消休息计时"></button>';
    // 挂在动作卡底部（.set-foot 之前），不再插在具体那一组下面：一张卡只有一条。
    const foot = $('.set-foot', exerciseRow);
    if (foot) foot.before(line);
    else exerciseRow.appendChild(line);
    restLine = line;
    const fill = line.querySelector('.rest-line-bar > span');
    if (fill) fill.style.transform = 'scaleX(1)';
    line.querySelector('[data-rest-inline]')?.addEventListener('click', () => {
      clearRestLine();
      startRestTimer(false, restLength);
    });
  }
  /** 默认休息秒数（没选具体动作、直接点药丸时用）；具体动作按 restSecondsFor 决定。 */
  const REST_SECONDS = 90;
  let restLength = REST_SECONDS;
  const REST_RING_C = 2 * Math.PI * 11.5;
  /**
   * 组间休息时长按动作与目标给（证据见 docs/design/27-evidence-requirements.md）：
   * 复合/大重量 120~150s，孤立 60~90s，自重 75~90s，有氧没有组间休息。
   * 增肌与保持用长档，减脂/薄肌用短档——缺口期恢复更慢，不需要把休息拉得更长。
   */
  function restSecondsFor(name) {
    if (typeof isCardioName === 'function' && isCardioName(name)) return 0;
    const goal = (state.profile || {}).goal || '';
    const longGoal = goal === 'gain' || goal === 'maintain';
    if (typeof isCompoundMove === 'function' && isCompoundMove(name)) return longGoal ? 150 : 120;
    if (typeof isBodyweightMove === 'function' && isBodyweightMove(name)) return longGoal ? 90 : 75;
    return longGoal ? 90 : 60;
  }
  /**
   * 计时结束的提示音：两枚短促的正弦音（E6 → A6），合成器直接出，不打包音频文件。
   * WebView 的自动播放策略要求先有用户手势：解锁放在开始计时那一下（primeRestAudio），
   * 否则到点时 AudioContext 仍是 suspended，会一声不响。
   */
  let restAudio = null;
  function primeRestAudio() {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      if (!restAudio) restAudio = new Ctx();
      if (restAudio.state === 'suspended' && restAudio.resume) restAudio.resume().catch(() => {});
      return restAudio;
    } catch { return null; }
  }
  function playRestChime() {
    const ctx = primeRestAudio();
    if (!ctx) return false;
    try {
      const now = ctx.currentTime;
      const master = ctx.createGain();
      master.gain.setValueAtTime(0.0001, now);
      master.gain.exponentialRampToValueAtTime(0.35, now + 0.015);
      master.gain.exponentialRampToValueAtTime(0.0001, now + 0.62);
      master.connect(ctx.destination);
      [[1318.5, 0], [1760, 0.15]].forEach(([freq, delay]) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + delay);
        gain.gain.setValueAtTime(0.0001, now + delay);
        gain.gain.exponentialRampToValueAtTime(1, now + delay + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + 0.36);
        osc.connect(gain);
        gain.connect(master);
        osc.start(now + delay);
        osc.stop(now + delay + 0.4);
      });
      // 有振动马达就轻碰一下：健身房戴耳机时这是第二重提示。
      if (navigator.vibrate) { try { navigator.vibrate(120); } catch { } }
      return true;
    } catch { return false; }
  }
  /** 休息线是否还在视野里：在就由行内倒计时负责，药丸不重复出现。 */
  function restLineVisible() {
    if (!restLine || !restLine.isConnected) return false;
    const box = restLine.getBoundingClientRect();
    return box.bottom > 0 && box.top < window.innerHeight;
  }
  function syncRestDock() {
    const dock = $('#rest-dock');
    if (!dock) return;
    // 计时中：行内倒计时可见就收药丸，滚出视野后药丸接手（保证随时能取消）；
    // 空转时只在「正在记组」的视野里出现——滚到预设/保存按钮时不挡点击。
    const inline = restLineVisible();
    dock.classList.toggle('is-in', restTick ? !inline : (restExercisesInView && !restActionsInView));
  }
  /** 计时与药丸一起画：剩余时间、环形进度、aria-label 同源。 */
  function paintRest(left) {
    const button = $('#rest-timer');
    if (!button) return;
    const label = $('[data-rest-label]');
    const text = left > 0 ? `休息 ${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}` : `休息 ${restLength}s`;
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
      : `开始 ${restLength} 秒组间休息`);
    const ring = $('#rest-timer .rest-ring-fill');
    if (ring) ring.style.strokeDashoffset = String(REST_RING_C * Math.max(0, Math.min(1, 1 - left / Math.max(1, restLength))));
    // 同一只真源同时画那根线与行内倒计时：计时结束把线收掉，行回到常态。
    if (restLine && !restLine.isConnected) restLine = null;
    if (restLine) {
      const fill = restLine.querySelector('.rest-line-bar > span');
      if (fill) fill.style.transform = `scaleX(${Math.max(0, Math.min(1, left / Math.max(1, restLength))).toFixed(4)})`;
      const inline = restLine.querySelector('[data-rest-inline]');
      if (inline) {
        inline.textContent = left > 0
          ? `休息 ${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`
          : `休息 ${restLength}s`;
      }
      if (!left) clearRestLine();
    }
    button.dataset.left = String(left);
    syncRestDock();
  }
  /** 剩余秒数只按绝对目标时间算：切后台/锁屏期间 setInterval 会被节流甚至暂停，不能靠递减。 */
  function restLeftNow() {
    return Math.max(0, Math.ceil((restEnd - Date.now()) / 1000));
  }
  /** 一帧的绘制：校准剩余时间 → 画 → 到点收尾（清计时器、响一次）。 */
  function tickRest() {
    const left = restLeftNow();
    paintRest(left);
    if (!left) {
      if (restTick) { clearInterval(restTick); restTick = 0; }
      // 到点只响一次：先清掉计时器再播音，避免下一帧重复触发。
      playRestChime();
      return false;
    }
    return true;
  }
  /**
   * 组间休息：标记一组完成后按那个动作的时长自动开始；再点按钮取消。
   * seconds 传 0（有氧）就不计时。
   */
  function startRestTimer(restart = false, seconds = REST_SECONDS) {
    const button = $('#rest-timer');
    if (!button) return;
    const length = Math.max(0, Math.round(Number(seconds) || 0));
    if (!length) { return; }
    restLength = length;
    primeRestAudio();
    if (restTick) {
      if (!restart) { clearInterval(restTick); restTick = 0; paintRest(0); return; }
      clearInterval(restTick); restTick = 0;
    }
    restEnd = Date.now() + length * 1000;
    tickRest();
    restTick = setInterval(tickRest, 1000);
  }
  function installRestDock() {
    const exercises = $('#training-exercises');
    const actions = $('#training-form .log-actions');
    const dock = $('#rest-dock');
    if (!exercises || !actions || !dock || restDockWired) return;
    restDockWired = true;
    paintRest(0);
    // 锁屏/切后台回来：立即按绝对时间校准一次；后台期间已到期就直接收尾并补一次提示音。
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState !== 'visible' || !restTick) return;
      tickRest();
    });
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
  // 药丸是「控制」：点它要么取消、要么重开一轮，原先那根线不再代表新的计时。
  $('#rest-timer')?.addEventListener('click', () => {clearRestLine(); startRestTimer(false, restLength);});
  $('#copy-meal-buttons')?.addEventListener('click', event => {
    const button = event.target.closest?.('[data-copy-meal]');
    if (button) copyMeal(button.dataset.copyMeal).catch(error => notice(error.message, true));
  });
  // 「今天体重」（2026-11-22）：卡片只显示今天这一条，点它跳到身体数据卡的体重格——
  // 体重只留一个可编辑处，避免同一数字两套口径。
  $('#body-weight-jump')?.addEventListener('click', () => {
    revealField('measurement-weight', {focus: false, block: 'start'});
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
  $('#profile-form').addEventListener('submit',event=>{event.preventDefault();submitForm(event.currentTarget,'/api/profile',form=>{
    const values=numericForm(form,['height','age','calorieTarget','referenceCalories','proteinMin','proteinMax','fatMin','fatMax','weightTargetMin','weightTargetMax']);
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
  const MIGRATION_LABELS = {measurements: '身体', meals: '餐食', habits: '习惯', chats: '问答'};
  $('#export-data').addEventListener('click',async()=>{const button=$('#export-data'),message=$('#data-feedback');button.disabled=true;feedback(message,'正在生成备份…');let url;try{const data=await api('/api/export');data.meta=buildMigrationMeta(data);if(window.QinghengAdapter.hasNative()){if(typeof window.QinghengNative.exportJson!=='function')throw new Error('手机导出功能未连接。');window.QinghengNative.exportJson(JSON.stringify(data));await markBackedUp();feedback(message,'请选择保存位置。备份含健康记录，请妥善保管。');return;}url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const link=document.createElement('a');link.href=url;link.download=`qingheng-backup-${localDate()}.json`;document.body.append(link);link.click();link.remove();feedback(message,'备份下载已开始。文件含健康记录，请妥善保管。');setTimeout(()=>URL.revokeObjectURL(url),10000);await markBackedUp();}catch(error){feedback(message,error.message,true);}finally{button.disabled=false;}});
  $('#import-data').addEventListener('change',async event=>{const input=event.currentTarget,file=input.files[0],message=$('#data-feedback');if(!file)return;input.disabled=true;try{if(file.size>10*1024*1024)throw new Error('导入文件不能大于 10MB。');let data;try{data=JSON.parse(await file.text());}catch{throw new Error('文件不是有效 JSON，请选择轻衡备份。');}if(!data || typeof data.profile!=='object' || data.profile===null || !['measurements','meals','habits'].every(key=>Array.isArray(data[key])))throw new Error('备份必须包含 profile、measurements、meals 和 habits。');const chats=Array.isArray(data.chats)?data.chats:[];const meta=(data.meta && typeof data.meta==='object')?data.meta:null;let integrity='';
if(meta && meta.kind==='migration'){const countsOk=!meta.counts || Object.keys(MIGRATION_LABELS).every(key=>Number(meta.counts[key])===migrationCounts(data)[key]);integrity=(meta.checksum===fnv1a(migrationPayload(data)) && countsOk)?'迁移包校验一致，文件完整。':'注意：校验和不一致，文件可能被改动或不完整。';}
if(!await askConfirm(`将向手机本地导入 ${data.measurements.length} 条测量、${data.meals.length} 条餐食、${data.habits.length} 条习惯和 ${chats.length} 条问答。导入按记录 ID 合并，不会删除现有数据；建议先导出备份。${integrity?' '+integrity:''}是否继续？`,{title:'导入备份',ok:'导入'}))return;feedback(message,'正在导入…');await api('/api/import',{profile:data.profile,measurements:data.measurements,meals:data.meals,habits:data.habits,chats});try{await loadState({quiet:true});
let report='';
if(meta && meta.counts){const now=migrationCounts({measurements:state.measurements,meals:state.meals,habits:state.habits,chats:state.chats});const rows=Object.keys(MIGRATION_LABELS).map(key=>{const expect=Number(meta.counts[key]);if(!Number.isFinite(expect))return null;return `${MIGRATION_LABELS[key]} ${now[key]}/${expect}${now[key]<expect?'（少于迁移包标注）':''}`;}).filter(Boolean);const matched=Object.keys(MIGRATION_LABELS).every(key=>{const expect=Number(meta.counts[key]);return !Number.isFinite(expect)||now[key]>=expect;});if(rows.length)report='核对：'+rows.join('、')+(matched?'，与迁移包一致。':'；请抽查关键记录是否都在。');}
feedback(message,'数据已导入。'+report);
}catch{feedback(message,'导入成功，但刷新失败。请重新加载，不要重复导入。',true);}}catch(error){feedback(message,error.message,true);}finally{input.value='';input.disabled=false;}});
  window.addEventListener('offline',()=>{connection();notice('当前离线：本地记录与估算仍可用；外部 AI 暂不可用。');});
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
  const BODY_METRICS = [
    // 体重是这块卡的第一指标（2026-11-22 从「今天两样」并进来）：它排在最前，首屏就能填。
    {key: 'weight', label: '体重', unit: 'kg', digits: 1},
    {key: 'waist', label: '腰围', unit: 'cm', digits: 1},
    {key: 'bodyFat', label: '体脂率', unit: '%', digits: 1},
    {key: 'muscle', label: '肌肉量', unit: 'kg', digits: 1},
    {key: 'visceralFat', label: '内脏脂肪', unit: '级', digits: 1},
    {key: 'bmr', label: '基础代谢', unit: 'kcal', digits: 0}
  ];
  /**
   * 日常习惯（2026-11-23 四模块之四·单行化）：三行账本，名称 + 大数字 + 单位在左，−/＋ 与两枚胶囊在右。
   * 每行 = 名称 + 可直接输入的大数字 + 单位 + −/＋ 圆钮 + 两枚快捷胶囊；刻度轨道已退场（↑↓ 走键盘调值）。
   * 胶囊只留最常用的两下；改胶囊本身进卡右上「自定义快捷值」，不再占卡面。
   */
  const HABIT_QUICK_KEY = 'qingheng.habitQuick';
  // 步数/睡眠是「设值」，饮水是「每次再加多少」——两种语义分开，所以饮水这两档是 250/500 而不是总量。
  const HABIT_QUICK_FALLBACK = {steps: [6000, 10000], water: [250, 500]};
  const HABIT_DIAL = {
    steps: {label: '步数', unit: '步', min: 0, max: 200000, step: 500, digits: 0, color: 'var(--accent)',
      candidates: [4000, 6000, 8000, 10000, 12000, 15000, 20000]},
    water: {label: '饮水', unit: '毫升', min: 0, max: 20000, step: 250, digits: 0, color: 'var(--tone-water)',
      candidates: [200, 250, 300, 400, 500, 600, 750]},
    sleep: {label: '睡眠', unit: '小时', min: 0, max: 24, step: 0.5, digits: 1, color: 'var(--tone-sleep)'}
  };
  const HABIT_KEYS = ['steps', 'water', 'sleep'];
  /** Suggested questions: an empty box is the main reason people do not ask anything. */

  const runPushHistory = (useRange, button) => {
    if (button) button.disabled = true;
    return queryPushHistory(useRange).catch(error => {const box = $('#push-history'); if (box) box.textContent = error.message;}).finally(() => {if (button) button.disabled = false;});
  };
  $('#refresh-push-history').addEventListener('click', event => runPushHistory(false, event.currentTarget));
  $('#query-push-history').addEventListener('click', event => runPushHistory(true, event.currentTarget));
  // ---- Generic draft: recognise -> confirm -> write -> undo ----------------------------------------
  let pendingDraft = null, draftUndo = null;
  $('#chat-training-draft')?.addEventListener('click', async event => {
    if (event.target.closest('[data-draft-cancel]')) { pendingDraft = null; draftUndo = null; renderTrainingDraft(null); return; }
    if (event.target.closest('[data-draft-undo]')) {
      if (!draftUndo) return;
      try {
        if (draftUndo.kind === 'weight') {
          if (draftUndo.before) await api('/api/measurements', {...draftUndo.before, date: draftUndo.date});
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
    if (draft.kind === 'meal') {
      openMealDraft(draft);
      pendingDraft = null;
      renderTrainingDraft(null);
      return;
    }
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
  let editingPreferenceIndex = -1;
  const PREFERENCE_SOURCE_LABEL = {manual: '手动添加', chat: '来自问答', legacy: '旧记录'};
  renderPreferences();
  installPreferences();
  installDisclosureAnimation();
  installMealWindow();
  installRecordPanels();
  installTrendPanels();
  installProfileAutoRecalc();
  applyTrainingVisibility();
  installCardCollapse(); installTrainingAdvice(); installTrainingSheets(); installTodayAction(); installHabitChips(); installChatChips();
  /**
   * 今天页下半区（2026-11-24）：取消「今日记录 / 小习惯」分段——两段上下相接、一条发丝线分隔，
   * 记录在上、习惯在下，只有一个连续的开合动作可做（点餐次），不再有第二次切换。
   */
  setupCollapsibleSections(); installDietModule(); installHealthConnectControls(); installBodyDataControls(); installTodayMoreMenu(); restoreConsent(); installExternalConsent(); installExactAlarmControl();

