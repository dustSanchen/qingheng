import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const assets = new URL('../app/src/main/assets/', import.meta.url);
const app = fs.readFileSync(new URL('app.js', assets), 'utf8');
const java = fs.readFileSync(new URL('../app/src/main/java/cn/qingheng/health/ChatCompletion.java', import.meta.url), 'utf8');
const adapter = fs.readFileSync(new URL('native-adapter.js', assets), 'utf8');

// The regression that blocked photo analysis: /api/state has no settings, so the saved model
// config was replaced by {} on every reload. Run the real source block and prove it survives.
const block = app.match(/const keptSettings[\s\S]*?loaded = true;/);
assert(block, 'loadState keeps the previous settings when the payload has none');

const saved = { apiConfigured: true, visionEnabled: true, visionModel: 'deepseek-flash' };
const ctx = { state: { settings: { ...saved } }, data: { profile: {}, measurements: [], meals: [], habits: [] } };
vm.runInNewContext(block[0], ctx);
assert.deepEqual({ ...ctx.state.settings }, saved, 'settings survive a record reload');
assert.equal(ctx.loaded, true, 'records still load');

// If a payload ever does carry settings, those win.
const ctx2 = { state: { settings: { ...saved } }, data: { profile: {}, measurements: [], meals: [], habits: [], settings: { visionEnabled: false, visionModel: '' } } };
vm.runInNewContext(block[0], ctx2);
assert.equal(ctx2.state.settings.visionEnabled, false, 'an explicit settings payload still wins');

// Settings must be refreshable on their own, at startup and after saving the form.
assert(/async function refreshSettings\(\)/.test(app), 'refreshSettings exists');
assert(/state\.settings = \{\.\.\.\(state\.settings \|\| \{\}\), \.\.\.data\}/.test(app), 'refreshSettings merges instead of replacing');
assert(/\n  refreshSettings\(\);/.test(app), 'startup uses refreshSettings');
assert(/if \(path === '\/api\/settings'\) await refreshSettings\(\)/.test(app), 'saving the model config refreshes it');
assert(!app.includes("state.settings={...state.settings,...data}"), 'no ad-hoc settings merge remains');

// The photo gate must read the refreshed config, and the adapter must keep forwarding the image.
assert(/imageData && \(!state\.settings\.apiConfigured \|\| !state\.settings\.visionEnabled \|\| !state\.settings\.visionModel\)/.test(app), 'meal photo gate reads the model config');
assert(/chatImage && \(state\.settings\.apiConfigured !== true \|\| state\.settings\.visionEnabled !== true/.test(app), 'chat photo gate reads the model config');
assert(/nativeRequest\(path,method,\{\.\.\.body,allowExternal:true\}/.test(adapter), 'the adapter forwards the image payload');
assert(/body\?\.image && \(!config\.visionEnabled \|\| !config\.visionModel\)/.test(adapter), 'the adapter rejects an image without a vision model');

// Parameters are distinct from authentication failures; neither is diagnosed from a bare status alone.
assert(java.includes('code == 400 || code == 422'), 'parameter errors are distinguished');
assert(java.includes('code == 401') && java.includes('HTTP 401：API Key 认证失败'), 'authentication errors remain actionable');

console.log('PASS image analysis: model config survives reloads, refreshes on save, photo gates and 400 hint intact');
