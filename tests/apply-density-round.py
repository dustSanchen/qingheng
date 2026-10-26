from pathlib import Path
p = Path(r'D:\AI\health-android\app\src\main\assets\app.js')
s = p.read_text(encoding='utf-8')

def rep(a, b, count=1):
    global s
    assert s.count(a) == count, (s.count(a), a[:90])
    s = s.replace(a, b)

# ---- 1. Chat rows: no inline delete, more information on the head line -------------------------
rep("""    const shown = favoriteOnlyChats ? chats.filter(row => row.favorite === true) : chats;
    if (log) log.innerHTML = shown.length ? [...shown].reverse().map(row => `<div class="meal-row list-row" role="listitem" data-long-press="chat:${esc(row.id ?? '')}"><div class="row-body"><div class="row-head"><strong>${esc(row.question || "")}</strong>`
      + `${row.favorite === true ? '<span class="fav-badge" aria-label="已收藏"><span class="inline-icon" aria-hidden="true"><img src="./icon-bookmark.svg" alt="" width="14" height="14"></span></span>' : ''}</div><div class="answer">${answerHtml(row.answer || '')}</div><p class="fine-print">${esc(row.date || "")}</p></div><div class="row-side">${row.id ? `<button type="button" class="icon-button danger" data-delete-chat="${esc(row.id)}" aria-label="删除这条问答记录" title="删除这条问答记录"><span class="inline-icon" aria-hidden="true"><img src="./icon-trash.svg" alt="" width="19" height="19"></span></button>` : ''}</div></div>`).join("") : empty(favoriteOnlyChats ? '还没有收藏的问答记录。长按一条记录即可收藏。' : "还没有问答记录。有疑问时，问一句。");""",
"""    const shown = favoriteOnlyChats ? chats.filter(row => row.favorite === true) : chats;
    // No inline delete here: a long press opens copy / select / favourite / delete instead, so the
    // row keeps its width for the question, its tags, the date and a readable answer preview.
    if (log) log.innerHTML = shown.length ? [...shown].reverse().map(row => {
      const answer = String(row.answer || '');
      const id = String(row.id ?? '');
      const expanded = expandedChats.has(id);
      const long = answer.length > 140;
      const tags = []
        .concat(String(row.question || '').includes('含照片') ? ['含照片'] : [])
        .concat(/联网检索|参考来源|来源（联网/.test(answer) ? ['联网检索'] : [])
        .concat(row.source === 'api' ? [] : [])
        .join('');
      return `<div class="meal-row list-row" role="listitem" data-long-press="chat:${esc(id)}"><div class="row-body">`
        + `<div class="row-head"><strong>${esc(row.question || '')}</strong>`
        + `${row.favorite === true ? '<span class="fav-badge" aria-label="已收藏"><span class="inline-icon" aria-hidden="true"><img src="./icon-bookmark.svg" alt="" width="14" height="14"></span></span>' : ''}`
        + `${tags ? `<span class="row-tag">${esc(tags)}</span>` : ''}`
        + `<span class="row-date">${esc(row.date || '')}</span></div>`
        + `<div class="answer${long && !expanded ? ' is-clamped' : ''}">${answerHtml(answer)}</div>`
        + `${long ? `<button type="button" class="row-toggle" data-chat-toggle="${esc(id)}" aria-expanded="${expanded ? 'true' : 'false'}">${expanded ? '收起' : '展开全文'}</button>` : ''}`
        + `</div></div>`;
    }).join("") : empty(favoriteOnlyChats ? '还没有收藏的问答记录。长按一条记录即可收藏。' : "还没有问答记录。有疑问时，问一句。");""")

# ---- 2. Meal rows: tags move to the head line so the numbers fit on one line -------------------
rep("""      return `<div class="meal-row list-row" role="listitem" data-long-press="meal:${esc(meal.id ?? '')}"><div class="row-body"><div class="row-head"><strong>${esc(meal.name || '未命名餐食')}</strong>`
        + `${meal.favorite === true ? '<span class="fav-badge" aria-label="已收藏"><span class="inline-icon" aria-hidden="true"><img src="./icon-bookmark.svg" alt="" width="14" height="14"></span></span>' : ''}`
        + `${type ? `<span class="row-tag">${type}</span>` : ''}</div>`
        + `<div class="row-meta">${showDate ? `<span>${esc(meal.date)}</span>` : ''}${clock ? `<span>${clock}</span>` : ''}`
        + `<span>蛋白 <b>${fmt(meal.protein)}</b>g</span><span>脂肪 <b>${fmt(meal.fat)}</b>g</span><span>碳水 <b>${fmt(meal.carbs)}</b>g</span>`
        + `${items ? `<span>${items}</span>` : ''}${source ? `<span>${source}</span>` : ''}${photo ? `<span>${photo}</span>` : ''}</div></div>`""",
"""      return `<div class="meal-row list-row" role="listitem" data-long-press="meal:${esc(meal.id ?? '')}"><div class="row-body"><div class="row-head"><strong>${esc(meal.name || '未命名餐食')}</strong>`
        + `${meal.favorite === true ? '<span class="fav-badge" aria-label="已收藏"><span class="inline-icon" aria-hidden="true"><img src="./icon-bookmark.svg" alt="" width="14" height="14"></span></span>' : ''}`
        + `${type ? `<span class="row-tag">${type}</span>` : ''}`
        + `${source ? `<span class="row-tag subtle-tag">${esc(source)}</span>` : ''}`
        + `${items ? `<span class="row-tag subtle-tag">${esc(items)}</span>` : ''}`
        + `${showDate ? `<span class="row-date">${esc(meal.date)}</span>` : ''}</div>`
        + `<div class="row-meta">${clock ? `<span>${clock}</span>` : ''}`
        + `<span>蛋 <b>${fmt(meal.protein)}</b></span><span>脂 <b>${fmt(meal.fat)}</b></span><span>碳 <b>${fmt(meal.carbs)}</b></span>`
        + `${photo ? `<span>${photo}</span>` : ''}</div></div>`""")

# ---- 3. Expand/collapse state for a long answer ------------------------------------------------
rep("""  let favoriteOnlyChats = false, favoriteOnlyMeals = false;""",
"""  let favoriteOnlyChats = false, favoriteOnlyMeals = false;
  // Long answers are clamped to one readable block; expanding is remembered per record id.
  const expandedChats = new Set();""")

rep("""  document.addEventListener('click',async event=>{
    const restore=event.target.closest('[data-draft-restore]');""",
"""  document.addEventListener('click', event => {
    const toggle = event.target.closest('[data-chat-toggle]');
    if (!toggle) return;
    const id = toggle.dataset.chatToggle;
    if (expandedChats.has(id)) expandedChats.delete(id); else expandedChats.add(id);
    renderChat();
  });
  document.addEventListener('click',async event=>{
    const restore=event.target.closest('[data-draft-restore]');""")

p.write_text(s, encoding='utf-8')
print('app.js patched: chat rows without inline delete, denser heads, answer preview with expand')
