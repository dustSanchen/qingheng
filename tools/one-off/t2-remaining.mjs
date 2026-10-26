import fs from 'node:fs';

// ── T2.4 aria-busy：等待层出现时给当前按钮加 aria-busy，收起时移除
const f1 = 'D:/AI/health-android/app/src/fragments/70-rest.fragment.js';
let t1 = fs.readFileSync(f1, 'utf8');

if (!t1.includes('busyButton')) {
  const from = "  function showBusy(text, target) {";
  if (t1.includes(from)) {
    t1 = t1.replace(from, [
      '  let busyButton = null;',
      '  function markBusyButton(on) {',
      '    const active = document.activeElement;',
      '    if (on) {',
      '      if (active && active.tagName === "BUTTON") { busyButton = active; busyButton.setAttribute("aria-busy", "true"); }',
      '    } else if (busyButton) {',
      '      busyButton.removeAttribute("aria-busy");',
      '      busyButton = null;',
      '    }',
      '  }',
      '  function showBusy(text, target) {',
      '    markBusyButton(true);'
    ].join('\n'));
    t1 = t1.replace('  function hideBusy() {', '  function hideBusy() {\n    markBusyButton(false);');
    fs.writeFileSync(f1, t1);
    console.log('aria-busy wired');
  } else {
    console.log('showBusy anchor missing');
  }
}

// ── T2.3 分段控件方向键：←/→ 在 [role=tablist] 内移动并激活
const f2 = 'D:/AI/health-android/app/src/fragments/00-head.fragment.js';
let t2 = fs.readFileSync(f2, 'utf8');
if (!t2.includes('function installSegmentKeys')) {
  const block = [
    '  /** 分段控件键盘可达：←/→ 在 [role=tablist] 内移动并激活，Home/End 跳首尾。 */',
    '  function installSegmentKeys() {',
    '    if (document.body.dataset.segmentKeys === "1") return;',
    '    document.body.dataset.segmentKeys = "1";',
    '    document.addEventListener("keydown", event => {',
    '      const key = event.key;',
    '      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(key)) return;',
    '      const bar = event.target.closest && event.target.closest(\'[role="tablist"]\');',
    '      if (!bar) return;',
    '      const items = [...bar.querySelectorAll("[role=\\"tab\\"]:not([hidden])")];',
    '      if (items.length < 2) return;',
    '      const current = items.indexOf(document.activeElement);',
    '      if (current < 0) return;',
    '      event.preventDefault();',
    '      let next = current;',
    '      if (key === "ArrowRight") next = (current + 1) % items.length;',
    '      else if (key === "ArrowLeft") next = (current - 1 + items.length) % items.length;',
    '      else if (key === "Home") next = 0;',
    '      else next = items.length - 1;',
    '      items[next].focus();',
    '      items[next].click();',
    '    });',
    '  }',
    ''
  ].join('\n');
  const anchor = '  function hideTrainingTabs(on) {';
  if (t2.includes(anchor)) {
    t2 = t2.replace(anchor, block + anchor);
    fs.writeFileSync(f2, t2);
    console.log('segment keys installed (function)');
  } else {
    console.log('hideTrainingTabs anchor missing');
  }
}

// 启动时调用
const f3 = 'D:/AI/health-android/app/src/fragments/70-rest.fragment.js';
let t3 = fs.readFileSync(f3, 'utf8');
if (!t3.includes('installSegmentKeys();')) {
  const anchor3 = '    if (typeof installAiPlan === "function") installAiPlan();';
  if (t3.includes(anchor3)) {
    t3 = t3.replace(anchor3, anchor3 + '\n    if (typeof installSegmentKeys === "function") installSegmentKeys();');
    fs.writeFileSync(f3, t3);
    console.log('segment keys called at boot');
  } else {
    console.log('boot anchor missing');
  }
}
