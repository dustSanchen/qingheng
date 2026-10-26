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
      goal: g('goal') || 'recomp',
      training: $('#ob-training').value === '' ? null : Number($('#ob-training').value)
    };
  }
  function obSyncTargets() {
    const values = obValues();
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
      $('#profile-form').elements.sex.value = values.sex;
      $('#profile-form').elements.height.value = values.height;
      $('#profile-form').elements.age.value = values.age ?? '';
      $('#profile-form').elements.goal.value = values.goal;
      $('#profile-form').elements.weight.value = values.weight;
      $('#profile-form').elements.training.value = values.training === null ? '' : String(values.training);
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
    const p = state.profile || {};
    if (number(p.calorieTarget) === null) {
      node.className = 'target-status empty';
      node.textContent = '尚未测算。填写身高、体重、年龄与每周训练次数后点「按目标重新测算」。';
      return;
    }
    node.className = 'target-status';
    const goal = GOAL_LABEL[p.goal] || '未设置目标';
    const temporary = targetAdjustmentForDate(localDate());
    const rules = targetRules(p);
    const missing = [];
    if (number(p.age) === null) missing.push('年龄');
    if (number(p.training) === null) missing.push('每周训练次数');
    const trainingToday = (state.habits || []).some(row => row.date === localDate() && (row.training === true || row.training === 'true'));
    node.textContent = [
      `当前目标：${goal}`,
      `维持热量 ${number(p.referenceCalories) !== null ? fmt(p.referenceCalories, 0) + ' kcal' : '未测算'} · 训练日 ${fmt(rules.trainingDayMin, 0)}~${fmt(rules.trainingDayMax, 0)} kcal · 休息日 ${fmt(rules.restDayMin, 0)}~${fmt(rules.restDayMax, 0)} kcal`,
      `今日按${trainingToday ? '训练日' : '休息日'}：${trainingToday ? fmt(rules.trainingDayMin, 0) + '~' + fmt(rules.trainingDayMax, 0) : fmt(rules.restDayMin, 0) + '~' + fmt(rules.restDayMax, 0)} kcal（在记录页把当天标为「已训练」后自动切换）`,
      `蛋白质 ${fmt(p.proteinMin, 0)}~${fmt(p.proteinMax, 0)} g · 脂肪 ${fmt(p.fatMin, 0)}~${fmt(p.fatMax, 0)} g · 摄入硬底线 ${fmt(rules.intakeFloor, 0)} kcal`,
      ...(missing.length ? [`⚠ 还缺 ${missing.join('、')}：现在的数字是按默认值算的，补齐后点「按目标重新测算」。`] : []),
      ...(temporary ? [`今日临时目标：热量 ${fmt(temporary.temporary.calorieTarget, 0)} kcal · 脂肪上限 ${fmt(temporary.temporary.fatMax, 0)} g；原目标不变，明日结束后恢复。`] : []),
      '口径与阈值可在下方「口径与手动调整」中修改，改完点「按目标重新测算」。'
    ].join('\n');
  }
  $('#profile-goal').addEventListener('change', () => {
    const form = $('#profile-form');
    form.elements.weight.value = form.elements.weight.value || latestWeight() || '';
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
    const goal = form.elements.goal.value || 'recomp';
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
  $('#ob-training').addEventListener('change', obSyncTargets);
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
        + `<div class="row-meta">${clock ? `<span>${clock}</span>` : ''}`
        + `<span>蛋 <b>${fmt(meal.protein)}</b></span><span>脂 <b>${fmt(meal.fat)}</b></span><span>碳 <b>${fmt(meal.carbs)}</b></span>`
        + `${oilLabel(meal)}`
        + `${photo ? `<span>${photo}</span>` : ''}</div></div>`
        + `<div class="row-side"><span class="row-kcal">${fmt(meal.calories,0)} <small>kcal</small></span></div></div>`;
    }).join('');
  }
  function renderMeals(container, meals, showDate) {
    container.innerHTML = meals.length ? mealRowsHtml(meals, showDate) : empty('还没有餐食记录。记下第一餐，从了解自己开始。');
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
    if (!rows.length) { container.innerHTML = empty('还没有餐食记录。记下第一餐，从了解自己开始。'); return; }
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
      const arrow = flat ? '' : `<span class="inline-icon" aria-hidden="true"><img src="./icon-nav-trends.svg" alt="" width="15" height="15" style="transform:${diff > 0 ? 'none' : 'scale(-1,-1)'}"></span>`;
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
  function renderTrends() {
    const range = $('#trend-range').value;
    const cutoff = range === 'all' ? -Infinity : dayTime(activeDate)-(Number(range)-1)*86400000;
    const records = state.measurements.filter(record => validDate(record.date) && record.date <= activeDate && dayTime(record.date)>=cutoff).sort((a,b) => a.date.localeCompare(b.date));
    const points = records.filter(record => number(record.weight)!==null && Number(record.weight)>0);
    const height = number(state.profile.height);
    $('#measurement-history').innerHTML = records.length ? [...records].reverse().map(item => `<tr><td>${esc(item.date)}</td><td>${fmt(item.weight)}</td><td>${fmt(item.waist)}</td><td>${fmt(item.bodyFat)}</td><td>${fmt(item.muscle)}</td><td>${fmt(number(item.weight)!==null && height>0 ? item.weight / ((height/100)**2) : null)}</td></tr>`).join('') : '<tr><td colspan="6">这个范围内尚无测量记录。缺失数值显示为 —。</td></tr>';
    // Body-composition comparison, computed locally: the previous 30-day window versus the last
    // 30 days. It reports direction only, never a medical verdict, and shows — for missing values.
    $('#stats-table').innerHTML = statsTableHtml();
    if (!points.length) {$('#weight-chart').innerHTML = empty('还没有可绘制的体重数据。开始记录，让变化慢慢浮现。'); $('#trend-stats').innerHTML = ''; return;}
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
    const minWeight=Math.min(...weights),maxWeight=Math.max(...weights), pad=Math.max(.6,(maxWeight-minWeight)*.22), low=Math.max(0,minWeight-pad), high=maxWeight+pad;
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
      .map(entry => [x(entry.week), y(entry.mean)]);
    const meanPath = meanCoords.length > 1 ? `<path class="chart-line chart-mean" d="${meanCoords.map(([px,py],index) => `${index?'L':'M'}${px.toFixed(2)},${py.toFixed(2)}`).join(' ')}"/>` : '';
    $('#weight-chart').innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="chart-title chart-desc"><title id="chart-title">按真实日期绘制的体重趋势</title><desc id="chart-desc">${esc(points.map(item => `${item.date}：${fmt(item.weight)}公斤`).join('；'))}${weeklyNote ? `；${esc(weeklyNote)}` : ''}</desc><defs><linearGradient id="weight-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#a7c2a3" stop-opacity=".3"/><stop offset="100%" stop-color="#a7c2a3" stop-opacity=".015"/></linearGradient></defs>${grid}${points.length>1 ? `<path class="chart-area" d="${path} L${coords[coords.length-1][0]},${H-B} L${coords[0][0]},${H-B} Z"/><path class="chart-line" d="${path}"/>` : ''}${meanPath}${points.map((item,i) => `<circle class="chart-point" cx="${coords[i][0]}" cy="${coords[i][1]}" r="5"><title>${esc(item.date)} · ${fmt(item.weight)} kg</title></circle>`).join('')}${values}${labels}</svg>`;
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
      name: String(item?.name ?? '').slice(0, 60),
      sets: number(item?.sets), reps: number(item?.reps), weight: number(item?.weight)
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
  /** Adds one exercise row, optionally pre-filled; shared by the 添加动作 button and the preset chips. */
  function appendExerciseRow(name, values) {
    const box = $('#training-exercises');
    if (!box) return null;
    const index = box.querySelectorAll('[data-exercise-row]').length;
    if (index >= 12) {notice('一次最多记录 12 个动作。', true); return null;}
    const row = document.createElement('div');
    row.className = 'training-row';
    row.dataset.exerciseRow = String(index);
    const attr = value => value === null || value === undefined ? '' : ` value="${Number(value)}"`;
    row.innerHTML = `<label>动作<input data-exercise="name" maxlength="60" placeholder="例如 深蹲" value="${esc(name || '')}"></label><div class="form-grid"><label>组数<input data-exercise="sets" type="number" min="0" max="30" step="1"${attr(values && values.sets)}></label><label>每组次数<input data-exercise="reps" type="number" min="0" max="200" step="1"${attr(values && values.reps)}></label><label>负重 · kg<input data-exercise="weight" type="number" min="0" max="500" step="0.5"${attr(values && values.weight)}></label></div><div class="row-meta"><span>容量 —</span><button type="button" class="icon-button danger" data-exercise-remove="${index}" aria-label="移除这个动作">×</button></div>`;
    box.append(row);
    return row;
  }
  /** Chips for the selected template. */
  function renderTrainingPresets() {
    const box = $('#training-presets'), form = $('#training-form');
    if (!box || !form) return;
    const template = TRAINING_TEMPLATES[form.elements.template.value] ? form.elements.template.value : 'push';
    box.innerHTML = (EXERCISE_PRESETS[template] || []).map(name => `<button type="button" class="button subtle" data-training-preset="${esc(name)}">${esc(name)}</button>`).join('');
    box.dataset.template = template;
  }
  function renderTrainingLog() {
    const form = $('#training-form');
    if (!form) return;
    const row = habitRowFor(activeDate);
    const exercises = exercisesFor(activeDate);
    const template = TRAINING_TEMPLATES[row?.template] ? row.template : 'push';
    if (document.activeElement !== form.elements.template) form.elements.template.value = template;
    const box = $('#training-exercises');
    const rows = exercises.length ? exercises : [{name: '', sets: null, reps: null, weight: null}];
    box.innerHTML = rows.map((item, index) => `<div class="training-row" data-exercise-row="${index}"><label>动作<input data-exercise="name" value="${esc(item.name)}" maxlength="60" placeholder="例如 卧推"></label><div class="form-grid"><label>组数<input data-exercise="sets" type="number" min="0" max="30" step="1" value="${item.sets ?? ''}"></label><label>每组次数<input data-exercise="reps" type="number" min="0" max="200" step="1" value="${item.reps ?? ''}"></label><label>负重 · kg<input data-exercise="weight" type="number" min="0" max="500" step="0.5" value="${item.weight ?? ''}"></label></div><div class="row-meta"><span>${number(item.distanceKm) !== null ? `${fmt(item.distanceKm)} km` : `容量 ${exerciseVolume(item) === null ? '—' : `${fmt(exerciseVolume(item), 0)} kg`}`}${number(item.durationMin) !== null ? ` · ${fmt(item.durationMin, 0)} 分钟` : ''}</span><button type="button" class="icon-button danger" data-exercise-remove="${index}" aria-label="移除这个动作">×</button></div></div>`).join('');
    renderTrainingPresets();
    const tag = $('#training-tag');
    if (tag) tag.textContent = exercises.length ? `${TRAINING_TEMPLATES[template]} · ${exercises.length} 个动作` : row?.training === true ? '已标记训练' : '未记录';
  }
  function readTrainingExercises() {
    const box = $('#training-exercises');
    return [...box.querySelectorAll('[data-exercise-row]')].map(row => ({
      name: $('[data-exercise="name"]', row).value.trim().slice(0, 60),
      sets: number($('[data-exercise="sets"]', row).value),
      reps: number($('[data-exercise="reps"]', row).value),
      weight: number($('[data-exercise="weight"]', row).value)
    })).map((item, index) => {
      // Runs carry distance/duration instead of sets/reps/weight; keep them across edits.
      const previous = exercisesFor(activeDate)[index];
      if (previous && (number(previous.distanceKm) !== null || number(previous.durationMin) !== null)) {
        item.distanceKm = number(previous.distanceKm);
        item.durationMin = number(previous.durationMin);
      }
      return item;
    }).filter(item => item.name || item.sets !== null || item.reps !== null || item.weight !== null || item.distanceKm != null || item.durationMin != null);
  }
  /** Saves the log onto the day's habit row, preserving every other field it already carries. */
  async function saveTrainingLog() {
    const form = $('#training-form'), message = $('.form-feedback', form), button = $('button[type=submit]', form);
    const exercises = readTrainingExercises();
    const incomplete = exercises.find(item => !item.name || item.sets === null || item.reps === null || item.weight === null);
    if (incomplete) {
      const row = $$('[data-exercise-row]', form).find(node => {
        const name = $('[data-exercise="name"]', node).value.trim();
        const sets = number($('[data-exercise="sets"]', node).value);
        const reps = number($('[data-exercise="reps"]', node).value);
        const weight = number($('[data-exercise="weight"]', node).value);
        return !name || sets === null || reps === null || weight === null;
      });
      const missing = row ? ['name', 'sets', 'reps', 'weight'].map(key => $('[data-exercise="' + key + '"]', row)).filter(field => field && (field.dataset.exercise === 'name' ? !field.value.trim() : number(field.value) === null)) : [];
      missing.forEach(field => markFieldInvalid(field, '请补全这个动作的记录。'));
      feedback(message, '每个动作都要填完整：名称、组数、次数、负重；不想记的动作请先移除。', true);
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
        const volume = exerciseVolume(item);
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
