/**
 * 今日三样改版 + 页面顺序 + 顶部提示优化。
 *
 *  1. 「炒菜用油」换成「睡眠」：油只在炒菜时才有意义，且手动填的精度很低；
 *     睡眠每天都有、且直接影响训练恢复与当天状态，是更值得每天记的一项。
 *     （用油仍然保留在「手动记录餐食」里，吃饭时按需填。）
 *  2. 今日能量移到今日三样上方：先看今天还剩多少额度，再决定记录什么。
 *  3. 顶部提示：10 秒自动消失 + 关闭按钮；隐藏后恢复文档流，下方内容自动上移对齐。
 */
import fs from 'node:fs';
import {patch} from '../lib/patch.mjs';

// ---------------------------------------------------------------- HTML ------------------------------
patch('app/src/main/assets/index.html', [
  [
    'the notice gets a text span and a close button',
    `<div class="notice" id="global-notice" role="status" aria-live="polite" hidden></div>`,
    `<div class="notice" id="global-notice" role="status" aria-live="polite" hidden><span id="global-notice-text"></span><button type="button" class="notice-close" id="global-notice-close" aria-label="关闭提示" title="关闭">×</button></div>`,
  ],
  [
    'sleep replaces the oil spoons in the daily three',
    `<label>炒菜用油 · 勺（1 勺≈10 g≈90 kcal）<input name="oilSpoons" type="number" min="0" max="30" step="0.5" placeholder="没有炒菜可留空"></label>`,
    `<label>睡眠 · 小时<input name="sleep" type="number" min="0" max="24" step="0.5" placeholder="昨晚睡了多久"></label>`,
  ],
  [
    'the description matches the new items',
    `<p class="muted">训练、炒菜用油、体重 —— 每天 30 秒填完这三样，长期趋势就有依据。</p>`,
    `<p class="muted">训练、睡眠、体重 —— 每天 30 秒填完这三样，长期趋势就有依据。</p>`,
  ],
]);

// ---------------------------------------------------------------- 顺序调换 ----------------------------
// 今日能量整张卡片移到今日三样之前：先看余额，再决定记什么。
const html = fs.readFileSync('app/src/main/assets/index.html', 'utf8');
const start = html.indexOf('<article class="card" id="daily-three">');
const energyStart = html.indexOf('<article class="card energy-card">');
if (start < 0 || energyStart < 0) throw new Error('daily-three / energy-card 未找到');
if (start < energyStart) {
  const threeEnd = html.indexOf('</article>', html.indexOf('</form>', start)) + '</article>'.length;
  const energyEnd = html.indexOf('</article>', energyStart) + '</article>'.length;
  const three = html.slice(start, threeEnd);
  const energy = html.slice(energyStart, energyEnd);
  const rebuilt = html.slice(0, start) + energy + html.slice(threeEnd, energyStart) + three + html.slice(energyEnd);
  fs.writeFileSync('app/src/main/assets/index.html', rebuilt);
  console.log('ok  energy card moved above the daily three');
} else {
  console.log('skip energy already above');
}

// ---------------------------------------------------------------- 渲染 --------------------------------
patch('app/src/fragments/60-training-copy.fragment.js', [
  [
    'render sleep instead of oil',
    `    if (document.activeElement !== form.elements.oilSpoons) form.elements.oilSpoons.value = number(habit.oilSpoons) ?? '';
    if (document.activeElement !== form.elements.weight) form.elements.weight.value = number(measurement.weight) ?? '';
    const filled = [training !== '', number(habit.oilSpoons) !== null, number(measurement.weight) !== null].filter(Boolean).length;`,
    `    if (document.activeElement !== form.elements.sleep) form.elements.sleep.value = number(habit.sleep) ?? '';
    if (document.activeElement !== form.elements.weight) form.elements.weight.value = number(measurement.weight) ?? '';
    const filled = [training !== '', number(habit.sleep) !== null, number(measurement.weight) !== null].filter(Boolean).length;`,
  ],
]);

// ---------------------------------------------------------------- 提交 --------------------------------
patch('app/src/fragments/70-rest.fragment.js', [
  [
    'submit sleep instead of oil',
    `    const oilSpoons = number(form.elements.oilSpoons.value);
    const weight = number(form.elements.weight.value);
    if (trainingValue === '' && oilSpoons === null && weight === null) {feedback(message, '三样都空着，没有可保存的内容。', true); return;}`,
    `    const sleep = number(form.elements.sleep.value);
    const weight = number(form.elements.weight.value);
    if (trainingValue === '' && sleep === null && weight === null) {feedback(message, '三样都空着，没有可保存的内容。', true); return;}`,
  ],
  [
    'merge sleep into the day row',
    `      if (trainingValue !== '' || oilSpoons !== null) {`,
    `      if (trainingValue !== '' || sleep !== null) {`,
  ],
  [
    'the habits payload carries sleep',
    `...(oilSpoons === null ? {} : {oilSpoons}),`,
    `...(sleep === null ? {} : {sleep}),`,
  ],
]);

// ---------------------------------------------------------------- 提示自动消失 ------------------------
patch('app/src/fragments/00-head.fragment.js', [
  [
    'auto dismiss after ten seconds',
    `  const notice = (message, error = false) => { const node = $('#global-notice'); node.textContent = message; node.classList.toggle('error',error); node.hidden = !message; };`,
    `  let noticeTimer = null;
  /** Hides the notice and lets the page flow back up (it is in the document flow, not an overlay). */
  function hideNotice() {
    const node = $('#global-notice'), text = $('#global-notice-text');
    if (noticeTimer) { clearTimeout(noticeTimer); noticeTimer = null; }
    if (text) text.textContent = '';
    if (node) node.hidden = true;
  }
  const notice = (message, error = false) => {
    const node = $('#global-notice'), text = $('#global-notice-text');
    if (!node || !text) return;
    text.textContent = message;
    node.classList.toggle('error', error);
    node.hidden = !message;
    if (noticeTimer) { clearTimeout(noticeTimer); noticeTimer = null; }
    // A notice used to stay until the next action, pushing the page down the whole time.
    if (message) noticeTimer = setTimeout(hideNotice, 10000);
  };`,
  ],
]);

patch('app/src/fragments/70-rest.fragment.js', [
  [
    'the close button hides it immediately',
    `  $('#render-error-retry')?.addEventListener('click', () => {`,
    `  $('#global-notice-close')?.addEventListener('click', () => hideNotice());
  $('#render-error-retry')?.addEventListener('click', () => {`,
  ],
]);

// ---------------------------------------------------------------- 样式 --------------------------------
let css = fs.readFileSync('app/src/main/assets/styles.css', 'utf8');
if (!css.includes('.notice-close{')) {
  css += `
/* Close button inside the notice; hiding it returns the space to the page. */
.notice{display:flex;align-items:flex-start;gap:10px}
.notice[hidden]{display:none}
.notice>span{flex:1 1 auto}
.notice-close{flex:0 0 auto;width:24px;height:24px;padding:0;border:0;border-radius:8px;background:transparent;color:inherit;font-size:16px;line-height:1;opacity:.7}
.notice-close:active{opacity:1;background:#00000010}
`;
  fs.writeFileSync('app/src/main/assets/styles.css', css);
  console.log('ok  notice styles');
} else console.log('skip notice styles');

console.log('daily three / order / notice wired');
