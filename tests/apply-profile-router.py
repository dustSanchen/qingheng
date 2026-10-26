from pathlib import Path
p = Path(r'D:\AI\health-android\app\src\main\assets\app.js')
s = p.read_text(encoding='utf-8')

def rep(a, b, count=1):
    global s
    assert s.count(a) == count, (s.count(a), a[:90])
    s = s.replace(a, b)

# ---- 1. Two-level hash routing for the profile hub ---------------------------------------------
rep("""  function switchTab(tab, moveFocus = false) {
    if (!['today','records','chat','trends','profile'].includes(tab)) tab = 'today';
    $$('.view').forEach(view => view.hidden = view.id !== `view-${tab}`);
    $$('[data-tab]').forEach(button => {if (button.dataset.tab === tab) button.setAttribute('aria-current','page'); else button.removeAttribute('aria-current');});
    history.replaceState(null,'',`#${tab}`);""",
"""  // ---- Profile hub and its sub-pages -----------------------------------------------------------
  // "我的" is a list of entries; each one opens a sub-page under #profile/<name>. Everything stays
  // in the document, so forms, validation, collapse state and existing test anchors are untouched.
  const SUBPAGES = ['targets', 'model', 'push', 'data', 'about'];
  function parseHash() {
    const parts = String(location.hash || '').replace(/^#/, '').split('/');
    const tab = ['today','records','chat','trends','profile'].includes(parts[0]) ? parts[0] : '';
    const sub = SUBPAGES.includes(parts[1]) ? parts[1] : '';
    return {tab, sub};
  }
  function showSubpage(sub) {
    const hub = $('#profile-hub');
    if (hub) hub.hidden = !!sub;
    SUBPAGES.forEach(id => {const node = $('#subpage-' + id); if (node) node.hidden = id !== sub;});
    if (sub) window.scrollTo({top:0, behavior:'auto'});
  }
  function openSubpage(id) {
    if (!SUBPAGES.includes(id)) return;
    // pushState gives the system back button something to return to.
    try {history.pushState(null, '', `#profile/${id}`);} catch {location.hash = `profile/${id}`;}
    switchTab('profile', false, id);
  }
  function switchTab(tab, moveFocus = false, sub = '') {
    if (!['today','records','chat','trends','profile'].includes(tab)) tab = 'today';
    $$('.view').forEach(view => view.hidden = view.id !== `view-${tab}`);
    $$('[data-tab]').forEach(button => {if (button.dataset.tab === tab) button.setAttribute('aria-current','page'); else button.removeAttribute('aria-current');});
    history.replaceState(null,'',`#${tab}${tab === 'profile' && sub ? '/' + sub : ''}`);
    if (tab === 'profile') showSubpage(sub);""")

rep("""  function restoreTab() {
    let tab = (location.hash || '').slice(1);
    if (!tab) {try {tab = localStorage.getItem('qingheng.tab') || '';} catch {}}
    return ['today','records','chat','trends','profile'].includes(tab) ? tab : 'today';
  }""",
"""  function restoreTab() {
    const fromHash = parseHash().tab;
    if (fromHash) return fromHash;
    try {const saved = localStorage.getItem('qingheng.tab') || ''; if (['today','records','chat','trends','profile'].includes(saved)) return saved;} catch {}
    return 'today';
  }""")

rep("""  window.addEventListener('hashchange',()=>switchTab(location.hash.slice(1)));""",
"""  window.addEventListener('hashchange',()=>{const {tab,sub}=parseHash();switchTab(tab||'today',false,sub);});""")

