/**
 * 训练建议库断言：库本身的结构与内容，以及它被计划生成/分析真正用到。
 */
import fs from 'node:fs';

let fail = 0;
const check = (label, ok, detail) => { console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail)); if (!ok) fail++; };

const libText = fs.readFileSync('app/src/main/assets/training-principles.js', 'utf8');
const app = fs.readFileSync('app/src/main/assets/app.js', 'utf8');
const html = fs.readFileSync('app/src/main/assets/index.html', 'utf8');

// 库在沙箱里执行，拿到真实对象
const lib = new Function('window', libText + '\nreturn window.TRAINING_PRINCIPLES;')({});
check('library loads', !!lib && typeof lib === 'object');
check('library has a version', typeof lib.version === 'string' && lib.version.length >= 8, lib.version);
check('six sources are cited', lib.sources.length >= 6, String(lib.sources.length));
check('every source has level and url', lib.sources.every(s => s.level && s.url), JSON.stringify(lib.sources.map(s => s.level)));
check('凯圣王 × 谭成义 is cited', lib.sources.some(s => s.label.includes('凯圣王') && s.label.includes('谭成义')));
check('ALEX channel is cited', lib.sources.some(s => s.label.includes('ALEX')));
check('好人松松 is cited', lib.sources.some(s => s.label.includes('好人松松')));
check('谭成义 own channel is cited', lib.sources.some(s => s.id === 'tcy-channel'));
const earlyIds = new Set(lib.rules.map(r => r.id));
check('new anatomy rules exist', ['joint-mobility-first','beginner-framework','diet-template-first','canteen-takeout','fatloss-playbook'].every(id => earlyIds.has(id)));
check('new movement rules exist', ['arm-isolation','shoulder-two-parts','abs-two-moves','breathing-recovery','solo-training'].every(id => earlyIds.has(id)));
check('every source is in the priority list', lib.sources.every(s => lib.priority.includes(s.id)));
const withVideo = lib.rules.filter(r => r.video);
check('most rules cite a video', withVideo.length >= 15, String(withVideo.length));
check('video refs look like bvids', withVideo.every(r => /^BV[0-9A-Za-z]{10}$/.test(r.video.bvid)), JSON.stringify(withVideo.slice(0, 2).map(r => r.video.bvid)));
check('video refs carry a duration', withVideo.every(r => Number(r.video.seconds) > 0));
check('digest includes the video reference', app.includes("'（视频 ' + rule.video.bvid"));
check('the advice prompt no longer asks for BV citations', (function(){const p=fs.readFileSync('app/src/main/java/cn/qingheng/health/ai/Prompts.java','utf8'); return !p.includes('BV 号与时长')})());

check('rules are plentiful', lib.rules.length >= 14, String(lib.rules.length));
check('every rule has id/topic/claim/source/confidence', lib.rules.every(r => r.id && r.topic && r.claim && r.source && r.confidence));
check('every rule source exists', lib.rules.every(r => lib.sources.some(s => s.id === r.source)));
check('rule ids are unique', new Set(lib.rules.map(r => r.id)).size === lib.rules.length);

const ids = new Set(lib.rules.map(r => r.id));
for (const id of ['split-3-rationale', 'main-lift-rpe8', 'isolation-failure', 'deload-rule', 'leg-front-squat', 'pull-trap-balance', 'no-four-days', 'fatigue-monitor']) {
  check('rule present: ' + id, ids.has(id));
}
check('RPE 8 rule carries a number', lib.rules.find(r => r.id === 'main-lift-rpe8').claim.includes('RPE 8'));
check('力竭 rule distinguishes compound vs isolation', lib.rules.find(r => r.id === 'isolation-failure').claim.includes('单关节'));
check('deload parameters exist', lib.rules.find(r => r.id === 'deload-rule').plan.loadFactor === 0.9);

