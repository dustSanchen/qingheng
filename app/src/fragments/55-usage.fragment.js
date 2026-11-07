/**
 * 用量与余额：只统计 token，不记录问题与回答。
 *
 * 账本由原生侧在每次调用后追加（/api/usage），金额在这里按可改单价估算；
 * 余额走 /api/balance（目前只实现 DeepSeek），充值只打开服务商控制台，不在应用内收款。
 */
  const USAGE_PRICE_KEY = 'qingheng.usagePrice';
  function usagePrice() {
    try {
      const raw = JSON.parse(localStorage.getItem(USAGE_PRICE_KEY) || 'null');
      return {in: Number(raw && raw.in) >= 0 ? Number(raw.in) : 2, out: Number(raw && raw.out) >= 0 ? Number(raw.out) : 8};
    } catch { return {in: 2, out: 8}; }
  }
  function saveUsagePrice(price) {
    try { localStorage.setItem(USAGE_PRICE_KEY, JSON.stringify(price)); } catch { }
  }
  function usageDayKey(time) {
    const d = new Date(Number(time) || Date.now());
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function usageTokens(n) {
    const value = Number(n) || 0;
    if (value >= 1000000) return (value / 1000000).toFixed(2) + 'M';
    if (value >= 1000) return (value / 1000).toFixed(1) + 'k';
    return String(Math.round(value));
  }
  function usageMoney(rows, price) {
    const tokensIn = rows.reduce((sum, row) => sum + (Number(row.in) || 0), 0);
    const tokensOut = rows.reduce((sum, row) => sum + (Number(row.out) || 0), 0);
    const cost = tokensIn / 1e6 * price.in + tokensOut / 1e6 * price.out;
    return {tokensIn, tokensOut, tokens: tokensIn + tokensOut, cost};
  }
  function usageMoneyText(cost) {
    if (!(cost > 0)) return '¥0.00';
    return '¥' + (cost < 0.01 ? cost.toFixed(4) : cost.toFixed(2));
  }
  function renderUsagePanel(data) {
    const rows = Array.isArray(data && data.log) ? data.log : [];
    const price = usagePrice();
    const today = usageDayKey(Date.now());
    const month = today.slice(0, 7);
    const todayRows = rows.filter(row => usageDayKey(row.t) === today);
    const monthRows = rows.filter(row => usageDayKey(row.t).slice(0, 7) === month);
    const d1 = usageMoney(todayRows, price), d2 = usageMoney(monthRows, price);
    const set = (id, text) => { const node = $('#' + id); if (node) node.textContent = text; };
    set('usage-today', usageTokens(d1.tokens) + ' tokens');
    set('usage-today-cost', usageMoneyText(d1.cost) + ' · ' + todayRows.length + ' 次');
    set('usage-month', usageTokens(d2.tokens) + ' tokens');
    set('usage-month-cost', usageMoneyText(d2.cost) + ' · ' + monthRows.length + ' 次');
    const tag = $('#usage-tag');
    if (tag) tag.textContent = (data && data.provider) === 'deepseek' ? 'DeepSeek' : (data && data.provider) || '本机';
  }
  async function refreshUsage() {
    try {
      const data = await api('/api/usage');
      renderUsagePanel(data);
    } catch (error) {
      const note = $('#usage-note');
      if (note) note.textContent = '用量账本暂时读不到：' + (error && error.message ? error.message : '未知错误');
    }
  }
  async function refreshBalance() {
    const node = $('#usage-balance'), note = $('#usage-balance-note');
    if (node) node.textContent = '查询中…';
    try {
      const data = await api('/api/balance');
      const money = data && data.total ? String(data.total) : '—';
      if (node) node.textContent = money;
      if (note) note.textContent = data && data.total
        ? ((data.currency || '') + ' · 可用余额，服务商为准') : '没有返回余额字段';
    } catch (error) {
      if (node) node.textContent = '—';
      if (note) note.textContent = (error && error.message ? error.message : '余额查询失败');
    }
  }
  function installUsagePanel() {
    const card = $('#usage-card');
    if (!card || card.dataset.wired) return;
    card.dataset.wired = '1';
    const price = usagePrice();
    const pin = $('#price-in'), pout = $('#price-out');
    if (pin) pin.value = String(price.in);
    if (pout) pout.value = String(price.out);
    const savePrice = () => {
      const next = {in: Math.max(0, Number(pin && pin.value) || 0), out: Math.max(0, Number(pout && pout.value) || 0)};
      saveUsagePrice(next);
      refreshUsage();
    };
    if (pin) pin.addEventListener('change', savePrice);
    if (pout) pout.addEventListener('change', savePrice);
    const refresh = $('#usage-refresh');
    if (refresh) refresh.addEventListener('click', () => { refreshBalance(); refreshUsage(); });
    const topup = $('#usage-topup');
    if (topup) topup.addEventListener('click', () => {
      const url = 'https://platform.deepseek.com/top_up';
      if (window.QinghengNative && typeof window.QinghengNative.openExternal === 'function') {
        if (!window.QinghengNative.openExternal(url)) notice('打不开浏览器，请手动访问 platform.deepseek.com', true);
      } else {
        window.open(url, '_blank');
      }
    });
    const clear = $('#usage-clear');
    if (clear) clear.addEventListener('click', async () => {
      const go = await askConfirm('清空本机的用量账本？只删 token 记录，不影响任何饮食或训练数据。', {title: '清空用量', ok: '清空', cancel: '先不清'});
      if (!go) return;
      try { await api('/api/usage', {}); } catch (error) { notice('清空失败：' + (error && error.message ? error.message : '未知错误'), true); return; }
      refreshUsage();
      notice('已清空用量账本。');
    });
    document.addEventListener('click', event => {
      if (event.target.closest && event.target.closest('[data-subpage-open="model"]')) {
        setTimeout(() => { refreshUsage(); refreshBalance(); }, 50);
      }
    });
    refreshUsage();
  }
