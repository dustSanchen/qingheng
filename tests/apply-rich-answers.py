from pathlib import Path
p = Path(r'D:\AI\health-android\app\src\main\assets\app.js')
s = p.read_text(encoding='utf-8')

def rep(a, b, count=1):
    global s
    assert s.count(a) == count, (s.count(a), a[:90])
    s = s.replace(a, b)

# ---- 1. Rich answer renderer ------------------------------------------------------------------
rep("""  function adviceHtml(value) {""",
"""  // ---- Rich answers ---------------------------------------------------------------------------
  // The model writes plain Chinese text. A small, explicit subset is understood so a reply can
  // carry a heading with a coloured icon, a bullet list, an uppercase label and a real table,
  // without ever trusting the text as markup: everything is escaped first, then re-assembled.
  const answerIconRules = [
    {tone:'protein', icon:'icon-nutrient-protein.svg', words:['蛋白质','蛋白']},
    {tone:'fat', icon:'icon-nutrient-fat.svg', words:['脂肪','油']},
    {tone:'carb', icon:'icon-nutrient-carb.svg', words:['碳水','主食','米饭','面条']},
    {tone:'energy', icon:'icon-energy.svg', words:['热量','卡路里','kcal','千卡']},
    {tone:'weight', icon:'icon-weight.svg', words:['体重','体脂','BMI','腰围','体重变化']},
    {tone:'training', icon:'icon-training.svg', words:['训练','力量','运动','健身']},
    {tone:'sleep', icon:'icon-sleep.svg', words:['睡眠','休息','入睡']},
    {tone:'water', icon:'icon-water.svg', words:['饮水','喝水','水分']},
    {tone:'warn', icon:'icon-warn.svg', words:['注意','警告','风险','偏高','超标','不足']},
    {tone:'ok', icon:'icon-check.svg', words:['完成','达标','很好','不错','已经']},
    {tone:'tip', icon:'icon-tip.svg', words:['建议','明天','调整','可以','优先']},
  ];
  function answerIcon(text) {
    const value = String(text || '');
    for (const rule of answerIconRules) if (rule.words.some(word => value.includes(word))) return rule;
    return {tone:'neutral', icon:'icon-sparkle.svg', words:[]};
  }
  /** Latin runs that were written in capitals are kept as an uppercase label above the heading. */
  function answerEyebrow(text) {
    const latin = String(text || '').match(/[A-Za-z][A-Za-z0-9 .,%/+-]{2,}/g);
    if (!latin) return '';
    const upper = latin.filter(run => run === run.toUpperCase() && /[A-Z]/.test(run));
    return upper.length ? upper.join(' · ').slice(0, 40) : '';
  }
  const answerInline = text => esc(text)
    .replace(/\\*\\*([^*]+)\\*\\*/g, '<strong>$1</strong>')
    .replace(/[`]{1}([^`]+)[`]{1}/g, '<code>$1</code>');
  function answerSection(title) {
    const clean = String(title || '').replace(/^[#\\s【\\[（(]+|[\\s】\\]）)】]+$/g, '').replace(/\\*\\*/g, '').trim();
    if (!clean) return '';
    const rule = answerIcon(clean);
    const eyebrow = answerEyebrow(clean);
    return `<div class="answer-section tone-${rule.tone}"><span class="inline-icon" aria-hidden="true"><img src="./${rule.icon}" alt="" width="18" height="18"></span>`
      + `<div>${eyebrow ? `<p class="answer-eyebrow">${esc(eyebrow)}</p>` : ''}<p class="answer-heading">${answerInline(clean)}</p></div></div>`;
  }
  /** Renders a pipe table when the block looks like one; returns '' otherwise. */
  function answerTable(rows) {
    const cells = row => row.replace(/^\\s*\\|/, '').replace(/\\|\\s*$/, '').split('|').map(cell => cell.trim());
    const head = cells(rows[0]);
    const body = rows.slice(1).filter(row => !/^[\\s|:-]+$/.test(row)).map(cells);
    if (!head.length || !body.length) return '';
    const numbers = new Set(body.map(row => row.length));
    const numeric = new Set();
    body.forEach(row => row.forEach((cell, i) => {if (cell && number(cell.replace(/[^\\d.-]/g, '')) !== null && /^[\\d.,%\\s\\-+]+$/.test(cell)) numeric.add(i);}));
    const headHtml = head.map(cell => `<th scope="col">${answerInline(cell)}</th>`).join('');
    const bodyHtml = body.map(row => `<tr>${head.map((_, i) => `<td${numeric.has(i) ? ' class="num"' : ''}>${answerInline(row[i] ?? '')}</td>`).join('')}</tr>`).join('');
    return `<table class="answer-table"><thead><tr>${headHtml}</tr></thead><tbody>${bodyHtml}</tbody></table>`;
  }
  /** Plain text (or a light subset of it) rendered as safe, readable answer HTML. */
  function answerHtml(text) {
    const lines = String(text ?? '').replace(/\\r/g, '').split('\\n');
    const out = [];
    let bullets = [], table = [];
    const flushBullets = () => {if (bullets.length) {out.push(`<ul class="answer-list">${bullets.map(item => `<li>${item}</li>`).join('')}</ul>`); bullets = [];}};
    const flushTable = () => {if (table.length) {const html = answerTable(table); if (html) out.push(html); else table.forEach(row => out.push(`<p>${answerInline(row)}</p>`)); table = [];}};
    for (const raw of lines) {
      const line = raw.trim();
      if (!line) {flushBullets(); flushTable(); continue;}
      if (/^\\|.*\\|$/.test(line)) {flushBullets(); table.push(line); continue;}
      flushTable();
      const heading = line.match(/^#{1,6}\\s*(.+)$/) || line.match(/^【(.+)】$/) || line.match(/^\\*\\*([^*]+)\\*\\*$/) || (/^(?:[一二三四五六七八九十]+[、.]|\\d+[、.])/.test(line) && line.length <= 26 ? [null, line.replace(/^(?:[一二三四五六七八九十]+[、.]|\\d+[、.])/, '')] : null);
      if (heading) {flushBullets(); out.push(answerSection(heading[1])); continue;}
      const bullet = line.match(/^[-*•·]\\s*(.+)$/) || line.match(/^\\d+[.)]\\s*(.+)$/);
      if (bullet) {bullets.push(answerInline(bullet[1])); continue;}
      flushBullets();
      out.push(`<p>${answerInline(line)}</p>`);
    }
    flushBullets(); flushTable();
    return out.join('') || '<p class="muted">暂无内容。</p>';
  }
  function adviceHtml(value) {""")

