import fs from 'node:fs';

// ── 1) 标记：忙碌层 + 今日顺序的空状态与「修改」按钮
const file = 'app/src/main/assets/index.html';
let html = fs.readFileSync(file, 'utf8');

if (!html.includes('id="busy-layer"')) {
  html = html.replace('</body>', '<div class="busy-layer" id="busy-layer" hidden role="status" aria-live="polite"><div class="busy-card"><span class="busy-spinner" aria-hidden="true"></span><p class="busy-text" id="busy-text">正在计算…</p></div></div></body>');
  console.log('busy layer added');
}

if (!html.includes('id="ai-plan-edit"')) {
  html = html.replace(
    '<button type="button" class="button subtle" id="ai-plan-clear" hidden>清除</button>',
    '<button type="button" class="button subtle" id="ai-plan-edit" hidden>修改</button><button type="button" class="button subtle" id="ai-plan-clear" hidden>清除</button>'
  );
  console.log('edit button added');
}
fs.writeFileSync(file, html);

// ── 2) JS：忙碌层 + 空状态 + 修改（逐项删除）
const f = 'app/src/fragments/70-rest.fragment.js';
let t = fs.readFileSync(f, 'utf8');

if (!t.includes('function showBusy(')) {
  const anchor = '  /** 用模型按顺序排今天的训练';
  const code = [
    '  /** 等待动画：任何需要等模型的地方都复用它。 */',
    '  function showBusy(text) {',
    '    const layer = $("#busy-layer"), label = $("#busy-text");',
    '    if (label) label.textContent = text || "正在计算…";',
    '    if (layer) layer.hidden = false;',
    '  }',
    '  function hideBusy() { const layer = $("#busy-layer"); if (layer) layer.hidden = true; }',
    '',
    '  /** 用模型按顺序排今天的训练'
  ].join('\n');
  t = t.replace(anchor, code);
  console.log('busy helpers added');
}

// 空状态 + 修改按钮
if (!t.includes('还没有生成顺序')) {
  const from = '    if (tag) tag.textContent = plan && plan.length ? plan.length + " 个动作" : "未生成";';
  const to = [
    '    if (tag) tag.textContent = plan && plan.length ? plan.length + " 个动作" : "未生成";',
    '    const edit = $("#ai-plan-edit");',
    '    if (edit) edit.hidden = !(plan && plan.length);'
  ].join('\n');
  if (t.includes(from)) { t = t.replace(from, to); }

  const from2 = '    if (!plan || !plan.length) { box.innerHTML = ""; return; }';
  const to2 = '    if (!plan || !plan.length) { box.innerHTML = \'<p class="muted">还没有生成顺序。勾选同意后点「用 AI 排今天」。</p>\'; return; }';
  if (t.includes(from2)) { t = t.replace(from2, to2); }
  console.log('empty state added');
}

// 生成时显示等待层
if (!t.includes('showBusy("正在排今天的动作顺序')) {
  t = t.replace('    button.textContent = "正在排…";', '    button.textContent = "正在排…";\n    showBusy("正在排今天的动作顺序…");');
  t = t.replace('      button.textContent = original;\n    }', '      button.textContent = original;\n      hideBusy();\n    }');
  console.log('busy wired into ai plan');
}

// 修改按钮：进入删除模式（点击行尾 × 删除该项）
if (!t.includes('ai-plan-remove')) {
  const anchor2 = '    if (clear) clear.addEventListener("click", () => { aiPlanStore(activeDate, []); renderAiPlan(); });';
  const add = [
    '    if (clear) clear.addEventListener("click", () => { aiPlanStore(activeDate, []); renderAiPlan(); });',
    '    const edit = $("#ai-plan-edit");',
    '    if (edit) edit.addEventListener("click", () => {',
    '      const list = $("#ai-plan-list");',
    '      if (list) list.classList.toggle("editing");',
    '    });'
  ].join('\n');
  if (t.includes(anchor2)) { t = t.replace(anchor2, add); console.log('edit toggles editing class'); }
}

fs.writeFileSync(f, t);

// ── 3) 估算预览也用等待层
const f2 = 'app/src/fragments/10-rich-answer.fragment.js';
let t2 = fs.readFileSync(f2, 'utf8');
if (!t2.includes('正在计算热量')) {
  const i = t2.indexOf('async function computeEstimate');
  if (i > 0) {
    const bodyStart = t2.indexOf('{', i) + 1;
    t2 = t2.slice(0, bodyStart) + '\n    if (typeof showBusy === "function") showBusy("正在计算热量…");\n    try {' + t2.slice(bodyStart);
    const endIdx = t2.indexOf('\n  }', bodyStart);
    if (endIdx > 0) t2 = t2.slice(0, endIdx) + '\n    } finally { if (typeof hideBusy === "function") hideBusy(); }' + t2.slice(endIdx);
    fs.writeFileSync(f2, t2);
    console.log('busy wired into estimate');
  } else console.log('computeEstimate not found');
}

// ── 4) 样式：spinner 与编辑态
let css = fs.readFileSync('app/src/main/assets/styles.css', 'utf8');
if (!css.includes('.busy-spinner')) {
  css += [
    '',
    '/* 等待层：半透明遮罩 + 旋转环 + 一行说明，轻量、不抢焦点。 */',
    '.busy-layer{position:fixed;inset:0;z-index:200;display:flex;align-items:center;justify-content:center;background:rgba(20,20,19,.18)}',
    '.busy-layer[hidden]{display:none}',
    '.busy-card{display:flex;align-items:center;gap:var(--space-3);padding:14px 18px;border-radius:var(--radius-md);background:var(--surface);border:1px solid var(--line);box-shadow:0 8px 32px -24px rgba(20,20,19,.5)}',
    '.busy-spinner{width:18px;height:18px;border-radius:50%;border:2px solid var(--line);border-top-color:var(--accent);animation:busy-spin .8s linear infinite}',
    '.busy-text{margin:0;font-size:var(--text-sm);color:var(--body-text)}',
    '@keyframes busy-spin{to{transform:rotate(360deg)}}',
    '@media (prefers-reduced-motion: reduce){.busy-spinner{animation:none}}',
    '',
    '/* 今日顺序的「修改」：进入后可逐项删除。 */',
    '.ai-plan.editing .ai-plan-row{position:relative}',
    '.ai-plan-list.editing .ai-plan-row::after{content:"×";color:var(--muted);margin-left:var(--space-2)}'
  ].join('\n') + '\n';
  fs.writeFileSync('app/src/main/assets/styles.css', css);
  console.log('busy styles');
}
