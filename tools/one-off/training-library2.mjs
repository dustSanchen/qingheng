/**
 * 训练建议库接入（重写版）：每次 patch 只改一处，避免大块锚点/括号出错。
 */
import fs from 'node:fs';
import {patch} from '../lib/patch.mjs';

// 1) 先加载库再加载 app
patch('app/src/main/assets/index.html', [
  [
    'load the local training library before the app',
    '<script src="./app.js" defer></script>',
    '<script src="./training-principles.js" defer></script><script src="./app.js" defer></script>',
  ],
]);

// 2) 库访问与 planWhy
patch('app/src/fragments/60-training-copy.fragment.js', [
  [
    'library helpers and plan analysis',
    '  /** Daily training load (sets × reps × weight; runs count as minutes × 6). */',
    `  /** The local library, if present. Everything degrades gracefully without it. */
  function trainingLibrary() {
    const lib = window.TRAINING_PRINCIPLES;
    return lib && Array.isArray(lib.rules) ? lib : null;
  }
  function libraryRule(id) {
    const lib = trainingLibrary();
    return lib ? lib.rules.find(rule => rule.id === id) || null : null;
  }
  function libraryMoves(template) {
    const lib = trainingLibrary();
    return lib && lib.moves && Array.isArray(lib.moves[template]) ? lib.moves[template] : [];
  }
  function librarySourceLabel(sourceId) {
    const lib = trainingLibrary();
    const source = lib && lib.sources ? lib.sources.find(row => row.id === sourceId) : null;
    return source ? source.label + (source.level ? '（' + source.level + ' 级）' : '') : sourceId;
  }
  /** Why this week looks like this: the rules actually used, each carrying its source. */
  function planWhy(input) {
    const src = input || {};
    const reasons = [];
    const push = (id, text) => {
      const rule = libraryRule(id);
      reasons.push({id, text, source: rule ? librarySourceLabel(rule.source) : '', confidence: rule ? rule.confidence : ''});
    };
    if (src.deload) push('deload-rule', '本周按减载周排：负荷偏高时负重 ×0.9、组数 −1');
    else push('split-3-rationale', '按三分化排：每部位每周约 1.5~2 次刺激，单次 6~10 组正式组');
    push('main-lift-rpe8', '主项守 RPE 8（留约 2 次余量），不做到力竭');
    push('isolation-failure', '单关节动作接近力竭，复合主项不追求力竭');
    if (src.suggested) push('volume-cap', '没有历史动作时用训练库建议动作，先按 3 组建立基线');
    return reasons;
  }
  /** Daily training load (sets × reps × weight; runs count as minutes × 6). */`,
  ],
]);

// 3) 空模板用库里的动作
patch('app/src/fragments/60-training-copy.fragment.js', [
  [
    'empty templates fall back to library movements',
    "      // Only that template's own movements: borrowing 跑步 into a 推 day was a real bug.\n      const exercises = ((byTemplate[template] || []).slice(0, 5));",
    `      // Only that template's own movements: borrowing 跑步 into a 推 day was a real bug.
      let exercises = ((byTemplate[template] || []).slice(0, 5));
      let suggested = false;
      if (!exercises.length) {
        // No history yet: use the library's canonical movements for that template.
        exercises = libraryMoves(template).slice(0, 5).map(item => ({name: item.name, sets: item.sets || 3,
          reps: item.reps || 8, weight: null, role: item.role || ''}));
        suggested = exercises.length > 0;
      }`,
  ],
]);

// 4) 计划带上 suggested 与 reasons
patch('app/src/fragments/60-training-copy.fragment.js', [
  [
    'days record whether they are suggestions',
    "        template, deload, exercises});",
    "        template, deload, exercises, suggested});",
  ],
]);

patch('app/src/fragments/60-training-copy.fragment.js', [
  [
    'the plan carries its reasons',
    "    return {startDate: start, sessions, deload, days,",
    "    const reasons = planWhy({deload, suggested: days.some(day => day.suggested)});\n    return {startDate: start, sessions, deload, days, reasons,",
  ],
]);

// 5) 卡片：建议动作标记 + 为什么这样排
patch('app/src/fragments/60-training-copy.fragment.js', [
  [
    'label suggested movements',
    "\\`<div class=\"plan-item\"><span>\\${esc(item.name)}</span><b>",
    "\\`<div class=\"plan-item\"><span>\\${esc(item.name)}\\${day.suggested ? ' <small class=\"plan-suggest\">建议</small>' : ''}</span><b>",
  ],
]);

patch('app/src/fragments/60-training-copy.fragment.js', [
  [
    'explain the week with its sources',
    "    box.innerHTML = '<p class=\"plan-today\"><strong>' + esc(todayText) + '</strong></p>'\n      + '<p class=\"fine-print\">' + esc(plan.note) + '</p>'",
    `    const suggestedNote = plan.days.some(day => day.suggested) ? '<p class="fine-print">带「建议」的动作来自训练库（该模板你还没有记录），先按 3 组建立基线。</p>' : '';
    const why = Array.isArray(plan.reasons) && plan.reasons.length
      ? '<details class="plan-why"><summary>为什么这样排</summary>' + plan.reasons.map(reason =>
        '<p>' + esc(reason.text) + (reason.source ? '<small> · ' + esc(reason.source) + '</small>' : '') + '</p>').join('') + '</details>'
      : '';
    box.innerHTML = '<p class="plan-today"><strong>' + esc(todayText) + '</strong></p>'
      + '<p class="fine-print">' + esc(plan.note) + '</p>' + suggestedNote + why`,
  ],
]);

let css = fs.readFileSync('app/src/main/assets/styles.css', 'utf8');
if (!css.includes('.plan-why{')) {
  css += `
/* Why the week looks like this: collapsed by default, every line carries its source. */
.plan-why{margin:10px 0 0;border-top:1px dashed var(--line);padding-top:8px}
.plan-why summary{cursor:pointer;font-size:12.5px;color:var(--muted)}
.plan-why p{margin:6px 0;font-size:12.5px;color:var(--ink)}
.plan-why small{color:var(--muted)}
.plan-suggest{display:inline-block;padding:0 5px;border-radius:6px;background:#eef4ea;color:#5f8467;font-size:10.5px}
`;
  fs.writeFileSync('app/src/main/assets/styles.css', css);
  console.log('ok  plan-why styles');
}

console.log('training library wired (v2)');
