/**
 * 问答 → 训练记录：三段式（识别草稿 → 用户确认 → 写入并可按日期落库）。
 *
 * 第一段：本地解析用户这句话，产出草稿（日期、项目、组次重量 / 跑步距离时长、缺什么）。
 *         纯函数、不依赖 DOM，便于测试；不花 token，也不用模型支持工具调用。
 * 第二段：草稿卡片，明确日期与内容；缺字段会写出来；用户点「写入」才动数据。
 * 第三段：写入当天 habits（合并已有动作），成功后给 30 秒「撤销」。
 */
import fs from 'node:fs';
import {patch} from '../lib/patch.mjs';

// ---------------------------------------------------------------- 槽位 --------------------------------
patch('app/src/main/assets/index.html', [
  [
    'a slot for the training draft under the question box',
    `<label>你的问题<textarea id="chat-question" rows="3" maxlength="2000" placeholder="例如：我这两天蛋白质够吗？晚餐主食要不要再加？训练日该怎么吃？"></textarea></label>`,
    `<label>你的问题<textarea id="chat-question" rows="3" maxlength="2000" placeholder="例如：我这两天蛋白质够吗？晚餐主食要不要再加？训练日该怎么吃？"></textarea></label><div id="chat-training-draft" hidden></div>`,
  ],
]);

