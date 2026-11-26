/* Fragment 45-diet-ui -- 饮食视图与交互层（估算预览 / 写库 / 列表 / 趋势 / 快捷记录，2026-11-27 Phase 2）
 *
 *由 00/20/50/60/70 迁入；事件绑定统一在 installDietModule() 里做，dataset.wired 保证幂等。
 *领域计算在 42-diet-domain。
 */

  /**
   * Exact local-food pre-pass. Only consumes lines that name a USDA-backed entry and an explicit
   * gram/kg amount; any unknown item returns null so the existing AI/local fallback still owns it.
   * This is a matcher, not a second nutrition algorithm: macros come from FoodModels.estimate().
   */
  function localFoodEstimate(value) {
    const foods = window.QinghengFoods;
    if (!foods || typeof foods.find !== 'function' || typeof foods.estimate !== 'function') return null;
    const parts = String(value || '').split(/[，,、；;\n+]+/).map(part => part.trim()).filter(Boolean);
    if (!parts.length) return null;
    const items = [];
    let rangeNote = '';
    const cnNumbers = {'一': 1, '二': 2, '两': 2, '三': 3, '四': 4, '五': 5, '六': 6, '七': 7, '八': 8, '九': 9, '十': 10};
    for (const part of parts) {
      let normalizedPart = part
        .replace(/([一二两三四五六七八九十])(个|碗|份|片|根|块|勺|杯)半/g, (_, n, unit) => `${cnNumbers[n] + 0.5}${unit}`)
        .replace(/半(个|碗|份|片|根|块|勺|杯)/g, '0.5$1')
        .replace(/([一二两三四五六七八九十])(?=(个|碗|份|片|根|块|勺|杯))/g, (_, n) => String(cnNumbers[n]));
      // "200克米饭" is as common as "米饭200克"; normalize the leading amount before parsing.
      const leading = normalizedPart.match(/^(\d+(?:\.\d+)?)\s*(千克|公斤|kg|克|g|毫升|ml|个|碗|份|片|根|块|勺|杯)\s*(.+)$/i);
      if (leading) normalizedPart = `${leading[3].trim()} ${leading[1]}${leading[2]}`;
      const match = normalizedPart.match(/^(.*?)\s*(\d+(?:\.\d+)?)\s*(?:[-~至]\s*(\d+(?:\.\d+)?))?\s*(千克|公斤|kg|克|g|毫升|ml|个|碗|份|片|根|块|勺|杯)\s*$/i);
      if (!match) return null;
      const namePart = match[1].replace(/[（(].*?[)）]/g, '').trim();
      const start = Number(match[2]);
      const end = match[3] === undefined ? start : Number(match[3]);
      if (!(start > 0) || !(end >= start)) return null;
      const amount = (start + end) / 2;
      if (match[3] !== undefined) rangeNote = '部分是区间，按区间中值估算；';
      const unit = match[4].toLowerCase();
      const methodHit = namePart.match(/^(爆炒|红烧|干锅|油淋|清蒸|白灼|凉拌|煎|炸|炒|烤|蒸|煮|炖)/);
      const method = methodHit ? methodHit[1] : '蒸';
      const foodName = methodHit ? namePart.slice(methodHit[1].length).trim() : namePart;
      const entry = foods.find(foodName);
      if (!entry) return null;
      let grams = amount;
      if (unit === '千克' || unit === '公斤' || unit === 'kg') grams = amount * 1000;
      else if (!['克', 'g', '毫升', 'ml'].includes(unit)) {
        // Common portions are explicit data in the USDA catalogue, not a guessed conversion.
        if (!(Number(entry.portionGrams) > 0)) return null;
        grams = amount * Number(entry.portionGrams);
      }
      if (!(grams > 0) || !(grams <= 20000)) return null;
      const item = foods.estimate(entry.name, grams);
      items.push({...item, method, ...(entry.includesOil === true ? {oilIncluded: true} : {})});
    }
    return {
      draftId: 'local-food-' + Date.now(),
      source: 'local',
      localFoodModel: true,
      confidence: 'medium',
      uncertaintyPercent: 8,
      items,
      notes: [rangeNote + '按本地食品库精确匹配，未调用外部模型；份量与烹饪油仍需在预览里确认。']
    };
  }
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
  function previewDraft(data, form) {
    if (!data || typeof data.draftId !== 'string' || !data.draftId || data.draftId.length > ESTIMATE_LIMITS.draftId
      || !Array.isArray(data.items) || !data.items.length || data.items.length > ESTIMATE_LIMITS.items
      || !['api','local'].includes(data.source)) throw new Error('未返回有效估算预览，请重试。');
    if (!data.items.every(validEstimateItem)) throw new Error('估算明细格式不对，请重新生成。');
    const suggested = defaultMealTime(form.photo, form.text, form.elements.mealType.value);
    const notes = Array.isArray(data.notes)
      ? data.notes.filter(note => typeof note === 'string' && note.length > 0 && note.length <= ESTIMATE_LIMITS.note).slice(0, ESTIMATE_LIMITS.notes)
      : [];
    const view = {id:data.draftId,date:form.elements.date.value,mealType:form.elements.mealType.value,source:data.source,
      localFoodModel:data.localFoodModel === true,
      confidence:data.confidence,notes:notes,items:data.items,name:'',
      oilGrams:number(data.oilGrams) ?? 0,uncertaintyPercent:number(data.uncertaintyPercent) ?? 15,
      ...photoMeta(form.photo), mealTime:suggested.mealTime, mealTimeSource:suggested.mealTimeSource};
    renderPreview(view, false);
    saveToDraftBox(view);
  }
  /** Renders a stored or fresh estimate preview; a restored draft is labelled as such. */
  function renderPreview(view, restored) {
    estimateView = view;
    estimateRawItems = (view && Array.isArray(view.items) ? view.items : []).map(item => ({...item}));
    if (!view?.id || !Array.isArray(view.items) || !view.items.length) throw new Error('这份草稿不完整，请重新估算。');
    const mealTime = clockPattern.test(String(view.mealTime||'')) ? view.mealTime : nowClock();
    const source = ['photo','text','now','manual','typical'].includes(view.mealTimeSource) ? view.mealTimeSource : 'now';
    draft={id:view.id,editingId:view.editingId || '',date:view.date,mealType:view.mealType,source:view.source,mealTime,mealTimeSource:source,...photoMeta(view)};
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
    // Editing a saved meal keeps its stored nutrition: applying oil again would double-count it.
    const oiledItems = view.editingId ? estimateRawItems : applyOilToItems(estimateRawItems, estimateOilLevel);
    $('#estimate-items').innerHTML=oiledItems.map(item => `<div class="estimate-item" data-base-grams="${Number(item.grams)}" data-oil="${Number(item.oilGrams)||0}" data-method="${esc(item.oilMethod||item.method||'')}"${item.oilIncluded===true?' data-oil-included="1"':''}><div class="estimate-item-head"><label>食物名称<input data-item-field="name" value="${esc(item.name)}" maxlength="120" required></label><div class="estimate-item-actions"><button type="button" class="recalc-item" title="按克重和每 100g 数据重算" aria-label="按克重重算${esc(item.name)}"><span class="inline-icon" aria-hidden="true"><img src="./icon-refresh.svg" alt="" width="17" height="17"></span></button><button type="button" class="remove-item" title="移除这项" aria-label="移除${esc(item.name)}">×</button></div></div>${modelNote(item)}${number(item.oilGrams)>0?`<p class="fine-print estimate-item-oil">${esc(item.oilMethod||item.method||'按克重')} · 用油 ${fmt(item.oilGrams,0)} g，已含在热量与脂肪里。</p>`:''}<div class="form-grid">${fields.map(([key,label]) => `<label>${label}<input data-item-field="${key}" type="number" value="${Number(item[key])}" ${key === 'grams' ? '' : `data-base-value="${Number(item[key])}"`} min="0" max="20000" step="0.01" required></label>`).join('')}</div></div>`).join('');
    $('#estimate-source').textContent=view.editingId?'编辑已保存餐食':`${view.source==='api'?'外部模型':view.localFoodModel?'本地食品库':'本地估算'} · ${view.confidence==='medium'?'中等':'低'}置信度${restored?' · 已恢复未确认草稿':''}`;
    const uncertainty=number(view.uncertaintyPercent) ?? 15;
    draft.uncertaintyPercent=uncertainty; draft.oilGrams=number(view.oilGrams) ?? 0;
    // 用油按菜归属：模型的每道菜自己带 oilGrams，且已算进那道菜的热量；顶层数只用于展示。
    const itemsOil=(oiledItems||[]).reduce((sum,item)=>sum+(number(item.oilGrams)||0),0);
    const totalCalories=totalsFor(oiledItems).calories;
    const interval=`估算区间：约 ${fmt(totalCalories*(1-uncertainty/100),0)}–${fmt(totalCalories*(1+uncertainty/100),0)} kcal（±${fmt(uncertainty,0)}%）`;
    const oilNote=itemsOil>0
      ? `用油按菜式与克重估算：共 ${fmt(itemsOil,0)} g（约 ${fmt(itemsOil*9,0)} kcal），已含在各菜的热量与脂肪里；整餐可调「少 / 一般 / 多」`
      : draft.oilGrams>0
        ? `已计入烹调用油 ${fmt(draft.oilGrams,0)} g（约 ${fmt(draft.oilGrams*9,0)} kcal）`
        : '这几道菜按清蒸/白灼/生食这类方式算，不计烹调用油；如果实际有油，把「整餐用油」调到一般或多';
    const lowNote='识别结果可能有偏差，请核对份量与克重；不确定的项按常见份量取中位值即可，不必刻意往高报。';
    $('#estimate-notes').innerHTML=[interval,oilNote,lowNote].concat(Array.isArray(view.notes)?view.notes:[]).map(note=>`<li>${esc(note)}</li>`).join('');
    $('#estimate-name').value=view.name || view.items.map(item=>item.name).join('、').slice(0,120);
    $('#estimate-preview').hidden=false;
    feedback($('#preview-feedback'), view.editingId ? '正在编辑已保存餐食；保存后会更新原记录，不会新增一条。' : restored?'已恢复未确认的估算，请核对日期与克重后确认保存。':'请检查数据后确认保存。');
    renderOilLevel();
    updatePreviewTotals();
    $('#estimate-preview').scrollIntoView({block:'nearest',behavior:'auto'});
  }
  function scaleEstimateItem(row, grams) {
    const baseGrams = number(row.dataset.baseGrams);
    if (!(grams > 0) || !(baseGrams > 0)) return;
    const ratio = grams / baseGrams;
    for (const key of nutritionKeys) {
      const input = $(`[data-item-field="${key}"]`, row), base = number(input?.dataset.baseValue);
      if (input && base !== null) input.value = nutritionPrecision(base * ratio);
    }
    // The row's calories/fat were scaled too; keep its oil marker in the same proportion,
    // otherwise a later "少" subtracts the old (larger) oil and can go negative.
    const oil = number(row.dataset.oil);
    if (oil > 0) row.dataset.oil = String(Math.round(oil * ratio * 10) / 10);
    updatePreviewTotals();
  }
  /** 只调整油量差额，保留用户改过的克重与热量。 */
  function setOilLevel(level) {
    if (!OIL_LEVELS[level] || !estimateView) return;
    const ratioTo = OIL_LEVELS[level].ratio;
    $$('.estimate-item').forEach((row, index) => {
      const raw = estimateRawItems[index] || {};
      const gramsField = $('[data-item-field="grams"]', row);
      const grams = number(gramsField && gramsField.value) ?? number(raw.grams);
      const nameField = $('[data-item-field="name"]', row);
      if (isPackagedFood({...raw, name: (nameField && nameField.value) || raw.name})) return;
      // A saved/mixed dish already carries its own oil; changing the meal-level level would
      // subtract oil that is not independently represented in the row.
      if (raw.oilIncluded === true) return;
      const base = oilRuleFor(raw.method, grams);
      if (!(base > 0)) return;
      const oldOil = Math.max(0, number(row.dataset.oil) ?? number(raw.oilGrams) ?? 0);
      const newOil = Math.round(base * ratioTo * 10) / 10;
      const cal = $('[data-item-field="calories"]', row);
      const fat = $('[data-item-field="fat"]', row);
      const adjusted = oilAdjustedValues(cal && cal.value, fat && fat.value, oldOil, newOil);
      if (cal) cal.value = adjusted.calories;
      if (fat) fat.value = adjusted.fat;
      row.dataset.oil = String(newOil);
    });
    estimateOilLevel = level;
    renderOilLevel();
    updatePreviewTotals();
  }
  function renderOilLevel() {
    const box = $('#estimate-oil-level');
    if (!box) return;
    $$('[data-oil-level]', box).forEach(btn => btn.setAttribute('aria-pressed', btn.dataset.oilLevel === estimateOilLevel ? 'true' : 'false'));
  }
  function openItemRecalc(row) {
    if (!row) return;
    const root = $('#item-recalc-dialog'), grams = number($('[data-item-field="grams"]', row)?.value), baseGrams = number(row.dataset.baseGrams);
    if (!(grams > 0) || !(baseGrams > 0)) return;
    itemRecalcReturnFocus = document.activeElement instanceof HTMLElement && document.activeElement !== document.body ? document.activeElement : null;
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
    const returnTo = itemRecalcReturnFocus; itemRecalcReturnFocus = null;
    if (returnTo && returnTo.isConnected && typeof returnTo.focus === 'function') returnTo.focus({preventScroll: true});
  }
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
      const editing = draft.editingId ? (state.meals || []).find(row => row && String(row.id) === String(draft.editingId)) : null;
      if (draft.editingId && !editing) throw new Error('原餐食记录已不存在，请重新打开这条记录。');
      const wasEditing = !!editing;
      const values = {date:draft.date,mealType:draft.mealType,mealTime:draft.mealTime,name,source:draft.source,...photoMeta(draft),items,...totals,totals,
        // The oil amount the estimate already counted stays on the record, so the numbers remain explainable.
        ...(number(draft.oilGrams)>0?{oilGrams:number(draft.oilGrams),oilIncluded:true}:{}),
        ...(number(draft.uncertaintyPercent)!==null?{uncertaintyPercent:number(draft.uncertaintyPercent)}:{})};
      savingDraft=true;button.disabled=true;$('#cancel-estimate').disabled=true;feedback(message,wasEditing?'正在更新已保存餐食…':'正在保存确认后的餐食…');
      if (editing) await api('/api/meals',{...editing,id:editing.id,...values});
      else await api('/api/meals',{estimateId:draft.id,...values});
      // Keep draftId on failures so native idempotency prevents duplicate confirmations.
      const savedDate=draft.date; activeDate=savedDate; $('#active-date').value=savedDate; syncActiveDateLabel();
       draft=null;$('#estimate-preview').hidden=true;$('#estimate-form').reset();setDefaultDates();clearImage();feedback($('#estimate-feedback'),wasEditing?`餐食已更新到 ${savedDate}。`:`餐食已确认保存到 ${savedDate}，已切换到该日汇总。`);
      try {await loadState({quiet:true});} catch {feedback($('#estimate-feedback'),'已保存，但刷新失败。请重新加载检查记录，不要再次估算保存。',true);}
      if (window.QH && QH.bus && QH.EVENTS) QH.bus.emit(QH.EVENTS.DIET_SAVED, {date: savedDate});
      loadDrafts().catch(() => {});
    } catch(error) {feedback(message,error.message,true);} finally {savingDraft=false;button.disabled=false;$('#cancel-estimate').disabled=false;}
  }
  function discardDraft() {if(savingDraft) return;const id=draft?.id, editing=!!draft?.editingId;draft=null;$('#estimate-preview').hidden=true;$('#estimate-items').replaceChildren();if(!editing)dropDraft(id);}
  function readItems(validate=false) {
    const rows=$$('.estimate-item'); if(!rows.length) {if(validate) throw new Error('请至少保留一项食物。');return [];}
    return rows.map(row => {const item={};$$('[data-item-field]',row).forEach(input=>{if(validate && !input.reportValidity()) throw new Error('请补全食物名称并填写有效的非负数值。');item[input.dataset.itemField]=input.dataset.itemField==='name'?input.value.trim():number(input.value);});const oil=number(row.dataset.oil);if(oil>0)item.oilGrams=oil;if(validate && !item.name) {markFieldInvalid($('[data-item-field="name"]', row), '请填写食物名称。'); throw new Error('请填写食物名称。');}return item;});
  }
  function updatePreviewTotals() {const totals=estimateTotals(readItems());$('#estimate-totals').textContent=`合计：${fmt(totals.calories)} kcal · 蛋白质 ${fmt(totals.protein)}g · 脂肪 ${fmt(totals.fat)}g · 碳水 ${fmt(totals.carbs)}g`;}
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
  /** Meal drafts only hand the sentence to the existing estimate form; no record is written. */
  function openMealDraft(draft) {
    const payload = draft && draft.payload || {};
    const text = String(payload.text || '').trim();
    if (!text) {notice('这条餐食草稿没有可带入的描述。', true); return;}
    if (validDate(draft.date)) setActiveDate(draft.date);
    switchTab('records', true);
    if (typeof switchRecordPanel === 'function') switchRecordPanel('food');
    const form = $('#estimate-form'), field = $('#meal-text');
    if (!form || !field) {notice('餐食表单没有加载，请回到记录页重试。', true); return;}
    if (validDate(draft.date)) form.elements.date.value = draft.date;
    const slot = ['breakfast', 'lunch', 'dinner', 'snack'].includes(payload.mealType) ? payload.mealType : '';
    if (slot) form.elements.mealType.value = slot;
    field.value = text;
    field.dispatchEvent(new Event('input', {bubbles: true}));
    notice('已带入餐食描述；生成估算预览并确认后才会保存。');
    revealField('meal-text', {focus: false, block: 'start'});
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
      const savedDate=$('#quick-record-date').value;
      await api('/api/meals', {date:$('#quick-record-date').value, mealType:quickRecordType, mealTime:quickTime, mealTimeSource:'manual', name, source:'quick-copy', items, ...totals, totals});
      closeQuickRecord();
      await loadState({quiet:true});
      if (window.QH && QH.bus && QH.EVENTS) QH.bus.emit(QH.EVENTS.DIET_SAVED, {date: savedDate});
      notice('快速记录已保存。');
    } catch (error) {feedback.textContent = error.message;}
    finally {button.disabled = false;}
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
  /** Row markup for one meal; split out so day-grouped lists can reuse it. */
  function mealRowsHtml(meals, showDate) {
    return meals.map(meal => {
      const type = esc(mealNames[meal.mealType] || meal.mealType || '餐食');
      const clock = clockPattern.test(String(meal.mealTime||'')) ? esc(meal.mealTime) : '';
      const source = ({manual:'手动',local:'本地估算',api:'模型估算','quick-copy':'复制','import':'导入'})[meal.source] || '';
      const items = Array.isArray(meal.items) && meal.items.length ? `共 ${meal.items.length} 项` : '';
      const photo = meal.photoTakenAt ? '有照片' : '';
      return `<div class="meal-row list-row" role="listitem" data-long-press="meal:${esc(meal.id ?? '')}"><div class="row-body"><div class="row-head"><strong>${esc(stripQuickTag(meal.name) || '未命名餐食')}</strong>`
        + `${meal.favorite === true ? `<span class="fav-badge" aria-label="已收藏"><span class="inline-icon" aria-hidden="true">${SVG_ICONS['icon-bookmark.svg']}</span></span>` : ''}`
        + `${type ? `<span class="row-tag">${type}</span>` : ''}`
        + `${source ? `<span class="row-tag subtle-tag">${esc(source)}</span>` : ''}`
        + `${items ? `<span class="row-tag subtle-tag">${esc(items)}</span>` : ''}`
        + `${showDate ? `<span class="row-date">${esc(meal.date)}</span>` : ''}`
        + `${meal.id !== undefined ? `<span class="row-actions"><button type="button" class="icon-button row-edit" data-edit-meal="${esc(meal.id)}" aria-label="编辑${esc(meal.name || '餐食')}">改</button><button type="button" class="icon-button danger row-delete" data-delete-meal="${esc(meal.id)}" aria-label="删除${esc(meal.name || '餐食')}" title="删除这条餐食"><span class="inline-icon" aria-hidden="true">${SVG_ICONS['icon-trash.svg']}</span></button></span>` : ''}</div>`
        + `${Array.isArray(meal.items) && meal.items.length ? `<div class="meal-items-wrap"><button type="button" class="meal-items-toggle" data-meal-items="${esc(meal.id ?? '')}" aria-expanded="false">共 ${meal.items.length} 项 · 查看每项热量</button><div class="meal-items" hidden>${[...meal.items].sort((a, b) => (number(b.calories) ?? 0) - (number(a.calories) ?? 0)).map(item => `<div class="meal-item"><span>${esc(item.name || '未命名')}</span><b>${number(item.grams) !== null ? `${fmt(item.grams, 0)} g · ` : ''}${fmt(number(item.calories) ?? 0, 0)} kcal</b></div>`).join('')}</div></div>` : ''}`
        + `<div class="meal-numbers" aria-label="营养数值">`
        + `<span><small>蛋白</small><b>${fmt(meal.protein)} g</b></span><span><small>脂肪</small><b>${fmt(meal.fat)} g</b></span><span><small>碳水</small><b>${fmt(meal.carbs)} g</b></span></div>`
        + `<div class="row-meta">${clock ? `<span>${clock}</span>` : ''}`
        + `${oilLabel(meal)}`
        + `${photo ? `<span>${photo}</span>` : ''}</div></div>`
        + `<div class="row-side"><span class="row-kcal">${fmt(meal.calories,0)} <small>kcal</small></span></div></div>`;
    }).join('');
  }
  /**
   * 今日记录从「一长串行」改成「按餐次折叠」：每格只占一行摘要（餐次 · 餐数 · kcal），
   * 展开才出逐餐明细。
   * 2026-11-23（四模块之二轮）：默认全部收起——首页先给「今天吃了什么」的轮廓，
   * 只有「一格一餐」这种收起来没有收益的情况才默认展开；用户点过哪格仍按本机记录。
   */
  function renderTodayTimeline(container, meals) {
    if (!container) return;
    // 只列餐食。睡眠/体重/训练曾经被当成「事件」塞在末尾，看起来像误记进今日记录；
    // 它们在「今日三样」的摘要和「身体近况」里各自有位置，这里不再重复。
    $('#today-record-count').textContent = meals.length ? `${meals.length} 餐` : '暂无';
    if (!meals.length) {
      container.innerHTML = stateBlock({kind: 'empty', title: '今天还没有记录', body: '记一餐，时间轴就会出现在这里；上方「记一餐」直接开始。'});
      return;
    }
    const slotTypeOf = meal => {
      if (MEAL_SLOT_ORDER.includes(meal.mealType)) return meal.mealType;
      const time = String(meal.mealTime || '');
      return clockPattern.test(time) ? defaultMealTypeFor(time) : 'untimed';
    };
    const groups = new Map();
    meals.forEach((meal, index) => {
      const key = slotTypeOf(meal);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push({meal, index});
    });
    const order = [...MEAL_SLOT_ORDER, 'untimed'].filter(key => groups.has(key));
    container.innerHTML = order.map(key => {
      const list = groups.get(key);
      const kcal = Math.round(totalsFor(list.map(entry => entry.meal)).calories ?? 0);
      const label = MEAL_TYPE_LABEL[key] || '未标餐次';
      // 收起是默认；只有「这一格本来就只有一餐」时不折——折了也省不出高度，还多一次点击。
      const open = mealSlotOpen.has(key) ? mealSlotOpen.get(key) : (order.length === 1 && list.length === 1);
      const rows = list
        .sort((a, b) => {
          const ta = clockPattern.test(String(a.meal.mealTime || '')) ? String(a.meal.mealTime) : '';
          const tb = clockPattern.test(String(b.meal.mealTime || '')) ? String(b.meal.mealTime) : '';
          return (ta && tb ? ta.localeCompare(tb) : 0) || a.index - b.index;
        })
        .map(entry => entry.meal)
        .map(meal => mealRowsHtml([meal], false))
        .join('');
      return `<div class="meal-slot${open ? ' is-open' : ''}" data-meal-slot="${key}">`
        + `<button type="button" class="meal-slot-head" aria-expanded="${open}" aria-controls="today-slot-${key}">`
        + `<span class="meal-slot-name">${label}</span>`
        + `<span class="meal-slot-meta">${list.length} 餐 · ${fmt(kcal, 0)} kcal</span>`
        + `<span class="meal-slot-caret" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9.4 6.2 15.2 12l-5.8 5.8"/></svg></span>`
        + `</button>`
        + `<div class="meal-slot-body" id="today-slot-${key}" role="list"${open ? '' : ' hidden'}>${rows}</div></div>`;
    }).join('');
    if (!container.dataset.slotWired) {
      container.dataset.slotWired = '1';
      container.addEventListener('click', event => {
        const head = event.target.closest?.('.meal-slot-head');
        if (!head) return;
        const slot = head.closest('.meal-slot');
        const body = slot?.querySelector('.meal-slot-body');
        if (!slot || !body) return;
        const open = head.getAttribute('aria-expanded') !== 'true';
        head.setAttribute('aria-expanded', String(open));
        slot.classList.toggle('is-open', open);
        body.hidden = !open;
        mealSlotOpen.set(slot.dataset.mealSlot, open);
      });
    }
  }
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
      return `<div class="meal-day"><div class="meal-day-head"><strong>${esc(mealDayLabel(day))}</strong><span>${list.length} 餐 · ${fmt(kcal, 0)} kcal</span></div>${mealRowsHtml(list, false)}</div>`;
    }).join('');
    const toggle = rows.length > RECORD_MEALS_COLLAPSED
      ? `<button type="button" class="button subtle" id="record-meals-toggle">${recordMealsExpanded ? '收起' : `显示全部 ${rows.length} 条`}</button>`
      : '';
    container.innerHTML = html + toggle;
    $('#record-meals-toggle')?.addEventListener('click', () => {recordMealsExpanded = !recordMealsExpanded; renderRecordMeals(rows);});
  }
  /** Five-metric check for the selected day, plus the single action to take. */
  function renderDailyCheck() {
    const box = $('#daily-check'), tag = $('#daily-check-tag');
    if (!box) return;
    const meals = (state.meals || []).filter(row => row && row.date === activeDate);
    const habit = habitRowFor(activeDate) || {};
    const profile = effectiveProfileForDate(activeDate);
    const range = intakeRangeForDate(activeDate);
    // 放松日是当日免除超标扣分的唯一依据：漏传它会让「本周 1/1 放松日」只在文案里存在。
    const relaxInfo = typeof relaxDayInfoFor === 'function' ? relaxDayInfoFor(activeDate) : {relax: false};
    const check = dailyCheck({meals, habit, range, relax: relaxInfo.relax === true,
      proteinMin: number(profile.proteinMin), proteinMax: number(profile.proteinMax),
      fatMin: number(profile.fatMin), fatMax: number(profile.fatMax)});
    if (tag) {
      tag.textContent = check.relax ? '放松日 · 本周 1/1' : range.unset ? '未测算' : check.score === null ? '待记录' : check.score + ' 分';
      tag.classList.toggle('is-relax', !!check.relax);
    }
    // 2026-11-22：四根竖条改成一行横向胶囊（名称 + 3px 细条），纵向占用约减一半。
    box.innerHTML = '<div class="check-caps" role="img" aria-label="今日体检四项完成度">' + check.items.map(item => {
      const level = check.relax ? 'idle' : !item.evaluated ? 'idle' : item.ok || item.score >= 0.95 ? 'ok' : item.score >= 0.6 ? 'near' : 'off';
      const pct = level === 'idle' ? 0 : Math.max(6, Math.round(Math.max(0, Math.min(1, item.score ?? 0)) * 100));
      return `<div class="check-cap ${level}"><span class="check-cap-name">${esc(item.label)}</span>`
        + `<span class="check-cap-track"><span class="check-cap-fill" style="width:${pct}%"></span></span></div>`;
    }).join('') + '</div>'
      + '<div hidden>' + `<p class="check-verdict">${esc(check.verdict)}</p>` + '</div>';
    // 结论不再单独占一行：并进状态胶囊，和热量/宏量提示按优先级轮播。
    TODAY_SIGNALS.check = check.verdict || '';
    if (typeof renderTodayAction === 'function') renderTodayAction();
    // 首屏只有一条行动行（#today-action）；体检只报状态，不再各给一条「该做什么」。
    // 2026-11-24：删掉体检里那颗「补睡眠」快捷——睡眠在正下方的小习惯格里就是同一个跳转，
    // 同一屏两处入口属于重复；"睡眠未记" 已经由睡眠那根 0% 的胶囊说清。
    box.querySelectorAll('.check-fix').forEach(button => {
      button.dataset.goBound = '1';
      button.addEventListener('click', () => {
        if (button.dataset.focus) setTimeout(() => revealField(button.dataset.focus), 160);
      });
    });
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
  function renderWeeklyReview() {
    const body = $('#weekly-review-body'), range = $('#weekly-review-range');
    if (!body) return;
    const weekEnd = completedWeekEnd(activeDate);
    const weekStart = shiftDate(weekEnd, -6);
    const previousEnd = shiftDate(weekEnd, -7);
    const previousStart = shiftDate(weekEnd, -13);
    const currentDays = [], previousDays = [];
    for (let offset = 0; offset < 7; offset++) currentDays.push(weeklyDaySummary(shiftDate(weekStart, offset)));
    for (let offset = 0; offset < 7; offset++) previousDays.push(weeklyDaySummary(shiftDate(previousStart, offset)));
    const data = buildWeeklyReview({weekStart, weekEnd, currentDays, previousDays, trainingEnabled: trainingEnabled()});
    if (range) range.textContent = data.rangeLabel || '—';
    if (!data.enough) {
      body.innerHTML = '<p class="muted">这一周记录不足，暂时不能比较。</p><p class="fine-print">' + esc(data.action) + '</p>';
      return;
    }
    const weightText = data.weight.currentMean === null ? '—' : fmt(data.weight.currentMean) + ' kg';
    const compareText = data.weight.comparable
      ? `较前一周 ${data.weight.delta >= 0 ? '+' : ''}${fmt(data.weight.delta)} kg`
      : data.weight.currentCount < 2 ? '称重不足两次' : '前一周数据不足';
    const training = data.training
      ? `<div class="weekly-review-metric"><small>训练</small><strong>${data.training.days} <span>天</span></strong><span>按实际动作计</span></div>`
      : '';
    const targetText = data.targetKnownDays
      ? `有 ${data.targetKnownDays} 天能核对热量，其中 ${data.targetDays} 天在区间内`
      : '目标尚未测算';
    body.innerHTML = `<div class="weekly-review-grid${data.training ? '' : ' two'}">`
      + `<div class="weekly-review-metric"><small>体重周均值</small><strong>${weightText}</strong><span>${compareText}</span></div>`
      + `<div class="weekly-review-metric"><small>餐食记录</small><strong>${data.mealDays} <span>天</span></strong><span>有记录才计数</span></div>`
      + training
      + `</div><p class="fine-print">${targetText}；未记录不代表没做。</p><p class="weekly-review-action">${esc(data.action)}</p>`;
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


  /** 估算表单的顶层装配：重试按钮 / 提交 / 逐项重算 / 删除与编辑入口。1.5.42 Phase 2 从 70-rest 迁入。 */
  function installDietEstimateForm() {
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
      if(imageData && !externalConsent()){feedback(message,'照片估算需要外部模型：请到「我的 → 数据与关于」开启授权。',true);return;}
      if(imageData && !navigator.onLine){feedback(message,'当前离线，照片无法识别；请移除照片，改用文字估算。',true);return;}
      const text=form.elements.text.value.trim();if(!text && !imageData){feedback(message,'请描述餐食或添加一张图片。',true);return;}
      if(draft && !await askConfirm('新估算会替换当前未保存的预览，继续吗？', {title:'替换预览'}))return;
      const submittedForm={elements:{date:{value:form.elements.date.value},mealType:{value:form.elements.mealType.value}},
        text, photo:photoMeta(imageData?mealPhotoMeta:null)};
      // Exact USDA/local entries can finish instantly and offline; unknown or estimated portions
      // still go through the existing model/local adapter, never through a second nutrition formula.
      if (!imageData) {
        const local = localFoodEstimate(text);
        if (local) {
          try {
            previewDraft(local, submittedForm);
            feedback(message, '本地食品库已匹配；请核对克重与用油后确认。');
          } catch (error) { feedback(message, error.message, true); }
          return;
        }
      }
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
        // 视觉识读走同一份契约：只用来统计被丢弃的异常项，不改变“先确认再保存”的流程。
        const vision = normaliseVision(data, 'meal');
        previewDraft(data,submittedForm);
        feedback(message, vision.rejected.length
          ? `估算完成，有 ${vision.rejected.length} 项读数异常已跳过。请在下方修改并确认，才会保存。`
          : '估算完成。请在下方修改并确认，才会保存。');
      }
      catch(error){feedback(message,error.message,true);retry.hidden=false;}
      finally{window.QinghengEstimateStream=null;busy.hidden=true;busy.classList.remove('estimate-progress');estimateBusy=false;button.disabled=false;}
    });
    $('#estimate-items').addEventListener('input',event=>{
      const input=event.target.closest('[data-item-field]');if(!input)return;
      if(input.dataset.itemField==='grams'){const grams=number(input.value);if(grams>0)scaleEstimateItem(input.closest('.estimate-item'),grams);}
      updatePreviewTotals();
    });
    $('#estimate-oil-level')?.addEventListener('click', event => {
      const button = event.target.closest('[data-oil-level]');
      if (!button) return;
      event.preventDefault();
      if (typeof setOilLevel === 'function') setOilLevel(button.dataset.oilLevel);
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
    document.addEventListener('click',async event=>{const button=event.target.closest('[data-delete-meal]');if(!button || button.disabled)return;if(!await askConfirm('确定删除这条餐食记录吗？此操作无法撤销。',{title:'删除餐食',ok:'删除',danger:true}))return;const removed=(state.meals||[]).find(row=>row && String(row.id)===String(button.dataset.deleteMeal));button.disabled=true;try{await api(`/api/meals/${encodeURIComponent(button.dataset.deleteMeal)}`,undefined,'DELETE');if(window.QH && QH.bus && QH.EVENTS) QH.bus.emit(QH.EVENTS.DIET_SAVED,{date:(removed && removed.date)||activeDate});try{await loadState({quiet:true});notice('餐食已删除。');}catch{notice('删除成功，但刷新失败。请重新加载检查记录。',true);}}catch(error){notice(error.message,true);button.disabled=false;}});
    document.addEventListener('click', event => {
      const button = event.target.closest('[data-edit-meal]');
      if (!button) return;
      const record = (state.meals || []).find(row => row && String(row.id) === String(button.dataset.editMeal));
      if (record) beginMealEdit(record);
    });
  }

  /** 「按食品模型校核」：只换食材营养，保留烹饪方式与已算用油。1.5.42 Phase 2 从 00-head 迁入。 */
  function installDietCalibrate() {
    $('#calibrate-foods').addEventListener('click',()=>{
      if (!window.QinghengFoods) return;
      try {
        const data = window.QinghengFoods.calibrateDraft({items:readItems(true),notes:[]});
        let restoredOil = 0, keptMethod = 0;
        data.items.forEach((item,i)=>{
          const row = $$('.estimate-item')[i];
          if (!row) return;
          // 校核只替换「食材本身的营养」，不接管这一行的烹饪方式与用油：
          // 1.5.41 之前这里直接覆盖 calories/fat，导致已算进去的烹调用油被清零（油量还挂在 data-oil 上）。
          const method = String(row.dataset.method || '').slice(0, 8);
          const wasOilIncluded = row.dataset.oilIncluded === '1';
          const previousOil = number(row.dataset.oil) || 0;
          let next = {...item};
          if (method) { next.method = method; keptMethod += 1; }
          const matched = !!(item.model && typeof item.model === 'object');
          if (!matched) {
            // 没匹配到本地库：营养与油都原样保留，不重算也不清零。
            next.oilGrams = previousOil;
            if (wasOilIncluded) next.oilIncluded = true; else delete next.oilIncluded;
            delete next.oilMethod;
          } else if (item.model.includesOil === true) {
            // 混合菜基准里已经含了烹调油：保持「已含油」，不重复加。
            next.oilGrams = 0;
            next.oilIncluded = true;
            delete next.oilMethod;
          } else if (method) {
            // 食材行：按当前整餐用油档位补回烹调用油（1 g 油 = 9 kcal，同时计入脂肪）。
            next.oilGrams = 0;
            next.oilIncluded = false;
            delete next.oilMethod;
            if (typeof applyOilToItems === 'function') {
              const [oiled] = applyOilToItems([next], typeof estimateOilLevel === 'string' ? estimateOilLevel : 'normal');
              if (oiled) next = oiled;
            }
            if (number(next.oilGrams) > 0) restoredOil += Number(next.oilGrams);
          } else if (previousOil > 0) {
            // 食材行但没有烹饪方式：把原来那份额度的油加回被替换掉的营养里，避免「有油标记、热量却没算油」。
            next.oilGrams = previousOil;
            next.oilIncluded = true;
            next.calories = Math.round((number(next.calories) || 0) + previousOil * 9);
            next.fat = Math.round((((number(next.fat) || 0) + previousOil)) * 10) / 10;
            restoredOil += previousOil;
          }
          for(const key of ['calories','protein','fat','carbs']) {
            const input = $('[data-item-field="'+key+'"]',row);
            if (input) input.value = number(next[key]) ?? input.value;
          }
          const gramsInput = $('[data-item-field="grams"]', row);
          if (gramsInput && number(next.grams) !== null) gramsInput.value = number(next.grams);
          row.dataset.baseGrams = number(next.grams) ?? number(gramsInput?.value);
          row.dataset.method = method;
          row.dataset.oil = String(number(next.oilGrams) || 0);
          if (next.oilIncluded === true) row.dataset.oilIncluded = '1'; else delete row.dataset.oilIncluded;
          for(const key of nutritionKeys) {
            const input = $('[data-item-field="'+key+'"]', row);
            if (input) input.dataset.baseValue = number(input.value);
          }
        });
        const oilNote = restoredOil > 0
          ? `已按当前用油档位补回烹调用油 ${fmt(restoredOil,0)} g（已含在热量与脂肪里）。`
          : keptMethod > 0 ? '已保留每行的烹饪方式；这些做法不计或已含烹调油。' : '';
        $('#estimate-notes').innerHTML = (oilNote ? `<li>${esc(oilNote)}</li>` : '') + data.notes.map(note=>`<li>${esc(note)}</li>`).join('');
        updatePreviewTotals(); feedback($('#preview-feedback'),'已按本地模型校核。菜品配方、油量和图片估计克重仍需人工确认。');
      } catch(error){feedback($('#preview-feedback'),error.message,true);}
    });
  }

  /**
   * 饮食模块唯一安装入口：dataset.dietWired 保证幂等，重复调用不会重复绑定。
   * 调用点在 70-rest 的启动装配行（原来直接调 installQuickRecordControls）。
   */
  function installDietModule() {
    const root = document.body;
    if (!root || root.dataset.dietWired === '1') return;
    root.dataset.dietWired = '1';
    installDietEstimateForm();
    installDietCalibrate();
    installQuickRecordControls();
    installMealWindow();
    installPhotoEntry();
  }

  // 公开契约：只登记调用方真正需要的读接口与渲染/入口函数；数据一律走查询函数返回快照。
  QH.define('diet', {
    totalsFor, intakeRangeForDate, effectiveProfileForDate, dailyCheck, relaxDayInfoFor,
    renderDailyCheck, renderDietTrend, openQuickRecord
  });