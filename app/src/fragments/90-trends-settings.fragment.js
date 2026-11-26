/* Fragment 90-trends-settings -- 趋势与设置层（2026-11-27 Phase 3，从 70-rest 迁入）
 * 趋势面板、外观皮肤、我的页抽屉、数据管理与偏好编辑。
 */

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
        !range.unset && calorie !== null ? `训练日 ${fmt(range.trainingDay.min,0)}~${fmt(range.trainingDay.max,0)} / 休息日 ${fmt(range.restDay.min,0)}~${fmt(range.restDay.max,0)} kcal` : '目标未测算'
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
    if (about) about.textContent = `v${APP_VERSION} · 作者与许可`;
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
        + (info?.official === false
          ? '<span>非官方构建 <b>签名不符</b></span>'
          : `<span>构建 <b>${esc(info?.signature || 'Sanchen/qingheng')}</b></span>`)
        + (window.TRAINING_PRINCIPLES
          ? `<span>建议库 <b>${esc(window.TRAINING_PRINCIPLES.version)}</b> · ${window.TRAINING_PRINCIPLES.rules.length} 条 · ${window.TRAINING_PRINCIPLES.sources.length} 来源</span>`
          : '')
        + bodyPartHints();
    } catch (error) {
      box.textContent = error.message;
    }
  }

  /** 夜间是显式选择：全程账本 + 暗色令牌，不再看系统深浅色。 */
  function skinForPage(base, tab) {
    if (base === 'night') return 'ledger';
    if (base !== 'paper' && base !== 'ledger') base = 'paper';
    return base;
  }

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

  /**
   * 我的 is a list of entries, so the low-frequency block is one too: 数据管理 opens its own
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
    const appearance = $("#subpage-appearance");
    // 外观页只留「查看相关」的东西：外观皮肤 + 默认餐次。
    const anchor = $('#meal-window-card');
    const skin = $('#skin-card');
    if (appearance && skin && anchor) appearance.insertBefore(skin, anchor);
    // 重新设置档案是档案页里的一节（1.4.52 起不再单独成卡）。
    const restart = $('#targets-restart-slot');
    const restartButton = $('#restart-onboarding');
    if (restartButton && restart) restart.append(restartButton);
    const notes = $('#about-notes-slot');
    const chatNotes = $('#view-chat .card-notes');
    if (chatNotes && notes) {
      // 关于页里已经有一个「说明」，搬过来的问答说明要自己标明是哪一份。
      const summary = chatNotes.querySelector('summary');
      if (summary) summary.textContent = '问答说明';
      notes.append(chatNotes);
    }
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
      {key: 'weight', label: '体重', headings: ['体重变化', '上周回看', '身体成分对照', '身体记录明细'], foldedHeadings: ['身体记录明细']},
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
    // 2026-11-24：趋势页也记住上次看的那一段（与记录页同一条约定）。
    const savedTrend = (() => { try { return localStorage.getItem(TREND_PANEL_STORAGE); } catch { return null; } })();
    switchTrendPanel(['weight', 'diet', 'training'].includes(savedTrend) ? savedTrend : 'weight');
    bar.addEventListener('click', event => {
      const button = event.target.closest('[data-trends-panel]');
      if (button) switchTrendPanel(button.dataset.trendsPanel);
    });
  }

  function switchTrendPanel(key) {
    const wanted = ['weight', 'diet', 'training'].includes(key) ? key : 'weight';
    const target = wanted === 'training' && !trainingEnabled() ? 'weight' : wanted;
    for (const panel of ['weight', 'diet', 'training']) {
      const node = $('#trend-panel-' + panel);
      if (node) node.hidden = panel !== target;
    }
    for (const button of $$('[data-trends-panel]')) {
      const active = button.dataset.trendsPanel === target;
      button.setAttribute('aria-selected', active ? 'true' : 'false');
      button.classList.toggle('active', active);
      if (button.dataset.trendsPanel === 'training') button.hidden = !trainingEnabled();
    }
    try { localStorage.setItem(TREND_PANEL_STORAGE, target); } catch {}
    if ($('#trend-panel-training')?.hidden !== false) { /* no-op, keeps the guard explicit */ }
  }

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

  function migrationCounts(data) {
    return {measurements: (data.measurements || []).length, meals: (data.meals || []).length,
      habits: (data.habits || []).length, chats: (data.chats || []).length};
  }

  function preferenceMetaText(row) {
    const source = PREFERENCE_SOURCE_LABEL[row.source] || PREFERENCE_SOURCE_LABEL.manual;
    const date = row.updatedAt ? row.updatedAt.slice(0, 10) : '';
    return source + (date ? ' · ' + date : '');
  }

  function syncPreferenceEditor() {
    const add = $('#preference-add'), cancel = $('#preference-cancel');
    if (add) add.textContent = editingPreferenceIndex >= 0 ? '保存修改' : '记住这条';
    if (cancel) cancel.hidden = editingPreferenceIndex < 0;
  }

  function resetPreferenceEditor() {
    editingPreferenceIndex = -1;
    const input = $('#preference-input'), feedback = $('#preference-feedback');
    input?.closest('article.card')?.classList.remove('is-editing-preference');
    if (input) input.value = '';
    if (feedback) feedback.textContent = '';
    syncPreferenceEditor();
  }

  function beginPreferenceEdit(index) {
    const rows = readPreferenceRows();
    const row = rows[index];
    const input = $('#preference-input'), feedback = $('#preference-feedback');
    if (!row || !input) {resetPreferenceEditor(); return;}
    editingPreferenceIndex = index;
    input.value = row.text;
    input.closest('article.card')?.classList.add('is-editing-preference');
    if (feedback) feedback.textContent = '改完点「保存修改」。';
    syncPreferenceEditor();
    // Add scroll room first; a focused input at the page bottom otherwise hides the save row behind the keyboard.
    const align = () => input.scrollIntoView({block: 'center', behavior: 'smooth'});
    align();
    setTimeout(() => {if (document.activeElement !== input) input.focus({preventScroll: true}); align();}, 140);
    setTimeout(align, 460);
  }

  function renderPreferences() {
    const rows = readPreferenceRows();
    const box = $('#preference-list'), tag = $('#preference-count'), hub = $('#hub-summary-prefs');
    if (tag) tag.textContent = rows.length + ' 条';
    if (hub) hub.textContent = rows.length ? rows.slice(0, 2).map(row => row.text).join(' · ') + (rows.length > 2 ? '…' : '') : '让建议记住你的习惯';
    if (!box) {syncPreferenceEditor(); return;}
    box.innerHTML = rows.length
      ? rows.map((row, index) => `<div class="hub-row preference-row" role="listitem"><span class="hub-text"><span class="hub-title">${esc(row.text)}</span><span class="hub-summary">${esc(preferenceMetaText(row))}</span></span><span class="preference-row-actions"><button type="button" class="icon-button" data-preference-edit="${index}" aria-label="编辑这条偏好">改</button><button type="button" class="icon-button danger" data-preference-remove="${index}" aria-label="删除这条偏好">×</button></span></div>`).join('')
      : '<p class="empty-note">还没有偏好。写一句「不吃香菜」或「早餐固定两个鸡蛋加豆浆」，之后的估算与建议都会避开它。</p>';
    syncPreferenceEditor();
  }

  function installPreferences() {
    const add = $('#preference-add'), input = $('#preference-input'), feedback = $('#preference-feedback');
    if (!add || !input || add.dataset.bound) return;
    add.dataset.bound = '1';
    const submit = () => {
      const text = input.value.trim();
      if (!text) {feedback.textContent = '写一句再记。'; return;}
      const rows = readPreferenceRows();
      if (rows.some((row, index) => index !== editingPreferenceIndex && row.text === text)) {
        feedback.textContent = '这条已经记过了。';
        return;
      }
      if (editingPreferenceIndex >= 0) {
        if (!rows[editingPreferenceIndex]) {resetPreferenceEditor(); feedback.textContent = '这条偏好已经不在了。'; return;}
        rows[editingPreferenceIndex] = {...rows[editingPreferenceIndex], text, updatedAt: new Date().toISOString()};
        writePreferenceRows(rows);
        feedback.textContent = '已更新。';
      } else {
        if (rows.length >= 20) {feedback.textContent = '最多 20 条，先删掉旧的再记。'; return;}
        const now = new Date().toISOString();
        rows.push({id: preferenceIdFor(text), text, source: 'manual', createdAt: now, updatedAt: now});
        writePreferenceRows(rows);
        feedback.textContent = '已记住。';
      }
      editingPreferenceIndex = -1;
      input.value = '';
      input.closest('article.card')?.classList.remove('is-editing-preference');
      renderPreferences();
    };
    add.addEventListener('click', submit);
    input.addEventListener('keydown', event => {if (event.key === 'Enter') {event.preventDefault(); submit();}});
    $('#preference-cancel')?.addEventListener('click', () => {resetPreferenceEditor(); renderPreferences();});
    $('#preference-list')?.addEventListener('click', event => {
      const edit = event.target.closest('[data-preference-edit]');
      if (edit) {beginPreferenceEdit(Number(edit.dataset.preferenceEdit)); return;}
      const remove = event.target.closest('[data-preference-remove]');
      if (!remove) return;
      const index = Number(remove.dataset.preferenceRemove);
      const rows = readPreferenceRows();
      if (!rows[index]) return;
      rows.splice(index, 1);
      writePreferenceRows(rows);
      if (editingPreferenceIndex === index) resetPreferenceEditor();
      else if (editingPreferenceIndex > index) editingPreferenceIndex -= 1;
      renderPreferences();
    });
  }

  function addPreferenceFromChat(record) {
    const text = String(record?.question || record?.prompt || record?.answer || '').trim().slice(0, 80);
    if (!text) {notice('这条记录没有可记的内容。', true); return;}
    const rows = readPreferenceRows();
    if (rows.some(row => row.text === text)) {notice('这条已经记过了。'); return;}
    if (rows.length >= 20) {notice('最多 20 条，先到「我的 → 偏好与记忆」删掉旧的。', true); return;}
    const now = new Date().toISOString();
    rows.push({id: preferenceIdFor(text), text, source: 'chat', createdAt: now, updatedAt: now});
    writePreferenceRows(rows);
    renderPreferences();
    notice('已记为偏好，之后的估算与建议会带上它。');
  }
