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
check('the lean prompt mirrors the preset', prompts.includes('热量缺口 12%') && prompts.includes('2.2~2.6 g/kg') && prompts.includes('12~18 组/肌群/周') && prompts.includes('0.5~0.7%'));
check('a versions route exists', routes.includes('path.equals("/api/versions")') && main.includes('MetaRoutes.handle(path, get, post, b, this)'));
check('versions never include keys or records', /private JSONObject versionsInternal\(\) throws Exception \{[\s\S]{0,900}?\}/.test(main) && !/versionsInternal\(\)[\s\S]{0,900}apiKey/.test(main));
check('versions report the anchors and last backup', main.includes('.put("anchorsPresent"') && /backupAt", backupStatusInternal\(\)\.optLong\("at", 0L\)/.test(main));

const app = read('app/src/main/assets/app.js');
const html = read('app/src/main/assets/index.html');
check('the about page shows the versions', html.includes('id="version-info"') && app.includes('async function loadVersions()'));
check('it explains why the versions matter', html.includes('旧记录不会被重新解释'));
check('it loads when the about subpage opens', app.includes("loadStorageStatus(false).catch(() => {}); loadVersions().catch(() => {});"));
check('the about page names the author and states the source is public', html.includes('作者 Sanchen') && html.includes('源码公开'));
check('the app still does not link to the source repository', !html.includes('github.com/dustSanchen/qingheng'));
check('building cannot disagree with the shipped app version', read('build.ps1').includes('APP_VERSION') && read('build.ps1').includes('does not match APP_VERSION'));
check('it states the no-resale terms', html.includes('禁止二次转售') && read('LICENSE').includes('二次转售') && read('LICENSE').includes('再分发'));
const readme = read('README.md');
const site = read('site/index.html');
const apkVersion = (read('app/src/fragments/70-rest.fragment.js').match(/APP_VERSION = '([0-9.]+)'/) || [])[1];
check('the readme keeps the release facts', readme.includes('LICENSE') && readme.includes('site/shots/today.jpg') && readme.includes('version-' + apkVersion) && readme.includes('b23aba9a2955e620dad5453c15a879ffab3ca4ad90a3e5b1b63beb5f55fab1ac'));
check('the readme screenshots are on disk', fs.readdirSync('site/shots').filter(name => name.endsWith('.jpg')).length >= 8);
check('the showcase page also drops the source link', site.includes('个人作品') && site.includes('许可') && !site.includes('>打开仓库<'));
const publisher = read('tools/publish-pages.ps1');
check('the pages publisher only touches gh-pages', publisher.includes('gh-pages') && publisher.includes('site\\index.html') && !publisher.includes('README.md=README.md'));

check('the one-command dev loop exists', fs.existsSync('tools/dev-loop.ps1') && fs.readFileSync('tools/dev-loop.ps1', 'utf8').includes('install + smoke'));
check('the patcher library exists', fs.existsSync('tools/lib/patch.mjs'));
check('the device helper converts preview coordinates', fs.readFileSync('tools/device.mjs', 'utf8').includes('fromPreview'));
check('the tools are documented', fs.readFileSync('tools/README.md', 'utf8').includes('dev-loop.ps1'));

console.log('\nFAIL total: ' + fail);
process.exitCode = fail ? 1 : 0;
