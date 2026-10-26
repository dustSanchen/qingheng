from pathlib import Path
p = Path(r'D:\AI\health-android\app\src\main\assets\app.js')
s = p.read_text(encoding='utf-8')

def rep(a, b, count=1):
    global s
    assert s.count(a) == count, (s.count(a), a[:80])
    s = s.replace(a, b, count)

# ---- 1. Meal time helpers ---------------------------------------------------------------------
rep("""  let activeDate = localDate();""",
"""  // ---- Meal time ------------------------------------------------------------------------------
  // The meal time is when the food was eaten, which is not the same as when the photo was taken or
  // when the record was written. Defaults run from strongest evidence to weakest: the photo's own
  // wall clock, then a time mentioned in the description, then the moment of recording.
  const clockPattern = /^([01]\\d|2[0-3]):[0-5]\\d$/;
  const mealSlotClock = {breakfast:'07:30', lunch:'12:30', dinner:'18:30', snack:'15:30'};
  const nowClock = () => {const d = new Date(); return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;};
  /** The wall clock written on the photo: an offset in the string is the camera's own zone. */
  function photoWallClock(meta) {
    const iso = meta?.photoTakenAt;
    if (typeof iso !== 'string' || iso.length < 16) return null;
    const clock = iso.slice(11, 16);
    return clockPattern.test(clock) ? clock : null;
  }
  /** A time the user wrote in the description, e.g. "12:30 吃了…", "早上七点", "晚上". */
  function clockFromText(text) {
    const value = String(text || '');
    const explicit = value.match(/(\\d{1,2})\\s*[:：点时]\\s*(\\d{1,2})?/);
    if (explicit) {
      const before = value.slice(Math.max(0, explicit.index - 4), explicit.index);
      let hour = Number(explicit[1]);
      const minute = explicit[2] === undefined || explicit[2] === '' ? 0 : Number(explicit[2]);
      if (/下午|晚上|傍晚|夜/.test(before) && hour < 12) hour += 12;
      if (/凌晨/.test(before) && hour === 12) hour = 0;
      if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) return `${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')}`;
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

  let activeDate = localDate();""")

# ---- 2. Draft view carries the meal time -------------------------------------------------------
rep("""    const view = {id:data.draftId,date:form.elements.date.value,mealType:form.elements.mealType.value,source:data.source,
      confidence:data.confidence,notes:Array.isArray(data.notes)?data.notes:[],items:data.items,name:'',...photoMeta(form.photo)};""",
"""    const suggested = defaultMealTime(form.photo, form.text, form.elements.mealType.value);
    const view = {id:data.draftId,date:form.elements.date.value,mealType:form.elements.mealType.value,source:data.source,
      confidence:data.confidence,notes:Array.isArray(data.notes)?data.notes:[],items:data.items,name:'',
      ...photoMeta(form.photo), mealTime:suggested.mealTime, mealTimeSource:suggested.mealTimeSource};""")

rep("""    draft={id:view.id,date:view.date,mealType:view.mealType,source:view.source,...photoMeta(view)};
    $('#estimate-date').value=draft.date; $('#estimate-meal-type').value=draft.mealType;
    $('#estimate-photo-time').textContent=photoTimeLabel(draft);""",
"""    const mealTime = clockPattern.test(String(view.mealTime||'')) ? view.mealTime : nowClock();
    const source = ['photo','text','now','manual','typical'].includes(view.mealTimeSource) ? view.mealTimeSource : 'now';
    draft={id:view.id,date:view.date,mealType:view.mealType,source:view.source,mealTime,mealTimeSource:source,...photoMeta(view)};
    $('#estimate-date').value=draft.date; $('#estimate-meal-type').value=draft.mealType;
    $('#estimate-meal-time').value=mealTime;
    $('#estimate-meal-time-note').textContent=mealTimeNote(draft);
    $('#estimate-photo-time').textContent=photoTimeLabel(draft);""")

rep("""    const stored = {id:view.id,date:view.date,mealType:view.mealType,source:view.source,confidence:view.confidence,
      notes:view.notes,items:view.items,name:view.name,...photoMeta(view)};""",
"""    const stored = {id:view.id,date:view.date,mealType:view.mealType,source:view.source,confidence:view.confidence,
      notes:view.notes,items:view.items,name:view.name,mealTime:view.mealTime,mealTimeSource:view.mealTimeSource,...photoMeta(view)};""")

