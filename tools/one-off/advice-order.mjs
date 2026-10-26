import fs from 'node:fs';

// 今日训练建议：先给出「按顺序练什么」的清单（来自今天的计划/记录），再让用户问 AI 细节。
const f = 'app/src/fragments/60-training-copy.fragment.js';
let t = fs.readFileSync(f, 'utf8');
if (!t.includes('function renderAdviceOrder()')) {
  const anchor = '  function renderWeekPlan() {';
  const fn = [
    '  /** 今日顺序清单：从今天的训练记录/计划里排出先练什么，按顺序编号。 */',
    '  function renderAdviceOrder() {',
    '    const box = $("#training-advice-order");',
    '    if (!box) return;',
    '    const items = exercisesFor(activeDate).filter(item => item && item.name);',
    '    if (!items.length) { box.hidden = true; return; }',
    '    box.hidden = false;',
    '    const rows = items.map((item, index) => {',
    '      const dose = [item.sets && item.sets + " 组", item.reps && item.reps + " 次", item.weight && item.weight + " kg"].filter(Boolean).join(" × ");',
    '      return "<li><span class=\\"adv-order\\">" + (index + 1) + "</span><span class=\\"adv-name\\">" + esc(item.name) + "</span>" + (dose ? "<span class=\\"adv-dose\\">" + esc(dose) + "</span>" : "") + "</li>";',
    '    }).join("");',
    '    box.innerHTML = "<h3 class=\\"plan-sub\\">按这个顺序练</h3><ol class=\\"adv-order-list\\">" + rows + "</ol>";',
    '  }',
    '',
    '  function renderWeekPlan() {'
  ].join('\n');
  t = t.replace(anchor, fn);
  fs.writeFileSync(f, t);
  console.log('advice order renderer added');
}

let html = fs.readFileSync('app/src/main/assets/index.html', 'utf8');
if (!html.includes('id="training-advice-order"')) {
  html = html.replace('<div id="training-advice-insights" class="list-stack" role="list"></div>',
    '<div id="training-advice-order" class="adv-order-wrap" hidden></div><div id="training-advice-insights" class="list-stack" role="list"></div>');
  fs.writeFileSync('app/src/main/assets/index.html', html);
  console.log('advice order container added');
}

let css = fs.readFileSync('app/src/main/assets/styles.css', 'utf8');
if (!css.includes('.adv-order-list')) {
  css += [
    '',
    '/* 今日顺序：数字在前，动作名居中，剂量靠右。 */',
    '.adv-order-list{list-style:none;margin:0 0 var(--space-3);padding:0}',
    '.adv-order-list li{display:flex;align-items:baseline;gap:var(--space-2);padding:8px 0;border-bottom:1px solid var(--line);font-size:var(--text-md)}',
    '.adv-order-list li:last-child{border-bottom:0}',
    '.adv-order{flex:0 0 20px;height:20px;border-radius:50%;background:var(--surface-soft);color:var(--muted);font-size:var(--text-xs);display:inline-flex;align-items:center;justify-content:center;font-variant-numeric:tabular-nums}',
    '.adv-name{flex:1 1 auto;color:var(--ink)}',
    '.adv-dose{flex:0 0 auto;color:var(--muted);font-size:var(--text-sm);font-variant-numeric:tabular-nums}'
  ].join('\n') + '\n';
  fs.writeFileSync('app/src/main/assets/styles.css', css);
  console.log('advice order styles');
}
