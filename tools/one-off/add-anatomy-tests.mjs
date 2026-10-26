import fs from 'node:fs';

let t = fs.readFileSync('tests/training-library.test.mjs', 'utf8');
if (t.includes('anatomy rules from the handbook')) {
  console.log('already added');
  process.exit(0);
}

const extra = `
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
`;

t = t.replace("console.log('\\nFAIL total: ' + fail);", extra + "\nconsole.log('\\nFAIL total: ' + fail);");
fs.writeFileSync('tests/training-library.test.mjs', t);
console.log('anatomy assertions appended');