# ---- 2. Hub wiring and summaries ---------------------------------------------------------------
rep("""  $('#active-date').value=activeDate;setDefaultDates();""",
"""  // ---- Hub entries and sub-page navigation -------------------------------------------------------
  const APP_VERSION = '1.0.15';
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
    const goals = {gain:'增肌', cut:'减脂', recomp:'增肌同时减脂', maintain:'保持身材'};
    const targets = $('#hub-summary-targets');
    if (targets) {
      const height = number(profile.height), age = number(profile.age), calorie = number(profile.calorieTarget);
      const bits = [goals[profile.goal] || '未设置目标', height !== null ? `${fmt(height,0)} cm` : '身高未填', age !== null ? `${fmt(age,0)} 岁` : '年龄未填', calorie !== null ? `${fmt(calorie,0)} kcal` : '目标热量未算'];
      targets.textContent = bits.join(' · ');
    }
    const model = $('#hub-summary-model');
    if (model) {
      const settings = state.settings || {};
      const provider = settings.provider === 'bai' ? 'B.AI' : 'DeepSeek';
      model.textContent = settings.apiConfigured === true ? `${provider} · 已配置${settings.visionEnabled === true ? '（含图片）' : ''}` : `${provider} · 未配置`;
    }
    const about = $('#hub-summary-about');
    if (about) about.textContent = `v${APP_VERSION} · 本机存储`;
  }
  async function loadStorageStatus(remirror = false) {
    const node = $('#storage-status');
    if (node) node.textContent = remirror ? '正在重新镜像…' : '正在读取存储状态…';
    try {
      const data = await api(remirror ? '/api/storage-remirror' : '/api/storage-status', remirror ? {} : undefined);
      if (!node) return data;
      const json = data?.json || {}, sqlite = data?.sqlite || {};
      const parts = Object.keys(json).map(key => `${({meals:'餐食',measurements:'身体',habits:'习惯',chats:'问答'})[key] || key} ${json[key]}`);
      const when = number(data?.lastMirroredAt) !== null ? new Date(Number(data.lastMirroredAt)).toLocaleString('zh-CN') : '尚未镜像';
      node.textContent = `${data?.parity === true ? '一致' : '不一致'}｜JSON：${parts.join('、')}`
        + `｜SQLite：${Object.keys(sqlite).map(key => `${({meals:'餐食',measurements:'身体',habits:'习惯',chats:'问答'})[key] || key} ${sqlite[key]}`).join('、')}`
        + `｜最近镜像：${when}${data?.lastError ? `｜最近错误：${data.lastError}` : ''}`
        + `｜${data?.mode || ''}`;
      return data;
    } catch (error) {
      if (node) node.textContent = error.message;
      return null;
    }
  }
  const storageRefresh = $('#storage-refresh');
  if (storageRefresh) storageRefresh.addEventListener('click', () => {loadStorageStatus(false).catch(() => {});});
  const storageRemirror = $('#storage-remirror');
  if (storageRemirror) storageRemirror.addEventListener('click', async () => {
    storageRemirror.disabled = true;
    const data = await loadStorageStatus(true);
    notice(data?.parity === true ? '已重新镜像，JSON 与 SQLite 记录一致。' : '镜像完成，但两边数量仍不一致，请查看关于页说明。', data?.parity !== true);
    storageRemirror.disabled = false;
  });

  $('#active-date').value=activeDate;setDefaultDates();""")

# ---- 3. render() refreshes the hub; push settings update their own summary ----------------------
rep("""    renderTargetStatus();
    renderTrends();
    renderUndatedMeals();
  }""",
"""    renderTargetStatus();
    renderTrends();
    renderUndatedMeals();
    renderHub();
  }""")

rep("""    const detail = $('#push-detail');
    if (detail) detail.textContent = p.enabled !== true ? '开启后到点会收到本地通知；需要允许通知权限。' : `已设置 ${p.morningTime || '07:00'} 与 ${p.eveningTime || '20:30'}。精确时间${p.canScheduleExact ? '已就绪' : '可能被系统延迟，建议在系统设置允许「闹钟与提醒」'}；通知权限${p.notificationsGranted ? '已允许' : '未允许，请到系统设置开启'}。`;
    return p;""",
"""    const detail = $('#push-detail');
    if (detail) detail.textContent = p.enabled !== true ? '开启后到点会收到本地通知；需要允许通知权限。' : `已设置 ${p.morningTime || '07:00'} 与 ${p.eveningTime || '20:30'}。精确时间${p.canScheduleExact ? '已就绪' : '可能被系统延迟，建议在系统设置允许「闹钟与提醒」'}；通知权限${p.notificationsGranted ? '已允许' : '未允许，请到系统设置开启'}。`;
    const summary = $('#hub-summary-push');
    if (summary) summary.textContent = p.enabled === true
      ? `${p.morningTime || '07:00'} / ${p.eveningTime || '20:30'} · ${p.analysisEnabled === true ? '后台自动分析' : '仅提醒'}`
      : '未开启 · 到点提醒与建议';
    return p;""")

p.write_text(s, encoding='utf-8')
print('app.js patched: sub-page router, hub summaries, storage status panel')
