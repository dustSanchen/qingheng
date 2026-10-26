/**
 * 交互层：通用草稿（训练/体重/睡眠/步数/饮水）确认写入 + 撤销，周计划一键排课。
 * 替换原来只认训练的处理器。
 */
import {patch} from '../lib/patch.mjs';

const oldBlock = `// ---- Training draft from a chat message: recognise, confirm, write, undo --------------------------
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
  });`;

const newBlock = `// ---- Generic draft: recognise -> confirm -> write -> undo ----------------------------------------
  let pendingDraft = null, draftUndo = null;
  function showTrainingDraft(draft) {
    pendingDraft = draft;
    renderTrainingDraft(draft);
  }
  /**
   * Applies one confirmed draft. Training merges into the day's exercise list; the simple metrics
   * merge into the same habit row; weight goes to measurements. Returns what undo has to restore.
   */
  async function applyDraft(draft) {
    const habit = habitRowFor(draft.date) || {date: draft.date};
    const existing = Array.isArray(habit.exercises) ? habit.exercises : [];
    if (draft.kind === 'weight') {
      const before = (state.measurements || []).find(row => row && row.date === draft.date) || null;
      await api('/api/measurements', {date: draft.date, weight: draft.payload.weight});
      return {kind: 'weight', date: draft.date, before};
    }
    if (draft.kind === 'training') {
      await api('/api/habits', {...habit, date: draft.date, training: true,
        exercises: [...existing, ...(draft.payload.exercises || [])]});
      return {kind: 'habits', date: draft.date, before: {...habit, date: draft.date, exercises: existing}};
    }
    const key = draft.payload && Object.keys(draft.payload)[0];
    if (!key) throw new Error('这条草稿没有可写入的字段');
    await api('/api/habits', {...habit, date: draft.date, [key]: draft.payload[key]});
    return {kind: 'habits', date: draft.date, before: {...habit, date: draft.date}};
  }
  $('#chat-training-draft')?.addEventListener('click', async event => {
    if (event.target.closest('[data-draft-cancel]')) { pendingDraft = null; draftUndo = null; renderTrainingDraft(null); return; }
    if (event.target.closest('[data-draft-undo]')) {
      if (!draftUndo) return;
      try {
        if (draftUndo.kind === 'weight') {
          if (draftUndo.before) await api('/api/measurements', {date: draftUndo.date, weight: draftUndo.before.weight});
        } else {
          await api('/api/habits', {...draftUndo.before, date: draftUndo.date});
        }
        draftUndo = null;
        renderTrainingDraft(null);
        await loadState({quiet: true});
        notice('已撤销刚才写入的记录。');
      } catch (error) { notice(error.message, true); }
      return;
    }
    const confirm = event.target.closest('[data-draft-confirm]');
    if (!confirm || !pendingDraft) return;
    const draft = pendingDraft;
    try {
      confirm.disabled = true;
      draftUndo = await applyDraft(draft);
      pendingDraft = null;
      const box = $('#chat-training-draft');
      if (box) {
        box.hidden = false;
        box.innerHTML = \`<div class="card training-draft"><div class="card-heading"><h2>已写入\${esc(DRAFT_KINDS[draft.kind] || '记录')}</h2><span class="tag">\${esc(draft.date)}</span></div>\`
          + \`<p>\${esc(draftSummary(draft))}</p><p class="fine-print">30 秒内可撤销。</p>\`
          + \`<div class="button-row"><button type="button" class="button subtle" data-draft-undo="1">撤销</button></div></div>\`;
      }
      await loadState({quiet: true});
      notice('已写入 ' + draft.date + ' 的' + (DRAFT_KINDS[draft.kind] || '记录') + '。');
      setTimeout(() => {draftUndo = null;}, 30000);
    } catch (error) {
      confirm.disabled = false;
      notice(error.message, true);
    }
  });
  // ---- One-tap scheduling of the generated week ------------------------------------------------
  $('#week-plan')?.addEventListener('click', async event => {
    const button = event.target.closest('[data-plan-schedule]');
    if (!button) return;
    const plan = lastWeekPlan;
    if (!plan) return;
    const ok = await askConfirm('将把 ' + plan.days.length + ' 次训练写入 ' + plan.startDate + ' 起的一周（每天一条训练记录），继续？', {title: '一键排课'});
    if (!ok) return;
    button.disabled = true;
    try {
      for (const day of plan.days) {
        const habit = habitRowFor(day.date) || {date: day.date};
        const existing = Array.isArray(habit.exercises) ? habit.exercises : [];
        await api('/api/habits', {...habit, date: day.date, training: true,
          exercises: [...existing, ...day.exercises.map(item => ({name: item.name, sets: item.sets, reps: item.reps, weight: item.weight}))]});
      }
      await loadState({quiet: true});
      notice('已排好 ' + plan.days.length + ' 次训练，可在「记录 · 训练」逐日调整。');
    } catch (error) {
      notice(error.message, true);
    } finally {
      button.disabled = false;
    }
  });`;

patch('app/src/fragments/70-rest.fragment.js', [
  ['generic draft handlers and plan scheduling', oldBlock, newBlock],
]);

console.log('handlers replaced');
