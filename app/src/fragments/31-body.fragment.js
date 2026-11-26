/* Fragment 31-body -- 体重体态与日常习惯的视图层（2026-11-27 Phase 3，从 70-rest 迁入）
 * 只放身体数据卡、习惯刻度卡与习惯快捷值；领域计算与目标口径在 40-targets / 55-training-domain。
 */

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
