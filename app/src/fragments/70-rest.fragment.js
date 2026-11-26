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
  function setActiveDate(value) {
    if(!validDate(value)) return false;
    activeDate=value; $('#active-date').value=value; syncActiveDateLabel(); setDefaultDates(); render();
    const content=$('#advice-content'); content.textContent=''; content.removeAttribute('data-date');
    return true;
  }
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
  /**
   * 一次课的时间：每组执行约 45 秒 + 该动作的组间休息（restSecondsFor 的同一档位），
   * 有氧按它自己的时长算。以前用固定的 2.5 分钟/组，复合动作休 120~150 秒时低估近一半。
   */
  const AI_PLAN_WORK_SECONDS = 45;
  const AI_PLAN_MINUTE_STEPS = [30, 45, 60, 75, 90];
  /**
   * 把一批动作并入当天训练记录：同名跳过，只追加不覆盖。
   * 训练日志与 AI 计划是两份数据，这里是唯一把它们接起来的入口。
   */
  async function addExercisesToToday(items, options = {}) {
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
      // 勾选即记录写进来的行带标记：取消勾选时只回收「还没动过」的行。
      if (options.fromPlan === true) record.fromPlan = true;
      current.push(record);
      names.add(name);
      added.push(name);
    }
    if (!added.length) { notice("这些动作已经在今天的训练记录里了。"); return; }
    try {
      await api("/api/habits", {...existing, date: activeDate, exercises: current});
      await loadState({quiet: true});
      if (options.keepInPlan === true) {
        // 勾选路径：清单项要留着显示「已做完」，不能像批量导入那样从清单里消失。
        notice("已记入今天的训练：" + added.join("、") + "。");
        return;
      }
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
   * 勾选即记录（2026-11-22 第七轮）：清单勾一个就落一条训练记录，不再要求二次导入。
   * 只对今天生效、只在有组次时写库；取消勾选只回收「自己加进来且没动过」的行。
   */
  async function removeExerciseFromToday(target) {
    const existing = habitRowFor(activeDate) || {};
    const list = Array.isArray(existing.exercises) ? existing.exercises : [];
    const next = list.filter(row => !(row && target && row.id === target.id));
    if (next.length === list.length) return;
    await api("/api/habits", {...existing, date: activeDate, exercises: next});
    await loadState({quiet: true});
  }
  async function togglePlanDone(index, checked) {
    const plan = aiPlanStore(activeDate) || [];
    const item = plan[index];
    if (!item || !String(item.name || "").trim()) return;
    const name = String(item.name).trim();
    const isToday = activeDate === localDate();
    const canRecord = isToday && (number(item.sets) !== null || number(item.reps) !== null);
    if (!canRecord) {
      // 历史日期或没填组次：只做勾选框标记，绝不写历史记录。
      item.done = checked === true;
      aiPlanStore(activeDate, plan);
      renderAiPlan();
      return;
    }
    if (checked) {
      const existing = exercisesFor(activeDate).find(row => String(row && row.name || "").trim() === name);
      if (!existing) await addExercisesToToday([item], {fromPlan: true, keepInPlan: true});
      item.done = true;
      aiPlanStore(activeDate, plan);
      renderAiPlan();
      if (typeof renderTrainingLog === "function") renderTrainingLog();
      return;
    }
    item.done = false;
    aiPlanStore(activeDate, plan);
    const current = exercisesFor(activeDate).find(row => String(row && row.name || "").trim() === name);
    // 「没动过」= 组次负重仍然全是计划里给的那组数字（或还没生成组明细）。
    // 只看「数组是否为空」会误判：表单重建后每组都是对象，而计划本来就带 5 组 × 5 次 × 60 kg。
    const sameAsPlan = !Array.isArray(current?.setDetails) || !current.setDetails.length
      || current.setDetails.every(set => set
        && (number(set.reps) ?? null) === (number(item.reps) ?? null)
        && (number(set.weight) ?? null) === (number(item.weight) ?? null));
    const untouched = current && current.fromPlan === true && sameAsPlan;
    if (untouched) {
      await removeExerciseFromToday(current);
      if (typeof renderTrainingLog === "function") renderTrainingLog();
      notice("已取消勾选，并从今天的训练记录里撤掉。");
    } else if (current) {
      notice("已保留这条记录（里面已经有改动）。");
    }
    renderAiPlan();
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
  /* ── 训练强度反馈与「今天的要求」（2026-11-19，1.4.45）────────────────────
     练完点一下「太轻 / 刚好 / 有点累 / 太累」，写进当天 habit 行的 effort 字段；
     下一次排课据此降一档或加一档。用户对今天的要求写在同一张卡的折叠输入框里，
     交给模型按教练的角色判断要不要照办，并把一句原因放进第一个动作的 note。 */
  const EFFORT_LABELS = {tooLight: "太轻", justRight: "刚好", tired: "有点累", tooMuch: "太累"};
  const EFFORT_LEVELS = ["tooLight", "justRight", "tired", "tooMuch"];

  function effortFor(date) {
    const row = (state.habits || []).find(item => item && item.date === date);
    const value = row && row.effort;
    return EFFORT_LEVELS.includes(value) ? value : null;
  }
  /** 强度信号落到清单：降载时每个配重动作少一组、重量退 5%；加量时第一个复合动作多一组。 */
  function applyEffortSignalToPlan(plan) {
    const signal = effortSignal();
    if (!Array.isArray(plan) || !plan.length || signal.level === "keep") return plan;
    if (signal.level === "deload") {
      for (const item of plan) {
        if (!item || item.bodyweight || Number(item.distanceKm) > 0) continue;
        // 少一组，但别把只有 1 组的孤立动作「减」成 2 组（以前 Math.max(2, 0) 会越减越多）。
        item.sets = Math.max(1, (Number(item.sets) || 1) - 1);
        if (Number(item.weight) > 0 && typeof reduceLoadableWeightKg === "function") {
          const kg = reduceLoadableWeightKg(item.name, Number(item.weight) * 0.95, Number(item.weight));
          if (kg > 0) { item.weight = kg; item.weightSource = "deload"; }
        }
      }
    } else if (signal.level === "push") {
      const first = plan.find(item => item && !item.bodyweight && !(Number(item.distanceKm) > 0));
      if (first) first.sets = Math.min(5, (Number(first.sets) || 3) + 1);
    }
    return plan;
  }
  /** 体感只落在结束训练弹窗里（2026-11-23 删掉卡片底部那一行），这里不再有可刷新的行内 UI。 */
  async function saveTrainingEffort(value) {
    if (!EFFORT_LEVELS.includes(value)) return;
    const existing = (state.habits || []).find(item => item && item.date === activeDate) || {};
    await api("/api/habits", {...existing, date: activeDate, effort: value, effortAt: new Date().toISOString()});
    await loadState({quiet: true});
    notice("已记下：练下来" + EFFORT_LABELS[value] + "。下次排课会参考。");
  }
  /** 教练说明只留在本机：它解释「为什么没完全照要求办」，不进导出数据。 */
  function planNoteKey(date) { return "qingheng.planNote." + date; }
  function readPlanNote(date) {
    try { return localStorage.getItem(planNoteKey(date)) || ""; } catch { return ""; }
  }
  function writePlanNote(date, text) {
    try {
      if (text) localStorage.setItem(planNoteKey(date), text);
      else localStorage.removeItem(planNoteKey(date));
    } catch {}
  }
  function renderPlanNote() {
    const node = $("#ai-plan-note");
    if (!node) return;
    const text = readPlanNote(activeDate);
    node.hidden = !text;
    node.textContent = text || "";
  }
  /** 只把「上一次没排成」的原因贴在清单上方：toast 只活 10 秒，失败原因要留得住。
   *  成功时不报耗时（2026-11-23 用户：不追求生成速度，追求排得对）。 */
  function renderPlanTiming() {
    const node = $("#ai-plan-timing");
    if (!node) return;
    let timing = null;
    try { timing = JSON.parse(localStorage.getItem("qingheng.planTiming." + activeDate) || "null"); } catch { timing = null; }
    if (!timing || !timing.error) { node.hidden = true; node.textContent = ""; return; }
    node.hidden = false;
    node.textContent = "上次没排成：" + timing.error;
  }
  /**
   * 播种行的每组 ○ 反过来决定计划项的 done（2026-11-22）：
   * 计划清单不再单独渲染，但 agenda 的「N 个动作还没完成」必须仍然说真话。
   */
  function syncPlanDoneFromRow(row) {
    if (!row || row.dataset.planIndex == null) return;
    const index = Number(row.dataset.planIndex);
    const plan = aiPlanStore(activeDate) || [];
    const item = plan[index];
    if (!item) return;
    const sets = $$('[data-set-row]', row);
    const allDone = sets.length > 0 && sets.every(set => set.classList.contains('is-done'));
    if (item.done === allDone) return;
    item.done = allDone;
    aiPlanStore(activeDate, plan);
    renderAiPlan();
    if (typeof renderTodayAction === 'function') renderTodayAction();
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
        // 负重输入由 setRowHtml 渲染成 [data-set="weight"]，没有 name 属性；
        // 旧选择器 input[name="weight"] 一个都选不到，回填永远是「先添加一个动作」。
        const inputs = $$('#training-exercises [data-set="weight"]');
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

  /** 问答记录的按天浏览：日期 chip 打开原生日历，两侧箭头在「有记录的日期」之间翻页。 */

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
      
    }
    const trendsHeading = $('.page-heading', $('#view-trends'));
    const rangeLabel = trendsHeading?.querySelector('label');
    const rangeSelect = $('#trend-range');
    if (trendsHeading && rangeLabel && rangeSelect) {
      trendsHeading.classList.add('page-heading--trends');
      
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
    const energyCard = $('.energy-card', view);
    if (!energyCard) return;
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
    // 动作组紧贴能量卡之下：先读数（环 → 宏量三列 → 补蛋白提示），再动作。
    // 不放进卡里——卡内动作条会把一张卡切成两半；也没挂在宏量后面，空态时环与宏量都是 hidden，锚点会消失。
    // 2026-11-22 第五轮：三个核心入口进卡，固定在能量环下方的黄金区；
    // 不再靠 ⋯ 菜单承载主操作，低频的「显示指标」移到小习惯卡标题。
    const anchor = $('.energy-body', energyCard);
    if (anchor && anchor.parentElement === energyCard) anchor.after(row);
    else energyCard.prepend(row);

    row.addEventListener('click', event => {
      const chip = event.target.closest('[data-quick-focus]');
      if (!chip) return;
      openRecordTarget(chip.dataset.quickFocus);
    });
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
  function mealWindowSummaryText(spec) {
    return `早于 ${spec.lunchFrom} 记早餐，${spec.lunchFrom} 起记午餐，${spec.dinnerFrom} 起记晚餐，${spec.snackFrom} 起记加餐。`;
  }
  let mealTypeTouched = false;
  /** The estimate form starts on the slot the clock implies, unless the user already picked one. */
  function applyMealTypeDefault() {
    const form = $('#estimate-form');
    if (!form || mealTypeTouched) return;
    const select = form.querySelector('select[name="mealType"]');
    if (select) select.value = defaultMealTypeFor(nowClock());
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
  // 两项「更多测量」与「日常习惯」都并进当天那一行：同一天只有一行测量、一行习惯（2026-11-18）。
  // 空着的格不再写成 null，否则只改腰围会把当天的体重冲掉。
  /**
   * 身体数据保存前的阈值风控（2026-11-22 第六轮）：与同日期之前的最近一条比，
   * 体重差 ≥2 kg 或体脂差 ≥3 个百分点时先确认，避免换秤/脱水/手误污染趋势图。
   */
  function bodyOutlierLines(form) {
    const date = String(form.elements.date?.value || activeDate);
    const prev = (state.measurements || []).filter(row => row && validDate(row.date) && row.date < date)
      .sort((a, b) => b.date.localeCompare(a.date))[0] || null;
    if (!prev) return [];
    const lines = [];
    const weight = number(form.elements.weight?.value), prevWeight = number(prev.weight);
    const values = numericForm(form, ['weight', 'waist', 'bodyFat', 'muscle', 'visceralFat', 'bmr']);
    if (weight !== null && prevWeight !== null && Math.abs(weight - prevWeight) >= 2) lines.push(`体重差 ${fmt(Math.abs(weight - prevWeight), 1)} kg`);
    if (number(values.bodyFat) !== null && number(prev.bodyFat) !== null && Math.abs(values.bodyFat - prev.bodyFat) >= 3) {
      lines.push(`体脂差 ${fmt(Math.abs(values.bodyFat - prev.bodyFat), 1)} 个百分点`);
    }
    return lines;
  }
  $('#measurement-form').addEventListener('submit', event => {
    event.preventDefault();
    const form = event.currentTarget;
    const save = () => submitForm(form, '/api/measurements', f => {
      const filled = Object.fromEntries(Object.entries(numericForm(f, ['weight', 'waist', 'bodyFat', 'muscle', 'visceralFat', 'bmr'])).filter(([, value]) => value !== null));
      if (!Object.keys(filled).length) throw new Error('请至少填写一项测量数据。');
      return {...(measurementRowFor(f.elements.date.value) || {}), date: f.elements.date.value, ...filled};
    });
    const outliers = bodyOutlierLines(form);
    if (!outliers.length) { save(); return; }
    askConfirm(`和上次比，${outliers.join('、')}。数值没错就保存；若是换秤或刚运动完，改天再记更准。`, {title: '数值变化较大', ok: '确认保存'})
      .then(ok => { if (ok) save(); });
  });
  // 2026-11-22：睡眠从「今天两样」迁回这一行——步数/饮水/睡眠同属日常习惯，一次保存。
  $('#habit-form').addEventListener('submit',event=>{event.preventDefault();submitForm(event.currentTarget,'/api/habits',form=>{const filled=Object.fromEntries(Object.entries(numericForm(form,['steps','water','sleep'])).filter(([,value])=>value!==null));if(!Object.keys(filled).length) throw new Error('请至少填写一项日常习惯。');return {...(habitRowFor(form.elements.date.value)||{}), date:form.elements.date.value, ...filled};});});
  document.addEventListener('click', event => {
    const toggle = event.target.closest('[data-meal-items]');
    if (!toggle) return;
    const panel = toggle.parentElement?.querySelector('.meal-items');
    if (!panel) return;
    const open = panel.hidden;
    panel.hidden = !open;
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
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
  /** The 今天-page window: training questions only; external sending uses the one-time consent. */
  /**
   * 记录页低频卡片的折叠位（1.4.46 起清空）。
   * 「食品热量参考库」「手动记录餐食」已按入口预算移除：估算卡本身就能描述任意餐食与克重，
   * 这两张卡解决的是同一个低频需求，却各占一个折叠标题。留空数组，机制保留给以后真正的低频卡。
   */
  function installCardCollapse() {
    const groups = [];
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
   * 身体数据的参照值：每项取「最近一条真填过这一项」的记录。
   * 收起态的标题也用它——折叠只报常用指标，不能只剩一个「选填」。
   */
  function paintBodyDataHints() {
    const form = $('#measurement-form');
    if (!form || !state) return;
    const base = validDate(form.elements.date.value) ? form.elements.date.value : activeDate;
    const rows = (state.measurements || [])
      .filter(row => row && validDate(row.date) && row.date < base)
      .sort((a, b) => b.date.localeCompare(a.date));
    const lastWith = key => rows.find(row => number(row[key]) !== null) || null;
    for (const metric of BODY_METRICS) {
      const node = $(`[data-metric-hint="${metric.key}"]`, form);
      if (!node) continue;
      const row = lastWith(metric.key);
      const value = row ? number(row[metric.key]) : null;
      // 百分号贴着数字，其他单位留一个空格（「上次 18.4%」而不是「18.4 %」）。
      const suffix = metric.unit === '%' ? '%' : ` ${metric.unit}`;
      node.textContent = value === null ? '' : `上次 ${fmt(value, metric.digits)}${suffix}`;
    }
    const tag = $('#body-data-fold .tag');
    if (tag) {
      const parts = [];
      const fat = lastWith('bodyFat'), muscle = lastWith('muscle');
      if (fat && number(fat.bodyFat) !== null) parts.push(`体脂 ${fmt(fat.bodyFat, 1)}%`);
      if (muscle && number(muscle.muscle) !== null) parts.push(`肌肉 ${fmt(muscle.muscle, 1)} kg`);
      tag.textContent = parts.length ? parts.join(' · ') : '选填';
    }
  }
  /**
   * 身体数据（1.5.09）：指标卡片化、按围度/成分分组，加一条「拍秤面识别」。
   * 卡片只放读数，动作在卡外；识别结果先回填表单，用户核对后才入库——错一个数字不该直接写进记录。
   */
  function installBodyDataControls() {
    const form = $('#measurement-form');
    if (!form || form.dataset.bodyWired === '1') return;
    form.dataset.bodyWired = '1';
    paintBodyDataHints();
    form.elements.date.addEventListener('change', paintBodyDataHints);
    // 启动时 state 还没到，门一开再补一次：否则「上次 74」与折叠态摘要都不会出现。
    const fold = $('#body-data-fold');
    if (fold) fold.addEventListener('toggle', () => { if (fold.open) setTimeout(paintBodyDataHints, 0); });
    const input = $('#scale-photo-input'), shotInput = $('#scale-shot-input'), note = $('#scale-sync-note'), button = $('#scale-photo'), shotButton = $('#scale-shot');
    // 先在 canvas 缩到 1400px：一张 4000px 原图的 base64 会把整条链路拖慢一倍以上。
    const shrink = file => new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const image = new Image();
      image.onload = () => {
        const scale = Math.min(1, 1400 / Math.max(image.width, image.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);
        canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      image.onerror = () => { URL.revokeObjectURL(url); reject(new Error('这张图片读不出来，换一张试试')); };
      image.src = url;
    });
    const askFor = picker => {
      if (!externalConsent()) { note.textContent = '识别秤面需要外部模型：先到「我的 → 数据与关于」开启授权。'; return; }
      if (!navigator.onLine) { note.textContent = '当前离线，秤面识别需要联网；也可以手动填写。'; return; }
      picker?.click();
    };
    button.addEventListener('click', () => askFor(input));
    shotButton?.addEventListener('click', () => askFor(shotInput));
    const applyScaleFile = async file => {
      if (!file) return;
      button.disabled = true;
      if (shotButton) shotButton.disabled = true;
      note.textContent = '正在读图…';
      try {
        const image = await shrink(file);
        const data = await api('/api/scale-read', {image, allowExternal: true});
        // 统一契约：越界/非数字在这里就被丢掉，不让脏值进表单。
        const vision = normaliseVision(data, 'scale');
        const filled = [];
        for (const metric of METRICS) {
          const value = number(vision.fields[metric.key]);
          if (value === null) continue;
          form.elements[metric.key].value = value;
          filled.push(`${metric.label} ${fmt(value, metric.digits)} ${metric.unit}`);
          const card = form.elements[metric.key].closest('.metric-card');
          if (card) {
            card.classList.add('is-filled');
            setTimeout(() => card.classList.remove('is-filled'), 1600);
          }
        }
        if (data?.measuredAt && validDate(data.measuredAt)) form.elements.date.value = data.measuredAt;
        const skipped = vision.rejected.length ? `（跳过 ${vision.rejected.length} 项异常读数）` : '';
        note.classList.toggle('is-recognised', filled.length > 0);
        note.textContent = filled.length
          ? `已自动识别，可微调：${filled.join('、')}。核对后点保存。${skipped}`
          : `没读到可用数值，换个角度重试，或直接手填。${skipped}`;
      } catch (error) { note.textContent = error.message; }
      finally {
        button.disabled = false;
        if (shotButton) shotButton.disabled = false;
      }
    };
    input.addEventListener('change', async () => {
      const file = input.files && input.files[0];
      input.value = '';
      await applyScaleFile(file);
    });
    shotInput?.addEventListener('change', async () => {
      const file = shotInput.files && shotInput.files[0];
      shotInput.value = '';
      await applyScaleFile(file);
    });
  }
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
  function readHabitQuick() {
    let raw = {};
    try { raw = JSON.parse(localStorage.getItem(HABIT_QUICK_KEY) || '{}') || {}; } catch { raw = {}; }
    const pick = key => {
      // 只认可选档位：旧版存过「饮水总量」1500/2000，进了累加语义会变成「一次加 1.5L」，直接淘汰。
      const list = Array.isArray(raw[key])
        ? raw[key].map(value => number(value)).filter(value => value !== null && HABIT_DIAL[key].candidates.includes(value))
        : [];
      const clean = [...new Set(list)].slice(0, 2);
      return clean.length === 2 ? clean : HABIT_QUICK_FALLBACK[key].slice();
    };
    return {steps: pick('steps'), water: pick('water')};
  }
  function writeHabitQuick(next) {
    try { localStorage.setItem(HABIT_QUICK_KEY, JSON.stringify({steps: next.steps, water: next.water})); } catch {}
  }
  /** 胶囊标签：步数按 k、饮水写毫升、睡眠写小时。 */
  function habitQuickLabel(key, value) {
    if (key === 'sleep') return `${fmt(value, 1)}h`;
    if (key === 'steps') return `${fmt(value / 1000, value % 1000 ? 1 : 0)}k`;
    // 饮水是「再加多少」，用毫升写更贴近动作（+250ml 比 +0.25L 好读）。
    return `${fmt(value, 0)}ml`;
  }
  /**
   * 训练的两张静态 sheet：计划说明放本周要求 / 怎么排的 / 负荷；
   * 顺延与清空已从「其他」里搬出来，直接挂在训练日志的操作行（2026-11-23 用户要求）——
   * 这两件低频动作不再需要一个折叠层，也少一个「其他」按钮。
   */
  function installTrainingSheets() {
    const sheetOf = id => $(id);
    const open = id => {
      const node = sheetOf(id);
      if (!node) return;
      node.hidden = false;
      const first = node.querySelector('button, textarea, [data-sheet-focus]');
      if (first) first.focus({preventScroll: true});
    };
    const close = id => { const node = sheetOf(id); if (node) node.hidden = true; };
    const pairs = [['#plan-explain-open', '#plan-sheet', '#plan-sheet-close']];
    for (const [trigger, sheet, closer] of pairs) {
      $(trigger)?.addEventListener('click', () => open(sheet));
      $(closer)?.addEventListener('click', () => close(sheet));
      $(sheet)?.addEventListener('click', event => { if (event.target === sheetOf(sheet)) close(sheet); });
    }
    // 2026-11-23 Phase 3：教练说明与排课耗时不再搬进计划说明抽屉——它们留在训练日志工具栏下方，
    // 点「重排今天」之后抬头就能看到（搬走会让反馈藏在另一张卡里）。
    document.addEventListener('keydown', event => {
      if (event.key !== 'Escape') return;
      if (sheetOf('#plan-sheet') && !sheetOf('#plan-sheet').hidden) close('#plan-sheet');
    });
  }
  function installHabitChips() {
    const form = $('#habit-form');
    if (!form || form.dataset.habitWired === '1') return;
    form.dataset.habitWired = '1';
    const meters = {};
    for (const key of HABIT_KEYS) {
      const meter = $(`[data-habit="${key}"]`, form);
      const field = form.elements[key];
      if (!meter || !field) continue;
      const spec = HABIT_DIAL[key];
      meters[key] = {meter, field, spec};
      // 输入途中只跟状态、不整形：把「7.」立刻写成「7」会把小数点吃掉。
      field.addEventListener('input', () => paintMeter(key));
      field.addEventListener('change', () => { snapMeter(key); paintMeter(key); });
      // 刻度轨道退场后的键盘通路：↑↓ 走一档，Shift+↑↓ 走四档（等价于原来的 Home/End 之外的可达值）。
      field.addEventListener('keydown', event => {
        if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
        event.preventDefault();
        bump(key, (event.key === 'ArrowUp' ? 1 : -1) * (event.shiftKey ? 4 : 1));
      });
    }
    const valueOf = key => meters[key] ? number(meters[key].field.value) : null;
    const specOf = key => HABIT_DIAL[key];
    function paintMeter(key) {
      const entry = meters[key];
      if (!entry) return;
      const value = number(entry.field.value) ?? 0;
      // 单行账本只保留「空 / 非空」这一层视觉；数值本身已是 20px 主数字，不再画刻度。
      entry.meter.classList.toggle('is-empty', value <= 0);
      // 老内核没有 field-sizing：按位数给宽度，避免空值或短值在名称与单位之间留一条空隙。
      const digits = String(entry.field.value || '').length;
      const width = digits === 0 ? 0.9 : Math.max(2.2, digits * 0.62 + 0.4);
      entry.field.style.setProperty('--habit-width', `${width.toFixed(2)}em`);
    }
    for (const key of HABIT_KEYS) paintMeter(key);
    function setMeter(key, value) {
      const entry = meters[key];
      if (!entry) return null;
      const {min, max, digits} = entry.spec;
      const clamped = Math.max(min, Math.min(max, Number(Number(value).toFixed(1))));
      entry.field.value = digits ? String(Number(clamped.toFixed(1))) : String(Math.round(clamped));
      paintMeter(key);
      return Number(entry.field.value);
    }
    function snapMeter(key) {
      const entry = meters[key];
      if (!entry) return;
      const raw = number(entry.field.value);
      if (raw === null) { entry.field.value = ''; paintMeter(key); return; }
      setMeter(key, raw);
    }
    const bump = (key, direction) => {
      if (!meters[key]) return;
      setMeter(key, (valueOf(key) ?? 0) + direction * specOf(key).step);
    };
    const renderChips = () => {
      const quick = readHabitQuick();
      for (const key of HABIT_KEYS) {
        const box = $(`[data-habit-chips="${key}"]`, form);
        if (!box) continue;
        const spec = specOf(key);
        // 饮水两枚是「再加」：一次喝掉多少比「总量定格」更接近真实动作；步数与睡眠是设值。
        const mode = key === 'water' ? 'add' : 'set';
        const values = key === 'sleep' ? [7, 8] : quick[key];
        box.innerHTML = values.map(value =>
          `<button type="button" class="habit-chip" data-habit-chip="1" data-habit-key="${key}" data-habit-mode="${mode}" data-habit-value="${value}" aria-label="${mode === 'add' ? '再加' : '填入'}${fmt(value, spec.digits)}${spec.unit}">${mode === 'add' ? '+' : ''}${habitQuickLabel(key, value)}</button>`
        ).join('');
      }
    };
    renderChips();
    // 点一下走一步，按住连加：120ms 一步，松手即停；越界由 setMeter 夹住。
    let repeat = null;
    const stopRepeat = () => { if (repeat) { clearInterval(repeat); repeat = null; } };
    form.addEventListener('pointerdown', event => {
      const button = event.target.closest('[data-habit-step]');
      if (!button) return;
      event.preventDefault();
      const key = button.dataset.habitStep, direction = Number(button.dataset.habitDir) || 1;
      bump(key, direction);
      stopRepeat();
      repeat = setInterval(() => bump(key, direction), 120);
    });
    window.addEventListener('pointerup', stopRepeat);
    window.addEventListener('pointercancel', stopRepeat);
    form.addEventListener('click', event => {
      const step = event.target.closest('[data-habit-step]');
      // 键盘回车/空格只派发 click（detail = 0）：补这一下，指针那一路已经在 pointerdown 里做过。
      if (step) {
        if (event.detail === 0) bump(step.dataset.habitStep, Number(step.dataset.habitDir) || 1);
        return;
      }
      const chip = event.target.closest('[data-habit-chip]');
      if (chip) {
        const key = chip.dataset.habitKey, value = Number(chip.dataset.habitValue);
        setMeter(key, (chip.dataset.habitMode === 'add' ? (valueOf(key) ?? 0) : 0) + value);
        chip.classList.add('is-used');
        setTimeout(() => chip.classList.remove('is-used'), 600);
        return;
      }
      // 沿用昨日数据：只填昨天真记过的项，空项不写成本日数字。
      const copy = event.target.closest('[data-habit-copy]');
      if (!copy) return;
      const yesterday = shiftDay(localDate(), -1);
      const rowData = (state.habits || []).find(item => item && item.date === yesterday);
      if (!rowData) { notice('昨天没有习惯记录可复制。', true); return; }
      let filled = 0;
      for (const key of HABIT_KEYS) {
        if (number(rowData[key]) === null) continue;
        setMeter(key, number(rowData[key]));
        filled += 1;
      }
      notice(filled ? '已填入昨天的数值，可修改后保存。' : '昨天只有训练记录，没有可沿用的数值。', !filled);
    });
    // 快捷值可改，但改法不进卡面：右上角两步 sheet——先选槽位，再选数值，写完立刻生效。
    $('#habit-quick-edit')?.addEventListener('click', async () => {
      if (sheetOpen()) return;
      const quick = readHabitQuick();
      const slots = [{key: 'steps', index: 0}, {key: 'steps', index: 1}, {key: 'water', index: 0}, {key: 'water', index: 1}];
      const slotChoice = await openSheet({title: '自定义快捷值', options: slots.map(slot => ({
        label: `${HABIT_DIAL[slot.key].label}${slot.key === 'water' ? '每次加量' : '快捷值'} ${slot.index + 1} · ${habitQuickLabel(slot.key, quick[slot.key][slot.index])}`
      }))});
      if (slotChoice === null) return;
      const slot = slots[slotChoice];
      const spec = HABIT_DIAL[slot.key];
      const valueChoice = await openSheet({title: `${spec.label}快捷值 ${slot.index + 1}`, options: spec.candidates.map(value => ({
        label: `${fmt(value, spec.digits)} ${spec.unit}`, current: quick[slot.key][slot.index] === value
      }))});
      if (valueChoice === null) return;
      const value = spec.candidates[valueChoice];
      if (quick[slot.key][slot.index] === value) return;
      // 两枚胶囊不重复：撞上另一槽就交换，否则卡底会出现两个一样的数。
      const other = 1 - slot.index;
      if (quick[slot.key][other] === value) quick[slot.key][other] = quick[slot.key][slot.index];
      quick[slot.key][slot.index] = value;
      writeHabitQuick(quick);
      renderChips();
      notice(`已改为 ${fmt(value, spec.digits)} ${spec.unit}。`);
    });
  }
  /** Suggested questions: an empty box is the main reason people do not ask anything. */

  const runPushHistory = (useRange, button) => {
    if (button) button.disabled = true;
    return queryPushHistory(useRange).catch(error => {const box = $('#push-history'); if (box) box.textContent = error.message;}).finally(() => {if (button) button.disabled = false;});
  };
  $('#refresh-push-history').addEventListener('click', event => runPushHistory(false, event.currentTarget));
  $('#query-push-history').addEventListener('click', event => runPushHistory(true, event.currentTarget));
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
    if (draft.kind === 'meal') throw new Error('餐食草稿需要在餐食表单生成预览并确认，不能直接写入。');
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
  installCardCollapse(); installTrainingAdvice(); installTrainingSheets(); installTodayAction(); installHabitChips(); installChatChips();
  /**
   * 今天页下半区（2026-11-24）：取消「今日记录 / 小习惯」分段——两段上下相接、一条发丝线分隔，
   * 记录在上、习惯在下，只有一个连续的开合动作可做（点餐次），不再有第二次切换。
   */
  setupCollapsibleSections(); installDietModule(); installHealthConnectControls(); installBodyDataControls(); installTodayMoreMenu(); restoreConsent(); installExternalConsent(); installExactAlarmControl();

