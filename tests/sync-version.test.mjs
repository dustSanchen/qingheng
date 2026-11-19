/**
 * Version sync is the only thing standing between "APK 1.4.16" and "About page 1.4.14".
 * Run the real tool against a throwaway copy of its three files and prove it rewrites all of them,
 * then run it again to prove it is idempotent.
 */
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

let fail = 0;
const check = (label, ok, detail) => { console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail)); if (!ok) fail++; };

const files = [
  'app/src/fragments/70-rest.fragment.js',
  'build.ps1',
  'tests/meal-date-java.test.mjs'
];
const work = path.join(os.tmpdir(), 'qingheng-sync-' + Date.now());
for (const rel of files) {
  const target = path.join(work, rel);
  fs.mkdirSync(path.dirname(target), {recursive: true});
  fs.copyFileSync(rel, target);
}

const script = path.resolve('tools/sync-version.mjs');
const run = version => execFileSync(process.execPath, [script, version, version.split('.').map(Number).reduce((a, b) => a * 100 + b)], {cwd: work, encoding: 'utf8'});

run('9.9.9');
const read = () => files.map(rel => fs.readFileSync(path.join(work, rel), 'utf8'));
const after = read();
check('the fragment constant is rewritten', after[0].includes("const APP_VERSION = '9.9.9'"), after[0].match(/APP_VERSION = '[^']+'/)?.[0]);
check('build.ps1 default version is rewritten', /Version='9\.9\.9'/.test(after[1]));
check('the test literal is rewritten', after[2].includes("APP_VERSION = '9.9.9'"), after[2].match(/APP_VERSION = '[^']+'/)?.[0]);

const again = run('9.9.9');
const third = read();
check('a second run leaves the files byte-identical', third.every((text, i) => text === after[i]));

console.log('\nFAIL total: ' + fail);
process.exitCode = fail ? 1 : 0;
