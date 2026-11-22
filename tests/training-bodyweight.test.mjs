/**
 * 2026-11-18 用户要求：健身数据库区分「卧推」与「器械卧推」；没有配重的项目也能正常记录并纳入分析。
 * 行为断言从产物里抽纯函数跑，不靠字符串匹配冒充验证。
 */
import fs from 'node:fs';

let fail = 0;
const check = (label, ok, detail) => { console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail)); if (!ok) fail++; };

const app = fs.readFileSync('app/src/main/assets/app.js', 'utf8');
const html = fs.readFileSync('app/src/main/assets/index.html', 'utf8');
const main = fs.readFileSync('app/src/main/java/cn/qingheng/health/MainActivity.java', 'utf8');

function grab(startMarker, endMarkers) {
  const start = app.indexOf(startMarker);
  if (start < 0) throw new Error('missing ' + startMarker);
  let end = app.length;
  for (const marker of endMarkers) {
    const i = app.indexOf(marker, start);
    if (i >= 0 && i < end) end = i;
  }
  return app.slice(start, end);
}

const number = v => (v !== null && v !== undefined && v !== '' && Number.isFinite(Number(v)) ? Number(v) : null);
const pure = new Function('number', [
  grab('const BODYWEIGHT_MOVES', ['function trainingStatsOf(']),
  grab('function trainingStatsOf(', ['const EXERCISE_PRESETS']),
  grab('function loadableWeightKg(', ['function generateWeekPlan(']),
  'return {isBodyweightMove, trainingStatsOf, loadableWeightKg};'
].join('\n'))(number);
const { isBodyweightMove, trainingStatsOf, loadableWeightKg } = pure;

// --- 自重动作的判定 ------------------------------------------------------------------------------------
check('a pull-up is bodyweight', isBodyweightMove('引体向上') === true);
check('a push-up is bodyweight', isBodyweightMove('俯卧撑') === true);
check('a plank is bodyweight', isBodyweightMove('平板支撑') === true);
check('a typo\'d dip name still counts as bodyweight', isBodyweightMove('双臂杠屈伸') === true);
check('a weighted pull-up is not', isBodyweightMove('负重引体向上') === false);
check('a barbell hip bridge is not', isBodyweightMove('杠铃臀桥') === false);
check('a machine bench is not bodyweight', isBodyweightMove('器械卧推') === false);
check('an empty name is not bodyweight', isBodyweightMove('') === false);

// --- 配重档位：器械与杠铃分开算 -------------------------------------------------------------------------
check('a bodyweight move has no loadable weight', loadableWeightKg('引体向上', 10) === null, String(loadableWeightKg('引体向上', 10)));
check('a barbell bench keeps the 20 kg bar floor', loadableWeightKg('卧推', 8) === 20, String(loadableWeightKg('卧推', 8)));
check('a machine bench starts at 5 kg steps', loadableWeightKg('器械卧推', 8) === 10, String(loadableWeightKg('器械卧推', 8)));
check('a machine bench rounds to the nearest 5 kg', loadableWeightKg('器械卧推', 62) === 60, String(loadableWeightKg('器械卧推', 62)));
check('a barbell bench rounds in 5 kg jumps', loadableWeightKg('卧推', 63) === 65, String(loadableWeightKg('卧推', 63)));

// --- 三种口径：kg 容量 / 组数 / 自重次数 ----------------------------------------------------------------
const mixed = trainingStatsOf([
  {name: '卧推', setDetails: [{reps: 8, weight: 60}, {reps: 8, weight: 60}, {reps: 8, weight: 60}]},
  {name: '引体向上', setDetails: [{reps: 8, weight: null}, {reps: 6, weight: null}, {reps: 5, weight: null}]}
]);
check('kg volume ignores bodyweight sets', mixed.volume === 1440, String(mixed.volume));
check('sets count both kinds', mixed.sets === 6, String(mixed.sets));
check('bodyweight reps are counted separately', mixed.bodyweightReps === 19, String(mixed.bodyweightReps));
const bwOnly = trainingStatsOf([{name: '俯卧撑', setDetails: [{reps: 12, weight: null}, {reps: 10, weight: null}]}]);
check('a bodyweight-only session still reports sets and reps', bwOnly.volume === 0 && bwOnly.sets === 2 && bwOnly.bodyweightReps === 22, JSON.stringify(bwOnly));
const legacy = trainingStatsOf([{name: '器械卧推', sets: 3, reps: 10, weight: 40}]);
check('old records without setDetails still count', legacy.volume === 1200 && legacy.sets === 3, JSON.stringify(legacy));