# ---- 2. Advice list uses the rich renderer ----------------------------------------------------
rep("""    container.innerHTML = rows.length
      ? `<ul class="advice-list">${rows.map(message => `<li>${adviceHtml(message)}</li>`).join('')}</ul>`
      : '<p>目前记录不足，暂不作判断。</p>';""",
"""    const rich = messages.some(message => /\\n|^\\s*\\||^#{1,6}\\s|^【/.test(String(message || '')));
    container.innerHTML = rows.length
      ? (rich
        ? `<div class="answer">${rows.map(message => answerHtml(message)).join('')}</div>`
        : `<div class="answer"><ul class="answer-list">${rows.map(message => `<li>${adviceHtml(message)}</li>`).join('')}</ul></div>`)
      : '<p>目前记录不足，暂不作判断。</p>';""")

# ---- 3. Chat answer and history render as rich text -------------------------------------------
rep("""<p>${esc(row.answer || "")}</p><p class="fine-print">${esc(row.date || "")}</p>""",
"""<div class="answer">${answerHtml(row.answer || '')}</div><p class="fine-print">${esc(row.date || "")}</p>""")

# ---- 4. Rows: more information per line, delete moved to an icon at the end --------------------
rep("""    container.innerHTML = meals.length ? meals.map(meal => `<div class="meal-row list-row" role="listitem"><div><strong>${esc(meal.name || '未命名餐食')}</strong><p>${showDate ? `${esc(meal.date)} · ` : ''}${esc(mealNames[meal.mealType] || meal.mealType || '餐食')}${clockPattern.test(String(meal.mealTime||'')) ? ` · ${esc(meal.mealTime)}` : ''} · 蛋白质 ${fmt(meal.protein)}g · 脂肪 ${fmt(meal.fat)}g · 碳水 ${fmt(meal.carbs)}g</p>${meal.photoTakenAt || meal.photoTimeSource ? `<p class="fine-print">${esc(photoTimeLabel(photoMeta(meal)))}</p>` : ''}</div><div class="meal-actions"><span class="meal-energy">${fmt(meal.calories,0)} <small>kcal</small></span>${meal.id !== undefined ? `<button type="button" class="delete-meal" data-delete-meal="${esc(meal.id)}" aria-label="删除${esc(meal.name || '餐食')}">删除</button>` : ''}</div></div>`).join('') : empty('还没有餐食记录。记下第一餐，从了解自己开始。');""",
"""    container.innerHTML = meals.length ? meals.map(meal => {
      const type = esc(mealNames[meal.mealType] || meal.mealType || '餐食');
      const clock = clockPattern.test(String(meal.mealTime||'')) ? esc(meal.mealTime) : '';
      const source = ({manual:'手动',local:'本地估算',api:'模型估算','quick-copy':'复制','import':'导入'})[meal.source] || '';
      const items = Array.isArray(meal.items) && meal.items.length ? `共 ${meal.items.length} 项` : '';
      const photo = meal.photoTakenAt ? '有照片' : '';
      return `<div class="meal-row list-row" role="listitem"><div class="row-body"><div class="row-head"><strong>${esc(meal.name || '未命名餐食')}</strong>`
        + `${type ? `<span class="row-tag">${type}</span>` : ''}</div>`
        + `<div class="row-meta">${showDate ? `<span>${esc(meal.date)}</span>` : ''}${clock ? `<span>${clock}</span>` : ''}`
        + `<span>蛋白 <b>${fmt(meal.protein)}</b>g</span><span>脂肪 <b>${fmt(meal.fat)}</b>g</span><span>碳水 <b>${fmt(meal.carbs)}</b>g</span>`
        + `${items ? `<span>${items}</span>` : ''}${source ? `<span>${source}</span>` : ''}${photo ? `<span>${photo}</span>` : ''}</div></div>`
        + `<div class="row-side"><span class="row-kcal">${fmt(meal.calories,0)} <small>kcal</small></span>`
        + `${meal.id !== undefined ? `<button type="button" class="icon-button danger" data-delete-meal="${esc(meal.id)}" aria-label="删除${esc(meal.name || '餐食')}" title="删除这条餐食"><span class="inline-icon" aria-hidden="true"><img src="./icon-trash.svg" alt="" width="19" height="19"></span></button>` : ''}</div></div>`;
    }).join('') : empty('还没有餐食记录。记下第一餐，从了解自己开始。');""")

