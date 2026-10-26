/**
 * Fragment drift guard.
 *
 * assets/app.js is generated: the fragments under app/src/fragments/ are the source of truth and
 * tools/assemble-app.ps1 concatenates them in filename order. This test fails when someone edits the
 * generated file directly, when a fragment is missing, or when the order changes.
 */
import fs from 'node:fs';

import path from 'node:path';

let fail = 0;
const check = (label, ok, detail) => { console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail)); if (!ok) fail++; };

const dir = 'app/src/fragments';
const target = 'app/src/main/assets/app.js';

check('the fragment directory exists', fs.existsSync(dir));
const names = fs.readdirSync(dir).filter(name => name.endsWith('.fragment.js')).sort();
check('several fragments exist', names.length >= 5, names.length);
check('fragments are numbered so the order is explicit', names.every(name => /^\d\d-[a-z-]+\.fragment\.js$/.test(name)), names.join(', '));
check('the head fragment comes first', names[0].startsWith('00-'));
check('the boot fragment comes last', names[names.length - 1].startsWith('80-'));

// The browser must not be able to fetch fragments directly: they live outside assets/.
check('fragments are not shipped as separate assets', !fs.existsSync('app/src/main/assets/app'));
check('assets/ stays flat', fs.readdirSync('app/src/main/assets').every(entry => fs.statSync(path.join('app/src/main/assets', entry)).isFile()));

// Rebuild in memory and compare with the generated file, byte for byte.
const assembled = names.map(name => fs.readFileSync(path.join(dir, name), 'utf8')).join('');
const generated = fs.readFileSync(target, 'utf8');
check('assets/app.js equals the concatenated fragments', assembled === generated,
  assembled === generated ? undefined : `${assembled.length} vs ${generated.length} bytes`);
check('the generated file is announced as generated', generated.includes('assembled by tools/assemble-app.ps1'));
check('no fragment carries a stray BOM', names.every(name => !fs.readFileSync(path.join(dir, name), 'utf8').startsWith('\uFEFF')));

// A fragment must be a slice of the same programme, not a standalone script: the IIFE opens in the
// head fragment and closes in the boot fragment.
check('the head fragment opens the IIFE', fs.readFileSync(path.join(dir, names[0]), 'utf8').includes('(() => {'));
const boot = fs.readFileSync(path.join(dir, names[names.length - 1]), 'utf8');
check('the boot fragment closes the IIFE', boot.trimEnd().endsWith('})();'));

// Section ownership: each well-known helper lives in exactly one fragment.
const owners = new Map();
for (const name of names) {
  const body = fs.readFileSync(path.join(dir, name), 'utf8');
  for (const symbol of ['function renderChat(', 'function answerHtml(', 'function computeTargets(', 'async function loadVersions(', 'function saveTrainingLog(', 'async function syncAnchors(']) {
    if (body.includes(symbol)) owners.set(symbol, [...(owners.get(symbol) || []), name]);
  }
}
for (const [symbol, found] of owners) check(`${symbol} lives in exactly one fragment`, found.length === 1, found.join(', '));
check('every probed symbol was found', owners.size === 6, owners.size);

console.log('\nFAIL total: ' + fail);
process.exitCode = fail ? 1 : 0;

{
  const html = fs.readFileSync(new URL('../app/src/main/assets/index.html', import.meta.url), 'utf8');
  for (const tag of ['div', 'article', 'section', 'details']) {
    const open = (html.match(new RegExp('<' + tag + '\\b', 'g')) || []).length;
    const close = (html.match(new RegExp('</' + tag + '>', 'g')) || []).length;
    check('index.html ' + tag + ' tags balance', open === close, open + ' vs ' + close);
  }
}
