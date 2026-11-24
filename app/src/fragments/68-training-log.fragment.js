/* Fragment of assets/app.js -- assembled by tools/assemble-app.ps1 in filename order.
 * Edit this file, never the generated assets/app.js; tests/app-fragments.test.mjs fails on drift. */
  // ---------------------------------------------------------------------------------------------
  // 训练日志：动作行 / 组次 / 草稿 / 保存弹窗 / 课后总结 / 训练概览 / 容量表 / 事件绑定
  // 视图与它自己的交互放在一处；纯计算在 55-training-domain，计划与清单在 60，休息计时在 70。
  // ---------------------------------------------------------------------------------------------

  /** Common lifts per template, ordered the way most people train them. */
  const EXERCISE_PRESETS = {
    push: ['卧推', '器械卧推', '上斜哑铃卧推', '哑铃肩推', '侧平举', '绳索下压', '双杠臂屈伸'],
    pull: ['引体向上', '杠铃划船', '高位下拉', '面拉', '哑铃弯举', '直臂下压'],
    legs: ['深蹲', '硬拉', '腿举', '保加利亚分腿蹲', '罗马尼亚硬拉', '提踵', '卷腹', '平板支撑'],
    other: ['农夫行走', '壶铃摇摆', '有氧 20 分钟', '拉伸 10 分钟']
  };

  /**
    * 训练表单只活在 DOM 里，但趋势页等路径会重建它（renderTrends → renderTrainingLog）。
    * 这里按日期留一份内存草稿：输入/勾组就记，重建时优先还原，保存或清空后丢弃。
    */
  const trainingDrafts = new Map();

  /**
   * 「今天不再按计划播种」的标记：以前只写在 DOM（form.dataset.seedMuted），刷新就丢，
   * 清空训练后重新打开又会把计划动作播回来。现在按日存一份「当时那份清单的动作名」，
   * 只有清单没变时才抑制播种——换了新清单（重排今天 / 采纳周计划）就照常播。
   */
  function seedMutedKey(date = activeDate) { return 'qingheng.seedMuted.' + date; }

  function seedMutedFor(plan) {
    try {
      const raw = localStorage.getItem(seedMutedKey());
      if (!raw) return false;
      const saved = JSON.parse(raw);
      const names = (Array.isArray(plan) ? plan : []).filter(item => item && item.name).map(item => String(item.name));
      return Array.isArray(saved) && saved.length === names.length && saved.every((name, index) => name === names[index]);
    } catch { return false; }
  }

  function markSeedMuted(plan) {
    try {
      const names = (Array.isArray(plan) ? plan : []).filter(item => item && item.name).map(item => String(item.name));
      localStorage.setItem(seedMutedKey(), JSON.stringify(names));
    } catch {}
  }
  /** 撤销清空时把「今天不按计划走」也撤回，让计划动作重新播种。 */
  function clearSeedMuted(date = activeDate) {
    try { localStorage.removeItem(seedMutedKey(date)); } catch {}
  }

  /** 卡面右上角的极轻状态：草稿暂存 / 已记录（2026-11-23）。 */
  function setDraftState(text) {
    const node = $('#training-draft-state');
    if (node) node.textContent = text || '';
  }

  // 清空的 4 秒撤销：只暂存当天 habit 行（清空不动 aiPlan），撤销时整条写回。
  let undoClearTimer = 0, undoClearRow = null, undoClearDate = '';
  function hideTrainingUndo() {
    const node = $('#training-undo');
    if (node) node.hidden = true;
    if (undoClearTimer) { clearTimeout(undoClearTimer); undoClearTimer = 0; }
    undoClearRow = null;
    undoClearDate = '';
  }
  function showTrainingUndo(row) {
    const node = $('#training-undo');
    if (!node) return;
    undoClearRow = row || null;
    undoClearDate = activeDate;
    node.hidden = false;
    if (undoClearTimer) clearTimeout(undoClearTimer);
    // 4 秒后自动收起；期间不做别的事情的渲染不会打断它。
    undoClearTimer = setTimeout(hideTrainingUndo, 4000);
  }
  async function undoClearTraining() {
    const row = undoClearRow;
    hideTrainingUndo();
    if (!row) { notice('没有可恢复的训练记录。'); return; }
    try {
      await api('/api/habits', {...row, date: activeDate});
      await loadState({quiet: true});
      clearSeedMuted();
      renderTrainingLog();
      notice('已恢复清空前的训练记录。');
    } catch (error) { notice(error.message, true); }
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
    if (details && details.length) return details.slice(0, 30).map(set => ({reps: number(set.reps), weight: normWeight(set.weight), done: set.done === true}));
    const count = Math.max(1, Math.min(30, Math.round(number(item && item.sets) || 1)));
    return Array.from({length: count}, () => ({reps: number(item && item.reps), weight: normWeight(item && item.weight)}));
  }

  function setRowHtml(set, index) {
    const n = index + 1;
    const value = v => v === null || v === undefined ? '' : ` value="${Number(v)}"`;
    // 2026-11-11 晚：这里不再是一张表（表头 + 两个输入框），而是一行手账：
    // 「◯ 1  10 次 × 60 kg   ×」，数字本身就是主角，单位只跟一次，改数时只有一条下划线出现。
    return `<div class="set-row${set && set.done ? ' is-done' : ''}" data-set-row><button type="button" class="set-check" data-set-done aria-pressed="${set && set.done ? 'true' : 'false'}" aria-label="标记第 ${n} 组完成">✓</button>`
      + `<span class="set-no" aria-hidden="true">${n}</span>`
      + `<span class="set-values">`
      + `<label class="set-value"><input data-set="reps" type="number" inputmode="numeric" min="0" max="200" step="1" aria-label="第 ${n} 组次数" placeholder="—"${value(set.reps)}><small>次</small></label>`
      + `<span class="set-times" aria-hidden="true">×</span>`
      + `<label class="set-value is-kg"><input data-set="weight" type="number" inputmode="decimal" min="0" max="500" step="0.5" aria-label="第 ${n} 组负重公斤" placeholder="—"${value(set.weight)}><small>kg</small></label>`
      + `</span>`
      + `<button type="button" class="set-remove" data-set-remove aria-label="移除第 ${n} 组">×</button></div>`;
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
    // 行的身份要写回 DOM：planIndex 决定勾组后回写哪一条今日清单，fromPlan 决定取消勾选时能不能回收。
    // 缺了这两个属性，表单一旦重建（切日期 / 切页）就再也认不出这行，清单完成度永远停在原地。
    const planAttr = item.planIndex === null || item.planIndex === undefined ? '' : ` data-plan-index="${Number(item.planIndex)}"`;
    const fromAttr = item.fromPlan ? ' data-from-plan="1"' : '';
    return `<div class="training-row" data-exercise-row="${index}" data-exercise-id="${esc(item.id || '')}" data-cardio="${cardio ? 1 : 0}"${planAttr}${fromAttr}>`
      + `<div class="exercise-row-head"><span class="exercise-no" aria-hidden="true">${n}</span>`
      + `<div class="exercise-name-row${item.name ? ' is-locked' : ''}">${item.weightApprox ? '<span class="exercise-approx" title="重量是按体重推算的起步值，练完一次按实际校准">约</span>' : ''}<input data-exercise="name" value="${esc(item.name || '')}" maxlength="60" placeholder="动作名，例如卧推" aria-label="第 ${n} 个动作名称"${item.name ? ' readonly' : ''}><button type="button" class="exercise-name-open" data-exercise-open aria-haspopup="dialog" aria-label="查看动作说明：${esc(item.name || '')}">${esc(item.name || '')}</button><button type="button" class="exercise-name-edit" data-exercise-edit aria-label="修改动作名称">改</button><button type="button" class="exercise-bodyweight" data-exercise-bodyweight aria-pressed="${isBodyweightMove(item.name) ? 'true' : 'false'}" title="标为自重动作：不填负重也算完整">${isBodyweightMove(item.name) ? '自重 ✓' : '自重'}</button></div>`
      + `<button type="button" class="text-button exercise-remove" data-exercise-remove="${index}" aria-label="移除这个动作">移除</button></div>`
      + `<div class="set-list" data-set-list>${body}</div>`
      + `<div class="set-foot">${foot}</div>`
      // 练完的动作收成一行成就摘要（2026-11-23）：只在全部组勾完且不止一个动作时显示。
      + `<div class="exercise-done-line" data-done-line><span class="exercise-done-mark" aria-hidden="true">✓</span><span data-done-text></span>`
      + `<button type="button" class="text-button" data-done-expand aria-label="展开这个动作的组次">展开</button></div></div>`;
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
    refreshCompletionState();
  }

  /**
   * 全部组勾完后把动作收成一行「✓ 名称 · N 组 · 容量 X kg」；点「展开」或改动任一组就展开。
   * 收起只是 CSS 收起——组次输入仍在 DOM 里，保存与草稿照常读得到。
   */
  function refreshCompletionState() {
    const box = $('#training-exercises');
    if (!box) return;
    const rows = $$('[data-exercise-row]', box);
    rows.forEach(row => {
      if (row.dataset.cardio === '1') { row.classList.remove('is-complete'); return; }
      const sets = $$('[data-set-row]', row);
      const name = String($('[data-exercise="name"]', row)?.value || '').trim();
      const allDone = sets.length > 0
        && sets.every(set => $('[data-set-done]', set)?.getAttribute('aria-pressed') === 'true');
      // 只有一个动作时不收：刚练完就消失会让人以为记录丢了。
      const collapse = allDone && rows.length >= 2 && !!name && row.dataset.expanded !== '1';
      const line = $('[data-done-line]', row);
      if (line) {
        const volume = $('[data-set-volume]', row)?.textContent || '—';
        const text = $('[data-done-text]', line);
        if (text) text.textContent = `${name} · ${sets.length} 组 · 容量 ${volume}`;
      }
      row.classList.toggle('is-complete', collapse);
    });
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

  /**
   * 计划 → 执行区预填（2026-11-22 四模块清单之二）：只产数据、不写库，
   * 用户核对后点「保存训练」才落。优先用今天 AI 排的未完成动作，其次用本周计划当天的动作。
   */
  function seedExercisesFromPlan(date) {
    if (typeof trainingEnabled === 'function' && !trainingEnabled()) return [];
    let plan = [];
    if (typeof aiPlanStore === 'function') {
      try { plan = aiPlanStore(date) || []; } catch { plan = []; }
    }
    const pending = plan.map((item, index) => ({item, index}))
      .filter(row => row.item && row.item.name && row.item.done !== true);
    if (pending.length) {
      // planIndex 指向 aiPlanStore 里的原始下标：清单里已有做完的动作时，播种行的序号不等于清单下标。
      return pending.map(({item, index}) => ({name: item.name, planIndex: index, sets: item.sets || 1, reps: item.reps || null, weight: item.weight ?? null,
        ...(item.weightApprox ? {weightApprox: true} : {})}));
    }
    const week = typeof cachedWeekPlan === 'function' ? cachedWeekPlan() : null;
    const day = week && Array.isArray(week.days) ? week.days.find(row => row && row.date === date) : null;
    if (day && Array.isArray(day.exercises) && day.exercises.length) {
      return day.exercises.map(item => ({name: item.name, sets: item.sets || 1, reps: item.reps || null, weight: item.weight ?? null,
        ...(item.weightApprox ? {weightApprox: true} : {})}));
    }
    return [];
  }

  function draftRowsFromForm() {
    const box = $('#training-exercises');
    if (!box) return null;
    const rows = [...box.querySelectorAll('[data-exercise-row]')].map(row => {
      const name = ($('[data-exercise="name"]', row)?.value || '').trim();
      if (!name) return null;
      // 草稿必须带住行的身份：id 用于对位、planIndex 用于回写今日清单、weightApprox 决定要不要显示「约」、
      // fromPlan 决定取消勾选时能不能回收。以前只存 name + setDetails，重渲染后这四样全丢。
      const meta = {
        id: row.dataset.exerciseId || '',
        ...(row.dataset.planIndex === undefined || row.dataset.planIndex === '' ? {} : {planIndex: Number(row.dataset.planIndex)}),
        ...(row.dataset.fromPlan === '1' ? {fromPlan: true} : {}),
        ...($('.exercise-approx', row) ? {weightApprox: true} : {})
      };
      if (row.dataset.cardio === '1') {
        return {...meta, name, distanceKm: number($('[data-cardio="distance"]', row)?.value), durationMin: number($('[data-cardio="minutes"]', row)?.value)};
      }
      const setDetails = [...row.querySelectorAll('[data-set-row]')].map(set => ({
        reps: number($('[data-set="reps"]', set)?.value),
        weight: number($('[data-set="weight"]', set)?.value),
        done: $('[data-set-done]', set)?.getAttribute('aria-pressed') === 'true'
      }));
      return {...meta, name, setDetails};
    }).filter(Boolean);
    return rows.length ? rows : null;
  }

  function rememberTrainingDraft() {
    const rows = draftRowsFromForm();
    if (rows) trainingDrafts.set(activeDate, rows);
    else trainingDrafts.delete(activeDate);
    setDraftState(rows ? '已暂存' : '');
  }

  function forgetTrainingDraft() { trainingDrafts.delete(activeDate); }

  function renderTrainingLog(rowsOverride = null) {
    const form = $('#training-form');
    if (!form) return;
    // 强度反馈只在结束训练弹窗里问一次（2026-11-23 删掉卡片底部那一行），这里不再刷新行内档位。
    const row = habitRowFor(activeDate);
    const exercises = exercisesFor(activeDate);
    const box = $('#training-exercises');
    // 2026-11-22：今天还没记动作时，把计划播成可打卡的行（每组带 ○）。清空或保存后不再自动播。
    // 2026-11-23 Phase 2：抑制标记按「清单快照」持久化，刷新后不会把清掉的动作又播回来。
    const planNow = typeof aiPlanStore === 'function' ? (aiPlanStore(activeDate) || []) : [];
    const muted = seedMutedFor(planNow);
    const seeds = exercises.length || muted ? [] : seedExercisesFromPlan(activeDate);
    const draft = trainingDrafts.get(activeDate);
    const rows = Array.isArray(rowsOverride) ? rowsOverride
      : (draft && draft.length ? draft : (exercises.length ? exercises : (seeds.length ? seeds : [{name: '', sets: 1, reps: null, weight: null}])));
    // 换一天就收起上一天残留的「撤销」条。
    if (undoClearRow && undoClearDate !== activeDate) hideTrainingUndo();
    // 模板跟着动作走（2026-11-23）：播种 / 照上次练 / 周计划带进来的动作决定顶部模板；
    // 用户在当天手选过模板就不再覆盖（form.dataset.templateTouched = 当天日期）。
    const touched = form.dataset.templateTouched === activeDate;
    const storedTemplate = TRAINING_TEMPLATES[row?.template] ? row.template : null;
    const autoTemplate = typeof dominantTemplateFor === 'function'
      ? dominantTemplateFor(rows.map(item => String(item && item.name || '').trim())) : null;
    const template = touched
      ? (TRAINING_TEMPLATES[form.elements.template.value] ? form.elements.template.value : 'push')
      : (storedTemplate || autoTemplate || 'push');
    if (!touched && document.activeElement !== form.elements.template) form.elements.template.value = template;
    box.innerHTML = rows.map(exerciseRowHtml).join('');
    // planIndex 由 exerciseRowHtml 直接写在行上（来自种子或草稿），不再按渲染序号补写：
    // 草稿里用户可能加过行、删过行，按序号补写会把勾组回写到错误的清单项。
    if (!box.dataset.draftWired) {
      box.dataset.draftWired = '1';
      const remember = () => rememberTrainingDraft();
      box.addEventListener('input', remember);
      box.addEventListener('change', remember);
      box.addEventListener('focusout', remember);
      // 勾组 / 加组 / 删组走 click，等 DOM 更新完再记一份。
      box.addEventListener('click', event => {
        if (event.target.closest('[data-set-done], [data-set-add], [data-exercise-remove]')) setTimeout(remember, 0);
      });
    }
    $$('[data-exercise-row]', box).forEach(refreshSetRow);
    $$('[data-exercise-row]', box).filter(node => node.dataset.cardio === '1').forEach(node => refreshCardioPace(node));
    renderTrainingPresets();
    const tag = $('#training-tag');
    // 训练状态只认动作（2026-11-18）；rest 是用户明确记下的「今天休息」，缺失才是「未记录」。
    const restMarked = !!row && (row.training === false || String(row.training) === 'false') && !exercises.length;
    if (tag) {
      // 播种行（只写 DOM、未落库）与已存记录要分开说：三行动作配「未记录」会让人以为播种失败。
      const seeded = !exercises.length && seeds.length > 0;
      tag.textContent = exercises.length ? `${TRAINING_TEMPLATES[template]} · ${exercises.length} 个动作`
        : seeded ? `已排入 · ${seeds.length} 个动作`
        : restMarked ? '休息日' : '未记录';
    }
    const restButton = $('#training-rest');
    if (restButton) {
      restButton.hidden = !trainingEnabled() || exercises.length > 0;
      restButton.textContent = restMarked ? '取消休息' : '记为休息';
    }
    // 换一天时，草稿状态跟着那天走（有草稿=已暂存）；保存后会再覆盖成「✓ 已记录」。
    setDraftState(trainingDrafts.get(activeDate) ? '已暂存' : '');
  }

  /** 照上一次训练预填表单（只改草稿，不落库）；主流健身 App 都靠这一下省掉重复输入。 */
  function repeatLastTraining() {
    const sessions = (state.habits || [])
      .filter(row => row && row.date < activeDate && Array.isArray(row.exercises) && row.exercises.length)
      .sort((a, b) => String(b.date).localeCompare(String(a.date)));
    if (!sessions.length) { notice('还没有可照抄的训练记录，先记一次。'); return; }
    const last = sessions[0];
    renderTrainingLog(last.exercises.map(item => ({name: item.name, sets: item.sets, reps: item.reps, weight: item.weight, distanceKm: item.distanceKm, durationMin: item.durationMin})));
    if (typeof rememberTrainingDraft === 'function') rememberTrainingDraft();
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
      // 表单按 DOM 重建时要把「这条是勾选计划加进来的」带过去，否则取消勾选就再也认不出它。
      const carried = (typeof exercisesFor === 'function' ? exercisesFor(activeDate) : [])
        .find(item => item && (item.id === id || String(item.name || '').trim() === name));
      // 行上的 data-from-plan 是草稿恢复后的唯一线索；能查回记录时以记录为准。
      const fromPlan = (row.dataset.fromPlan === '1' || (carried && carried.fromPlan === true)) ? {fromPlan: true} : {};
      if (row.dataset.cardio === '1') {
        return {...fromPlan, id, name, cardio: true, distanceKm: number($('[data-cardio="distance"]', row)?.value), durationMin: number($('[data-cardio="minutes"]', row)?.value), sets: 0, reps: null, weight: null, setDetails: []};
      }
      const setDetails = $$('[data-set-row]', row).map(set => ({
        reps: number($('[data-set="reps"]', set).value),
        weight: number($('[data-set="weight"]', set).value)
      }));
      // 外层汇总是「顶组」口径：sets = 组数、reps = 最重那组的次数、weight = 最重组的重量。
      // 容量与基线都看 setDetails，这三个数只给旧读取路径与显示用；以前是「第一组次数 × 最大重量」。
      const topSet = setDetails.reduce((best, set) => {
        if (!best) return set;
        const kg = set.weight === null ? -1 : set.weight;
        const bestKg = best.weight === null ? -1 : best.weight;
        const better = kg > bestKg || (kg === bestKg && (set.reps || 0) > (best.reps || 0));
        return better ? set : best;
      }, null);
      return {...fromPlan, id, name, setDetails, sets: setDetails.length,
        reps: topSet ? topSet.reps : null, weight: topSet ? topSet.weight : null};
    }).filter(item => item.name || item.distanceKm !== null || item.durationMin !== null || item.setDetails.some(set => set.reps !== null || set.weight !== null));
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

  /**
   * 训练计时（2026-11-22）：第一次把某组标记完成时记下起点，「结束训练」时给出实际耗时的默认值。
   * 只存本机、按日覆盖；保存成功后清掉，第二天不会沿用昨天的起点。
   */
  function sessionStartKey(date = activeDate) { return 'qingheng.sessionStart.' + date; }

  function sessionStartedAt(date = activeDate) {
    try { const raw = Number(localStorage.getItem(sessionStartKey(date))); return Number.isFinite(raw) && raw > 0 ? raw : null; } catch { return null; }
  }

  function markSessionStart(date = activeDate) {
    if (sessionStartedAt(date)) return;
    try { localStorage.setItem(sessionStartKey(date), String(Date.now())); } catch {}
  }

  function clearSessionStart(date = activeDate) {
    try { localStorage.removeItem(sessionStartKey(date)); } catch {}
  }

  /** 默认耗时（分钟）：有起点按实际、夹在 5–300 之间；没有起点就留空，不编一个数。 */
  function sessionMinutesEstimate(date = activeDate) {
    const start = sessionStartedAt(date);
    if (!start) return '';
    return String(Math.min(300, Math.max(5, Math.round((Date.now() - start) / 60000))));
  }

  /** 「结束训练」弹窗内容：汇总 + 实际耗时 + 疲劳度 + 先补记录。只拼本地数字，不接后端字符串。 */
  function trainingSaveDialogHtml(exercises) {
    const setsCount = exercises.reduce((sum, item) => sum + (Array.isArray(item.setDetails) ? item.setDetails.length : (number(item.sets) || 0)), 0);
    const stats = trainingStatsOf(exercises);
    const runKm = exercises.reduce((sum, item) => sum + (number(item.distanceKm) || 0), 0);
    const runMin = exercises.reduce((sum, item) => sum + (number(item.durationMin) || 0), 0);
    const parts = [fmt(exercises.length, 0) + ' 个动作'];
    if (setsCount) parts.push(setsCount + ' 组');
    if (stats.volume > 0) parts.push('容量 ' + fmt(stats.volume, 0) + ' kg');
    if (stats.bodyweightReps > 0) parts.push('自重 ' + fmt(stats.bodyweightReps, 0) + ' 次');
    if (runKm > 0 || runMin > 0) parts.push('有氧 ' + [runKm > 0 ? fmt(runKm, 1) + ' km' : '', runMin > 0 ? fmt(runMin, 0) + ' 分钟' : ''].filter(Boolean).join(' · '));
    const current = typeof effortFor === 'function' ? effortFor(activeDate) : null;
    const levels = typeof EFFORT_LEVELS !== 'undefined' ? EFFORT_LEVELS : [];
    const chips = levels.map(level =>
      `<button type="button" class="effort-chip" data-effort="${level}" aria-pressed="${current === level}">${EFFORT_LABELS[level]}</button>`).join('');
    // 2026-11-22：逐动作明细 + 与上次同模板训练的总容量对比——存之前先看清这一次练了什么、比上次多还是少。
    const lines = exercises.map(item => {
      const sets = Array.isArray(item.setDetails) && item.setDetails.length
        ? item.setDetails.length : (number(item.sets) || 0);
      if (item.cardio) {
        const cardio = [number(item.distanceKm) > 0 ? fmt(item.distanceKm, 1) + ' km' : '', number(item.durationMin) > 0 ? fmt(item.durationMin, 0) + ' 分钟' : ''].filter(Boolean).join(' · ');
        return {name: item.name, detail: cardio || '有氧'};
      }
      const weights = (Array.isArray(item.setDetails) ? item.setDetails : []).map(set => number(set.weight)).filter(value => value !== null && value > 0);
      const kg = weights.length ? weights.reduce((sum, value) => sum + value, 0) / weights.length : number(item.weight);
      return {name: item.name, detail: sets + ' 组' + (kg !== null && kg > 0 ? ' · ' + fmt(kg, 1) + ' kg' : '')};
    });
    const template = String(document.querySelector('#training-template')?.value || habitRowFor(activeDate)?.template || 'push');
    const previous = (state.habits || [])
      .filter(row => row && row.date < activeDate && String(row.template) === template && Array.isArray(row.exercises) && row.exercises.length)
      .sort((a, b) => String(b.date).localeCompare(String(a.date)))[0] || null;
    const previousVolume = previous ? trainingStatsOf(previous.exercises).volume : 0;
    const delta = previous && previousVolume > 0 && stats.volume > 0 ? stats.volume - previousVolume : null;
    const compare = delta === null ? ''
      : `<p class="dialog-compare">同模板上次（${esc(String(previous.date).slice(5).replace('-', '/'))}）容量 ${fmt(previousVolume, 0)} kg · 这次 ${delta >= 0 ? '+' : '−'}${fmt(Math.abs(delta), 0)} kg</p>`;
    return `<p class="dialog-summary">${esc(parts.join(' · '))}</p>`
      + `<ul class="dialog-items" aria-label="这次练了什么">${lines.map(line =>
        `<li><span>${esc(line.name)}</span><b>${esc(line.detail)}</b></li>`).join('')}</ul>`
      + compare
      + '<div class="dialog-field"><span>耗时</span><input type="number" inputmode="numeric" min="0" max="600" step="1" name="durationMin" value="' + sessionMinutesEstimate() + '" placeholder="—" aria-label="实际耗时（分钟）"><span>分钟</span></div>'
      + '<p class="dialog-field-label">今天练下来感觉如何？</p>'
      + `<div class="dialog-effort" role="group" aria-label="今天练下来感觉如何">${chips}</div>`
      + '<button type="button" class="text-button" data-dialog-fill>先补记录</button>';
  }

  /** 弹窗内的交互：疲劳度单选、先补记录（关弹窗并把焦点送回第一个没填完的组）。 */
  function wireTrainingSaveDialog() {
    const body = $('#app-dialog-body');
    if (!body) return;
    body.querySelectorAll('.effort-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        body.querySelectorAll('.effort-chip').forEach(other => other.setAttribute('aria-pressed', String(other === chip)));
      });
    });
    body.querySelector('[data-dialog-fill]')?.addEventListener('click', () => {
      closeDialog(false);
      const rows = $$('[data-set-row]');
      const empty = rows.find(row => number($('[data-set="reps"]', row)?.value) === null)
        || rows.find(row => number($('[data-set="weight"]', row)?.value) === null);
      const target = empty || $('[data-exercise="name"]') || $('#training-exercises');
      if (target && typeof target.focus === 'function') { target.scrollIntoView({block: 'center'}); target.focus({preventScroll: true}); }
    });
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
    // 2026-11-22：保存变成「结束训练」——汇总 + 实际耗时 + 疲劳度一次核对，补记录入口在弹窗里。
    const confirmPromise = askConfirm('确认后写入今天的训练记录。', {title: '结束训练', ok: '确认保存', bodyHtml: trainingSaveDialogHtml(exercises)});
    wireTrainingSaveDialog();
    if (!await confirmPromise) return;
    const dialogBody = $('#app-dialog-body');
    const durationMin = dialogBody ? number($('input[name="durationMin"]', dialogBody)?.value) : null;
    const chosenEffort = dialogBody ? $('.effort-chip[aria-pressed="true"]', dialogBody)?.dataset.effort || null : null;
    if (button.disabled) return;
    button.disabled = true;
    feedback(message, '正在保存训练…');
    try {
      const existing = habitRowFor(activeDate) || {};
      await api('/api/habits', {...existing, date: activeDate, training: true, template: form.elements.template.value, exercises,
        ...(number(durationMin) > 0 ? {durationMin: Math.round(number(durationMin))} : {})});
      // 疲劳度与日志同一次确认提交：先写日志再补 effort，失败时日志已经落地，不会丢。
      if (chosenEffort && typeof saveTrainingEffort === 'function' && effortFor(activeDate) !== chosenEffort) {
        try { await saveTrainingEffort(chosenEffort); } catch { notice('训练已保存，疲劳度没记上；下次保存时再选一次。', true); }
      }
      await loadState({quiet: true});
      clearSessionStart();
      // 真实负重写进本地重量记忆：下一次「用 AI 排今天」按它渐进（不用再靠 14 天窗口撞运气）。
      if (typeof rememberExerciseLogs === 'function') rememberExerciseLogs(exercises, activeDate);
      feedback(message, `已保存：${summary}。`);
      // 疲劳度只在结束训练弹窗里问一次（2026-11-23 删掉卡片底部那一行）：没选就不追问，不拿 toast 催。
      forgetTrainingDraft();
      renderTrainingLog();
      renderTrainingSummary(exercises);
      // 卡片右上角的微反馈：草稿变「已记录」，让人知道这次真的落库了。
      setDraftState('✓ 已记录');
      // 落库 + 界面刷新之后才广播：订阅方（今天页 / 趋势页 / AI 问答）读到的 state 已是新数据。
      QH.bus.emit(QH.EVENTS.TRAINING_SAVED, {date: activeDate});
    } catch (error) {feedback(message, error.message, true);}
    finally {button.disabled = false;}
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
      // 空值不摆一条 26px 的黑杠：交给 .is-empty 退成 muted 小字。
      stat.classList.toggle('is-empty', value === null);
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
        ? noteDay + '还没记饮食'
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

  /**
   * 训练日志的全部事件绑定（幂等）：从 70 收回来，和它服务的 DOM 放在一起。
   * 休息计时器仍留在 70，这里只是在勾组时调用它。
   */
  function installTrainingLog() {
    if (!document.body || document.body.dataset.trainingLogWired === "1") return;
    document.body.dataset.trainingLogWired = "1";
    // 记录页三种表单统一成「日期在最前、保存在最后」；训练日志原来没有日期输入，只能靠页面顶部的全局日期。
    $('#training-date')?.addEventListener('change', event => {
      const value = event.target.value;
      if (validDate(value)) setActiveDate(value);
      else event.target.value = activeDate;
    });
    // 2026-11-23：卡片底部的「练下来」一整行已删除，体感只留在结束训练弹窗里（保存时一次问清）。
    $('#training-add')?.addEventListener('click', () => {
      // 以前这里手写了一套「组数 / 每组次数 / 负重」旧字段，与逐组模型不兼容——
      // 点「添加动作」加出来的行没有 [data-set-row]，保存时会被判为「每组都要填次数与负重」。
      // 现在与预设 chip 走同一个构造函数，加出来的行立刻就有第 1 组。
      const row = appendExerciseRow('');
      if (!row) return;
      $('[data-exercise="name"]', row)?.focus();
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
    $('#training-template')?.addEventListener('change', () => {
      // 手选过的模板当天不再被动作列表覆盖（按日期记，换一天重新自动匹配）。
      const form = $('#training-form');
      if (form) form.dataset.templateTouched = activeDate;
      renderTrainingPresets();
    });
    $('#training-repeat')?.addEventListener('click', () => repeatLastTraining());
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
    // 名称改完失焦就锁回「可点看要点」的展示态；空名保持可编辑。
    // 2026-11-23 修：锁定会把「自重」按钮改成 display:none，而 focusout 早于 click——
    // 手指落在本行控件上时若在这里锁回去，按钮先消失、click 落到行容器上，表现成「点了没反应」。
    // 所以行内失焦一律让位，改由行外的 pointerdown 收口。
    const lockExerciseName = wrap => {
      const input = wrap ? $('[data-exercise="name"]', wrap) : null;
      if (!input) return;
      const name = String(input.value || '').trim();
      if (!name) return;
      wrap.classList.add('is-locked');
      input.readOnly = true;
      const open = $('[data-exercise-open]', wrap);
      if (open) { open.textContent = name; open.setAttribute('aria-label', '查看动作说明：' + name); }
    };
    $('#training-exercises')?.addEventListener('focusout', event => {
      const input = event.target.closest?.('[data-exercise="name"]');
      if (!input) return;
      const wrap = input.closest('.exercise-name-row');
      if (!wrap) return;
      // relatedTarget 指向本行按钮（桌面 Edge/Chrome）或为空（部分触屏）都不锁：交给下面的行外 pointerdown。
      const next = event.relatedTarget;
      if (!next || wrap.contains(next)) return;
      lockExerciseName(wrap);
    });
    // 只有按在行外才锁回展示态；行内（自重 / 改 / 名称输入）不锁，否则按钮会先被 display:none 掉、click 落空。
    document.addEventListener('pointerdown', event => {
      if (event.target.closest?.('.exercise-name-row')) return;
      $$('.exercise-name-row:not(.is-locked)').forEach(wrap => lockExerciseName(wrap));
    }, true);
    $('#training-exercises')?.addEventListener('click', event => {
      // 「练完自动收起」的行，点「展开」随时回到组次（修改后不会再自动收起，直到改动组次）。
      const expandDone = event.target.closest?.('[data-done-expand]');
      if (expandDone) {
        const row = expandDone.closest('[data-exercise-row]');
        if (row) {
          row.dataset.expanded = '1';
          row.classList.remove('is-complete');
        }
        return;
      }
      // 名称即入口（2026-11-22 第七轮）：点名字先看要点，点「改」才进编辑。
      const openName = event.target.closest?.('[data-exercise-open]');
      if (openName) {
        const row = openName.closest('[data-exercise-row]');
        const name = String($('[data-exercise="name"]', row)?.value || '').trim();
        if (name && typeof showExerciseGuide === 'function') showExerciseGuide(name);
        return;
      }
      const editName = event.target.closest?.('[data-exercise-edit]');
      if (editName) {
        const row = editName.closest('[data-exercise-row]');
        const wrap = $('.exercise-name-row', row), input = $('[data-exercise="name"]', row);
        wrap?.classList.remove('is-locked');
        if (input) { input.readOnly = false; input.focus(); if (input.select) input.select(); }
        return;
      }
      // 「自重」标记：点一下就把这个动作名记进用户的自重表，保存时不校验负重。
      const bw = event.target.closest?.('[data-exercise-bodyweight]');
      if (bw) {
        const row = bw.closest('[data-exercise-row]');
        const name = String($('[data-exercise="name"]', row)?.value || '').trim();
        if (!name) { notice('先填动作名称，再标自重。', true); return; }
        const on = bw.getAttribute('aria-pressed') !== 'true';
        if (typeof setUserBodyweight === 'function') setUserBodyweight(name, on);
        bw.setAttribute('aria-pressed', String(on));
        bw.textContent = on ? '自重 ✓' : '自重';
        // 该行的重量格随之变化：自重→占位「自重」，取消→占位「—」。
        if (typeof refreshSetRow === 'function') refreshSetRow(row);
        notice(on ? '已记为自重动作：' + name + '，以后同名动作都按自重处理。' : '已取消自重标记：' + name + '。');
        return;
      }
      const done = event.target.closest?.('[data-set-done]');
      if (!done) {
        // 2026-11-24：点整行也能勾——不再要求瞄准那个圆圈；落在输入框/按钮上时让位给它们自己的行为。
        const rowHit = event.target.closest?.('[data-set-row]');
        if (rowHit && !event.target.closest('input,select,textarea,button,a,label')) {
          const toggle = rowHit.querySelector('[data-set-done]');
          if (toggle) { toggle.click(); return; }
        }
      }
      if (done) {
        const set = done.closest('[data-set-row]');
        const on = set.classList.toggle('is-done');
        done.setAttribute('aria-pressed', String(on));
        syncPlanDoneFromRow(done.closest('[data-exercise-row]'));
        // 勾/取消都算「动过这一行」：之前手动展开的状态作废，全勾完可以再收成一行。
        const rowNode = done.closest('[data-exercise-row]');
        if (rowNode) delete rowNode.dataset.expanded;
        refreshCompletionState();
        if (on) {
          // 第一次勾组就是这一节的起点：结束训练时按它算「实际耗时」。
          if (typeof markSessionStart === 'function') markSessionStart();
          // 按这一行的动作决定休息多久（复合/孤立/自重不同）；有氧行不计时。
          const row = done.closest('[data-exercise-row]');
          const name = row ? String($('[data-exercise="name"]', row)?.value || '') : '';
          startRestTimer(true, restSecondsFor(name));
          // restLength 由 startRestTimer 按动作定下；0 秒（有氧）不挂线。
          if (restLength > 0) attachRestLine(row || set);
        } else {
          clearRestLine();
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
        // 展开态加组：把刚落下的那一组的「次数」聚焦起来，接着填。
        if (row) {
          delete row.dataset.expanded;
          row.classList.remove('is-complete');
          const added = list ? list.lastElementChild : null;
          added?.querySelector('[data-set="reps"]')?.focus({preventScroll: false});
        }
        return;
      }
      const removeSet = event.target.closest?.('[data-set-remove]');
      if (removeSet) {
        const row = removeSet.closest('[data-exercise-row]');
        if ($$('[data-set-row]', row).length <= 1) return;
        removeSet.closest('[data-set-row]')?.remove();
        refreshSetRow(row);
        if (row) delete row.dataset.expanded;
        return;
      }
      const button = event.target.closest?.('[data-exercise-remove]');
      if (!button) return;
      button.closest('[data-exercise-row]')?.remove();
      if (typeof renumberExerciseRows === 'function') renumberExerciseRows();
      refreshCompletionState();
    });
    $('#training-form')?.addEventListener('submit', event => {event.preventDefault(); saveTrainingLog().catch(error => notice(error.message, true));});
    $('#training-clear')?.addEventListener('click', async () => {
      if (!await askConfirm('清空今天的训练记录？习惯行的其他数据（步数、睡眠、饮水、用油）会保留。', {title: '清空训练', ok: '清空', danger: true})) return;
      // 清空前留一份当天整行快照：4 秒内点「撤销」原样写回（2026-11-23）。
      const snapshot = habitRowFor(activeDate);
      // 清空即「今天不按计划走了」：把当时那份清单记下来抑制自动播种，刷新后也不会播回来。
      if (typeof markSeedMuted === 'function') markSeedMuted(aiPlanStore(activeDate) || []);
      if (typeof forgetTrainingDraft === 'function') forgetTrainingDraft();
      setDraftState('');
      const existing = habitRowFor(activeDate);
      if (!existing) {renderTrainingLog(); return;}
      const next = {...existing};
      delete next.exercises;
      delete next.template;
      delete next.training;
      try {
        await api('/api/habits', next);
        await loadState({quiet: true});
        renderTrainingLog();
        // 底部轻提示 + 4 秒撤销；只有真的删掉了东西才给撤销入口。
        showTrainingUndo(snapshot);
      } catch (error) {notice(error.message, true);}
    });
    $('#training-undo-go')?.addEventListener('click', () => { undoClearTraining().catch(error => notice(error.message, true)); });
    $('#training-rest')?.addEventListener('click', async () => {
      const existing = habitRowFor(activeDate);
      const restMarked = !!existing && (existing.training === false || String(existing.training) === 'false') && !exercisesFor(activeDate).length;
      if (!restMarked && !await askConfirm('把今天记为休息日？已有的步数、睡眠和饮水会保留，之后仍可记录训练。', {title: '记为休息', ok: '记为休息'})) return;
      const next = {...(existing || {}), date: activeDate};
      if (restMarked) delete next.training; else next.training = false;
      try {
        await api('/api/habits', next);
        await loadState({quiet: true});
        renderTrainingLog();
        notice(restMarked ? '已取消休息标记。' : '已记为休息日。');
      } catch (error) {notice(error.message, true);}
    });
    $('#today-training-line')?.addEventListener('click', () => {
      switchTab('records', true);
      if (typeof switchRecordPanel === 'function') switchRecordPanel('training');
    });
  }

  installTrainingLog();

  // ---------------------------------------------------------------------------------------------
  // 训练模块对外标准契约（QH.training）
  // 今天页 / AI 问答 / 趋势页从此只调这三个只读查询，不再各自去翻 state.habits 或训练表单的 DOM。
  // 老全局函数一个都没删：调用点逐处迁移，迁移完一处少一处直接依赖，避免一次大改换掉所有行为。
  // ---------------------------------------------------------------------------------------------
  QH.define('training', {
    /**
     * 指定日期（默认当前查看的日期）的训练完成状态、总容量、动作数与顶组摘要。
     * 容量口径与概览卡一致：有 setDetails 用逐组 reps×weight，旧记录退回 sets×reps×weight；
     * 自重动作只报次数、不拿假想体重冒充 kg。
     */
    getTodaySummary(date) {
      const day = validDate(date) ? date : activeDate;
      const raw = habitRowFor(day);
      const items = Array.isArray(raw?.exercises) ? raw.exercises : [];
      const named = items.filter(item => item && String(item.name || '').trim());
      const stats = trainingStatsOf(items);
      // 顶组：先比重量、再比次数；金字塔组取最重那组的次数（和渐进规则同一口径）。
      const topSet = named
        .map(item => ({name: String(item.name).trim(), ...topSetSummary(item)}))
        .filter(set => set.sets > 0 && set.reps !== null)
        .sort((a, b) => (number(b.weight) ?? -1) - (number(a.weight) ?? -1) || b.reps - a.reps)[0] || null;
      return {
        date: day,
        trained: named.length > 0,
        exercises: named.length,
        sets: stats.sets,
        volume: stats.volume,
        bodyweightReps: stats.bodyweightReps,
        distanceKm: items.reduce((sum, item) => sum + (number(item?.distanceKm) || 0), 0),
        durationMin: items.reduce((sum, item) => sum + (number(item?.durationMin) || 0), 0),
        template: raw && raw.template ? String(raw.template) : '',
        topSet
      };
    },

    /** 本周（周一起算）训练次数与累计容量；口径复用概览卡，不另造一套算法。 */
    getWeekStats(date) {
      const day = validDate(date) ? date : activeDate;
      const weekStart = shiftDay(day, -weekdayIndex(day));
      const week = weekTrainingStats(weekStart);
      return {
        weekStart,
        sessions: week.sessions,
        totalVolume: week.totalVolume,
        totalBwReps: week.totalBwReps,
        totalKm: week.totalKm,
        totalMin: week.totalMin
      };
    },

    /** 逐组口径的日负荷（截止当天往前，默认 28 天），直接喂给 acwrFromDailyLoads。 */
    getDailyLoads(days) {
      const span = Math.round(number(days) ?? 28);
      return dailyLoads(Math.max(1, Math.min(180, span)));
    }
  });
