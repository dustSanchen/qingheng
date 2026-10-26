import fs from 'node:fs';

// ── 1) 在「生成估算预览」按钮下方插入行内等待条
const file = 'app/src/main/assets/index.html';
let html = fs.readFileSync(file, 'utf8');
if (!html.includes('id="estimate-busy"')) {
  const anchor = '<button class="button primary full-width" type="submit">生成估算预览 <span aria-hidden="true">→</span></button>';
  if (!html.includes(anchor)) throw new Error('estimate button missing');
  const inline = anchor + '<div class="inline-busy" id="estimate-busy" hidden role="status" aria-live="polite"><span class="busy-ring" aria-hidden="true"></span><span class="inline-busy-text">正在计算热量…</span></div>';
  html = html.replace(anchor, inline);
  fs.writeFileSync(file, html);
  console.log('inline busy inserted under the estimate button');
}

// ── 2) showBusy / hideBusy：支持行内目标 + 超时兜底
const f = 'app/src/fragments/70-rest.fragment.js';
let t = fs.readFileSync(f, 'utf8');

const start = t.indexOf('  function showBusy(text) {');
if (start < 0) throw new Error('showBusy missing');
const end = t.indexOf('  function hideBusy()', start);
const endLine = t.indexOf('}', end) + 1;

const replacement = [
  '  let busyTimer = null;',
  '  /** 等待提示：默认全局遮罩；传 target 时显示在该元素里（行内，不挡操作）。 */',
  '  function showBusy(text, target) {',
  '    hideBusy();',
  '    const label = text || "正在计算…";',
  '    if (target) {',
  '      const node = document.getElementById(target);',
  '      if (node) { node.hidden = false; const t2 = node.querySelector(".inline-busy-text"); if (t2) t2.textContent = label; }',
  '    } else {',
  '      const layer = $("#busy-layer"), l2 = $("#busy-text");',
  '      if (l2) l2.textContent = label;',
  '      if (layer) layer.hidden = false;',
  '    }',
  '    // 兜底：任何异常都不该让等待提示常驻。',
  '    busyTimer = setTimeout(() => hideBusy(), 25000);',
  '  }',
  '  function hideBusy() {',
  '    if (busyTimer) { clearTimeout(busyTimer); busyTimer = null; }',
  '    const layer = $("#busy-layer"); if (layer) layer.hidden = true;',
  '    const inline = document.getElementById("estimate-busy"); if (inline) inline.hidden = true;',
  '  }'
].join('\n');

t = t.slice(0, start) + replacement + t.slice(endLine);
fs.writeFileSync(f, t);
console.log('busy helpers rewritten with inline target + timeout');
