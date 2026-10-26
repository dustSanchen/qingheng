/**
 * 把本地训练建议库接进计划生成与分析：
 *  1. 某个模板没有历史时，用库里的建议动作（标记 suggested）；
 *  2. 组/次默认值来自库里规则（主项 6 次 / 孤立 10~12 次）；
 *  3. planWhy() 产出「为什么这样排」，每条挂来源。
 */
import fs from 'node:fs';
import {patch} from '../lib/patch.mjs';

// ---------------------------------------------------------------- 加载库 --------------------------------
patch('app/src/main/assets/index.html', [
  [
    'load the local training library before the app',
    `  <script src="./training-principles.js" defer></script>
<script src="./training-principles.js" defer></script><script src="./app.js" defer></script>`,
    `  <script src="./training-principles.js" defer></script>\n  <script src="./app.js" defer></script>`,
  ],
]);

// ---------------------------------------------------------------- 库访问 + 分析 --------------------------
patch('app/src/fragments/60-training-copy.fragment.js', [
  [
    'library helpers and plan analysis',
    `  /** Daily training load (sets × reps × weight; runs count as minutes × 6). */`,
    `  /** The local library, if present. Everything here degrades gracefully without it. */
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
  /**
   * Why this week looks like this: 3~4 rules actually used, each with its source.
   * Pure enough to test: only reads the library and the numbers passed in.
   */
  function planWhy(input) {
    const src = input || {};
    const reasons = [];
    const push = (id, text) => {
      const rule = libraryRule(id);
      reasons.push({id, text, source: rule ? librarySourceLabel(rule.source) : '', confidence: rule ? rule.confidence : ''});
    };
    if (src.deload) {
      const rule = libraryRule('deload-rule');
      push('deload-rule', '本周按减载周排：' + (rule ? rule.claim.split('：')[0] : '负荷偏高时降量'));
    } else {
      const rule = libraryRule('split-3-rationale');
      push('split-3-rationale', '按三分化排：' + (rule ? '每部位每周约 1.5~2 次刺激，单次 6~10 组正式组' : '推/拉/腿轮转'));
    }
    const rpe = libraryRule('main-lift-rpe8');
    if (rpe) push('main-lift-rpe8', '主项守 RPE 8（留约 2 次余量），不做到力竭');
    const iso = libraryRule('isolation-failure');
    if (iso) push('isolation-failure', '单关节动作接近力竭，复合主项不追求力竭');
    if (src.suggested) push('volume-cap', '没有历史动作时用训练库建议动作，先按 3 组建立基线');
    return reasons;
  }
  /** Daily training load (sets × reps × weight; runs count as minutes × 6). */`,
  ],
  [
    'the generator uses the library for empty templates',
    `      // Only that template's own movements: borrowing 跑步 into a 推 day was a real bug.
      const exercises = ((byTemplate[template] || []).slice(0, 5));`,
    `      // Only that template's own movements: borrowing 跑步 into a 推 day was a real bug.
      let exercises = ((byTemplate[template] || []).slice(0, 5));
      let suggested = false;
      if (!exercises.length) {
        // No history yet: fall back to the library's canonical movements for that template.
        exercises = libraryMoves(template).slice(0, 5).map(item => ({name: item.name, sets: item.sets || 3,
          reps: item.reps || 8, weight: null, role: item.role || ''}));
        suggested = exercises.length > 0;
      }`,
  ],
  [
    'the plan carries its reasons',
    `      days.push({date: date.getFullYear() + '-' + pad2(date.getMonth() + 1) + '-' + pad2(date.getDate()),
        template, deload, exercises});`,
    `      days.push({date: date.getFullYear() + '-' + pad2(date.getMonth() + 1) + '-' + pad2(date.getDate()),
        template, deload, exercises, suggested});`,
  ],
  [
    'return reasons with the plan',
    `    return {startDate: start, sessions, deload, days,`,
    `    const reasons = planWhy({deload, suggested: days.some(day => day.suggested)});
    return {startDate: start, sessions, deload, days, reasons,`,
  ],
  [
    'the card explains itself',
    `    box.innerHTML = '<p class="plan-today"><strong>' + esc(todayText) + '</strong></p>'
      + '<p class="fine-print">' + esc(plan.note) + '</p>'`,
    `    const suggestedNote = plan.days.some(day => day.suggested) ? '<p class="fine-print">带「建议」的动作来自训练库（该模板你还没有记录），先按 3 组建立基线。</p>' : '';
    const why = Array.isArray(plan.reasons) && plan.reasons.length
      ? '<details class="plan-why"><summary>为什么这样排</summary>' + plan.reasons.map(reason =>
        '<p>' + esc(reason.text) + (reason.source ? '<small> · ' + esc(reason.source) + '</small>' : '') + '</p>').join('') + '</details>'
      : '';
    box.innerHTML = '<p class="plan-today"><strong>' + esc(todayText) + '</strong></p>'
      + '<p class="fine-print">' + esc(plan.note) + '</p>' + suggestedNote + why`,
  ],
  [
    'suggested exercises are labelled in the list',
    `        + (day.exercises.length ? day.exercises.map(item =>
          \`<div class="plan-item"><span>\${esc(item.name)}</span><b>\${item.sets} × \${item.reps}\${item.weight !== null ? ' · ' + item.weight + ' kg' : ''}</b></div>\`).join('')`,
    `        + (day.exercises.length ? day.exercises.map(item =>
          \`<div class="plan-item"><span>\${esc(item.name)}\${day.suggested ? ' <small class="plan-suggest">建议</small>' : ''}</span><b>\${item.sets} × \${item.reps}\${item.weight !== null ? ' · ' + item.weight + ' kg' : ''}</b></div>\`).join('')`,
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

console.log('training library wired');
