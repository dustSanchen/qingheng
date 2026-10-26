import fs from 'node:fs';

let t = fs.readFileSync('tests/training-library.test.mjs', 'utf8');
if (t.includes('day templates from the comment digest')) {
  console.log('already added');
  process.exit(0);
}

const extra = `
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
check('the generator uses the day templates', app.includes('const day = libraryDayTemplate(template);') && app.includes('function libraryDayTemplate(template)'));
check('plan items show RPE', app.includes("' · RPE' + item.rpe"));
`;

t = t.replace("console.log('\\nFAIL total: ' + fail);", extra + "\nconsole.log('\\nFAIL total: ' + fail);");
fs.writeFileSync('tests/training-library.test.mjs', t);
console.log('day-template assertions appended');
