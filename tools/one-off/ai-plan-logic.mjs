import fs from 'node:fs';

const f = 'app/src/fragments/70-rest.fragment.js';
let t = fs.readFileSync(f, 'utf8');

if (!t.includes('function installAiPlan()')) {
  const anchor = '  /** 杠铃总重计算器：杆重 + 2 × 每侧片重。 */';
  if (!t.includes(anchor)) throw new Error('weight calc anchor missing');
  const code = [
    '  /** 用模型按顺序排今天的训练：需要勾选同意，失败就明确报错，不伪造计划。 */',
    '  const AI_PLAN_KEY = date => "qingheng.aiPlan." + date;',
    '  function aiPlanStore(date, value) {',
    '    try {',
    '      if (value === undefined) return JSON.parse(localStorage.getItem(AI_PLAN_KEY(date)) || "null");',
    '      localStorage.setItem(AI_PLAN_KEY(date), JSON.stringify(value));',
    '    } catch { return null; }',
    '  }',
    '  function renderAiPlan() {',
    '    const box = $("#ai-plan-list"), tag = $("#ai-plan-tag"), clear = $("#ai-plan-clear");',
    '    if (!box) return;',
    '    const plan = aiPlanStore(activeDate);',
    '    if (clear) clear.hidden = !plan;',
    '    if (tag) tag.textContent = plan && plan.length ? plan.length + " 个动作" : "未生成";',
    '    if (!plan || !plan.length) { box.innerHTML = ""; return; }',
    '    box.innerHTML = plan.map((item, index) =>',
    '      "<label class=\\"ai-plan-row\\" role=\\"listitem\\"><input type=\\"checkbox\\" data-ai-done=\\"" + index + "\\"" + (item.done ? " checked" : "") + "><span class=\\"ai-plan-name\\">" + esc(item.name) + "</span><span class=\\"ai-plan-dose\\">" + esc(item.dose || "") + "</span></label>"',
    '    ).join("");',
    '  }',
    '  async function askAiPlan(button) {',
    '    const consent = $("#ai-plan-consent");',
    '    if (!consent || !consent.checked) { notice("先勾选同意，才会把今天的数据发给模型。"); return; }',
    '    const prefs = typeof planPrefs === "function" ? planPrefs() : null;',
    '    const profile = state.profile || {};',
    '    const done = exercisesFor(activeDate).filter(item => item && item.name).map(item => item.name + " " + (item.sets || "") + "x" + (item.reps || ""));',
    '    const prompt = [',
    '      "你是力量训练教练。请为今天排一个按顺序执行的训练清单。",',
    '      "信息：目标=" + (profile.goal || "未填") + "；体重=" + (profile.weight || "未填") + "kg；每周练=" + (prefs ? prefs.days : (profile.training || "未填")) + "；分化=" + (prefs ? prefs.split : "未填") + "；器械=" + (prefs ? prefs.gear : "未填") + "；时长=" + (prefs ? prefs.minutes : 45) + " 分钟。",',
    '      done.length ? ("今天已记录：" + done.join("；") + "。") : "今天还没有训练记录。",',
    '      "只输出 JSON 数组，不要解释。每项形如 {\\"name\\": \\"动作名\\", \\"sets\\": 4, \\"reps\\": 8, \\"weight\\": 40}，weight 可省略。按执行顺序排列，6 个动作以内。"',
    '    ].join("\\n");',
    '    button.disabled = true;',
    '    const original = button.textContent;',
    '    button.textContent = "正在排…";',
    '    try {',
    '      const data = await api("/api/chat", {question: prompt, date: activeDate, consent: true});',
    '      const reply = String(data && data.reply ? data.reply : "");',
    '      const start = reply.indexOf("[");',
    '      const end = reply.lastIndexOf("]");',
    '      if (start < 0 || end <= start) throw new Error("模型没有返回 JSON 清单，请重试。");',
    '      const rows = JSON.parse(reply.slice(start, end + 1));',
    '      if (!Array.isArray(rows) || !rows.length) throw new Error("清单为空，请重试。");',
    '      const plan = rows.filter(row => row && row.name).map(row => ({',
    '        name: String(row.name).slice(0, 24),',
    '        dose: [row.sets ? row.sets + " 组" : "", row.reps ? row.reps + " 次" : "", row.weight ? row.weight + " kg" : ""].filter(Boolean).join(" × "),',
    '        done: false',
    '      }));',
    '      aiPlanStore(activeDate, plan);',
    '      renderAiPlan();',
    '      notice("已按顺序排好今天的 " + plan.length + " 个动作。");',
    '    } catch (error) {',
    '      notice("排训练顺序失败：" + (error && error.message ? error.message : "未知错误"));',
    '    } finally {',
    '      button.disabled = false;',
    '      button.textContent = original;',
    '    }',
    '  }',
    '  function installAiPlan() {',
    '    const ask = $("#ai-plan-ask"), clear = $("#ai-plan-clear"), list = $("#ai-plan-list");',
    '    if (!ask || ask.dataset.wired) return;',
    '    ask.dataset.wired = "1";',
    '    ask.addEventListener("click", () => askAiPlan(ask));',
    '    if (clear) clear.addEventListener("click", () => { aiPlanStore(activeDate, []); renderAiPlan(); });',
    '    if (list) list.addEventListener("change", event => {',
    '      const box = event.target.closest("[data-ai-done]");',
    '      if (!box) return;',
    '      const plan = aiPlanStore(activeDate) || [];',
    '      const index = Number(box.dataset.aiDone);',
    '      if (plan[index]) plan[index].done = box.checked;',
    '      aiPlanStore(activeDate, plan);',
    '    });',
    '    renderAiPlan();',
    '  }',
    '',
    '  /** 杠铃总重计算器：杆重 + 2 × 每侧片重。 */'
  ].join('\n');
  t = t.replace(anchor, code);
  fs.writeFileSync(f, t);
  console.log('ai plan logic added');
}