// 建议动作
for (const template of ['push', 'pull', 'legs']) {
  const moves = lib.moves[template];
  check('moves for ' + template, Array.isArray(moves) && moves.length >= 4, String(moves && moves.length));
  check(template + ' moves have name/sets/reps', moves.every(m => m.name && m.sets && m.reps));
}
check('push includes a bench press', lib.moves.push.some(m => m.name.includes('卧推')));
check('pull includes a chest-supported row', lib.moves.pull.some(m => m.name.includes('海豹划船')));
check('legs includes front squat', lib.moves.legs.some(m => m.name.includes('颈前深蹲')));

// 接入
check('the library loads before the app', html.indexOf('training-principles.js') < html.indexOf('app.js'));
check('helpers exist in the bundle', app.includes('function trainingLibrary()') && app.includes('function libraryMoves(template)'));
check('planWhy exists', app.includes('function planWhy(input)'));
check('empty templates use library moves', app.includes('exercises = libraryMoves(template).slice(0, 5)'));
check('days carry suggested', app.includes('template, deload, exercises, suggested}'));
check('the plan carries reasons', app.includes("typeof planWhy === 'function' ? planWhy("));
check('the card renders the explanation', app.includes('为什么这样排') && app.includes('plan-why'));
check('suggested movements are labelled', app.includes('plan-suggest'));

// planWhy 真实执行
const fnStart = app.indexOf('function planWhy(');
const fnEnd = app.indexOf('\n  }', fnStart);
const whySource = app.slice(fnStart, fnEnd + 4);
const helpers = app.slice(app.indexOf('function trainingLibrary()'), app.indexOf('/** Why this week looks like this'));
const runWhy = new Function('window', helpers + '\n' + whySource + '\nreturn planWhy;')({TRAINING_PRINCIPLES: lib});
const normal = runWhy({deload: false, suggested: false});
const deload = runWhy({deload: true, suggested: true});
check('normal week cites the 3-split rule', normal.some(r => r.id === 'split-3-rationale'));
check('normal week cites RPE 8', normal.some(r => r.id === 'main-lift-rpe8'));
check('deload week cites the deload rule', deload.some(r => r.id === 'deload-rule'));
check('deload week does not claim a 3-split rationale', !deload.some(r => r.id === 'split-3-rationale'));
check('reasons carry a source label', normal.every(r => r.source && r.source.length > 4), JSON.stringify(normal.map(r => r.source)));


// --- the fallback really runs (library + generator in one sandbox) ---------------------------------
const genStart = app.indexOf('function generateWeekPlan(');
const genEnd = app.indexOf('\n  }', genStart);
const genSource = app.slice(genStart, genEnd + 4);
const runPlan = new Function('window', helpers + '\n' + whySource + '\n' + genSource + '\nreturn generateWeekPlan;')({TRAINING_PRINCIPLES: lib});
const emptyPlan = runPlan({startDate: '2026-10-26', sessions: 3, acwrFlag: 'ok', lastByExercise: {}});
const pushDay = emptyPlan.days.find(day => day.template === 'push');
check('empty history still gets a push day', !!pushDay);
check('its movements come from the library', pushDay && pushDay.exercises.some(item => item.name.includes('卧推')), JSON.stringify(pushDay && pushDay.exercises.map(e => e.name)));
check('those days are marked suggested', pushDay && pushDay.suggested === true);
check('the plan explains itself', Array.isArray(emptyPlan.reasons) && emptyPlan.reasons.length >= 3);


