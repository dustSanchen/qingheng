/**
 * Today's derived agenda (1.4.71): at most one primary action and two secondary actions.
 * The builder is pure: no DOM, no clock, no writes.
 */
import fs from 'node:fs';

let fail = 0;
const check = (label, ok, detail) => {
  console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail));
  if (!ok) fail++;
};

function extractFunction(source, name) {
  const marker = 'function ' + name + '(';
  const start = source.indexOf(marker);
  if (start < 0) throw new Error('missing function ' + name);
  const open = source.indexOf('{', start);
  let depth = 0, quote = '';
  for (let i = open; i < source.length; i++) {
    const ch = source[i], prev = source[i - 1];
    if (quote) {
      if (ch === quote && prev !== '\\') quote = '';
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') { quote = ch; continue; }
    if (ch === '{') depth++;
    else if (ch === '}' && --depth === 0) return source.slice(start, i + 1);
  }
  throw new Error('unterminated function ' + name);
}

const app = fs.readFileSync('app/src/main/assets/app.js', 'utf8');
const html = fs.readFileSync('app/src/main/assets/index.html', 'utf8');
const factory = new Function(
  extractFunction(app, 'trainingStateFor') + '\n' +
  extractFunction(app, 'buildTodayAgenda') + '\n' +
  'return {buildTodayAgenda};'
);
const {buildTodayAgenda} = factory();
const base = {
  isToday: true,
  meals: [{date: '2026-11-21', calories: 500}],
  exercises: [],
  habitTraining: undefined,
  profileTraining: '3',
  hasPlan: false,
  planDay: null,
  missingMeals: [],
  aiPlan: [],
  mealSlot: 'lunch',
  sleepMissing: false,
  weightMissing: false
};
const build = patch => buildTodayAgenda({...base, ...patch});

let agenda = build({});
check('an unrecorded day with a meal does not invent a training task', !agenda.primary, agenda.primary && agenda.primary.kind);
check('it stays unrecorded', agenda.state === 'unrecorded', agenda.state);

agenda = build({meals: []});
check('an empty day points at the first meal', agenda.primary && agenda.primary.kind === 'meal', agenda.primary && agenda.primary.kind);
check('the meal action targets the existing meal field', agenda.primary && agenda.primary.target === 'meal-text', agenda.primary && agenda.primary.target);

agenda = build({habitTraining: false, meals: [], missingMeals: []});
check('an explicit rest day never gets a training primary', !agenda.primary || agenda.primary.kind !== 'training', agenda.primary && agenda.primary.kind);
check('an explicit rest day points at the meal when nothing is logged', agenda.primary && agenda.primary.kind === 'meal');
check('the state is rest', agenda.state === 'rest', agenda.state);

agenda = build({profileTraining: 'none', aiPlan: [{name: '卧推', done: false}], meals: [], missingMeals: []});
check('a no-training profile ignores a stale AI plan', !agenda.primary || agenda.primary.kind !== 'training', agenda.primary && agenda.primary.kind);
check('the state is disabled', agenda.state === 'disabled', agenda.state);

agenda = build({hasPlan: true, planDay: {exercises: [{name: '深蹲'}]}, missingMeals: []});
check('a cached plan with an unrecorded session gets training', agenda.primary && agenda.primary.kind === 'training', agenda.primary && agenda.primary.kind);
check('it opens the existing training form', agenda.primary && agenda.primary.target === 'training-form', agenda.primary && agenda.primary.target);
check('the state is planned', agenda.state === 'planned', agenda.state);

agenda = build({hasPlan: true, planDay: null, meals: [], missingMeals: []});
check('a planned rest day does not get a training task', !agenda.primary || agenda.primary.kind !== 'training', agenda.primary && agenda.primary.kind);
check('a planned rest day is still distinct from unrecorded', agenda.state === 'plan-rest', agenda.state);

agenda = build({aiPlan: [{name: '卧推', done: false}, {name: '划船', done: true}]});
check('an unfinished AI plan becomes the primary action', agenda.primary && agenda.primary.kind === 'training', agenda.primary && agenda.primary.kind);
check('it opens the existing plan, not a new plan card', agenda.primary && agenda.primary.target === 'ai-plan', agenda.primary && agenda.primary.target);
check('it reports how many actions remain', agenda.primary && agenda.primary.reason.includes('1'), agenda.primary && agenda.primary.reason);

agenda = build({missingMeals: [{key: 'lunch', label: '午餐'}], hasPlan: true, planDay: {exercises: [{name: '深蹲'}]}});
check('a missed meal outranks a planned training session', agenda.primary && agenda.primary.kind === 'meal', agenda.primary && agenda.primary.kind);
check('the missed meal carries its own slot', agenda.primary && agenda.primary.mealSlot === 'lunch', agenda.primary && agenda.primary.mealSlot);

agenda = build({sleepMissing: true, weightMissing: true});
check('secondary actions are capped at two', agenda.secondary.length === 2, agenda.secondary.length);
check('the primary remains unique', agenda.primary === null || typeof agenda.primary.id === 'string');
check('all agenda ids are unique', new Set([agenda.primary && agenda.primary.id, ...agenda.secondary.map(row => row.id)].filter(Boolean)).size === agenda.secondary.length + (agenda.primary ? 1 : 0));

agenda = build({isToday: false, meals: []});
check('a past day never gets a live training task', !agenda.primary || agenda.primary.kind !== 'training', agenda.primary && agenda.primary.kind);
check('a past day with no meals offers a neutral backfill', agenda.primary && agenda.primary.label === '补记一餐', agenda.primary && agenda.primary.label);

agenda = build({isToday: false, meals: [{date: '2026-11-20'}]});
check('a past day with records has no live urgency', agenda.primary === null && agenda.secondary.length === 0);

check('the old false "补训练" copy is gone from the bundle', !app.includes('补训练'));
check('the action line consumes the agenda', app.includes('todayAgendaState') && app.includes('bar.dataset.target = item.target'));
check('the daily check keeps one sleep jump, not a second action surface', app.includes('href="#records" data-focus="habit-sleep"'));
check('the sheet consumes the agenda secondaries', app.includes('agenda.secondary') && app.includes('data-brief-index'));
check('a protein gap becomes the next step instead of a third reminder', app.includes("id: 'protein-gap'") && app.includes('下一餐补蛋白') && app.includes('proteinGap'));
check('the action line names itself for screen readers', app.includes('`下一步：${item.label}') && app.includes('bar.setAttribute("aria-label"'));
check('the daily check no longer hardcodes its own sleep/weight fixes', !app.includes("if (sleepValue === null) fixes.push(chip('补睡眠'") && !app.includes("if (!weightLogged) fixes.push(chip('补体重'"));
check('the rest control is bound to the existing habit row', app.includes("#training-rest") && app.includes('next.training = false'));
check('the training log exposes a state tag', html.includes('id="training-tag"') && app.includes("restMarked ? '休息日'"));

console.log('FAIL total: ' + fail);
process.exitCode = fail ? 1 : 0;