# ---- 3. Confirm sends the confirmed meal time --------------------------------------------------
rep("""      const date=$('#estimate-date').value, mealType=$('#estimate-meal-type').value;
      if(!validDate(date) || !$('#estimate-date').reportValidity()) throw new Error('请核对有效的饮食日期。');
      draft.date=date; draft.mealType=mealType;""",
"""      const date=$('#estimate-date').value, mealType=$('#estimate-meal-type').value, mealTime=$('#estimate-meal-time').value;
      if(!validDate(date) || !$('#estimate-date').reportValidity()) throw new Error('请核对有效的饮食日期。');
      if(!clockPattern.test(mealTime) || !$('#estimate-meal-time').reportValidity()) throw new Error('请填写有效的进餐时间（HH:mm）。');
      draft.date=date; draft.mealType=mealType;
      // The user just confirmed it, so it is no longer a guess.
      draft.mealTime=mealTime; draft.mealTimeSource='manual';""")

rep("""      await api('/api/meals',{estimateId:draft.id,date:draft.date,mealType:draft.mealType,name,source:draft.source,...photoMeta(draft),items,...totals,totals});""",
"""      await api('/api/meals',{estimateId:draft.id,date:draft.date,mealType:draft.mealType,mealTime:draft.mealTime,name,source:draft.source,...photoMeta(draft),items,...totals,totals});""")

# ---- 4. Estimation request freezes the description, which suggests the meal time ---------------
rep("""    const submittedForm={elements:{date:{value:form.elements.date.value},mealType:{value:form.elements.mealType.value}},photo:photoMeta(imageData?mealPhotoMeta:null)};""",
"""    const submittedForm={elements:{date:{value:form.elements.date.value},mealType:{value:form.elements.mealType.value}},
      text, photo:photoMeta(imageData?mealPhotoMeta:null)};""")

# ---- 5. Draft box lists every unconfirmed estimate ---------------------------------------------
rep("""  function renderDraftBox() {
    const box = $('#draft-box'); if (!box) return;
    const row = storedDrafts[0];
    box.hidden = !row;
    if (!row) return;
    const when = number(row.savedAt) !== null ? new Date(Number(row.savedAt)).toLocaleString('zh-CN') : '';
    const count = Array.isArray(row.items) ? row.items.length : 0;
    $('#draft-box-text').textContent = `有 ${storedDrafts.length} 份未确认的估算${when?`（最近一次 ${when}）`:''}：${count} 项食品，日期 ${row.date||'—'}。确认前不会计入当天。`;
  }""",
"""  function renderDraftBox() {
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
  }""")

# ---- 6. Advice is tied to the exact records it was generated from ------------------------------
rep("""  function renderAdvice(messages, date) {""",
"""  /** Identity of one day's records: any change makes previously generated advice stale. */
  function mealsFingerprint(date) {
    const rows = (state.meals || []).filter(row => row.date === date)
      .map(row => [row.mealType || '', row.mealTime || '', number(row.calories), number(row.protein), number(row.fat), number(row.carbs)].join(','));
    return `${date}|${rows.length}|${rows.sort().join(';')}`;
  }
  function renderAdvice(messages, date) {""")

rep("""    container.dataset.date = date || '';""",
"""    container.dataset.date = date || '';
    container.dataset.fingerprint = validDate(date) ? mealsFingerprint(date) : '';""")

rep("""    const adviceHint=$('#advice-data-context'); if(adviceHint)adviceHint.textContent=`分析日期：${activeDate} · 已保存 ${count} 条餐食`;""",
"""    const adviceHint=$('#advice-data-context'); if(adviceHint)adviceHint.textContent=`分析日期：${activeDate} · 已保存 ${count} 条餐食`;
    const adviceNode=$('#advice-content'), stale=$('#advice-stale');
    if (stale) {
      const baked=adviceNode?.dataset?.fingerprint, shown=adviceNode?.dataset?.date;
      const isStale=!!baked && shown===activeDate && baked!==mealsFingerprint(activeDate);
      stale.hidden=!isStale;
      if (isStale) stale.textContent='这条建议是按当时的记录生成的，之后记录有变化。请点「获取建议」重新生成。';
    }""")

