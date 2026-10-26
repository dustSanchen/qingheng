import fs from 'node:fs';

// ── ⑤ 「修改」真正可用：编辑态下点某行即删除该项
const f = 'D:/AI/health-android/app/src/fragments/70-rest.fragment.js';
let t = fs.readFileSync(f, 'utf8');

if (!t.includes('data-ai-remove-wired')) {
  const anchor = "    const edit = $(\"#ai-plan-edit\");\n    if (edit) edit.addEventListener(\"click\", () => {";
  if (t.includes(anchor)) {
    const add = [
      "    const edit = $(\"#ai-plan-edit\");",
      "    if (list && !list.dataset.aiRemoveWired) {",
      "      list.dataset.aiRemoveWired = \"data-ai-remove-wired\";",
      "      list.addEventListener(\"click\", event => {",
      "        if (!list.classList.contains(\"editing\")) return;",
      "        const row = event.target.closest(\".ai-plan-row\");",
      "        if (!row) return;",
      "        event.preventDefault();",
      "        const rows = [...list.querySelectorAll(\".ai-plan-row\")];",
      "        const index = rows.indexOf(row);",
      "        const plan = aiPlanStore(activeDate) || [];",
      "        if (index < 0 || !plan[index]) return;",
      "        plan.splice(index, 1);",
      "        aiPlanStore(activeDate, plan);",
      "        renderAiPlan();",
      "        if (!plan.length) list.classList.remove(\"editing\");",
      "        notice(\"已移除「\" + row.querySelector(\".ai-plan-name\")?.textContent + \"」。\");",
      "      });",
      "    }",
      "    if (edit) edit.addEventListener(\"click\", () => {"
    ].join('\n');
    t = t.replace(anchor, add);
    fs.writeFileSync(f, t);
    console.log('ai plan row delete wired');
  } else {
    console.log('anchor missing for edit wiring');
  }
}

// ── ③ 底部安全区：tab bar 不再压住最后一屏元素
let css = fs.readFileSync('D:/AI/health-android/app/src/main/assets/styles.css', 'utf8');
if (!css.includes('/* 底部安全区')) {
  css += [
    '',
    '/* 底部安全区：固定 tab bar 上方留出可点击空间，最后一屏的同意勾选不再被压住。 */',
    ':root{--tabbar-safe:96px}',
    '.app-shell{padding-bottom:calc(var(--tabbar-safe) + env(safe-area-inset-bottom))}',
    '.check-label,.ai-plan,.plan-prefs{scroll-margin-bottom:calc(var(--tabbar-safe) + 12px)}',
    '.ai-plan-list.editing .ai-plan-row{cursor:pointer}',
    '.ai-plan-list.editing .ai-plan-row::after{content:"点此行移除";margin-left:var(--space-2);font-size:var(--text-xs);color:var(--muted)}'
  ].join('\n') + '\n';
  fs.writeFileSync('D:/AI/health-android/app/src/main/assets/styles.css', css);
  console.log('tabbar safe area added');
}
