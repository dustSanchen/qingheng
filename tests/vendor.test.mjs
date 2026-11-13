import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';

// Vendored libraries are committed build output: the manifest is the authority, the file on disk
// must match it, and the page must load it before app.js. Drift here means someone edited a bundle
// by hand or forgot to re-run tools/build-vendor.mjs.
const root = new URL('../', import.meta.url);
const manifestPath = new URL('vendor/manifest.json', root);
assert(fs.existsSync(manifestPath), 'vendor/manifest.json exists');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
assert(Array.isArray(manifest.entries) && manifest.entries.length, 'the manifest lists at least one entry');

// assets/ stays flat: the bundle sits beside app.js, the source stays under vendor/src.
const assetsDir = new URL('app/src/main/assets/', root);
const pkg = JSON.parse(fs.readFileSync(new URL('vendor/package.json', root), 'utf8'));

for (const entry of manifest.entries) {
  const file = new URL(entry.file, assetsDir);
  assert(fs.existsSync(file), `${entry.file} exists in assets`);
  const bytes = fs.readFileSync(file);
  assert.equal(bytes.length, entry.bytes, `${entry.file} byte count matches the manifest`);
  assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), entry.sha256, `${entry.file} sha256 matches the manifest`);
  assert(entry.bytes > 4096 && entry.bytes < 40960, `${entry.file} stays inside the size budget`);

  const text = bytes.toString('utf8');
  assert(text.startsWith('/*!'), `${entry.file} keeps a readable banner`);
  assert(text.includes(`@${entry.version}`), `${entry.file} banner names its version`);
  assert(/MIT/.test(text), `${entry.file} banner names its licence`);
  assert(!text.includes('eval('), `${entry.file} ships no eval`);
  assert(!text.includes('new Function('), `${entry.file} ships no dynamic Function`);
  assert(!/sourceMappingURL/.test(text), `${entry.file} ships no source map reference`);
}

// The pinned dependency and the shipped bundle must agree, or the manifest is lying about version.
const motion = manifest.entries.find((entry) => entry.package === 'motion');
assert(motion, 'motion is the first vendored package');
assert.equal(motion.version, pkg.dependencies.motion, 'manifest version matches vendor/package.json');

// Load order: vendor runtime first, app.js last, all deferred so the DOM is ready.
const html = fs.readFileSync(new URL('app/src/main/assets/index.html', root), 'utf8');
const scripts = [...html.matchAll(/<script src="\.\/([^"]+)"([^>]*)>/g)].map((m) => ({ src: m[1], attrs: m[2] }));
assert(scripts.length >= 3, 'the page loads several scripts');
for (const script of scripts) assert(/defer/.test(script.attrs), `${script.src} is deferred`);
const vendorIndex = scripts.findIndex((script) => script.src === motion.file);
const appIndex = scripts.findIndex((script) => script.src === 'app.js');
assert(vendorIndex >= 0, 'the vendored runtime is loaded by the page');
assert(appIndex === scripts.length - 1, 'app.js is still the last script');
assert(vendorIndex < appIndex, 'the runtime loads before the code that uses it');

// Nothing else smuggles a second copy in.
const jsInAssets = fs.readdirSync(assetsDir).filter((name) => name.endsWith('.js'));
assert(jsInAssets.includes(motion.file), 'the bundle is in the flat assets dir');
assert(!fs.existsSync(new URL('app/src/main/assets/vendor', root)), 'no vendor subdirectory reaches the assets');
assert(!fs.existsSync(new URL('app/src/main/assets/node_modules', root)), 'node_modules never reaches the assets');
assert(fs.existsSync(new URL('vendor/src/motion-entry.js', root)), 'the vendor entry stays reviewable');