# ---- 7. Meal rows show the meal time and share one list style ----------------------------------
rep("""${esc(mealNames[meal.mealType] || meal.mealType || '餐食')} · 蛋白质 ${fmt(meal.protein)}g""",
"""${esc(mealNames[meal.mealType] || meal.mealType || '餐食')}${clockPattern.test(String(meal.mealTime||'')) ? ` · ${esc(meal.mealTime)}` : ''} · 蛋白质 ${fmt(meal.protein)}g""")

rep("""container.innerHTML = meals.length ? meals.map(meal => `<div class="meal-row">""",
"""container.innerHTML = meals.length ? meals.map(meal => `<div class="meal-row list-row" role="listitem">""")
rep("""    if (log) log.innerHTML = chats.length ? [...chats].reverse().map(row => `<div class="meal-row">""",
"""    if (log) log.innerHTML = chats.length ? [...chats].reverse().map(row => `<div class="meal-row list-row" role="listitem">""")
rep("""      ? rows.map(row => `<div class="meal-row">""",
"""      ? rows.map(row => `<div class="meal-row list-row" role="listitem">""")
rep("""matches.map(row=>`<button type="button" class="food-result" data-food-name=""",
"""matches.map(row=>`<button type="button" class="food-result list-row" data-food-name=""")
rep("""return `<button type="button" class="food-result" data-off-name=""",
"""return `<button type="button" class="food-result list-row" data-off-name=""")

# ---- 8. Manual meal and quick record also carry a meal time ------------------------------------
rep("""return {date:form.elements.date.value,mealType:form.elements.mealType.value,name:form.elements.name.value.trim(),...numericForm(form,['calories','protein','fat','carbs']),source:'manual',items:[]};});});""",
"""const manualTime=form.elements.mealTime.value;
      if(!clockPattern.test(manualTime)) throw new Error('请填写有效的进餐时间（HH:mm）。');
      return {date:form.elements.date.value,mealType:form.elements.mealType.value,mealTime:manualTime,name:form.elements.name.value.trim(),mealTimeSource:'manual',...numericForm(form,['calories','protein','fat','carbs']),source:'manual',items:[]};});});""")

rep("""      await api('/api/meals', {date:$('#quick-record-date').value, mealType:$('#quick-record-type').value, name, source:'quick-copy', items, ...totals, totals});""",
"""      const quickTime = clockPattern.test($('#quick-record-time').value) ? $('#quick-record-time').value : nowClock();
      await api('/api/meals', {date:$('#quick-record-date').value, mealType:$('#quick-record-type').value, mealTime:quickTime, mealTimeSource:'manual', name, source:'quick-copy', items, ...totals, totals});""")

rep("""<label>名称补充<input id="quick-record-text" maxlength="120" placeholder="可选，也可使用语音输入"></label><button type="button" class="text-button" id="quick-record-voice">语音输入</button>""",
"""<label>进餐时间<input id="quick-record-time" type="time" required></label><label>名称补充<span class="field-with-action"><input id="quick-record-text" maxlength="120" placeholder="可选，也可使用语音输入"><button type="button" class="mic-button" data-voice-target="quick" aria-label="用语音补充名称"><span class="mic-icon" aria-hidden="true">🎙</span></button></span></label>""")

rep("""      $('#quick-record-voice').addEventListener('click', () => {
        const bridge = window.QinghengNative;
        if (bridge && typeof bridge.startVoiceInput === 'function') bridge.startVoiceInput('quick');
        else notice('语音输入需要已安装的 APK。', true);
      });
""", "")

rep("""    $('#quick-record-date').value = activeDate;""",
"""    $('#quick-record-date').value = activeDate;
    const quickTime = $('#quick-record-time'); if (quickTime) quickTime.value = nowClock();""")

# The meal textarea now owns a mic button in the markup, so the injected one is gone.
rep("""    const mealText = $('#meal-text');
    if (mealText && !$('#meal-voice')) {
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'text-button'; button.id = 'meal-voice'; button.textContent = '语音输入';
      button.title = '语音输入食物和克重';
      mealText.closest('label')?.appendChild(button);
      button.addEventListener('click', () => {
        const bridge = window.QinghengNative;
        if (bridge && typeof bridge.startVoiceInput === 'function') bridge.startVoiceInput('meal');
        else notice('语音输入需要已安装的 APK。', true);
      });
    }
""", "")

p.write_text(s, encoding='utf-8')
print('app.js patched: meal time, draft list, advice fingerprint, list styles, manual/quick meal time')