rep("""    if (log) log.innerHTML = chats.length ? [...chats].reverse().map(row => `<div class="meal-row list-row" role="listitem"><div><strong>${esc(row.question || "")}</strong><div class="answer">${answerHtml(row.answer || '')}</div><p class="fine-print">${esc(row.date || "")}</p></div><div class="meal-actions"><button type="button" class="delete-meal" data-delete-chat="${esc(row.id || "")}" aria-label="删除这条问答记录">删除</button></div></div>`).join("") : empty("还没有问答记录。有疑问时，问一句。");""",
"""    if (log) log.innerHTML = chats.length ? [...chats].reverse().map(row => `<div class="meal-row list-row" role="listitem"><div class="row-body"><div class="row-head"><strong>${esc(row.question || "")}</strong></div><div class="answer">${answerHtml(row.answer || '')}</div><p class="fine-print">${esc(row.date || "")}</p></div><div class="row-side">${row.id ? `<button type="button" class="icon-button danger" data-delete-chat="${esc(row.id)}" aria-label="删除这条问答记录" title="删除这条问答记录"><span class="inline-icon" aria-hidden="true"><img src="./icon-trash.svg" alt="" width="19" height="19"></span></button>` : ''}</div></div>`).join("") : empty("还没有问答记录。有疑问时，问一句。");""")

rep("""      ? rows.map(row => `<div class="meal-row list-row" role="listitem"><div><strong>${esc(row.date || '')} · ${esc(slotNames[row.slot] || row.slot || '')}</strong><p>${esc(row.message || '')}</p><p class="fine-print">${row.source === 'api' ? '外部模型分析' : '提醒（未调用模型）'}</p></div></div>`).join('')""",
"""      ? rows.map(row => `<div class="meal-row list-row" role="listitem"><div class="row-body"><div class="row-head"><strong>${esc(row.date || '')}</strong><span class="row-tag">${esc(slotNames[row.slot] || row.slot || '')}</span>${row.source === 'api' ? '<span class="row-tag">外部模型</span>' : '<span class="row-tag">提醒</span>'}</div><div class="answer">${answerHtml(row.message || '')}</div></div></div>`).join('')""")

# ---- 5. Item recalculation arrows join the icon family ----------------------------------------
rep("""<button type="button" class="recalc-item" title="按克重和每 100g 数据重算" aria-label="按克重重算${esc(item.name)}">↻</button>""",
"""<button type="button" class="recalc-item" title="按克重和每 100g 数据重算" aria-label="按克重重算${esc(item.name)}"><span class="inline-icon" aria-hidden="true"><img src="./icon-refresh.svg" alt="" width="17" height="17"></span></button>""")

# ---- 6. The quick-record voice button uses the same microphone icon ---------------------------
rep("""<button type="button" class="mic-button" data-voice-target="quick" aria-label="用语音补充名称"><span class="mic-icon" aria-hidden="true">🎙</span></button>""",
"""<button type="button" class="mic-button" data-voice-target="quick" aria-label="用语音补充名称"><span class="mic-icon" aria-hidden="true"><img src="./icon-mic.svg" alt="" width="20" height="20"></span></button>""")

p.write_text(s, encoding='utf-8')
print('app.js patched: rich answer renderer, roomier rows with icon delete, unified icon references')