// ---------------------------------------------------------------- 解析器 ------------------------------
patch('app/src/fragments/60-training-copy.fragment.js', [
  [
    'the draft parser',
    `  function renderDailyThree() {`,
    `  /** Strength movements worth recognising without a model. */
  const DRAFT_MOVES = ['卧推', '上斜卧推', '哑铃卧推', '深蹲', '硬拉', '罗马尼亚硬拉', '腿举', '划船', '杠铃划船', '哑铃划船',
    '引体向上', '高位下拉', '肩推', '推举', '侧平举', '弯举', '面拉', '绳索下压', '双杠臂屈伸', '腿弯举', '腿屈伸', '提踵', '卷腹', '平板支撑'];
  /**
   * Turns one sentence into a training draft. Pure and dependency-free so a test can run it directly.
   * Returns null when the sentence does not describe completed training.
   */
  function parseTrainingDraft(text, baseDate) {
    const raw = String(text || '').trim();
    if (!raw) return null;
    const shift = (day, delta) => {
      const [y, m, d] = String(day).split('-').map(Number);
      const date = new Date(y, m - 1, d + delta);
      const pad = n => String(n).padStart(2, '0');
      return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate());
    };
    const pad2 = n => String(n).padStart(2, '0');
    const today = /^\\d{4}-\\d{2}-\\d{2}$/.test(String(baseDate || '')) ? baseDate : new Date().toISOString().slice(0, 10);
    let date = today;
    const explicit = raw.match(/(\\d{4})[\\-\\/](\\d{1,2})[\\-\\/](\\d{1,2})/) || raw.match(/(\\d{1,2})月(\\d{1,2})[日号]?/);
    if (explicit) {
      const year = explicit[3] ? Number(explicit[1]) : Number(today.slice(0, 4));
      const month = explicit[3] ? Number(explicit[2]) : Number(explicit[1]);
      const day = explicit[3] ? Number(explicit[3]) : Number(explicit[2]);
      if (month >= 1 && month <= 12 && day >= 1 && day <= 31) date = year + '-' + pad2(month) + '-' + pad2(day);
    } else if (/大前天/.test(raw)) date = shift(today, -3);
    else if (/前天/.test(raw)) date = shift(today, -2);
    else if (/昨天|昨晚|昨日/.test(raw)) date = shift(today, -1);

    // Completed activity only: 计划/打算/明天 should not produce a draft.
    const planned = /(打算|计划|准备|明天|后天|下周|要不要|该不该|想做)/.test(raw);
    const runWord = /(跑步|慢跑|跑了|晨跑|夜跑|快走|跑了|跑完)/.test(raw);
    const moveHit = DRAFT_MOVES.find(name => raw.includes(name)) || '';
    const strengthWord = /(组|次|kg|公斤|千克|举|推|拉|蹲)/.test(raw);
    if (!runWord && !moveHit && !/(练了|训练了|做了)/.test(raw)) {
      if (!(strengthWord && /组|kg|公斤/.test(raw))) return null;
    }

    const exercises = [];
    const missing = [];
    if (runWord) {
      const distance = raw.match(/(\\d+(?:\\.\\d+)?)\\s*(?:km|KM|Km|公里|千米)/);
      const minutes = raw.match(/(\\d+)\\s*(?:分钟|min)/);
      const clock = raw.match(/(\\d{1,2}):(\\d{2})/);
      const item = {name: '跑步', sets: null, reps: null, weight: null, distanceKm: distance ? Number(distance[1]) : null,
        durationMin: minutes ? Number(minutes[1]) : clock ? Number(clock[1]) * 60 + Number(clock[2]) : null};
      exercises.push(item);
      if (item.distanceKm === null) missing.push('距离（km）');
      if (item.durationMin === null) missing.push('时长（分钟）');
    }
    if (moveHit) {
      // Each clause can carry its own sets/reps/weight.
      const clauses = raw.split(/[，,；;。、]/).filter(Boolean);
      for (const clause of clauses) {
        const name = DRAFT_MOVES.find(move => clause.includes(move));
        if (!name) continue;
        const sets = clause.match(/(\\d+)\\s*组/);
        const reps = clause.match(/(\\d+)\\s*[次下个]/);
        const weight = clause.match(/(\\d+(?:\\.\\d+)?)\\s*(?:kg|KG|Kg|公斤|千克)/);
        exercises.push({name, sets: sets ? Number(sets[1]) : null, reps: reps ? Number(reps[1]) : null,
          weight: weight ? Number(weight[1]) : null, distanceKm: null, durationMin: null});
        if (!sets || !reps) missing.push(name + ' 的组数/次数');
      }
    }
    if (!exercises.length) return null;
    if (planned && !/今天|昨天|前天|\\d/.test(raw)) return null;
    const template = /(腿|深蹲|硬拉|提踵|腿举)/.test(raw) ? 'legs' : /(拉|划船|引体|下拉|弯举)/.test(raw) ? 'pull' : /(推|卧推|肩推|侧平举)/.test(raw) ? 'push' : 'other';
    return {date, kind: runWord ? 'run' : 'strength', template, exercises, missing, sourceText: raw.slice(0, 120)};
  }

  /** One-line human summary used by the card and the confirmation notice. */
  function draftSummary(draft) {
    return draft.exercises.map(item => {
      if (item.distanceKm !== null || item.name === '跑步') {
        const parts = [];
        if (item.distanceKm !== null) parts.push(item.distanceKm + ' km');
        if (item.durationMin !== null) parts.push(item.durationMin + ' 分钟');
        return '跑步 ' + (parts.join(' · ') || '（待补距离/时长）');
      }
      const bits = [item.name];
      if (item.sets !== null) bits.push(item.sets + ' 组');
      if (item.reps !== null) bits.push('× ' + item.reps + ' 次');
      if (item.weight !== null) bits.push(item.weight + ' kg');
      return bits.join(' ');
    }).join('；');
  }

  function renderTrainingDraft(draft) {
    const box = $('#chat-training-draft');
    if (!box) return;
    if (!draft) { box.hidden = true; box.innerHTML = ''; return; }
    const missing = draft.missing.length
      ? '<p class="fine-print">还缺：' + esc(draft.missing.join('、')) + '。可以先写入，稍后在训练日志里补；也可以点「补充信息」再改这句描述。</p>'
      : '<p class="fine-print">信息齐全，确认后会写入当天的训练记录。</p>';
    box.hidden = false;
    box.innerHTML = \`<div class="card training-draft"><div class="card-heading"><h2>识别到训练草稿</h2><span class="tag">待确认</span></div>\`
      + \`<p><strong>\${esc(draft.date)}</strong> · \${esc(draftSummary(draft))}</p>\` + missing
      + \`<div class="button-row"><button type="button" class="button primary" data-draft-confirm="1">写入记录</button>\`
      + \`<button type="button" class="button subtle" data-draft-cancel="1">取消</button></div></div>\`;
  }

  function renderDailyThree() {`,
  ],
]);

