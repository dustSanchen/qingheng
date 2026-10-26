import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const root = new URL('../app/src/main/assets/', import.meta.url);
const code = fs.readFileSync(new URL('native-adapter.js', root), 'utf8');
const java = fs.readFileSync(new URL('../app/src/main/java/cn/qingheng/health/MainActivity.java', import.meta.url), 'utf8');
const app = fs.readFileSync(new URL('app.js', root), 'utf8');
const html = fs.readFileSync(new URL('index.html', root), 'utf8');

const localDate = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const dayOffset = days => { const date = new Date(); date.setDate(date.getDate() + days); return localDate(date); };
const today = localDate();

function environment(seed) {
  const saved = new Map([['qingheng-android-browser-demo-v1', JSON.stringify(seed)]]);
  const href = 'http://localhost:9090/index.html';
  const url = new URL(href);
  const ctx = {
    URL, Headers, AbortController, console, setTimeout, clearTimeout,
    location: {href, protocol: url.protocol, hostname: url.hostname, origin: url.origin},
    localStorage: {
      getItem: key => saved.get(key) ?? null,
      setItem: (key, value) => saved.set(key, String(value)),
      removeItem: key => saved.delete(key)
    }
  };
  ctx.window = ctx;
  ctx.fetch = async () => ({ok: true, json: async () => ({})});
  vm.createContext(ctx);
  vm.runInContext(code, ctx);
  return {ctx, saved};
}

async function request(ctx, path, body) {
  const response = await ctx.fetch(path, body === undefined ? undefined : {method: 'POST', body: JSON.stringify(body)});
  return {ok: response.ok, data: await response.json()};
}

const seed = {
  version: 1,
  profile: {
    sex: 'male', height: 166, age: 24, goal: 'cut',
    calorieTarget: 1800, proteinMin: 100, proteinMax: 130, fatMin: 40, fatMax: 60,
    intakeFloor: 1700
  },
  measurements: [
    {date: dayOffset(-10), weight: 65},
    {date: dayOffset(-1), weight: 65.8}
  ],
  meals: [{date: today, calories: 2100, protein: 55, fat: 75, carbs: 220}],
  habits: [], chats: []
};

const {ctx, saved} = environment(seed);
let result = await request(ctx, `/api/advice`, {date: today});
assert.equal(result.data.source, 'local');
const advice = result.data.messages.join('\n');
assert.match(advice, /24 岁/);
assert.match(advice, /身高 166cm/);
assert.match(advice, /14 天上升 0\.8kg/);
assert.match(advice, /今天补蛋白质/);
assert.match(advice, /鸡蛋|酸奶|鱼肉|豆制品/);
assert.match(advice, /明天减少脂肪/);
assert.match(advice, /今天按原节奏收尾/);
assert(!/TDEE|2000 kcal|来源：|不替代医疗|不构成医疗/.test(advice));
assert(result.data.messages.every(message => typeof message === 'string' && !/^(?:[-#]|\d+[.、)])/.test(message.trim())));
result = await request(ctx, '/api/profile', {age: null});
result = await request(ctx, `/api/advice`, {date: today});
assert.match(result.data.messages.join('\n'), /年龄未记录/);

result = await request(ctx, '/api/target-adjustment', {action: 'adjust'});
assert.equal(result.data.active, true);
assert.equal(result.data.effectiveDate, dayOffset(1));
assert.equal(result.data.original.calorieTarget, 1800);
assert.equal(result.data.original.fatMax, 60);
assert(result.data.temporary.calorieTarget < 1800);
assert(result.data.temporary.calorieTarget >= 1700, 'a one-day cut never crosses the 口径 floor');
assert(result.data.temporary.fatMax < 60);
assert(result.data.temporary.fatMax >= result.data.temporary.fatMin);

// A target already at or under the hard floor must be refused instead of silently cut further.
const atFloor = structuredClone(seed);
atFloor.profile.calorieTarget = 1700;
atFloor.meals = [{date: today, calories: 2400, protein: 55, fat: 75, carbs: 220}];
const floorCase = environment(atFloor);
await assert.rejects(async () => {
  const response = await floorCase.ctx.fetch('/api/target-adjustment', {method: 'POST', body: JSON.stringify({action: 'adjust'})});
  if (response.ok) return;
  throw new Error('refused');
}, /refused/);
assert.match(java, /不应再下调/, 'the native route refuses below the 口径 floor too');
assert.match(app, /intakeFloor/, 'the page submits the 口径 floor with the profile');

const state = await request(ctx, '/api/state');
assert.equal(state.data.profile.calorieTarget, 1800, 'temporary adjustment must not overwrite base target');
assert.equal(state.data.temporaryTargets.status, 'active');
assert.equal(JSON.parse(saved.get('qingheng-android-browser-demo-v1')).temporaryTargets.effectiveDate, dayOffset(1));

const expiredSeed = structuredClone(seed);
expiredSeed.temporaryTargets = {
  status: 'active', effectiveDate: dayOffset(-1),
  original: {calorieTarget: 1800, fatMin: 40, fatMax: 60},
  temporary: {calorieTarget: 1600, fatMin: 40, fatMax: 54}
};
const expired = environment(expiredSeed);
result = await request(expired.ctx, '/api/state');
assert.equal(result.data.temporaryTargets, undefined, 'expired one-day target restores the base profile');

assert.match(java, /private boolean expireTemporaryTargets\(\)/);
assert.match(java, /effective\.compareTo\(dayOffset\(0\)\) >= 0/);
assert.match(java, /state\.remove\(TEMP_TARGETS\)/);
assert.match(java, /weightChange14Days/);
assert.match(java, /next\.put\("onboardingDone", onboarding\)/);
assert.match(app, /height: form\.elements\.height\.value/);
assert.match(app, /age: form\.elements\.age\.value/);
assert.match(app, /api\/target-adjustment/);
assert(app.includes(String.raw`\*\*([^*\n]{1,160})\*\*`));
assert.match(html, /<label>年龄<input name="age"/);
assert(!/advice-content[^>]*>[^<]*(?:基于你的已记录|不代替专业)/.test(html));

console.log('PASS advice/targets: body-aware actionable advice, bold-safe output, one-day target proposal preserves base values, and expiry restores the original target.');
