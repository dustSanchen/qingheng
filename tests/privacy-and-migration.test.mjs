import fs from 'node:fs';
const j = JSON.parse(fs.readFileSync('app/src/main/assets/seed.json', 'utf8'));
let fail = 0;
const check = (label, ok, detail) => { console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail)); if (!ok) fail++; };

check('seed has no measurements', j.measurements.length === 0, j.measurements.length);
check('seed has no meals', j.meals.length === 0, j.meals.length);
check('seed has no habits', j.habits.length === 0, j.habits.length);
check('seed has no chats', j.chats.length === 0, j.chats.length);
check('seed has no notes', (j.notes || []).length === 0, (j.notes || []).length);

const flat = JSON.stringify(j);
const leftovers = ['2026-07-05', '2026-08-16', '2026-08-21', '2026-09-09', '2026-09-25', '2026-10-10', '27.4', '63.75', '64.3', '65.5', '16.6', '19.4', '1496'].filter(token => flat.includes(token));
check('seed carries no personal values or dates', leftovers.length === 0, leftovers.join(', ') || 'none');

check('seed marks the demo migration as done', j.seedMigrated === 2, j.seedMigrated);
check('seed starts with onboarding pending', j.onboardingDone === false, j.onboardingDone);
check('seed goal is unset (user chooses)', j.profile.goal === null, j.profile.goal);
check('seed targets are unset (computed at onboarding)', j.profile.calorieTarget === null && j.profile.proteinMin === null && j.profile.fatMin === null);
check('seed height is unset', j.profile.height === null);

const java = fs.readFileSync('app/src/main/java/cn/qingheng/health/MainActivity.java', 'utf8');
check('java migration is idempotent via seedMigrated', java.includes('root.put("seedMigrated", 2)'));
check('java only removes exact demo measurement fingerprints', java.includes('SEED_DEMO_MEASUREMENT_VALUES') && java.includes('sameNumber(record.opt("weight")'));
check('java only removes the three demo meals', java.includes('SEED_DEMO_MEAL_CALORIES') && java.includes('SEED_DEMO_MEAL_DATE'));
// Upgrade safety: cleanState must build on a copy of the incoming object and only normalise known
// fields, so a future version's extra keys survive an app update.
check('java cleanState starts from a copy of incoming state', /JSONObject out = source == null \? new JSONObject\(\) : scrub\(source\)/.test(java));
check('java only puts defaults when a field is missing or wrong-typed', java.includes('if (!(out.opt(key) instanceof JSONArray)) out.put(key, new JSONArray())'));
check('java does not rebuild a whitelist-only object', !/JSONObject out = new JSONObject\(\);\s*out\.put\("version"/.test(java));
check('java still scrubs credential keys on load and export', java.includes('apikey') && java.includes('secret'));
check('java exposes markdown export route', java.includes('/api/export-markdown'));
check('java exposes exportText bridge (SAF)', java.includes('exportText(String filename, String content)'));
check('markdown filename is sanitized', java.includes('.md'));

console.log('\nFAIL total: ' + fail);
process.exitCode = fail ? 1 : 0;
