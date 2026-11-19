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
      node.textContent = '尚未测算。填写性别、身高、体重与年龄后点「按目标重新测算」；训练天数取自「记录 → 训练计划」。';
      return;
    }
    node.className = 'target-status';
    const goal = GOAL_LABEL[p.goal] || '未设置目标';
    const temporary = targetAdjustmentForDate(localDate());
    // 展示与「今天」页同一套计算：目标预设算出的训练日/休息日区间，不再读手填字段。
    const range = intakeRangeForDate(localDate());
    if (range.unset) {
      node.className = 'target-status empty';
      node.textContent = '尚未测算。填写性别、身高、体重与年龄后点「按目标重新测算」；训练天数取自「记录 → 训练计划」。';
      return;
    }
    const missing = [];
    if (number(p.age) === null) missing.push('年龄');
    if (plannedSessions() === null) missing.push('训练计划');
    const trainingToday = trainedOn(localDate());
    node.textContent = [
      `当前目标：${goal}`,
      `维持热量 ${number(p.referenceCalories) !== null ? fmt(p.referenceCalories, 0) + ' kcal' : '未测算'} · 训练日 ${fmt(range.trainingDay.min, 0)}~${fmt(range.trainingDay.max, 0)} kcal · 休息日 ${fmt(range.restDay.min, 0)}~${fmt(range.restDay.max, 0)} kcal`,
      `今日按${trainingToday ? '训练日' : '休息日'}：${trainingToday ? fmt(range.trainingDay.min, 0) + '~' + fmt(range.trainingDay.max, 0) : fmt(range.restDay.min, 0) + '~' + fmt(range.restDay.max, 0)} kcal（记录页保存训练动作后自动切换）`,
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
    if (!await askConfirm('重新走一遍档案向导（目标、身体、训练、连接）。已有记录不会被删除。继续吗？', {title: '重新设置档案', ok: '开始设置'})) return;
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
      return `<div class="meal-row list-row" role="listitem" data-long-press="meal:${esc(meal.id ?? '')}"><div class="row-body"><div class="row-head"><strong>${esc(stripQuickTag(meal.name) || '未命名餐食')}</strong>`
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
      return `<div class="meal-day"><div class="meal-day-head"><strong>${esc(mealDayLabel(day))}</strong><span>${list.length} 餐 · ${fmt(kcal, 0)} kcal</span></div>${mealRowsHtml(list, false)}</div>`;
    }).join('');
    const toggle = rows.length > RECORD_MEALS_COLLAPSED
      ? `<button type="button" class="button subtle" id="record-meals-toggle">${recordMealsExpanded ? '收起' : `显示全部 ${rows.length} 条`}</button>`
      : '';
    container.innerHTML = html + toggle;
    $('#record-meals-toggle')?.addEventListener('click', () => {recordMealsExpanded = !recordMealsExpanded; renderRecordMeals(rows);});
  }
  /** 10-18 for this year, 2025-10-18 otherwise. */
  function mealDayLabel(day) {
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
  /**
   * 当天算不算训练日：只看「有没有保存训练动作」（2026-11-18 用户要求：训练情况由动作判断，
   * 不再让用户在「日常习惯」里手填）。动作删空就自动回落成休息日。
   */
  function trainedOn(date) {
    return exercisesFor(date).some(item => item && String(item.name || '').trim());
  }
  /**
   * The measurement row for a date. 同一天只该有一行：写之前先拿到它，
   * 带上 id 就变成更新，否则「身体近况」按日期取第一条时会读到旧值（2026-11-18）。
   */
  function measurementRowFor(date) {
    const rows = (state.measurements || []).filter(row => row && row.date === date);
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
  /**
   * 自重动作（2026-11-18）：没有外部配重也能记，负重留空不算缺项。
   * 只按动作名判断，且带「负重 / 哑铃 / 杠铃 / 壶铃 / 配重 / 史密斯」的变体不算自重
   * （负重引体向上、杠铃臀桥还是要填重量）。
   */
  const BODYWEIGHT_MOVES = /(引体向上|俯卧撑|双杠臂屈伸|双臂杠屈伸|平板支撑|卷腹|悬垂举腿|山羊挺身|臀桥|自重|空手)/;
  function isBodyweightMove(name) {
    const text = String(name || '').trim();
    if (!text) return false;
    if (/(负重|加片|哑铃|杠铃|壶铃|配重|史密斯|器械)/.test(text)) return false;
    return BODYWEIGHT_MOVES.test(text);
  }
  /**
   * 复合动作（多关节、能上大重量）：组间休息要长一些。孤立动作（弯举、侧平举、下压…）短一些。
   * 只用于「休息多久」这一个判断，不参与容量与进阶（2026-11-18）。
   */
  const COMPOUND_MOVES = /(卧推|深蹲|硬拉|划船|推举|肩推|引体|下拉|腿举|臀推|臀桥|分腿蹲|保加利亚|罗马尼亚|早安式|双杠|臂屈伸|推胸|推肩|农夫|壶铃|高脚杯|硬拉)/;
  const ISOLATION_MOVES = /(侧平举|前平举|飞鸟|夹胸|弯举|下压|提踵|卷腹|平板支撑|腿屈伸|腿弯举|后束|面拉|直臂)/;
  function isCompoundMove(name) {
    const text = String(name || '').trim();
    if (!text) return false;
    if (ISOLATION_MOVES.test(text)) return false;
    return COMPOUND_MOVES.test(text);
  }
  /**
   * 一次训练的三个口径：kg 容量、总组数、自重次数。
   * 自重的次数单独计数，不乘一个假想体重去冒充 kg 容量——缺什么就报什么，但组次要进分析。
   */
  function trainingStatsOf(items) {
    const out = {volume: 0, sets: 0, bodyweightReps: 0};
    for (const item of (items || [])) {
      if (!item) continue;
      const hasDetails = Array.isArray(item.setDetails) && item.setDetails.length > 0;
      const bodyweight = isBodyweightMove(item.name);
      if (!hasDetails) {
        // 旧记录只有「组数 / 次数 / 重量」三个数：按 sets × reps × weight 计，别把它当成一组。
        const sets = number(item.sets), reps = number(item.reps), weight = number(item.weight);
        out.sets += Math.max(0, Math.round(sets || 0));
        if (!(sets > 0) || reps === null) continue;
        if (weight !== null && weight > 0) out.volume += sets * reps * weight;
        else if (bodyweight) out.bodyweightReps += sets * reps;
        continue;
      }
      out.sets += item.setDetails.length;
      for (const set of item.setDetails) {
        const reps = number(set && set.reps), weight = number(set && set.weight);
        if (reps === null) continue;
        if (weight !== null && weight > 0) out.volume += reps * weight;
        else if (bodyweight) out.bodyweightReps += reps;
      }
    }
    out.volume = Math.round(out.volume);
    out.bodyweightReps = Math.round(out.bodyweightReps);
    return out;
  }
  /** Common lifts per template, ordered the way most people train them. */
  const EXERCISE_PRESETS = {
    push: ['卧推', '器械卧推', '上斜哑铃卧推', '哑铃肩推', '侧平举', '绳索下压', '双杠臂屈伸'],
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
    const bodyweight = isBodyweightMove(item && item.name);
    // 自重动作的 0 kg 只是「没配重」的另一种写法：显示成空，别让用户看到「0 kg」以为填漏了。
    const normWeight = value => {
      const weight = number(value);
      return bodyweight && weight !== null && weight <= 0 ? null : weight;
    };
    const details = Array.isArray(item && item.setDetails) ? item.setDetails : null;
    if (details && details.length) return details.slice(0, 30).map(set => ({reps: number(set.reps), weight: normWeight(set.weight)}));
    const count = Math.max(1, Math.min(30, Math.round(number(item && item.sets) || 1)));
    return Array.from({length: count}, () => ({reps: number(item && item.reps), weight: normWeight(item && item.weight)}));
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
    if ((row.dataset.cardio || '0') === want) {refreshSetRow(row); return;}
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
    const bodyweight = isBodyweightMove($('[data-exercise="name"]', row)?.value);
    let repsTotal = 0;
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
      if (weight) {
        weight.setAttribute('aria-label', '第 ' + n + ' 组负重公斤');
        // 自重动作的负重格写「自重」：不是漏填，而是这个动作本来就没有配重（也可填负重引体用的片重）。
        weight.placeholder = bodyweight ? '自重' : '—';
        weight.closest('.set-value')?.classList.toggle('is-bodyweight', bodyweight);
      }
      repsTotal += number($('[data-set="reps"]', set)?.value) || 0;
    });
    const volume = sets.reduce((sum, set) => {
      const reps = number($('[data-set="reps"]', set)?.value), weight = number($('[data-set="weight"]', set)?.value);
      return reps !== null && weight !== null ? sum + reps * weight : sum;
    }, 0);
    const out = $('[data-set-volume]', row);
    if (out) out.textContent = volume > 0 ? fmt(volume, 0) + ' kg' : bodyweight && repsTotal > 0 ? fmt(repsTotal, 0) + ' 次' : '—';
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
    // 训练状态只认动作（2026-11-18）：「已练 · 动作未填」这个状态随手填开关一起消失，
    // 旧数据里残留的 training:true 不再被当成练过。
    if (tag) tag.textContent = exercises.length ? `${TRAINING_TEMPLATES[template]} · ${exercises.length} 个动作` : '未记录';
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
    const stats = typeof trainingStatsOf === 'function' ? trainingStatsOf(items) : {volume: trainingVolumeOf(items), sets: 0, bodyweightReps: 0};
    const volume = stats.volume;
    const sets = stats.sets || (items || []).reduce((sum, item) => sum + (Array.isArray(item.setDetails) ? item.setDetails.length : (number(item.sets) || 0)), 0);
    const previous = (state.habits || [])
      .filter(row => row && row.date < activeDate && Array.isArray(row.exercises) && row.exercises.length)
      .sort((a, b) => String(b.date).localeCompare(String(a.date)))[0];
    const before = previous ? trainingVolumeOf(previous.exercises) : null;
    const delta = before === null ? null : volume - before;
    // 自重课没有 kg 容量：不拿「容量 0」去和上次比，改成比次数。
    const bodyweightOnly = volume === 0 && stats.bodyweightReps > 0;
    const next = bodyweightOnly
      ? '自重动作：下次同动作每组 +1 次，或最后一组加 1 组。'
      : delta === null ? '下次同动作先持平，把每组次数做满。'
      : delta >= 0 ? '下次同动作试 +2.5 kg，或最后一组 +1 次。'
      : '这次容量低于上次；下次先把动作做满，不急着加重。';
    const runs = (items || []).filter(item => item && item.cardio);
    const runKm = runs.reduce((sum, item) => sum + (number(item.distanceKm) || 0), 0);
    const runMin = runs.reduce((sum, item) => sum + (number(item.durationMin) || 0), 0);
    box.innerHTML = `<p class="plan-label">本次训练</p><div class="overview-grid"><div class="overview-stat"><small>容量</small><strong>${bodyweightOnly ? '—' : fmt(volume, 0)}<span>${bodyweightOnly ? ' 自重课' : ' kg'}</span></strong></div>`
      + `<div class="overview-stat"><small>组数</small><strong>${sets}<span> 组</span></strong></div>`
      + `<div class="overview-stat"><small>对比上次</small><strong>${bodyweightOnly ? '首次' : delta === null ? '首次' : (delta >= 0 ? '+' : '') + fmt(delta, 0)}<span>${bodyweightOnly ? '' : delta === null ? '' : ' kg'}</span></strong></div></div>`
      + (stats.bodyweightReps > 0 ? `<p class="fine-print">自重 ${fmt(stats.bodyweightReps, 0)} 次（按次数计，不折算成 kg）。</p>` : '')
      + (runs.length ? `<p class="fine-print">有氧：${runKm ? fmt(runKm, 1) + ' km' : ''}${runKm && runMin ? ' · ' : ''}${runMin ? fmt(runMin, 0) + ' 分钟' : ''}</p>` : '')
      + `<p class="fine-print">${next}</p>`;
    box.hidden = false;
  }
  /** Saves the log onto the day's habit row, preserving every other field it already carries. */
  async function saveTrainingLog() {
    const form = $('#training-form'), message = $('.form-feedback', form), button = $('button[type=submit]', form);
    const exercises = readTrainingExercises();
    // 力量行要求每组「次数」；负重只有配重动作才必填——自重动作（引体、俯卧撑、平板支撑…）留空即可。
    const invalid = exercises.find(item => {
      if (!item.name) return true;
      if (item.cardio) return !(number(item.distanceKm) > 0 || number(item.durationMin) > 0);
      const bodyweight = isBodyweightMove(item.name);
      return !item.setDetails.length || item.setDetails.some(set => set.reps === null || (!bodyweight && set.weight === null));
    });
    if (invalid) {
      const row = $$('[data-exercise-row]', form).find(node => {
        const name = $('[data-exercise="name"]', node).value.trim();
        if (!name) return true;
        if (node.dataset.cardio === '1') {
          return !(number($('[data-cardio="distance"]', node)?.value) > 0 || number($('[data-cardio="minutes"]', node)?.value) > 0);
        }
        const sets = $$('[data-set-row]', node);
        const bodyweight = isBodyweightMove(name);
        return !sets.length || sets.some(set => number($('[data-set="reps"]', set).value) === null || (!bodyweight && number($('[data-set="weight"]', set).value) === null));
      });
      const cardio = row?.dataset.cardio === '1';
      const bodyweightRow = !cardio && row ? isBodyweightMove($('[data-exercise="name"]', row)?.value) : false;
      const missing = !row ? []
        : cardio
          ? $$('[data-cardio="distance"], [data-cardio="minutes"]', row).filter(field => !(number(field.value) > 0))
          : $$(bodyweightRow ? '[data-set="reps"]' : '[data-set="reps"], [data-set="weight"]', row).filter(field => number(field.value) === null);
      if (cardio) missing.forEach(field => markFieldInvalid(field, '至少填距离或时长。'));
      else missing.forEach(field => markFieldInvalid(field, '请补全这一组。'));
      feedback(message, cardio
        ? '有氧动作至少填距离或时长；不想记的动作请先移除。'
        : '每个动作至少一组、每组填次数；配重动作还要填负重，自重动作负重留空即可。', true);
      missing[0]?.focus();
      return;
    }
    if (!exercises.length) {feedback(message, '还没有动作可保存；可以先用「清空今天的训练」。', true); return;}
    // 2026-11-17：训练也加一步核对（身体保持直存）。先把这次会存进去的内容说清，再落库。
    const setsCount = exercises.reduce((sum, item) => sum + (Array.isArray(item.setDetails) ? item.setDetails.length : (number(item.sets) || 0)), 0);
    const stats = trainingStatsOf(exercises);
    const volume = stats.volume;
    const runKm = exercises.reduce((sum, item) => sum + (number(item.distanceKm) || 0), 0);
    const runMin = exercises.reduce((sum, item) => sum + (number(item.durationMin) || 0), 0);
    const summary = exercises.length + ' 个动作'
      + (setsCount > 0 ? ' · ' + setsCount + ' 组' : '')
      + (volume > 0 ? ' · 容量 ' + fmt(volume, 0) + ' kg' : '')
      + (stats.bodyweightReps > 0 ? ' · 自重 ' + fmt(stats.bodyweightReps, 0) + ' 次' : '')
      + (runKm > 0 || runMin > 0 ? ' · 有氧 ' + [runKm > 0 ? fmt(runKm, 1) + ' km' : '', runMin > 0 ? fmt(runMin, 0) + ' 分钟' : ''].filter(Boolean).join(' · ') : '');
    if (!await askConfirm(summary, {title: '核对后保存', ok: '确认保存'})) return;
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
