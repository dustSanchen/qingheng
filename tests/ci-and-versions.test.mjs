/**
 * Step 7 checks: one command verifies everything, one-off scripts are archived, and the versions that
 * make a record explainable are recorded and surfaced.
 */
import fs from 'node:fs';

let fail = 0;
const check = (label, ok, detail) => { console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail)); if (!ok) fail++; };

const exists = path => fs.existsSync(path);
const read = path => fs.readFileSync(path, 'utf8');

// --- one command ----------------------------------------------------------------------------------------
const ci = read('tools/verify-all.ps1');
check('a single verification command exists', exists('tools/verify-all.ps1'));
check('it runs every test suite', ci.includes("Get-ChildItem tests -Filter *.test.mjs") && ci.includes('$failed += $suite.Name'));
check('it fails fast on a test failure', ci.includes("if ($failed.Count) { throw (\"test failures: \" + ($failed -join ', ')) }"));
check('it builds through build.ps1 (single source of the version)', ci.includes("Join-Path $root 'build.ps1'"));
check('it runs the packaging checks', ci.includes('tests\\verify-web-apk.mjs') && ci.includes('tests\\icon-style.test.mjs'));
check('it prints the APK hash', ci.includes('Get-FileHash $apk.FullName -Algorithm SHA256'));
check('the packaging guard rejects backslash and leftover entries', read('build.ps1').includes('packaging guard') && read('build.ps1').includes('ZipFile'));
check('it can skip the build for a quick test run', ci.includes('[switch]$SkipBuild'));
check('it works from any directory', ci.includes('Split-Path -Parent $PSScriptRoot'));

// --- housekeeping ---------------------------------------------------------------------------------------
check('one-off scripts are archived', exists('tools/one-off/README.md'));
const oneOff = fs.readdirSync('tools/one-off');
check('the archive holds the historical patches', oneOff.filter(name => name.endsWith('.py')).length >= 30, oneOff.filter(n => n.endsWith('.py')).length);
check('the archive explains they must not be re-run', read('tools/one-off/README.md').includes('不要在新流程里执行') && read('tools/one-off/README.md').includes('重复执行会重复插入内容'));
check('the repo root is free of loose scripts', fs.readdirSync('.').filter(name => /\.(py|mjs)$/.test(name)).length === 0);
check('the anchor generator stays a real tool', exists('tools/build-anchors.mjs') && !oneOff.includes('build-anchors.mjs'));

// --- prompt / 口径 versioning ---------------------------------------------------------------------------
const main = read('app/src/main/java/cn/qingheng/health/MainActivity.java');
const prompts = read('app/src/main/java/cn/qingheng/health/ai/Prompts.java');
const routes = read('app/src/main/java/cn/qingheng/health/bridge/MetaRoutes.java');
check('a prompt version exists', prompts.includes('public static final int PROMPT_VERSION = 9;'));
check('a 口径 version exists', prompts.includes('public static final int RULES_VERSION = 2;'));
check('the versions explain themselves', main.includes('which prompt produced an answer') && main.includes('which 口径 the numbers were computed with'));
check('a versions route exists', routes.includes('path.equals("/api/versions")') && main.includes('MetaRoutes.handle(path, get, post, b, this)'));
check('versions never include keys or records', /private JSONObject versionsInternal\(\) throws Exception \{[\s\S]{0,900}?\}/.test(main) && !/versionsInternal\(\)[\s\S]{0,900}apiKey/.test(main));
check('versions report the anchors and last backup', main.includes('.put("anchorsPresent"') && /backupAt", backupStatusInternal\(\)\.optLong\("at", 0L\)/.test(main));

const app = read('app/src/main/assets/app.js');
const html = read('app/src/main/assets/index.html');
check('the about page shows the versions', html.includes('id="version-info"') && app.includes('async function loadVersions()'));
check('it explains why the versions matter', html.includes('旧记录不会被重新解释'));
check('it loads when the about subpage opens', app.includes("loadStorageStatus(false).catch(() => {}); loadVersions().catch(() => {});"));

check('the one-command dev loop exists', fs.existsSync('tools/dev-loop.ps1') && fs.readFileSync('tools/dev-loop.ps1', 'utf8').includes('install + smoke'));
check('the patcher library exists', fs.existsSync('tools/lib/patch.mjs'));
check('the device helper converts preview coordinates', fs.readFileSync('tools/device.mjs', 'utf8').includes('fromPreview'));
check('the tools are documented', fs.readFileSync('tools/README.md', 'utf8').includes('dev-loop.ps1'));

console.log('\nFAIL total: ' + fail);
process.exitCode = fail ? 1 : 0;
