import fs from 'node:fs';

let t = fs.readFileSync('tests/training-library.test.mjs', 'utf8');
if (t.includes('asr transcript rules')) {
  console.log('already added');
  process.exit(0);
}

const extra = `
// --- ASR 口述级规则（A 级） ---------------------------------------------------------------
check('asr transcript rules', lib.sources.some(s => s.id === 'asr-transcript'));
const asr = lib.sources.find(s => s.id === 'asr-transcript');
check('asr source cites five videos', Array.isArray(asr.episodes) && asr.episodes.length === 5, String(asr.episodes && asr.episodes.length));
check('asr source is level A', asr.level.startsWith('A'));
check('asr rules carry timestamps', lib.rules.filter(r => r.evidence).length >= 8, String(lib.rules.filter(r => r.evidence).length));
check('timestamps look like mm:ss', lib.rules.filter(r => r.evidence).every(r => /^\\d{2}:\\d{2}$/.test(r.evidence.at)));
check('abs rules from the transcript', ['abs-endurance-training','abs-two-moves-detail','abs-stretch-before'].every(id => earlyIds.has(id)));
check('shoulder cues from the transcript', ['lateral-raise-partial','rear-delt-neutral-grip'].every(id => earlyIds.has(id)));
check('RPE 8 is not RM', lib.rules.find(r => r.id === 'rpe8-is-not-rm').claim.includes('不是 RM'));
check('the leg warmup has six moves at 45s', lib.rules.find(r => r.id === 'leg-warmup-six-moves').plan.secondsPerSide === 45);
check('the library is now seven sources', lib.sources.length === 7, String(lib.sources.length));
check('priority covers the transcript source', lib.priority.includes('asr-transcript'));
`;

t = t.replace("console.log('\\nFAIL total: ' + fail);", extra + "\nconsole.log('\\nFAIL total: ' + fail);");
t = t.replace("check('six sources are cited', lib.sources.length === 6, String(lib.sources.length));",
  "check('six sources are cited', lib.sources.length >= 6, String(lib.sources.length));");
t = t.replace("check('priority order is declared', Array.isArray(lib.priority) && lib.priority.length === 6, JSON.stringify(lib.priority));",
  "check('priority order is declared', Array.isArray(lib.priority) && lib.priority.length >= 6, JSON.stringify(lib.priority));");
fs.writeFileSync('tests/training-library.test.mjs', t);
console.log('asr assertions appended');