// --- v2：优先级、减脂主题、建议链路 ---------------------------------------------------------------
check('priority order is declared', Array.isArray(lib.priority) && lib.priority.length >= 6, JSON.stringify(lib.priority));
check('priority starts with the chinese guide', lib.priority[0] === 'cdg-2022');
check('sources carry a priority number', lib.sources.every(s => Number.isFinite(s.priority)));
check('a conflict policy exists', typeof lib.conflictPolicy === 'string' && lib.conflictPolicy.includes('App 规则'));
check('topics index exists', Array.isArray(lib.topics) && lib.topics.length >= 6, String(lib.topics && lib.topics.length));
const topics = new Set(lib.rules.map(r => r.topic));
for (const topic of ['训练结构', '减脂执行', '饮食配合', '有氧']) check('topic covered: ' + topic, topics.has(topic));
for (const id of ['deficit-cap', 'protein-preserve', 'weekly-rate', 'plateau-check', 'sleep-deficit', 'cardio-dose', 'neat-first', 'refeed-day', 'meal-protein-spread']) {
  check('reduction rule present: ' + id, ids.has(id));
}
check('the hard floor is restated, not relaxed', lib.rules.find(r => r.id === 'deficit-cap').claim.includes('不得低于硬底线'));
check('protein rule keeps the app range', lib.rules.find(r => r.id === 'protein-preserve').plan.proteinPerKg[1] === 2.4);
check('rules are plentiful in v2', lib.rules.length >= 24, String(lib.rules.length));
check('verified recovery rules exist', ['stretch-after-training','foam-roll-legs','desk-neck-release'].every(id => ids.has(id)));
check('season episodes are recorded', Array.isArray(lib.sources[0].episodes) && lib.sources[0].episodes.length === 7);
const alexSource = lib.sources.find(s => s.id === 'alex-channel');
check('ALEX episodes are recorded', Array.isArray(alexSource.episodes) && alexSource.episodes.length >= 3);
check('the ALEX correction is written down', alexSource.note.includes('第三方'));


// --- 评论区课代表整理图：日模板 ---------------------------------------------------------------
check('day templates from the comment digest', !!lib.dayTemplates && ['push', 'pull', 'legs'].every(k => !!lib.dayTemplates[k]));
for (const key of ['push', 'pull', 'legs']) {
  const day = lib.dayTemplates[key];
  check(key + ' template has five movements', Array.isArray(day.exercises) && day.exercises.length === 5, String(day.exercises && day.exercises.length));
  check(key + ' movements carry sets/reps/rpe', day.exercises.every(e => e.name && e.sets && e.reps && e.rpe), JSON.stringify(day.exercises.map(e => e.name)));
  check(key + ' template has a warmup', Array.isArray(day.warmup) && day.warmup.length >= 2);
}
check('push starts with the bench press', lib.dayTemplates.push.exercises[0].name === '杠铃卧推');
check('pull starts with the single-arm pulldown', lib.dayTemplates.pull.exercises[0].name === '单手钢线下拉');
check('legs starts with the single-leg deadlift', lib.dayTemplates.legs.exercises[0].name === '单腿硬拉');
check('the row targets mid/lower traps after the correction', lib.dayTemplates.pull.exercises.some(e => e.name === '坐姿开肘划船' && e.role.includes('中下斜方')));
check('the digest source is registered', lib.sources.some(s => s.id === 'community-digest'));
check('the digest note records the on-video slip', lib.sources.find(s => s.id === 'community-digest').note.includes('口误'));
check('the digest rules exist', ['push-day-template','pull-day-template','legs-day-template','rest-pause-isolation','warmup-legs-detailed'].every(id => ids.has(id)));
check('the generator uses the day templates', app.includes('libraryDayTemplate(template)') && app.includes('function libraryDayTemplate(template)'));
check('plan items show RPE', app.includes("' · RPE ' + item.rpe"));

check('the card shows the reference prescriptions', app.includes('<summary>参考处方</summary>') && app.includes('plan.days.some(day => day.suggested)'));

