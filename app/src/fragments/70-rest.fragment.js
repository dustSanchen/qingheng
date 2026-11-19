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
    $('#undated-meals-text').textContent = `有 ${rows.length} 条餐食缺少日期，不会出现在任何一天或进入分析。请选择日期。`;
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
  const APP_VERSION = '1.4.36';
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
   * 一次课的时间：每组执行约 45 秒 + 该动作的组间休息（restSecondsFor 的同一档位），
   * 有氧按它自己的时长算。以前用固定的 2.5 分钟/组，复合动作休 120~150 秒时低估近一半。
   */
  const AI_PLAN_WORK_SECONDS = 45;
  const AI_PLAN_MINUTE_STEPS = [30, 45, 60, 75, 90];
  function planItemMinutes(item) {
    const cardio = number(item && item.durationMin);
    if (cardio !== null && cardio > 0) return cardio;
    const sets = aiPlanSets(item);
    if (!sets) return 0;
    const name = String((item && item.name) || "");
    const rest = typeof restSecondsFor === "function" ? restSecondsFor(name) : 90;
    return sets * (AI_PLAN_WORK_SECONDS + rest) / 60;
  }
  /** 整份清单的实际占用（含组间休息），向上取整到分钟。 */
  function planMinutes(items) {
    const total = (Array.isArray(items) ? items : []).reduce((sum, item) => sum + planItemMinutes(item), 0);
    return total > 0 ? Math.ceil(total) : 0;
  }
  /** 折算值收进偏好档位：写回按钮的必须是能选的档，不能给 36 分钟这种。 */
  function planMinutesStep(minutes) {
    if (!minutes) return 0;
    return AI_PLAN_MINUTE_STEPS.find(step => step >= minutes) || AI_PLAN_MINUTE_STEPS[AI_PLAN_MINUTE_STEPS.length - 1];
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
      // 自重动作的 weight 0 归一成 null：模型常把「没有配重」写成 0，别让它变成一条 0 kg 记录。
      const rawWeight = number(item.weight);
      const weight = typeof isBodyweightMove === "function" && isBodyweightMove(name) && rawWeight !== null && rawWeight <= 0 ? null : rawWeight;
      const record = {
        id: (typeof crypto !== "undefined" && crypto.randomUUID) ? crypto.randomUUID() : "ex-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8),
        name,
        sets: number(item.sets) === null ? null : number(item.sets),
        reps: number(item.reps) === null ? null : number(item.reps),
        weight
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
      // 已经进了训练记录的动作，从今日顺序里拿掉；没进记录的留着，避免清单凭空缩水。
      const addedSet = new Set(added);
      const planNow = aiPlanStore(activeDate) || [];
      const planRest = planNow.filter(row => !addedSet.has(String(row && row.name || "").trim()));
      if (planRest.length !== planNow.length) {
        aiPlanStore(activeDate, planRest);
        renderAiPlan();
        if (typeof renderAdviceOrder === "function") renderAdviceOrder();
      }
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
      box.innerHTML = '';
      const allBox = $("#ai-plan-all"); if (allBox) allBox.hidden = true;
      return;
    }
    if (tag) tag.textContent = plan.length + " 个动作";
    const allButtonEl = $("#ai-plan-all"); if (allButtonEl) allButtonEl.hidden = false;
    if (summary) {
      const prefs = typeof planPrefs === "function" ? planPrefs() : null;
      const setMinutes = Number(prefs && prefs.minutes) > 0 ? Number(prefs.minutes) : 45;
      const totalSets = plan.reduce((sum, item) => sum + aiPlanSets(item), 0);
      // 时长按实际组次 + 组间休息折算，不再用固定 2.5 分钟/组。
      const need = planMinutes(plan);
      summary.hidden = false;
      if (!need) {
        summary.textContent = "共 " + plan.length + " 个动作";
      } else if (Math.abs(need - setMinutes) >= 10) {
        // 差异够大就给一个入口，点了才弹窗，不主动打断。
        summary.innerHTML = '<span class="ai-plan-summary-text">共 ' + totalSets + " 组 · 含组间休息约需 " + need + ' 分钟</span>'
          + '<button type="button" class="text-button" data-plan-minutes="' + planMinutesStep(need) + '">改单次时长</button>';
      } else {
        summary.innerHTML = '<span class="ai-plan-summary-text">共 ' + totalSets + " 组 · 含休息约需 " + need + ' 分钟</span>'
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
  /**
   * 模型常常只给第一个动作写重量；缺重量时用该动作最近一次记录补，
   * 否则「用 AI 排今天」会出现只有杠铃卧推有 kg、其余动作空着的清单。
   */
  function baselineWeightFor(name) {
    if (typeof recentExerciseBaselines !== "function") return null;
    if (typeof isBodyweightMove === "function" && isBodyweightMove(name)) return null;
    const row = recentExerciseBaselines(14)[String(name || "").trim()];
    const kg = Number(row && row.weight);
    if (!(kg > 0)) return null;
    return typeof loadableWeightKg === "function" ? loadableWeightKg(name, kg) : kg;
  }
  function planItemFromRow(row) {
    return {
      name: String(row.name).trim().slice(0, 24),
      sets: Number(row.sets) > 0 ? Math.round(Number(row.sets)) : 0,
      reps: Number(row.reps) > 0 ? Math.round(Number(row.reps)) : 0,
      weight: (() => {
        const raw = Number(row.weight);
        const provided = Number.isFinite(raw) && raw > 0 ? raw : baselineWeightFor(row.name);
        return provided === null ? null : (typeof loadableWeightKg === "function" ? loadableWeightKg(row.name, provided) : provided);
      })(),
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
    if (!externalConsent()) { notice("请先到「我的 → 更多设置 → 数据管理」开启外部模型授权。"); return; }
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
      // 部位只有一个来源：与问答的「训练建议」共用 dayTemplateNote，别再各猜一次。
      const rotationText = typeof dayTemplateNote === "function" ? dayTemplateNote(activeDate) : "";
      const prompt = [
        "请为今天排一个按顺序执行的训练清单。",
        rotationText,
        "信息：目标=" + (GOAL_LABEL[profile.goal] || "未填") + "；体重=" + (profile.weight || "未填") + "kg；每周练=" + (prefs && prefs.days ? prefs.days : (plannedSessions() || "未填")) + "；分化=" + (prefs ? prefs.split : "未填") + "；器械=" + (prefs ? (typeof GEAR_LABELS === "object" && GEAR_LABELS[prefs.gear] ? GEAR_LABELS[prefs.gear] : prefs.gear) : "未填")
          + "；时长=" + (prefs ? prefs.minutes : 45) + " 分钟。"
          + (prefs && prefs.gear === "mixed" ? "器械不限，清单里混用杠铃、哑铃、器械与自重，不要只用一种。" : ""),
        // 目标对应的训练要求（同一份表：docs/design/27-evidence-requirements.md）
        (() => {
          const preset = typeof GOAL_PRESETS === "object" ? GOAL_PRESETS[profile.goal] : null;
          if (!preset || !preset.muscleSetsPerWeek) return "";
          return "训练要求（按目标，必须满足）：每个大肌群每周 " + preset.muscleSetsPerWeek[0] + "~" + preset.muscleSetsPerWeek[1] + " 组；每组 " + preset.reps[0] + "~" + preset.reps[1] + " 次；RIR " + preset.rir[0] + "~" + preset.rir[1] + "（离力竭留几次）；单次课的总组数装进上面的时长。";
        })(),
        // 时长必须把组间休息算进去：只数动作个数会排出一份「5 个动作、12 组、实际 30 分钟」的清单。
        "时长预算（必须满足）：先留 8 分钟热身与换器械；每个正式组按约 45 秒执行 + 组间休息（复合 120~150 秒、孤立 60~90 秒、自重 75~90 秒）折算，有氧再加它自己的时长；整份清单折算后必须落在 " + (prefs && Number(prefs.minutes) > 0 ? Number(prefs.minutes) : 45) + " 分钟以内。",
        "每个大肌群单次 6~10 个正式组；整节课总组数按覆盖的部位数与时长折算（60 分钟约 12~20 组），不要用一个数字卡死整节课。",
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
      ['icon-glyph-balance.svg', '身体', 'measurement-weight', '']
    ].filter(([, , focus]) => focus !== 'training-form' || trainingEnabled()).map(([icon, label, focus, className = '']) => `<button type="button" class="quick-chip ${className}" data-quick-focus="${focus}" data-quick-icon="${icon}"><span class="quick-chip-icon" aria-hidden="true">${iconMarkup(icon)}</span>${label}</button>`).join('');
    energyBody.after(row);
    row.addEventListener('click', event => {
      const chip = event.target.closest('[data-quick-focus]');
      if (!chip) return;
      const focus = chip.dataset.quickFocus;
      switchTab('records', true);
      switchRecordPanel(recordPanelForField(focus));
      setTimeout(() => {
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
      {key: 'weight', label: '体重', headings: ['体重变化', '身体成分对照', '身体记录明细'], foldedHeadings: ['身体记录明细']},
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
      // 未测算时没有真实区间：条形只表达「记了多少」，不画目标带、不做达标判断。
      const unset = !!range.unset;
      const scaleMax = Math.max((unset ? Math.max(kcal, 1) : range.max) * 1.08, 1);
      const percent = !recorded ? 0 : unset ? 100 : Math.max(4, Math.min(100, Math.round((kcal / scaleMax) * 100)));
      const bandLeft = unset ? 0 : Math.max(0, Math.min(100, (range.min / scaleMax) * 100));
      const bandWidth = unset ? 0 : Math.max(2, Math.min(100 - bandLeft, ((range.max - range.min) / scaleMax) * 100));
      const stateKey = unset ? 'empty' : !recorded ? 'empty' : kcal > range.max ? 'over' : kcal < range.min ? 'low' : 'in';
      // Inside the range stays green; below turns amber, above turns red as it passes the cap.
      const barColor = recorded && !unset ? dietBarColor(kcal, range.min, range.max) : 'transparent';
      const label = unset
        ? (recorded ? `${kcal} kcal，目标未测算` : '未记录，目标未测算')
        : recorded
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
      const stats = trainingStatsOf(Array.isArray(raw?.exercises) ? raw.exercises : []);
      const volume = stats.volume;
      const km = rows.reduce((sum, item) => sum + (Number(item.distanceKm) || 0), 0);
      const min = rows.reduce((sum, item) => sum + (Number(item.durationMin) || 0), 0);
      days.push({date, count: rows.length, volume, bwReps: stats.bodyweightReps, km, min});
    }
    return {
      days,
      sessions: days.filter(day => day.count > 0).length,
      totalVolume: Math.round(days.reduce((sum, day) => sum + day.volume, 0)),
      totalBwReps: Math.round(days.reduce((sum, day) => sum + day.bwReps, 0)),
      totalKm: days.reduce((sum, day) => sum + day.km, 0),
      totalMin: days.reduce((sum, day) => sum + day.min, 0)
    };
  }
  function renderTrainingOverview() {
    const grid = $('#training-overview-grid');
    if (!grid) return;
    const weekStart = shiftDay(activeDate, -((new Date(activeDate + 'T00:00:00').getDay() + 6) % 7));
    const {days, sessions, totalVolume, totalBwReps, totalKm, totalMin} = weekTrainingStats(weekStart);
    // 上周同口径的容量：说明文字给「比上周」一个真参照，而不是只列数字。
    const prevWeek = weekTrainingStats(shiftDay(weekStart, -7));
    const prevVolume = prevWeek.totalVolume, prevBwReps = prevWeek.totalBwReps;
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
    // 只有自重动作的一周没有 kg 容量：主数字换成「自重 N 次」，不留一个像没练的破折号。
    const leadLabel = grid.children[0]?.querySelector('small');
    if (leadLabel) leadLabel.textContent = totalVolume > 0 ? '本周容量' : totalBwReps > 0 ? '本周自重' : '本周容量';
    setStat(0, totalVolume > 0 ? totalVolume : totalBwReps > 0 ? totalBwReps : null,
      totalVolume > 0 ? ' kg' : totalBwReps > 0 ? ' 次' : '');
    setStat(1, sessions, ' 次');
    setStat(2, protein, protein === null
      ? (proteinMin ? '目标 ' + fmt(proteinMin, 0) + ' g' : '')
      : (proteinMin ? ' / ' + fmt(proteinMin, 0) + ' g' : ''));
    // 一根柱子只能有一种单位：整周有 kg 容量就画容量，全是自重就画次数，不混着画。
    const barMetric = totalVolume > 0 ? 'volume' : totalBwReps > 0 ? 'bw' : 'volume';
    const barValue = day => barMetric === 'bw' ? day.bwReps : day.volume;
    const peak = Math.max(1, ...days.map(barValue));
    const bars = $('#training-overview-bars');
    // 只有这一周的训练数据真的变了才重播：切 tab、存一餐都重播一遍会显得吵。
    const motionReduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    const barsSig = days.map(day => Math.round(barValue(day))).join(',') + '|' + sessions + '|' + barMetric;
    const animateBars = barsSig !== lastOverviewSig && !motionReduced;
    lastOverviewSig = barsSig;
    if (bars) {
      // 柱子只画「练了的天」，空天留一条基线；有数值的柱子头顶标数，图才读得出信息而不只是装饰。
      // 起手 0 高度、逐根 40ms 归位，让「这一周的形状」是长出来的，不是刷出来的。
      const pctOf = day => barValue(day) ? Math.max(8, Math.round(barValue(day) / peak * 100)) : 2;
      bars.innerHTML = days.map(day => '<div class="ov-bar' + (day.date === activeDate ? ' is-today' : '') + (day.count ? ' has-data' : '') + '">'
        + '<b class="ov-bar-value">' + (barValue(day) > 0 ? fmt(barValue(day), 0) : '') + '</b>'
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
        if (totalBwReps > 0) line += ' · 自重 ' + fmt(totalBwReps, 0) + ' 次';
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
        const prevText = prevVolume > 0 ? '（上周 ' + fmt(prevVolume, 0) + ' kg）' : prevBwReps > 0 ? '（上周自重 ' + fmt(prevBwReps, 0) + ' 次）' : '';
        lines.push('本周还没训练' + prevText);
      }
      // 看的是哪一天就写哪一天：切到 11-21 还写「今天」读起来就是在说错日期。
      const noteDay = typeof dayLabel === "function" ? dayLabel(activeDate) : "今天";
      lines.push(kcal === null
        ? noteDay + '还没记饮食 · <button type="button" class="text-button inline-link" data-panel-go="food">去记一餐</button>'
        : noteDay + '摄入 ' + fmt(kcal, 0) + (target ? ' / ' + fmt(target, 0) : '') + ' kcal · 蛋白 ' + fmt(protein || 0, 0) + (proteinMin ? ' / ' + fmt(proteinMin, 0) + ' g' : ' g'));
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
    {key: 'training', label: '训练', headings: ['训练概览', '训练计划', '今日顺序', '训练日志'], trainingOnly: true},
    {key: 'body', label: '身体', headings: ['今天两样', '身体数据', '日常习惯']}
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
  // 两项「更多测量」与「日常习惯」都并进当天那一行：同一天只有一行测量、一行习惯（2026-11-18）。
  // 空着的格不再写成 null，否则只改腰围会把当天的体重冲掉。
  $('#measurement-form').addEventListener('submit',event=>{event.preventDefault();submitForm(event.currentTarget,'/api/measurements',form=>{const filled=Object.fromEntries(Object.entries(numericForm(form,['waist','bodyFat','muscle','visceralFat','bmr'])).filter(([,value])=>value!==null));if(!Object.keys(filled).length) throw new Error('请至少填写一项测量数据。');return {...(measurementRowFor(form.elements.date.value)||{}), date:form.elements.date.value, ...filled};});});
  $('#habit-form').addEventListener('submit',event=>{event.preventDefault();submitForm(event.currentTarget,'/api/habits',form=>{const filled=Object.fromEntries(Object.entries(numericForm(form,['steps','water'])).filter(([,value])=>value!==null));if(!Object.keys(filled).length) throw new Error('请至少填写一项日常习惯。');return {...(habitRowFor(form.elements.date.value)||{}), date:form.elements.date.value, ...filled};});});
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
    button.dataset.left = String(left);
    syncRestDock();
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
    const paint = () => {
      const left = Math.max(0, Math.ceil((restEnd - Date.now()) / 1000));
      paintRest(left);
      if (!left) {
        clearInterval(restTick);
        restTick = 0;
        // 到点只响一次：先清掉计时器再播音，避免下一帧重复触发。
        playRestChime();
      }
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
  $('#rest-timer')?.addEventListener('click', () => startRestTimer(false, restLength));
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
      if (on) {
        // 按这一行的动作决定休息多久（复合/孤立/自重不同）；有氧行不计时。
        const row = done.closest('[data-exercise-row]');
        const name = row ? String($('[data-exercise="name"]', row)?.value || '') : '';
        startRestTimer(true, restSecondsFor(name));
      }
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
  // 记录·身体「今天两样」：体重写测量、睡眠并进习惯行，一次提交两处都落库（2026-11-18）。
  $('#body-quick-form')?.addEventListener('submit', async event => {
    event.preventDefault();
    const form = event.currentTarget, message = $('.form-feedback', form), button = $('button[type=submit]', form);
    if (button.disabled) return;
    const weight = number(form.elements.weight.value), sleep = number(form.elements.sleep.value);
    if (weight === null && sleep === null) {feedback(message, '体重和睡眠都空着，没有可保存的内容。', true); return;}
    if (weight !== null && (weight <= 0 || weight > 500)) {feedback(message, '体重请填 1–500 kg。', true); return;}
    if (sleep !== null && (sleep < 0 || sleep > 24)) {feedback(message, '睡眠请填 0–24 小时。', true); return;}
    button.disabled = true;
    feedback(message, '正在保存…');
    const saved = [];
    try {
      if (sleep !== null) {
        // 并进当天那一行：训练、饮水、训练日志都挂在同一行上，不能因为补睡眠而分裂成两行。
        await api('/api/habits', {...(habitRowFor(activeDate) || {}), date: activeDate, sleep});
        saved.push(`睡眠 ${fmt(sleep)} 小时`);
      }
      if (weight !== null) {
        // 同一天只留一行测量：带 id 就是更新，否则「身体近况」按日期取第一条会读到旧值。
        await api('/api/measurements', {...(measurementRowFor(activeDate) || {}), date: activeDate, weight});
        saved.push(`体重 ${fmt(weight)} kg`);
      }
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
    if(imageData && (!state.settings.apiConfigured || !state.settings.visionEnabled || !state.settings.visionModel)){feedback(message,'照片需要已启用的视觉模型：请到「我的 → AI 模型与密钥」填写并启用。',true);return;}
    if(imageData && !externalConsent()){feedback(message,'照片估算需要外部模型：请到「我的 → 更多设置 → 数据管理」开启授权。',true);return;}
    if(imageData && !navigator.onLine){feedback(message,'当前离线，照片无法识别；请移除照片，改用文字估算。',true);return;}
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
      const trained = trainedOn(localDate());
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
      if (!externalConsent()) {feedback(feedbackBox, '请先到「我的 → 更多设置 → 数据管理」开启外部模型授权。', true); return;}
      feedback(feedbackBox, '正在生成…');
      const button = form.querySelector('button[type="submit"]');
      if (button) button.disabled = true;
      // P0：部位与「排今天」同源。dayTemplateNote 在没有周计划时给空串，问题照原样发。
      const templateNote = typeof dayTemplateNote === 'function' ? dayTemplateNote(localDate()) : '';
      const questionWithNote = templateNote ? templateNote + '\n' + question : question;
      // 训练建议走流式，和问答页一样能看到「正在思考…」与逐字输出；不支持时退回一次性接口。
      const payload = {question: questionWithNote, focus: 'training', date: localDate(), allowExternal: true, anchors: anchorSummary(), preferences: readPreferences(), webSearch: false, logToHistory: false};
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
  /** One-tap habit values: 睡眠/体重 已归到「今天两样」，这里只留步数与饮水。 */
  function installHabitChips() {
    const row = $('#habit-chips'), form = $('#habit-form');
    if (!row || !form) return;
    const presets = [
      ['步数 6k', 'steps', 6000], ['步数 8k', 'steps', 8000], ['步数 10k', 'steps', 10000],
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
        for (const key of ['steps', 'water']) {
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
      // 带当天那行的 id 写入：否则同一天会有两行测量，「身体近况」按日期取第一条会读到旧值。
      const before = measurementRowFor(draft.date);
      await api('/api/measurements', {...(before || {}), date: draft.date, weight: draft.payload.weight});
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
    const ok = await askConfirm('将把 ' + plan.days.length + ' 次训练写入 ' + plan.startDate + ' 起的一周（每天一条训练记录），继续？', {title: '排进本周'});
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
  setupCollapsibleSections(); installQuickRecordControls(); searchFoods(); restoreConsent(); installExternalConsent(); installExactAlarmControl();
