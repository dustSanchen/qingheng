/**
 * Training-day semantics after 1.4.71: trained > explicit rest > disabled/planned > unrecorded.
 * These tests execute the pure function from the assembled bundle instead of grepping source text.
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
const source = extractFunction(app, 'trainingStateFor');
const trainingStateFor = new Function(source + '\nreturn trainingStateFor;')();

const states = [
  ['trained wins over a stale rest marker', trainingStateFor({
    exercises: [{name: '卧推'}], habitTraining: false, profileTraining: 'none'
  }), 'trained'],
  ['a no-training profile with no exercise is disabled', trainingStateFor({
    profileTraining: 'none', habitTraining: undefined
  }), 'disabled'],
  ['an explicit false marker is a rest day', trainingStateFor({
    habitTraining: false, profileTraining: '3'
  }), 'rest'],
  ['the string false marker is also a rest day', trainingStateFor({
    habitTraining: 'false', profileTraining: '3'
  }), 'rest'],
  ['no marker is unrecorded, not rest', trainingStateFor({
    habitTraining: undefined, profileTraining: '3'
  }), 'unrecorded'],
  ['a cached plan with exercises is planned', trainingStateFor({
    hasPlan: true, planDay: {exercises: [{name: '深蹲'}]}
  }), 'planned'],
  ['a cached plan without exercises is a planned rest day', trainingStateFor({
    hasPlan: true, planDay: null
  }), 'plan-rest']
];
for (const [label, actual, expected] of states) check(label, actual === expected, actual);

check('real training is never hidden as rest', trainingStateFor({
  exercises: [{name: '跑步'}], habitTraining: false
}) === 'trained');
check('a blank exercise does not count as training', trainingStateFor({
  exercises: [{name: '   '}], habitTraining: false
}) === 'rest');

console.log('FAIL total: ' + fail);
process.exitCode = fail ? 1 : 0;
