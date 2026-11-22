/**
 * 勾选即记录 + 名称看要点 + 休息条挂卡底 + 视觉识读统一契约（2026-11-22 第七轮，1.5.21）。
 */
import fs from 'node:fs';

let fail = 0;
const check = (label, ok, detail) => {
  console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail));
  if (!ok) fail++;
};
const html = fs.readFileSync('app/src/main/assets/index.html', 'utf8');
const app = fs.readFileSync('app/src/main/assets/app.js', 'utf8');
const css = fs.readFileSync('app/src/main/assets/styles.css', 'utf8');

// --- 勾选即记录 ------------------------------------------------------------------------
check('the checkbox writes a log entry', app.includes('function togglePlanDone') && /togglePlanDone\(index, box\.checked\)/.test(app));
check('the write path keeps the plan row visible', app.includes('keepInPlan: true') && app.includes('fromPlan: true'));
check('the added row carries a fromPlan marker', app.includes('if (options.fromPlan === true) record.fromPlan = true;'));
check('unchecking only reclaims untouched rows', app.includes('function removeExerciseFromToday') &&
  app.includes('current.fromPlan === true') && app.includes('setDetails') );
check('a failed write rolls the checkbox back', /box\.checked = !box\.checked/.test(app));

// --- 名称看要点 / 休息条 ---------------------------------------------------------------
check('the name row is display + edit, not a hidden field', htmlless(app));
check('the old 要点 button is gone', !app.includes('data-exercise-help'));
check('the rest strip sits at the card foot', /const foot = \$\('\.set-foot', exerciseRow\);[\s\S]{0,80}foot\.before\(line\)/.test(app));

// --- 视觉识读统一契约 ------------------------------------------------------------------
check('one normaliser for both OCR entries', app.includes('function normaliseVision') &&
  app.includes("normaliseVision(data, 'scale')") && app.includes("normaliseVision(data, 'meal')"));
check('out-of-range fields are rejected, not clamped', app.includes('VISION_FIELD_LIMITS') && app.includes('out.rejected.push'));
check('the meal path still asks for confirmation before saving', app.includes('请在下方修改并确认，才会保存'));
check('one clear OCR entry covers screenshot and photo', html.includes('识别体脂秤截图 / 照片') && !html.includes('id="scale-shot"'));

// --- 质感 ------------------------------------------------------------------------------
check('the three capsules carry the same-family gradient', /\.quick-chip\{[^}]*linear-gradient\(160deg/.test(css.replace(/\n/g, ' ')));
check('the status bar floats above the card surface', /#view-today \.energy-card \.slot-hint[\s\S]{0,240}box-shadow:var\(--shadow-soft\)/.test(css));

check('the fromPlan marker survives a form rebuild', app.includes('const carried = (typeof exercisesFor === \'function\' ? exercisesFor(activeDate) : [])') && /\.\.\.fromPlan, id, name/.test(app));
check('untouched compares set numbers against the plan prescription', app.includes('const sameAsPlan = !Array.isArray(current?.setDetails)') && app.includes('=== (number(item.reps) ?? null)'));

console.log('\nFAIL total: ' + fail);
process.exitCode = fail ? 1 : 0;

function htmlless(source) {
  return source.includes('data-exercise-open') && source.includes('data-exercise-edit') &&
    css.includes('.exercise-name-row.is-locked input{position:absolute');
}
