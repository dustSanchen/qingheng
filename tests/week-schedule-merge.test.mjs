/**
 * 「排进本周」只追加不覆盖（2026-11-21 用户要求）。
 * 用户原话：「新增训练计划时不覆盖原有的当天记录的健身记录信息」。
 * 契约：每天原有 exercises 整条保留；同名动作跳过；一天都没新增就不写、也不改 training 标记。
 */
import fs from 'node:fs';

let fail = 0;
const check = (label, ok, detail) => { console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail)); if (!ok) fail++; };

const rest = fs.readFileSync('app/src/fragments/70-rest.fragment.js', 'utf8');
const app = fs.readFileSync('app/src/main/assets/app.js', 'utf8');

// --- 唯一的排课入口：只追加 --------------------------------------------------------------------------------
check('the schedule handler dedupes by existing names', rest.includes('const have = new Set(existing.map(row => String(row && row.name || \'\').trim()))'), 'app.js 缺少去重');
check('it skips a day when nothing was added', rest.includes('if (!additions.length) { kept++; continue; }'));
check('it keeps the existing rows and appends the additions', rest.includes('exercises: [...existing, ...additions]'));
check('the old unconditional overwrite shape is gone', !rest.includes('exercises: [...existing, ...day.exercises.map(item => ({name: item.name, sets: item.sets, reps: item.reps, weight: item.weight}))]'));
check('the confirm text promises to keep records', rest.includes('已记录的动作会保留，只补充缺的动作'));
check('the notice reports skipped days', rest.includes("' 天已排过，未改动'"));

// --- 生成物同步（app.js 由 assemble 生成，必须包含同一份逻辑） ----------------------------------------------
check('the built app.js carries the same merge', app.includes('const have = new Set(existing.map(row => String(row && row.name || \'\').trim()))')
  && app.includes('exercises: [...existing, ...additions]'), '请先跑 tools/assemble-app.ps1');
check('the built app.js no longer overwrites', !app.includes('exercises: [...existing, ...day.exercises.map(item => ({name: item.name, sets: item.sets, reps: item.reps, weight: item.weight}))]'));

console.log('\nFAIL total: ' + fail);
process.exitCode = fail ? 1 : 0;