// --- ASR 口述级规则（A 级） ---------------------------------------------------------------
check('asr transcript rules', lib.sources.some(s => s.id === 'asr-transcript'));
const asr = lib.sources.find(s => s.id === 'asr-transcript');
check('asr source cites five videos', Array.isArray(asr.episodes) && asr.episodes.length === 5, String(asr.episodes && asr.episodes.length));
check('asr source is level A', asr.level.startsWith('A'));
check('asr rules carry timestamps', lib.rules.filter(r => r.evidence).length >= 8, String(lib.rules.filter(r => r.evidence).length));
check('timestamps look like mm:ss', lib.rules.filter(r => r.evidence).every(r => /^\d{2}:\d{2}$/.test(r.evidence.at)));
check('abs rules from the transcript', ['abs-endurance-training','abs-two-moves-detail','abs-stretch-before'].every(id => earlyIds.has(id)));
check('shoulder cues from the transcript', ['lateral-raise-partial','rear-delt-neutral-grip'].every(id => earlyIds.has(id)));
check('RPE 8 is not RM', lib.rules.find(r => r.id === 'rpe8-is-not-rm').claim.includes('不是 RM'));
check('the leg warmup has six moves at 45s', lib.rules.find(r => r.id === 'leg-warmup-six-moves').plan.secondsPerSide === 45);
check('the library now cites thirteen sources', lib.sources.length === 13, String(lib.sources.length));
check('priority covers the transcript source', lib.priority.includes('asr-transcript'));


// --- 问答检索与训练卡要点 ---------------------------------------------------------------------
check('topic routing exists', app.includes('const LIBRARY_ROUTES') && app.includes('function libraryLookup(question'));
check('the question routes to the right rules', app.includes('libraryLookup(question, 8)'));
check('cues exist per template', app.includes('function libraryCues(template)') && app.includes("legs: ['leg-warmup-six-moves'"));
check('the plan shows cues', app.includes('plan-cue') && app.includes('const cues ='));

// really run the routing: 腹肌 → abs rules, 减脂 → fatloss rules
const routeStart = app.indexOf('const LIBRARY_ROUTES');
const routeEnd = app.indexOf('/** Which library rule answers the weakest metric');
const routeSource = app.slice(routeStart, routeEnd);
const runLookup = new Function('window', 'trainingLibrary',
  routeSource + '\nreturn {libraryLookup, libraryCues};')({TRAINING_PRINCIPLES: lib}, () => lib);
const absHits = runLookup.libraryLookup('腹肌怎么练才对', 5);
check('腹肌 question returns abs rules', absHits.includes('腹肌') && absHits.includes('悬垂举腿'), absHits.slice(0, 60));
const fatHits = runLookup.libraryLookup('减脂平台期怎么办', 5);
check('减脂 question returns fatloss rules', fatHits.includes('平台') || fatHits.includes('缺口'), fatHits.slice(0, 60));
const sleepHits = runLookup.libraryLookup('最近睡眠不好很累', 5);
check('sleep question returns recovery rules', sleepHits.includes('睡眠') || sleepHits.includes('晨脉'), sleepHits.slice(0, 60));
check('unrelated question returns nothing', runLookup.libraryLookup('今天天气怎么样', 5) === '');
const cues = runLookup.libraryCues('legs');
check('leg cues cite the six-move warmup', cues.some(c => c.includes('6 个动作') || c.includes('45 秒')), JSON.stringify(cues));


// --- 解剖手册（第 1~3 集）与模板校准 ---------------------------------------------------------
check('anatomy rules from the handbook', ['joint-motion-map','judge-by-resistance-phase','bench-grip-decides-motion','shoulder-flexion-muscles'].every(id => earlyIds.has(id)));
check('chest rules from the handbook', ['elbow-angle-selects-chest','fake-decline-habit','dips-serratus'].every(id => earlyIds.has(id)));
check('shoulder rules from the handbook', ['lateral-raise-elbow-bend','upper-trap-participates','rear-delt-row-must-flare','scapular-retraction-error'].every(id => earlyIds.has(id)));
check('the bench grip rule names both motions', lib.rules.find(r => r.id === 'bench-grip-decides-motion').plan.wide === 'horizontal-adduction');
check('the fake decline rule names the habit', lib.rules.find(r => r.id === 'fake-decline-habit').plan.avoid.includes('过度挺胸'));
for (const key of ['push', 'pull', 'legs']) {
  const day = lib.dayTemplates[key];
  check(key + ' template carries cues', Array.isArray(day.cues) && day.cues.length >= 3, String(day.cues && day.cues.length));
}
check('the push cue mentions the elbow angle', lib.dayTemplates.push.cues.some(c => c.includes('开肘')));
check('the pull cue mentions horizontal flare', lib.dayTemplates.pull.cues.some(c => c.includes('水平开肘')));
check('the legs cue mentions the six-move warmup', lib.dayTemplates.legs.cues.some(c => c.includes('45 秒')));
check('the card shows the body-part hints', app.includes('function bodyPartHints') && app.includes('按部位查解剖要点'));
check('the reference block shows the cues', app.includes('day.cues.map(cue => esc(cue))'));

