import fs from 'node:fs';
const root = 'D:/AI/health-android/app/src/main/assets/';
const html = fs.readFileSync(root + 'index.html', 'utf8');
const app = fs.readFileSync(root + 'app.js', 'utf8');
const css = fs.readFileSync(root + 'styles.css', 'utf8');
let fail = 0;
const check = (label, ok) => { console.log((ok ? 'PASS  ' : 'FAIL  ') + label); if (!ok) fail++; };

for (const id of ['onboarding','ob-next','ob-back','ob-finish','ob-skip','ob-goals','ob-sex','ob-height','ob-weight','ob-age','ob-training','ob-result','ob-provider','ob-baseurl','ob-model','ob-apikey','ob-allow','ob-feedback','profile-goal','recalc-target','restart-onboarding','export-markdown','profile-target-status','onboarding-dots']) {
  check('markup has #' + id, html.includes('id="' + id + '"'));
}
const open = (html.match(/<section\b/g) || []).length, close = (html.match(/<\/section>/g) || []).length;
check('section tags balanced (' + open + '/' + close + ')', open === close);
check('no login dialog (native app)', !html.includes('login-dialog'));

for (const fn of ['computeTargets','recalcProfileTargets','persistProfile','onboardingStep','showOnboarding','obValues','obSyncTargets','obNext','obFinish','renderTargetStatus','latestWeight']) {
  const n = (app.match(new RegExp('function ' + fn + '\\(', 'g')) || []).length;
  check('app.js defines ' + fn + '() exactly once', n === 1);
}
for (const id of ['profile-goal','recalc-target','restart-onboarding','ob-next','ob-back','ob-finish','ob-skip','export-markdown']) {
  check('app.js binds #' + id, app.includes("$('#" + id + "')") || app.includes('$$(\'#ob-goals'));
}
check('app.js opens onboarding when not done', app.includes('showOnboarding(true)'));
check('app.js respects onboardingDone flag', app.includes('state.onboardingDone'));
// Upgraders have no onboardingDone marker but do have a height; the gate must not interrupt them.
check('onboarding also requires an unset height', /!state\.onboardingDone && number\(\(state\.profile \|\| \{\}\)\.height\) === null/.test(app));
check('exportText bridge is used by the UI', app.includes('window.QinghengNative.exportText'));
check('markdown export calls the native/JS route', app.includes("api('/api/export-markdown'"));
check('Mifflin-St Jeor present', app.includes('10 * w + 6.25 * h - 5 *'));
check('sex constant present', app.includes("sex === 'female' ? -161 : 5"));
check('safety floor present', app.includes("sex === 'female' ? 1200 : 1500"));
for (const goal of ['gain','cut','recomp','maintain']) {
  check('goal option ' + goal, html.includes('value="' + goal + '"'));
}
check('CSS has onboarding rules', css.includes('.onboarding{'));
check('CSS has goal card rules', css.includes('.goal-card'));
check('CSS has target panel', css.includes('.target-status'));
// 2026-10-16 button system: shared height/radius/gap tokens, press feedback, 44px+ touch targets.
check('button tokens defined', /--btn-h:48px/.test(css) && /--shape-ctrl-radius:\s*\d/.test(css) && /--gap:12px/.test(css) && /--gap-sm:8px/.test(css));
check('button uses the shared height token', /\.button\{[^}]*min-height:var\(--btn-h\)/.test(css));
check('button has a pressed state', /\.button:active\{/.test(css));
check('primary has a pressed state', /\.primary:active\{/.test(css));
check('subtle has a pressed state', /\.subtle:active\{/.test(css));
check('text button keeps a 44px touch target', /\.text-button\{[^}]*min-height:44px/.test(css));
check('button rows use the shared gap', /\.button-row\{[^}]*gap:var\(--gap\)/.test(css));
check('dialog actions use the shared gap', /\.app-dialog-actions\{[^}]*gap:var\(--gap\)/.test(css));
check('capture actions use the shared gap', /\.capture-actions\{[^}]*gap:var\(--space-2\)/.test(css));
check('nav buttons are 52px targets', /\.bottom-nav button\{[^}]*min-height:52px/.test(css));
check('sheet options have a pressed state', /\.sheet-option:active\{/.test(css));

const adapter = fs.readFileSync(root + 'native-adapter.js', 'utf8');
check('adapter exports markdown route', adapter.includes("path==='/api/export-markdown'"));
check('adapter has JS markdown fallback', adapter.includes('function buildMarkdown('));
check('markdown mentions not medical advice', adapter.includes('不构成医疗诊断'));
check('markdown escapes pipes', adapter.includes("replace(/\\|/g"));
check('demo store writes only health data', adapter.includes('JSON.stringify(healthOnly(state))'));
check('healthOnly never includes settings or keys', !/healthOnly\s*=\s*data\s*=>\s*\(\{[^}]*settings/.test(adapter));
check('browser demo rejects API keys', adapter.includes('API Key 只能在 APK 中保存'));
check('no apiKey written to localStorage', !/localStorage\.setItem\([^)]*apiKey/.test(adapter));
// USDA-derived values can have two decimals (200 g rice = 0.56 g fat); step="0.1" made them unsubmittable.
check('preview nutrient inputs accept two decimals', /data-item-field="\$\{key\}"[\s\S]{0,240}step="0\.01"/.test(app));
check('no preview nutrient input keeps step 0.1', !/data-item-field="\$\{key\}"[^>]*step="0\.1"/.test(app));
check('manual meal inputs accept two decimals', (html.match(/name="(calories|protein|fat|carbs)" type="number" step="0\.01"/g) || []).length === 4);
check('manual meal inputs keep their bounds', /name="fat" type="number" step="0\.01" min="0" max="2000"/.test(html));

console.log('\nFAIL total: ' + fail);
process.exitCode = fail ? 1 : 0;
