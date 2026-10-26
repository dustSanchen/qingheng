import fs from 'node:fs';

const f = 'app/src/fragments/60-training-copy.fragment.js';
let t = fs.readFileSync(f, 'utf8');

// 1) 偏好读取/保存 + 生成器
if (!t.includes('function planPrefs()')) {
  const anchor = '  function renderWeekPlan() {';
  const helpers = [
    '  const PLAN_PREFS_KEY = "qingheng.planPrefs";',
    '  /** 用户偏好：没有设置就不生成方案。 */',
    '  function planPrefs() {',
    '    try { const raw = localStorage.getItem(PLAN_PREFS_KEY); return raw ? JSON.parse(raw) : null; } catch { return null; }',
    '  }',
    '  function savePlanPrefs(prefs) { try { localStorage.setItem(PLAN_PREFS_KEY, JSON.stringify(prefs)); } catch {} }',
    '  /** 每周练几天 -> 落在周几（0=周一）。 */',
    '  function trainingDays(count) {',
    '    const map = {3: [0, 2, 4], 4: [0, 1, 3, 5], 5: [0, 1, 3, 4, 5], 6: [0, 1, 2, 3, 4, 5]};',
    '    return map[Math.max(3, Math.min(6, Number(count) || 3))] || map[3];',
    '  }',
    '  function splitLabels(split) {',
    '    if (split === "ul") return ["上肢", "下肢"];',
    '    if (split === "fb") return ["全身"];',
    '    return ["推", "拉", "腿"];',
    '  }',
    '',
    '  function renderWeekPlan() {'
  ].join('\n');
  t = t.replace(anchor, helpers);
  console.log('plan prefs helpers added');
}

// 2) 用偏好生成本周安排，替代固定轮转
const start = t.indexOf('    // 本周安排：周一为起点');
const end = t.indexOf('    const thisWeekHtml =');
if (start < 0 || end < 0) { console.log('schedule block not found (already replaced?)'); }
else {
  const block = [
    '    // 本周安排：完全按用户偏好生成；没有偏好就不出方案。',
    '    const prefsForm = $("#plan-prefs");',
    '    const prefs = planPrefs();',
    '    if (prefsForm) prefsForm.hidden = !!prefs;',
    '    const weekStart = shiftDay(activeDate, -((new Date(activeDate + "T00:00:00").getDay() + 6) % 7));',
    '    let thisWeekHtml;',
    '    if (!prefs) {',
    '      thisWeekHtml = "<p class=\\"muted\\">先选一下训练偏好（频率 / 分化 / 器械 / 时长），再按它安排本周。</p>";',
    '    } else {',
    '      const days = trainingDays(prefs.days);',
    '      const labels = splitLabels(prefs.split);',
    '      let rotation = 0;',
    '      const rows = [];',
    '      for (let offset = 0; offset < 7; offset++) {',
    '        const day = shiftDay(weekStart, offset);',
    '        const items = exercisesFor(day).filter(item => item && item.name);',
    '        const isToday = day === activeDate;',
    '        const past = day < activeDate;',
    '        const planned = days.includes(offset);',
    '        const label = planned ? labels[rotation++ % labels.length] : "休息";',
    '        let mark, cls;',
    '        if (items.length) { mark = items.slice(0, 3).map(item => item.name).join("、") + (items.length > 3 ? " 等 " + items.length + " 个" : ""); cls = "done"; }',
    '        else if (isToday) { mark = "今天 · " + label + " · " + (prefs.minutes || 45) + " 分钟"; cls = "today"; }',
    '        else if (past) { mark = planned ? "未记录 · 计划 " + label : "休息"; cls = planned ? "miss" : "plan"; }',
    '        else { mark = planned ? label + " · " + (prefs.minutes || 45) + " 分钟" : "休息"; cls = planned ? "plan" : "plan"; }',
    '        rows.push("<li class=\\"wk-" + cls + "\\"><strong>" + esc(day.slice(5)) + "</strong><span>" + esc(mark) + "</span></li>");',
    '      }',
    '      thisWeekHtml = "<h3 class=\\"plan-sub\\">本周安排 · " + esc(weekStart.slice(5)) + " 起 · 每周 " + prefs.days + " 练</h3><ul class=\\"plan-week\\">" + rows.join("") + "</ul>";',
    '    }',
    ''
  ].join('\n');
  t = t.slice(0, start) + block + t.slice(end);
  console.log('schedule now driven by prefs');
}

// 3) 表单接线
if (!t.includes('function installPlanPrefs()')) {
  const anchor2 = '  function renderWeekPlan() {';
  const wiring = [
    '  function installPlanPrefs() {',
    '    const box = $("#plan-prefs");',
    '    if (!box) return;',
    '    const prefs = planPrefs();',
    '    if (prefs) {',
    '      const d = $("#pref-days"), s = $("#pref-split"), g = $("#pref-gear"), m = $("#pref-minutes");',
    '      if (d) d.value = String(prefs.days); if (s) s.value = prefs.split; if (g) g.value = prefs.gear; if (m) m.value = String(prefs.minutes);',
    '    }',
    '    const save = $("#pref-save");',
    '    if (save && !save.dataset.wired) {',
    '      save.dataset.wired = "1";',
    '      save.addEventListener("click", () => {',
    '        savePlanPrefs({',
    '          days: Number($("#pref-days").value) || 3,',
    '          split: $("#pref-split").value,',
    '          gear: $("#pref-gear").value,',
    '          minutes: Number($("#pref-minutes").value) || 45',
    '        });',
    '        renderWeekPlan();',
    '        notice("已按偏好生成本周安排。");',
    '      });',
    '    }',
    '    const edit = $("#pref-edit");',
    '    if (edit && !edit.dataset.wired) {',
    '      edit.dataset.wired = "1";',
    '      edit.addEventListener("click", () => { box.hidden = !box.hidden; });',
    '    }',
    '  }',
    '',
    '  function renderWeekPlan() {'
  ].join('\n');
  t = t.replace(anchor2, wiring);
  console.log('prefs wiring added');
}

fs.writeFileSync(f, t);

// 样式
let css = fs.readFileSync('app/src/main/assets/styles.css', 'utf8');
if (!css.includes('.plan-prefs')) {
  css += [
    '',
    '/* 训练偏好：两行两列，与应用表单同一套节奏。 */',
    '.plan-prefs{margin:var(--space-3) 0 0;padding-top:var(--space-3);border-top:1px solid var(--line)}',
    '.pref-row{display:grid;grid-template-columns:1fr 1fr;gap:var(--space-2)}',
    '.pref-row label{font-size:var(--text-sm);color:var(--muted)}',
    '.pref-row select{width:100%;margin-top:4px}',
    '.plan-prefs .button-row{margin-top:var(--space-2)}'
  ].join('\n') + '\n';
  fs.writeFileSync('app/src/main/assets/styles.css', css);
  console.log('prefs styles');
}