// 训练日志里显示跑步距离/时长，并在保存时保留这两个字段
patch('app/src/fragments/50-onboarding.fragment.js', [
  [
    'the log row shows distance and duration',
    `<div class="row-meta"><span>容量 \${exerciseVolume(item) === null ? '—' : \`\${fmt(exerciseVolume(item), 0)} kg\`}</span>`,
    `<div class="row-meta"><span>\${number(item.distanceKm) !== null ? \`\${fmt(item.distanceKm)} km\` : \`容量 \${exerciseVolume(item) === null ? '—' : \`\${fmt(exerciseVolume(item), 0)} kg\`}\`}\${number(item.durationMin) !== null ? \` · \${fmt(item.durationMin, 0)} 分钟\` : ''}</span>`,
  ],
  [
    'and keeps them when the log is edited',
    `      weight: number($('[data-exercise="weight"]', row).value)
    })).filter(item => item.name || item.sets !== null || item.reps !== null || item.weight !== null);`,
    `      weight: number($('[data-exercise="weight"]', row).value)
    })).map((item, index) => {
      // Runs carry distance/duration instead of sets/reps/weight; keep them across edits.
      const previous = exercisesFor(activeDate)[index];
      if (previous && (number(previous.distanceKm) !== null || number(previous.durationMin) !== null)) {
        item.distanceKm = number(previous.distanceKm);
        item.durationMin = number(previous.durationMin);
      }
      return item;
    }).filter(item => item.name || item.sets !== null || item.reps !== null || item.weight !== null || item.distanceKm != null || item.durationMin != null);`,
  ],
]);

// ---------------------------------------------------------------- 交互 --------------------------------
patch('app/src/fragments/70-rest.fragment.js', [
  [
    'confirm, cancel and undo',
    `  $('#global-notice-close')?.addEventListener('click', () => hideNotice());`,
    `  // ---- Training draft from a chat message: recognise, confirm, write, undo --------------------------
  let pendingTrainingDraft = null, trainingUndo = null;
  function showTrainingDraft(draft) {
    pendingTrainingDraft = draft;
    renderTrainingDraft(draft);
  }
  $('#chat-training-draft')?.addEventListener('click', async event => {
    if (event.target.closest('[data-draft-cancel]')) { pendingTrainingDraft = null; trainingUndo = null; renderTrainingDraft(null); return; }
    if (event.target.closest('[data-draft-undo]')) {
      if (!trainingUndo) return;
      try {
        await api('/api/habits', {...trainingUndo.previous, date: trainingUndo.date});
        trainingUndo = null;
        renderTrainingDraft(null);
        await loadState({quiet: true});
        notice('已撤销刚才写入的训练记录。');
      } catch (error) { notice(error.message, true); }
      return;
    }
    const confirm = event.target.closest('[data-draft-confirm]');
    if (!confirm || !pendingTrainingDraft) return;
    const draft = pendingTrainingDraft;
    const previous = habitRowFor(draft.date) || {date: draft.date};
    const existing = Array.isArray(previous.exercises) ? previous.exercises : [];
    try {
      confirm.disabled = true;
      await api('/api/habits', {...previous, date: draft.date, training: true, exercises: [...existing, ...draft.exercises]});
      trainingUndo = {date: draft.date, previous: {...previous, date: draft.date, exercises: existing}};
      pendingTrainingDraft = null;
      const box = $('#chat-training-draft');
      if (box) {
        box.hidden = false;
        box.innerHTML = \`<div class="card training-draft"><div class="card-heading"><h2>已写入训练记录</h2><span class="tag">\${esc(draft.date)}</span></div>\`
          + \`<p>\${esc(draftSummary(draft))}</p><p class="fine-print">该日已按训练日计算摄入区间；30 秒内可撤销。</p>\`
          + \`<div class="button-row"><button type="button" class="button subtle" data-draft-undo="1">撤销</button></div></div>\`;
      }
      await loadState({quiet: true});
      notice('已写入 ' + draft.date + ' 的训练记录。');
      setTimeout(() => {trainingUndo = null;}, 30000);
    } catch (error) {
      confirm.disabled = false;
      notice(error.message, true);
    }
  });
  $('#global-notice-close')?.addEventListener('click', () => hideNotice());`,
  ],
]);

// ---------------------------------------------------------------- 样式 --------------------------------
let css = fs.readFileSync('app/src/main/assets/styles.css', 'utf8');
if (!css.includes('.training-draft{')) {
  css += `
/* The draft card: obviously a proposal, not a record, until the user confirms. */
.training-draft{border-style:dashed;border-color:#c9d8c6;background:#f7faf4;margin:10px 0 14px}
.training-draft h2{font-size:14px}
.training-draft p{margin:6px 0;font-size:13.5px}
`;
  fs.writeFileSync('app/src/main/assets/styles.css', css);
  console.log('ok  draft styles');
} else console.log('skip draft styles');

console.log('training draft wired');
