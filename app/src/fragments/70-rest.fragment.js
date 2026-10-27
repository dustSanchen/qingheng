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
    return rows.map(row => {const item={};$$('[data-item-field]',row).forEach(input=>{if(validate && !input.reportValidity()) throw new Error('请补全食物名称并填写有效的非负数值。');item[input.dataset.itemField]=input.dataset.itemField==='name'?input.value.trim():number(input.value);});if(validate && !item.name) {markFieldInvalid($('[data-item-field="name"]', row), '请填写食物名称。'); throw new Error('请填写食物名称。');}return item;});
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
    const oil = number(draft?.oilGrams) ?? 0;
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
      const savedDate=draft.date; activeDate=savedDate; $('#active-date').value=savedDate;
       draft=null;$('#estimate-preview').hidden=true;$('#estimate-form').reset();setDefaultDates();clearImage();feedback($('#estimate-feedback'),`餐食已确认保存到 ${savedDate}，已切换到该日汇总。`);
      try {await loadState({quiet:true});} catch {feedback($('#estimate-feedback'),'已保存，但刷新失败。请重新加载检查记录，不要再次估算保存。',true);}
      loadDrafts().catch(() => {});
    } catch(error) {feedback(message,error.message,true);} finally {savingDraft=false;button.disabled=false;$('#cancel-estimate').disabled=false;}
  }
  function setActiveDate(value) {
    if(!validDate(value)) return false;
    activeDate=value; $('#active-date').value=value; setDefaultDates(); render();
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
  const APP_VERSION = '1.1.63';
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
      const training = number(profile.training);
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
      const provider = settings.provider === 'bai' ? 'B.AI' : 'DeepSeek';
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
      const items = hits.map(rule => '<p>' + esc(rule.claim.split('；')[0]) + (rule.evidence ? '<small> · 口述 ' + esc(rule.evidence.at) + '</small>' : '') + '</p>').join('');
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
    if (target) {
      const node = document.getElementById(target);
      if (node) { node.hidden = false; const t2 = node.querySelector(".inline-busy-text"); if (t2) t2.textContent = label; }
    } else {
      const layer = $("#busy-layer"), l2 = $("#busy-text");
      if (l2) l2.textContent = label;
      if (layer) layer.hidden = false;
    }
    // 兜底：任何异常都不该让等待提示常驻。
    busyTimer = setTimeout(() => hideBusy(), 25000);
  }
  function hideBusy() {
    markBusyButton(false);
    if (busyTimer) { clearTimeout(busyTimer); busyTimer = null; }
    const layer = $("#busy-layer"); if (layer) layer.hidden = true;
    const inline = document.getElementById("estimate-busy"); if (inline) inline.hidden = true;
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
      current.push({
        name,
        sets: number(item.sets) === null ? null : number(item.sets),
        reps: number(item.reps) === null ? null : number(item.reps),
        weight: number(item.weight) === null ? null : number(item.weight)
      });
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
    if (!box) return;
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
  }
  /** 一行一个动作；编辑态把名称、组、次、负重换成输入框。 */
  function aiPlanRowHtml(item, index, editing) {
    if (!editing) {
      return "<div class=\"ai-plan-row\" role=\"listitem\"><label class=\"ai-plan-main\"><input type=\"checkbox\" data-ai-done=\"" + index + "\"" + (item.done ? " checked" : "") + "><span class=\"ai-plan-name\">" + esc(item.name) + "</span><span class=\"ai-plan-dose\">" + esc(aiPlanDose(item)) + "</span></label><button type=\"button\" class=\"ai-plan-add\" data-ai-add=\"" + index + "\" aria-label=\"\u52a0\u5165\u4eca\u5929\u7684\u8bad\u7ec3\u8bb0\u5f55\">\u52a0\u5165</button></div>";
    }
    const num = (name, value, attrs) => "<input class=\"ai-plan-input\" data-ai-field=\"" + name + "\" type=\"number\" " + attrs + " value=\"" + (value == null ? "" : value) + "\" aria-label=\"" + name + "\">";
    return "<div class=\"ai-plan-row is-editing\" role=\"listitem\" data-ai-row=\"" + index + "\">"
      + "<span class=\"ai-plan-no\">" + (index + 1) + "</span>"
      + "<input class=\"ai-plan-input is-name\" data-ai-field=\"name\" maxlength=\"24\" value=\"" + esc(item.name) + "\" aria-label=\"动作名\">"
      + "<button type=\"button\" class=\"ai-plan-remove\" data-ai-remove=\"" + index + "\" aria-label=\"删除这个动作\">×</button>"
      + "<div class=\"ai-plan-nums\">" + num("sets", item.sets, 'min=\"0\" max=\"30\" step=\"1\"') + "<span>组</span>"
      + num("reps", item.reps, 'min=\"0\" max=\"200\" step=\"1\"') + "<span>次</span>"
      + num("weight", item.weight, 'min=\"0\" max=\"500\" step=\"0.5\"') + "<span>kg</span></div>"
      + "</div>";
  }
  function renderAiPlan() {
    const box = $("#ai-plan-list"), tag = $("#ai-plan-tag"), clear = $("#ai-plan-clear"), summary = $("#ai-plan-summary");
    if (!box) return;
    const plan = aiPlanStore(activeDate);
    if (clear) clear.hidden = !plan;
    const edit = $("#ai-plan-edit");
    if (edit) edit.hidden = !(plan && plan.length);
    if (!plan || !plan.length) {
      if (tag) tag.textContent = "未生成";
      if (summary) { summary.hidden = true; summary.textContent = ""; }
      box.innerHTML = '<p class="muted">还没有生成顺序。勾选同意后点「用 AI 排今天」。</p>';
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
          + '<button type="button" class="text-button" data-plan-minutes="' + need + '">改成 ' + need + ' 分钟</button>';
      } else {
        summary.innerHTML = '<span class="ai-plan-summary-text">共 ' + totalSets + " 组 · 约需 " + need + ' 分钟</span>'
          + '<span class="ai-plan-summary-note">你设的是 ' + setMinutes + ' 分钟</span>';
      }
    }
    box.innerHTML = plan.map((item, index) =>
      aiPlanRowHtml(item, index, box.classList.contains("editing"))
    ).join("");
  }
  async function askAiPlan(button) {
    const consent = $("#ai-plan-consent");
    if (!consent || !consent.checked) { notice("先勾选同意，才会把今天的数据发给模型。"); return; }
    const prefs = typeof planPrefs === "function" ? planPrefs() : null;
    const profile = state.profile || {};
    const done = exercisesFor(activeDate).filter(item => item && item.name).map(item => item.name + " " + (item.sets || "") + "x" + (item.reps || ""));
    const prompt = [
      "你是力量训练教练。请为今天排一个按顺序执行的训练清单。",
      "信息：目标=" + (profile.goal || "未填") + "；体重=" + (profile.weight || "未填") + "kg；每周练=" + (prefs ? prefs.days : (profile.training || "未填")) + "；分化=" + (prefs ? prefs.split : "未填") + "；器械=" + (prefs ? (typeof GEAR_LABELS === "object" && GEAR_LABELS[prefs.gear] ? GEAR_LABELS[prefs.gear] : prefs.gear) : "未填")
        + "；时长=" + (prefs ? prefs.minutes : 45) + " 分钟。"
        + (prefs && prefs.gear === "mixed" ? "器械不限：请在同一份清单里混用杠铃、哑铃、固定器械与自重，不要全部用同一种器械。" : ""),
      done.length ? ("今天已记录：" + done.join("；") + "。") : "今天还没有训练记录。",
      "只输出 JSON 数组，不要解释。每项形如 {\"name\": \"动作名\", \"sets\": 4, \"reps\": 8, \"weight\": 40}，weight 可省略。按执行顺序排列，6 个动作以内。"
    ].join("\n");
    button.disabled = true;
    const original = button.textContent;
    button.textContent = "正在排…";
    showBusy("正在排今天的动作顺序…");
    try {
      const data = await api("/api/chat", {question: prompt, date: activeDate, webSearch: false, tier: "fast", allowExternal: true, logToHistory: false});
      const reply = String(data && data.reply ? data.reply : "");
      const start = reply.indexOf("[");
      const end = reply.lastIndexOf("]");
      if (start < 0 || end <= start) throw new Error("模型没有返回 JSON 清单，请重试。");
      const rows = JSON.parse(reply.slice(start, end + 1));
      if (!Array.isArray(rows) || !rows.length) throw new Error("清单为空，请重试。");
      const plan = rows.filter(row => row && row.name).map(row => ({
        name: String(row.name).slice(0, 24),
        sets: Number(row.sets) > 0 ? Number(row.sets) : 0,
        reps: Number(row.reps) > 0 ? Number(row.reps) : 0,
        weight: Number(row.weight) > 0 ? Number(row.weight) : null,
        done: false
      }));
      aiPlanStore(activeDate, plan);
      renderAiPlan();
      notice("已按顺序排好今天的 " + plan.length + " 个动作。");
    } catch (error) {
      notice("排训练顺序失败：" + (error && error.message ? error.message : "未知错误"));
    } finally {
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
    if (clear) clear.addEventListener("click", () => { aiPlanStore(activeDate, []); renderAiPlan(); });
    const edit = $("#ai-plan-edit");
    if (list && !list.dataset.aiRemoveWired) {
      list.dataset.aiRemoveWired = "data-ai-remove-wired";
      list.addEventListener("click", event => {
        const addButton = event.target.closest("[data-ai-add]");
        if (addButton) {
          event.preventDefault();
          const plan = aiPlanStore(activeDate) || [];
          const item = plan[Number(addButton.dataset.aiAdd)];
          if (item) addExercisesToToday([item]).catch(() => {});
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
        notice("已移除「" + row.querySelector(".ai-plan-name")?.textContent + "」。");
      });
    }
    if (edit && !edit.dataset.editWired) {
      edit.dataset.editWired = "1";
      edit.addEventListener("click", () => {
        const box = $("#ai-plan-list");
        if (!box) return;
        if (box.classList.contains("editing")) {
          collectAiPlanEdits();
          box.classList.remove("editing");
          edit.textContent = "修改";
          notice("已保存修改。");
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
  const SKINS = ['paper', 'ledger', 'auto'];
  const DATA_PAGES = ['trends'];
  /** 系统是否处于深色；取不到时按浅色处理。 */
  function darkScheme() {
    try { return window.matchMedia('(prefers-color-scheme: dark)').matches === true; } catch (error) { return false; }
  }
  /** 自动模式：深色系统全程用账本（纸感没有暗色变体）；浅色时趋势页用 ledger，其余用 paper。 */
  function skinForPage(base, tab) {
    if (base !== 'auto') return SKINS.includes(base) ? base : 'paper';
    if (darkScheme()) return 'ledger';
    return DATA_PAGES.includes(tab) ? 'ledger' : 'paper';
  }
  const SKIN_KEY = 'qingheng.skin';
  function currentSkin() {
    // 默认「自动」：系统深色时全程账本（夜间模式开箱即用），浅色时趋势页账本、其余纸感。
    try { const saved = localStorage.getItem(SKIN_KEY); return SKINS.includes(saved) ? saved : 'auto'; }
    catch (error) { return 'auto'; }
  }
  function applySkin(name, persist = true) {
    const choice = SKINS.includes(name) ? name : 'paper';
    const skin = skinForPage(choice, document.documentElement.dataset.tab || 'today');
    document.documentElement.dataset.skin = skin;
    document.documentElement.dataset.skinChoice = choice;
    // 持久化用户的选择本身（含 auto），而不是解析结果；否则自动模式在下次启动就退化了。
    if (persist) { try { localStorage.setItem(SKIN_KEY, choice); } catch (error) {} }
    const tag = $('#skin-tag'); if (tag) tag.textContent = choice === 'auto' ? '自动 · ' + skin : skin;
    // 系统状态栏颜色跟随皮肤：账本深色用暗底，其余保持浅绿。
    const theme = document.querySelector('meta[name="theme-color"]');
    if (theme) theme.setAttribute('content', skin === 'ledger' && darkScheme() ? '#141719' : '#eaf4ed');
    for (const button of $$('[data-skin-pick]')) button.setAttribute('aria-pressed', String(button.dataset.skinPick === choice));
    return skin;
  }
  let chatSearchTimer = 0;
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
    if (typeof installAiPlan === "function") installAiPlan();
    if (typeof installSegmentKeys === "function") installSegmentKeys();
    if (typeof installPhotoEntry === "function") installPhotoEntry();
    if (typeof renderDayStream === "function") renderDayStream();
    applySkin(currentSkin(), false);
    // 系统深浅色翻转时按同一选择重算皮肤；旧的 addEventListener 不存在时静默跳过。
    try {
      const media = window.matchMedia('(prefers-color-scheme: dark)');
      if (media && typeof media.addEventListener === 'function') media.addEventListener('change', () => applySkin(currentSkin(), false));
    } catch (error) { }
    for (const button of $$('[data-skin-pick]')) {
      button.addEventListener('click', () => { applySkin(button.dataset.skinPick); notice('外观已切换为「' + ({paper: '纸感', ledger: '账本', auto: '自动'}[button.dataset.skinPick] || '纸感') + '」。'); });
    }
  }

  /** 把今天发生的事按时间排成一条流水：餐食、训练、体重/睡眠。 */
  function renderDayStream() {
    const box = $("#day-stream");
    if (!box) return;
    const day = activeDate;
    const events = [];
    for (const meal of (Array.isArray(state.meals) ? state.meals : []).filter(row => row && row.date === day)) {
      events.push({time: String(meal.mealTime || ""), sort: meal.mealTime ? 0 : 1, kind: "餐食", text: (meal.name || "一餐") + " · " + Math.round(Number(meal.calories) || 0) + " kcal"});
    }
    const habit = (Array.isArray(state.habits) ? state.habits : []).find(row => row && row.date === day) || {};
    if (habit.training === true || habit.training === "true") {
      const count = Array.isArray(habit.exercises) ? habit.exercises.length : 0;
      events.push({time: "", sort: 2, kind: "训练", text: count ? count + " 个动作" : "已标记训练"});
    }
    if (Number(habit.sleep) > 0) events.push({time: "", sort: 3, kind: "睡眠", text: Number(habit.sleep) + " 小时"});
    if (Number(habit.weight) > 0) events.push({time: "", sort: 3, kind: "体重", text: Number(habit.weight) + " kg"});
    events.sort((a, b) => a.sort - b.sort || String(a.time).localeCompare(String(b.time)));
    const tag = $("#day-stream-tag");
    if (tag) tag.textContent = events.length ? events.length + " 条" : "暂无";
    box.innerHTML = events.length
      ? events.map(item => "<div class=\"meal-row list-row\" role=\"listitem\"><div class=\"row-body\"><div class=\"row-head\"><strong>" + esc(item.time || "未填时间") + "</strong><span class=\"row-tag\">" + esc(item.kind) + "</span></div><p class=\"muted\">" + esc(item.text) + "</p></div></div>").join("")
      : empty("今天还没有记录", "记一餐、一次训练，流水就会长出来。");
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
  $('#chat-date').addEventListener('change',event=>{if(!setActiveDate(event.target.value)) event.target.value=activeDate;});
  document.addEventListener('click', event => {
    const more = event.target.closest('[data-chat-more]');
    if (more) {event.preventDefault(); showEarlierChats(); return;}
    const again = event.target.closest('[data-chat-again]');
    if (again) {event.preventDefault(); regenerateChat(again.dataset.chatAgain).catch(error => notice(error.message, true)); return;}
    const unhelpful = event.target.closest('[data-chat-unhelpful]');
    if (unhelpful) {event.preventDefault(); markUnhelpful(unhelpful.dataset.chatUnhelpful); return;}
    const toggle = event.target.closest('[data-chat-toggle]');
    if (!toggle) return;
    const id = toggle.dataset.chatToggle;
    if (expandedChats.has(id)) expandedChats.delete(id); else expandedChats.add(id);
    renderChat();
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
  /**
   * Four chips at the top of today: the actions people actually take every day, one tap away instead of
   * a scroll hunt. Each chip routes to the right segment and focuses the field.
   */
  function installTodayQuickActions() {
    const view = $('#view-today');
    if (!view || $('#today-quick-actions')) return;
    const heading = $('.page-heading', view);
    if (!heading) return;
    const row = document.createElement('div');
    row.className = 'quick-actions';
    row.id = 'today-quick-actions';
    row.setAttribute('role', 'group');
    row.setAttribute('aria-label', '今日快捷操作');
    row.innerHTML = [
      ['icon-meal.svg', '记一餐', 'meal-text'],
      ['icon-training.svg', '记训练', 'training-form'],
      ['icon-weight.svg', '记体重', 'measurement-weight'],
      ['icon-camera-flat.svg', '拍照', 'photo']
    ].map(([icon, label, focus]) => `<button type="button" class="quick-chip" data-quick-focus="${focus}" data-quick-icon="${icon}"><span class="quick-chip-icon" aria-hidden="true">${iconMarkup(icon)}</span>${label}</button>`).join('');
    heading.after(row);
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
      {key: 'weight', label: '体重', headings: ['体重变化', '身体成分对照', '身体记录明细']},
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
      for (const heading of panel.headings) {
        const card = cardFor(heading);
        if (card) container.append(card);
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
  const RECORD_PANELS = [
    {key: 'food', label: '饮食', headings: ['轻松记一餐', '复制一餐', '最近的餐食记录', '食品热量参考库', '手动记录餐食']},
    {key: 'training', label: '训练', headings: ['训练计划', '下周计划', '训练日志'], trainingOnly: true},
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
      for (const heading of panel.headings) {
        const card = cardFor(heading);
        if (card) container.append(card);
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
  window.addEventListener('hashchange',()=>{const {tab,sub}=parseHash();switchTab(tab||'today',false,sub);});
  $('#trend-range').addEventListener('change',renderTrends);$('#refresh-advice').addEventListener('click',refreshAdvice);
  $('#measurement-form').addEventListener('submit',event=>{event.preventDefault();submitForm(event.currentTarget,'/api/measurements',form=>{const values=numericForm(form,['weight','waist','bodyFat','muscle','visceralFat','bmr']);if(Object.values(values).every(value=>value===null)) throw new Error('请至少填写一项测量数据。');return {date:form.elements.date.value,...values};});});
  $('#habit-form').addEventListener('submit',event=>{event.preventDefault();submitForm(event.currentTarget,'/api/habits',form=>{const values=numericForm(form,['steps','sleep','water']);const training=form.elements.training.value===''?null:form.elements.training.value==='true';if(training===null && Object.values(values).every(value=>value===null)) throw new Error('请至少填写一项日常习惯。');return {date:form.elements.date.value,training,...values};});});
  $('#training-add')?.addEventListener('click', () => {
    const box = $('#training-exercises');
    const index = box.querySelectorAll('[data-exercise-row]').length;
    if (index >= 12) {notice('一次最多记录 12 个动作。', true); return;}
    const row = document.createElement('div');
    row.className = 'training-row';
    row.dataset.exerciseRow = String(index);
    row.innerHTML = '<label>动作<input data-exercise="name" maxlength="60" placeholder="例如 深蹲"></label><div class="form-grid"><label>组数<input data-exercise="sets" type="number" min="0" max="30" step="1"></label><label>每组次数<input data-exercise="reps" type="number" min="0" max="200" step="1"></label><label>负重 · kg<input data-exercise="weight" type="number" min="0" max="500" step="0.5"></label></div><div class="row-meta"><span>容量 —</span><button type="button" class="icon-button danger" data-exercise-remove="${index}" aria-label="移除这个动作">×</button></div>';
    box.append(row);
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
      : `已添加 ${name}，填写组数、次数与负重后保存。`);
    $('[data-exercise="sets"]', row)?.focus();
  });
  $('#training-template')?.addEventListener('change', () => renderTrainingPresets());
  $('#training-exercises')?.addEventListener('click', event => {
    const button = event.target.closest?.('[data-exercise-remove]');
    if (!button) return;
    button.closest('[data-exercise-row]')?.remove();
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
    // goal / training / 口径 used to be dropped here, so a saved profile silently kept the old values.
    const rawTraining=form.elements.training.value;
    const training=rawTraining==='none' ? 'none' : (rawTraining==='' ? null : number(rawTraining));
    const goal=form.elements.goal.value;
    const payload={sex:form.elements.sex.value,goal,...values,...ruleOverridesFrom(form)};
    if(training!==null) payload.training=training;
    if(goal==='lean' && !(state.profile && state.profile.leanPhaseStartedAt)) payload.leanPhaseStartedAt=localDate();
    return payload;
  });});
  $('#settings-form').addEventListener('submit',event=>{event.preventDefault();submitForm(event.currentTarget,'/api/settings',form=>{const provider=form.elements.provider.value,baseUrl=form.elements.baseUrl.value.trim(),model=form.elements.model.value.trim(),visionModel=form.elements.visionModel.value.trim(),visionEnabled=form.elements.visionEnabled.checked,key=form.elements.apiKey.value.trim(),clear=form.elements.clearKey.checked;if(key && clear)throw new Error('请不要同时填写新密钥并清除密钥。');if(key && !window.QinghengAdapter.hasNative()){form.elements.apiKey.value='';throw new Error('浏览器演示不保存 API Key；请在 APK 中配置。');}if(!/^https:\/\//i.test(baseUrl))throw new Error('API 地址必须使用 https://。');if(visionEnabled && !visionModel)throw new Error('启用图片需要填写已验证支持图片的视觉模型。');return {provider,baseUrl,model,visionModel,visionEnabled,allowExternal:form.elements.allowExternal.checked,...(key?{apiKey:key}:{}),...(clear?{clearKey:true}:{})};});});
  $('#meal-image').addEventListener('change',async event=>{const file=event.target.files[0];if(!file){feedback($('#estimate-feedback'),'没有选择照片，原来的内容没动。');return;}const revision=++imageVersion;imageData=null;imageBusy=true;feedback($('#estimate-feedback'),'正在本地压缩图片…');try{const result=await compressImage(file);if(revision!==imageVersion)return;imageData=result;mealPhotoMeta=photoMeta(null);showPhotoTime('meal',mealPhotoMeta);$('#meal-image-preview').src=result;$('#image-preview').hidden=false;feedback($('#estimate-feedback'),'图片已压缩为 JPEG，原始元数据不会上传。');}catch(error){if(revision===imageVersion){clearImage();feedback($('#estimate-feedback'),error.message,true);}}finally{if(revision===imageVersion)imageBusy=false;}});
  $('#remove-image').addEventListener('click',clearImage);
  $('#estimate-form').addEventListener('submit',async event=>{
    event.preventDefault();const form=event.currentTarget,button=$('button[type=submit]',form),message=$('#estimate-feedback');if(estimateBusy || savingDraft || !form.reportValidity())return;
    if(imageBusy){feedback(message,'图片仍在压缩，请稍等。',true);return;}
    if(!loaded || !settingsKnown){feedback(message,'尚未加载手机模型配置，请重新打开应用后再估算。',true);return;}
    if(imageData && (!state.settings.apiConfigured || !state.settings.visionEnabled || !state.settings.visionModel)){feedback(message,'照片需要已启用的视觉模型：DeepSeek 请使用 deepseek-flash，B.AI 请填写其支持图片的模型。',true);return;}
    if(imageData && !$('#estimate-consent').hidden && !$('#estimate-consent').checked){feedback(message,'照片外部估算前，请先勾选本次数据发送同意。',true);$('#estimate-consent').focus();return;}
    if(imageData && !navigator.onLine){feedback(message,'当前离线，照片无法识别；请移除照片并用明确克重文字做本地估算。',true);return;}
    const text=form.elements.text.value.trim();if(!text && !imageData){feedback(message,'请描述餐食或添加一张图片。',true);return;}
    if(draft && !await askConfirm('新估算会替换当前未保存的预览，继续吗？', {title:'替换预览'}))return;
    const submittedForm={elements:{date:{value:form.elements.date.value},mealType:{value:form.elements.mealType.value}},
      text, photo:photoMeta(imageData?mealPhotoMeta:null)};
    estimateBusy=true;button.disabled=true;feedback(message,'正在生成预览，不会自动保存…');
if (typeof showBusy === 'function') showBusy('正在计算热量…', 'estimate-busy');
    try {const data=await api('/api/estimate',{text,allowExternal:$('#estimate-consent').checked && navigator.onLine,anchors:anchorSummary(),...(imageData?{image:imageData}:{})});previewDraft(data,submittedForm);feedback(message,'估算完成。请在下方修改并确认，才会保存。');}
    catch(error){feedback(message,error.message,true);}finally{estimateBusy=false;button.disabled=false;if(typeof hideBusy==='function')hideBusy();if($('#estimate-consent').checked)acceptConsent('estimate');}
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
  $('#item-recalc-form').addEventListener('submit',event=>{
    event.preventDefault();
    const root=$('#item-recalc-dialog'),rows=$$('.estimate-item'),row=rows[Number(root.dataset.itemIndex)],message=$('#item-recalc-feedback');
    if(!row){message.textContent='找不到对应食品，请关闭后重试。';return;}
    const grams=number($('#item-recalc-grams').value);
    if(grams===null||grams<=0){message.textContent='请输入大于 0 的克重。';return;}
    const per100=Object.fromEntries(nutritionKeys.map(key=>[key,number($(`#item-recalc-${key}`).value)]));
    const filled=nutritionKeys.filter(key=>per100[key]!==null);
    if(filled.length && filled.length!==nutritionKeys.length){message.textContent='每 100g 的热量、蛋白质、脂肪和碳水要一起填写，或全部留空。';return;}
    if(filled.some(key=>per100[key]<0)){message.textContent='每 100g 营养值不能为负数。';return;}
    $('[data-item-field="grams"]',row).value=grams;
    if(filled.length===nutritionKeys.length) {
      for(const key of nutritionKeys){const value=nutritionPrecision(per100[key]*grams/100);$(`[data-item-field="${key}"]`,row).value=value;}
    } else scaleEstimateItem(row,grams);
    row.dataset.baseGrams=grams;
    for(const key of nutritionKeys){const input=$(`[data-item-field="${key}"]`,row);input.dataset.baseValue=number(input.value);}
    updatePreviewTotals();
    feedback(message,'已按新的克重重算这项食品。');
    setTimeout(closeItemRecalc,350);
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
    const slotNames = {morning:'白天', evening:'晚上'};
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
    for (const row of rows) {
      if (!(row.prevVolume > 0) || row.lastVolume > row.prevVolume * 1.02) continue;
      const swap = swaps[row.name];
      insights.push(`${row.name} 连续两周没有进步（${fmt(row.prevVolume,0)} → ${fmt(row.lastVolume,0)} kg 容量）${swap ? `，可以换成 ${swap} 练 4~6 周` : ''}`);
    }
    let last = 0, prev = 0;
    for (const row of rows) {last += row.lastVolume; prev += row.prevVolume;}
    if (prev > 0 && last > prev * 1.25) insights.push(`本周总容量比上周高 ${fmt((last / prev - 1) * 100, 0)}%；如果连着两周都这样，下周减量 40% 当 deload`);
    if (!insights.length) {
      const trained = (state.habits || []).some(row => row && row.date === localDate() && (row.training === true || row.training === 'true'));
      insights.push(trained ? '今天已训练；容量连续两周上升，说明渐进超负荷在生效。' : '今天还没记录训练；练完记一条，下周就能看出哪个动作停了。');
    }
    return insights.slice(0, 3);
  }
  /** Renders those insights into the 今天-page training card. */
  function renderTrainingInsights() {
    const box = $('#training-advice-insights');
    if (!box) return;
    box.innerHTML = trainingInsights().map(text => `<p class="fine-print">· ${esc(text)}</p>`).join('');
  }
  /** The 今天-page window: training questions only, with its own consent gate. */
  let lastTrainingReply = "";
  function installTrainingAdvice() {
    const form = $('#training-advice-form'), input = $('#training-advice-input'), consent = $('#training-advice-consent');
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
    if (consent) {try {consent.checked = localStorage.getItem(TRAINING_CONSENT_KEY) === '1';} catch {}}
    form.addEventListener('submit', async event => {
      event.preventDefault();
      const question = input.value.trim();
      if (!question) {feedback(feedbackBox, '先写一句要问的训练问题。', true); return;}
      if (consent && !consent.checked) {feedback(feedbackBox, '请先勾选同意，训练建议需要发送给外部模型。', true); return;}
      if (consent) {
        try {localStorage.setItem(TRAINING_CONSENT_KEY, '1');} catch {}
        if (typeof schedulePrefsSync === 'function') schedulePrefsSync({trainingConsent: true});
      }
      feedback(feedbackBox, '正在生成…');
      const button = form.querySelector('button[type="submit"]');
      if (button) button.disabled = true;
      try {
        const data = await api('/api/chat', {question, focus: 'training', date: localDate(), allowExternal: true, anchors: anchorSummary(), webSearch: false, logToHistory: false});
        const reply = String(data && data.reply || '').trim();
        if (!reply) throw new Error('模型没有返回可读的回答，请重试。');
        if (answerBox) {
          answerBox.hidden = false;
          answerBox.innerHTML = answerHtml(reply)
            + '<div class="button-row" id="training-advice-addrow"><button type="button" class="button subtle" id="training-advice-add">把回答里的动作加入今天的训练</button></div>';
          lastTrainingReply = reply;
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
      ['#habit-form', '日常习惯（步数 · 睡眠 · 饮水，可选）'],
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
      if (field) {field.value = value; field.focus();}
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
  (function(){const box=$('#chat-web');if(!box)return;try{const saved=localStorage.getItem(CHAT_WEB_KEY);if(saved!==null)box.checked=saved==='1';}catch{}box.addEventListener('change',()=>{try{localStorage.setItem(CHAT_WEB_KEY,box.checked?'1':'0');}catch{}
  if (typeof schedulePrefsSync === 'function') schedulePrefsSync({chatWeb: box.checked});
});})();
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
  installTodayQuickActions();
  installRecordPanels();
  installTrendPanels();
  installProfileAutoRecalc();
  applyTrainingVisibility();
  installCardCollapse(); installTrainingAdvice(); installHabitChips(); installChatChips();
  setupCollapsibleSections(); installQuickRecordControls(); installHealthConnectControls(); searchFoods(); restoreConsent(); installExactAlarmControl();
