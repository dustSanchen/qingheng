/**
 * 整体健壮性：渲染异常不再把页面冻在「正在读取」。
 *
 * 这轮我两次踩到同一个坑：报错发生在 render 里时，界面停在半渲染状态，
 * 点位、Tab 都没反应，看起来像卡死。现在：
 *  1. render() 在 state 还没到时直接返回（不抛错）；
 *  2. render() 的任何异常都会被接住，顶部出现一条可重试的错误条，而不是静默冻结；
 *  3. 数据加载完成后，如果正停在子页上，会重新渲染该子页（避免空表单）。
 */
import fs from 'node:fs';
import {patch} from '../lib/patch.mjs';

// ---------------------------------------------------------------- HTML ------------------------------
patch('app/src/main/assets/index.html', [
  [
    'a visible render-error bar',
    `<main id="app" class="app-shell">`,
    `<div id="render-error" class="render-error" role="alert" hidden><span id="render-error-text">页面渲染出错</span><button type="button" class="button subtle" id="render-error-retry">重新加载</button></div><main id="app" class="app-shell">`,
  ],
]);

// ---------------------------------------------------------------- 渲染守卫 ----------------------------
patch('app/src/fragments/10-rich-answer.fragment.js', [
  [
    'guard and catch the whole render',
    `  function render() {
    const count=state.meals.filter(row=>row.date===activeDate).length;`,
    `  /** Shows a retryable bar instead of leaving the page half-drawn. */
  function showRenderError(error) {
    const bar = $('#render-error'), text = $('#render-error-text');
    if (text) text.textContent = '页面渲染出错：' + (error && error.message ? error.message : '未知错误') + '（记录已保存在本机）';
    if (bar) bar.hidden = false;
  }
  function render() {
    if (!state) return; // nothing to draw yet; loadState() will call render() again
    try { renderBody(); } catch (error) { showRenderError(error); }
  }
  function renderBody() {
    const count=state.meals.filter(row=>row.date===activeDate).length;`,
  ],
]);

// ---------------------------------------------------------------- 重试与子页刷新 ------------------------
patch('app/src/fragments/70-rest.fragment.js', [
  [
    'retry and subpage refresh',
    `  installProfileAutoRecalc();`,
    `  $('#render-error-retry')?.addEventListener('click', () => {
    const bar = $('#render-error');
    if (bar) bar.hidden = true;
    loadState({quiet: false}).catch(() => showRenderError(new Error('重新加载失败，请确认应用仍在前台')));
  });
  installProfileAutoRecalc();`,
  ],
]);

patch('app/src/fragments/00-head.fragment.js', [
  [
    'after a load, redraw the subpage that is open',
    `    applySettings(data); render();`,
    `    applySettings(data); render();
    // A subpage opened while the data was still loading would otherwise keep its empty form.
    const openSub = SUBPAGES.find(id => {const node = $('#subpage-' + id); return node && !node.hidden;});
    if (openSub) showSubpage(openSub);`,
  ],
]);

// 样式：错误条固定在顶部，不遮内容
let css = fs.readFileSync('app/src/main/assets/styles.css', 'utf8');
if (!css.includes('.render-error{')) {
  css += `
/* A render failure used to freeze the page silently; this bar makes it visible and retryable. */
.render-error{position:fixed;left:12px;right:12px;top:calc(8px + env(safe-area-inset-top));z-index:200;display:flex;align-items:center;gap:10px;justify-content:space-between;padding:10px 12px;border-radius:14px;background:#fdeceb;border:1px solid #e8b4ae;color:#7d2a22;font-size:13px;box-shadow:0 8px 20px #7d2a2214}
.render-error[hidden]{display:none}
.render-error .button{padding:6px 12px;font-size:12.5px;flex:0 0 auto}
`;
  fs.writeFileSync('app/src/main/assets/styles.css', css);
  console.log('ok  render error styles');
} else console.log('skip render error styles');

console.log('render guards wired');