// --- 数据库：器械卧推是独立动作 -------------------------------------------------------------------------
const guides = new Function([
  grab('const EXERCISE_GUIDES = [', ['const EXERCISE_HOW']),
  grab('function normalizeExerciseName(', ['function closeExerciseGuide']),
  'return {EXERCISE_GUIDES, exerciseGuideFor};'
].join('\n'))();
check('the machine bench has its own entry', guides.EXERCISE_GUIDES.some(guide => guide.name === '器械卧推' && guide.keys.includes('坐姿推胸')));
check('there is exactly one machine bench entry', guides.EXERCISE_GUIDES.filter(guide => guide.keys.includes('坐姿推胸')).length === 1);
check('卧推 resolves to the barbell guide', guides.exerciseGuideFor('卧推').name === '卧推');
check('器械卧推 resolves to the machine guide', guides.exerciseGuideFor('器械卧推').name === '器械卧推');
check('坐姿推胸 resolves to the machine guide', guides.exerciseGuideFor('坐姿推胸').name === '器械卧推');
check('史密斯机卧推 keeps its own guide', guides.exerciseGuideFor('史密斯机卧推').name === '史密斯机卧推');
check('a typo\'d dip name still finds the dip guide', guides.exerciseGuideFor('双臂杠屈伸').name === '双杠臂屈伸');
check('the machine guide does not borrow barbell cues', !/肩胛后收下沉/.test(guides.exerciseGuideFor('器械卧推').points.join('')));
check('the machine bench is one tap in the push presets', app.includes("push: ['卧推', '器械卧推',"));

// --- 记录：自重动作负重留空即可保存 ---------------------------------------------------------------------
check('bodyweight weight is optional on save', app.includes('(!bodyweight && set.weight === null)'));
check('the save error explains the split', app.includes('配重动作还要填负重，自重动作负重留空即可'));
check('reps are still required', app.includes('sets.some(set => number($(\'[data-set="reps"]\', set).value) === null'));
check('the set row marks bodyweight weight fields', app.includes("weight.placeholder = bodyweight ? '自重' : '—'"));
check('a stored 0 kg on a bodyweight move reads as empty', app.includes('return bodyweight && weight !== null && weight <= 0 ? null : weight;'));
check('plan hand-off normalises 0 kg too', app.includes('isBodyweightMove(name) && rawWeight !== null && rawWeight <= 0 ? null : rawWeight'));
check('the exercise foot shows bodyweight reps instead of a dash', app.includes("fmt(repsTotal, 0) + ' 次' : '—'"));
check('the save summary mentions bodyweight reps', app.includes("' · 自重 ' + fmt(stats.bodyweightReps, 0) + ' 次'"));
check('the post-session summary reports bodyweight reps', app.includes('自重 ${fmt(stats.bodyweightReps, 0)} 次（按次数计，不折算成 kg）'));

// --- 分析：概览与计划都认得自重 -------------------------------------------------------------------------
check('the weekly overview falls back to bodyweight reps', app.includes("totalVolume > 0 ? '本周容量' : totalBwReps > 0 ? '本周自重' : '本周容量'"));
check('the overview note carries bodyweight reps', app.includes("' · 自重 ' + fmt(totalBwReps, 0) + ' 次'"));
check('the bars keep one unit per chart', app.includes("const barMetric = totalVolume > 0 ? 'volume' : totalBwReps > 0 ? 'bw' : 'volume';"));
check('the weekly stats expose bodyweight reps', app.includes('totalBwReps: Math.round(days.reduce((sum, day) => sum + day.bwReps, 0))'));
check('the plan progresses bodyweight by reps', app.includes('return bodyweight && !deload ? Math.min(repsRange[1] + 2, reps + 1) : reps;'));
check('the plan note explains the bodyweight rule', app.includes('自重动作不加重，按次数进阶'));
check('bodyweight moves are not scheduled with a fake weight', app.includes('const bodyweight = typeof isBodyweightMove === \'function\' && isBodyweightMove(name);'));

// --- AI 排今天：器械动作要写清是哪种、自重不编重量 -------------------------------------------------------
check('the plan prompt names the bench variants', main.includes('卧推 / 器械卧推 / 史密斯机卧推 是三个不同动作'));
check('the plan prompt forbids inventing bodyweight loads', main.includes('自重动作（引体向上、俯卧撑、双杠臂屈伸）不要编造重量'));
check('changing the prompt bumps its version', /PROMPT_VERSION = 9;/.test(fs.readFileSync('app/src/main/java/cn/qingheng/health/ai/Prompts.java', 'utf8')));
check('the record form still keeps cardio separate', html.includes('data-cardio="distance"') || app.includes('data-cardio="distance"'));

console.log('\nFAIL total: ' + fail);
process.exitCode = fail ? 1 : 0;
