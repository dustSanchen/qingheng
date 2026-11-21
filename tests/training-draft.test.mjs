/**
 * 训练草稿解析器：真实执行断言（从产物里抽出函数源码，用 Node 跑）。
 * 覆盖：昨天跑步、力量组次重量、缺信息、计划类不触发、显式日期。
 */
import fs from 'node:fs';

let fail = 0;
const check = (label, ok, detail) => { console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail)); if (!ok) fail++; };

const app = fs.readFileSync('app/src/main/assets/app.js', 'utf8');
// The live parser is parseDraft + the parseTrainingDraft wrapper ({payload:{exercises}} shape);
// the rich superseded copy was removed, so the test runs exactly what the app runs.
const start = app.indexOf('function parseTrainingDraft(');
if (start < 0) throw new Error('parseTrainingDraft not found');
const end = app.indexOf('\n  }', start);
const wrapper = app.slice(start, end + 4);
const parseStart = app.indexOf('function parseDraft(');
if (parseStart < 0) throw new Error('parseDraft not found');
const parseEnd = app.indexOf('\n  }', parseStart);
const parseSource = app.slice(parseStart, parseEnd + 4);
const movesStart = app.indexOf('const DRAFT_MOVES = [');
const movesEnd = app.indexOf('];', movesStart) + 2;
const movesSource = app.slice(movesStart, movesEnd);
const parse = new Function(movesSource + '\n' + parseSource + '\nreturn ' + wrapper)();

const BASE = '2026-10-22';
const run = parse('昨天跑了5km', BASE);
check('yesterday run is recognised', !!run && run.kind === 'training');
check('date resolves to yesterday', run.date === '2026-10-21', run.date);
check('distance parsed', run.payload.exercises[0].distanceKm === 5, String(run.payload.exercises[0].distanceKm));
check('missing duration flagged', run.missing.some(m => m.includes('时长')), run.missing.join(','));

const detailed = parse('昨天跑步 5 公里，用了 32 分钟', BASE);
check('duration parsed to minutes', detailed.payload.exercises[0].durationMin === 32, String(detailed.payload.exercises[0].durationMin));
check('nothing missing when complete', detailed.missing.length === 0, detailed.missing.join(','));

const bench = parse('今天卧推 4 组 8 次 60kg，还做了双杠臂屈伸 3 组 10 次', BASE);
check('strength parsed', bench && bench.kind === 'training');
check('two movements found', bench.payload.exercises.length === 2, JSON.stringify(bench.payload.exercises.map(e => e.name)));
check('sets/reps/weight read', bench.payload.exercises[0].sets === 4 && bench.payload.exercises[0].reps === 8 && bench.payload.exercises[0].weight === 60);
check('template guessed as push', bench.payload.template === 'push', bench.payload.template);
check('second movement keeps its own numbers', bench.payload.exercises[1].sets === 3 && bench.payload.exercises[1].reps === 10);

const missingReps = parse('今天深蹲 4 组', BASE);
check('missing reps flagged', missingReps.missing.some(m => m.includes('组数/次数')), missingReps.missing.join(','));

const planned = parse('明天打算练推，卧推几组合适？', BASE);
check('plans do not create a draft', planned === null);

const irrelevant = parse('我这两天蛋白质够吗？', BASE);
check('food questions are ignored', irrelevant === null);

const explicit = parse('10月19日跑步8公里', BASE);
check('explicit date parsed', explicit.date === '2026-10-19', explicit.date);

const legacy = parse('前天慢跑 3 公里', BASE);
check('day-before-yesterday works', legacy.date === '2026-10-20', legacy.date);

// 结构断言：确认卡片与写入路径
check('a confirm control exists', app.includes('data-draft-confirm'));
check('a cancel control exists', app.includes('data-draft-cancel'));
check('undo is offered after writing', app.includes('data-draft-undo'));
check('write merges with the day row', app.includes('exercises: [...existing, ...(draft.payload.exercises || [])]'));
check('the draft is shown before the answer', app.includes('if (draft) showTrainingDraft(draft); else renderTrainingDraft(null);'));
check('runs keep distance through their own inputs', app.includes('function cardioRowHtml(item)') && app.includes('data-cardio="distance"') && app.includes('data-cardio="minutes"'));
// 1.4.47 入口预算：问答页的「＋ 记一条训练」已删，记训练只留今日动作条与体检补记两处。
check('the duplicated chat training chip is gone', !app.includes('data-chat-train'));
// 1.4.47：问答页的「记一条训练」样例 chip 已删，草稿仍由输入框解析触发。
check('the draft still comes from parsing what the user typed', app.includes('let draft = parseTrainingDraft(question, activeDate);') && app.includes('draft = parseMealDraft(question, activeDate)') && app.includes('if (draft) showTrainingDraft(draft)') && !app.includes('data-chat-train'));

console.log('\nFAIL total: ' + fail);
process.exitCode = fail ? 1 : 0;