// 渲染钩子
const f2 = 'app/src/fragments/10-rich-answer.fragment.js';
let t2 = fs.readFileSync(f2, 'utf8');
if (!t2.includes('renderAiPlan')) {
  const lines = t2.split(/\r?\n/);
  const i = lines.findIndex(l => /renderAdviceOrder\) renderAdviceOrder/.test(l));
  if (i >= 0) { lines.splice(i + 1, 0, '    if (typeof renderAiPlan === "function") renderAiPlan();'); fs.writeFileSync(f2, lines.join('\n')); console.log('render hook added'); }
}

// boot 接线
const f3 = 'app/src/fragments/70-rest.fragment.js';
let t3 = fs.readFileSync(f3, 'utf8');
if (!t3.includes('installAiPlan();')) {
  const anchor = '    if (typeof installPlanPrefs === "function") installPlanPrefs();';
  if (t3.includes(anchor)) { t3 = t3.replace(anchor, anchor + '\n    if (typeof installAiPlan === "function") installAiPlan();'); fs.writeFileSync(f3, t3); console.log('boot wiring added'); }
}

// 样式
let css = fs.readFileSync('app/src/main/assets/styles.css', 'utf8');
if (!css.includes('.ai-plan-row')) {
  css += [
    '',
    '/* 今日顺序（AI）：一行一个动作，勾选表示做完。 */',
    '.ai-plan{margin:var(--space-3) 0 0;padding-top:var(--space-3);border-top:1px solid var(--line)}',
    '.ai-plan .card-heading h3{margin:0;font-size:var(--text-sm);color:var(--muted);font-weight:500}',
    '.ai-plan-row{display:flex;align-items:center;gap:var(--space-2);padding:8px 0;border-bottom:1px solid var(--line);font-size:var(--text-md)}',
    '.ai-plan-row:last-child{border-bottom:0}',
    '.ai-plan-name{flex:1 1 auto;color:var(--ink)}',
    '.ai-plan-dose{flex:0 0 auto;color:var(--muted);font-size:var(--text-sm);font-variant-numeric:tabular-nums}',
    '.ai-plan-row input:checked ~ .ai-plan-name{color:var(--muted);text-decoration:line-through}'
  ].join('\n') + '\n';
  fs.writeFileSync('app/src/main/assets/styles.css', css);
  console.log('ai plan styles');
}
