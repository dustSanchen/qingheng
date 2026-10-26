/*
 * One-off: split app/src/main/assets/app.js into ordered fragments under app/src/main/assets/app/.
 *
 * The concatenation of the fragments must reproduce the original file byte for byte -- the script
 * asserts that before it writes anything, so the split itself cannot lose or reorder a character.
 * Afterwards `tools/assemble-app.ps1` rebuilds app.js from the fragments on every build.
 */
import fs from 'node:fs';
import path from 'node:path';

const source = 'app/src/main/assets/app.js';
const dir = 'app/src/main/assets/app';

const original = fs.readFileSync(source, 'utf8');

// Each boundary is the first line of the fragment that follows it; order is the assembly order.
const fragments = [
  ['00-head.fragment.js', null],
  ['10-rich-answer.fragment.js', '  // ---- Rich answers -----------------------------------------------------------'],
  ['20-permissions-backup.fragment.js', "  // ---- The three things that decide whether reminders and watch data actually work ------"],
  ['30-voice.fragment.js', '  // ---- Voice input ------------------------------------------------------------'],
  ['40-targets.fragment.js', '  const TARGET_RULES = {'],
  ['50-onboarding.fragment.js', '  const onboarding = {step: 1, total: 4, done: false, result: null, saving: false};'],
  ['60-training-copy.fragment.js', '  /** "Today\'s three things" card: training, cooking oil and weight in one submit. */'],
  ['70-rest.fragment.js', '  // ---- Unconfirmed draft box --------------------------------------------------'],
  ['80-boot.fragment.js', '  switchTab(restoreTab());render();connection();syncAnchors().catch(()=>{});'],
];

const cuts = [];
for (const [name, marker] of fragments) {
  if (marker === null) { cuts.push({name, at: 0}); continue; }
  const at = original.indexOf(marker);
  if (at < 0) throw new Error(`${name}: marker not found`);
  cuts.push({name, at});
}
for (let i = 1; i < cuts.length; i++) {
  if (cuts[i].at <= cuts[i - 1].at) throw new Error(`fragment order is wrong at ${cuts[i].name}`);
}

const parts = cuts.map((cut, index) => ({
  name: cut.name,
  body: original.slice(cut.at, index + 1 < cuts.length ? cuts[index + 1].at : original.length),
}));

const header = name =>
  `/* Fragment of assets/app.js -- assembled by tools/assemble-app.ps1 in filename order.\n` +
  ` * Edit this file, never the generated assets/app.js; tests/app-fragments.test.mjs fails on drift. */\n`;

let reassembled = '';
for (const part of parts) {
  reassembled += header(part.name) + part.body;
}

// The assertion that makes this split safe: fragments + headers must contain the original verbatim.
const stripped = reassembled.split(header('')).join('');
if (!stripped.includes(original)) {
  // Headers were added per fragment, so compare body-by-body instead of the concatenation.
  const bodies = parts.map(part => part.body).join('');
  if (bodies !== original) throw new Error('split is not lossless: bodies do not reproduce the original');
}

fs.mkdirSync(dir, {recursive: true});
for (const part of parts) {
  fs.writeFileSync(path.join(dir, part.name), header(part.name) + part.body);
}
console.log(`split into ${parts.length} fragments:`);
for (const part of parts) console.log(`  ${part.name}  ${part.body.split('\n').length} lines`);
console.log('bodies reproduce the original byte for byte');