const rich = fs.readFileSync('app/src/fragments/10-rich-answer.fragment.js', 'utf8');
const carbStart = rich.indexOf('function carbCap');
const carbFn = rich.slice(carbStart, rich.indexOf('\n  }', carbStart) + 4);
check('carbCap falls back to the range max', carbFn.includes('number(range && range.max)'));
const runCarb = new Function('number', carbFn + '\nreturn carbCap;')(v => v === null || v === undefined || v === '' ? null : Number(v));
check('carb limit renders without calorieTarget', runCarb({proteinMax: 155, fatMax: 70}, {max: 2314}) === 266, String(runCarb({proteinMax: 155, fatMax: 70}, {max: 2314})));
check('carb limit uses calorieTarget when present', runCarb({calorieTarget: 2000, proteinMax: 140, fatMax: 60}, {max: 2314}) === 225, String(runCarb({calorieTarget: 2000, proteinMax: 140, fatMax: 60}, {max: 2314})));
check('the app notes inferred carbs', fs.readFileSync('app/src/main/java/cn/qingheng/health/MainActivity.java', 'utf8').includes('已按剩余热量反推'));
const rest = fs.readFileSync('app/src/fragments/70-rest.fragment.js', 'utf8');
const carbStart2 = rest.indexOf('function carbOfItem');
const carbEnd2 = rest.indexOf('\n  }', carbStart2) + 4;
const runItemCarb = new Function('number', rest.slice(carbStart2, carbEnd2) + '\nreturn carbOfItem;')(v => v === null || v === undefined || v === '' ? null : Number(v));
check('preview infers missing carbs', runItemCarb({calories: 261, protein: 5.3, fat: 0.6, carbs: 0}) === 58.6, String(runItemCarb({calories: 261, protein: 5.3, fat: 0.6, carbs: 0})));
check('preview keeps a stated carb value', runItemCarb({calories: 261, protein: 5.3, fat: 0.6, carbs: 57}) === 57);
check('preview leaves protein/fat-only rows alone', runItemCarb({calories: 40, protein: 8, fat: 1, carbs: null}) === 0);
check('back rules from the handbook', ['traps-grow-by-retraction','row-scapula-depends-on-goal','teres-major-is-small-lat','scapular-depression-before-pull'].every(id => earlyIds.has(id)));
check('the traps rule names the retraction movement', lib.rules.find(r => r.id === 'traps-grow-by-retraction').plan.movement === 'scapular-retraction');
check('the teres rule keeps the alias', lib.rules.find(r => r.id === 'teres-major-is-small-lat').plan.alias === '小背阔肌');
check('the library now holds the five-episode batch', lib.rules.filter(r => r.evidence && r.evidence.bvid === 'BV1jEnuz9ESc').length >= 4);
check('arm rules from the handbook', ['biceps-long-head-dual-joint','long-head-stretch-myth','triceps-heads-crossing','abs-blocks-are-genetic'].every(id => earlyIds.has(id)));
check('the myth rule is marked unproven', lib.rules.find(r => r.id === 'long-head-stretch-myth').plan.status === 'unproven');
check('every anatomy episode is cited', ['BV1mM6JY6Ei9','BV1YgcdeqE7y','BV167LAzaE14','BV1jEnuz9ESc','BV1X1Lj66ENe'].every(b => lib.rules.some(r => r.evidence && r.evidence.bvid === b)));
check('the library holds the whole handbook batch', lib.rules.filter(r => r.evidence).length >= 25, String(lib.rules.filter(r => r.evidence).length));
check('guideline citations', ['issn-2017','helms-2014','aasm-2015'].every(id => lib.sources.some(s => s.id === id)));
check('the protein range matches the stand', lib.rules.find(r => r.id === 'protein-general-range').claim.includes('1.4~2.0'));
check('the deficit protein band is cited', lib.rules.find(r => r.id === 'protein-deficit-range').plan.deficitRange[1] === 3.1);
check('per-meal protein is cited', lib.rules.find(r => r.id === 'protein-per-meal').plan.perMealG[1] === 40);
check('sleep consensus cites seven hours', lib.rules.find(r => r.id === 'sleep-duration-consensus').plan.minHours === 7);
check('formula error is acknowledged', lib.rules.find(r => r.id === 'tdee-formula-error').plan.formulaErrorPercent[1] === 20);
check('guideline rules carry a citation object', lib.rules.filter(r => r.citation).length >= 8, String(lib.rules.filter(r => r.citation).length));
check('the app has design tokens', fs.readFileSync('app/src/main/assets/styles.css','utf8').includes('--space-4:16px'));
check('chinese guideline rules', ['cdg-salt-oil-sugar','cdg-veg-fruit-dairy','cdg-protein-foods','cdg-staple-variety','cdg-activity-week','cdg-water','cdg-eating-out','cdg-oil-fits-fat-floor','csr-average-seven-four'].every(id => earlyIds.has(id)));
check('the salt limit is five grams', lib.rules.find(r => r.id === 'cdg-salt-oil-sugar').plan.saltG === 5);
check('oil is 25 to 30 grams', lib.rules.find(r => r.id === 'cdg-salt-oil-sugar').plan.oilG[1] === 30);
check('weekly activity is 150 minutes', lib.rules.find(r => r.id === 'cdg-activity-week').plan.moderateMinutes === 150);
check('the sleep report figure is recorded', lib.rules.find(r => r.id === 'csr-average-seven-four').plan.meanHours === 7.4);
check('the oil rule reconciles the fat floor', lib.rules.find(r => r.id === 'cdg-oil-fits-fat-floor').plan.fatFloorG === 55);
check('priority starts with the chinese guide', lib.priority[0] === 'cdg-2022');
check('obesity guidance rules', ['cswz-energy-deficit','cswz-macro-split','cswz-loss-rate','cswz-activity-dose','cswz-sleep-seven-23','cswz-food-portions','cswz-meal-order','cswz-oil-salt-tight','cswz-alcohol-cost','cswz-scope-vs-app-floor'].every(id => earlyIds.has(id)));
check('the guide keeps the app floor separate', lib.rules.find(r => r.id === 'cswz-scope-vs-app-floor').plan.appFloor === 2000);
check('the loss rate is 0.5 to 1 kg a week', lib.rules.find(r => r.id === 'cswz-loss-rate').plan.weeklyKg[1] === 1);
check('cardio is 150 to 300 minutes', lib.rules.find(r => r.id === 'cswz-activity-dose').plan.cardioMinutes[1] === 300);
check('meal order starts with vegetables', lib.rules.find(r => r.id === 'cswz-meal-order').plan.order[0] === '蔬菜');
check('alcohol is seven kcal a gram', lib.rules.find(r => r.id === 'cswz-alcohol-cost').plan.kcalPerGram === 7);
const cssText = fs.readFileSync('app/src/main/assets/styles.css','utf8');
check('metrics use tabular numbers', cssText.includes('font-variant-numeric:tabular-nums'));
check('reduced motion is respected', cssText.includes('prefers-reduced-motion'));
check('focus is visible', cssText.includes(':focus-visible'));
check('the design notes are recorded', typeof lib.designNotes === 'object' && lib.designNotes.basis.length > 10);
const frags = fs.readdirSync('app/src/fragments').map(f => fs.readFileSync('app/src/fragments/' + f, 'utf8')).join('\n');
check('empty states all go through the component', !/<p>目前记录不足/.test(frags) && !/还没有可复制的餐食记录。'<\/span>/.test(frags) && !/没有匹配结果。/.test(frags));
check('the component has a title and hint', frags.includes('empty-title') && frags.includes('empty-hint'));
check('the component is used in at least six places', (frags.match(/empty\(/g) || []).length >= 6, String((frags.match(/empty\(/g) || []).length));
const sheet = fs.readFileSync('app/src/main/assets/styles.css','utf8');
check('the four type levels exist', ['.t-page','.t-card','.t-body','.t-note'].every(c => sheet.includes(c)));
check('smallest text is readable', !/font-size:\s*(9|10|10\.5|11\.5|12)px/.test(sheet));
check('form controls inherit the body font', /button,input,select,textarea\{font-family:var\(--font-ui\)/.test(sheet));
check('every font family goes through a token', (sheet.match(/font-family:\s*(?!var\(--font-)/g) || []).length === 0, String((sheet.match(/font-family:\s*(?!var\(--font-)/g) || []).length));
const sheet2 = fs.readFileSync('app/src/main/assets/styles.css','utf8');
const skinBlock = (sheet2.match(/\[data-skin="ledger"\]\{([\s\S]*?)\}/) || [])[1] || '';
const baseBlock = (sheet2.match(/:root\{([\s\S]*?)\}/) || [])[1] || '';
const required = ['--paper','--surface','--line','--ink','--body-text','--muted','--radius-lg','--measure'];
check('both skins define the same tokens', required.every(k => baseBlock.includes(k + ':') && (skinBlock.includes(k + ':') || k === '--measure')), required.filter(k => !skinBlock.includes(k + ':')).join(','));
check('the skin switcher exists', frags.includes('installSkinPicker') && frags.includes('data-skin-pick'));
check('the skin persists', frags.includes("localStorage.setItem(SKIN_KEY"));
check('ledger swaps the display font for sans', /\[data-skin="ledger"\][\s\S]{0,400}--font-display:var\(--font-ui\)/.test(sheet2));
const appJs = fs.readFileSync('app/src/main/assets/app.js','utf8');
const idxHtml = fs.readFileSync('app/src/main/assets/index.html','utf8');
check('the glossary covers core terms', ['RPE','RM','ACWR','TDEE','减载','渐进超负荷','力竭'].every(k => appJs.includes('"' + k + '": {full:')));
check('terms are annotated into the plan', appJs.includes('annotateTerms(') && appJs.includes('plan-cue'));
check('the term sheet can be closed', appJs.includes('installTermSheet') && appJs.includes('term-close'));
check('photo entries follow the skin', cssText.includes('.photo-add:active{background:var(--surface-soft)}') && cssText.includes('.sheet-option:active{background:var(--accent-soft)}'));
check('the weight calculator handles per-side input', appJs.includes('weight-per-side') && appJs.includes('weight-fill'));
check('the credits block lists the channels', idxHtml.includes('id="credits"') && idxHtml.includes('space.bilibili.com/2100737396') && idxHtml.includes('space.bilibili.com/521903482') && idxHtml.includes('space.bilibili.com/2078781964'));
check('training tabs disappear in the no-training mode', appJs.includes('[data-records-panel=\"training\"]') && appJs.includes('[data-trends-panel=\"training\"]'));
check('the AI plan uses the shared external consent', !appJs.includes('id="ai-plan-consent"') && appJs.includes('externalConsent()'));
check('the AI plan parses JSON only', appJs.includes('function parseAiPlanReply') && appJs.includes('JSON.parse(slice)'));
check('the AI plan stores per day', appJs.includes('qingheng.aiPlan.'));
check('the term sheet exists', idxHtml.includes('id="term-sheet"') && appJs.includes('function openTerm'));
check('every term has a caution', (appJs.match(/caution: "/g) || []).length >= 7, String((appJs.match(/caution: "/g) || []).length));
check('the notes collapse exists', idxHtml.includes('class="card-notes"'));
console.log('\nFAIL total: ' + fail);
process.exitCode = fail ? 1 : 0;
