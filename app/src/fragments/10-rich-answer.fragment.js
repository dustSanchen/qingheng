/* Fragment of assets/app.js -- assembled by tools/assemble-app.ps1 in filename order.
 * Edit this file, never the generated assets/app.js; tests/app-fragments.test.mjs fails on drift. */
  // ---- Rich answers ---------------------------------------------------------------------------
  // The model writes plain Chinese text. A small, explicit subset is understood so a reply can
  // carry a heading with a coloured icon, a bullet list, an uppercase label and a real table,
  // without ever trusting the text as markup: everything is escaped first, then re-assembled.
  const answerIconRules = [
    {tone:'protein', icon:'icon-nutrient-protein.svg', words:['蛋白质','蛋白']},
    {tone:'fat', icon:'icon-nutrient-fat.svg', words:['脂肪','油']},
    {tone:'carb', icon:'icon-nutrient-carb.svg', words:['碳水','主食','米饭','面条']},
    {tone:'energy', icon:'icon-energy.svg', words:['热量','卡路里','kcal','千卡']},
    {tone:'weight', icon:'icon-glyph-balance.svg', words:['体重','体脂','BMI','腰围','体重变化']},
    {tone:'training', icon:'icon-glyph-training.svg', words:['训练','力量','运动','健身']},
    {tone:'sleep', icon:'icon-habit-sleep.svg', words:['睡眠','休息','入睡']},
    {tone:'water', icon:'icon-water.svg', words:['饮水','喝水','水分']},
    {tone:'warn', icon:'icon-warn.svg', words:['注意','警告','风险','偏高','超标','不足']},
    {tone:'ok', icon:'icon-check.svg', words:['完成','达标','很好','不错','已经']},
    {tone:'tip', icon:'icon-tip.svg', words:['建议','明天','调整','可以','优先']},
  ];
  function answerIcon(text) {
    const value = String(text || '');
    for (const rule of answerIconRules) if (rule.words.some(word => value.includes(word))) return rule;
    return {tone:'neutral', icon:'', words:[]};
  }
  /** Latin runs that were written in capitals are kept as an uppercase label above the heading. */
  function answerEyebrow(text) {
    const latin = String(text || '').match(/[A-Za-z][A-Za-z0-9 .,%/+-]{2,}/g);
    if (!latin) return '';
    const upper = latin.filter(run => run === run.toUpperCase() && /[A-Z]/.test(run));
    return upper.length ? upper.join(' · ').slice(0, 40) : '';
  }
  const answerInline = text => esc(text)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/[`]{1}([^`]+)[`]{1}/g, '<code>$1</code>');
  function answerSection(title) {
    const clean = String(title || '').replace(/^[#\s【\[（(]+|[\s】\]）)】]+$/g, '').replace(/\*\*/g, '').trim();
    if (!clean) return '';
    const rule = answerIcon(clean);
    const eyebrow = answerEyebrow(clean);
    return `<div class="answer-section tone-${rule.tone}">${rule.icon ? `<span class="inline-icon" aria-hidden="true">${iconMarkup(rule.icon)}</span>` : ''}`
      + `<div>${eyebrow ? `<p class="answer-eyebrow">${esc(eyebrow)}</p>` : ''}<p class="answer-heading">${answerInline(clean)}</p></div></div>`;
  }
  /** Renders a pipe table when the block looks like one; returns '' otherwise. */
  /** Widest table that still reads on a phone: 4 columns, 8 body rows, short cells. */
  const ANSWER_TABLE_COLUMNS = 4, ANSWER_TABLE_ROWS = 8, ANSWER_TABLE_CELL = 12;
  /** False when a parsed block would overflow a phone screen, so it is shown as prose instead. */
  function answerTableFits(rows) {
    if (!Array.isArray(rows) || rows.length < 2) return false;
    if (rows[0].length > ANSWER_TABLE_COLUMNS || rows.length - 1 > ANSWER_TABLE_ROWS) return false;
    return rows.every(cells => cells.every(cell => String(cell).length <= ANSWER_TABLE_CELL));
  }
  function answerTable(rows) {
    const cells = row => row.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').map(cell => cell.trim());
    const head = cells(rows[0]);
    const body = rows.slice(1).filter(row => !/^[\s|:-]+$/.test(row)).map(cells);
    if (!head.length || !body.length) return '';
    // A table wider or longer than a phone screen reads worse than prose, so it is not drawn as one.
    if (!answerTableFits([head].concat(body))) return '';
    const numbers = new Set(body.map(row => row.length));
    const numeric = new Set();
    body.forEach(row => row.forEach((cell, i) => {if (cell && number(cell.replace(/[^\d.-]/g, '')) !== null && /^[\d.,%\s\-+]+$/.test(cell)) numeric.add(i);}));
    const headHtml = head.map(cell => `<th scope="col">${answerInline(cell)}</th>`).join('');
    const bodyHtml = body.map(row => `<tr>${head.map((_, i) => `<td${numeric.has(i) ? ' class="num"' : ''}>${answerInline(row[i] ?? '')}</td>`).join('')}</tr>`).join('');
    return `<div class="answer-table-wrap"><table class="answer-table"><thead><tr>${headHtml}</tr></thead><tbody>${bodyHtml}</tbody></table></div>`;
  }
  /** Plain text (or a light subset of it) rendered as safe, readable answer HTML. */
  const answerNumericCell = token => /^[-−+]?[\d.,%]+$/.test(String(token || '').trim());
  /**
   * Models often answer a "make a table" request with whitespace-separated columns instead of
   * Markdown pipes. That shape is recognised here — a short header row plus rows whose remaining
   * columns are all numbers — so a real table still comes out, while ordinary prose never matches.
   */
  function answerSpaceTable(rows) {
    if (!Array.isArray(rows) || rows.length < 2 || rows.length > 30) return '';
    const split = row => String(row).trim().split(/\s+/).filter(Boolean);
    const head = split(rows[0]);
    if (head.length < 3 || head.length > 8) return '';
    if (head.some(answerNumericCell)) return '';
    const body = rows.slice(1).map(split);
    if (!body.every(cells => cells.length === head.length)) return '';
    if (!body.every(cells => cells.slice(1).every(answerNumericCell))) return '';
    if (!body.some(cells => cells.slice(1).some(cell => /\d/.test(cell)))) return '';
    // The phone-width guard applies to the split cells, not to the raw lines: checking the lines
    // rejected every whitespace table, because a whole line is longer than four "columns".
    if (!answerTableFits([head].concat(body))) return '';
    const headHtml = head.map(cell => `<th scope="col">${answerInline(cell)}</th>`).join('');
    const bodyHtml = body.map(cells => `<tr><td>${answerInline(cells[0])}</td>${cells.slice(1).map(cell => `<td class="num">${answerInline(cell)}</td>`).join('')}</tr>`).join('');
    return `<div class="answer-table-wrap"><table class="answer-table"><thead><tr>${headHtml}</tr></thead><tbody>${bodyHtml}</tbody></table></div>`;
  }
  /** Plain text (or a light subset of it) rendered as safe, readable answer HTML. */
  function answerHtml(text) {
    const blocks = String(text ?? '').replace(/\r/g, '').split(/\n\s*\n/);
    const out = [];
    for (const block of blocks) {
      const lines = block.split('\n').map(line => line.trim()).filter(Boolean);
      if (!lines.length) continue;
      // A pipe table, a whitespace table, or plain prose/bullets — decided per block.
      if (lines.every(line => /^\|.*\|$/.test(line))) {const html = answerTable(lines); out.push(html || lines.map(line => `<p>${answerInline(line)}</p>`).join('')); continue;}
      const space = answerSpaceTable(lines);
      if (space) {out.push(space); continue;}
      let bullets = [];
      const flushBullets = () => {if (bullets.length) {out.push(`<ul class="answer-list">${bullets.map(item => `<li>${item}</li>`).join('')}</ul>`); bullets = [];}};
      for (const line of lines) {
        const heading = line.match(/^#{1,6}\s*(.+)$/) || line.match(/^【(.+)】$/) || line.match(/^\*\*([^*]+)\*\*$/) || (/^(?:[一二三四五六七八九十]+[、.]|\d+[、.])/.test(line) && line.length <= 26 ? [null, line.replace(/^(?:[一二三四五六七八九十]+[、.]|\d+[、.])/, '')] : null);
        if (heading) {flushBullets(); out.push(answerSection(heading[1])); continue;}
        const bullet = line.match(/^[-*•·]\s*(.+)$/) || line.match(/^\d+[.)]\s*(.+)$/);
        if (bullet) {bullets.push(answerInline(bullet[1])); continue;}
        flushBullets();
        out.push(`<p>${answerInline(line)}</p>`);
      }
      flushBullets();
    }
    return out.join('') || empty('暂无内容。');
  }
  function adviceHtml(value) {
    return esc(value).replace(/\*\*([^*\n]{1,160})\*\*/g, '<strong>$1</strong>');
  }
  /** Identity of one day's records: any change makes previously generated advice stale. */
  function mealsFingerprint(date) {
    const rows = (state.meals || []).filter(row => row.date === date)
      .map(row => [row.mealType || '', row.mealTime || '', number(row.calories), number(row.protein), number(row.fat), number(row.carbs)].join(','));
    return `${date}|${rows.length}|${rows.sort().join(';')}`;
  }
  function renderAdvice(messages, date) {
    const container = $('#advice-content');
    const rows = Array.isArray(messages) ? messages.map(value => String(value || '').trim()).filter(Boolean) : [];
    const rich = messages.some(message => /\n|^\s*\||^#{1,6}\s|^【/.test(String(message || '')));
    const prefCount = typeof readPreferences === 'function' ? readPreferences().length : 0;
    const prefNote = prefCount ? `<p class="fine-print advice-pref-note">已带上 ${prefCount} 条偏好</p>` : '';
    if (!rows.length) {
      container.innerHTML = empty('目前记录不足，暂不作判断', '先记两三天，建议会自己长出来。');
    } else if (rich) {
      container.innerHTML = `<div class="answer">${rows.map(message => answerHtml(message)).join('')}</div>${prefNote}`;
    } else {
      // 第一句是评价，单独成行、加重；后面的动作保持列表，避免两句糊成一段。
      // 模型常把「评价 + 动作」塞进一条消息，这里按句号再拆一次，只为显示分层，不改内容。
      let verdict = rows[0];
      let actions = rows.slice(1);
      if (!actions.length) {
        const parts = rows[0].split(/(?<=[。！？])/).map(part => part.trim()).filter(Boolean);
        if (parts.length > 1) { verdict = parts[0]; actions = parts.slice(1); }
      }
      container.innerHTML = `<div class="answer advice-answer"><p class="advice-verdict">${adviceHtml(verdict)}</p>`
        + (actions.length ? `<ul class="answer-list advice-actions">${actions.map(message => `<li>${adviceHtml(message)}</li>`).join('')}</ul>` : '')
        + `</div>${prefNote}`;
    }
    container.dataset.date = date || '';
    container.dataset.fingerprint = validDate(date) ? mealsFingerprint(date) : '';
  }
  // Carbohydrate headroom left after protein and fat targets; null when targets are incomplete.
  function carbCap(p, range) {
    // calorieTarget can be empty on a temporary-target day; fall back to the day's range max so the
    // carbohydrate limit still renders instead of showing a dash.
    const kcal = number(p.calorieTarget) ?? number(range && range.max), protein = number(p.proteinMax), fat = number(p.fatMax);
    if (kcal === null || kcal <= 0) return null;
    const rest = kcal - (protein === null ? 0 : protein * 4) - (fat === null ? 0 : fat * 9);
    return rest > 0 ? Math.round(rest / 4) : null;
  }
  /** Shows a retryable bar instead of leaving the page half-drawn. */
  function showRenderError(error) {
    const bar = $('#render-error'), text = $('#render-error-text');
    if (text) { text.textContent = ''; text.innerHTML = empty('这一屏没能画出来', '点「重新加载」通常就好（记录已保存在本机）。错误：' + (error && error.message ? error.message : '未知错误'), 'error'); }
    if (bar) bar.hidden = false;
  }
  function render() {
    if (!state) return; // nothing to draw yet; loadState() calls render() again
    try { renderBody(); if (typeof renderTrainingOverview === "function") renderTrainingOverview(); } catch (error) { showRenderError(error); }
  }
  function arrangeEnergyCard() {
    const card = $('.energy-card');
    if (!card) return;
    const body = $('.energy-body', card);
    const ring = $('#energy-ring', card);
    const detail = $('.energy-detail', card);
    if (!body || !ring || !detail || (body.contains(ring) && body.contains(detail))) return;
    body.replaceChildren(ring, detail);
  }
  function renderBody() {
    arrangeEnergyCard();
    const count=state.meals.filter(row=>row.date===activeDate).length;
    const hint=$('#chat-data-context'); if(hint)hint.textContent=`分析日期：${activeDate} · 已保存 ${count} 条餐食（未确认预览和问答照片不计入饮食）`;
    const dateLabel=$('#chat-date-label'); if(dateLabel) dateLabel.textContent = activeDate === localDate() ? '今天' : activeDate.slice(5);
    // 页眉用日期而不是口号：今天页首先回答「这是哪一天」。
    const runningDate=$('#running-date');
    const day=new Date(activeDate+'T00:00:00');
    const week='日一二三四五六'[day.getDay()];
    const cnNum=n=>{const d='零一二三四五六七八九'; if(n<10)return d[n]; if(n<20)return '十'+(n%10?d[n%10]:''); return d[Math.floor(n/10)]+'十'+(n%10?d[n%10]:'');};
    if (runningDate) runningDate.textContent=`${cnNum(day.getMonth()+1)}月${cnNum(day.getDate())}日 · 周${week}`;
    const folioDay=$('#folio-day'); if (folioDay) folioDay.textContent=String(day.getDate());
    const mastheadMeta=$('#today-meta');
    if (mastheadMeta) mastheadMeta.textContent=`${count?`${count} 餐`:'还没有餐食'}`;
    const adviceHint=$('#advice-data-context'); if(adviceHint)adviceHint.textContent=`分析日期：${activeDate} · 已保存 ${count} 条餐食`;
    const adviceNode=$('#advice-content'), stale=$('#advice-stale');
    if (stale) {
      const baked=adviceNode?.dataset?.fingerprint, shown=adviceNode?.dataset?.date;
      const isStale=!!baked && shown===activeDate && baked!==mealsFingerprint(activeDate);
      stale.hidden=!isStale;
      if (isStale) stale.textContent='这条建议是按当时的记录生成的，之后记录有变化。请点「获取建议」重新生成。';
    }
    const meals = state.meals.filter(meal => meal.date === activeDate);
    const totals = totalsFor(meals), p = effectiveProfileForDate(activeDate);
    // 记录页页眉：只留当日摘要，日期由 running head 负责。
    const recordsMeta=$('#records-meta');
    if (recordsMeta) {
      const habitRow=(state.habits||[]).find(row=>row && row.date===activeDate);
      const exerciseRows=habitRow && Array.isArray(habitRow.exercises) ? habitRow.exercises : [];
      recordsMeta.textContent=`${count?`${count} 餐`:'还没有餐食'}${Math.round(Number(totals.calories)||0)?` · ${Math.round(Number(totals.calories))} kcal`:''}${exerciseRows.length?` · 训练 ${exerciseRows.length} 个动作`:''}`;
    }
    // 饮食页也要看得到训练：一行「今天练了什么 / 多少容量」，点进去就是训练面板。
    const trainingLine = $('#today-training-line');
    if (trainingLine) {
      const habit = (state.habits || []).find(row => row && row.date === activeDate);
      const rows = habit && Array.isArray(habit.exercises) ? habit.exercises : [];
      const volume = typeof trainingVolumeOf === 'function' ? trainingVolumeOf(rows) : 0;
      trainingLine.hidden = !rows.length;
      trainingLine.textContent = rows.length ? `训练 ${rows.length} 个动作 · 容量 ${fmt(volume, 0)} kg` : '';

    }
    $('#calorie-value').textContent = fmt(totals.calories,0);
    // 没记饮食时把空环与宏量格收起来：一屏只留「还没记」和记一餐的入口，别用空数字占版面。
    const noFoodYet = !meals.length && totals.calories === null;
    const ringNode = $('#energy-ring'), macroNode = $('#macro-summary');
    if (ringNode) ringNode.hidden = noFoodYet;
    if (macroNode) macroNode.hidden = noFoodYet;
    const energyCard = ringNode ? ringNode.closest('.energy-card') : null;
    if (energyCard) energyCard.classList.toggle('is-empty', noFoodYet);
    const range = p.intakeRange;
    const rangeUnset = !!(range && range.unset);
    // C 节：目标只给一个数，误差用 ±2% 说明，依据与数字同屏同步更新。
    // 未测算时不显示占位数字（以前会把 2150 这类兜底值当目标写在环上）。
    const target = rangeUnset ? null : number(range ? range.max : p.calorieTarget);
    $('#calorie-target').textContent = target === null ? '—' : fmt(target, 0);
    const basisNode = $('#calorie-basis');
    if (basisNode) {
      const basisWord = rangeUnset ? '未测算' : range ? (range.trained ? '按训练日' : '按休息日') : '按默认';
      basisNode.textContent = rangeUnset ? '补齐档案后显示区间' : target === null ? '' : basisWord + ' · ±2%';
    }
    // 不截断：超出目标的部分要能被环和下方差额行看到。
    const rawRatio = totals.calories !== null && number(p.calorieTarget) > 0 ? totals.calories / p.calorieTarget : 0;
    const ratio = Math.min(1, Math.max(0, rawRatio));
    // 达到目标时填满一圈；超出量从同一起点叠加警示色，最多再覆盖一圈。
    const overRatio = Math.max(0, rawRatio - 1);
    $('#energy-ring').style.setProperty('--progress',`${(ratio*360).toFixed(1)}deg`);
    $('#energy-ring').style.setProperty('--over',`${(Math.min(overRatio, 1) * 360).toFixed(1)}deg`);
    // 差值必须跟屏幕上显示的上下限同一口径：以前用 calorieTarget 算「超出区间上限」会多算。
    const floor = number(range ? range.min : p.calorieTarget);
    const cap = number(range ? range.max : p.calorieTarget);
    $('#calorie-caption').textContent = rangeUnset ? '还没有可用的目标区间：到「我的 → 身体档案与目标」补齐性别、身高、体重与年龄。' : !meals.length ? '还没有餐食记录，摄入量未知。' : totals.calories === null ? '部分餐食缺少热量，无法计算完整汇总。' : number(p.calorieTarget) === null ? '尚未设置每日热量目标。' : `${totals.calories < floor ? `距区间下限还差 ${fmt(floor-totals.calories,0)} kcal` : totals.calories <= cap ? `在区间内，距上限 ${fmt(cap-totals.calories,0)} kcal` : `超出区间上限 ${fmt(totals.calories-cap,0)} kcal`}。`;
    // What to do next, not just how far off the target is: a number without an action is useless.
    const actionBox = $('#calorie-action');
    if (actionBox) {
      const parts = [];
      const protein = number(totals.protein), proteinMin = number(p.proteinMin);
      const fat = number(totals.fat), fatMax = number(p.fatMax);
      const kcal = number(totals.calories), actionCap = range ? number(range.max) : number(p.calorieTarget);
      if (protein !== null && proteinMin !== null && protein < proteinMin) {
        const gap = proteinMin - protein;
        // 只说方向、不点名具体食物：以前按缺口给「一掌心大小的鸡胸」这类健身语境例子，
        // 对普通用户是额外门槛；1.1.37 也删过克数等价换算，这里不回到「吃什么、吃多少」的清单。
        if (gap > 30) parts.push(`优先补蛋白：还差 ${fmt(gap,0)} g，接下来两餐各补一份蛋白质（蛋、豆制品、奶或瘦肉）`);
        else parts.push(`优先补蛋白：还差 ${fmt(gap,0)} g，下一餐补一份蛋白质（蛋、豆制品、奶或瘦肉）`);
      }
      if (fat !== null && fatMax !== null && fat > fatMax) parts.push(`脂肪超 ${fmt(fat - fatMax,0)} g：剩下的菜改白灼或清蒸，别再额外加油`);
      if (kcal !== null && actionCap !== null && kcal > actionCap) parts.push(`热量已超上限 ${fmt(kcal - actionCap,0)} kcal：不再加餐，晚餐只吃蛋白加蔬菜`);
      if (!parts.length && protein !== null && proteinMin !== null && protein >= proteinMin) parts.push('蛋白质已达标，剩下的额度分给主食与蔬菜即可。');
      // 能量卡曾经一口气列出三条提示，把「＋ 记录一餐」挤到了屏幕外。
      // 现在只留最该做的一条，其余收进 details。
      const note = parts.length > 1
        ? '<details class="energy-more"><summary>另外 ' + (parts.length - 1) + ' 条提示</summary>'
          + parts.slice(1).map(text => '<p>' + esc(text) + '</p>').join('') + '</details>'
        : '';
      actionBox.innerHTML = parts.length ? '<p class="energy-hint">' + esc(parts[0]) + '</p>' + note : '';
    }
  /**
   * 记录可信度（1.4.56 引入，1.4.58 起只存内部）：这个 App 的热量是估的，估的基础是记录全不全。
   * 用户明确要求「允许误差、不对外展示」——所以不占界面，只给内部两处逻辑用：
   * 目标校准（低可信度的日子不同权）与 AI 提示（别把估算说成精确值）。
   */
  // 可信度缓存键（只存内部；键名走常量，避免裸字面量散落）
  const INTAKE_CONFIDENCE_KEY = 'qingheng.intakeConfidence';
  function intakeConfidence(date = activeDate) {
    const history = Array.isArray(state.meals) ? state.meals : [];
    const meals = history.filter(row => row && row.date === date && number(row.calories) !== null);
    if (!meals.length) return {level: 'none', score: 0, reasons: ['今天还没有可用记录'], meals: 0, recordedDays: 0};
    let score = 100;
    const reasons = [];
    if (meals.length < 2) { score -= 25; reasons.push('今天只记了 ' + meals.length + ' 餐'); }
    const oilTracked = meals.filter(row => number(row.oilGrams) > 0 || row.oilIncluded === true).length;
    if (oilTracked === 0) { score -= 20; reasons.push('没有一处标了烹调用油'); }
    else if (oilTracked / meals.length < 0.5) { score -= 20; reasons.push('多数餐没标用油'); }
    const detailed = meals.filter(row => Array.isArray(row.items) && row.items.length > 0).length;
    if (detailed / meals.length < 0.5) { score -= 10; reasons.push('有一半餐只有总数、没有逐项'); }
    let recordedDays = 0;
    for (let offset = 0; offset < 7; offset++) {
      const day = typeof shiftDay === 'function' ? shiftDay(date, -offset) : date;
      if (history.some(row => row && row.date === day && number(row.calories) !== null)) recordedDays += 1;
    }
    if (recordedDays <= 2) { score -= 15; reasons.push('近 7 天只记了 ' + recordedDays + ' 天'); }
    else if (recordedDays <= 4) { score -= 8; reasons.push('近 7 天记了 ' + recordedDays + ' 天'); }
    score = Math.max(10, Math.min(100, score));
    // 只记了一餐就没有「一天」可言：无论分数多少都按低可信度处理。
    const level = meals.length < 2 ? 'low' : score >= 85 ? 'high' : score >= 60 ? 'medium' : 'low';
    return {level, score, reasons, meals: meals.length, recordedDays};
  }
  /** 只写本地缓存，不改界面。上限 60 天，滚动保留。 */
  function recordIntakeConfidence() {
    const confidence = intakeConfidence();
    if (!confidence || confidence.level === 'none') return confidence;
    try {
      const map = JSON.parse(localStorage.getItem(INTAKE_CONFIDENCE_KEY) || '{}') || {};
      map[activeDate] = {level: confidence.level, score: confidence.score, reasons: confidence.reasons.slice(0, 3)};
      const dates = Object.keys(map).sort();
      for (const old of dates.slice(0, Math.max(0, dates.length - 60))) delete map[old];
      localStorage.setItem(INTAKE_CONFIDENCE_KEY, JSON.stringify(map));
    } catch {}
    return confidence;
  }
  /** 按日期取可信度：当天现算，历史读缓存；取不到时返回 high（不参与扣分）。 */
  function intakeConfidenceLevelFor(date) {
    if (date === activeDate) return intakeConfidence(date).level;
    try {
      const map = JSON.parse(localStorage.getItem(INTAKE_CONFIDENCE_KEY) || '{}') || {};
      return (map[date] && map[date].level) || 'high';
    } catch { return 'high'; }
  }
    $('#macro-summary').innerHTML = [['protein','蛋白质',p.proteinMin,p.proteinMax],['fat','脂肪',p.fatMin,p.fatMax],['carbs','碳水',null,carbCap(p, range)]].map(([key,label,min,max]) => {const value = totals[key], progress = value !== null && number(max)>0 ? Math.min(100,value/max*100) : 0; return `<div><span class="macro-label">${label}</span><div class="macro-value">${fmt(value)} <small>g</small></div><div class="progress-track"><span data-progress="${progress}"></span></div><span class="macro-target">${min !== null && number(min)!==null && number(max)!==null ? `目标 ${fmt(min)}–${fmt(max)} g` : key === 'carbs' ? (number(max)>0 ? `参考上限约 ${fmt(max,0)} g` : '设置热量目标后显示进度') : '目标未设置'}</span></div>`;}).join('');
    $$('#macro-summary [data-progress]').forEach(node => {node.style.width=`${Number(node.dataset.progress)}%`;});
    recordIntakeConfidence();
    const measurements = state.measurements.filter(item => validDate(item.date) && item.date <= activeDate).sort((a,b) => b.date.localeCompare(a.date));
    const weight = latestField(measurements,'weight'), waist = latestField(measurements,'waist'), bodyFat = latestField(measurements,'bodyFat');
    const bmi = weight && number(p.height)>0 ? weight.weight / ((p.height/100)**2) : null;
    // 身体近况：数值 + 较上次的变化，日期只写一次（原来四格各贴一个 ISO 日期）。
    const prevField = (key, date) => {
      const older = measurements.find(item => item.date < date && number(item[key]) !== null);
      return older ? number(older[key]) : null;
    };
    const daysBetween = (from, to) => {
      try { return Math.round((new Date(to + 'T00:00:00') - new Date(from + 'T00:00:00')) / 86400000); } catch { return null; }
    };
    const deltaLine = (value, prev, unit) => {
      if (value === null || value === undefined) return '';
      if (prev === null) return '首次记录';
      const diff = Number(value) - prev;
      if (!Number.isFinite(diff) || Math.abs(diff) < 0.05) return '与上次持平';
      return `较上次 ${diff > 0 ? '＋' : '－'}${fmt(Math.abs(diff), 1)} ${unit}`.trim();
    };
    const bodyCells = [['体重', weight?.weight, 'kg', weight?.date, 'weight'], ['BMI', bmi, '', '', null], ['腰围', waist?.waist, 'cm', waist?.date, 'waist'], ['体脂率', bodyFat?.bodyFat, '%', bodyFat?.date, 'bodyFat']];
    const measured = weight?.date || waist?.date || bodyFat?.date || '';
    const ago = measured ? daysBetween(measured, activeDate) : null;
    $('#latest-measurement').innerHTML = bodyCells.map(([label, value, unit, date, key]) => {
      const delta = key && date ? deltaLine(value, prevField(key, date), unit) : '';
      const shown = value === null || value === undefined ? '—' : fmt(value);
      return `<div class="stat-cell"><span class="stat-label">${label}</span><div class="stat-number${shown === '—' ? ' is-empty' : ''}">${shown}<small>${shown === '—' ? '' : unit}</small></div>${delta ? `<span class="stat-delta">${esc(delta)}</span>` : ''}</div>`;
    }).join('') + `<p class="stat-when fine-print">${measured ? `最近测量 ${esc(measured)}${ago !== null && ago > 0 ? `（${ago} 天前）` : '（今天）'}` : '还没有身体测量'}</p>`;
    const habit = state.habits.find(item => item.date === activeDate) || {};
    // 训练情况由动作决定（2026-11-18）：不再读手填标记，只报「记了什么」。
    const training = trainedOn(activeDate) ? '已训练' : '未记录';
    // SVG icons instead of ↗ ♧ ☾ ◇: those characters rendered differently on every ROM.
    const tiles = [
      ...(trainingEnabled() ? [['icon-glyph-training.svg', training, '训练']] : []),
      ['icon-habit-steps.svg', number(habit.steps) === null ? '未记录' : `${fmt(habit.steps,0)} 步`, '日常活动'],
      ['icon-habit-sleep.svg', number(habit.sleep) === null ? '未记录' : `${fmt(habit.sleep)} 小时`, '睡眠'],
      ['icon-water.svg', number(habit.water) === null ? '未记录' : `${fmt(habit.water,0)} ml`, '饮水']
    ];
    // 四个格子改成一行：今天页只交代「记了什么」，改去记录页改，且进去不弹输入法。
    $('#habit-summary').innerHTML = '<button type="button" class="hub-row habit-jump" data-habit-jump>'
      + '<span class="hub-text"><span class="hub-title">日常习惯</span><span class="hub-summary">'
      + esc((() => {
        const parts = tiles.filter(([, value]) => !String(value).includes('未记录')).map(([, value, label]) => `${label} ${value}`);
        return parts.length ? parts.join(' · ') : '点这里补步数、睡眠、饮水';
      })())
      + '</span></span><span class="hub-arrow" aria-hidden="true">›</span></button>';
    const recordMeals=[...state.meals].sort((a,b) => String(b.date).localeCompare(String(a.date)));
    renderTodayTimeline($('#today-meals'), meals);
    renderRecordMeals(favoriteOnlyMeals ? recordMeals.filter(row => row.favorite === true) : recordMeals);
    $('#settings-status').textContent = state.settings.apiConfigured === true ? '已配置 · 密钥不回传' : settingsKnown ? '未配置外部 API' : '配置状态未知';
    $('#estimate-mode').textContent = state.settings.apiConfigured === true ? '照片还需已启用视觉模型。' : settingsKnown ? '当前使用本地估算，不发送给外部模型；结果仍需手动检查确认。' : '尚未加载手机配置，请稍后重试。';
    renderChat();
    renderTrainingInsights();
    renderDailyCheck();
    renderBodyQuick();
    renderWeekPlan();
    renderTrendWarnings();
    if (typeof renderDietTrend === 'function') renderDietTrend();
    applyTrainingVisibility();
    if (typeof renderAiPlan === "function") renderAiPlan();
    if (typeof renderAdviceOrder === "function") renderAdviceOrder();
    if (typeof renderSlotHint === "function") renderSlotHint();
    if (typeof renderLastChat === "function") renderLastChat();
    renderTargetStatus();
    renderTrends();
    renderUndatedMeals();
    renderHub();
  }
  /** Creates the live row once; complete answer blocks keep their DOM nodes as later text arrives. */
  function beginChatStream(question, hasImage, date) {
    const log = $('#chat-log');
    if (!log) return null;
    const dayHeader = document.createElement('p');
    dayHeader.className = 'chat-day stream-chat-day';
    dayHeader.textContent = String(date || '');
    const dayCount = document.createElement('span'); dayCount.textContent = '正在回答';
    dayHeader.appendChild(dayCount);
    const box = document.createElement('div');
    box.className = 'meal-row list-row stream-row';
    box.setAttribute('role', 'listitem');
    box.innerHTML = '<div class="row-body"><div class="row-head"><strong></strong>'
      + `${hasImage ? '<span class="row-tag">含照片</span>' : ''}<span class="row-tag">正在回答</span></div>`
      + '<div class="answer stream-answer"><div class="stream-think" hidden></div>'
      + '<div class="stream-status">模型正在思考…</div><div class="stream-text"></div>'
      + '<span class="stream-caret" aria-hidden="true">▍</span></div></div>';
    $('strong', box).textContent = question || '（照片提问）';
    log.prepend(box);
    log.prepend(dayHeader);
    // 回答长在页面下方：把日期行和气泡滚进视野，否则点了「提问」像没反应。
    nextFrame(() => {if (dayHeader.isConnected) dayHeader.scrollIntoView({block: 'start', behavior: 'smooth'});});
    const state = {box, dayHeader, text: '', renderedLength: 0, thinking: '', body: $('.stream-text', box),
      status: $('.stream-status', box), caret: $('.stream-caret', box), think: $('.stream-think', box),
      activeBlock: null, activeKind: '', started: false, frame: 0};
    if (state.status) state.status.textContent = '模型正在思考…';
    state.hint = setTimeout(() => {
      if (!state.started && state.status) state.status.textContent = '推理模型正在整理思路…';
    }, 4000);
    return state;
  }
  function streamBlockKind(value) {
    const block = String(value || '').trimStart();
    if (/^\|/.test(block)) return 'table';
    if (/^(?:#{1,6}\s|【|\*\*|[一二三四五六七八九十]+[、.]\s)/.test(block)) return 'section';
    if (/^(?:[-*•·]\s+|\d+[.)]\s+)/.test(block)) return 'list';
    return 'text';
  }
  function renderStreamBlock(box, value, complete) {
    const raw = String(value || '');
    if (!raw.trim()) return;
    let node = box.activeBlock;
    if (!node) {
      node = document.createElement('div');
      box.body.appendChild(node);
      box.activeBlock = node;
      box.activeKind = '';
    }
    const kind = streamBlockKind(raw);
    if (kind !== 'text' && box.activeKind !== kind) {
      node.className = `stream-block stream-block-pending stream-block-pending--${kind}`;
      node.innerHTML = kind === 'table'
        ? '<span class="stream-placeholder-line"></span><span class="stream-placeholder-line"></span><span class="stream-placeholder-line"></span>'
        : '<span class="stream-placeholder-line stream-placeholder-line--heading"></span>';
      box.activeKind = kind;
      box.activePlaceholderCount = kind === 'table' ? 3 : 1;
    }
    if (kind === 'text' && !box.activeKind) box.activeKind = 'text';
    if (kind === 'table' || kind === 'list') {
      const lines = raw.split('\n').filter(line => line.trim()).length;
      const rows = kind === 'table' ? Math.max(3, Math.min(lines, 9)) : Math.max(1, Math.min(lines, 8));
      while (box.activePlaceholderCount < rows) {
        const skeleton = document.createElement('span'); skeleton.className = 'stream-placeholder-line';
        node.appendChild(skeleton); box.activePlaceholderCount++;
      }
    }
    if (!complete) {
      if (box.activeKind === 'text') {node.className = 'stream-block'; node.textContent = raw;}
      return;
    }
    node.innerHTML = answerHtml(raw);
    node.className = 'stream-block stream-block-ready';
    box.activeBlock = null; box.activeKind = ''; box.activePlaceholderCount = 0;
  }
  function flushChatStream(box, complete = false) {
    if (!box?.body) return;
    let rest = box.text.slice(box.renderedLength);
    let boundary;
    while ((boundary = /\n[ \t]*\n/.exec(rest))) {
      renderStreamBlock(box, rest.slice(0, boundary.index), true);
      box.renderedLength += boundary.index + boundary[0].length;
      rest = box.text.slice(box.renderedLength);
    }
    renderStreamBlock(box, rest, complete);
    if (complete) box.renderedLength = box.text.length;
  }
  function pushChatStream(box, chunk) {
    if (!box || !chunk) return;
    if (!box.started) {
      box.started = true;
      clearTimeout(box.hint);
      if (box.status) box.status.hidden = true;
      // Keep the reasoning visible but small once the answer starts: a one-line summary, tappable.
      if (box.thinking && box.think) {
        box.think.textContent = `已思考 ${box.thinking.length} 字（点击展开）`;
        box.think.classList.add('is-summary');
      }
    }
    box.text += chunk;
    // 每个 token 写一次 DOM 会让长回答在 WebView 上抖；合批到一帧只写一次。
    if (!box.frame) {
      box.frame = nextFrame(() => {
        box.frame = 0;
        flushChatStream(box);
        box.caret.hidden = false;
      });
    }
  }
  /** Reasoning fragments from a reasoning model: shown, never merged into the answer. */
  function pushChatThinking(box, chunk) {
    if (!box || !chunk || !box.think) return;
    if (box.started) return;
    box.thinking += chunk;
    box.think.hidden = false;
    box.think.textContent = box.thinking.length > 600 ? '…' + box.thinking.slice(-600) : box.thinking;
  }
  function endChatStream(box) {
    if (box?.hint) clearTimeout(box.hint);
    if (box?.frame) {cancelFrame(box.frame); box.frame = 0;}
    if (!box?.adopted && box?.box?.parentNode) box.box.parentNode.removeChild(box.box);
    if (!box?.adopted && box?.dayHeader?.parentNode) box.dayHeader.parentNode.removeChild(box.dayHeader);
  }
  function finishChatStream(box, answer) {
    if (!box) return;
    const final = String(answer || '').trim(), received = box.text.trimEnd();
    if (!final.startsWith(received)) {
      if (!received || !final.endsWith(received)) throw new Error('流式内容与最终回答不一致，请重试。');
      if (box.frame) {cancelFrame(box.frame); box.frame = 0;}
      flushChatStream(box, true);
      const prefix = final.slice(0, final.length - received.length);
      if (prefix.trim()) {
        const node = document.createElement('div');
        node.className = 'stream-block stream-block-ready';
        node.innerHTML = answerHtml(prefix);
        box.body.insertBefore(node, box.body.firstChild);
      }
    } else {
      if (box.frame) {cancelFrame(box.frame); box.frame = 0;}
      box.text = final;
      flushChatStream(box, true);
    }
    clearTimeout(box.hint);
    if (box.status) box.status.hidden = true;
    if (box.caret) box.caret.hidden = true;
    box.finished = true;
  }
  /**
   * 把流式回答写进任意容器（今天页的训练建议卡也要有「正在思考」这一段）。
   * 返回 /api/chat/stream 的最终 data；不支持流式时抛错，交给调用方退回一次性接口。
   */
  async function streamInto(container, payload, placeholder = '模型正在思考…') {
    if (!container) throw new Error('缺少输出位置');
    if (!window.QinghengAdapter?.hasNative?.() || !navigator.onLine) throw new Error('当前环境不支持流式输出');
    container.hidden = false;
    container.innerHTML = '<div class="stream-think" hidden></div><span class="stream-text"></span><span class="stream-caret" aria-hidden="true">▍</span>';
    const think = $('.stream-think', container), text = $('.stream-text', container), caret = $('.stream-caret', container);
    text.textContent = placeholder;
    let thinking = '', buffer = '', pending = '', frame = 0, started = false;
    const flush = () => {frame = 0; if (text) text.textContent = pending; if (caret) caret.hidden = false;};
    window.QinghengStream = {
      onThink: chunk => {
        if (started || !chunk || !think) return;
        thinking += chunk;
        think.hidden = false;
        think.textContent = thinking.length > 600 ? '…' + thinking.slice(-600) : thinking;
      },
      onDelta: chunk => {
        if (!chunk) return;
        if (!started) {
          started = true;
          if (think) {
            think.hidden = !thinking;
            if (thinking) {think.textContent = `已思考 ${thinking.length} 字（点击展开）`; think.classList.add('is-summary');}
          }
        }
        buffer += chunk; pending = buffer;
        if (!frame) frame = nextFrame(flush);
      },
    };
    try {
      return await api('/api/chat/stream', payload);
    } finally {
      window.QinghengStream = null;
      if (frame) cancelFrame(frame);
      if (caret) caret.remove();
    }
  }
  /** Streams the answer through the adapter; throws when streaming is unavailable so the caller can fall back. */
  async function streamChat(payload) {
    if (!window.QinghengAdapter?.hasNative?.() || !navigator.onLine) throw new Error('当前环境不支持流式输出');
    const box = beginChatStream(payload.question, Boolean(payload.image), payload.date);
    if (!box) throw new Error('问答记录区域不可用，请重新打开页面后重试。');
    window.QinghengStream = {onDelta: text => pushChatStream(box, text), onThink: text => pushChatThinking(box, text)};
    try {
      const data = await api('/api/chat/stream', payload);
      finishChatStream(box, data?.reply);
      return {data, box};
    } catch (error) {
      endChatStream(box);
      throw error;
    } finally {
      window.QinghengStream = null;
    }
  }
  /** Citations for a saved answer: real https links only, collapsed by default. */
  function citationBlock(row) {
    const sources = Array.isArray(row && row.sources) ? row.sources.filter(item => item && typeof item.url === 'string' && /^https:\/\//.test(item.url)) : [];
    if (!sources.length) return '';
    const items = sources.map((item, index) => `<li><a href="${esc(item.url)}" target="_blank" rel="noreferrer">[${index + 1}] ${esc(String(item.title || item.url).slice(0, 90))}</a></li>`).join('');
    return `<details class="row-sources"><summary>来源 ${sources.length} 条</summary><ol>${items}</ol></details>`;
  }
  /** Rows the user marked as unhelpful; mirrored into /api/prefs so a new phone keeps them. */
  const unhelpfulChats = (() => {
    try {const saved = JSON.parse(localStorage.getItem(CHAT_UNHELPFUL_KEY) || '[]'); return new Set(Array.isArray(saved) ? saved.map(String) : []);} catch {return new Set();}
  })();
  function markUnhelpful(id) {
    if (!id) return;
    unhelpfulChats.add(id);
    try {localStorage.setItem(CHAT_UNHELPFUL_KEY, JSON.stringify([...unhelpfulChats]));} catch {}
    if (typeof schedulePrefsSync === 'function') schedulePrefsSync({unhelpfulChats: [...unhelpfulChats]});
    renderChat();
  }
  /** Refills the question box and, when consent is already given, asks again. */
  async function regenerateChat(id) {
    const row = (state.chats || []).find(item => String(item && item.id) === String(id));
    if (!row) {notice('找不到这条记录，可能已被清除。', true); return;}
    const box = $('#chat-question');
    if (box) {box.value = String(row.question || ''); box.focus();}
    window.scrollTo({top: 0, behavior: 'smooth'});
    if (typeof externalConsent === 'function' && externalConsent()) {await sendChat();}
    else notice('问题已填回输入框；到「我的 → 数据与关于」开启外部模型授权后点「提问」即可重新生成。');
  }
  let chatQuery = "";
  /** 按日期分组，组内保持倒序（最新在前）。 */
  function groupChatsByDate(rows) {
    const groups = [];
    for (const row of rows) {
      const date = String(row.date || "未标注日期");
      let group = groups.find(item => item.date === date);
      if (!group) { group = {date, rows: []}; groups.push(group); }
      group.rows.push(row);
    }
    return groups;
  }
  function chatMatches(row, query) {
    if (!query) return true;
    const hay = (String(row.question || "") + " " + String(row.answer || "")).toLowerCase();
    return hay.includes(query.toLowerCase());
  }
  /** 问答记录分页：默认只渲染最新 30 条，历史长了也不卡。 */
  let chatShownCount = 30;
  const CHAT_PAGE_SIZE = 30;
  let streamExpandedAnswer = null;
  function resetChatPaging() { chatShownCount = CHAT_PAGE_SIZE; }
  function showEarlierChats() { chatShownCount += CHAT_PAGE_SIZE; renderChat(); }
  // ---- 按天查看 ------------------------------------------------------------------------------
  // 历史越长，"更早的记录"越像抽奖。日期 chip 直接筛出某一天，两侧箭头只在有记录的日期之间走，
  // 到最新一天再按一次就回到全部——翻页和按天查询是同一个动作。
  let chatDayFilter = '';
  function chatRowsInScope() {
    const chats = Array.isArray(state.chats) ? state.chats : [];
    const base = favoriteOnlyChats ? chats.filter(row => row.favorite === true) : chats;
    return base.filter(row => chatMatches(row, chatQuery));
  }
  /** 有记录的日期，从新到旧；箭头按这个列表走，不会停在空白的一天。 */
  function chatDates() {
    const dates = [];
    for (const row of chatRowsInScope()) {
      const date = String(row.date || '');
      if (date && !dates.includes(date)) dates.push(date);
    }
    return dates.sort((a, b) => b.localeCompare(a));
  }
  function setChatDayFilter(date) {chatDayFilter = date || ''; resetChatPaging(); renderChat();}
  /** dir=-1 更早，dir=1 更晚。dates 是「从新到旧」，所以更早 = 索引 +1。 */
  function stepChatDay(dir) {
    const dates = chatDates();
    if (!dates.length) return;
    if (!chatDayFilter) { if (dir < 0) setChatDayFilter(dates[0]); return; }
    const index = dates.indexOf(chatDayFilter);
    if (index < 0) {setChatDayFilter(''); return;}
    const target = index - dir;
    if (target < 0) {setChatDayFilter(''); return;}
    setChatDayFilter(dates[Math.min(target, dates.length - 1)]);
  }
  function renderChatDayBar() {
    const toggle = $('#chat-day-toggle'), prev = $('#chat-day-prev'), next = $('#chat-day-next');
    if (!toggle) return;
    const dates = chatDates();
    const index = chatDayFilter ? dates.indexOf(chatDayFilter) : -1;
    toggle.textContent = chatDayFilter ? chatDayFilter.slice(5) : '全部日期';
    toggle.setAttribute('aria-pressed', chatDayFilter ? 'true' : 'false');
    toggle.setAttribute('aria-label', chatDayFilter ? `正在看 ${chatDayFilter}，点开换一天` : '按天查看问答记录');
    if (prev) prev.disabled = !dates.length || (index === dates.length - 1);
    // 「全部日期」已经在最新一端，再往后没有更晚的了。
    if (next) next.disabled = !dates.length || index < 0;
  }
  function adoptStreamChatRow(stream, row) {
    const live = stream?.box;
    if (!live || !row) return false;
    const id = String(row.id ?? ''), question = String(row.question || ''), answerText = String(row.answer || '');
    live.className = 'meal-row list-row';
    live.setAttribute('data-long-press', `chat:${id}`);
    const head = $('.row-head', live), title = $('strong', live), answer = $('.stream-answer', live);
    if (!head || !title || !answer) return false;
    title.textContent = question;
    Array.from(head.querySelectorAll('.row-tag,.fav-badge')).forEach(tag => tag.remove());
    const addTag = text => {const tag = document.createElement('span'); tag.className = 'row-tag'; tag.textContent = text; head.appendChild(tag);};
    if (question.includes('含照片')) addTag('含照片');
    if (/联网检索|参考来源|来源（联网/.test(answerText)) addTag('联网检索');
    if (row.favorite === true) {
      const badge = document.createElement('span'); badge.className = 'fav-badge'; badge.setAttribute('aria-label', '已收藏');
      const icon = document.createElement('span'); icon.className = 'inline-icon'; icon.setAttribute('aria-hidden', 'true');
      icon.innerHTML = SVG_ICONS['icon-bookmark.svg']; badge.appendChild(icon); head.appendChild(badge);
    }
    answer.className = 'answer';
    for (const selector of ['.stream-think','.stream-status','.stream-caret']) {
      const child = $(selector, answer); if (child?.parentNode) child.parentNode.removeChild(child);
    }
    if (answerText.length > 140) {
      const toggle = document.createElement('button'); toggle.type = 'button'; toggle.className = 'row-toggle-inline';
      toggle.dataset.chatToggle = id; toggle.setAttribute('aria-expanded', 'true'); toggle.textContent = '收起';
      answer.parentNode.insertBefore(toggle, answer.nextSibling);
      expandedChats.add(id);
    }
    const sources = citationBlock(row);
    if (sources) {
      const holder = document.createElement('div'); holder.innerHTML = sources;
      while (holder.firstChild) answer.parentNode.appendChild(holder.firstChild);
    }
    stream.adopted = true;
    return true;
  }
  function renderChat() {
    const log = $('#chat-log');
    const shown = chatRowsInScope();
    const dayRows = chatDayFilter ? shown.filter(row => String(row.date || '') === chatDayFilter) : shown;
    // No inline delete here: a long press opens copy / select / favourite / delete instead, so the
    // row keeps its width for the question, its tags, the date and a readable answer preview.
    const ordered = [...dayRows].reverse();
    const visible = ordered.slice(0, chatShownCount);
    const earlier = ordered.length - visible.length;
    const groups = groupChatsByDate(visible);
    const moreButton = earlier > 0
      ? `<button type="button" class="button subtle full-width" data-chat-more>更早的记录（还有 ${earlier} 条）</button>`
      : '';
    if (log) log.innerHTML = shown.length ? groups.map(group => "<p class=\"chat-day\">" + esc(group.date) + "<span>" + group.rows.length + " 条</span></p>" + group.rows.map(row => {
      // An answer that is nothing but JSON nulls ("nullnull…") is not an answer: say what happened
      // instead of showing the raw text, even if the stored record was never repaired.
      const raw = String(row.answer || '');
      const answer = /^(?:[\s\u200b-\u200f\u2060\ufeff]*null){3,}/i.test(raw)
        ? '这次回答没有正确返回（模型只输出了思考过程）。请重新提问；反复出现请换一个非推理模型。'
        : raw;
      if (streamExpandedAnswer && row.question === streamExpandedAnswer.question && answer === streamExpandedAnswer.answer) {
        streamExpandedAnswer.row = row;
        return '<div class="stream-slot" aria-hidden="true"></div>';
      }
      const id = String(row.id ?? '');
      const expanded = expandedChats.has(id);
      const long = answer.length > 140;
      const tags = []
        .concat(String(row.question || '').includes('含照片') ? ['含照片'] : [])
        .concat(/联网检索|参考来源|来源（联网/.test(answer) ? ['联网检索'] : [])
        .concat(row.source === 'api' ? [] : [])
        .join('');
      // 日期只在分组标题出现一次；行内不再重复。操作收进长按菜单，行里只留「展开全文」这个
      // 读的动作，所以一屏能多看一条记录。
      return `<div class="meal-row list-row" role="listitem" data-long-press="chat:${esc(id)}"><div class="row-body">`
        + `<div class="row-head"><strong>${esc(row.question || '')}</strong>`
        + `${row.favorite === true ? `<span class="fav-badge" aria-label="已收藏"><span class="inline-icon" aria-hidden="true">${SVG_ICONS['icon-bookmark.svg']}</span></span>` : ''}`
        + `${tags ? `<span class="row-tag">${esc(tags)}</span>` : ''}`
        + `</div>`
        + `<div class="answer${long && !expanded ? ' is-clamped' : ''}">${answerHtml(answer)}</div>`
        + `${long ? `<button type="button" class="row-toggle-inline" data-chat-toggle="${esc(id)}" aria-expanded="${expanded ? 'true' : 'false'}">${expanded ? '收起' : '展开全文'}</button>` : ''}`
        + citationBlock(row)
        + `</div></div>`;
    }).join("")).join("") + moreButton : empty(chatQuery ? "没有匹配「" + chatQuery + "」的记录。" : (favoriteOnlyChats ? "还没有收藏的问答记录。长按一条记录即可收藏。" : (chatDayFilter ? chatDayFilter + " 没有问答记录。" : "还没有问答记录。有疑问时，问一句。")));
    if (log && streamExpandedAnswer?.row) {
      const slot = $('.stream-slot', log);
      if (slot && adoptStreamChatRow(streamExpandedAnswer.box, streamExpandedAnswer.row)) slot.replaceWith(streamExpandedAnswer.box.box);
      streamExpandedAnswer = null;
    }
    renderChatDayBar();
    const node = $('#chat-mode');
    if (node) {
      const base = state.settings.apiConfigured === true
        ? '已配置模型：外发开关与授权在「我的 → 数据与关于」；问题与部分健康数据会发给该服务商，按 token 计费。'
        : '尚未配置 API Key：请先到「我的 → AI 模型与密钥」保存密钥；本地记录功能不受影响。';
      node.textContent = base;
    }
  }
  // ---- 上次训练建议（今天页训练卡的入口行）--------------------------------------------------------
  // 训练问答故意不写进全局问答历史（logToHistory:false），所以单独存一份，只在这里回看；
  // 这样训练卡不会再把饮食类问答当成「上次回答」。
  const LAST_TRAINING_KEY = 'qingheng.lastTrainingAdvice';
  function readLastTrainingAdvice() {
    try {
      const raw = localStorage.getItem(LAST_TRAINING_KEY);
      const saved = raw ? JSON.parse(raw) : null;
      return saved && saved.answer ? saved : null;
    } catch { return null; }
  }
  function saveLastTrainingAdvice(question, answer) {
    if (!answer) return;
    try {
      localStorage.setItem(LAST_TRAINING_KEY, JSON.stringify({
        date: localDate(), question: String(question || '').slice(0, 200),
        answer: String(answer).slice(0, 8000)
      }));
    } catch { }
  }
  /** Fills the "上次训练建议" row; stays hidden until a training question has been answered. */
  function renderLastChat() {
    const open = $('#last-chat-open');
    if (!open) return;
    const last = readLastTrainingAdvice();
    open.hidden = !last;
    if (!last) return;
    const question = $('#last-chat-question'), preview = $('#last-chat-preview');
    if (question) question.textContent = String(last.question || '（未记录问题）').slice(0, 42);
    if (preview) {
      const text = String(last.answer || '').replace(/\s+/g, ' ').trim();
      preview.textContent = text ? text.slice(0, 48) : '点开看上次训练建议的完整回答';
    }
  }
  $('#last-chat-open')?.addEventListener('click', () => {
    const last = readLastTrainingAdvice();
    const box = $('#training-advice-answer');
    if (!last || !box) return;
    box.hidden = false;
    box.innerHTML = answerHtml(last.answer);
    box.scrollIntoView({block: 'start', behavior: 'smooth'});
  });
  function renderPush(push) {
    const p = push || (window.QinghengAdapter.currentPush ? window.QinghengAdapter.currentPush() : (window.QinghengAdapter.pushDefaults || {}));
    const form = $('#push-form');
    if (form) {form.elements.enabled.checked = p.enabled === true; form.elements.analysisEnabled.checked = p.analysisEnabled === true; if (p.morningTime) form.elements.morningTime.value = p.morningTime; if (p.eveningTime) form.elements.eveningTime.value = p.eveningTime;}
    const exactButton = $('#exact-alarm-settings');
    if (exactButton) {exactButton.disabled = p.canScheduleExact === true; exactButton.textContent = p.canScheduleExact === true ? '精确闹钟已允许' : '允许精确闹钟';}
    const status = $('#push-status');
    if (status) status.textContent = p.enabled === true ? (p.analysisEnabled === true ? '已开启 · 后台自动分析' : '已开启 · 仅提醒') : '未开启';
    const detail = $('#push-detail');
    const weeklyEnabled = $('#weekly-enabled'), weeklyDay = $('#weekly-day'), weeklyTime = form?.elements?.weeklyTime;
    if (weeklyEnabled) weeklyEnabled.checked = p.weeklyEnabled !== false;
    if (weeklyDay) weeklyDay.value = String(number(p.weeklyDay) ?? 7);
    if (weeklyTime && p.weeklyTime) weeklyTime.value = p.weeklyTime;
    if (detail) detail.textContent = p.enabled !== true ? '到点会收到本地通知；需允许通知权限。' : `已设置 ${p.morningTime || '07:00'} 与 ${p.eveningTime || '20:30'}。每天最多 2 条（白天与晚间各一条），两次之间至少间隔 3 小时，不会在同一时段连发两条。周报${p.weeklyEnabled === false ? '已关闭' : `每周${['','一','二','三','四','五','六','日'][number(p.weeklyDay) ?? 7] || '日'} ${p.weeklyTime || '20:00'}`}。精确时间${p.canScheduleExact ? '已就绪' : '可能被系统延迟，请允许「闹钟与提醒」'}；通知权限${p.notificationsGranted ? '已允许' : '未允许'}。通知正文会自动精简到一行，展开可看全文；记录后还会有一次即时反馈（同样计入每日上限）。`;
    const summary = $('#hub-summary-push');
    if (summary) summary.textContent = p.enabled === true
      ? `${p.morningTime || '07:00'} / ${p.eveningTime || '20:30'} · ${p.analysisEnabled === true ? '后台自动分析' : '仅提醒'}`
      : '未开启 · 到点提醒与建议';
    return p;
  }
  async function loadPush() {
    try {renderPush(await api('/api/push'));}
    catch (error) {const detail = $('#push-detail'); if (detail) detail.textContent = error.message;}
  }
  let chatImage = null, chatImageVersion = 0, chatImageBusy = false;
  function clearChatImage() {lastCaptureId='';chatPhotoMeta=photoMeta(null);chatImageVersion++;chatImage=null;chatImageBusy=false;$('#chat-image').value='';$('#chat-gallery').value='';$('#chat-image-preview').hidden=true;$('#chat-image-view').removeAttribute('src');}
  $('#chat-image').addEventListener('change', async event => {
    const file = event.target.files[0], message = $('#chat-feedback');
    if (!file) {clearChatImage(); return;}
    const revision = ++chatImageVersion;
    chatImage = null; chatImageBusy = true;
    feedback(message,'正在本地压缩照片…');
    try {
      const result = await compressImage(file);
      if (revision !== chatImageVersion) return;
      chatImage = result; chatPhotoMeta=photoMeta(null); showPhotoTime('chat',chatPhotoMeta);
      $('#chat-image-view').src = result;
      $('#chat-image-preview').hidden = false;
      feedback(message,'照片已压缩为 JPEG，原始元数据不会上传。');
    } catch (error) {
      if (revision === chatImageVersion) {clearChatImage(); feedback(message,error.message,true);}
    } finally {if (revision === chatImageVersion) chatImageBusy = false;}
  });
  $('#chat-image-remove').addEventListener('click',()=>{clearChatImage();feedback($('#chat-feedback'),'已移除照片。');});
  // Tell the native layer which field opened the camera, so a recovered capture lands in the right place.
  const declareImageTarget = target => {try {const bridge = window.QinghengNative; if (bridge && typeof bridge.imageTarget === 'function') bridge.imageTarget(target);} catch {}};
  ['#meal-image','#meal-gallery'].forEach(id=>$(id).addEventListener('click',()=>declareImageTarget('meal')));
  ['#chat-image','#chat-gallery'].forEach(id=>$(id).addEventListener('click',()=>declareImageTarget('chat')));
  // The Android layer hands a capture back here when the page had to reload while the camera was open.
  window.__qinghengPendingImage = payload => {
    let parsed;
    try {parsed = typeof payload === 'string' ? JSON.parse(payload) : payload;} catch {return false;}
    if (!parsed || !['chat','meal'].includes(parsed.target) || typeof parsed.data !== 'string' || !/^data:image\/(jpeg|png|webp);base64,/.test(parsed.data)) return false;
    if (parsed.id && parsed.id === lastCaptureId) return true;
    if (parsed.target === 'chat') {
      chatImageVersion++; chatImageBusy = false; chatImage = parsed.data; chatPhotoMeta=photoMeta(parsed); showPhotoTime('chat',chatPhotoMeta);
      $('#chat-image-view').src = parsed.data; $('#chat-image-preview').hidden = false;
      switchTab('chat');
      feedback($('#chat-feedback'),'照片已就绪，已压缩并移除元数据。');
      $('#chat-image-preview').scrollIntoView({block:'nearest',behavior:'auto'});
    } else {
      syncCalendarDay(); imageVersion++; imageBusy = false; imageData = parsed.data; mealPhotoMeta=photoMeta(parsed); showPhotoTime('meal',mealPhotoMeta);
      $('#meal-image-preview').src = parsed.data; $('#image-preview').hidden = false;
      switchTab('records');
      feedback($('#estimate-feedback'),'照片已就绪，已压缩并移除元数据。确认同意后可生成估算预览。');
      $('#image-preview').scrollIntoView({block:'nearest',behavior:'auto'});
    }
    lastCaptureId = parsed.id || '';
    return true;
  };
  window.__qinghengImageError = message => notice(String(message), true);
  async function sendChat() {
    const button = $('#chat-send'), message = $('#chat-feedback'), question = $('#chat-question').value.trim();
    if (button.disabled) return;
    if (chatImageBusy) {feedback(message,'照片还在压缩，请稍等一下。',true); return;}
    if (!question && !chatImage) {feedback(message,'请先写下你的问题，或拍一张照片。',true); $('#chat-question').focus(); return;}
    if (!externalConsent()) {feedback(message,'请先到「我的 → 数据与关于」开启外部模型授权。',true); return;}
    if (question.length > 2000) {feedback(message,'问题请控制在 2000 字以内。',true); return;}
    // A sentence describing finished training becomes a draft card; nothing is written until confirmed.
    if (typeof parseTrainingDraft === 'function') {
      const draft = parseTrainingDraft(question, activeDate);
      if (draft) showTrainingDraft(draft); else renderTrainingDraft(null);
    }
    if (chatImage && (state.settings.apiConfigured !== true || state.settings.visionEnabled !== true || !state.settings.visionModel)) {feedback(message,'带照片提问需要已启用的视觉模型：DeepSeek 请使用 deepseek-flash，B.AI 请填写其支持图片的模型。',true); return;}
    if (!navigator.onLine) {feedback(message,'当前离线；可先记录数据，联网后再问。',true); return;}
    syncCalendarDay();
    const submittedImage = chatImage, submittedPhotoMeta = photoMeta(chatPhotoMeta), submittedDate = activeDate;
    button.disabled = true; feedback(message, submittedImage ? '正在上传照片并思考，请稍候…' : '正在思考，请稍候…');
    let liveStream = null;
    try {
      const history = (Array.isArray(state.chats) ? state.chats : []).slice(-5).flatMap(row => [{role:'user',content:String(row.question || '').slice(0,4000)},{role:'assistant',content:String(row.answer || '').slice(0,4000)}]);
      // Routing rule: a short question with no lookup intent is answered in the fast tier.
      const deepIntent = /(检索|搜索|查一下|最新|研究|证据|为什么|原理|对比|论文|指南|训练|练了|练什么|动作|组数|体重|体脂|蛋白|热量|吃了|睡眠|数据)/.test(question);
      const tier = !submittedImage && !deepIntent && question.length <= 24 ? 'fast' : 'deep';
      const payload = {question,history,date:submittedDate,allowExternal:true,anchors:anchorSummary(),tier,library:(libraryLookup(question, 8) || librarySummary(6)),webSearch:$('#chat-web').checked && navigator.onLine && tier === 'deep',...(submittedImage?{image:submittedImage,...submittedPhotoMeta}:{})};
      let data = null;
      try {
        const streamed = await streamChat(payload);
        data = streamed.data; liveStream = streamed.box;
      } catch (streamError) {
        // Streaming is only a nicety: whatever went wrong (a provider without SSE support, a proxy that
        // buffers, a mid-stream error, a timeout), the question still gets answered through the normal
        // route. Only if that also fails does the user see an error.
        try {
          data = await api('/api/chat', payload);
          feedback(message, '流式输出不可用，已改用一次性返回…');
        } catch (bufferedError) {
          throw new Error(`${bufferedError?.message || '回答失败'}（流式尝试：${streamError?.message || '失败'}）`);
        }
      }
      const reply = typeof data?.reply === 'string' ? data.reply.trim() : '';
      if (!reply) throw new Error('模型没有返回可读取的回答，请重试。');
      const sourceUrls = Array.isArray(data?.sources) ? data.sources.map(row => row && row.url).filter(url => typeof url === 'string' && /^https:\/\//.test(url)) : [];
      const withSources = reply;
      const stored = submittedImage ? `［含照片］${question}`.slice(0,2000) : question;
      let receivedMessage = data?.webSearch
        ? (data.webSearch.connected ? '已收到回答，已联网检索（' + data.webSearch.via + '，检索词：' + (data.webSearch.query || '') + '）。' : '已收到回答，但本次未能联网检索。')
        : (tier === 'fast' ? '已收到回答（快速档：不联网、只带最近三天数据）。' : '已收到回答。');
      if (data?.webSearch?.authorityLimited) receivedMessage += ' 未找到高权威来源，具体数值请核对。';
      feedback(message, receivedMessage);
      $('#chat-question').value = ''; acceptConsent('chat'); clearChatImage();
      if (liveStream) streamExpandedAnswer={question:stored,answer:withSources,box:liveStream};
      try {await loadState({quiet:true});} catch {state.chats = [...(Array.isArray(state.chats) ? state.chats : []),{date:localDate(),question:stored,answer:withSources}]; renderChat(); notice('回答已显示，但保存到手机失败，请勿重复提问。',true);}
      if (streamExpandedAnswer) streamExpandedAnswer=null;
    } catch (error) {
      if (liveStream) endChatStream(liveStream);
      streamExpandedAnswer=null;
      feedback(message,error.message,true);
    } finally {if(liveStream)endChatStream(liveStream);button.disabled = false;}
  }
  async function savePush(form) {
    const button = $('button[type=submit]',form), message = $('#push-feedback');
    if (button.disabled || !form.reportValidity()) return;
    button.disabled = true; feedback(message,'正在保存推送设置…');
    const body = {enabled:form.elements.enabled.checked, morningTime:form.elements.morningTime.value, eveningTime:form.elements.eveningTime.value, weeklyEnabled:form.elements.weeklyEnabled.checked, weeklyDay:Number(form.elements.weeklyDay.value) || 7, weeklyTime:form.elements.weeklyTime.value, analysisEnabled:form.elements.analysisEnabled.checked};
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(body.morningTime) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(body.eveningTime)) {feedback(message,'请输入 24 小时制时间，例如 07:00 与 20:30。',true); button.disabled = false; return;}
    if (body.analysisEnabled && state.settings.apiConfigured !== true) {feedback(message,'后台自动分析需要先在「我的 → AI 模型与密钥」保存 API Key。',true); button.disabled = false; return;}
    if (body.enabled) {
      const granted = await ensureNotificationPermission();
      if (!granted) feedback(message,'已保存设置，但系统通知权限未允许：请到手机「设置 → 应用 → 轻衡 → 通知」开启，否则到点不会有提醒。',true);
      try {renderPush(await api('/api/push',body)); feedback(message, granted ? '推送设置已保存。' : '推送设置已保存，但还需要在系统设置里允许通知。', !granted);}
      catch (error) {feedback(message,error.message,true);}
      button.disabled = false; return;
    }
    try {renderPush(await api('/api/push',body)); feedback(message,'推送设置已保存。');}
    catch (error) {feedback(message,error.message,true);} finally {button.disabled = false;}
  }
  async function ensureNotificationPermission() {
    try {
      const state = await api('/api/notification-permission');
      if (state?.granted === true) return true;
      if (state?.requestable !== true) return false;
      const result = await api('/api/notification-permission',{});
      return result?.granted === true;
    } catch {return false;}
  }

