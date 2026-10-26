import fs from 'node:fs';
import { patch } from '../lib/patch.mjs';
patch('app/src/fragments/10-rich-answer.fragment.js', [
  ['guard and catch the whole render',
   `  function render() {
    const count=state.meals.filter(row=>row.date===activeDate).length;`,
   `  /** Shows a retryable bar instead of leaving the page half-drawn. */
  function showRenderError(error) {
    const bar = $('#render-error'), text = $('#render-error-text');
    if (text) text.textContent = '页面渲染出错：' + (error && error.message ? error.message : '未知错误') + '（记录已保存在本机）';
    if (bar) bar.hidden = false;
  }
  function render() {
    if (!state) return; // nothing to draw yet; loadState() calls render() again
    try { renderBody(); } catch (error) { showRenderError(error); }
  }
  function renderBody() {
    const count=state.meals.filter(row=>row.date===activeDate).length;`],
]);
patch('app/src/fragments/70-rest.fragment.js', [
  ['retry button',
   '  installProfileAutoRecalc();',
   `  $('#render-error-retry')?.addEventListener('click', () => {
    const bar = $('#render-error');
    if (bar) bar.hidden = true;
    loadState({quiet: false}).catch(() => showRenderError(new Error('重新加载失败，请确认应用仍在前台')));
  });
  installProfileAutoRecalc();`],
]);
patch('app/src/fragments/00-head.fragment.js', [
  ['redraw the open subpage after a load',
   '    applySettings(data); render();',
   `    applySettings(data); render();
    // A subpage opened while data was still loading would otherwise keep its empty form.
    const openSub = SUBPAGES.find(id => {const node = $('#subpage-' + id); return node && !node.hidden;});
    if (openSub) showSubpage(openSub);`],
]);
let css = fs.readFileSync('app/src/main/assets/styles.css', 'utf8');
if (!css.includes('.render-error{')) {
  css += `
/* A render failure used to freeze the page silently; this bar makes it visible and retryable. */
.render-error{position:fixed;left:12px;right:12px;top:calc(8px + env(safe-area-inset-top));z-index:200;display:flex;align-items:center;gap:10px;justify-content:space-between;padding:10px 12px;border-radius:14px;background:#fdeceb;border:1px solid #e8b4ae;color:#7d2a22;font-size:13px;box-shadow:0 8px 20px #7d2a2214}
.render-error[hidden]{display:none}
.render-error .button{padding:6px 12px;font-size:12.5px;flex:0 0 auto}
`;
  fs.writeFileSync('app/src/main/assets/styles.css', css);
  console.log('ok  styles');
}
console.log('guards wired');
